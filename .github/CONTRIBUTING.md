# DEVELOPMENT

1. Make edits on `dev` branch
2. Test locally
3. Open PR to `main`

4. After PR has been merged onto main.
5. RUN `make release VERSION=N.N.N` then `git push origin HEAD vN.N.N`

## Testing locally
RUN `make link` to install and use your local version of the extension.

## Building and installing

|Name|Description|
|--|--|
|`make zip`|Compiles schemas/gschemas.compiled and builds night-shift@christophermca.github.io.zip from src/|
|`make install`|Runs zip, then gnome-extensions install --force (log out and back in on Wayland)|
|`make e2e-test`|Makes a venv, installs shexli and checks the zip with it. You have to run make zip first, since it doesn’t build the zip itself|
|`make clean`|Deletes the venv and the zip |
