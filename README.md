# 🌙 Night Shift - GNOME Extension

Night Shift is a GNOME Shell extension that automatically switches your desktop between **Day** and **Night** modes (Light and Dark themes).
The extension detects whether it is currently day or night at your location and applies the appropriate mode automatically.


## Features

- 🌅 Automatically switch between **Day** (Light) and **Night** (Dark) modes
- 📍 Use Static Location
- 🌐 Location-based detection via Geoclue

## Requirements

- GNOME Shell 49+
- Internet connection
- gnome-night-shift >= 0.6.8

### Optional
- Geoclue 2.0 (Included with gnome)

## Installation

### Via GNOME Extensions (Recommended)

[gnome-shell-extension Night Shift](https://extensions.gnome.org/extension/10653/night-shift/)

### Manual Installation

1. Download `night-shift@christophermca.github.io.zip` from the
   [latest release](https://github.com/christophermca/gnome-shell-extension-night-shift/releases/latest)
2. Install it:
   ```bash
   gnome-extensions install --force night-shift@christophermca.github.io.zip
   ```
3. Log out and back in (GNOME Shell loads a newly installed extension at login), then
   enable the extension in the Extensions app
4. Ensure location services are enabled in GNOME Settings (GNOME uses Geoclue 2.0 for location detection)

## Post-Install steps

### Install Dependencies

```bash
pipx install --system-site-packages gnome-night-shift
```

### Set up the timers (once)

After installing the extension, run this once in a terminal:

```bash
gnome-night-shift setup
```

This creates the systemd timers that fetch the sunrise and sunset times and
check for day or night. They keep running from then on; the extension reads
the results and switches the theme. If the timers aren't set up yet, the
extension shows a notification with this command.

To remove the timers, for example after uninstalling the extension:

```bash
gnome-night-shift teardown
```

### Updating

```bash
pipx upgrade gnome-night-shift
```

The timers pick up the new version on their next run. If the extension shows
"Night Shift needs a newer gnome-night-shift", this is the command it means.

## Usage

Once installed and enabled:

1. The extension automatically detects your location with geoclue or uses
   provided static location.
2. It monitors sunrise and sunset times

The Extension will automatically switch your Desktop Style (Mode)
1. Your desktop automatically switches to Light mode at `sunrise`
1. Your desktop automatically switches to Dark mode at `sunset`

## Settings

- `Show Indicator` -- Display an indicator in `Status panel`
- `Automatic location detection` -- uses location services to determine location
- `Static Location (manual)` -- uses the user-provided coordinates for location
- `Time format` -- how sunrise and sunset times are shown in the indicator: follow the
  system clock, 12-hour (`h12`, or `h11` with midnight as 0:00) or 24-hour (`h23`, or
  `h24` with midnight as 24:00)


## Troubleshooting

- **Extension not switching themes**: Ensure Geoclue is running and location services are enabled
- **Location not detected**: Check that location services are enabled in GNOME Settings
- **Times never load ("Loading data...")**: run `gnome-night-shift setup`, then check
  `systemctl --user list-timers | grep -i sun` and
  `journalctl --user -u get-sunrise-sunset.service -n 20`
- **API errors**: Verify your internet connection and that
  [api.sunrise-sunset.org](https://sunrise-sunset.org/api) is reachable

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Testing a pre-release from TestPyPI

Download only the Night Shift packages from TestPyPI, then install those files, so every
other dependency still comes from PyPI. Don't add TestPyPI as an index (`--index-url`/
`--extra-index-url`): anyone can upload any package name there.
```bash
pipx run pip download --no-deps --only-binary=:all: \
  --index-url https://test.pypi.org/simple/ --dest ~/night-shift-wheels \
  nocturne-shift gnome-night-shift

pipx install --system-site-packages \
  --preinstall ~/night-shift-wheels/nocturne_shift-*.whl \
  ~/night-shift-wheels/gnome_night_shift-*.whl
```

## Support

Found a bug or have a feature request? Please open an [issue](https://github.com/christophermca/gnome-shell-extension-night-shift/issues) on GitHub. For security concerns, please contact the maintainer directly.
