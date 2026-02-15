#!/bin/bash
# Compile all .po files to .mo binary format
# Requires: gettext (msgfmt)
# Usage: cd languages/ && bash compile.sh

for po in *.po; do
  mo="${po%.po}.mo"
  msgfmt -o "$mo" "$po"
  echo "Compiled: $po → $mo"
done
