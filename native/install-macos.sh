#!/usr/bin/env bash
set -euo pipefail
VEIL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v brew >/dev/null; then
  echo 'Önce brew.sh üzerinden Homebrew kur; ardından bu dosyayı yeniden çalıştır.' >&2
  exit 1
fi
if ! command -v tor >/dev/null || ! command -v python3 >/dev/null; then brew install tor python; fi
exec python3 "$VEIL_DIR/install.py" "$@"
