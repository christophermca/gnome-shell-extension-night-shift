/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
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

const PROGRAM = "gnome-night-shift";
const STALE_AFTER_HOURS = 48; // fetches run daily; allow a missed one
// Oldest nocturne-shift this extension works with. Raise it when the
// extension starts relying on something a newer version saves.
const MIN_BACKEND_VERSION = "2.0.1";
const BACKEND_VERSION = regex(/^2\.\d+\.\d+/);

// The extension doesn't start or stop anything: the user runs this once and
// gnome-night-shift keeps the timers running from then on.
const SETUP_HINT =
  "To fetch sunrise and sunset times, run once in a terminal: " +
  "pipx install --system-site-packages gnome-night-shift && gnome-night-shift setup";

const UPGRADE_HINT =
  "Night Shift needs a newer gnome-night-shift. Run in a terminal: " +
  "pipx upgrade gnome-night-shift";

// "0.7.10" vs "0.7.6": compare number by number, not as text
function versionAtLeast(actual, minimum) {
  const result = minimum.test(actual);
  // const a = actual.split(".").map(Number);
  // const m = minimum.split(".").map(Number);
  // for (let i = 0; i < m.length; i++) {
  //   const diff = (a[i] ?? 0) - m[i];
  //   if (Number.isNaN(diff)) return false;
  //   if (diff !== 0) return diff > 0;
  // }
  return result;
}

function versionMatch(actual, semVar) {
  const a = actual.split(".").map(Number);
  const m = minimum.split(".").map(Number);
  for (let i = 0; i < m.length; i++) {
    const diff = (a[i] ?? 0) - m[i];
    if (Number.isNaN(diff)) return false;
    if (diff !== 0) return diff > 0;
  }
  return true;
}

/**
 * Asks this user's systemd (the session bus service that `systemctl --user` talks to)
 * to restart `unit`. Uses the callback form of call(), wrapped in a Promise,
 * so nothing in Gio is changed when this file is loaded.
 **/

function restartUnit(unit) {
  return new Promise((resolve, reject) => {
    log(`[gnome-night-shift] restartUnit unit-name: ${unit}`);
    Gio.DBus.session.call(
      "org.freedesktop.systemd1",
      "/org/freedesktop/systemd1",
      "org.freedesktop.systemd1.Manager",
      "RestartUnit",
      new GLib.Variant("(ss)", [unit, "replace"]), // "replace": as systemctl does
      new GLib.VariantType("(o)"), // the reply is the path of the queued job
      Gio.DBusCallFlags.NONE,
      -1,
      null,
      (connection, result) => {
        try {
          resolve(connection.call_finish(result));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

export default class NightShiftExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._remindSetup();
    this._remindUpgrade();
    this._handleIndicator();
    this._connectToShiftChange();
    // Apply the current state now; the signal only fires on a change
    this.handleShiftChange(this._settings.get_string("day-or-night"));
  }

  disable() {
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

  _remindSetup() {
    if (this._remindedSetup) return;
    const last = Date.parse(this._settings.get_string("timestamp")); // NaN when empty
    const hours = (Date.now() - last) / 3_600_000;
    if (!Number.isNaN(last) && hours < STALE_AFTER_HOURS) return;
    this._remindedSetup = true;
    Main.notify(this.metadata.name, SETUP_HINT);
  }

  // The timers run, but with an old nocturne-shift: it fetched recently
  // (the timestamp is fresh) yet saved an old version, or none at all,
  // because versions before MIN_BACKEND_VERSION don't save one.

  _remindUpgrade() {
    if (this._remindedUpgrade) return;
    const last = Date.parse(this._settings.get_string("timestamp"));
    if (Number.isNaN(last)) return; // not set up: _remindSetup() covers it
    const installed = this._settings.get_string("backend-version");
    if (installed && versionAtLeast(installed, BACKEND_VERSION)) return;
    this._remindedUpgrade = true;
    Main.notify(this.metadata.name, UPGRADE_HINT);
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
          // fetch the times again with the new location setting
          restartUnit("get-sunrise-sunset.service").catch((e) =>
            console.error(`[${PROGRAM}] could not restart the fetch: ${e}`),
          );

          restartUnit("night-shift.service").catch((e) =>
            console.error(`[${PROGRAM}] could not restart the fetch: ${e}`),
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
