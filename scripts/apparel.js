(function () {
  'use strict';
  const grid=document.getElementById('apparelGrid');
  if(!grid)return;
  const endpoint='https://raise-up-events.gsantiago0829.chatgpt.site';
  const products=(window.RAISEUP_APPAREL||[]).filter(p=>p.available&&p.variants?.length);
  const printfulProducts = new Map([
    [498140720, 'the-flower'],
    [498136743, 'scarecrow'],
    [498132235, 'space-man'],
    [498123545, 'zombie-lit'],
  ]);
  let checkoutEnabled=false,selected=null;
  const buttons=[];
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value/100);
  function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
  function labeled(labelText,input){const label=el('label',undefined,'apparel-field');label.append(el('span',labelText),input);return label;}
  function select(values){const node=document.createElement('select');for(const value of values){const o=el('option',value);o.value=value;node.append(o);}return node;}
  function requestOrder(p,v,quantity){const text=['Hello Raise Up Entertainment,','I would like to request: '+p.title,'Color: '+v.color,'Size: '+v.size,'Quantity: '+quantity,'Item subtotal: '+money(v.unitAmount*quantity),'Printful variant reference: '+v.id,'Please confirm shipping, tax, availability, and the final total.'].join('\n');location.href='mailto:raiseupentllc@gmail.com?'+new URLSearchParams({subject:'Apparel order request — '+p.title,body:text});}
  const dialog=document.createElement('dialog');dialog.className='apparel-checkout';dialog.setAttribute('aria-labelledby','apparel-checkout-heading');
  dialog.innerHTML='<form id="apparelCheckoutForm"><h2 id="apparel-checkout-heading">Shipping details</h2><p id="apparelCheckoutItem"></p><p>Enter the delivery address for this order. Review shipping, tax, and the final total on Stripe before paying. Shipping is currently available within the United States.</p><label>Full name<input name="name" autocomplete="shipping name" required maxlength="100"></label><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Street address<input name="address1" autocomplete="shipping address-line1" required maxlength="160"></label><label>Apartment or suite (optional)<input name="address2" autocomplete="shipping address-line2" maxlength="160"></label><label>City<input name="city" autocomplete="shipping address-level2" required maxlength="100"></label><div class="apparel-row"><label>State<select name="state_code" autocomplete="shipping address-level1" required><option value="">Choose state</option></select></label><label>ZIP code<input name="zip" autocomplete="shipping postal-code" inputmode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" required maxlength="10"></label></div><p id="apparelCheckoutError" role="alert"></p><div class="apparel-row"><button class="btn primary" type="submit" id="apparelCheckoutSubmit">Continue to secure payment</button><button class="btn" type="button" id="apparelCheckoutCancel">Cancel</button></div></form>';
  const states={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
  const stateSelect=dialog.querySelector('[name="state_code"]');for(const [code,name]of Object.entries(states)){const option=el('option',name);option.value=code;stateSelect.append(option);}
  document.body.append(dialog);
  const close=()=>{dialog.close();selected=null;dialog.querySelector('form').reset();dialog.querySelector('#apparelCheckoutError').textContent='';};
  dialog.querySelector('#apparelCheckoutCancel').onclick=close;
  dialog.addEventListener('cancel',()=>{selected=null;dialog.querySelector('form').reset();});
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!selected)return;const submit=dialog.querySelector('#apparelCheckoutSubmit');submit.disabled=true;const requestId=selected.requestId||(selected.requestId=crypto.randomUUID());const form=new FormData(event.currentTarget);const recipient=Object.fromEntries(form.entries());recipient.country_code='US';try{const response=await fetch(endpoint+'/apparel/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,productId:selected.product.id,variantId:selected.variant.id,quantity:selected.quantity,recipient}),credentials:'omit'});const data=await response.json();if(!response.ok){const messages={variant_unavailable:'This size and color is no longer available. Please choose another option.',checkout_setup_pending:'Online checkout is temporarily unavailable. Please contact us to order.',product_needs_price_review:'This item needs an updated price. Please contact us before ordering.',invalid_shipping_address:'Check the name, email, state, ZIP code, and street address.',checkout_already_starting:'Your checkout is still starting. Please wait and try again.'};throw new Error(messages[data.error]||'We could not start checkout. Please try again or contact us.');}const url=new URL(data.url);if(url.origin!=='https://checkout.stripe.com')throw new Error('The payment page could not be verified.');location.assign(url.href);}catch(error){dialog.querySelector('#apparelCheckoutError').textContent=error.message;}finally{submit.disabled=false;}};
  grid.replaceChildren();
  for(const p of products){
    const card=el('article',undefined,'product-card');card.dataset.productId=p.id;
    const art=el('div',undefined,'product-art'),image=document.createElement('img');image.src=p.image;image.alt=p.title;image.loading='lazy';art.append(image);
    const body=el('div',undefined,'product-body'),price=el('p',p.price,'tag'),title=el('h3',p.title);
    const printfulSlug = printfulProducts.get(p.id);
    if (printfulSlug) {
      const link = el('a', 'Buy on Printful', 'btn primary');
      link.href = 'https://raiseupapparel.printful.me/product/' + printfulSlug;
      const gallery = el('a', 'See more photos', 'btn');
      gallery.href = link.href;
      body.append(price, title, gallery, link);
      card.append(art, body);
      grid.append(card);
      continue;
    }
    const color=select([...new Set(p.variants.map(v=>v.color))]),size=document.createElement('select'),quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='5';quantity.step='1';quantity.value='1';
    const controls=el('div',undefined,'apparel-options');controls.append(labeled('Color',color),labeled('Size',size),labeled('Quantity',quantity));
    const button=el('button','Request order','btn primary');button.type='button';buttons.push(button);
    const chosen=()=>p.variants.find(v=>v.color===color.value&&v.size===size.value);
    function updateSizes(){const current=size.value;size.replaceChildren();for(const value of [...new Set(p.variants.filter(v=>v.color===color.value).map(v=>v.size))]){const option=el('option',value);option.value=value;size.append(option);}if([...size.options].some(o=>o.value===current))size.value=current;updatePrice();}
    function updatePrice(){const v=chosen(),n=Number(quantity.value);button.disabled=!v||!Number.isInteger(n)||n<1||n>5;price.textContent=v?money(v.unitAmount*(Number.isInteger(n)&&n>0?n:1)):p.price;}
    color.onchange=updateSizes;size.onchange=updatePrice;quantity.oninput=updatePrice;
    button.onclick=()=>{const v=chosen(),n=Number(quantity.value);if(!v||!Number.isInteger(n)||n<1||n>5)return;if(!checkoutEnabled){requestOrder(p,v,n);return;}selected={product:p,variant:v,quantity:n};dialog.querySelector('#apparelCheckoutItem').textContent=p.title+' · '+v.color+' · '+v.size+' · Quantity '+n+' · Items '+money(v.unitAmount*n);dialog.showModal();};
    body.append(price,title,controls,button);card.append(art,body);grid.append(card);updateSizes();
  }
  if(!products.length)grid.append(el('p','Please contact us for current apparel availability.'));
  fetch(endpoint+'/apparel/status',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(status=>{checkoutEnabled=status?.enabled===true;for(const b of buttons)b.textContent=checkoutEnabled?'Checkout':'Request order';}).catch(()=>{});
})();
