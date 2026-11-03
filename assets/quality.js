const clamp = (v,lo=0,hi=255) => Math.max(lo,Math.min(hi,v));
const lum = (d,i) => .2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
// Joint bilateral upsampling: spatial and luminance weights preserve fine edges
// instead of spreading low-resolution alpha across contrasting hair/background.
export function refineAlpha(data,w,h,mask) {
 const a=new Float32Array(w*h),mw=mask.w,mh=mask.h;
 const guide=new Float32Array(mw*mh);
 for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
  const sx=Math.min(w-1,Math.floor((x+.5)*w/mw)),sy=Math.min(h-1,Math.floor((y+.5)*h/mh));
  guide[y*mw+x]=lum(data,(sy*w+sx)*4);
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const mx=(x+.5)*mw/w-.5,my=(y+.5)*mh/h-.5,L=lum(data,(y*w+x)*4);let sum=0,weight=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=clamp(Math.round(mx)+dx,0,mw-1),yy=clamp(Math.round(my)+dy,0,mh-1),j=yy*mw+xx;
   const dl=L-guide[j],ds=(xx-mx)**2+(yy-my)**2;
   const wt=Math.exp(-ds/2-dl*dl/800);sum+=mask.alpha[j]*wt;weight+=wt;
  }
  const value=weight?sum/weight:0;a[y*w+x]=value<.04?0:clamp(value,0,1);
 }
 return a;
}
// Separable mask-weighted box blur estimates the old background without
// averaging foreground colours into it. Two passes give a smooth local field.
function blur(values,w,h,r) {
 const tmp=new Float32Array(values.length),out=new Float32Array(values.length);
 for(let y=0;y<h;y++)for(let c=0;c<4;c++){
  let sum=0;for(let x=0;x<=Math.min(w-1,r);x++)sum+=values[(y*w+x)*4+c];
  for(let x=0;x<w;x++){
   tmp[(y*w+x)*4+c]=sum/(Math.min(w-1,x+r)-Math.max(0,x-r)+1);
   if(x-r>=0)sum-=values[(y*w+x-r)*4+c];
   if(x+r+1<w)sum+=values[(y*w+x+r+1)*4+c];
  }
 }
 for(let x=0;x<w;x++)for(let c=0;c<4;c++){
  let sum=0;for(let y=0;y<=Math.min(h-1,r);y++)sum+=tmp[(y*w+x)*4+c];
  for(let y=0;y<h;y++){
   out[(y*w+x)*4+c]=sum/(Math.min(h-1,y+r)-Math.max(0,y-r)+1);
   if(y-r>=0)sum-=tmp[((y-r)*w+x)*4+c];
   if(y+r+1<h)sum+=tmp[((y+r+1)*w+x)*4+c];
  }
 }
 return out;
}
export function composite(data,w,h,alpha,skin,{background=[255,255,255],lighting=false,brightness=0,contrast=1,retouch=0}={}) {
 const field=new Float32Array(w*h*4),total=[0,0,0];let count=0;
 for(let n=0;n<w*h;n++){
  const i=n*4,weight=(1-alpha[n])**4;
  for(let c=0;c<3;c++)field[i+c]=data[i+c]*weight;
  field[i+3]=weight;
  if(alpha[n]>.9&&skin[i+3]>100){for(let c=0;c<3;c++)total[c]+=data[i+c];count++;}
 }
 const old=blur(blur(field,w,h,12),w,h,12);
 const mean=total.map(v=>count?v/count:128),neutral=mean.reduce((a,b)=>a+b,0)/3;
 // Only gently approach neutral; retain natural skin colour. Exposure is mild.
 const exposure=clamp(150/Math.max(1,neutral),.98,1.02);
 const gain=mean.map(v=>lighting?clamp((1+.12*(neutral/Math.max(1,v)-1))*exposure,.94,1.06):1);
 const out=new Uint8ClampedArray(data.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const n=y*w+x,i=n*4,a=alpha[n];let color=[data[i],data[i+1],data[i+2]];
  if(retouch>0&&skin[i+3]>100&&a>.9){
   const sums=[0,0,0];let weight=0;
   for(let dy=-3;dy<=3;dy+=2)for(let dx=-3;dx<=3;dx+=2){
    const j=(clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1))*4;
    const delta=Math.abs(data[j]-color[0])+Math.abs(data[j+1]-color[1])+Math.abs(data[j+2]-color[2]);
    const wt=Math.exp(-delta*delta/1800-(dx*dx+dy*dy)/18)*skin[j+3]/255;
    weight+=wt;for(let c=0;c<3;c++)sums[c]+=data[j+c]*wt;
   }
   if(weight)color=color.map((v,c)=>v+(sums[c]/weight-v)*retouch*.65);
  }
  for(let c=0;c<3;c++){
   let f=color[c];
   if(a>0&&a<.98&&old[i+3]>.001)f=clamp((f-(1-a)*old[i+c]/old[i+3])/a);
   f=clamp(((f-128)*contrast+128+brightness)*gain[c]);
   if(lighting&&a>.04&&a<.98)f=clamp(f*(1+.025*4*a*(1-a)));
   out[i+c]=a===0?background[c]:f*a+background[c]*(1-a);
   if(a<.1&&lum(data,i)>235&&background.every(v=>v===255))out[i+c]=255;
  }
  out[i+3]=255;
 }
 return out;
}
// Distance to the alpha=.04 foreground, measured in output pixels. Report a
// one-pixel ring at 6px outside it, plus all four 6x6 corner patches.
export function backgroundStats(data,w,h,alpha,enabled=true) {
 if(!enabled)return {enabled:false,ringMean:null,cornerMean:null};
 const dist=new Float32Array(w*h);dist.fill(1e6);
 for(let i=0;i<dist.length;i++)if(alpha[i]>=.04)dist[i]=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;
  if(x)dist[i]=Math.min(dist[i],dist[i-1]+1);
  if(y)dist[i]=Math.min(dist[i],dist[i-w]+1);
  if(x&&y)dist[i]=Math.min(dist[i],dist[i-w-1]+Math.SQRT2);
  if(x+1<w&&y)dist[i]=Math.min(dist[i],dist[i-w+1]+Math.SQRT2);
 }
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
  const i=y*w+x;
  if(x+1<w)dist[i]=Math.min(dist[i],dist[i+1]+1);
  if(y+1<h)dist[i]=Math.min(dist[i],dist[i+w]+1);
  if(x+1<w&&y+1<h)dist[i]=Math.min(dist[i],dist[i+w+1]+Math.SQRT2);
  if(x&&y+1<h)dist[i]=Math.min(dist[i],dist[i+w-1]+Math.SQRT2);
 }
 const ring=[0,0,0],corners=Array.from({length:4},()=>[0,0,0]),counts=[0,0,0,0];let samples=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;
  if(dist[i]>=5.5&&dist[i]<6.5){samples++;for(let c=0;c<3;c++)ring[c]+=data[i*4+c];}
  if((x<6||x>=w-6)&&(y<6||y>=h-6)){
   const k=(y>=h-6?2:0)+(x>=w-6?1:0);counts[k]++;for(let c=0;c<3;c++)corners[k][c]+=data[i*4+c];
  }
 }
 const ringMean=samples?ring.map(v=>v/samples):null;
 const cornerMeans=corners.map((v,k)=>v.map(c=>counts[k]?c/counts[k]:0));
 const cornerMean=[0,1,2].map(c=>cornerMeans.reduce((sum,v)=>sum+v[c],0)/4);
 return {enabled:true,ringMean,ringSamples:samples,cornerMean,cornerMeans,whiteBackgroundPass:!!ringMean&&[...ringMean,...cornerMeans.flat()].every(v=>v>=250)};
}
