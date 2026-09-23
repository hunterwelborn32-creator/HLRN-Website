/* Adds new published stories to the existing Netflix-style HLRN episode shelf. */
(async()=>{
  const shelf=document.querySelector('.episode-shelf');
  if(!shelf)return;
  try {
    const response=await fetch('episodes.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Episodes manifest not available');
    const entries=await response.json();
    if(!Array.isArray(entries))throw new Error('Invalid episodes manifest');
    const valid=entries.filter(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&/^[-a-z0-9]+$/.test(e.id));
    if(!valid.length)return;
    shelf.querySelectorAll('.episode-tile.coming').forEach(node=>node.remove());
    for(const entry of valid){
      if(entry.id==='episode-01')continue; // Preserve manually approved EchoPark card.
      if(shelf.querySelector('[data-adventure-id="'+entry.id+'"]'))continue;
      const link=document.createElement('a');link.className='episode-tile ready';link.href=entry.id+'/';link.dataset.adventureId=entry.id;
      const art=document.createElement('div');art.className='episode-art';
      const img=document.createElement('img');img.loading='lazy';img.alt=entry.title+' artwork';img.src=entry.cover||entry.id+'/images/001.webp';art.append(img);
      const play=document.createElement('div');play.className='play-symbol';play.textContent='▶';art.append(play);
      const label=document.createElement('span');label.className='episode-numeral';label.textContent=entry.kind==='special'?'SPECIAL':String(entry.number||'').padStart(2,'0');art.append(label);
      const details=document.createElement('div');details.className='episode-details';
      const status=document.createElement('span');status.className='episode-status available';status.textContent=entry.kind==='special'?'SPECIAL EPISODE':'AVAILABLE NOW';
      const title=document.createElement('h3');title.textContent=entry.title;
      const summary=document.createElement('p');summary.textContent='Read the full illustrated Adventure of High Line.';
      const bottom=document.createElement('div');bottom.className='episode-bottom';bottom.textContent='READ EPISODE ↗';
      details.append(status,title,summary,bottom);link.append(art,details);shelf.append(link);
    }
    const count=document.querySelector('.episode-total');
    if(count)count.textContent=valid.filter(e=>e.kind==='main').length+' MAIN EPISODES · '+valid.filter(e=>e.kind==='special').length+' SPECIALS';
  }catch(err){console.warn('HLRN Adventures library update unavailable:',err);}
})();
