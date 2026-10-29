#!/usr/bin/env python3
"""Kullanıcı düzeyinde native host kaydı. Yönetici olarak çalıştırmayın."""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys

NAME = 'com.hwyne.veil'
ROOT = Path(__file__).resolve().parents[1]
FF_ID = 'veil@hwyne.local'

def main():
    parser = argparse.ArgumentParser(description='VEIL yerel yardımcı kurulumu')
    parser.add_argument('--chrome-id', help='Özel Chrome build kimliği; varsayılan paketle birlikte gelir')
    parser.add_argument('--tor-path', help='Tor executable dosyasının tam yolu')
    parser.add_argument('--uninstall', action='store_true')
    args = parser.parse_args()
    if os.name != 'nt' and os.geteuid() == 0:
        raise SystemExit('Bu betiği sudo ile çalıştırma. Normal kullanıcınla çalıştır.')
    identifier = args.chrome_id or (ROOT / 'CHROME_ID.txt').read_text().strip()
    if not re.fullmatch('[a-p]{32}', identifier):
        raise SystemExit('Geçersiz Chrome eklenti kimliği.')
    if args.tor_path and not Path(args.tor_path).is_file():
        raise SystemExit('Belirtilen Tor dosyası bulunamadı.')
    home = Path.home()
    if sys.platform == 'win32':
        dest = Path(os.environ['LOCALAPPDATA']) / 'Veil' / 'native'
        chromium_paths = [dest / 'chromium']
        firefox_paths = [dest / 'firefox']
    elif sys.platform == 'darwin':
        dest = home / 'Library' / 'Application Support' / 'Veil' / 'native'
        base = home / 'Library' / 'Application Support'
        chromium_paths = [base / p / 'NativeMessagingHosts' for p in ['Google/Chrome', 'Chromium', 'BraveSoftware/Brave-Browser', 'Microsoft Edge']]
        firefox_paths = [base / 'Mozilla' / 'NativeMessagingHosts']
    else:
        dest = home / '.local' / 'share' / 'veil' / 'native'
        config = Path(os.environ.get('XDG_CONFIG_HOME', str(home / '.config')))
        chromium_paths = [config / p / 'NativeMessagingHosts' for p in ['google-chrome', 'google-chrome-beta', 'chromium', 'BraveSoftware/Brave-Browser', 'microsoft-edge']]
        firefox_paths = [home / '.mozilla' / 'native-messaging-hosts']
    record = dest / 'installed-manifests.json'
    if args.uninstall:
        if record.exists():
            for path in json.loads(record.read_text()):
                p = Path(path)
                if p.name == NAME + '.json':
                    p.unlink(missing_ok=True)
        if sys.platform == 'win32':
            import winreg
            for vendor in ['Google\\Chrome', 'Chromium', 'Microsoft\\Edge', 'Mozilla']:
                try: winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f'Software\\{vendor}\\NativeMessagingHosts\\{NAME}')
                except FileNotFoundError: pass
        if dest.exists(): shutil.rmtree(dest)
        print('VEIL yardımcısı kaldırıldı. Tor paketi ve Tor veri dizini korundu.')
        return
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'native' / 'host.py', dest / 'host.py')
    tor_path = args.tor_path or shutil.which('tor') or shutil.which('tor.exe')
    if tor_path:
        (dest / 'config.json').write_text(json.dumps({'tor_path': str(Path(tor_path).resolve())}), encoding='utf-8')
    if sys.platform == 'win32':
        # Chrome Windows'ta gerçek bir executable ister; PyInstaller ile yerel olarak paketle.
        try: import PyInstaller  # noqa: F401
        except ImportError: raise SystemExit('Önce: py -m pip install pyinstaller')
        subprocess.run([sys.executable, '-m', 'PyInstaller', '--onefile', '--console', '--name', 'veil-host',
                        '--distpath', str(dest), '--workpath', str(dest / 'build'), '--specpath', str(dest), str(dest / 'host.py')], check=True)
        executable = dest / 'veil-host.exe'
    else:
        executable = dest / 'veil-host'
        executable.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(dest / 'host.py')) + '\n', encoding='utf-8')
        executable.chmod(0o700)
        dest.chmod(0o700)
    paths = []
    for directories, allow in [(chromium_paths, {'allowed_origins': [f'chrome-extension://{identifier}/']}),
                               (firefox_paths, {'allowed_extensions': [FF_ID]})]:
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            manifest = directory / (NAME + '.json')
            manifest.write_text(json.dumps({'name': NAME, 'description': 'VEIL local Tor controller',
                                           'path': str(executable), 'type': 'stdio', **allow}, indent=2), encoding='utf-8')
            paths.append(str(manifest))
    if sys.platform == 'win32':
        import winreg
        for vendor in ['Google\\Chrome', 'Chromium', 'Microsoft\\Edge', 'Mozilla']:
            path = firefox_paths[0] if vendor == 'Mozilla' else chromium_paths[0]
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, f'Software\\{vendor}\\NativeMessagingHosts\\{NAME}') as key:
                winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(path / (NAME + '.json')))
    record.write_text(json.dumps(paths), encoding='utf-8')
    print('VEIL yardımcısı kuruldu. Chrome kimliği: ' + identifier)
    print('Tor: ' + (tor_path or 'bulunamadı; Tor kur veya --tor-path belirt'))
    print('Tarayıcıyı yeniden açıp eklentiden kurulumu kontrol et.')

if __name__ == '__main__':
    main()
