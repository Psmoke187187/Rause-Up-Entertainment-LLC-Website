(() => {
  'use strict';
  const root = document.getElementById('bundleBuilder');
  const size = document.getElementById('bundleSize');
  const list = document.getElementById('bundleChoiceGrid');
  const summary = document.getElementById('bundleStatus');
  const request = document.getElementById('bundleRequest');
  if (!root || !size || !list || !summary || !request) return;
  const inventory = window.RAISEUP_PACK_INVENTORY || {};
  const catalog = Array.isArray(window.RAISEUP_PACKS) ? window.RAISEUP_PACKS : [];
  const choices = catalog.filter(p => {
    const n = inventory[p.id]?.sourceAudioCount;
    return Number.isInteger(n) && n >= 50 && n <= 99;
  });
  const selected = new Set();
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function update() {
    const need = Number(size.value) === 5 ? 5 : 3;
    const cost = need === 5 ? '$27.99' : '$17.99';
    for (const id of [...selected]) if (!choices.some(p => p.id === id)) selected.delete(id);
    if (selected.size > need) {
      for (const id of [...selected].slice(need)) selected.delete(id);
    }
    list.innerHTML = choices.map(p => {
      const checked = selected.has(p.id);
      const disabled = !checked && selected.size >= need;
      return '<label class="bundle-choice'+(checked?' is-selected':'')+'"><input type="checkbox" data-bundle-id="'+esc(p.id)+'" '+(checked?'checked ':'')+(disabled?'disabled ':'')+'/><span class="bundle-choice-title">'+esc(p.title)+'</span><small>'+inventory[p.id].sourceAudioCount+' audio files found in Drive</small></label>';
    }).join('');
    const missing = need - selected.size;
    summary.textContent = selected.size+' of '+need+' selected · Proposed bundle price '+cost+(missing ? ' · Select '+missing+' more' : ' · Ready to request review');
    request.disabled = missing > 0;
    request.textContent = missing > 0 ? 'Choose '+need+' packs to request' : 'Email my bundle request';
  }
  list.addEventListener('change', e => {
    const input = e.target.closest('[data-bundle-id]');
    if (!input) return;
    if (input.checked) selected.add(input.dataset.bundleId);
    else selected.delete(input.dataset.bundleId);
    update();
  });
  size.addEventListener('change', () => { selected.clear(); update(); });
  request.addEventListener('click', () => {
    const need = Number(size.value) === 5 ? 5 : 3;
    if (selected.size !== need) return;
    const names = choices.filter(p => selected.has(p.id)).map(p => '- '+p.title).join('\n');
    const cost = need === 5 ? '$27.99' : '$17.99';
    const subject = 'Raise Up '+need+'-pack bundle request';
    const body = 'Hello Raise Up Entertainment,\n\nI am interested in the proposed '+need+'-pack bundle for '+cost+'.\n\n'+names+'\n\nPlease confirm the final downloadable sound counts, redistribution rights and Stripe checkout link before payment. I understand this is a request, not an order.\n';
    window.location.href = 'mailto:raiseupentllc@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  });
  update();
})();
