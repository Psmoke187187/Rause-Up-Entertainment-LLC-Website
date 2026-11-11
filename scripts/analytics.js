(() => {
  'use strict';
  const endpoint = 'https://raise-up-events.gsantiago0829.chatgpt.site';
  const query = new URLSearchParams(location.search);
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const key = 'rue_privacy_v1';
  const read = name => { try { return JSON.parse(localStorage.getItem(name) || 'null'); } catch { return null; } };
  const write = (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); } catch {} };
  const remove = name => { try { localStorage.removeItem(name); } catch {} };
  if (query.get('analytics_exclude') === '1') write('rue_staff_excluded', true);
  if (query.get('analytics_exclude') === '0') remove('rue_staff_excluded');
  let excluded = read('rue_staff_excluded') === true;
  const saved = read(key);
  let consent = saved && Date.now() - saved.at < 180 * 86400000 ? saved.value : 'unset';
  let enabled = false, initialized = false, banner = null, session = null, queue = [], sending = false;
  let pageSeconds = 0, lastTick = performance.now(), lastAction = Date.now(), settingsAt = 0;
  const pageId = crypto.randomUUID();
  const path = location.pathname;
  const test = query.get('analytics_test') === '1';
  const safe = value => typeof value === 'string' && /^[a-zA-Z0-9/][a-zA-Z0-9_./* -]{0,99}$/.test(value) ? value.slice(0, 100) : '';
  const allowed = () => consent === 'granted' && !blocked && !excluded && enabled;
  function getSession() {
    const now = Date.now();
    let visitor = read('rue_visitor');
    if (!visitor || now - visitor.at > 180 * 86400000) { visitor = { id: crypto.randomUUID(), at: now }; write('rue_visitor', visitor); }
    let visit = read('rue_visit');
    if (!visit || now - visit.at > 1800000 || visit.visitor !== visitor.id) {
      let referrer = '';
      try { const u = new URL(document.referrer); if (u.hostname !== location.hostname) referrer = u.hostname; } catch {}
      visit = { id: crypto.randomUUID(), visitor: visitor.id, source: safe(query.get('utm_source')) || safe(referrer) || 'direct', medium: safe(query.get('utm_medium')), campaign: safe(query.get('utm_campaign')), at: now };
    }
    visit.at = now;
    write('rue_visit', visit);
    return visit;
  }
  function payload(events, visit = session) {
    return { consent: true, session: visit.id, visitor: visit.visitor, source: visit.source, medium: visit.medium, campaign: visit.campaign,
      device: /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop', test, events };
  }
  async function flush(beacon = false) {
    if (!allowed() || !session || !queue.length || sending) return;
    const events = queue.splice(0, 20), data = JSON.stringify(payload(events));
    if (beacon && navigator.sendBeacon && navigator.sendBeacon(endpoint + '/events', new Blob([data], { type: 'text/plain' }))) return;
    sending = true;
    try {
      const response = await fetch(endpoint + '/events', { method: 'POST', body: data, headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true });
      if (!response.ok) throw new Error('delivery');
      const result = await response.json();
      if (result.paused) { enabled = false; queue = []; }
    } catch { if (allowed()) queue = events.concat(queue).slice(0, 80); }
    finally { sending = false; }
  }
  function track(type, details = {}) {
    if (!allowed()) return false;
    const visit = getSession();
    if (session && session.id !== visit.id) { flush(true); queue = []; }
    session = visit;
    const event = { id: crypto.randomUUID(), page_id: pageId, type, path };
    for (const field of ['beat', 'product', 'detail']) if (safe(details[field])) event[field] = safe(details[field]);
    for (const field of ['seconds', 'percent']) if (typeof details[field] === 'number' && Number.isFinite(details[field])) event[field] = Math.max(0, details[field]);
    queue.push(event);
    if (queue.length >= 15) flush();
    return true;
  }
  async function activate() {
    if (consent !== 'granted' || blocked || excluded) return;
    try {
      const result = await fetch(endpoint + '/public-settings', { credentials: 'omit', cache: 'no-store' });
      if (!result.ok) return;
      enabled = (await result.json()).enabled === true;
      settingsAt = Date.now();
      if (enabled && !initialized) {
        initialized = true; session = getSession(); lastTick = performance.now(); lastAction = Date.now(); pageSeconds = 0;
        track('page_view');
        window.dispatchEvent(new Event('rue:analytics-enabled'));
        flush();
      }
    } catch { /* Analytics never blocks the store. */ }
  }
  function setConsent(value) {
    if (!['granted', 'denied'].includes(value)) return;
    consent = value;
    write(key, { value, at: Date.now() });
    if (value === 'denied') { enabled = false; queue = []; pageSeconds = 0; initialized = false; remove('rue_visit'); remove('rue_visitor'); }
    else activate();
    banner?.remove(); banner = null;
    window.dispatchEvent(new Event('rue:consent-change'));
  }
  function showPreferences() {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'analytics-consent'; banner.setAttribute('aria-label', 'Analytics preferences');
    banner.innerHTML = '<div><strong>Your privacy choices</strong><p>Allow optional analytics to help us see which beats and products people enjoy. Your choice never affects previews or checkout. <a href="privacy.html">Privacy details</a></p><p class="privacy-status"></p></div><div class="consent-actions"><button type="button" data-consent="denied">Decline analytics</button><button type="button" data-consent="granted">Allow analytics</button></div>';
    banner.querySelector('.privacy-status').textContent = blocked ? 'Your browser privacy signal keeps analytics off.' : excluded ? 'This browser is excluded from owner reports.' : '';
    if (blocked || excluded) banner.querySelector('[data-consent="granted"]').disabled = true;
    banner.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => setConsent(button.dataset.consent)));
    document.body.appendChild(banner);
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-analytics-preferences]')) { showPreferences(); return; }
    if (event.target.closest('[data-restore-analytics]')) { excluded = false; remove('rue_staff_excluded'); banner?.remove(); banner = null; showPreferences(); return; }
    const anchor = event.target.closest('a[href]'); if (!anchor) return;
    const product = anchor.closest('[data-product-id]')?.dataset.productId;
    if (product) track('product_click', { product });
    const href = anchor.getAttribute('href');
    if (/^(mailto:|tel:)/.test(href)) { track('contact', { detail: product ? 'apparel-order' : href.startsWith('mailto:') ? 'email' : 'phone' }); return; }
    let destination; try { destination = new URL(href, location.href); } catch { return; }
    if (destination.hostname === 'buy.stripe.com' && anchor.dataset.beatId) {
      track('checkout_click', { beat: anchor.dataset.beatId });
      if (allowed()) { destination.searchParams.set('client_reference_id', getSession().id); anchor.href = destination.href; }
      else if (destination.searchParams.has('client_reference_id')) { destination.searchParams.delete('client_reference_id'); anchor.href = destination.href; }
      flush(true);
    } else if (destination.origin === location.origin) track('navigation', { detail: destination.pathname });
    else if (/^https?:$/.test(destination.protocol)) track('outbound', { detail: safe(destination.hostname) });
  }, true);
  const depths = new Set();
  for (const type of ['pointerdown', 'keydown', 'scroll']) document.addEventListener(type, () => { lastAction = Date.now(); }, { passive: true });
  document.addEventListener('scroll', () => {
    if (!allowed()) return;
    const maximum = document.documentElement.scrollHeight - innerHeight; if (maximum <= 0) return;
    const value = scrollY / maximum * 100;
    for (const percent of [25, 50, 75, 90]) if (value >= percent && !depths.has(percent)) { depths.add(percent); track('scroll', { percent }); }
  }, { passive: true });
  function sendTime(type = 'page_time') { if (pageSeconds > 0 && allowed()) { track(type, { seconds: Math.min(20, Math.round(pageSeconds * 10) / 10) }); pageSeconds = 0; } }
  setInterval(() => {
    const now = performance.now(), elapsed = Math.min(2, (now - lastTick) / 1000); lastTick = now;
    const audio = document.getElementById('audio');
    if (allowed() && document.visibilityState !== 'hidden' && document.hasFocus() && (Date.now() - lastAction < 60000 || audio && !audio.paused)) pageSeconds += elapsed;
    if (Date.now() - settingsAt > 60000 && consent === 'granted' && !blocked && !excluded) { settingsAt = Date.now(); activate(); }
  }, 1000);
  setInterval(() => { sendTime(); flush(); }, 15000);
  setInterval(() => flush(), 3000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { sendTime('page_exit'); flush(true); } else lastTick = performance.now(); });
  window.addEventListener('pagehide', () => { window.dispatchEvent(new Event('rue:page-exit')); sendTime('page_exit'); flush(true); });
  window.RUEAnalytics = Object.freeze({ track, setConsent, showPreferences, status: () => ({ enabled, consent, excluded, blocked, test }) });
  activate();
  if (consent === 'unset' && !blocked && !excluded) showPreferences();
})();
