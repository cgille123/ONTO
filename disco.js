/* ONTO DISCO — visual layer only. Never changes grid geometry or stored board data. */
(()=>{'use strict';
 const grid=document.getElementById('grid');
 const board=document.getElementById('board-scroll');
 const toggle=document.getElementById('disco-toggle');
 if(!grid||!board||!toggle)return;
 const colors=['#5179ff','#b85dff','#30c7f2','#ef57c9','#a2f04c','#6878ff'];
 const lights=[],positions=new WeakMap(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const pitch=96;
 let active=false,observer=null,staticFrame=null;
 const random=n=>Math.floor(Math.random()*Math.max(1,n));
 function visibleSockets(){
  if(!active||grid.dataset.layout==='smash')return [];
  const rect=grid.getBoundingClientRect(),viewport=board.getBoundingClientRect();
  const scale=rect.width/(grid.offsetWidth||1);
  if(!Number.isFinite(scale)||scale<=0)return [];
  const cols=Math.max(1,Math.floor((grid.offsetWidth+12)/pitch));
  const rows=Math.max(1,Math.floor((grid.offsetHeight+12)/pitch));
  const firstCol=Math.max(0,Math.floor((viewport.left-rect.left)/scale/pitch));
  const lastCol=Math.min(cols-1,Math.ceil((viewport.right-rect.left)/scale/pitch));
  const firstRow=Math.max(0,Math.floor((viewport.top-rect.top)/scale/pitch));
  const lastRow=Math.min(rows-1,Math.ceil((viewport.bottom-rect.top)/scale/pitch));
  const available=[];
  for(let r=firstRow;r<=lastRow;r++)for(let c=firstCol;c<=lastCol;c++)available.push({col:c,row:r,key:c+':'+r});
  return available;
 }
 function place(light,available=visibleSockets()){
  if(!available.length)return;
  const occupied=new Set(lights.filter(other=>other!==light).map(other=>positions.get(other)));
  const free=available.filter(point=>!occupied.has(point.key));
  const candidates=free.length?free:available,point=candidates[random(candidates.length)];
  light.style.left=(point.col*pitch)+'px';light.style.top=(point.row*pitch)+'px';
  light.style.setProperty('--disco-color',colors[random(colors.length)]);
  positions.set(light,point.key);
 }
 function attach(){
  if(!active)return;
  for(const light of lights)if(light.parentElement!==grid)grid.appendChild(light);
  grid.classList.add('disco-on');
 }
 // Reduced motion has no loop events. Update its static lights only when the view changes.
 function refreshStatic(){
  if(!active||!reducedMotion.matches||document.hidden||staticFrame!==null)return;
  staticFrame=requestAnimationFrame(()=>{
   staticFrame=null;
   if(!active||!reducedMotion.matches||document.hidden)return;
   const available=visibleSockets();
   for(const light of lights)place(light,available);
  });
 }
 function stop(){
  active=false;observer?.disconnect();observer=null;
  if(staticFrame!==null)cancelAnimationFrame(staticFrame);staticFrame=null;
  for(const light of lights)light.remove();
  grid.classList.remove('disco-on','disco-paused');
  toggle.setAttribute('aria-pressed','false');
 }
 function start(){
  active=true;
  if(!lights.length)for(let i=0;i<24;i++){
   const light=document.createElement('span'),duration=4+Math.random()*3;
   light.className='disco-socket-light';light.setAttribute('aria-hidden','true');
   // Each light keeps its own tempo and staggered phase for the entire session.
   light.style.setProperty('--disco-duration',duration.toFixed(3)+'s');
   light.style.setProperty('--disco-delay',(-i/24*duration).toFixed(3)+'s');
   lights.push(light);
  }
  const available=visibleSockets();
  for(const light of lights)place(light,available);
  attach();grid.classList.toggle('disco-paused',document.hidden);
  observer=new MutationObserver(records=>{
   if(!active)return;
   if(lights.some(light=>light.parentElement!==grid)){attach();refreshStatic();}
   if(records.some(record=>record.type==='attributes'&&record.oldValue!==grid.dataset.layout)){
    if(!reducedMotion.matches){
     const available=visibleSockets();
     for(const light of lights)if(!positions.has(light))place(light,available);
    }
    refreshStatic();
   }
  });
  observer.observe(grid,{childList:true,attributes:true,attributeFilter:['data-layout'],attributeOldValue:true});
  toggle.setAttribute('aria-pressed','true');
 }
 // Change one socket/color only in its dark interval; never reshuffle the whole board.
 grid.addEventListener('animationiteration',event=>{
  const light=event.target;
  if(!active||document.hidden||grid.dataset.layout==='smash'||reducedMotion.matches||
     event.animationName!=='onto-disco-pulse'||!lights.includes(light))return;
  // A busy frame may deliver the event late. Skip this handoff if the light is already visible.
  if(parseFloat(getComputedStyle(light).opacity)>.001)return;
  place(light);
 });
 // One native activation route, same on desktop and iOS.
 toggle.addEventListener('click',()=>{active?stop():start();});
 // Animated lights read the current viewport at their next dark handoff.
 board.addEventListener('scroll',refreshStatic,{passive:true});
 window.addEventListener('resize',refreshStatic);
 reducedMotion.addEventListener('change',refreshStatic);
 document.addEventListener('visibilitychange',()=>{
  if(!active)return;
  grid.classList.toggle('disco-paused',document.hidden);refreshStatic();
 });
})();
