import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

import {
  ExtensionPreferences,
  gettext,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const staticLocationRegex = /^-?\d{1,3}\.\d+$/;

export default class NightShiftPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    // Create GUI
    const page = new Adw.PreferencesPage({
      title: gettext("General"),
      icon_name: "dialog-information-symbolic",
    });

    // GROUPS
    const general = new Adw.PreferencesGroup({
      title: gettext("Preferences"),
      description: gettext("Configure the extension"),
    });

    /*
     * Time format
     *
     * Sets how sunrise and sunset are shown in the indicator menu. Each
     * entry is [setting value, label]; keeping them together means the
     * order of the values and the labels can't drift apart.
     */
    const timeFormats = [
      ["system", gettext("Follow system")],
      ["h12", gettext("12-hour")],
      ["h23", gettext("24-hour")],
      ["h11", gettext("12-hour, midnight as 0:00 AM")],
      ["h24", gettext("24-hour, midnight as 24:00")],
    ];

    const choices = timeFormats.map(([value]) => value);
    const timeFormatLabels = Gtk.StringList.new(
      timeFormats.map(([, label]) => label),
    );

    const displayTimeFormat = new Adw.ComboRow({
      title: gettext("Time format"),
      subtitle: gettext("Choose how time is displayed"),
      model: timeFormatLabels,
    });

    const locationSettings = new Adw.PreferencesGroup({
      title: gettext("Location Settings"),
      description: gettext(
        "Configure how 'Night shift' determines user's location.",
      ),
    });
    locationSettings.add_css_class("boxed-list");

    const locationSettingsSubgroup = new Adw.PreferencesGroup({
      title: gettext("Static Location (Manual)"),
      description: gettext(
        "Set the location 'Night shift' will use to determine sunset/sunrise. Note: This will not affect the computers clock",
      ),
      margin_top: 2,
    });

    //ROWS
    const showIndicator = new Adw.SwitchRow({
      title: gettext("Show Indicator"),
      subtitle: gettext("Whether to show the panel indicator"),
    });

    const useGeoclue = new Adw.SwitchRow({
      title: gettext("Automatic location detection"),
      subtitle: gettext(
        "Requires Internet access AND Location Services to be enabled ( Settings > Privacy and Security > Location )",
      ),
    });

    const latitude = new Adw.EntryRow({
      title: "Latitude",
      showApplyButton: true,
    });

    const longitude = new Adw.EntryRow({
      title: "Longitude",
      showApplyButton: true,
    });

    general.add(showIndicator);
    general.add(displayTimeFormat);

    locationSettings.add(useGeoclue);
    locationSettings.add(locationSettingsSubgroup);

    locationSettingsSubgroup.add(latitude);
    locationSettingsSubgroup.add(longitude);

    // Create page
    window.add(page);
    page.add(general);
    page.add(locationSettings);

    // Bind to events
    window._settings = this.getSettings();
    window._settings.bind(
      "show-indicator",
      showIndicator,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    window._settings.bind(
      "use-geoclue",
      useGeoclue,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    window._settings.bind(
      "static-latitude",
      latitude,
      "text",
      Gio.SettingsBindFlags.DEFAULT,
    );

    window._settings.bind(
      "static-longitude",
      longitude,
      "text",
      Gio.SettingsBindFlags.DEFAULT,
    );

    // set the initial UI state from Gsettings
    const selectedTimeFormat = window._settings.get_string("time-format");
    const initialIndex = choices.indexOf(selectedTimeFormat);

    if (initialIndex !== -1) {
      displayTimeFormat.set_selected(initialIndex);
    }

    displayTimeFormat.connect("notify::selected", () => {
      const selectedIndex = displayTimeFormat.get_selected();
      if (selectedIndex >= 0 && selectedIndex < choices.length) {
        window._settings.set_string("time-format", choices[selectedIndex]);
      }
    });

    useGeoclue.connect("notify::active", (row) => {
      const switchRowIsDisabled = !row.get_active();
      locationSettingsSubgroup.set_sensitive(switchRowIsDisabled);
    });

    latitude.connect("changed", (row) => {
      const coord = row.get_text();
      const isValid = staticLocationRegex.test(coord);
      if (isValid) {
        clearError(latitude);
        window._settings.set_string("static-latitude", coord);
      } else {
        displayError(latitude);
      }
    });

    longitude.connect("changed", (row) => {
      const coord = row.get_text();
      const isValid = staticLocationRegex.test(coord);
      if (isValid) {
        clearError(longitude);
        window._settings.set_string("static-longitude", coord);
      } else {
        displayError(longitude);
      }
    });

    const useGeoclueDisabled = !useGeoclue.get_active();
    locationSettingsSubgroup.set_sensitive(useGeoclueDisabled);

    function clearError(row) {
      row.remove_css_class("error");
      locationSettingsSubgroup.set_description("");
    }

    function displayError(row) {
      locationSettingsSubgroup.set_description(
        "invalid format, Coordinates are formatted as a double i.e ('40.231')",
      );
      row.add_css_class("error");
    }
  }
}
