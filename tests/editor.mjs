import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {test} from 'node:test';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const app=(await read('../assets/app.js')).replace(/^import .*;\n/gm,'').replaceAll('export function','function');
const presets=(await read('../assets/specs.js')).replaceAll('export const','const').replaceAll('export function','function');
function editor(lang='en'){
 const elements=new Map(),downloads=[],blobs=[];let encodes=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{value:({zoom:100,retouch:0,background:'#ffffff'})[id]??0,checked:false,hidden:false,events:{},append(o){if(id==='spec'&&!this.value)this.value=o.value;},addEventListener(type,fn){this.events[type]=fn;},getContext(){return {};}});return elements.get(id);};
 class FakeURL extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:test';}static revokeObjectURL(){}}
 const context=vm.createContext({console,Uint8Array,Float32Array,Uint8ClampedArray,URLSearchParams,Blob,URL:FakeURL,window:{},location:{search:'?spec=kr-passport'},document:{documentElement:{lang},getElementById:el,createElement:tag=>tag==='a'?{click(){downloads.push(this.download)}}:{getContext(){return {}}}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout(){}});
 vm.runInContext(presets+'\n'+app,context);
 return {context,el,downloads,blobs};
}
test('both languages initialize and reset all official presets to safe defaults',()=>{
 for(const lang of ['ko','en']){
  const {context,el}=editor(lang);
  for(const id of ['kr-passport','id-card','driver-license','us-passport','china-visa']){
   el('spec').value=id;vm.runInContext('defaults()',context);
   assert.equal(el('retouch').value,0);assert.equal(el('removeBg').checked,false);assert.equal(el('lighting').checked,false);assert.equal(el('compliance').hidden,false);
   assert.match(el('compliance').textContent,/OFF/);
  }
  el('spec').value='resume';vm.runInContext('defaults()',context);
  assert.equal(el('removeBg').checked,true);assert.equal(el('lighting').checked,true);assert.equal(el('compliance').hidden,true);
 }
});
test('Korean export retries JPEG quality and includes density bytes inside 500KB limit',async()=>{
 const {context,downloads,blobs}=editor();let calls=0;
 context.canvas={toBlob(resolve){calls++;resolve(new Blob([new Uint8Array(calls===1?500001:499980)]));}};
 await vm.runInContext("download(canvas,'kr-passport.jpg',500000)",context);
 assert.equal(calls,2);assert.deepEqual(downloads,['kr-passport.jpg']);assert.ok(blobs[0].size<=500000);
 const bytes=new Uint8Array(await blobs[0].arrayBuffer());assert.deepEqual([...bytes.slice(13,18)],[1,1,44,1,44]);
});
test('oversized export is never downloaded',async()=>{
 const {context,downloads}=editor();context.canvas={toBlob(resolve){resolve(new Blob([new Uint8Array(500001)]));}};
 await assert.rejects(vm.runInContext("download(canvas,'bad.jpg',500000)",context),/500KB/);assert.equal(downloads.length,0);
});
test('300dpi marker is updated without adding duplicate JFIF headers',()=>{
 const {context}=editor();context.input=new Uint8Array([255,216,255,217]);
 const first=vm.runInContext('withDpi(input)',context);context.input=first;
 assert.deepEqual(vm.runInContext('withDpi(input)',context),first);
});
test('FAQ structured answers match visible content in both languages',async()=>{
 for(const lang of ['','en/']){
  const text=await read('../'+lang+'faq/index.html');
  const data=JSON.parse(text.match(/application\/ld\+json">(.*?)<\/script>/)[1]);
  for(const q of data.mainEntity)assert.ok(text.includes('<p>'+q.acceptedAnswer.text+'</p>'));
 }
});
