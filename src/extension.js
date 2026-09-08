/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GLib from "gi://GLib";
import Gio from "gi://Gio";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { NightShiftIndicator } from "./indicator.js";

const localDir = GLib.get_user_data_dir(); // $HOME/.local/share
const systemdUserDir = GLib.build_filenamev([localDir, "systemd", "user"]);

const units = [
  "get-sunrise-sunset.timer",
  "get-sunrise-sunset.service",
  "night-shift.timer",
  "night-shift.service",
];

// Gio required to be wrapped in promisify for async/await to work https://gjs.guide/guides/gio/file-operations.html
Gio._promisify(
  Gio.File.prototype,
  "make_symbolic_link_async",
  "make_symbolic_link_finish",
  "delete_async",
);

export default class NightShiftExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._createAndStartServices();
    this._handleIndicator();
    this._connectToShiftChange();
  }

  disable() {
    this._disableServices();

    if (this._useGeoclueId) {
      this._settings.disconnect(this._useGeoclueId);
      this._useGeoclueId = null;
    }

    if (this._shiftChangeId) {
      this._settings.disconnect(this._shiftChangeId);
      this._shiftChangeId = null;
    }

    this._indicator.destroy();
    this._indicator = null;

    this._settings = null;
  }

  handleShiftChange(dayNight) {
    let shift;
    const desktopSettings = new Gio.Settings({
      schema_id: "org.gnome.desktop.interface",
    });
    const current = desktopSettings.get_string("color-scheme");

    if (dayNight == "day") {
      shift = "default";
    } else if (dayNight == "night") {
      shift = "prefer-dark";
    }

    !!shift &&
      current != shift &&
      desktopSettings.set_string("color-scheme", shift);
  }

  async _disableServices() {
    try {
      for (const unit of units) {
        const pathToUnit = GLib.build_filenamev([systemdUserDir, unit]);
        const linkFile = Gio.File.new_for_path(pathToUnit);
        await this._removeFile(linkFile);
      }

      //Stop and disable services
      GLib.spawn_command_line_async("systemctl --user daemon-reload");
      GLib.spawn_command_line_async(
        "systemctl --user disable --now get-sunrise-sunset.timer",
      );
      GLib.spawn_command_line_async(
        "systemctl --user disable--now night-shift.timer",
      );
    } catch (e) {
      console.error(`Error: [night-shift] _disableServices ${e}`);
    }
  }

  async _removeFile(file) {
    if (file.query_exists(null)) {
      await file.delete_async(GLib.PRIORITY_DEFAULT, null);
      const basename = file.get_basename();
    }
  }

  async _createAndStartServices() {
    GLib.mkdir_with_parents(systemdUserDir, 0o700);

    //Systemd units
    try {
      async function createSymbolicLink() {
        for (const unit of units) {
          const pathToUnit = GLib.build_filenamev([systemdUserDir, unit]);
          const linkFile = Gio.File.new_for_path(pathToUnit);
          const target = `${this.path}/units/${unit}`;
          const fileName = linkFile.get_basename();

          await this._removeFile(linkFile);
          await linkFile.make_symbolic_link_async(
            target,
            GLib.PRIORITY_DEFAULT,
            null, // Cancellable
            (source, result) => {
              const success = linkFile.make_symbolic_link_finish(result);
            },
          );
        }
      }

      await createSymbolicLink.call(this).then(() => {
        GLib.spawn_command_line_async("systemctl --user daemon-reload");
        GLib.spawn_command_line_async(
          "systemctl --user enable --now get-sunrise-sunset.timer",
        );
        GLib.spawn_command_line_async(
          "systemctl --user enable --now night-shift.timer",
        );
      });
    } catch (e) {
      console.error(`[night-shift] Failed to create and start services ${e}`);
    }
  }

  _connectToShiftChange() {
    this._shiftChangeId = this._settings.connect(
      "changed::day-or-night",
      (settings, key) => {
        let newValue = settings.get_string(key);
        this.handleShiftChange(newValue);
      },
    );
  }

  _handleIndicator() {
    try {
      const iconFile = this.dir
        .get_child("icons")
        .get_child("night-shift-ringed-symbolic.svg");
      const fileIcon = new Gio.FileIcon({ file: iconFile });

      this._indicator = new NightShiftIndicator(this._settings, fileIcon);

      this._useGeoclueId = this._settings.connect(
        "changed::use-geoclue",
        (set, key) => {
          let newValue = this._settings.get_string(key);
          log(`[night-shift] use-geoclue changed to: ${newValue}`);
          GLib.spawn_command_line_async(
            "systemctl --user restart get-sunrise-sunset.service",
          );
        },
      );

      // Place indicator
      Main.panel.addToStatusArea(this.uuid, this._indicator, 0, "right");
      this._indicator.menu.addAction(_("Preferences"), () =>
        this.openPreferences(),
      );
    } catch (e) {
      console.error(`[night-shift] Error in _handleIndicator: ${e}`);
    }
  }
}
