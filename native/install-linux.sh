#!/usr/bin/env bash
set -euo pipefail
VEIL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ ${EUID} -eq 0 ]]; then
  echo 'Sudo ile başlatma; normal kullanıcınla çalıştır. Paket kurulumu gerekirse sudo sorulacak.' >&2
  exit 1
fi
# Yalnızca eksik bağımlılıkları dağıtımın imzalı paket deposundan kur.
if ! command -v tor >/dev/null || ! command -v python3 >/dev/null; then
  if command -v pacman >/dev/null; then
    sudo pacman -S --needed tor python
  elif command -v apt-get >/dev/null; then
    sudo apt-get update
    sudo apt-get install tor python3
  elif command -v dnf >/dev/null; then
    sudo dnf install tor python3
  else
    echo 'Tor ve Python 3 paketlerini kurduktan sonra yeniden çalıştır.' >&2
    exit 1
  fi
fi
exec python3 "$VEIL_DIR/install.py" "$@"
