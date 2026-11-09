FOLDER_NAME = night-shift@christophermca.github.io
SRC_DIR=src

ZIP_FILE := $(FOLDER_NAME)
ZIP_FILE := $(addsuffix .zip,$(ZIP_FILE))

MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))


.PHONY: all install e2e-test clean link update-settings run log-extension log-preferences release

all:
	@echo "ZIP_FILE: '$(ZIP_FILE)'"
	@echo "FOLDER_NAME: '$(FOLDER_NAME)'"
	@echo "MAKEFILE_DIR: '$(MAKEFILE_DIR)'"

zip:
	rm -rf $(ZIP_FILE)
	glib-compile-schemas --strict $(SRC_DIR)/schemas
	cd $(SRC_DIR)/ && zip -r ../$(ZIP_FILE) . -x '*.git*' -x '*__pycache__*'


install: zip
	gnome-extensions install $(ZIP_FILE) --force

e2e-test:
	virtualenv venv && \
	. venv/bin/activate &&\
	pip install -U shexli &&\
	shexli $(ZIP_FILE)


clean:
	rm -rf $(MAKEFILE_DIR)/venv
	rm -rf $(ZIP_FILE)

link:
	glib-compile-schemas --strict $(SRC_DIR)/schemas
	mkdir -p $(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)
	cp -asf $(MAKEFILE_DIR)/$(SRC_DIR)/* $(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)

update-settings:
	GSETTINGS_SCHEMA_DIR="$(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)/schemas" dconf-editor

run:
	dbus-run-session -- gnome-shell --devkit --wayland

log-extension:
	journalctl -f /usr/bin/gnome-shell -b 0 -g 'night-shift'

log-preferences:
	journalctl -f -o cat /usr/bin/gjs

# Set the version in one place: `make release VERSION=0.5.4` writes it into
# metadata.json, commits that change and tags the commit v0.5.4, so the tag
# and version-name can't disagree. Push afterwards with the command it prints.
release:
	@echo "$(VERSION)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' \
		|| { echo "usage: make release VERSION=X.Y.Z"; exit 1; }
	@git diff --quiet && git diff --cached --quiet \
		|| { echo "commit or stash your changes first"; exit 1; }
	@! git rev-parse -q --verify "refs/tags/v$(VERSION)" >/dev/null \
		|| { echo "tag v$(VERSION) already exists"; exit 1; }
	sed -i -E 's/("version-name":[[:space:]]*")[^"]*"/\1$(VERSION)"/' $(SRC_DIR)/metadata.json
	@test "$$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version-name"])' $(SRC_DIR)/metadata.json)" = "$(VERSION)" \
		|| { echo "could not set version-name in $(SRC_DIR)/metadata.json"; exit 1; }
	git commit -m "Release v$(VERSION)" -- $(SRC_DIR)/metadata.json
	git tag -a "v$(VERSION)" -m "Night Shift $(VERSION)"
	@echo "Now push the commit and the tag: git push origin HEAD v$(VERSION)"
