#!/usr/bin/env python3
"""VEIL native messaging host. Yalnızca start/status/stop kabul eder; kabuk çalıştırmaz."""
from __future__ import annotations
import contextlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import struct
import subprocess
import sys
import time

NAME = 'com.hwyne.veil'
SOCKS_PORT, CONTROL_PORT = 19050, 19051
INSTALL = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent
DATA = Path(os.environ.get('LOCALAPPDATA', str(Path.home() / '.local' / 'share'))) / 'veil' / 'tor'
COOKIE = DATA / 'control_auth_cookie'
MAX_MESSAGE = 16384
# Eklentideki VeilCore.COUNTRIES ile aynı olmalı; torrc'ye yalnızca bu iki harfli kodlar yazılır.
EXIT_COUNTRIES = {'tr', 'de', 'nl', 'fr', 'gb', 'se', 'ch', 'at', 'fi', 'no', 'ro', 'us'}

def binary():
    # Kurulumla kaydedilmiş dosya yolu veya PATH; eklenti bir dosya yolu gönderemez.
    config = INSTALL / 'config.json'
    if config.is_file():
        value = json.loads(config.read_text(encoding='utf-8')).get('tor_path')
        if value and Path(value).is_file():
            return str(Path(value).resolve())
    candidates = [INSTALL / 'bin' / ('tor.exe' if os.name == 'nt' else 'tor')]
    for p in candidates:
        if p.is_file():
            return str(p)
    return shutil.which('tor') or (shutil.which('tor.exe') if os.name == 'nt' else None)

@contextlib.contextmanager
def lock():
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name != 'nt':
        DATA.chmod(0o700)
    with (DATA / 'controller.lock').open('a+b') as f:
        if os.name == 'nt':
            import msvcrt
            f.seek(0)
            if not f.read(1):
                f.write(b'0'); f.flush()
            f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            if os.name == 'nt':
                f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

def control(command):
    """Cookie ile kendi Tor sürecine bağlan; PID üzerinden rastgele süreç öldürme."""
    token = COOKIE.read_bytes()
    if len(token) != 32:
        raise RuntimeError('Tor kontrol çerezi geçersiz.')
    with socket.create_connection(('127.0.0.1', CONTROL_PORT), timeout=2) as sock:
        sock.settimeout(2)
        stream = sock.makefile('rwb', buffering=0)
        def transact(line):
            stream.write((line + '\r\n').encode('ascii'))
            lines = []
            for _ in range(100):
                raw = stream.readline(8192)
                if not raw:
                    raise RuntimeError('Tor kontrol bağlantısı kapandı.')
                text = raw.decode('utf-8', errors='replace').strip()
                lines.append(text)
                if len(text) >= 4 and text[:3].isdigit() and text[3] == ' ':
                    if not text.startswith('250 '):
                        raise RuntimeError('Tor kontrol komutu reddedildi.')
                    return '\n'.join(lines)
            raise RuntimeError('Tor kontrol yanıtı çok uzun.')
        transact('AUTHENTICATE ' + token.hex())
        return transact(command)

def socks_ready():
    try:
        with socket.create_connection(('127.0.0.1', SOCKS_PORT), timeout=1) as s:
            s.settimeout(1); s.sendall(b'\x05\x01\x00')
            return s.recv(2) == b'\x05\x00'
    except OSError:
        return False

def status():
    running, bootstrap = False, 0
    try:
        phase = control('GETINFO status/bootstrap-phase')
        match = re.search(r'PROGRESS=(\d+)', phase)
        bootstrap = int(match.group(1)) if match else 0
        running = True
    except (OSError, RuntimeError):
        pass
    return {'ok': True, 'torInstalled': bool(binary()), 'running': running,
            'bootstrap': bootstrap, 'socksReady': running and socks_ready(), 'port': SOCKS_PORT}

def available(port):
    with socket.socket() as s:
        try:
            s.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False

def recorded_exit():
    try:
        return (DATA / 'exit_country').read_text(encoding='ascii').strip()
    except OSError:
        return ''

def shutdown_owned():
    # Yalnızca cookie ile doğrulanan, VEIL'in kendi Tor süreci kapatılır.
    control('SIGNAL SHUTDOWN')
    for _ in range(50):
        if available(SOCKS_PORT) and available(CONTROL_PORT):
            return
        time.sleep(0.2)
    raise RuntimeError('Çıkış ülkesi değiştirilirken Tor zamanında kapanmadı.')

def start(exit_country=''):
    if exit_country and exit_country not in EXIT_COUNTRIES:
        raise ValueError('Desteklenmeyen çıkış ülkesi.')
    current = status()
    if current['running']:
        if recorded_exit() == exit_country:
            return current
        # Çalışan Tor başka çıkış ülkesiyle başlatılmış; yeni ayarla yeniden başlat.
        shutdown_owned()
    tor = binary()
    if not tor:
        raise RuntimeError('Tor bulunamadı. native/install-linux.sh veya README kurulum adımlarını kullan.')
    if not available(SOCKS_PORT) or not available(CONTROL_PORT):
        raise RuntimeError('19050 veya 19051 portu başka bir süreç tarafından kullanılıyor.')
    torrc = DATA / 'torrc'
    def quoted(path):
        return '"' + str(path).replace('\\', '/').replace('"', '') + '"'
    torrc.write_text('\n'.join([
        'DataDirectory ' + quoted(DATA),
        f'SocksPort 127.0.0.1:{SOCKS_PORT}',
        f'ControlPort 127.0.0.1:{CONTROL_PORT}',
        'CookieAuthentication 1',
        'CookieAuthFile ' + quoted(COOKIE),
        'ClientOnly 1', 'AvoidDiskWrites 1', 'SafeLogging 1',
        *([f'ExitNodes {{{exit_country}}}', 'StrictNodes 1'] if exit_country else []),
        # Log'un dosya yolu ayrıştırıcısına bağımlı olma; çıktıyı Python dosyaya yönlendirir.
        'Log notice stdout', ''
    ]), encoding='utf-8')
    (DATA / 'exit_country').write_text(exit_country, encoding='ascii')
    options = {'stdin': subprocess.DEVNULL, 'stderr': subprocess.STDOUT,
               'cwd': str(DATA), 'close_fds': True}
    if os.name == 'nt':
        options['creationflags'] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        options['start_new_session'] = True
    # Native host yanıt verdikten sonra Tor çalışmaya devam eder; kalıcı mesaj portu gerekmez.
    # Erken yapılandırma hataları da kaydedilir; native mesaj stdout'una hiçbir şey karışmaz.
    log_path = DATA / 'tor.log'
    with log_path.open('wb') as output:
        process = subprocess.Popen([tor, '--defaults-torrc', os.devnull, '-f', str(torrc)], stdout=output, **options)
    for _ in range(12):
        if process.poll() is not None:
            with log_path.open('rb') as log:
                log.seek(0, 2)
                log.seek(max(0, log.tell() - 8192))
                lines = log.read().decode('utf-8', errors='replace').splitlines()
            warnings = [line for line in lines if '[warn]' in line or '[err]' in line]
            detail = ' | '.join((warnings or lines)[-3:])[-500:]
            hint = ' Çıkış ülkesi için GeoIP dosyası (tor-geoipdb) eksik olabilir; ayarlardan “Otomatik”i seç.' \
                if exit_country and any('geoip' in line.lower() for line in lines) else ''
            raise RuntimeError(f'Tor başlatılamadı (çıkış {process.returncode}). {detail or "tor.log boş."}{hint}')
        result = status()
        if result['running']:
            return result
        time.sleep(0.1)
    return {**status(), 'starting': True}

def stop():
    # Yalnızca cookie ile doğrulanabilen yönetilen Tor durdurulur; sistem Tor'una dokunulmaz.
    if status()['running']:
        control('SIGNAL SHUTDOWN')
    return {'ok': True, 'stopping': True}

def dispatch(message):
    # Yalnızca command; start komutunda ek olarak izin listesindeki exitCountry kabul edilir.
    if not isinstance(message, dict) or 'command' not in message or not set(message) <= {'command', 'exitCountry'}:
        raise ValueError('Yalnızca command ve (start için) exitCountry alanı kabul edilir.')
    actions = {'start': start, 'status': status, 'stop': stop}
    command = message['command']
    if command not in actions:
        raise ValueError('Komut start, status veya stop olmalı.')
    country = message.get('exitCountry', '')
    if 'exitCountry' in message and command != 'start':
        raise ValueError('exitCountry yalnızca start komutuyla kullanılabilir.')
    if not isinstance(country, str) or (country and country not in EXIT_COUNTRIES):
        raise ValueError('Desteklenmeyen çıkış ülkesi.')
    with lock():
        return start(country) if command == 'start' else actions[command]()

def read_exact(stream, size):
    data = bytearray()
    while len(data) < size:
        chunk = stream.read(size - len(data))
        if not chunk:
            raise EOFError('Eksik native mesajı.')
        data.extend(chunk)
    return bytes(data)

def main():
    # Windows stdio metin dönüşümü native çerçeveyi bozmamalı.
    if os.name == 'nt':
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    try:
        header = read_exact(sys.stdin.buffer, 4)
        length, = struct.unpack('=I', header)
        if length == 0 or length > MAX_MESSAGE:
            raise ValueError('Native mesaj boyutu geçersiz.')
        response = dispatch(json.loads(read_exact(sys.stdin.buffer, length)))
    except Exception as exc:
        response = {'ok': False, 'error': str(exc)[:600]}
    data = json.dumps(response, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(data)) + data)
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    main()
