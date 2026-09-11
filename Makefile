FOLDER_NAME = night-shift@christophermca.github.io
SRC_DIR=src/

ZIP_FILE := $(FOLDER_NAME)
ZIP_FILE := $(addsuffix .zip,$(ZIP_FILE))

MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))


.PHONY: all
all:
	@echo "ZIP_FILE: '$(ZIP_FILE)'"
	@echo "FOLDER_NAME: '$(FOLDER_NAME)'"
	@echo "MAKEFILE_DIR: '$(MAKEFILE_DIR)'"

zip:
	cd $(SRC_DIR) && zip -r ../$(ZIP_FILE) . -x '*.git*' -x '*.compiled' -x '*__pycache__*'


.PHONY: install
install: zip
	gnome-extensions install $(ZIP_FILE) --force

.PHONY: e2e-test
e2e-test:
	 virtualenv venv && \
	. venv/bin/activate &&\
	pip install -U shexli &&\
	shexli $(ZIP_FILE)


.PHONY: test
test:
	 virtualenv venv && \
	. venv/bin/activate &&\
	pip install -U pytest \
	requests pycairo PyGObject &&\
	python -m pytest tests -c pytest.ini

.PHONY: clean
clean:
	rm -rf $(MAKEFILE_DIR)/venv \
	rm -rf $(ZIP_FILE)

.PHONY: link
link:
	cp -asf $(MAKEFILE_DIR)/$(SRC_DIR)/* $(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)

.PHONY: update-settings
update-settings:
	GSETTINGS_SCHEMA="$(HOME)/.local/share/gnome-shell/extensions/$(FOLDER_NAME)/schemas" dconf-editor

.PHONY: run
run:
	dbus-run-session -- gnome-shell --devkit --wayland

.PHONY: log-extension
log-extension:
	journalctl -f /usr/bin/gnome-shell -b 0 -g 'night-shift'

.PHONY: log-preferences
log-preferences:
	journalctl -f -o cat /usr/bin/gjs
