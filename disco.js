/* ONTO DISCO — visual layer only. Never changes grid geometry or stored board data. */
(()=>{'use strict';
 const grid=document.getElementById('grid');
 const board=document.getElementById('board-scroll');
 const toggle=document.getElementById('disco-toggle');
 if(!grid||!board||!toggle)return;
 const colors=['#5179ff','#b85dff','#30c7f2','#ef57c9','#a2f04c','#6878ff'];
 const lights=[];let active=false,cycle=null,observer=null;
 const random=(n)=>Math.floor(Math.random()*Math.max(1,n));
 function place(){
  if(!active||grid.dataset.layout==='smash')return;
  const rect=grid.getBoundingClientRect(),viewport=board.getBoundingClientRect();
  const scale=rect.width/(grid.offsetWidth||1),pitch=96;
  if(!Number.isFinite(scale)||scale<=0)return;
  const cols=Math.max(1,Math.floor((grid.offsetWidth+12)/pitch));
  const rows=Math.max(1,Math.floor((grid.offsetHeight+12)/pitch));
  const firstCol=Math.max(0,Math.floor((viewport.left-rect.left)/scale/pitch));
  const lastCol=Math.min(cols-1,Math.ceil((viewport.right-rect.left)/scale/pitch));
  const firstRow=Math.max(0,Math.floor((viewport.top-rect.top)/scale/pitch));
  const lastRow=Math.min(rows-1,Math.ceil((viewport.bottom-rect.top)/scale/pitch));
  const available=[];
  for(let r=firstRow;r<=lastRow;r++)for(let c=firstCol;c<=lastCol;c++)available.push([c,r]);
  if(!available.length)return;
  for(let i=available.length-1;i>0;i--){const j=random(i+1);[available[i],available[j]]=[available[j],available[i]];}
  lights.forEach((light,i)=>{
   const point=available[i%available.length];
   light.style.left=(point[0]*pitch)+'px';light.style.top=(point[1]*pitch)+'px';
   light.style.setProperty('--disco-color',colors[random(colors.length)]);
   light.style.setProperty('--disco-duration',(4+Math.random()*3).toFixed(1)+'s');
   light.style.setProperty('--disco-delay',(-Math.random()*5).toFixed(1)+'s');
  });
 }
 function attach(){if(!active)return;for(const light of lights)if(light.parentElement!==grid)grid.appendChild(light);grid.classList.add('disco-on');}
 function stop(){active=false;clearInterval(cycle);cycle=null;observer?.disconnect();observer=null;for(const light of lights)light.remove();grid.classList.remove('disco-on');toggle.setAttribute('aria-pressed','false');}
 function start(){active=true;grid.classList.add('disco-on');if(!lights.length){for(let i=0;i<24;i++){const light=document.createElement('span');light.className='disco-socket-light';light.setAttribute('aria-hidden','true');lights.push(light);}}
  attach();place();cycle=setInterval(()=>{if(!document.hidden){attach();place();}},6500);
  observer=new MutationObserver(()=>{if(active&&lights[0]?.parentElement!==grid){attach();place();}});
  observer.observe(grid,{childList:true});
  toggle.setAttribute('aria-pressed','true');
 }
 // One native activation route, same on desktop and iOS.
 toggle.addEventListener('click',()=>{active?stop():start();});
 board.addEventListener('scroll',()=>{if(active&&!document.hidden)place();},{passive:true});
 window.addEventListener('resize',()=>{if(active)place();});
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)place();});
})();
