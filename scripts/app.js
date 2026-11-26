'use strict';
const audio = document.getElementById('audio'), playerTitle = document.getElementById('playerTitle'), playerBtn = document.getElementById('playerBtn');
const grid = document.getElementById('beatGrid'), search = document.getElementById('search'), genre = document.getElementById('genre');
const beats = Array.isArray(window.RAISEUP_BEATS) ? window.RAISEUP_BEATS : [];
const track = (type, data) => window.RUEAnalytics?.track(type, data);
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current = null, started = false, listened = 0, pending = 0, metrics = window.createPreviewMetrics();
function updatePlayer() {
  const playing = audio && !audio.paused && !audio.ended;
  if (playerBtn) { playerBtn.textContent = playing ? '❚❚' : '▶'; playerBtn.setAttribute('aria-label', playing ? 'Pause preview' : 'Play preview'); }
  grid?.querySelectorAll('[data-preview-id]').forEach(button => { const active = current?.id === button.dataset.previewId && playing; button.textContent = active ? '❚❚ Pause Preview' : '▶ Play Preview'; button.setAttribute('aria-pressed', String(active)); });
}
function sendListening() { if (current && pending > 0) { track('beat_listen', {beat: current.id, seconds: Math.min(20,pending), percent: Math.min(100, Math.round(listened / 30 * 100))}); pending = 0; } }
function resetMetrics() { metrics = window.createPreviewMetrics(); listened = 0; pending = 0; }
function playBeat(beat) {
  if (!audio || !beat) return;
  if (current?.id === beat.id && !audio.paused) { audio.pause(); return; }
  if (current?.id !== beat.id || audio.ended) { audio.pause(); sendListening(); current = beat; started = false; resetMetrics(); audio.src = beat.preview; }
  playerTitle.textContent = beat.title;
  audio.play().catch(() => { playerTitle.textContent = beat.title + ' — tap play to retry'; updatePlayer(); });
}
playerBtn?.addEventListener('click', () => { if (current) playBeat(current); });
audio?.addEventListener('playing', () => { metrics.reset(); track(started ? 'beat_resume' : 'beat_start', {beat: current.id}); started = true; updatePlayer(); });
audio?.addEventListener('pause', () => { sendListening(); metrics.reset(); if (current && !audio.ended) track('beat_pause', {beat:current.id,percent:Math.round(listened/30*100)}); updatePlayer(); });
audio?.addEventListener('seeking', () => metrics.reset());
audio?.addEventListener('timeupdate', () => { const result = metrics.sample(audio.currentTime, performance.now()/1000, !audio.paused, audio.seeking); listened=result.total; pending+=result.delta; if(pending>=5)sendListening(); });
audio?.addEventListener('ended', () => { sendListening(); track('beat_complete', {beat:current.id,percent:Math.min(100,Math.round(listened/30*100))}); updatePlayer(); });
audio?.addEventListener('error', () => { if (!current) return; track('beat_error', {beat:current.id,detail:String(audio.error?.code||0)}); playerTitle.textContent=current.title+' — preview unavailable; please retry'; updatePlayer(); });
window.addEventListener('rue:analytics-enabled', () => {resetMetrics(); if(current&&!audio.paused)track('beat_start',{beat:current.id}); observeCards();});
window.addEventListener('rue:page-exit', sendListening);
const impressions = new Set();
const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {entries.forEach(entry=>{const id=entry.target.dataset.beatId;if(entry.isIntersecting&&!impressions.has(id)&&track('beat_impression',{beat:id})){impressions.add(id);observer.unobserve(entry.target)}})}, {threshold:.5}) : null;
function observeCards(){observer?.disconnect();grid?.querySelectorAll('.beat-card').forEach(card=>observer?.observe(card));}
const orderEmail = (subject, body) => 'mailto:raiseupentllc@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
const standardCheckouts = {
  "club": {
    "url": "https://buy.stripe.com/cNi5kC7aPfzi47nf7rcs81c",
    "format": "MP3"
  },
  "dark-detroit": {
    "url": "https://buy.stripe.com/7sY28q9iX2MwcDT1gBcs81e",
    "format": "MP3"
  },
  "motovation": {
    "url": "https://buy.stripe.com/8x28wO8eT0EodHXbVfcs81d",
    "format": "MP3"
  },
  "bad-bitch": {
    "url": "https://buy.stripe.com/dRm3cu0Mr5YIdHX7EZcs81f",
    "format": "MP3"
  },
  "country-hore-beat": {
    "url": "https://buy.stripe.com/5kQ00i9iX4UEcDT8J3cs81i",
    "format": "MP3"
  },
  "the-next-hit": {
    "url": "https://buy.stripe.com/5kQdR89iX1Is6fv4sNcs81h",
    "format": "MP3"
  },
  "violin-project": {
    "url": "https://buy.stripe.com/14A00i66L86Q5brgbvcs81j",
    "format": "MP3"
  },
  "swervin": {
    "url": "https://buy.stripe.com/9B6aEW66L5YI9rH8J3cs81g",
    "format": "MP3"
  },
  "mafia-drill": {
    "url": "https://buy.stripe.com/fZubJ01Qv5YI6fvaRbcs81k",
    "format": "MP3"
  },
  "western-drill": {
    "url": "https://buy.stripe.com/5kQ6oG66LdrabzP9N7cs81n",
    "format": "WAV"
  },
  "hard-hopes": {
    "url": "https://buy.stripe.com/fZueVc8eTgDm9rHcZjcs81l",
    "format": "WAV"
  },
  "taliban": {
    "url": "https://buy.stripe.com/eVqcN4an1eve1ZfaRbcs81m",
    "format": "MP3"
  },
  "streets-of-new-york": {
    "url": "https://buy.stripe.com/5kQbJ0br51Is6fv6AVcs81p",
    "format": "MP3"
  },
  "night-b4-halloween": {
    "url": "https://buy.stripe.com/5kQfZg1Qv5YI0Vb5wRcs81q",
    "format": "MP3"
  },
  "get-back": {
    "url": "https://buy.stripe.com/eVq6oGgLpfzi1Zf7EZcs81r",
    "format": "MP3"
  },
  "twisted-minds": {
    "url": "https://buy.stripe.com/fZucN4br53QA9rHgbvcs81o",
    "format": "MP3"
  },
  "hero": {
    "url": "https://buy.stripe.com/00w8wObr51IseM17EZcs81t",
    "format": "WAV"
  },
  "music-box": {
    "url": "https://buy.stripe.com/6oU8wO7aP0EocDT6AVcs81u",
    "format": "MP3"
  },
  "dark-drill": {
    "url": "https://buy.stripe.com/9B6eVcbr5gDm5br1gBcs81v",
    "format": "WAV"
  },
  "viking": {
    "url": "https://buy.stripe.com/bJe4gycv9cn6gU96AVcs81s",
    "format": "WAV"
  }
};
const bundleCheckout = "https://buy.stripe.com/eVqeVcdzdfzi33j1gBcs81w";
const exclusiveRequest = beat => orderEmail('Exclusive beat inquiry — ' + beat.title, 'I am interested in the $249 Exclusive offer for ' + beat.title + ' (' + beat.id + '). Please confirm eligibility, previous licenses, trackouts and any Standard upgrade credit.');
const bundleForm = document.getElementById('beatBundle');
if (bundleForm) {
  const selects = Array.from(bundleForm.querySelectorAll('select'));
  for (const select of selects) {
    for (const beat of beats) select.add(new Option(beat.title, beat.id));
  }
  bundleForm.addEventListener('submit', event => {
    event.preventDefault();
    const ids = selects.map(select => select.value);
    const message = document.getElementById('bundleMessage');
    if (new Set(ids).size !== 3 || ids.some(id => !id)) {
      message.textContent = 'Choose three different beats.';
      return;
    }
    const checkout = new URL(bundleCheckout);
    checkout.searchParams.set('client_reference_id', ['pick3', ...ids].join('__'));
    window.location.assign(checkout.href);
  });
}
function card(b) { return `<article class="beat-card" data-beat-id="${esc(b.id)}"><img src="${esc(b.cover)}" alt="${esc(b.title)} beat cover" loading="lazy" width="768" height="768"><div class="beat-body"><div class="beat-heading"><p class="tag">${esc(b.genre)}</p><p class="beat-price">$24.99</p></div><h2>${esc(b.title)}</h2><p>${esc(b.mood)}</p><p class="meta">Full-length watermarked preview · ${esc(standardCheckouts[b.id].format)} master</p><button class="preview" data-preview-id="${esc(b.id)}" aria-label="Preview ${esc(b.title)}" aria-pressed="false">▶ Play Preview</button><div class="buy-row"><a href="${esc(standardCheckouts[b.id].url)}">Buy Standard · $24.99</a> <a href="${esc(exclusiveRequest(b))}">Ask about Exclusive</a></div></div></article>`; }
function render(){if(!grid)return 0;const term=(search?.value||'').toLowerCase().trim(),style=genre?.value||'';const list=beats.filter(b=>(!style||b.genre===style)&&`${b.title} ${b.genre} ${b.mood}`.toLowerCase().includes(term));grid.innerHTML=list.length?list.map(card).join(''):'<div class="empty-state"><h3>No beats found</h3><p>Try another search or style.</p></div>';grid.querySelectorAll('[data-preview-id]').forEach(button=>button.addEventListener('click',()=>playBeat(beats.find(b=>b.id===button.dataset.previewId))));updatePlayer();observeCards();return list.length;}
if(genre){[...new Set(beats.map(b=>b.genre))].sort().forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;genre.appendChild(option)});genre.addEventListener('change',()=>{const count=render();track('genre_filter',{detail:genre.value||'All styles',percent:count});});}
let searchTimer;search?.addEventListener('input',()=>{const count=render();clearTimeout(searchTimer);searchTimer=setTimeout(()=>track('search',{detail:'results-'+count}),700);});
render();
