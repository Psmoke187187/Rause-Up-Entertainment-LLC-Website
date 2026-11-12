// Curated exact-source previews. No downsampling, gain changes, or montage mixing.
const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+";
function decode(s){let bytes=new Uint8Array(Math.ceil(s.length*.75)),n=0,word=0,bits=0;for(const c of s){if(c==="=")break;const d=ABC.indexOf(c);if(d<0)continue;word=word<<6|d;bits+=6;if(bits>=8){bits-=8;bytes[n++]=word>>bits&255}}return bytes.subarray(0,n)}
function encode(bytes){let result="";for(let i=0;i<bytes.length;i+=3){const w=bytes[i]<<16|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);result+=ABC[w>>>18&63]+ABC[w>>>12&63]+(i+1<bytes.length?ABC[w>>>6&63]:"=")+(i+2<bytes.length?ABC[w&63]:"=")}return result}
function trimWav(base64,maxSeconds){
 const bytes=decode(base64),d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(p,n)=>String.fromCharCode(...bytes.subarray(p,p+n));
 if(tag(0,4)!=="RIFF"||tag(8,4)!=="WAVE")throw Error("Not a WAV");
 let fmt=-1,fsz=0,at=-1,sz=0;
 for(let p=12;p+8<=bytes.length;){const k=tag(p,4),len=d.getUint32(p+4,true);if(k==="fmt "){fmt=p+8;fsz=len}if(k==="data"){at=p+8;sz=Math.min(len,bytes.length-at);break}p+=8+len+(len&1)}
 if(fmt<0||at<0||fsz<16)throw Error("Missing WAV chunk");
 const codec=d.getUint16(fmt,true),rate=d.getUint32(fmt+4,true),align=d.getUint16(fmt+12,true),channels=d.getUint16(fmt+2,true),bitDepth=d.getUint16(fmt+14,true);
 if(![1,3].includes(codec)||!rate||!align||channels>8)throw Error("Unsupported WAV format");
 const duration=sz/(rate*align);
 if(duration<=maxSeconds||!maxSeconds)return {base64,bytes:bytes.length,duration,rate,channels,bitDepth};
 // Preserve original sample rate, channel count, format and bit depth. Copy bytes unchanged.
 const keep=Math.min(sz,Math.floor(rate*maxSeconds)*align),out=new Uint8Array(44+keep),v=new DataView(out.buffer);
 for(let i=0;i<4;i++)out[i]="RIFF".charCodeAt(i);v.setUint32(4,out.length-8,true);
 for(let i=0;i<8;i++)out[8+i]="WAVEfmt ".charCodeAt(i);v.setUint32(16,16,true);
 out.set(bytes.subarray(fmt,fmt+16),20);for(let i=0;i<4;i++)out[36+i]="data".charCodeAt(i);v.setUint32(40,keep,true);
 out.set(bytes.subarray(at,at+keep),44);
 return {base64:encode(out),bytes:out.length,duration:keep/(rate*align),rate,channels,bitDepth}
}
function mp3Clip(base64,maxSeconds){
const bytes=decode(base64);let p=0;
if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51)p=10+((bytes[6]&127)<<21)+((bytes[7]&127)<<14)+((bytes[8]&127)<<7)+(bytes[9]&127)+((bytes[5]&16)?10:0);
function frame(i){if(bytes[i]!==255||(bytes[i+1]&224)!==224)return null;const ver=bytes[i+1]>>3&3,layer=bytes[i+1]>>1&3,br=bytes[i+2]>>4&15,sr=bytes[i+2]>>2&3,pad=bytes[i+2]>>1&1;if(ver===1||layer!==1||br===0||br===15||sr===3)return null;const rate=[44100,48000,32000][sr]*(ver===3?1:ver===2?.5:.25);const bps=(ver===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[br];return {rate,len:Math.floor((ver===3?144000:72000)*bps/rate)+pad,sec:(ver===3?1152:576)/rate}}
while(p+256<bytes.length){let f=frame(p);if(f&&frame(p+f.len))break;p++}const begin=p;let dur=0;
while(p+8<bytes.length&&dur<maxSeconds){const f=frame(p);if(!f||p+f.len>bytes.length)break;p+=f.len;dur+=f.sec}if(dur<1)throw Error("No readable MP3 frames");
return {base64:encode(bytes.subarray(begin,p)),bytes:p-begin,duration:dur}
}
function safeName(s){return s.replace(/\.(wav|mp3)$/i,"").replace(/\s+/g," ").trim().slice(0,95)}
let candidates=[],incompleteFolders=[];
for(const folder of config.dirs){
 const r=(await tools.mcp__Google_Drive__fetch({url:"https://drive.google.com/drive/folders/"+folder.id})).result;
 const list=JSON.parse(r.content).files;
 if(list.length===100)incompleteFolders.push(folder.name);
 const avail=list.filter(f=>typeof f.title==="string"&&f.id&&/\.(wav|mp3)$/i.test(f.title)&&Number(f.size)>1024&&Number(f.size)<20000000&&(config.fileType==="mp3"?/\.mp3$/i:/\.wav$/i).test(f.title));
 if(folder.include){const re=new RegExp(folder.include,"i");for(let i=avail.length-1;i>=0;i--)if(!re.test(avail[i].title))avail.splice(i,1)}
 if(folder.exclude){const re=new RegExp(folder.exclude,"i");for(let i=avail.length-1;i>=0;i--)if(re.test(avail[i].title))avail.splice(i,1)}
 avail.sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
 // skip more than max file count of same source folder to preserve diversity
 candidates.push({folder:folder.name,list:avail});
}
let selected=[],used=new Set(),i=0;
while(selected.length<config.count&&i<100){
 for(const c of candidates){const item=c.list[config.start+i];if(item&&!used.has(item.id)&&selected.length<config.count){selected.push({name:safeName(item.title),id:item.id,folder:c.folder,ext:item.title.toLowerCase().endsWith(".mp3")?"mp3":"wav"});used.add(item.id)}}
 i++;
}
let out=[],failed=[];
for(const item of selected){
try{
 const file=(await tools.mcp__Google_Drive__fetch({url:"https://drive.google.com/file/d/"+item.id+"/view",download_raw_file:true,include_base64:true})).result;
 const preview=item.ext==="wav"?trimWav(file.b64_string,config.maxSeconds||6):mp3Clip(file.b64_string,config.maxSeconds||8);
 const path="assets/audio/hifi-previews/"+config.pack+"/sample-"+String(config.fileStart+out.length+1).padStart(2,"0")+"."+item.ext;
 const blob=(await tools.mcp__GitHub__create_blob({repository_full_name:config.repository,content:preview.base64,encoding:"base64"})).result;
 const desc={folder:item.folder,name:item.name,src:path,duration:Math.round(preview.duration*100)/100,sha:blob.sha,bytes:preview.bytes};
 let bpm=item.name.match(/(?:^|[^0-9])(\d{2,3})\s*bpm\b/i);if(bpm)desc.bpm=Number(bpm[1]);
 out.push(desc);
}catch(e){failed.push({name:item.name,error:String(e).slice(0,150)})}
}
return {pack:config.pack,entries:out,failed,incompleteFolders,requested:config.count,selected:selected.length};
