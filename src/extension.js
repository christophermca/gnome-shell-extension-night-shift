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

Gio._promisify(Gio.Subprocess.prototype, "wait_check_async");

const NIGHT_SHIFT = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".local",
  "bin",
  "night-shift",
]);

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

  async _nightShift(...args) {
    if (!GLib.file_test(NIGHT_SHIFT, GLib.FileTest.IS_EXECUTABLE)) {
      Main.notify(
        "Night Shift",
        "Instaall the helper: pipx install 'night-shift-cli[services]'",
      );
      return false;
    }
    const proc = Gio.Subprocess.new(
      [NIGHT_SHIFT, ...args],
      Gio.SubprocessFlags.NONE,
    );
    return proc.wait_check_async(null); // returns as non-zero
  }

  async _disableServices() {
    try {
      await this._nightShift("services", "teardown");
    } catch (e) {
      console.error(`[night-shift] services teardown failed: ${e}`);
    }
  }

  async _createAndStartServices() {
    try {
      const pathToSchemas = GLib.build_filenamev([this.path, "schemas"]);
      console.log(`[night-shift] start createAndStartServices`);
      if !pathToSchemas throw(new Error(`File not found ${pathToSchemas}`))
      await this._nightShift("services", "setup", pathToSchemas);
    } catch (e) {
      console.error(`[night-shift] Failed to create and start services ${e}`);
    } finally {
      console.log(`[night-shift] completed createAndStartServices`);
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

      this._indicator = new NightShiftIndicator(
        this._settings,
        this.metadata.name,
        fileIcon,
      );

      this._useGeoclueId = this._settings.connect(
        "changed::use-geoclue",
        (set, key) => {
          let newValue = this._settings.get_boolean(key);
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
