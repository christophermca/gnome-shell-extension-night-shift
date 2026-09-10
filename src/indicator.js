import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";

export const NightShiftIndicator = GObject.registerClass(
  class NightShiftIndicator extends PanelMenu.Button {
    constructor(settings, name, fileIcon) {
      super(0.0, name, false);
      this._settings = settings;
      this._minHpadding = 2;
      this._natHpadding = 6;
      this.width = 50;

      let icon = new St.Icon({
        gicon: fileIcon,
        style_class: "system-status-icon",
      });

      this.add_child(icon);

      this._headerRow = new PopupMenu.PopupMenuItem("Timezone", {
        reactive: false,
        can_focus: false,
        activate: false,
      });

      this._dataItem2 = new PopupMenu.PopupImageMenuItem(
        "Loading data...",
        "daytime-sunrise-symbolic",
        { reactive: false, can_focus: false, activate: false },
      );

      this._dataItem3 = new PopupMenu.PopupImageMenuItem(
        "Loading data...",
        "daytime-sunset-symbolic",
        { reactive: false, can_focus: false, activate: false },
      );

      this.menu.addMenuItem(this._headerRow);
      this.menu.addMenuItem(this._dataItem2);
      this.menu.addMenuItem(this._dataItem3);

      this.initialize();
    }

    initialize() {
      this._settings.bind(
        "show-indicator",
        this,
        "visible",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this._settings.bind(
        "tzid",
        this.header.label,
        "text",
        Gio.SettingsBindFlags.GET,
      );

      const timesData = this._settings.get_value("times");
      const [sunrise, sunset] = timesData.recursiveUnpack();

      if (this.sunrise && this.sunset) {
        this.sunrise.label.text = sunrise;
        this.sunset.label.text = sunset;
      }

      // Dynamically update
      this._updateTimesId = this._settings.connect(
        "changed::times",
        (set, key) => {
          let timesTuple = set.get_value(key);
          let [updatedTimeSunrise, updatedTimeSunset] =
            timesTuple.recursiveUnpack();

          if (this.sunrise && this.sunset) {
            this.sunrise.label.text = `${updatedTimeSunrise}`;
            this.sunset.label.text = `${updatedTimeSunset}`;
          }
        },
      );
    }

    get header() {
      return this._headerRow;
    }

    get sunrise() {
      return this._dataItem2;
    }

    get sunset() {
      return this._dataItem3;
    }

    destroy() {
      if (this._updateTimesId) {
        this._settings.disconnect(this._updateTimesId);
        this._updateTimesId = null;
      }

      super.destroy();
    }
  },
);
