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
const standardRequest = beat => orderEmail('Standard beat request — ' + beat.title, 'I would like a $24.99 Standard license for ' + beat.title + ' (' + beat.id + '). Please confirm the files, terms and payment instructions.');
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
    const chosen = ids.map(id => beats.find(beat => beat.id === id));
    message.textContent = 'Your email app should open with the three selected beats.';
    window.location.href = orderEmail('Pick Any 3 — $59.99', 'I would like Standard licenses for:\n' + chosen.map(beat => beat.title + ' (' + beat.id + ')').join('\n') + '\nPlease confirm the files, terms and payment instructions.');
  });
}
function card(b) { return `<article class="beat-card" data-beat-id="${esc(b.id)}"><img src="${esc(b.cover)}" alt="${esc(b.title)} beat cover" loading="lazy" width="768" height="768"><div class="beat-body"><div class="beat-heading"><p class="tag">${esc(b.genre)}</p><p class="beat-price">$24.99</p></div><h2>${esc(b.title)}</h2><p>${esc(b.mood)}</p><p class="meta">Full-length watermarked preview</p><button class="preview" data-preview-id="${esc(b.id)}" aria-label="Preview ${esc(b.title)}" aria-pressed="false">▶ Play Preview</button><div class="buy-row"><a href="${esc(standardRequest(b))}">Request Standard · $24.99</a> <a href="${esc(exclusiveRequest(b))}">Ask about Exclusive</a></div></div></article>`; }
function render(){if(!grid)return 0;const term=(search?.value||'').toLowerCase().trim(),style=genre?.value||'';const list=beats.filter(b=>(!style||b.genre===style)&&`${b.title} ${b.genre} ${b.mood}`.toLowerCase().includes(term));grid.innerHTML=list.length?list.map(card).join(''):'<div class="empty-state"><h3>No beats found</h3><p>Try another search or style.</p></div>';grid.querySelectorAll('[data-preview-id]').forEach(button=>button.addEventListener('click',()=>playBeat(beats.find(b=>b.id===button.dataset.previewId))));updatePlayer();observeCards();return list.length;}
if(genre){[...new Set(beats.map(b=>b.genre))].sort().forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;genre.appendChild(option)});genre.addEventListener('change',()=>{const count=render();track('genre_filter',{detail:genre.value||'All styles',percent:count});});}
let searchTimer;search?.addEventListener('input',()=>{const count=render();clearTimeout(searchTimer);searchTimer=setTimeout(()=>track('search',{detail:'results-'+count}),700);});
render();
