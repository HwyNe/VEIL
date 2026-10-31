import importlib.util
import io
import json
from pathlib import Path
import struct
import subprocess
import sys
import unittest
import tempfile
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('veil_host',ROOT/'native/host.py')
host=importlib.util.module_from_spec(spec); spec.loader.exec_module(host)

class NativeTests(unittest.TestCase):
    def call(self, body=None, raw=None):
        data=json.dumps(body).encode() if raw is None else raw
        r=subprocess.run([sys.executable,str(ROOT/'native/host.py')],input=struct.pack('=I',len(data))+data,capture_output=True,check=True)
        size,=struct.unpack('=I',r.stdout[:4]); self.assertEqual(size,len(r.stdout)-4)
        return json.loads(r.stdout[4:])
    def test_unknown_command(self):
        self.assertFalse(self.call({'command':'shell'})['ok'])
    def test_extra_fields(self):
        self.assertFalse(self.call({'command':'start','args':'--evil'})['ok'])
    def test_malformed_json(self):
        self.assertFalse(self.call(raw=b'{') ['ok'])
    def test_oversize(self):
        r=subprocess.run([sys.executable,str(ROOT/'native/host.py')],input=struct.pack('=I',20000),capture_output=True,check=True)
        self.assertFalse(json.loads(r.stdout[4:])['ok'])
    def test_partial_read(self):
        class Slow(io.BytesIO):
            def read(self,n): return super().read(min(n,1))
        self.assertEqual(host.read_exact(Slow(b'abcd'),4),b'abcd')
        with self.assertRaises(EOFError): host.read_exact(io.BytesIO(b'a'),4)
    def test_status_without_tor(self):
        with patch.object(host,'binary',return_value=None),patch.object(host,'control',side_effect=OSError):
            s=host.status(); self.assertTrue(s['ok']); self.assertFalse(s['running']); self.assertFalse(s['torInstalled'])
    def test_start_needs_real_binary(self):
        with patch.object(host,'binary',return_value=None),patch.object(host,'control',side_effect=OSError):
            with self.assertRaisesRegex(RuntimeError,'Tor bulunamadı'): host.start()
    def test_stop_never_signals_unowned_process(self):
        with patch.object(host,'status',return_value={'running':False}),patch.object(host,'control') as c:
            self.assertTrue(host.stop()['ok']); c.assert_not_called()
    def test_early_start_failure_captures_both_streams_with_spaces_in_path(self):
        with tempfile.TemporaryDirectory(prefix='veil tor ') as directory:
            data=Path(directory)
            fake=data/'fake_tor'
            fake.write_text('#!'+sys.executable+'\nimport sys\nprint("[notice] stdout captured", flush=True)\nprint("[err] early startup failure", file=sys.stderr, flush=True)\nsys.exit(7)\n')
            fake.chmod(0o700)
            with patch.object(host,'DATA',data),patch.object(host,'binary',return_value=str(fake)),patch.object(host,'status',return_value={'running':False}),patch.object(host,'available',return_value=True):
                with self.assertRaisesRegex(RuntimeError,r'çıkış 7.*early startup failure'):
                    host.start()
            config=(data/'torrc').read_text()
            self.assertIn('Log notice stdout',config)
            self.assertNotIn('Log notice file',config)
            log=(data/'tor.log').read_text()
            self.assertIn('stdout captured',log);self.assertIn('early startup failure',log)
    def test_occupied_port_does_not_launch_tor(self):
        with patch.object(host,'binary',return_value='/fake/tor'),patch.object(host,'status',return_value={'running':False}),patch.object(host,'available',return_value=False),patch.object(host.subprocess,'Popen') as popen:
            with self.assertRaisesRegex(RuntimeError,'portu başka'):
                host.start()
            popen.assert_not_called()
    def test_live_owned_tor_is_reused(self):
        existing={'ok':True,'running':True,'bootstrap':100,'socksReady':True}
        with patch.object(host,'status',return_value=existing),patch.object(host.subprocess,'Popen') as popen:
            self.assertEqual(host.start(),existing);popen.assert_not_called()
    def test_exit_country_validation(self):
        self.assertTrue(self.call({'command':'status'})['ok'])
        for body in [{'command':'start','exitCountry':'xx'},{'command':'start','exitCountry':'tr;ls'},{'command':'start','exitCountry':['tr']},
                     {'command':'status','exitCountry':'tr'},{'command':'stop','exitCountry':'tr'},{'command':'start','exitCountry':'tr','args':'x'}]:
            self.assertFalse(self.call(body)['ok'],body)
    def test_exit_country_written_to_torrc_and_recorded(self):
        with tempfile.TemporaryDirectory(prefix='veil tor ') as directory:
            data=Path(directory)
            fake=data/'fake_tor'
            fake.write_text('#!'+sys.executable+'\nimport sys\nprint(\"[err] Unable to load GeoIP file\", flush=True)\nsys.exit(1)\n')
            fake.chmod(0o700)
            with patch.object(host,'DATA',data),patch.object(host,'binary',return_value=str(fake)),patch.object(host,'status',return_value={'running':False}),patch.object(host,'available',return_value=True):
                with self.assertRaisesRegex(RuntimeError,'GeoIP'):
                    host.start('tr')
            config=(data/'torrc').read_text()
            self.assertIn('ExitNodes {tr}',config); self.assertIn('StrictNodes 1',config)
            self.assertEqual(host.recorded_exit() if False else (data/'exit_country').read_text(),'tr')
            with patch.object(host,'DATA',data),patch.object(host,'binary',return_value=str(fake)),patch.object(host,'status',return_value={'running':False}),patch.object(host,'available',return_value=True):
                with self.assertRaises(RuntimeError): host.start('')
            config=(data/'torrc').read_text()
            self.assertNotIn('ExitNodes',config); self.assertNotIn('StrictNodes',config)
    def test_unsupported_country_never_reaches_torrc(self):
        with patch.object(host.subprocess,'Popen') as popen:
            with self.assertRaisesRegex(ValueError,'çıkış ülkesi'): host.start('xx')
            popen.assert_not_called()
    def test_running_tor_with_other_country_is_restarted_not_reused(self):
        running={'ok':True,'running':True,'bootstrap':100,'socksReady':True}
        with tempfile.TemporaryDirectory() as directory:
            data=Path(directory); (data/'exit_country').write_text('de')
            with patch.object(host,'DATA',data),patch.object(host,'status',return_value=running),patch.object(host,'binary',return_value=None),patch.object(host,'shutdown_owned') as down:
                with self.assertRaisesRegex(RuntimeError,'Tor bulunamadı'): host.start('tr')
                down.assert_called_once()
            with patch.object(host,'DATA',data),patch.object(host,'status',return_value=running),patch.object(host,'shutdown_owned') as down:
                self.assertEqual(host.start('de'),running); down.assert_not_called()

if __name__=='__main__': unittest.main()
