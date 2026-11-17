import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'../raise-up-website/data/android-catalog.json');
const data=JSON.parse(readFileSync(source,'utf8'));
if(data.schemaVersion!==1 || data.packageName!=='com.raiseupentertainment.app' || !Array.isArray(data.products) || data.products.length>1000) throw new Error('Invalid native catalog source');
const products=data.products.map(product=>({id:product.id,title:product.title,type:product.type,description:product.description || '',
  previewUrl:product.previewUrl || '',fileCount:product.fileCount || 0,googlePlayProductId:product.googlePlayProductId || '',
  googlePlayPurchaseOptionId:product.googlePlayPurchaseOptionId || 'buy',agreementVersion:product.agreementVersion || ''}));
const ids=new Set(),playIds=new Set();
for(const product of products) {
  if(!/^[a-z0-9-]+$/.test(product.id || '') || !['beat','pack'].includes(product.type) || typeof product.title!=='string' || !product.title.trim()) throw new Error('Invalid product metadata');
  if(product.googlePlayProductId && (!/^[a-z0-9][a-z0-9_.]{0,39}$/.test(product.googlePlayProductId) || product.googlePlayProductId.startsWith('android.test'))) throw new Error('Invalid Play product ID');
  if(ids.has(product.id) || (product.googlePlayProductId && playIds.has(product.googlePlayProductId))) throw new Error('Duplicate mapping');
  ids.add(product.id);if(product.googlePlayProductId)playIds.add(product.googlePlayProductId);
}
const snapshot={schemaVersion:1,packageName:data.packageName,billingEnabled:false,products};
for(const name of ['termsText','packTermsText','privacyText']) if(typeof data[name]==='string')snapshot[name]=data[name];
const output=join(root,'app/src/main/assets');mkdirSync(output,{recursive:true});
writeFileSync(join(output,'android-catalog.json'),JSON.stringify(snapshot,null,2)+'\n');
const previewSource=resolve(root,'../raise-up-website/_site/assets/audio/previews');
const previewDestination=resolve(output,'previews');
if(relative(output,previewDestination)!=='previews') throw new Error('Unexpected preview destination');
mkdirSync(previewDestination,{recursive:true});
const previewManifest=[];
for(const product of products) {
  if(!product.previewUrl) continue;
  const url=new URL(product.previewUrl);
  if(url.origin!=='https://raiseupentertainmentllc.com' || url.username || url.password || !/^\/assets\/audio\/previews\/[a-z0-9-]+\.mp3$/.test(url.pathname)) throw new Error('Unapproved preview URL');
  const filename=url.pathname.split('/').pop();
  const asset=join(previewSource,filename), destination=join(previewDestination,filename);
  const bytes=readFileSync(asset);
  copyFileSync(asset,destination);
  previewManifest.push({id:product.id,filename,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const keep=new Set(previewManifest.map(item=>item.filename));
for(const entry of readdirSync(previewDestination,{withFileTypes:true})) {
  if(!entry.isFile() || !/^[a-z0-9-]+\.mp3$/.test(entry.name)) throw new Error('Unexpected file in bundled previews');
  if(!keep.has(entry.name)) unlinkSync(join(previewDestination,entry.name));
}
writeFileSync(join(output,'preview-assets.json'),JSON.stringify(previewManifest,null,2)+'\n');
process.stdout.write(JSON.stringify({products:products.length,billingEnabled:false,output:join(output,'android-catalog.json')})+'\n');
