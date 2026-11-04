/* HLRN homepage logo viewport v4.
   Trim transparent (or photo-colored) margins from the source PNG in canvas,
   and render both themes within a fixed-height masthead, without CSS offsets.
   No page layout is changed by image loading, theme switching or resize. */
(()=>{
 "use strict";
 const scene=document.querySelector("#hlrnRaceDayHome > .home33-top-logo-scene");
 if(!scene)return;
 const sources={
  light:"/assets/homepage-art/Glossy%20HLRN%20Racing%20Network%20Logo.png?v=20261104logo4",
  dark:"/assets/homepage-art/HLRN%20Metallic%20Racing%20Network%20Logo.png?v=20261104logo4"
 };
 const cache=new Map();
 const canvas=document.createElement("canvas");
 canvas.className="hlrn-logo-artwork";
 canvas.setAttribute("aria-hidden","true");
 const ctx=canvas.getContext("2d");
 if(!ctx)return;
 scene.appendChild(canvas);
 const originals=[...scene.querySelectorAll("img")];
 let current="",generation=0,raf=0;
 function detectBounds(image){
  const scale=Math.min(1,560/Math.max(image.naturalWidth,image.naturalHeight));
  const width=Math.max(1,Math.round(image.naturalWidth*scale));
  const height=Math.max(1,Math.round(image.naturalHeight*scale));
  const probe=document.createElement("canvas");probe.width=width;probe.height=height;
  const c=probe.getContext("2d",{willReadFrequently:true});
  if(!c)return {x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
  c.drawImage(image,0,0,width,height);
  const pixels=c.getImageData(0,0,width,height).data;
  let aminX=width,aminY=height,amaxX=-1,amaxY=-1;
  let redMinX=width,redMinY=height,redMaxX=-1,redMaxY=-1,reds=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=(y*width+x)*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2],a=pixels[p+3];
   if(a>38){
    aminX=Math.min(aminX,x);aminY=Math.min(aminY,y);amaxX=Math.max(amaxX,x);amaxY=Math.max(amaxY,y);
   }
   // Find the distinctive red HLRN lettering, not the blue sky around it.
   if(a>175&&r>115&&r>g*1.48&&r>b*1.22&&(r-g)>42){
    reds++;redMinX=Math.min(redMinX,x);redMinY=Math.min(redMinY,y);
    redMaxX=Math.max(redMaxX,x);redMaxY=Math.max(redMaxY,y);
   }
  }
  let left=0,top=0,right=width,bottom=height;
  if(reds>35&&(redMaxY-redMinY)>7){
   // Keep all the silver letters to the right and full network subtitle below.
   const rh=redMaxY-redMinY+1;
   top=Math.max(0,Math.floor(redMinY-rh*.38));
   bottom=Math.min(height,Math.ceil(redMaxY+rh*.82));
   // Red letters occupy the left part of the mark; retain symmetrical width.
   const centerX=(redMinX+redMaxX)/2;
   left=Math.max(0,Math.floor(redMinX-rh*.24));
   right=Math.min(width,Math.ceil(redMaxX+rh*2.35));
   const span=right-left;
   if(span<width*.38){left=0;right=width;}
   // A little extra space safeguards the tagline and metal accents.
   const pad=Math.max(3,Math.floor((bottom-top)*.045));
   top=Math.max(0,top-pad);bottom=Math.min(height,bottom+pad);
  }else if(amaxX>=aminX){
   const pad=Math.max(2,Math.floor(height*.025));
   left=Math.max(0,aminX-pad);right=Math.min(width,amaxX+pad+1);
   top=Math.max(0,aminY-pad);bottom=Math.min(height,amaxY+pad+1);
  }
  return {x:Math.round(left/scale),y:Math.round(top/scale),
   w:Math.max(1,Math.round((right-left)/scale)),h:Math.max(1,Math.round((bottom-top)/scale))};
 }
 function draw(){
  const item=cache.get(current);if(!item)return;
  const box=scene.getBoundingClientRect();
  const maxW=Math.max(1,box.width-20),maxH=Math.max(1,box.height-12);
  const b=item.bounds;
  const ratio=Math.min(maxW/b.w,maxH/b.h,1.5);
  const w=Math.max(1,Math.round(b.w*ratio)),h=Math.max(1,Math.round(b.h*ratio));
  canvas.width=w;canvas.height=h;
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(item.image,b.x,b.y,b.w,b.h,0,0,w,h);
  scene.classList.add("hlrn-logo-rendered");
 }
 function apply(){
  const theme=document.documentElement.getAttribute("data-hlrn-theme")==="dark"?"dark":"light";
  current=theme;const stamp=++generation;
  if(cache.has(theme)){draw();return}
  const img=new Image();
  img.onload=()=>{
   if(!img.naturalWidth||!img.naturalHeight)return;
   try{cache.set(theme,{image:img,bounds:detectBounds(img)});
    if(stamp===generation)draw();
   }catch(error){console.warn("HLRN logo rendering fallback",error);scene.classList.add("hlrn-logo-fallback")}
  };
  img.onerror=()=>scene.classList.add("hlrn-logo-fallback");
  img.src=sources[theme];
 }
 // No image may be laid out as a full-bleed element at initial paint.
 scene.classList.add("hlrn-logo-viewport-ready");
 apply();
 new MutationObserver(changes=>{
  if(changes.some(m=>m.attributeName==="data-hlrn-theme"))apply();
 }).observe(document.documentElement,{attributes:true,attributeFilter:["data-hlrn-theme"]});
 window.addEventListener("resize",()=>{
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(draw);
 },{passive:true});
})();