// Presentation-only collision avoidance: these are NOT measured iRacing lanes.
// Use circular lap progress so a pack crossing start/finish remains one group.
export function packOffsets(cars,threshold=0.009){
 const valid=cars.filter(c=>!c.onPitRoad&&Number.isFinite(c.progress));
 const sorted=valid.map(c=>({...c,progress:((c.progress%1)+1)%1})).sort((a,b)=>a.progress-b.progress);
 const offsets=new Map();
 if(sorted.length<2)return offsets;
 let largest=-1,cut=0;
 for(let i=0;i<sorted.length;i++){
  const gap=((sorted[(i+1)%sorted.length].progress-sorted[i].progress+1)%1);
  if(gap>largest){largest=gap;cut=(i+1)%sorted.length}
 }
 const ordered=sorted.slice(cut).concat(sorted.slice(0,cut));
 const groups=[];let group=[];
 for(const car of ordered){
  if(group.length){
   const prev=group[group.length-1];
   const gap=(car.progress-prev.progress+1)%1;
   if(gap>threshold){groups.push(group);group=[]}
  }
  group.push(car);
 }
 if(group.length)groups.push(group);
 for(const g of groups){
  if(g.length<2)continue;
  // Stable within the pack; offset markers visually without changing telemetry.
  const members=[...g].sort((a,b)=>(a.position??999)-(b.position??999)||String(a.key).localeCompare(String(b.key)));
  members.forEach((c,i)=>{
   const lane=[0,-1,1][i%3];
   const row=Math.floor(i/3);
   offsets.set(c.key,{lateral:lane*14,longitudinal:Math.min(20,row*6)*(i%2===0?1:-1),packed:true});
  });
 }
 return offsets;
}
