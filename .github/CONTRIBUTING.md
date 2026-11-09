# Development

## Prerequisites:
- `gnome-night-shift`: Run `pipx install --system-site-packages gnome-night-shift`
- `glib-compile-schemas` (Debian/Ubuntu: `libglib2.0-bin`)
- `zip`
- `python3`
- [optional] `virtualenv` Used by `make e2e-test`
- [optional] `dconf-editor`

## Workflow

1. Make edits on `dev` branch
2. Test locally
3. Open PR to `main`
4. After PR has been merged onto main, run `git checkout main && git pull`
5. Run `make release VERSION=N.N.N` then `git push origin HEAD vN.N.N`

   **NOTE** Pushing the tag runs the Release workflow, which creates a GitHub Release with the zip; upload that zip to extensions.gnome.org.
6. Run `git checkout dev && git merge main --ff-only && git push`

## Testing locally
1. Run `make link` to install and use your local version of the extension.
2. Run `gnome-extensions enable night-shift@christophermca.github.io`
3. Reload session **[Wayland]** log out and back in, or use `make run`
4. Watch the logs with `make log-extension`


## Make actions (commands)

### Building and installing
|Name|Description|
|--|--|
|`make zip`|Compiles schemas/gschemas.compiled and builds night-shift@christophermca.github.io.zip from src/|
|`make install`|Runs zip, then gnome-extensions install --force (log out and back in on Wayland)|
|`make e2e-test`|Makes a venv, installs shexli and checks the zip with it. You have to run make zip first, since it doesn’t build the zip itself|
|`make clean`|Deletes the venv and the zip |


### Developing
|Name|Description|
|--|--|
|`make link`|Compiles the schema and symlinks `src/` into `~/.local/share/gnome-shell/extensions/night-shift@christophermca.github.io`, so edits take effect without reinstalling|
|`make run`|Starts a nested GNOME Shell for testing (`dbus-run-session -- gnome-shell --devkit --wayland`)|
|`make log-extension`|Follows the GNOME Shell journal, filtered to `night-shift`|
|`make log-preferences`|Follows the `gjs` journal, where the preferences window logs|
|`make update-settings`|Opens `dconf-editor` on the extension's settings|

### Releasing
|Name|Description|
|--|--|
|`make release VERSION=N.N.N`|Sets `version-name` in `metadata.json`, commits it and tags the commit `vN.N.N`. Refuses if there are uncommitted changes or the tag already exists. Push with `git push origin HEAD vN.N.N`|

### Other
|Name|Description|
|--|--|
|`make all`|Prints the zip name, extension folder name and Makefile directory (for debugging the Makefile)|
