(() => {
'use strict';
const grid=document.getElementById('packGrid'), search=document.getElementById('packSearch'),
  category=document.getElementById('packCategory'), keyFilter=document.getElementById('packKey'),
  count=document.getElementById('packCount'), player=document.getElementById('packPlayer'),
  audio=document.getElementById('packAudio'), nowPlaying=document.getElementById('packNowPlaying');
if(!grid||!search||!category||!count)return;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#f5bd49','#c59cec','#89c9cc','#e6a88c'];
const seen=new Set(), expanded=new Set(), manifest=window.RAISEUP_PACK_PREVIEWS||{};
function stripeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='buy.stripe.com'&&!u.port&&!u.username&&!u.password?u.href:'';}catch{return '';}}
const packs=(Array.isArray(window.RAISEUP_PACKS)?window.RAISEUP_PACKS:[]).filter(p=>{
  if(!p||typeof p.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id)||seen.has(p.id)||typeof p.title!=='string'||!p.title.trim())return false;
  seen.add(p.id);return true;
}).map(p=>({
  id:p.id,title:p.title.trim(),category:typeof p.category==='string'&&p.category.trim()?p.category.trim():'Sound Packs',
  description:typeof p.description==='string'?p.description:'',paymentUrl:stripeUrl(p.paymentUrl),
  soundCount:Number.isInteger(p.soundCount)&&p.soundCount>0?p.soundCount:null,
  plannedPrice:Number.isFinite(p.plannedPrice)&&p.plannedPrice>0?p.plannedPrice:null,
  price:Number.isFinite(p.price)&&p.price>0?p.price:6.99,
  sourceCount:window.RAISEUP_PACK_INVENTORY?.[p.id]?.sourceAudioCount||null,
  releaseStatus:p.releaseStatus==='preview'?'preview':'live',
  seed:Array.from(p.id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7),
  samples:(Array.isArray(manifest[p.id])?manifest[p.id]:[]).filter(s=>
    s&&typeof s.name==='string'&&typeof s.folder==='string'&&typeof s.src==='string'&&
    /^assets\/audio\/(?:pack-previews|hifi-previews)\/[a-z0-9-]+\/[a-z0-9-]+\.(?:wav|mp3)$/.test(s.src))
}));
for(const name of [...new Set(packs.map(p=>p.category))].sort()){
  const option=document.createElement('option');option.value=option.textContent=name;category.appendChild(option);
}
if(keyFilter)for(const key of [...new Set(packs.flatMap(p=>p.samples.map(s=>s.key).filter(Boolean)))].sort()){
  const opt=document.createElement('option');opt.value=opt.textContent=key;keyFilter.appendChild(opt);
}
function artwork(p){
  const bars=Array.from({length:22},(_,i)=>'<span style="height:'+(18+((p.seed>>>(i%16))+i*17)%60)+'px"></span>').join('');
  return '<div class="pack-cover" aria-hidden="true" style="--pack-accent:'+colors[p.seed%colors.length]+'"><span class="pack-art-brand">RAISE UP / SOUND LIBRARY</span><div class="pack-wave">'+bars+'</div><span class="pack-art-category">'+esc(p.category)+'</span></div>';
}
function sampleGroups(p,term,matchedPack){
  const key=keyFilter?.value||'';
  const samples=p.samples.map((s,i)=>({...s,i})).filter(s=>(!key||s.key===key)&&(matchedPack||[s.name,s.folder,s.key||'',String(s.bpm||'')].join(' ').toLowerCase().includes(term)));
  const groups=new Map();
  for(const s of samples){if(!groups.has(s.folder))groups.set(s.folder,[]);groups.get(s.folder).push(s);}
  return [...groups.entries()].map(([folder,items])=>
    '<div class="sample-folder"><h3>📁 '+esc(folder)+' <span>'+items.length+' previews</span></h3><div class="sample-items">'+items.map(s=>
      '<div class="sample-item"><button type="button" class="sample-play" data-pack="'+esc(p.id)+'" data-sample="'+s.i+'" aria-label="Play '+esc(s.name)+'"><span aria-hidden="true">▶</span> Listen</button><div class="sample-info"><strong>'+esc(s.name)+'</strong><small>'+[s.key?('Key: '+s.key):'',s.bpm?('BPM: '+s.bpm):''].filter(Boolean).map(esc).join(' · ')+(s.key||s.bpm?'':'Sample preview')+'</small></div></div>'
    ).join('')+'</div></div>'
  ).join('');
}
function card(p,term){
  const price='$'+p.price.toFixed(2);
  const hay=[p.title,p.category,p.description].join(' ').toLowerCase(),matchedPack=!term||hay.includes(term);
  const matchedSamples=p.samples.filter(s=>!keyFilter?.value||s.key===keyFilter.value);
  const availability=p.samples.length?'<span class="sample-available">'+p.samples.length+' samples to hear</span>':'<span class="sample-unavailable">Audio previews coming soon</span>';
  const preview=p.samples.length?
    '<button type="button" class="pack-expand" data-expand="'+esc(p.id)+'" aria-expanded="'+expanded.has(p.id)+'" aria-controls="preview-'+esc(p.id)+'">'+(expanded.has(p.id)?'Hide sounds':'Explore folders & listen')+' <span aria-hidden="true">'+(expanded.has(p.id)?'−':'+')+'</span></button>'+
    '<div id="preview-'+esc(p.id)+'" class="pack-samples"'+(expanded.has(p.id)?'':' hidden')+'>'+
      (sampleGroups(p,term,matchedPack)||'<p>No sound previews match this filter.</p>')+
    '</div>':'';
  const detail=p.soundCount?'<p class="pack-confirmed-count">'+p.soundCount+' WAV files curated · '+p.samples.length+' previews</p>' :p.sourceCount?'<p class="pack-confirmed-count">'+p.sourceCount+' source audio files inventoried · '+p.samples.length+' previews</p>':'';
  const buy=p.paymentUrl?'<a class="btn primary pack-buy" href="'+esc(p.paymentUrl)+'" target="_blank" rel="noopener" data-product-id="'+esc(p.id)+'" aria-label="Buy '+esc(p.title)+' for '+price+'">Buy full pack <span>'+price+' <span aria-hidden="true">↗</span></span></a>' :p.releaseStatus==='preview'?'<a class="btn pack-buy pack-soon-buy" href="mailto:raiseupentllc@gmail.com?subject='+encodeURIComponent('Sound pack launch: '+p.title)+'" aria-label="Ask when '+esc(p.title)+' will be available">Ask about launch <span>Coming soon</span></a>':'<button class="btn pack-buy" type="button" disabled>Checkout unavailable</button>';
  return '<article class="product-card pack-card" id="'+esc(p.id)+'" data-product-id="'+esc(p.id)+'">'+artwork(p)+'<div class="pack-body"><p class="pack-category">'+esc(p.category)+'</p><h2><a href="#'+esc(p.id)+'">'+esc(p.title)+'</a></h2>'+(p.description?'<p class="pack-description">'+esc(p.description)+'</p>':'')+detail+'<div class="sample-status">'+availability+'</div>'+preview+buy+'</div></article>';
}
function render(){
  const term=search.value.trim().toLowerCase(),selected=category.value,key=keyFilter?.value||'';
  const visible=packs.filter(p=>{
    if(selected&&p.category!==selected)return false;
    if(key&&!p.samples.some(s=>s.key===key))return false;
    const match=[p.title,p.category,p.description].join(' ').toLowerCase().includes(term);
    return !term||match||p.samples.some(s=>[s.name,s.folder,s.key||'',String(s.bpm||'')].join(' ').toLowerCase().includes(term));
  });
  const ready=packs.filter(p=>p.samples.length).length;
  count.textContent='Showing '+visible.length+' of '+packs.length+' packs · '+ready+' packs with playable previews';
  grid.innerHTML=visible.length?visible.map(p=>card(p,term)).join(''):'<div class="empty-state"><h2>'+(packs.length?'No matching packs':'The pack catalog is unavailable')+'</h2><p>Try a different pack name, folder, instrument, tempo, or key.</p><button class="btn" type="button" data-clear-packs>Clear filters</button></div>';
  return visible.length;
}
let timer;search.addEventListener('input',()=>{const n=render();clearTimeout(timer);timer=setTimeout(()=>window.RUEAnalytics?.track('search',{detail:'packs-results-'+n}),700);});
category.addEventListener('change',()=>render());
keyFilter?.addEventListener('change',()=>render());
grid.addEventListener('click',event=>{
  if(event.target.closest('[data-clear-packs]')){search.value=category.value='';if(keyFilter)keyFilter.value='';render();search.focus();return;}
  const toggle=event.target.closest('[data-expand]');if(toggle){const id=toggle.dataset.expand;if(expanded.has(id))expanded.delete(id);else expanded.add(id);render();return;}
  const play=event.target.closest('[data-sample]');if(!play||!audio||!nowPlaying||!player)return;
  const pack=packs.find(p=>p.id===play.dataset.pack),s=pack?.samples[Number(play.dataset.sample)];if(!s)return;
  if(audio.getAttribute('src')===s.src&&!audio.paused){audio.pause();return;}
  audio.src=s.src;audio.volume=Number.isFinite(s.volume)?Math.max(0.05,Math.min(1,s.volume)):1;nowPlaying.textContent=pack.title+' · '+s.folder+' / '+s.name;
  player.hidden=false;audio.play().catch(()=>{nowPlaying.textContent+=' — Tap play to listen';});
  window.RUEAnalytics?.track('preview_play',{detail:('Sound pack: '+pack.id).slice(0,100)});
});
function revealHash(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
  if(!packs.some(p=>p.id===id))return;
  if(!document.getElementById(id)){search.value=category.value='';if(keyFilter)keyFilter.value='';render();}
  document.getElementById(id)?.scrollIntoView({block:'start'});
}
window.addEventListener('hashchange',revealHash);render();revealHash();
})();
