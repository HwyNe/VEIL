# VEIL

Local Tor management and a lightweight ad shield for Chrome and Firefox, by HwyNe.

Repository: [hwyne/VEIL](https://github.com/hwyne/VEIL).

[Türkçe README](README.md) · [Detailed Turkish guide](README_TR.md) · [Test status](docs/TEST_DURUMU.md) · [MIT license](LICENSE)

**Experimental preview:** not published in a browser store. Fifty-nine automated tests passed, but browser APIs and DOM behavior are mocked. Real Chrome/Firefox loading, live Tor connectivity, YouTube behavior and platform installers still need acceptance testing in the development environment.

## Features

- Manage a local Tor process using a small native messaging helper.
- Route the browser's proxy-supported web requests through local SOCKS5.
- Verify the Tor exit using `check.torproject.org` before showing a connected state.
- Apply 86 network rules (81 ad/tracker domains + 5 YouTube ad paths) and limited cosmetic filtering.
- YouTube: strip ad data from player responses and skip ads that still start (YouTube-only scripts; no video seeking on other sites). YouTube changes its delivery often, so full blocking is not guaranteed.
- Optional Tor exit country (Settings). YouTube picks ads by exit country; choosing one such as Türkiye gives local ads at the cost of speed and anonymity.
- Fall back to the previous normal/system proxy configuration when Tor fails, pause ad blocking and notify the user. The normal IP becomes visible to websites.
- Retry Tor after 24 minutes; restore the previous ad-blocking preference after successful verification.
- Provide an optional support link and dismissible three-day reminder. No payment account is preconfigured.

This is not Tor Browser, a system VPN, a complete YouTube ad blocker or a guarantee against identity/DNS/WebRTC leaks.

## Install

1. Download this repository using **Code → Download ZIP** and extract it to a permanent directory.
2. Chrome 120+: open `chrome://extensions`, enable Developer mode, choose **Load unpacked** and select **`dist/chrome`**. Do not select the repository root, Downloads directory or ZIP archive.
3. Firefox 140+: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `dist/firefox/manifest.json`. Allow the extension in private windows, as required by Firefox's proxy API. Temporary installations disappear when Firefox closes.
4. From the extracted repository directory, on CachyOS/Arch, Debian/Ubuntu or Fedora:

   ```bash
   bash native/install-linux.sh
   ```

   Run as your normal user. The script installs missing Tor/Python packages using the distribution package manager and requests sudo when necessary. It registers the native host in user-level browser locations.

5. Restart the browser. Open VEIL settings, check the helper installation, then enable Tor. Normal browsing continues while Tor bootstraps. Reload existing pages after verification.

Windows, macOS, uninstallation and an existing local Tor service are covered in [the detailed guide](README_TR.md). Windows/macOS installers are source deliveries and have not been tested on real devices. Flatpak/Snap native messaging is not a supported configuration in this first version.

The local native helper is required because a browser extension cannot directly launch the Tor executable. A pure install-and-click extension without a local helper would require a separate hosted proxy service, which this repository does not provide.

## Preview

Download and open [VEIL_Onizleme.html](VEIL_Onizleme.html) locally to inspect the interface. It is an offline UI demo and does not establish a real connection. GitHub's file view does not execute the demo.

## Connection behavior

When Tor fails, the extension releases its proxy override, stops its managed Tor process, temporarily pauses network and cosmetic ad filtering, and schedules another attempt after 24 minutes. Previously configured browser/system proxy settings can become active again. An external Tor service is not stopped by this extension. The countdown is an application retry interval, not a Tor network quota.

Already-open connections and cached page content may behave differently. Disconnect detection is not always immediate; requests can fail before the extension detects a proxy problem. Closing the browser or suspending the computer can delay alarms. Multiple profiles using the same managed local Tor process are not isolated in this version.

## Privacy

Settings and the last connection state are stored locally. No browsing history, passwords, cookies or page content are sent to the developer. The Tor verification endpoint sees the exit IP. There are no remote scripts, analytics or external fonts. Existing cookies and signed-in accounts are retained. Switching to Tor does not make those accounts anonymous.

## Development

Python 3.10+ and Node.js 20+:

```bash
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/build.py
python3 scripts/preview.py
```

Pillow is only needed to regenerate icons with `scripts/icons.py`. Runtime extension code has no npm/pip dependencies. The native helper uses Python's standard library and a separately installed Tor binary.

## Contribute and support

Please include browser/OS versions, connection mode and steps to reproduce in bug reports. Do not include private browsing records or credentials. Testing, documentation improvements and sharing the project are welcome.

A funding URL has not been configured. The maintainer can fill out [.github/FUNDING.example.yml](.github/FUNDING.example.yml), rename it to `.github/FUNDING.yml`, and add their real payment account. No account is guessed or created by this project. Donations may support future development and store distribution; popularity does not guarantee funding.

## License

[MIT](LICENSE). Not affiliated with the Tor Project. No Tor executable is bundled in this repository.
