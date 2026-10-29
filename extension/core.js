/* Ortak doğrulama ve sayaç mantığı; tarayıcıdan bağımsızdır. */
(function (root) {
  'use strict';
  const RETRY_MS = 24 * 60 * 1000;
  const DONATION_MS = 3 * 24 * 60 * 60 * 1000;
  const defaults = () => ({
    version: 1, torEnabled: false, adblockEnabled: true, adblockActive: null, filterError: '', mode: 'managed', port: 19050,
    status: 'off', retryUntil: 0, connectDeadline: 0, lastVerifiedAt: 0, lastError: '', privacyWarning: '', adblockPaused: false,
    reminderEnabled: true, nextDonationAt: Date.now() + DONATION_MS, donationPending: false,
    supportUrl: '', ip: '', nativeAvailable: false, bootstrap: 0
  });
  function port(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1024 || n > 65535) throw new Error('Port 1024–65535 arasında olmalı.');
    return n;
  }
  function supportUrl(value) {
    if (!value || !value.trim()) return '';
    let u;
    try { u = new URL(value.trim()); } catch { throw new Error('Geçerli bir destek bağlantısı gir.'); }
    const hosts = ['buymeacoffee.com', 'www.buymeacoffee.com', 'patreon.com', 'www.patreon.com', 'ko-fi.com', 'www.ko-fi.com'];
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !hosts.includes(u.hostname)) {
      throw new Error('HTTPS Buy Me a Coffee, Patreon veya Ko-fi bağlantısı kullan.');
    }
    return u.href;
  }
  function remaining(until, now = Date.now()) {
    const seconds = Math.max(0, Math.ceil((until - now) / 1000));
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  const core = { RETRY_MS, DONATION_MS, defaults, port, supportUrl, remaining };
  root.VeilCore = core;
  if (typeof module !== 'undefined') module.exports = core;
})(globalThis);
