const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync('scripts/apparel-catalog.js','utf8'),context);
const products=context.window.RAISEUP_APPAREL;
test('synced apparel contains the four new designs and only unique, priced, fulfillment-linked options',()=>{
  assert.equal(products.length,33);
  assert.equal(new Set(products.map(p=>p.id)).size,products.length);
  const variants=new Set();
  for(const id of [498140720,498136743,498132235,498123545]){const p=products.find(p=>p.id===id);assert.ok(p?.available);assert.ok(p.variants.length>=9);}
  for(const p of products){assert.match(p.image,/^https:\/\/files\.cdn\.printful\.com\//);assert.equal(p.available,p.variants.length>0);const combinations=new Set();for(const v of p.variants){assert.ok(Number.isSafeInteger(v.id)&&Number.isSafeInteger(v.variantId));assert.ok(Number.isSafeInteger(v.unitAmount)&&v.unitAmount>0);assert.ok(v.color&&v.size);assert.ok(!variants.has(v.id));variants.add(v.id);assert.ok(!combinations.has(v.color+'|'+v.size));combinations.add(v.color+'|'+v.size);}}
  assert.equal(variants.size,764);
  for(const id of [224002007,224002004,224001994,221964188,221964183])assert.equal(products.find(p=>p.id===id).available,false);
});
