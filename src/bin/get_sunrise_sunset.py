#!/usr/bin/python

import os
import re
import gi
import json
import argparse
import requests
import subprocess

from pathlib import Path
from datetime import datetime

gi.require_version("Gio", "2.0")
from gi.repository import Gio, GLib

NOAA = "https://api.sunrise-sunset.org/v2"
SCHEMA_ID = "org.gnome.shell.extensions.night-shift"

schema_dir = os.path.expanduser(
    Path.home()
    / ".local"
    / "share"
    / "gnome-shell"
    / "extensions"
    / "night-shift@christophermca.github.io"
    / "schemas"
)

# Load schema
schema_source = Gio.SettingsSchemaSource.new_from_directory(
    schema_dir, Gio.SettingsSchemaSource.get_default(), False
)


def _get_location(override: bool) -> tuple(float, float):
    try:
        settings = _settings()
        useGeoclue = settings.get_boolean("use-geoclue")
        if not useGeoclue:
            coords: tuple(float, float) = get_static_location()
        else:
            # Get location data from Geoclue
            agent = subprocess.Popen(["/usr/lib/geoclue-2.0/demos/agent"])
            geoclue_data = subprocess.Popen(
                [
                    "/usr/lib/geoclue-2.0/demos/where-am-i",
                    "--accuracy-level=8",
                    "--time-threshold=3",
                ],  # `run /usr/lib/geoclue-2.0/demo/where-am-i -h` for more information about options
                text=True,
                stdout=subprocess.PIPE,
            )

            regex = r"^(Lat.*:|Long.*:).*([\.\-\d+]+)"
            timestamp = r"^(Timestamp:).*([\.\-\d+]+)"

            arr = []
            # READS response for LAT and LNG

            for line in iter(geoclue_data.stdout.readline, ""):
                match = re.match(regex, line)

                if match:
                    matched_string = match.group().split()[1]
                    arr.append(float(matched_string))

                if len(arr) == 2:
                    geoclue_data.terminate()
                    break

            if not arr:
                raise TypeError(
                    "Could not determine location. Please check your geoclue configuration"
                )
            coords = tuple(arr)

            # did location update?
        save(coords, override)

        return coords

    except subprocess.TimeoutExpired as e:
        print(f"TimeoutExpired: {e.timeout} seconds\n\n {e.stdout}")
        return None

    except subprocess.CalledProcessError as e:
        print(f"Error: {e.returncode} \n\n {e.stderr}")
        return None

    finally:
        try:
            if agent.poll():
                print("Terminating geoclue agent")
                agent.terminate()  # Gracefully exits
                agent.wait()  # Prevents zombie processes
        except NameError:
            pass


def _get_sunrise_sunset(lat: float, lng: float, debug: bool):
    try:
        params = {"lat": lat, "lng": lng}

        # Handle response
        response = requests.get(NOAA, params)
        response.raise_for_status()

        data = response.json()

        if debug:
            json_string = json.dumps(data, indent=4, sort_keys=True)
            print(f"[night-shift] {json_string}")

        tzid = data["tzid"]
        sunrise = datetime.fromisoformat(data["sunrise"]).strftime("%H:%M")
        sunset = datetime.fromisoformat(data["sunset"]).strftime("%H:%M")

        times = (sunrise, sunset)

        # update settings
        settings = _settings()
        settings.set_string(
            "timestamp", f"{datetime.now().astimezone().isoformat()}"
        )
        print(
            f"night-shift {data.get('sunrise'), data.get('sunset'), data.get('tzid')}"
        )
        settings.set_string("tzid", tzid)
        times_tuple = GLib.Variant("(ss)", times)

        settings.set_value("times", times_tuple)

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred (e.g., 404, 500): {http_err}")

    finally:
        print("Done")


def _settings() -> object:
    # initialize gsettings obj
    schemaObj = schema_source.lookup(SCHEMA_ID, True)
    settings = Gio.Settings.new_full(schemaObj, None, None)

    return settings


def save(coords: tuple(float, float), override=False) -> None:
    settings = _settings()
    previous_coordinates = settings.get_value("last-known-coordinates")

    if override or (coords == previous_coordinates):

        last_known_coordinates = GLib.Variant("(dd)", coords)
        settings.set_value("last-known-coordinates", last_known_coordinates)
        return coords
    else:
        coords_string = ",".join(map(str, coords))
        print(
            f"Locations are the same (old/new) '{previous_coordinates}'/'{coords_string}'"
        )


def get_static_location() -> tuple(float, float):
    settings = _settings()

    lat = settings.get_string("static-latitude")
    lng = settings.get_string("static-longitude")

    if lat and lng:
        static_location = (float(lat), float(lng))

        last_known_coordinates = GLib.Variant("(dd)", static_location)
        settings.set_value("last-known-coordinates", last_known_coordinates)

        return static_location

    else:
        print("Missing required keys")


def main():
    # Parse commendline arguments
    parser = argparse.ArgumentParser(
        description="Get the times for the sunrise/sunset"
    )
    parser.add_argument("-f", action="store_true")
    parser.add_argument("-d", action="store_true")
    args = parser.parse_args()
    override = args.f
    debug = args.d

    # Run
    coords: tuple(float, float) = _get_location(override)
    if coords:
        _get_sunrise_sunset(*coords, debug)


if __name__ == "__main__":
    main()
