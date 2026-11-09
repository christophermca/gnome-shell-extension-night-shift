FOLDER_NAME = night-shift@christophermca.github.io
SRC_DIR=src

ZIP_FILE := $(FOLDER_NAME)
ZIP_FILE := $(addsuffix .zip,$(ZIP_FILE))

MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))


.PHONY: all install e2e-test clean link update-settings run log-extension log-preferences

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
	rm -rf $(MAKEFILE_DIR)/venv \
	rm -rf $(ZIP_FILE)

link:
	glib-compile-schemas --strict $(SRC_DIR)/schemas
	cp -asf $(MAKEFILE_DIR)/$(SRC_DIR)/* $(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)

update-settings:
	GSETTINGS_SCHEMA="$(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)/schemas" dconf-editor

run:
	dbus-run-session -- gnome-shell --devkit --wayland

log-extension:
	journalctl -f /usr/bin/gnome-shell -b 0 -g 'night-shift'

log-preferences:
	journalctl -f -o cat /usr/bin/gjs
