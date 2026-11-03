import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const load=async path=>import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(path,import.meta.url))).toString('base64')}`);
const {refineAlpha,composite,backgroundStats}=await load('../assets/quality.js');
const {specs,outputSize,editingWarning}=await load('../assets/specs.js');
function fixture(){
 const w=96,h=96,alpha=new Float32Array(w*h),data=new Uint8ClampedArray(w*h*4),skin=new Uint8ClampedArray(data.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const n=y*w+x,i=n*4,d=Math.hypot(x-48,y-48),a=Math.max(0,Math.min(1,(27-d)/3));alpha[n]=a;
  for(let c=0;c<3;c++)data[i+c]=[80,90,100][c]*a+[30,120,170][c]*(1-a);
  data[i+3]=255;
 }
 return {w,h,alpha,data,skin};
}
test('white corners and the 6px outside ring are >=250 in every channel',()=>{
 const {w,h,alpha,data,skin}=fixture();
 const out=composite(data,w,h,alpha,skin),stats=backgroundStats(out,w,h,alpha);
 assert.ok(stats.ringSamples>100);assert.equal(stats.whiteBackgroundPass,true);
 assert.deepEqual(stats.ringMean,[255,255,255]);assert.deepEqual(stats.cornerMean,[255,255,255]);
 // A contaminated corner must fail even when the other three corners are white.
 out[0]=0;out[1]=0;out[2]=0;
 assert.equal(backgroundStats(out,w,h,alpha).whiteBackgroundPass,false);
});
test('edge foreground is recovered from the local old background',()=>{
 const {w,h,alpha,data,skin}=fixture(),out=composite(data,w,h,alpha,skin);
 for(let n=0;n<alpha.length;n++)if(alpha[n]>.1&&alpha[n]<.9){
  for(let c=0;c<3;c++)assert.ok(Math.abs(out[n*4+c]-([80,90,100][c]*alpha[n]+255*(1-alpha[n])))<6);
 }
});
test('joint upsampling suppresses low-confidence haze and preserves a luminance edge',()=>{
 const w=32,h=16,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)data[(y*w+x)*4+c]=x<16?20:250;
 const a=refineAlpha(data,w,h,{w:2,h:1,alpha:new Float32Array([1,.02])});
 assert.ok(a[8*w+15]>.95);assert.equal(a[8*w+16],0);assert.equal(a[w-1],0);
});
test('no replacement and no adjustments preserve every original channel',()=>{
 const {w,h,data,skin}=fixture();
 assert.deepEqual(composite(data,w,h,new Float32Array(w*h).fill(1),skin),data);
 assert.deepEqual(backgroundStats(data,w,h,new Float32Array(w*h),false),{enabled:false,ringMean:null,cornerMean:null});
});
test('lighting gain is gentle and does not change background white',()=>{
 const {w,h,alpha,data,skin}=fixture();skin.fill(255);
 const out=composite(data,w,h,alpha,skin,{lighting:true});
 for(let n=0;n<alpha.length;n++)if(alpha[n]===1)for(let c=0;c<3;c++)assert.ok(Math.abs(out[n*4+c]-data[n*4+c])<=Math.ceil(data[n*4+c]*.06));
 assert.equal(backgroundStats(out,w,h,alpha).whiteBackgroundPass,true);
});
test('restricted presets disclose policy in both languages and Korean upload limits are exact',()=>{
 for(const id of ['kr-passport','id-card','driver-license','us-passport','china-visa']){
  const s=specs.find(s=>s.id===id);assert.equal(s.restricted,true);
  assert.match(editingWarning(s),/OFF.*0/);assert.match(editingWarning(s,true),/OFF.*0/);
 }
 const kr=specs[0];assert.deepEqual(outputSize(kr),[413,531]);assert.equal(kr.maxBytes,500000);
 assert.equal(specs.find(s=>s.id==='id-card').head,undefined);
 assert.equal(specs.find(s=>s.id==='driver-license').headRecommended,true);
 for(const id of ['china-visa','japan-passport'])assert.equal(specs.find(s=>s.id===id).crownOffset,4);
});
test('uncertain textured background is removed across the whole non-square source',()=>{
 const w=80,h=40,data=new Uint8ClampedArray(w*h*4),skin=new Uint8ClampedArray(data.length);
 for(let n=0;n<w*h;n++)data.set([n%2?180:40,70,30,255],n*4);
 const mask={w:4,h:2,alpha:new Float32Array([.3,.3,.9,.9,.3,.3,.9,.9])};
 const alpha=refineAlpha(data,w,h,mask,.5),out=composite(data,w,h,alpha,skin);
 for(let y=0;y<h;y++){
  assert.equal(alpha[y*w],0);assert.equal(alpha[y*w+w-1],1);
  assert.deepEqual([...out.slice(y*w*4,y*w*4+3)],[255,255,255]);
 }
});
test('refinement cannot restore background outside four output pixels of the contour',()=>{
 const w=64,h=8,data=new Uint8ClampedArray(w*h*4);
 // Matching luminance far into the background used to pull in foreground.
 data.fill(80);
 const mask={w:4,h:1,alpha:new Float32Array([.2,.2,.8,.8])};
 const alpha=refineAlpha(data,w,h,mask,2);
 for(let y=0;y<h;y++)for(let x=0;x<24;x++)assert.equal(alpha[y*w+x],0);
 const low=refineAlpha(data,w,h,{w:1,h:1,alpha:new Float32Array([.35])});
 const high=refineAlpha(data,w,h,{w:1,h:1,alpha:new Float32Array([.65])});
 assert.ok(low.every(v=>v<1e-10));assert.ok(high.every(v=>v>.999999));
});
