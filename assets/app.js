import {specs,outputSize,editingWarning} from './specs.js';
import {headFraming} from './framing.js';
import {refineAlpha,composite,backgroundStats} from './quality.js';
window.__idphoto={lastStats:null};
let refined=null,skinPixels=null;
const en=document.documentElement.lang==='en';
const t=(ko,eng)=>en?eng:ko;
const $=id=>document.getElementById(id);
const preview=$('preview'),ctx=preview.getContext('2d',{willReadFrequently:true});
let image=null,mask=null,face=null,models=null,modelsPromise=null,busy=false,loadId=0,frame=0;
const source=document.createElement('canvas');
const controls=['zoom','offsetX','offsetY','brightness','contrast','retouch'];
const spec=()=>specs.find(s=>s.id===$('spec').value)||specs[0];
for(const s of specs){const o=document.createElement('option');o.value=s.id;o.textContent=`${en?s.en:s.ko} · ${s.w} × ${s.h} mm`;$('spec').append(o);}
const requested=new URLSearchParams(location.search).get('spec');
if(specs.some(s=>s.id===requested))$('spec').value=requested;
function status(message){$('status').textContent=message;}
function defaults(){const s=spec();$('retouch').value=0;$('removeBg').checked=!s.restricted;$('lighting').checked=!s.restricted;$('background').value='#ffffff';$('background').disabled=!!s.white;for(const id of ['zoom','offsetX','offsetY','brightness','contrast'])$(id).value=id==='zoom'?100:0;updateInfo();schedule();}
function updateInfo(){const s=spec();const lightingLocked=!!s.restricted&&!$('removeBg').checked;$('lighting').disabled=lightingLocked;if(lightingLocked)$('lighting').checked=false;$('specInfo').textContent=`${s.w} × ${s.h} mm · ${outputSize(s)[0]} × ${outputSize(s)[1]} px · 300 dpi${s.head?` · ${t('머리','Head')} ${s.head[0].toFixed(1)}–${s.head[1].toFixed(3).replace(/0+$/,'').replace(/\.$/,'')} mm${s.headRecommended?t(' (여권 규격 준용·권장)',' (passport guidance, recommended)'):''}`:''}`;if(s.id==='kr-passport')$('specInfo').textContent+=t(' · 머리카락 제외 정수리~턱 · 6개월 이내 · 균일한 흰 배경 · 온라인 권장 413×531px (허용 395–431 × 507–550) · JPG ≤500KB',' · skull crown (excluding hair) to chin · within 6 months · uniform white background · online recommended 413×531px (accepted 395–431 × 507–550) · JPG ≤500KB');const warning=editingWarning(s,en);$('compliance').hidden=!warning;$('compliance').textContent=warning;if(warning){const link=document.createElement('a');link.href=s.source;link.textContent=t(' 공식 안내',' Official guidance');$('compliance').append(link);}for(const id of controls)$(id+'Value').value=$(id).value;}
async function getModels(){if(models)return models;if(modelsPromise)return modelsPromise;modelsPromise=createModels();try{return await modelsPromise;}finally{modelsPromise=null;}}
async function createModels(){const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs');const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');const segmenter=await vision.ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});let detector;try{detector=await vision.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'},runningMode:'IMAGE',minDetectionConfidence:.5});}catch(error){segmenter.close();throw error;}models={segmenter,detector};return models;}
function setBusy(value){busy=value;$('download').disabled=value||!image;$('sheet').disabled=value||!image;}
$('photo').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;const token=++loadId;setBusy(true);image=null;mask=null;face=null;refined=null;skinPixels=null;window.__idphoto.lastStats=null;preview.hidden=true;$('empty').hidden=false;status(t('사진을 읽고 있습니다…','Reading your photo…'));const url=URL.createObjectURL(file);try{if(file.size>30*1024*1024)throw new Error(t('30MB 이하 사진을 선택하세요.','Choose a photo under 30 MB.'));const img=new Image();img.src=url;await img.decode();if(token!==loadId)return;const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));source.width=Math.round(img.naturalWidth*scale);source.height=Math.round(img.naturalHeight*scale);source.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,source.width,source.height);status(t('AI 모델을 불러오는 중입니다. 사진은 기기 안에만 있습니다…','Loading AI models. Your photo stays on this device…'));const m=await getModels();if(token!==loadId)return;const result=m.segmenter.segment(source);try{const masks=result.confidenceMasks;if(!masks||masks.length<6)throw new Error('Missing segmentation masks');mask={w:masks[0].width,h:masks[0].height,alpha:new Float32Array(masks[0].getAsFloat32Array().length),skin:new Float32Array(masks[3].getAsFloat32Array())};const bg=masks[0].getAsFloat32Array();for(let i=0;i<bg.length;i++)mask.alpha[i]=1-bg[i];}finally{result.close();}const faces=m.detector.detect(source).detections;face=faces.length===1?{...faces[0].boundingBox,keypoints:faces[0].keypoints}:null;image=source;defaults();$('empty').hidden=true;preview.hidden=false;status(faces.length===1?t('준비 완료. 자동 구도는 추정치입니다. 정수리·턱 위치와 머리 크기를 직접 확인하세요.','Ready. Auto framing is an estimate. Check crown, chin and head size manually.'):t('얼굴이 없거나 여러 명입니다. 한 사람 사진을 사용하고 슬라이더로 구도를 조절하세요.','No single face found. Use a one-person photo and adjust framing manually.'));}catch(error){if(token!==loadId)return;image=null;mask=null;status(t('처리하지 못했습니다. JPG/PNG/WebP 사진과 인터넷 연결을 확인하고 사진을 다시 선택하세요. ','Could not process. Check your JPG/PNG/WebP photo and internet connection, then select it again. ')+error.message);}finally{URL.revokeObjectURL(url);if(token===loadId)setBusy(false);}});
function schedule(){updateInfo();cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
for(const id of [...controls,'background','removeBg','lighting'])$(id).addEventListener('input',schedule);
$('removeBg').addEventListener('change',()=>{if(spec().restricted)$('lighting').checked=$('removeBg').checked;schedule();});
$('spec').addEventListener('change',defaults);$('reset').addEventListener('click',defaults);
function maskCanvas(values){const c=document.createElement('canvas');c.width=mask.w;c.height=mask.h;const x=c.getContext('2d',{willReadFrequently:true}),d=x.createImageData(c.width,c.height);for(let i=0;i<values.length;i++){d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=255;d.data[i*4+3]=Math.round(values[i]*255);}x.putImageData(d,0,0);const full=document.createElement('canvas');full.width=source.width;full.height=source.height;const fx=full.getContext('2d',{willReadFrequently:true});fx.filter='blur(1.2px)';fx.drawImage(c,0,0,full.width,full.height);return fx.getImageData(0,0,full.width,full.height).data;}
function processed(){
 const w=source.width,h=source.height,data=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
 if(!refined)refined=refineAlpha(data,w,h,mask);
 if(!skinPixels)skinPixels=maskCanvas(mask.skin);
 const remove=$('removeBg').checked,lighting=$('lighting').checked&&!(spec().restricted&&!remove);
 const bg=$('background').value.match(/\w\w/g).map(x=>parseInt(x,16));
 const brightness=+$('brightness').value*1.8,contrast=1+(+$('contrast').value)/100;
 const out=document.createElement('canvas');out.width=w;out.height=h;
 const ox=out.getContext('2d',{willReadFrequently:true});
 // Alpha=1 retains the original background while allowing explicit general-use adjustments.
 const alpha=remove?refined:new Float32Array(w*h).fill(1);
 const result=composite(data,w,h,alpha,skinPixels,{background:bg,lighting,brightness,contrast,retouch:+$('retouch').value/100});
 ox.putImageData(new ImageData(result,w,h),0,0);return out;
}
function render(){if(!image||!mask)return;const s=spec();[preview.width,preview.height]=outputSize(s);ctx.fillStyle=$('background').value;ctx.fillRect(0,0,preview.width,preview.height);let scale,cx,cy;if(face){({scale,cx,cy}=headFraming(face,s,preview.height,source.height));}else{scale=Math.max(preview.width/source.width,preview.height/source.height);cx=source.width/2;cy=source.height/2;}scale*=+$('zoom').value/100;const dx=preview.width/2-cx*scale+(+$('offsetX').value/100)*preview.width;const dy=preview.height/2-cy*scale+(+$('offsetY').value/100)*preview.height;ctx.drawImage(processed(),dx,dy,source.width*scale,source.height*scale);
 const ac=document.createElement('canvas');ac.width=source.width;ac.height=source.height;
 const ax=ac.getContext('2d'),ad=ax.createImageData(ac.width,ac.height);
 for(let n=0;n<refined.length;n++){ad.data[n*4]=ad.data[n*4+1]=ad.data[n*4+2]=Math.round(refined[n]*255);ad.data[n*4+3]=255;}
 ax.putImageData(ad,0,0);
 const oc=document.createElement('canvas');oc.width=preview.width;oc.height=preview.height;
 const ox=oc.getContext('2d');ox.drawImage(ac,dx,dy,source.width*scale,source.height*scale);
 const od=ox.getImageData(0,0,oc.width,oc.height).data,alpha=new Float32Array(oc.width*oc.height);
 for(let n=0;n<alpha.length;n++)alpha[n]=od[n*4]/255;
 window.__idphoto.lastStats={...backgroundStats(ctx.getImageData(0,0,preview.width,preview.height).data,preview.width,preview.height,alpha,$('removeBg').checked),background:$('background').value,width:preview.width,height:preview.height};
}
// Add an explicit JFIF density marker (300 pixels/inch) without retaining photo metadata.
export function withDpi(bytes){
// Update an existing JFIF marker rather than creating conflicting density tags.
for(let offset=2;offset+18<=bytes.length;){
 if(bytes[offset]!==255||bytes[offset+1]===218||bytes[offset+1]===217)break;
 const length=(bytes[offset+2]<<8)|bytes[offset+3];
 if(length<2||offset+length+2>bytes.length)break;
 if(bytes[offset+1]===224&&String.fromCharCode(...bytes.subarray(offset+4,offset+9))==='JFIF\0'){const copy=bytes.slice();copy.set([1,1,44,1,44],offset+11);return copy;}
 offset+=length+2;
}
const marker=new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,1,44,1,44,0,0]);const out=new Uint8Array(bytes.length+marker.length);out.set(bytes.subarray(0,2));out.set(marker,2);out.set(bytes.subarray(2),20);return out;}
async function download(canvas,name,maxBytes=Infinity){let bytes;
 for(let quality=.96;quality>=.10;quality-=.04){
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw new Error('JPEG export failed');
  bytes=withDpi(new Uint8Array(await blob.arrayBuffer()));if(bytes.length<=maxBytes)break;
 }
 if(bytes.length>maxBytes)throw new Error(t('500KB 이하로 저장하지 못했습니다. 사진을 다시 선택하세요.','Could not export within 500KB. Select another photo.'));
const url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('download').addEventListener('click',async()=>{if(busy||!image)return;try{render();await download(preview,`${spec().id}-300dpi.jpg`,spec().maxBytes);}catch(e){status(e.message);}});
$('sheet').addEventListener('click',async()=>{if(busy||!image)return;try{render();const sheet=document.createElement('canvas');sheet.width=1200;sheet.height=1800;const x=sheet.getContext('2d',{willReadFrequently:true});x.fillStyle='white';x.fillRect(0,0,1200,1800);const gap=24,margin=36,w=preview.width,h=preview.height;const cols=Math.floor((1200-margin*2+gap)/(w+gap)),rows=Math.floor((1800-margin*2+gap)/(h+gap));const left=(1200-(cols*w+(cols-1)*gap))/2,top=(1800-(rows*h+(rows-1)*gap))/2;x.strokeStyle='#999';x.lineWidth=1;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const px=left+c*(w+gap),py=top+r*(h+gap);x.drawImage(preview,px,py);for(const [xx,yy,sx,sy] of [[px,py,-1,-1],[px+w,py,1,-1],[px,py+h,-1,1],[px+w,py+h,1,1]]){x.beginPath();x.moveTo(xx+sx*3,yy);x.lineTo(xx+sx*9,yy);x.moveTo(xx,yy+sy*3);x.lineTo(xx,yy+sy*9);x.stroke();}}await download(sheet,`${spec().id}-4x6-300dpi.jpg`);}catch(e){status(e.message);}});
defaults();
