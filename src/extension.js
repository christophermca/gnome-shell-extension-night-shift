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
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";

import { NightShiftIndicator } from "./indicator.js";

Gio._promisify(Gio.Subprocess.prototype, "communicate_utf8_async");

const PROGRAM = "gnome-night-shift";
const INSTALL_HINT =
  "Install the helper: pipx install --system-site-packages gnome-night-shift";

// nocturne-shift isn't installed at all (as opposed to failing when run)
class HelperMissingError extends Error {}

function findProgram() {
  const gnomeNightShift = GLib.find_program_in_path(PROGRAM);
  if (gnomeNightShift) return gnomeNightShift;
  // gnome-shell's PATH often lacks ~/.local/bin, where `pipx install` puts it
  const userBin = GLib.build_filenamev([
    GLib.get_home_dir(),
    ".local",
    "bin",
    PROGRAM,
  ]);
  return GLib.file_test(userBin, GLib.FileTest.IS_EXECUTABLE) ? userBin : null;
}

export default class NightShiftExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._createAndStartServices();
    this._handleIndicator();
    this._connectToShiftChange();
    // Apply the current state now; the signal only fires on a change
    this.handleShiftChange(this._settings.get_string("day-or-night"));
  }

  disable() {
    const action = if (Main.sessionMode.isLocked) ? "stop" : "teardown"
    this._disableServices(action);

    if (this._useGeoclueId) {
      this._settings.disconnect(this._useGeoclueId);
      this._useGeoclueId = null;
    }

    if (this._shiftChangeId) {
      this._settings.disconnect(this._shiftChangeId);
      this._shiftChangeId = null;
    }

    this._indicator?.destroy();
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

  // Runs `nocturne-shift ...args`. Throws HelperMissingError when the command
  // isn't installed, or an Error with its stderr when it exits non-zero.
  async _nightShift(...args) {
    const cmd = findProgram();
    if (!cmd) throw new HelperMissingError(`${PROGRAM} not found`);

    // stdout still goes to the journal; stderr is read for the error message
    const proc = Gio.Subprocess.new(
      [cmd, ...args],
      Gio.SubprocessFlags.STDERR_PIPE,
    );
    const [, stderr] = await proc.communicate_utf8_async(null, null);
    if (!proc.get_successful()) {
      throw new Error(
        stderr?.trim() ||
          `${PROGRAM} ${args.join(" ")} exited with ${proc.get_exit_status()}`,
      );
    }
  }

  async _disableServices(action) {
    try {
      await this._nightShift(action);
    } catch (e) {
      // Nothing to tear down without the helper; don't notify on every lock
      if (!(e instanceof HelperMissingError))
        console.error(`[${PROGRAM}] ${action} failed: ${e}`);
    }
  }

  async _createAndStartServices() {
    try {
      const pathToSchemas = GLib.build_filenamev([this.path, "schemas"]);
      console.log(`[${PROGRAM}] start createAndStartServices`);
      if (!GLib.file_test(pathToSchemas, GLib.FileTest.IS_DIR))
        throw new Error(`File not found ${pathToSchemas}`);
      await this._nightShift("setup", pathToSchemas);
    } catch (e) {
      console.error(`[${PROGRAM}] Failed to create and start ${e}`);
      // e.g. only nocturne-shift is installed: "... requires: pip install 'gnome-night-shift'"
      Main.notify(
        "Gnome Night Shift",
        e instanceof HelperMissingError
          ? INSTALL_HINT
          : `Timers could not be set up: ${e.message}`,
      );
    } finally {
      console.log(`[${PROGRAM}] completed createAndStartServices`);
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
          log(`[gnome-night-shift] use-geoclue changed to: ${newValue}`);
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
      console.error(`[gnome-night-shift] Error in _handleIndicator: ${e}`);
    }
  }
}
