# 🌙 Night Shift - GNOME Extension

Night Shift is a GNOME Shell extension that automatically switches your desktop between **Day** and **Night** modes (Light and Dark themes).
The extension detects whether it is currently day or night at your location and applies the appropriate mode automatically.


## ✨ Features

- 🌅 Automatically switch between **Day** (Light) and **Night** (Dark) modes
- 📍 Use Static Location
- 🌐 Location-based detection via Geoclue

## 📋 Requirements

- GNOME Shell 50+
- Internet connection

### [**Optional** Dependency]
- Geoclue 2.0 (Included with gnome)

## 📦 Installation

### Install Dependencies
```bash
pipx install --system-site-packages gnome-night-shift
```

#### Testing a pre-release from TestPyPI
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
### Via GNOME Extensions (Recommended)

[Coming soon, link to extension on extensions.gnome.org]

### Manual Installation

1. Clone or download the repository as a zip file
2. Install using the GNOME Extensions manager:
   ```bash
   gnome-extensions install <path-to-zip>
   ```
3. Enable the extension in GNOME Settings or Extensions app
4. Ensure location services are enabled in GNOME Settings (GNOME uses Geoclue 2.0 for location detection)

## 🚀 Usage

Once installed and enabled:

1. The extension automatically detects your location with geoclue or uses
   provided static location.
2. It monitors sunrise and sunset times

The Extension will automatically switch your Desktop Style (Mode)
1. Your desktop automatically switches to Light mode at `sunrise`
1. Your desktop automatically switches to Dark mode at `sunset`

## ⚙️ Settings

- `Show Indicator` -- Display an indicator in `Status panel`
- `Automatic location detection` -- uses location services to determine location
- `Static Location (manual)` -- uses the user-provided coordinates for location


## 🐛 Troubleshooting

- **Extension not switching themes**: Ensure Geoclue is running and location services are enabled
- **Location not detected**: Check that location services are enabled in GNOME Settings
- **API errors**: Verify your internet connection and NOAA API availability

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📧 Support

Found a bug or have a feature request? Please open an [issue](https://github.com/christophermca/gnome-shell-extension-night-shift/issues) on GitHub. For security concerns, please contact the maintainer directly.
