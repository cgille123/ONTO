'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const MATRIX_COLUMNS=24;
const KEY='onto-trial-v1', statuses=['Do It!','Active','Waiting'],defaultWhens=['Someday','ASAP','Soon','Pending','Started'];
const tileColors=['none','blue','teal','violet','amber','rose','deepblue','deeppurple'], colorNames={none:'None',blue:'Blue',teal:'Teal',violet:'Violet',amber:'Amber',rose:'Rose',deepblue:'Deep Blue',deeppurple:'Deep Purple'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=x=>JSON.parse(JSON.stringify(x));
function outcomeLabel(kind){return {accomplished:'Accomplished',changed:'Changed direction',stopped:'Stopped',fizzled:'Fizzled out'}[kind]||'Accomplished';}
function historyMark(i){return i.kind==='fizzled'?'○ ':'✓ ';}
function stage(title,props={}){return {id:uuid(),title,subname:'',status:state?.attributes?.defaultStatus||'Do It!',when:state?.attributes?.defaultWhen||'Someday',date:'',category:'',details:'',parent:null,color:'none',size:{width:2,height:2},closed:false,outcome:'',kind:'',closures:[],created:new Date().toISOString(),completed:null,...props};}
function examples(){const a=stage('Replace patio door',{category:'Home',closed:true,outcome:'Researched replacement patio doors',kind:'accomplished',completed:new Date().toISOString()}), b=stage('Get quote from ABC Glass',{category:'Vendors',parent:a.id,closed:true,outcome:'Received ABC Glass quote — $2,850',kind:'accomplished',completed:new Date().toISOString()}),c=stage('Compare quote with Andersen option',{category:'Home',status:'Active',parent:b.id,details:'Compare installed cost, warranty, and lead time.'});return {version:1,items:[stage('Call dentist',{category:'Personal'}),stage('Explore Smaart integration',{category:'neXus',status:'Active',details:'Discover the available API values before prototyping a channel.'}),a,b,c,stage('Confirm delivery lead time',{category:'Vendors',status:'Waiting',parent:b.id}),stage('Return borrowed ladder',{category:'Home',closed:true,outcome:'Returned ladder',kind:'accomplished',completed:new Date().toISOString()}),stage('Book a haircut',{category:'Personal'}),stage('Pick up prescription',{category:'Personal'}),stage('Plan weekend dinner',{category:'Personal',status:'Active'}),stage('Replace kitchen light',{category:'Home'}),stage('Check smoke alarms',{category:'Home'}),stage('Choose office paint',{category:'Home',status:'Active'}),stage('Get roof inspection quote',{category:'Vendors',status:'Waiting'}),stage('Follow up with electrician',{category:'Vendors',status:'Waiting'}),stage('Order microphone cable',{category:'Purchasing'}),stage('Compare battery options',{category:'Purchasing',status:'Active'}),stage('Track replacement part',{category:'Purchasing',status:'Waiting'}),stage('Test stream reconnect',{category:'neXus',status:'Active'}),stage('Sketch source selector',{category:'neXus'}),stage('Draft quick-start guide',{category:'neXus'}),stage('Try compact gauge layout',{category:'neXus',status:'Active'}),stage('Send warranty question',{category:'Vendors'}),stage('Make time for a walk',{category:'Personal'}),stage('Find alternate door supplier',{category:'Vendors',closed:true,outcome:'Ruled out a supplier: no suitable frame size',kind:'changed',completed:new Date().toISOString()}),stage('Renew library card',{category:'Personal',closed:true,outcome:'Renewed library card',kind:'accomplished',completed:new Date().toISOString()})],order:[]};}
const reservedAttributes=['__manage__','__date__','__today__','__tomorrow__','__pickdate__','__schedule__'];
function validAttributeName(name){return typeof name==='string'&&!!name.trim()&&name===name.trim()&&name.length<=60&&!reservedAttributes.some(n=>n.toLowerCase()===name.toLowerCase());}
function readAttributes(board){const a=board.attributes;if(a&&Array.isArray(a.statuses)){a.statuses=a.statuses.map(s=>s==='To Do'?'Do It!':s);if(a.defaultStatus==='To Do')a.defaultStatus='Do It!';}for(const item of board.items||[]){if(item.status==='To Do')item.status='Do It!';}if(a!==undefined){if(!a||!Array.isArray(a.statuses)||!a.statuses.length||a.statuses.length>100||!Array.isArray(a.categories)||a.categories.length>500)throw Error('Invalid attribute settings.');for(const list of [a.statuses,a.categories])if(list.some(n=>!validAttributeName(n))||new Set(list.map(n=>n.toLowerCase())).size!==list.length)throw Error('Attribute names must be unique.');if(a.statuses.some(n=>['Accomplished','Changed direction','Stopped'].some(r=>r.toLowerCase()===n.toLowerCase())))throw Error('History outcomes are reserved.');if(!a.statuses.includes(a.defaultStatus)||!a.categoryColors||typeof a.categoryColors!=='object'||Array.isArray(a.categoryColors)||Object.values(a.categoryColors).some(c=>!tileColors.includes(c)))throw Error('Invalid attribute defaults or colors.');return readWhenAttributes(clone(a));}return readWhenAttributes({statuses:statuses.slice(),categories:[...new Set(['Home','Personal','Vendors','Purchasing','neXus',...board.items.map(i=>i.category)].filter(Boolean))].sort((a,b)=>a.localeCompare(b)),defaultStatus:'Do It!',categoryColors:{}});}
function readWhenAttributes(a){if(a.whens===undefined){a.whens=defaultWhens.slice();a.defaultWhen='Someday';a.futureWhens=['Someday'];}if(!Array.isArray(a.whens)||!a.whens.length||a.whens.length>100||a.whens.some(n=>!validAttributeName(n))||new Set(a.whens.map(n=>n.toLowerCase())).size!==a.whens.length||!a.whens.includes(a.defaultWhen)||!Array.isArray(a.futureWhens)||a.futureWhens.some(n=>!a.whens.includes(n))||new Set(a.futureWhens).size!==a.futureWhens.length)throw Error('Invalid When settings.');return a;}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00');return Number.isFinite(date.getTime())&&localDay(date)===value;}
function dateAfter(days=0){const date=new Date();date.setDate(date.getDate()+days);return localDay(date);}
function whenOptions(){return state.attributes.whens;}
function whenMarkup(){return whenOptions().map(w=>`<option value="${esc(w)}">${esc(w)}</option>`).join('')+'<optgroup label="Schedule"><option value="__today__">Today</option><option value="__tomorrow__">Tomorrow</option><option value="__date__">Pick date…</option></optgroup>';}
function whenFields(select,date){const value=select.value;if(value==='__today__'||value==='__tomorrow__')return {when:'__date__',date:dateAfter(value==='__tomorrow__'?1:0)};if(value==='__date__')return {when:'__date__',date:date.value};return {when:value,date:''};}
function syncWhenFields(select,date){if(['__today__','__tomorrow__'].includes(select.value)){date.value=dateAfter(select.value==='__tomorrow__'?1:0);select.value='__date__';}date.hidden=select.value!=='__date__';date.required=!date.hidden;}
function validWhenFields(fields){return fields.when==='__date__'?validDate(fields.date):whenOptions().includes(fields.when)&&fields.date==='';}
function whenLabel(i){if(i.when!=='__date__')return i.when||state.attributes.defaultWhen;const date=i.date,today=dateAfter();if(date===today)return 'Today';if(date===dateAfter(1))return 'Tomorrow';return new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',...(date.slice(0,4)!==today.slice(0,4)?{year:'numeric'}:{})});}
function isFuture(i,today=dateAfter()){return i.when==='__date__'?i.date>today:state.attributes.futureWhens.includes(i.when);}
let whenFilter='',showFuture=true,dateTarget=null,dateBefore=null;
// ALL is the default on each launch. TODAY is an explicit temporary view.
showFuture=true;
function startDateEdit(id,before=null){const i=get(id);if(!i)return;dateTarget=id;dateBefore=before||clone(state);$('#schedule-title').textContent=i.title;$('#schedule-date').value=i.when==='__date__'?i.date:dateAfter();$('#schedule').showModal();$('#schedule-date').focus();}
$('#scheduleform').onsubmit=e=>{e.preventDefault();const i=get(dateTarget),date=$('#schedule-date').value;if(!i||!validDate(date)){$('#schedule-date').reportValidity();return;}i.when='__date__';i.date=date;persist();$('#schedule').close();render();message('Scheduled for '+whenLabel(i)+'.',dateBefore);};
let state={version:1,colorMode:'user',items:[],order:[]}, loadError=false;
try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch(e){loadError=true;}
// This release grants unlimited Field Beta access. Future Free builds change this
// build setting; old device-local preview flags are not purchase entitlements.
const FIELD_BETA=true;
const FREE_TILE_LIMIT=6;
function countsTowardFreeLimit(item){return !item.closed&&!item.preset;}
function unfinishedTaskCount(){return state.items.filter(countsTowardFreeLimit).length;}
function remainingFreeTiles(){return Math.max(0,FREE_TILE_LIMIT-unfinishedTaskCount());}
// Non-increasing changes remain available even on an imported or former-beta board.
function canAddTiles(count=1){return FIELD_BETA||count<=0||unfinishedTaskCount()+count<=FREE_TILE_LIMIT;}
function tileLimitNotice(){
 const text='6 unfinished tasks max. Future tasks count.';
 const dialog=$$('dialog[open]').at(-1);
 if(!dialog){message(text);return;}
 let notice=dialog.querySelector('.plan-limit-notice');
 if(!notice){
  notice=document.createElement('p');notice.className='hint plan-limit-notice';
  notice.setAttribute('role','alert');
  (dialog.querySelector('form')||dialog).appendChild(notice);
  dialog.addEventListener('close',()=>{notice.hidden=true;});
 }
 notice.textContent=text;notice.hidden=false;notice.scrollIntoView({block:'nearest'});
}
function refreshPlanStatus(){
 const el=$('#plan-status');if(!el)return;
 const count=unfinishedTaskCount();
 el.textContent=FIELD_BETA?'Field Beta · Unlimited tiles':`Free · ${count}/${FREE_TILE_LIMIT} unfinished tasks${count>FREE_TILE_LIMIT?' · Existing board preserved':''}`;
}
$('#about-onto')?.addEventListener('click',()=>$('#onto-guide').showModal());
$('#close-onto-guide')?.addEventListener('click',()=>$('#onto-guide').close());
$('#guide-done')?.addEventListener('click',()=>$('#onto-guide').close());
let editorSize={width:2,height:2},editorColor='none',editorIntensity='soft';
let bulkSelection=new Set(),bulkAction='',bulkTargets=[];
let layout='tiles',fixedZoom=.75,flowZoom=.75,fitBoard=false;try{const saved=localStorage.getItem('onto-layout');if(['fixed','smash'].includes(saved))layout=saved;const zoom=Number(localStorage.getItem('onto-fixed-zoom'));if(zoom>=.4&&zoom<=2)fixedZoom=Math.round(zoom*10)/10;const flow=Number(localStorage.getItem('onto-flow-zoom'));if(flow>=.4&&flow<=2)flowZoom=Math.round(flow*10)/10;}catch(e){}
// The iPhone flow board uses a smaller initial scale. Preserve deliberate zoom choices.
if(window.matchMedia('(pointer:coarse) and (max-width:600px)').matches){
  try{
    if(localStorage.getItem('onto-phone-flow-default-v1')!== 'set'){
      const prior=localStorage.getItem('onto-flow-zoom');
      if(prior===null || Number(prior)===.75){
        flowZoom=.5;
        localStorage.setItem('onto-flow-zoom','0.5');
      }
      localStorage.setItem('onto-phone-flow-default-v1','set');
    }
  }catch(e){}
}
let nowLayout=layout;
let view='now',categoryFilter='',statusFilter='',selected=null,transitionMode='onto',undoState=null,toastTimer,drag=null,trayMode='status';
function validateClosures(value){if(value===undefined)return [];if(!Array.isArray(value)||value.length>10000||value.some(c=>!c||!['','accomplished','changed','stopped','fizzled'].includes(c.kind)||typeof c.outcome!=='string'||c.outcome.length>1000||!(c.completed===null||typeof c.completed==='string'&&Number.isFinite(Date.parse(c.completed)))||typeof c.reopened!=='string'||!Number.isFinite(Date.parse(c.reopened))))throw Error('Invalid previous stage outcomes.');return value.map(c=>({...c}));}
function returnToNow(){if(view==='past')layout=nowLayout;view='now';}
function switchView(next){cancelCurrentDrag();if(view==='now')nowLayout=layout;if(next==='past'){view='past';layout='smash';}else returnToNow();statusFilter='';$('#board-scroll').scrollTop=0;$('#board-scroll').scrollLeft=0;render();}
function renderOutcomeHistory(i){const previous=(i.closures||[]).slice().reverse();$('#outcome-display').hidden=!i.closed&&!previous.length;$('#outcome-display').innerHTML=(i.closed?`<span class="eyebrow">${esc(outcomeLabel(i.kind).toUpperCase())}</span><p>${esc(i.outcome)}</p>`:'')+(previous.length?`<details class="previous-outcomes" ${i.closed?'':'open'}><summary>${previous.length===1?'Previous outcome':previous.length+' previous outcomes'}</summary>${previous.map(c=>`<div><span class="eyebrow">${esc(outcomeLabel(c.kind))} · reopened ${new Date(c.reopened).toLocaleDateString()}</span><p>${esc(c.outcome)}</p></div>`).join('')}</details>`:'');}
function reopenStage(){const i=get(selected);if(!i?.closed)return;if(!canAddTiles(i.preset?0:1)){tileLimitNotice();return;}const values=editValues();if(!values.title){$('#name').reportValidity();return;}if(!validWhenFields(values)){$('#when-date').reportValidity();return;}const before=clone(state);i.closures??=[];i.closures.push({kind:i.kind,outcome:i.outcome,completed:i.completed,reopened:new Date().toISOString()});const victory=state.moments.slice().reverse().find(m=>m.type==='done'&&m.stageId===i.id&&!m.voided&&(!m.closureAt||m.closureAt===i.completed));if(victory)victory.voided=true;Object.assign(i,values,{closed:false,kind:'',outcome:'',completed:null});returnToNow();categoryFilter='';statusFilter='';whenFilter='';persist();$('#editor').close();render();message(!showFuture&&isFuture(i)?'Reopened for '+whenLabel(i)+'. Turn on Future to see it.':'UNDONE. Stage returned to Now.',before);}
$('#undone').onclick=reopenStage;
function validate(x){if(!x||x.version!==1||!Array.isArray(x.items)||!Array.isArray(x.order)||x.items.length>10000)throw Error('Not an ONTO export.');if(x.colorMode!==undefined&&!['user','category','age','status'].includes(x.colorMode))throw Error('Invalid color mode.');const attributes=readAttributes(x);const ids=new Set();for(const i of x.items){if(!i||typeof i.id!=='string'||ids.has(i.id)||typeof i.title!=='string'||!i.title.trim()||!attributes.statuses.includes(i.status)||typeof i.category!=='string'||typeof i.details!=='string'||typeof i.closed!=='boolean'||typeof i.outcome!=='string'||!['','accomplished','changed','stopped','fizzled'].includes(i.kind)||!(i.parent===null||typeof i.parent==='string')||typeof i.created!=='string'||!(i.completed===null||typeof i.completed==='string'))throw Error('Invalid ONTO stage.');if(i.subname!==undefined&&(typeof i.subname!=='string'||i.subname.length>240))throw Error('Invalid subname.');if(i.size!==undefined&&(!i.size||![1,2,4].includes(i.size.width)||![1,2,4].includes(i.size.height)))throw Error('Invalid tile size.');if(i.fixed!==undefined&&(!validFixed(i.fixed,i.size||{width:2,height:2})||(i.fixed.layer!==undefined&&!['now','past'].includes(i.fixed.layer))))throw Error('Invalid matrix position.');if(i.color!==undefined&&!tileColors.includes(i.color))throw Error('Invalid tile color.');if(i.intensity!==undefined&&!['soft','hot','hotter'].includes(i.intensity))throw Error('Invalid tile intensity.');if(i.preset!==undefined&&(!i.preset||typeof i.preset!=='object'||!['now','past'].includes(i.preset.view)||!['tiles','fixed','smash'].includes(i.preset.layout)))throw Error('Invalid DISPLAY preset.');if(i.when===undefined&&i.date!==undefined&&i.date!=='')throw Error('Date requires a scheduled When.');if(i.when!==undefined&&(i.when==='__date__'?!validDate(i.date):!attributes.whens.includes(i.when)||(i.date!==undefined&&i.date!=='')))throw Error('Invalid stage When or date.');validateClosures(i.closures);ids.add(i.id);}for(const i of x.items){let p=i,seen=new Set();while(p.parent){if(!ids.has(p.parent)||seen.has(p.parent))throw Error('Invalid lineage.');seen.add(p.parent);p=x.items.find(n=>n.id===p.parent);}}const matrixCells={now:new Set(),past:new Set()};for(const i of x.items){if(!i.fixed)continue;const size=i.size||{width:2,height:2},cells=matrixCells[i.closed?'past':'now'];for(let row=i.fixed.row;row<i.fixed.row+size.height;row++)for(let col=i.fixed.col;col<i.fixed.col+size.width;col++){const key=col+':'+row;if(cells.has(key))throw Error('Overlapping matrix positions.');cells.add(key);}}if(x.order.some(id=>typeof id!=='string'||!ids.has(id))||new Set(x.order).size!==x.order.length)throw Error('Invalid visual order.');const moments=validateMoments(x.moments,ids);return {version:1,attributes,moments,colorMode:x.colorMode||'user',items:x.items.map(i=>({...i,closures:validateClosures(i.closures),when:i.when??attributes.defaultWhen,date:i.date||'',subname:i.subname||'',color:i.color||'none',size:i.size?{...i.size}:{width:2,height:2}})),order:x.order.slice()};}
function normalize(){if(!state.moments)state.moments=[];if(!state.attributes)state.attributes=readAttributes(state);readWhenAttributes(state.attributes);for(const i of state.items){if(i.category&&!state.attributes.categories.includes(i.category))state.attributes.categories.push(i.category);if(!state.attributes.statuses.includes(i.status))state.attributes.statuses.push(i.status);}if(!state.colorMode)state.colorMode='user';const ids=new Set(state.items.map(i=>i.id));state.order=state.order.filter(id=>ids.has(id));state.items.forEach(i=>{if(!i.closures)i.closures=[];if(i.when===undefined)i.when=state.attributes.defaultWhen;if(i.date===undefined)i.date='';if(i.subname===undefined)i.subname='';if(!i.color)i.color='none';if(!i.size)i.size={width:2,height:2};if(!state.order.includes(i.id))state.order.push(i.id);});ensureFixedPositions();}
// Retain up to three prior board versions, at most one every 15 minutes.
// Snapshots are on-device recovery points, NOT independent/off-device backups.
const AUTO_BACKUPS_KEY='onto-auto-snapshots-v1';
function snapshotPreviousBoard(){
  try{
    const previous=localStorage.getItem(KEY);
    if(!previous)return;
    const prior=validate(JSON.parse(previous));
    if(JSON.stringify(prior)===JSON.stringify(state))return;
    const now=Date.now();
    const snapshots=JSON.parse(localStorage.getItem(AUTO_BACKUPS_KEY)||'[]');
    if(!Array.isArray(snapshots))return;
    if(snapshots.length && now-snapshots[0].at<15*60*1000)return;
    const next=[{at:now,board:prior},...snapshots].slice(0,3);
    localStorage.setItem(AUTO_BACKUPS_KEY,JSON.stringify(next));
    window.dispatchEvent(new Event('onto:snapshot-saved'));
  }catch(e){/* Saving the current board takes priority if snapshot storage is full. */}
}
function persist(){normalize();try{snapshotPreviousBoard();localStorage.setItem(KEY,JSON.stringify(state));$('#storage').textContent='Saved on this device · Export for a backup';}catch(e){$('#storage').textContent='Saving unavailable · Export to keep your work';}}
function categories(){return state.attributes.categories.slice();}
function statusOptions(){return state.attributes.statuses;}
function statusMarkup(){return statusOptions().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');}
function renderEditorStatusButtons(){
 const select=$('#status'),wrap=$('#editor-status-buttons');if(!wrap)return;
 const values=[...select.options].map(o=>({value:o.value,label:o.textContent}));
 wrap.innerHTML=values.map(({value,label})=>`<button type="button" data-editor-status="${esc(value)}" class="editor-status-choice${select.value===value?' is-current':''}" aria-pressed="${select.value===value}" ${select.disabled?'disabled':''}>${esc(label)}</button>`).join('');
}
$('#editor-status-buttons').addEventListener('click',e=>{const button=e.target.closest('[data-editor-status]');if(!button)return;const select=$('#status');select.value=button.dataset.editorStatus;select.dispatchEvent(new Event('change',{bubbles:true}));renderEditorStatusButtons();});
function get(id){return state.items.find(i=>i.id===id);}
function viewStatus(i){return i.closed?(outcomeLabel(i.kind)):i.status;}
function visible(){return state.order.map(get).filter(i=>i&&i.closed===(view==='past')&&(i.preset?view==='now':((!categoryFilter||i.category===categoryFilter)&&(!statusFilter||viewStatus(i)===statusFilter)&&(!whenFilter||(whenFilter==='__schedule__'?i.when==='__date__':i.when===whenFilter))&&(view==='past'||showFuture||!isFuture(i)))||(drag?.active&&drag.id===i.id)));}
function message(text,snapshot=null){clearTimeout(toastTimer);undoState=snapshot;$('#toast span').textContent=text;$('#undo').disabled=!snapshot;$('#undo').classList.toggle('undo-ready',!!snapshot);$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;undoState=null;$('#undo').disabled=true;$('#undo').classList.remove('undo-ready');},6500);}
function render(){normalize();renderMomentum();$('#layout').value=layout;$('#color-mode').value=state.colorMode;updateColorLegend();$('#now').classList.toggle('selected',view==='now'&&!showFuture);$('#past').classList.toggle('selected',view==='past');$('#now').setAttribute('aria-pressed',view==='now'&&!showFuture);$('#past').setAttribute('aria-pressed',view==='past');const cats=categories();$('#filter').innerHTML='<option value="">Everything</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('#filter').innerHTML+='<option value="__manage__">Manage attributes…</option>';if(categoryFilter&&!cats.includes(categoryFilter))categoryFilter='';$('#filter').value=categoryFilter;const availableStatuses=view==='past'?['Accomplished','Changed direction','Stopped','Fizzled out']:statusOptions();if(statusFilter&&!availableStatuses.includes(statusFilter))statusFilter='';$('#status-filter').innerHTML='<option value="">All statuses</option>'+availableStatuses.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('#status-filter').innerHTML+='<option value="__manage__">Manage attributes…</option>';$('#status-filter').value=statusFilter;$('#when-filter').innerHTML='<option value="">All intentions</option>'+whenOptions().map(w=>`<option value="${esc(w)}">${esc(w)}</option>`).join('')+'<option value="__schedule__">Scheduled dates</option><option value="__manage__">Manage attributes…</option>';if(whenFilter&&!whenOptions().includes(whenFilter)&&whenFilter!=='__schedule__')whenFilter='';$('#when-filter').value=whenFilter;$('#show-future').checked=showFuture;$('#future-control').hidden=view==='past';$('#categories').innerHTML=cats.map(c=>`<option value="${esc(c)}"></option>`).join('');renderGrid();}
function effectiveColor(i,now=Date.now()){if(state.colorMode==='category'){if(!i.category)return 'none';if(state.attributes&&Object.hasOwn(state.attributes.categoryColors,i.category))return state.attributes.categoryColors[i.category];const named={home:'teal',personal:'violet',vendors:'blue',purchasing:'amber',nexus:'rose'};const key=i.category.trim().toLowerCase();if(Object.hasOwn(named,key))return named[key];let hash=0;for(const c of i.category.trim().toLowerCase())hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return tileColors[1+hash%(tileColors.length-1)];}if(state.colorMode==='status'){if(i.closed)return 'teal';const key=String(i.status).toLowerCase();if(key==='do it!'||key==='to do')return 'blue';if(key==='active')return 'amber';if(key==='waiting')return 'violet';let hash=0;for(const ch of key)hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;return tileColors[1+hash%(tileColors.length-1)];}if(state.colorMode==='age'){const created=Date.parse(i.created);if(!Number.isFinite(created))return 'none';const days=Math.max(0,now-created)/86400000;return days<1?'blue':days<7?'teal':days<30?'amber':'rose';}return i.color||'none';}
function updateColorLegend(){const legend=$('#color-legend');legend.hidden=state.colorMode==='user';legend.innerHTML=state.colorMode==='category'?'Matching categories share a color.':state.colorMode==='age'?'<span class="age-key blue">Under 1 day</span><span class="age-key teal">1–6 days</span><span class="age-key amber">7–29 days</span><span class="age-key rose">30+ days</span>':state.colorMode==='status'?'<span class="age-key blue">Do It!</span><span class="age-key amber">Active</span><span class="age-key violet">Waiting</span><span class="age-key teal">History</span>':'';$$('[data-tray="color"]').forEach(b=>{b.disabled=state.colorMode!=='user';b.title=b.disabled?'Colors follow '+state.colorMode+'. Select User in the board Color setting to choose them.':'Choose a tile color';});}
$('#color-mode').onchange=e=>{if(!['user','category','age','status'].includes(e.target.value))return;const before=clone(state);state.colorMode=e.target.value;if(trayMode==='color'&&state.colorMode!=='user')switchTrayMode('status');persist();render();message('Color by '+(state.colorMode==='user'?'your choice':state.colorMode)+'.',before);};
function sizeOf(i){return i.size||{width:2,height:2};}
function visualSize(i){return drag?.active&&drag.id===i.id?sizeOf(drag.before.items.find(n=>n.id===i.id)):sizeOf(i);}
function sizeKey(i){const sz=sizeOf(i);return sz.width+':'+sz.height;}
function sizeLabel(i){const sz=sizeOf(i),labels={1:'½',2:'1',4:'2'};return labels[sz.width]+'× width · '+labels[sz.height]+'× height';}
function fitScale(width,height,availableWidth,availableHeight){return Math.max(.08,Math.min(1,availableWidth/width,availableHeight/Math.max(1,height)));}
function validFixed(p,size){return p&&Number.isInteger(p.col)&&Number.isInteger(p.row)&&p.col>=0&&p.col+size.width<=MATRIX_COLUMNS&&p.row>=0&&p.row<=100000;}
function overlaps(a,b){return a.col<b.col+b.width&&a.col+a.width>b.col&&a.row<b.row+b.height&&a.row+a.height>b.row;}
function fixedBox(i){return {...i.fixed,...sizeOf(i)};}
function fixedLayer(i){return i.closed?'past':'now';}
function firstFreeFixed(size,boxes,startRow=0){const last=Math.max(startRow,...boxes.map(b=>b.row+b.height));for(let row=startRow;row<=last;row++)for(let col=0;col<=MATRIX_COLUMNS-size.width;col++){const candidate={col,row,...size};if(!boxes.some(b=>overlaps(candidate,b)))return candidate;}return {col:0,row:last,...size};}
function ensureFixedPositions(){if(layout!=='fixed'&&!state.items.some(i=>i.fixed))return;const groups={now:[],past:[]},pending=[];for(const i of state.order.map(get).filter(Boolean)){const sz=sizeOf(i),layer=fixedLayer(i),box=i.fixed?fixedBox(i):null,stable=box&&validFixed(box,sz)&&(!i.fixed.layer||i.fixed.layer===layer)&&(!i.fixed.width||i.fixed.width===sz.width)&&(!i.fixed.height||i.fixed.height===sz.height)&&!groups[layer].some(b=>overlaps(box,b));if(stable){i.fixed={col:box.col,row:box.row,...sz,layer};groups[layer].push(box);}else pending.push(i);}for(const i of pending){const sz=sizeOf(i),layer=fixedLayer(i),existing=i.fixed?fixedBox(i):null,box=existing&&validFixed(existing,sz)&&!groups[layer].some(b=>overlaps(existing,b))?existing:firstFreeFixed(sz,groups[layer]);i.fixed={col:box.col,row:box.row,...sz,layer};groups[layer].push(box);}}
function fixedBlocker(i,position,size=sizeOf(i)){const candidate={...position,...size};return state.items.find(n=>n.id!==i.id&&n.closed===i.closed&&n.fixed&&overlaps(candidate,fixedBox(n)));}
function canPlaceFixed(i,position,size=sizeOf(i)){return validFixed(position,size)&&!fixedBlocker(i,position,size);}
function sizePlacementReason(i,position,size){
 if(!validFixed(position,size))return 'That size extends beyond the FIXED board width.';
 const blocker=fixedBlocker(i,position,size);
 if(!blocker)return '';
 const overlapCols=[];const overlapRows=[];
 const b=fixedBox(blocker);
 for(let col=Math.max(position.col,b.col);col<Math.min(position.col+size.width,b.col+b.width);col++)overlapCols.push(col+1);
 for(let row=Math.max(position.row,b.row);row<Math.min(position.row+size.height,b.row+b.height);row++)overlapRows.push(row+1);
 return 'Blocked by “'+blocker.title+'”'+(visible().some(tile=>tile.id===blocker.id)?'':' (hidden by filters)')+' at column '+overlapCols.join(', ')+' / row '+overlapRows.join(', ')+'.';
}

function placeFixed(i,position){if(!canPlaceFixed(i,position))return false;i.fixed={col:position.col,row:position.row,...sizeOf(i),layer:fixedLayer(i)};return true;}
function matrixRows(){const nodes=state.items.filter(i=>i.closed===(view==='past')&&i.fixed);return Math.max(48,drag?.active&&layout==='fixed'?drag.extraRows||0:0,...nodes.map(i=>i.fixed.row+sizeOf(i).height+4));}
function tileGridStyle(i){const sz=visualSize(i);return layout==='fixed'&&i.fixed?`grid-column:${i.fixed.col+1} / span ${sz.width};grid-row:${i.fixed.row+1} / span ${sz.height}`:`grid-column:span ${sz.width};grid-row:span ${sz.height}`;}
function clearFixedPreview(){if(drag)drag.fixedCandidate=null;$('#fixed-preview').hidden=true;$('#matrix-hint').hidden=true;}
function fixedCandidateAt(x,y){if(!drag?.active||layout!=='fixed')return null;const board=$('#board-scroll').getBoundingClientRect(),dock=$('#bottom-dock').getBoundingClientRect();if(x<board.left||x>board.right||y<board.top||y>board.bottom||(x>=dock.left&&x<=dock.right&&y>=dock.top&&y<=dock.bottom))return null;const grid=$('#grid'),rect=grid.getBoundingClientRect(),unit=parseFloat(grid.style.getPropertyValue('--cell-size')),step=(unit+12)*fixedZoom;const col=Math.round((x-drag.offsetX-rect.left)/step),row=Math.round((y-drag.offsetY-rect.top)/step);if(col<0||col>=MATRIX_COLUMNS||row<0)return null;const i=get(drag.id),position={col,row},blocker=fixedBlocker(i,position),valid=canPlaceFixed(i,position);return {...position,valid,blocker:blocker?.id};}
function previewFixed(x,y){const candidate=fixedCandidateAt(x,y);if(!candidate){clearFixedPreview();return;}drag.fixedCandidate=candidate;const preview=$('#fixed-preview'),sz=sizeOf(get(drag.id)),unit=parseFloat($('#grid').style.getPropertyValue('--cell-size'));preview.hidden=false;preview.dataset.valid=String(candidate.valid);preview.style.left=(8+candidate.col*(unit+12)*fixedZoom)+'px';preview.style.top=(8+candidate.row*(unit+12)*fixedZoom)+'px';preview.style.width=(sz.width*unit+(sz.width-1)*12)*fixedZoom+'px';preview.style.height=(sz.height*unit+(sz.height-1)*12)*fixedZoom+'px';$('#matrix-hint').hidden=true;}
function moveFixedControl(direction){const i=get(selected);if(!i?.fixed)return;const before=clone(state),position={col:i.fixed.col,row:i.fixed.row+direction};if(!placeFixed(i,position)){message('That matrix space is occupied or outside the board.');return;}persist();renderGrid();message('Tile moved one matrix row.',before);}
function moveFixedEdge(edge){const i=get(selected);if(!i?.fixed)return;const boxes=state.items.filter(n=>n.id!==i.id&&n.closed===i.closed&&n.fixed).map(fixedBox),position=edge==='first'?firstFreeFixed(sizeOf(i),boxes):{col:i.fixed.col,row:Math.max(0,...boxes.map(b=>b.row+b.height))};if(position.col===i.fixed.col&&position.row===i.fixed.row)return;const before=clone(state);if(placeFixed(i,position)){persist();renderGrid();message('Tile moved to '+(edge==='first'?'the first free space.':'the last row.'),before);}}
// Column controls: FLOW rewraps; FIXED only changes the view scale.
let flowColumnCount=10, fixedVisibleColumns=10;
try {
 const f=Number(localStorage.getItem('onto-flow-columns'));
 const x=Number(localStorage.getItem('onto-fixed-visible-columns'));
 if(Number.isInteger(f)&&f>=6&&f<=20)flowColumnCount=f;
 if(Number.isInteger(x)&&x>=6&&x<=24)fixedVisibleColumns=x;
} catch(e){}
function boardScale(){return layout==='fixed'?fixedZoom:layout==='tiles'?flowZoom:1;}
function syncBoardControls(){
  for(const [id,mode] of [['view-flow','tiles'],['view-fixed','fixed'],['view-stack','smash']]){const button=$('#'+id);button.classList.toggle('selected',layout===mode);button.setAttribute('aria-pressed',layout===mode);}
  for(const mode of ['user','category','age','status']){const button=$('#color-'+mode);button.classList.toggle('selected',state.colorMode===mode);button.setAttribute('aria-pressed',state.colorMode===mode);}
  const future=$('#future-toggle');future.disabled=false;future.classList.toggle('selected',view==='now'&&showFuture);future.setAttribute('aria-pressed',view==='now'&&showFuture);future.title='Show today and future tasks';
}
function measureGrid(){
 const grid=$('#grid'),board=$('#board-scroll'),canvas=$('#board-canvas');
 // Respect the device safe area; Momentum's measured bottom already includes it.
 const safeTop=parseFloat(getComputedStyle($('.site-header')).paddingTop)||0;
 const momentum=document.querySelector('#momentum-slot');
 const momentumBottom=momentum&&!momentum.hidden?momentum.getBoundingClientRect().bottom:0;
 board.style.top=Math.ceil(Math.max(safeTop,momentumBottom))+'px';
 // End the interactive board above the capture entry, not behind the dock.
 const capture=document.querySelector('#capture');
 const captureRect=capture?.getBoundingClientRect();
 const dockRect=document.querySelector('#bottom-dock')?.getBoundingClientRect();
 const bottomEdge=(captureRect&&captureRect.height>0?captureRect.top-8:dockRect?.top??window.innerHeight);
 board.style.bottom=Math.max(0,Math.ceil(window.innerHeight-bottomEdge))+'px';
 const fixed=layout==='fixed',stack=layout==='smash';
 $('#board-zoom').hidden=stack;board.dataset.layout=layout;syncBoardControls();
 $('#zoom-all').hidden=!fixed;$('#columns-label').textContent=fixed?'Visible columns':'Columns';
 for(const id of ['zoom-out','zoom-in','zoom-reset'])$('#'+id).disabled=stack;
 if(stack){grid.style.width='100%';grid.style.transform='';canvas.style.width='';canvas.style.height='';$('#zoom-reset').textContent='—';return;}
 const style=getComputedStyle(board);
 const usableWidth=Math.max(100,board.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-8);
 const frameGutter=16; // 8px inset on each side, frame fits around sockets
 const usableHeight=Math.max(100,board.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0)-8);
 const gap=12, pitch=96;
 grid.style.gridTemplateRows=fixed?'repeat('+matrixRows()+', var(--cell-size))':'';
 $('#fixed-preview').hidden=!fixed||!drag?.fixedCandidate;
 if(fixed){
   grid.style.width=(MATRIX_COLUMNS*pitch-gap)+'px';
   grid.style.setProperty('--half-columns',MATRIX_COLUMNS);
   grid.style.setProperty('--cell-size','84px');
   grid.style.gridTemplateColumns='repeat('+MATRIX_COLUMNS+', 84px)';
   grid.style.setProperty('--grout-pitch','96px');
   if(fitBoard){
     const tiles=visible().filter(i=>i.fixed);
     if(tiles.length){
       const minCol=Math.min(...tiles.map(i=>i.fixed.col));
       const minRow=Math.min(...tiles.map(i=>i.fixed.row));
       const maxCol=Math.max(...tiles.map(i=>i.fixed.col+visualSize(i).width));
       const maxRow=Math.max(...tiles.map(i=>i.fixed.row+visualSize(i).height));
       // Measure the actual viewport, not the 24x48 decorative board or CSS padding-bottom.
       const bounds=board.getBoundingClientRect();
       // The board's own bounding box is the unobstructed viewport.
       const availableHeight=Math.max(80,bounds.height-12);
       const spanWidth=(maxCol-minCol)*pitch-gap;
       const spanHeight=(maxRow-minRow)*pitch-gap;
       const scaleLimit=Math.min(usableWidth/Math.max(1,spanWidth+12),availableHeight/Math.max(1,spanHeight+12));
       // A visible-column value is a scale control. The smallest value that fits
       // is the correct result; no full-grid width enters this calculation.
       fixedVisibleColumns=Math.max(1,Math.ceil((usableWidth-frameGutter)/(pitch*Math.max(.0001,scaleLimit))));
       const scale=(usableWidth-frameGutter)/(fixedVisibleColumns*pitch);
       requestAnimationFrame(()=>{
         board.scrollLeft=Math.max(0,8+minCol*pitch*scale-4);
         board.scrollTop=Math.max(0,8+minRow*pitch*scale-4);
       });
       message('Fit All: '+tiles.length+' tiles, columns '+minCol+'–'+(maxCol-1)+', rows '+minRow+'–'+(maxRow-1)+', window '+Math.round(usableWidth)+'×'+Math.round(availableHeight)+'; '+fixedVisibleColumns+' visible columns.');
     }
     fitBoard=false;
   }
   fixedZoom=(usableWidth-frameGutter)/(fixedVisibleColumns*pitch);
 } else {
   // FLOW has an explicit column count. The drawn grid never sets the limit.
   const columns=flowColumnCount;
   const logicalWidth=columns*pitch-gap;
   grid.style.width=logicalWidth+'px';
   grid.style.setProperty('--half-columns',columns);
   grid.style.setProperty('--cell-size','84px');
   grid.style.gridTemplateColumns='repeat('+ (fixed?'10':String(flowColumnCount)) +', 84px)';
   grid.style.setProperty('--grout-pitch','96px');
   flowZoom=usableWidth/(columns*pitch);
 }
 const scale=boardScale();
 canvas.style.setProperty('--socket-inset','8px');
 canvas.style.setProperty('--visible-grout-pitch',(pitch*scale)+'px');
 grid.style.transform='scale('+scale+')';
 canvas.style.width=(fixed?((MATRIX_COLUMNS*pitch-gap)*scale+48)+'px':(grid.offsetWidth*scale+48)+'px');canvas.style.height=(grid.offsetHeight*scale+48)+'px';
 $('#zoom-reset').textContent=String(fixed?fixedVisibleColumns:flowColumnCount);
 $('#zoom-reset').title=fixed?'Visible columns':'Flow columns';
 $('#zoom-out').disabled=(fixed?fixedVisibleColumns:flowColumnCount)<=6;
 $('#zoom-in').disabled=(fixed?fixedVisibleColumns:flowColumnCount)>=(fixed?24:20);
 $('#zoom-all').setAttribute('aria-pressed','false');
 fitTileTitles();
}
function setBoardColumns(value){
 if(layout==='smash')return;
 cancelCurrentDrag();fitBoard=false;
 const columns=Math.max(6,Math.min(layout==='fixed'?24:20,Math.round(value)));
 if(layout==='fixed')fixedVisibleColumns=columns;else flowColumnCount=columns;
 try{localStorage.setItem(layout==='fixed'?'onto-fixed-visible-columns':'onto-flow-columns',String(columns));}catch(e){}
 measureGrid();
}
$('#zoom-all').onclick=()=>{if(layout!=='fixed')return;cancelCurrentDrag();const dock=$('#bottom-dock');if(dock&&!dock.classList.contains('dock-collapsed')){const toggle=$('#dock-toggle');if(toggle)toggle.click();}fitBoard=true;requestAnimationFrame(measureGrid);};
$('#zoom-out').onclick=()=>setBoardColumns((layout==='fixed'?fixedVisibleColumns:flowColumnCount)-1);
$('#zoom-in').onclick=()=>setBoardColumns((layout==='fixed'?fixedVisibleColumns:flowColumnCount)+1);
$('#zoom-reset').onclick=()=>setBoardColumns(10);
for(const [id,mode] of [['view-flow','tiles'],['view-fixed','fixed'],['view-stack','smash']])$('#'+id).onclick=()=>$('#layout').onchange({target:{value:mode}});
for(const mode of ['user','category','age','status'])$('#color-'+mode).onclick=()=>$('#color-mode').onchange({target:{value:mode}});
$('#future-toggle').onclick=()=>{switchView('now');showFuture=true;$('#show-future').checked=true;render();};
function fitTileTitles(){
 const grid=$('#grid');if(grid.dataset.layout==='smash')return;
 grid.querySelectorAll('.tile').forEach(tile=>{
  const title=tile.querySelector('.tile-title'),footer=tile.querySelector('.tile-bottom'),status=tile.querySelector('.tile-status');
  if(!title||!footer||!status)return;
  const tier=Math.min(Number(tile.dataset.w)||1,Number(tile.dataset.h)||1);
  const base=26*(tier>=3?3:tier>=2?2:1);
  const style=getComputedStyle(tile);
  const left=parseFloat(style.paddingLeft)||0,right=parseFloat(style.paddingRight)||0;
  const width=tile.clientWidth-left-right;
  // Footer and status are measured in the tile's unscaled local coordinate system.
  const top=Math.max(status.offsetTop+status.offsetHeight+5,parseFloat(style.paddingTop)||0);
  const footerHidden=getComputedStyle(footer).display==='none';
  const footerTop=footerHidden?tile.clientHeight-(parseFloat(style.paddingBottom)||0):footer.offsetTop;
  const step=tile.querySelector('.tile-step');
  const bottom=step?Math.min(footerTop,step.offsetTop):footerTop;
  const available=Math.max(0,bottom-top-6);
  title.style.setProperty('top',top+'px','important');
  title.style.setProperty('left',left+'px','important');
  title.style.setProperty('right',right+'px','important');
  title.style.setProperty('height',available+'px','important');
  title.style.setProperty('max-height',available+'px','important');
  if(width<8||available<8)return;
  const probe=document.createElement('span');probe.textContent=title.textContent;
  probe.className='onto-title-measure';
  probe.style.cssText='position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;display:block;box-sizing:border-box;overflow:visible;white-space:normal;overflow-wrap:anywhere;min-height:0;max-height:none;height:auto;';
  probe.style.width=width+'px';
  probe.style.fontFamily=getComputedStyle(title).fontFamily;
  probe.style.fontWeight=getComputedStyle(title).fontWeight;
  probe.style.lineHeight='1.12';
  tile.appendChild(probe);
  const fits=size=>{probe.style.fontSize=size+'px';return probe.scrollHeight<=available-.5&&probe.scrollWidth<=width+1;};
  let result=base;
  if(!fits(base)){
   let low=4,high=base;
   if(fits(low)){for(let n=0;n<16;n++){const mid=(low+high)/2;if(fits(mid))low=mid;else high=mid;}}
   result=low;
  }
  probe.remove();title.style.setProperty('font-size',result.toFixed(2)+'px','important');
 });
}
// Keep decorative light nodes attached so board refreshes never restart their animations.
function replaceGridItems(markup){
 const grid=$('#grid');
 for(const child of [...grid.children])if(!child.classList.contains('disco-socket-light'))child.remove();
 grid.insertAdjacentHTML('beforeend',markup);
}
function renderGrid(){ensureFixedPositions();const items=visible();pruneBulkSelection(items);$('#grid').dataset.layout=layout;replaceGridItems(items.map(i=>`${layout==='smash'?`<div class="smash-entry${bulkSelection.has(i.id)?' bulk-selected':''}"><input type="checkbox" class="stage-check" data-select="${esc(i.id)}" ${bulkSelection.has(i.id)?'checked':''} aria-label="Select ${esc(i.title)}">`:''}<button class="tile${layout==='smash'?' smash-row':''}${drag?.active&&drag.id===i.id?' drag-source':''}" data-id="${esc(i.id)}" data-preset="${i.preset?'true':'false'}" data-status="${esc(i.status)}" data-color="${effectiveColor(i)}" data-intensity="${i.intensity||'soft'}" data-w="${visualSize(i).width}" data-h="${visualSize(i).height}" style="${tileGridStyle(i)}" aria-label="${esc(i.title)}. ${esc(i.closed?i.outcome:i.subname)}. ${esc(i.closed?'History':i.status)}. ${esc(i.category||'None')}. ${esc(whenLabel(i))}">${layout==='smash'?'<span class="grip" aria-hidden="true">⠿</span>':''}<span class="tile-status" style="font-size:${layout==='smash'?11:Math.min(visualSize(i).width,visualSize(i).height)>=3?30:Math.min(visualSize(i).width,visualSize(i).height)>=2?20:10}pt!important;${layout==='smash'?'position:static!important;':'position:absolute!important;top:8px!important;left:8px!important;right:8px!important;'}line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important">${i.preset?'PRESET':i.closed?historyMark(i)+esc(outcomeLabel(i.kind)):esc(i.status)}</span><span class="tile-title">${esc(i.title)}</span>${i.preset?'<span class="preset-edit-control" data-preset-edit="'+esc(i.id)+'" title="Edit preset tile" aria-label="Edit preset tile">✎</span>':''}${i.closed||i.subname?`<span class="tile-step">${esc(i.closed?i.outcome:i.subname)}</span>`:''}<span class="tile-bottom">${i.preset?'':`<span class="category-tag">${esc(i.category||'None')}</span><span class="tile-when${isFuture(i)?' future':''}">${esc(whenLabel(i))}</span>`}${i.parent||state.items.some(n=>n.parent===i.id)?'<span class="lineage-tag" aria-label="Linked stages" title="Linked stages">↗</span>':''}</span></button>${layout==='smash'?'</div>':''}`).join(''));renderGroupStrip();$('#empty').hidden=items.length>0;const hiddenFuture=view==='now'&&!showFuture?state.items.filter(i=>!i.closed&&isFuture(i)).length:0;$('#brand-stage-count').textContent=items.length+' / '+state.items.length;refreshPlanStatus();$('#empty h2').textContent=hiddenFuture?'Future is tucked away.':"A little room for what's next.";$('#empty p').textContent=hiddenFuture?'Turn on Future to see Someday and scheduled stages after today.':'Capture anything above. Details can wait.';$('#examples').hidden=false;$('#examples').textContent='Add Examples';measureGrid();}

let presetEditId=null;function editPresetLabel(i){presetEditId=i.id;$('#preset-edit-name').value=i.title;$('#preset-edit-step').value=i.subname||'';$('#preset-edit-dialog').showModal();}
$('#preset-edit-form').onsubmit=e=>{e.preventDefault();const i=get(presetEditId);if(!i?.preset)return;const title=$('#preset-edit-name').value.trim();if(!title)return;const before=clone(state);i.title=title;i.subname=$('#preset-edit-step').value.trim();persist();$('#preset-edit-dialog').close();render();message('Preset label updated.',before);};
$('#preset-remove').onclick=()=>{const i=get(presetEditId);if(!i?.preset||!confirm('Delete this DISPLAY preset tile?'))return;const before=clone(state);state.items=state.items.filter(n=>n.id!==i.id);state.order=state.order.filter(id=>id!==i.id);persist();$('#preset-edit-dialog').close();render();message('Preset deleted.',before);};
function displaySnapshot(){return {view,layout:nowLayout,showFuture,categoryFilter,statusFilter,whenFilter,colorMode:state.colorMode,flowZoom,fixedZoom,fitBoard};}
function recallPreset(i){if(!i?.preset)return;const s=i.preset;if(!['now','past'].includes(s.view)||!['tiles','fixed','smash'].includes(s.layout))return;cancelCurrentDrag();view=s.view;nowLayout=s.layout;layout=view==='past'?'smash':s.layout;showFuture=!!s.showFuture;categoryFilter=s.categoryFilter||'';statusFilter=s.statusFilter||'';whenFilter=s.whenFilter||'';if(['user','category','age'].includes(s.colorMode))state.colorMode=s.colorMode;if(Number.isFinite(s.flowZoom))flowZoom=s.flowZoom;if(Number.isFinite(s.fixedZoom))fixedZoom=s.fixedZoom;fitBoard=!!s.fitBoard;$('#show-future').checked=showFuture;try{localStorage.setItem('onto-layout',nowLayout);localStorage.setItem('onto-show-future',String(showFuture));localStorage.setItem('onto-flow-zoom',String(flowZoom));localStorage.setItem('onto-fixed-zoom',String(fixedZoom));}catch(e){}persist();render();message('DISPLAY preset: '+i.title);}
function captureThought(edit=false){const title=$('#thought').value.trim();if(!title){$('#thought').reportValidity();return null;}if(!canAddTiles()){tileLimitNotice();return null;}
  // In standalone iOS, keeping the capture input focused while replacing the
  // grid can leave WebKit at its input-focus magnification until rotation.
  // End the editing session before any DOM/grid measurements.
  if(document.activeElement===$('#thought'))$('#thought').blur();const before=clone(state),i=stage(title);state.items.push(i);state.order.unshift(i.id);returnToNow();categoryFilter='';statusFilter='';whenFilter='';persist();render();$('#thought').value='';message(!showFuture&&isFuture(i)?'Captured for '+whenLabel(i)+'. Turn on Future to see it.':'Captured. Details can wait.',before);if(edit)openEditor(i.id,'subname');return i.id;}
function updateCaptureActions(){
 const value=$('#thought').value,hasTitle=!!value.trim();
 $('#capture-actions').hidden=!hasTitle||!$('#bottom-dock').classList.contains('dock-collapsed');
 for(const id of ['capture-add','capture-edit','capture-done'])$('#'+id).disabled=!hasTitle;
 $('#capture-clear').hidden=value.length===0;
}
$('#thought').addEventListener('input',updateCaptureActions);
$('#capture-clear').addEventListener('click',()=>{$('#thought').value='';updateCaptureActions();$('#thought').blur();});
$('#capture-done').addEventListener('click',()=>{const text=$('#thought').value.trim();if(!text)return;$('#thought').blur();const before=clone(state),m={id:uuid(),type:'win',text,title:'',at:new Date().toISOString(),stageId:null,nextIds:[]};state.moments.push(m);momentumToday=true;momentumDay=localDay();momentumSelection=m.id;persist();$('#thought').value='';updateCaptureActions();render();message('DONE! Count it.',before);});
// One activation route for every platform. No touch/pointer interception.
$('#capture-add').addEventListener('click',e=>{e.preventDefault();captureThought(false);updateCaptureActions();});
$('#capture-edit').addEventListener('click',e=>{e.preventDefault();captureThought(true);updateCaptureActions();});
$('#capture').addEventListener('submit',e=>{e.preventDefault();captureThought(false);updateCaptureActions();});

updateCaptureActions();
$('#now').onclick=()=>{switchView('now');showFuture=false;$('#show-future').checked=false;render();};$('#past').onclick=()=>switchView('past');$('#clear-view-filters').onclick=()=>{categoryFilter='';statusFilter='';whenFilter='';render();};$('#filter').onchange=e=>{if(e.target.value==='__manage__'){e.target.value=categoryFilter;openManage('category');return;}categoryFilter=e.target.value;renderGrid();};
$('#layout').onchange=e=>{if(!['tiles','fixed','smash'].includes(e.target.value))return;cancelCurrentDrag();layout=e.target.value;if(view==='now'){nowLayout=layout;try{localStorage.setItem('onto-layout',layout);}catch(error){}}$('#board-scroll').scrollLeft=0;$('#board-scroll').scrollTop=0;normalize();persist();render();measureGrid();};
$('#when-filter').onchange=e=>{if(e.target.value==='__manage__'){e.target.value=whenFilter;openManage('when');return;}whenFilter=e.target.value;renderGrid();};
$('#show-future').onchange=e=>{cancelCurrentDrag();showFuture=e.target.checked;render();};
$('#status-filter').onchange=e=>{if(e.target.value==='__manage__'){e.target.value=statusFilter;openManage('status');return;}statusFilter=e.target.value;renderGrid();};
function shuffled(values){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
$('#jostle').onclick=()=>{
 cancelCurrentDrag();const shown=visible();if(shown.length<2){message('Need at least two visible tiles to Jostle.');return;}
 const before=clone(state),ids=new Set(shown.map(i=>i.id));let mixed=shuffled(shown.map(i=>i.id));if(mixed.every((id,j)=>id===shown[j].id))mixed.push(mixed.shift());
 let cursor=0;state.order=state.order.map(id=>ids.has(id)?mixed[cursor++]:id);
 if(layout==='fixed'){
  const layer=view==='past'?'past':'now';const original=shown.map(i=>({...i.fixed}));
  // Keep all hidden tiles in place; repack only visible ones around them.
  const occupied=state.items.filter(i=>!ids.has(i.id)&&fixedLayer(i)===layer&&i.fixed).map(fixedBox);
  for(const id of mixed){const item=get(id),sz=sizeOf(item),position=firstFreeFixed(sz,occupied);item.fixed={...position,layer};occupied.push(position);}
 }
 persist();render();message('Jostled visible tiles. Sizes unchanged.',before);
};
$('#pick-for-me').onclick=()=>{
 const choices=visible().filter(i=>!i.preset);
 if(!choices.length){message('No visible tiles to pick.');return;}
 const chosen=choices[Math.floor(Math.random()*choices.length)];
 openEditor(chosen.id);
};
$('#examples').onclick=()=>{
 const before=clone(state),samples=examples(),mapped=new Map(),added=[];
 let newTasks=0,skipped=0;
 for(const item of samples.items){
  const existing=state.items.find(i=>i.title===item.title);
  mapped.set(item.id,existing?.id||item.id);
  if(existing)continue;
  const extra=countsTowardFreeLimit(item)?1:0;
  if(extra&&!canAddTiles(newTasks+extra)){skipped++;continue;}
  if(!statusOptions().includes(item.status))item.status=state.attributes.defaultStatus;
  added.push(item);newTasks+=extra;
 }
 // Reconnect through a retained ancestor when a sample parent was skipped.
 const retained=new Set([...state.items,...added].map(item=>item.id));
 const sampleById=new Map(samples.items.map(item=>[item.id,item]));
 for(const item of added){
  let parent=item.parent;
  while(parent&&!retained.has(mapped.get(parent)||parent))parent=sampleById.get(parent)?.parent||null;
  item.parent=parent?(mapped.get(parent)||parent):null;
  state.items.push(item);state.order.push(item.id);
 }
 normalize();persist();render();
 message(skipped?added.length+' examples added. Free allows 6 unfinished tasks; '+skipped+' skipped.':added.length?added.length+' examples added. Your existing tiles are kept.':'All these examples are already on your board.',added.length?before:null);
};
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
function refreshEditorCategories(selectedCategory=''){
 const choices=categories();if(selectedCategory&&!choices.includes(selectedCategory))choices.push(selectedCategory);
 $('#category').innerHTML='<option value="">None</option>'+choices.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')+'<option value="__new_category__">+ New category…</option>';
 $('#category').value=selectedCategory||'';
}
$('#category').addEventListener('change',()=>{
 if($('#category').value!=='__new_category__')return;
 const name=prompt('New category name:')?.trim();
 if(!name){refreshEditorCategories(get(selected)?.category||'');return;}
 if(!validAttributeName(name)){alert('Use a unique category name, up to 60 characters.');refreshEditorCategories(get(selected)?.category||'');return;}
 const existing=categories().find(c=>c.toLowerCase()===name.toLowerCase());
 if(!existing){state.attributes.categories.push(name);state.attributes.categories.sort((a,b)=>a.localeCompare(b));}
 refreshEditorCategories(existing||name);syncEditor();
});
function openEditor(id,focusField='name'){const i=get(id);if(!i)return;selected=id;editorSize={...sizeOf(i)};const sizeWarning=$('#editor-size-warning');if(sizeWarning){sizeWarning.hidden=true;sizeWarning.textContent='';}editorColor=i.color||'none';editorIntensity=i.intensity||'soft';$('#name').value=i.title;$('#subname').value=i.subname||'';$('#status').innerHTML=statusMarkup()+(i.closed?'':'<option value="__preset__">Preset</option>');$('#status').value=i.preset?'__preset__':i.status;$('#status').disabled=i.closed;renderEditorStatusButtons();$('#when').innerHTML=whenMarkup();$('#when').value=i.when;$('#when-date').value=i.date||'';syncWhenFields($('#when'),$('#when-date'));refreshEditorCategories(i.category);$('#details').value=i.details;$('#stage-label').textContent=i.closed?'HISTORY:':'THIS STAGE:';$('#finish').hidden=i.closed;$('#undone').hidden=!i.closed;$('#onto').textContent=i.closed?'Add next →':'ONTO →';renderOutcomeHistory(i);$('#delete-confirm').hidden=true;$('#delete-tile').hidden=false;$('#first').title=layout==='fixed'?'Move to first free matrix space':'Move to first in this view';$('#last').title=layout==='fixed'?'Move to last free matrix row':'Move to last in this view';$('#up').title=layout==='fixed'?'Move one matrix row up':'Move up in visual order';$('#down').title=layout==='fixed'?'Move one matrix row down':'Move down in visual order';syncEditor();renderLineage(i);if(!$('#editor').open)$('#editor').showModal();const field=focusField==='subname'?$('#subname'):$('#name');field.focus();if(focusField!=='subname')field.select?.();}
function rootOf(i){while(i.parent&&get(i.parent))i=get(i.parent);return i;}
function renderLineage(i){const root=rootOf(i),nodes=state.items.filter(n=>rootOf(n).id===root.id);$('#chain-count').textContent=nodes.length+' '+(nodes.length===1?'stage':'stages');let html='';function walk(n,depth){html+=`<button type="button" class="lineage-node${n.id===i.id?' current':''}" style="--indent:${Math.min(depth,5)}" data-lineage="${esc(n.id)}"><strong>${n.closed?historyMark(n):''}${esc(n.title)}</strong>${n.closed||n.subname?`<span class="lineage-step">${esc(n.closed?n.outcome:n.subname)}</span>`:''}<small>${esc(n.category||'None')} · ${esc(whenLabel(n))} · ${esc(n.closed?outcomeLabel(n.kind):n.status)}${n.closed&&n.subname?'<br>Step: '+esc(n.subname):''}${n.closures?.length?'<br>Reopened · '+n.closures.length+' previous '+(n.closures.length===1?'outcome':'outcomes'):''}</small></button>`;state.items.filter(c=>c.parent===n.id).forEach(c=>walk(c,depth+1));}walk(root,0);$('#lineage').innerHTML=html;$$('[data-lineage]').forEach(b=>b.onclick=()=>openEditor(b.dataset.lineage));}
function editValues(){return {title:$('#name').value.trim(),subname:$('#subname').value.trim(),status:$('#status').value,category:$('#category').value.trim(),details:$('#details').value,size:{...editorSize},color:editorColor,intensity:editorIntensity,...whenFields($('#when'),$('#when-date'))};}
function editorChanged(){const i=get(selected);if(!i)return false;return Object.entries(editValues()).some(([key,value])=>{if(i.preset&&key==='status')return value!=='__preset__';return JSON.stringify(value)!==JSON.stringify(i[key]??'');});}
function syncEditor(){const i=get(selected);if(!i)return;const presetMode=$('#status').value==='__preset__';renderEditorStatusButtons();$('#editor').classList.toggle('editing-preset',presetMode);syncWhenFields($('#when'),$('#when-date'));$('#update').disabled=!editorChanged();const preview=$('#editor-tile');preview.dataset.color=effectiveColor({...i,...editValues()});preview.dataset.status=$('#status').value;preview.dataset.intensity=editorIntensity;renderEditorSize();renderEditorColors();}
function renderEditorSize(){const sizes=[1,2,4],cols=sizes.indexOf(editorSize.width)+1,rows=sizes.indexOf(editorSize.height)+1;$('#editor-size-grid').innerHTML=sizes.flatMap((height,row)=>sizes.map((width,col)=>`<button type="button" data-editor-size="${width}:${height}" class="${col<cols&&row<rows?'filled ':''}${width===editorSize.width&&height===editorSize.height?'chosen':''}" aria-pressed="${width===editorSize.width&&height===editorSize.height}" aria-label="${esc(sizeLabel({size:{width,height}}))}" title="${esc(sizeLabel({size:{width,height}}))}"></button>`)).join('');$('#editor-size-label').textContent=sizeLabel({size:editorSize});}
function chooseEditorSize(key){const [width,height]=key.split(':').map(Number);if(![1,2,4].includes(width)||![1,2,4].includes(height))return;editorSize={width,height};syncEditor();const item=get(selected);const reason=layout==='fixed'&&item?.fixed?sizePlacementReason(item,item.fixed,editorSize):'';const note=$('#editor-size-warning');if(note){note.textContent=reason;note.hidden=!reason;}}
$('#editor-size-grid').addEventListener('click',e=>{const button=e.target.closest('[data-editor-size]');if(button){chooseEditorSize(button.dataset.editorSize);$(`[data-editor-size="${button.dataset.editorSize}"]`)?.focus();}});
function intensityDots(color,current,mode){return '<span class="intensity-divider" aria-hidden="true"></span>'+['soft','hot','hotter'].map(level=>`<button type="button" class="intensity-dot" data-${mode==='editor'?'editor-intensity':'attribute'}="${mode==='editor'?level:'intensity:'+level}" data-swatch="${color}" data-level="${level}" aria-label="${level} intensity" title="${level[0].toUpperCase()+level.slice(1)}" aria-pressed="${current===level}"><span class="intensity-swatch"></span></button>`).join('');}
function renderEditorColors(){const automatic=state.colorMode!=='user';$('#editor-color-chips').dataset.intensity=editorIntensity;$('#editor-color-chips').innerHTML=tileColors.map(color=>`<button type="button" data-editor-color="${color}" data-swatch="${color}" aria-label="${colorNames[color]}" title="${colorNames[color]}" aria-pressed="${color===editorColor}" ${automatic?'disabled':''}><span class="color-swatch"></span></button>`).join('')+intensityDots(editorColor,editorIntensity,'editor');$('#editor-color-note').textContent=automatic?'By '+state.colorMode:'';}
function chooseEditorIntensity(v){if(!['soft','hot','hotter'].includes(v))return;editorIntensity=v;syncEditor();}
$('#editor-color-chips').addEventListener('click',e=>{const b=e.target.closest('[data-editor-intensity]');if(b)chooseEditorIntensity(b.dataset.editorIntensity);});
function chooseEditorColor(color){if(state.colorMode!=='user'||!tileColors.includes(color))return;editorColor=color;syncEditor();}
$('#editor-color-chips').addEventListener('click',e=>{const button=e.target.closest('[data-editor-color]');if(button){chooseEditorColor(button.dataset.editorColor);$(`[data-editor-color="${button.dataset.editorColor}"]`)?.focus();}});
$('#editform').addEventListener('input',syncEditor);$('#editform').addEventListener('change',syncEditor);
function saveEditor(){
 const values=editValues(),item=get(selected);if(!item)return false;
 const makePreset=$('#status').value==='__preset__';
 if(makePreset){values.status=item.status;values.category='';values.when=state.attributes.defaultWhen;values.date='';values.details='';}
 if(layout==='fixed'&&item.fixed&&!canPlaceFixed(item,item.fixed,values.size)){
  const note=$('#editor-size-warning');
  if(note){note.textContent=sizePlacementReason(item,item.fixed,values.size)+' Move the tile to a clear location before resizing.';note.hidden=false;note.scrollIntoView({block:'nearest'});}
  return false;
 }
 if(!validWhenFields(values)){$('#when-date').reportValidity();return false;}
 if(!values.title){$('#name').reportValidity();return false;}
 const nextCount=!item.closed&&!makePreset?1:0;
 if(!canAddTiles(nextCount-Number(countsTowardFreeLimit(item)))){tileLimitNotice();return false;}
 // Commit the preset change only after validation and capacity checks succeed.
 if(makePreset&&!item.preset)item.preset=displaySnapshot();
 else if(!makePreset&&item.preset)delete item.preset;
 Object.assign(item,values);persist();render();return true;
}
$('#editform').onsubmit=e=>{e.preventDefault();if(!editorChanged())return;const before=clone(state);if(saveEditor()){$('#editor').close();message('Stage updated.',before);}};
function deleteScopeIds(id,scope='stage'){const i=get(id);if(!i)return [];if(scope==='chain'){const root=rootOf(i);return state.items.filter(n=>rootOf(n).id===root.id).map(n=>n.id);}if(scope==='future'){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const n of state.items)if(n.parent&&ids.has(n.parent)&&!ids.has(n.id)){ids.add(n.id);changed=true;}}return [...ids];}return [id];}
function removeStages(ids){const removed=new Set(ids.filter(id=>get(id)));for(const i of state.items){if(removed.has(i.id))continue;while(i.parent&&removed.has(i.parent))i.parent=get(i.parent).parent;}state.items=state.items.filter(n=>!removed.has(n.id));state.order=state.order.filter(id=>!removed.has(id));for(const m of state.moments){if(removed.has(m.stageId))m.stageId=null;m.nextIds=m.nextIds.filter(id=>!removed.has(id));}return removed.size;}
function deleteStage(id,scope='stage'){const ids=deleteScopeIds(id,scope);if(!ids.length)return;const before=clone(state),count=removeStages(ids);persist();$('#editor').close();selected=null;bulkSelection.clear();render();message(count+' '+(count===1?'stage':'stages')+' deleted.',before);}
function updateDeleteScope(){const scope=$('#delete-scope').value||'stage',count=deleteScopeIds(selected,scope).length;$('#delete-explanation').textContent=(scope==='stage'?'Later stages are kept and reconnected to the previous stage.':scope==='future'?'Includes every descendant and branch after this stage.':'Includes earlier stages and every branch of this chain.')+' Recorded Momentum stays in your daily history. Undo restores the whole deletion.';$('#delete-commit').textContent='Delete '+count+' '+(count===1?'stage':'stages');}
$('#delete-tile').onclick=()=>{if(get(selected))deleteStage(selected,'stage');}
$('#delete-scope').onchange=updateDeleteScope;$('#delete-cancel').onclick=()=>{$('#delete-confirm').hidden=true;$('#delete-tile').hidden=false;};$('#delete-commit').onclick=()=>deleteStage(selected,$('#delete-scope').value);

function shift(direction){if(layout==='fixed'){moveFixedControl(direction);return;}const list=visible(),idx=list.findIndex(i=>i.id===selected),dest=list[idx+direction];if(!dest)return;const before=clone(state),a=state.order.indexOf(selected),b=state.order.indexOf(dest.id);[state.order[a],state.order[b]]=[state.order[b],state.order[a]];persist();renderGrid();message('Visual order updated.',before);}
function shiftToEdge(edge){if(layout==='fixed'){moveFixedEdge(edge);return;}const ids=visible().map(i=>i.id),idx=ids.indexOf(selected);if(idx<0||ids.length<2||(edge==='first'?idx===0:idx===ids.length-1))return;const before=clone(state),visibleIds=new Set(ids);ids.splice(idx,1);if(edge==='first')ids.unshift(selected);else ids.push(selected);let cursor=0;state.order=state.order.map(id=>visibleIds.has(id)?ids[cursor++]:id);persist();renderGrid();message('Moved to '+edge+' in this view.',before);}
$('#first').onclick=()=>shiftToEdge('first');$('#last').onclick=()=>shiftToEdge('last');
$('#up').onclick=()=>shift(-1);$('#down').onclick=()=>shift(1);
function startTransition(mode){if(layout==='fixed'&&get(selected).fixed&&!canPlaceFixed(get(selected),get(selected).fixed,editorSize)){message('This size overlaps another tile. Move the tile into more space first.');return;}if(!validWhenFields(editValues())){$('#when-date').reportValidity();return;}if(!$('#name').value.trim()){$('#name').reportValidity();return;}transitionMode=mode;const i=get(selected);$('#editor').close();$('#transition-title').textContent=i.closed?'Keep the story moving.':mode==='done'?'What happened?':'What happened—and what’s next?';$('#transition-label').textContent=mode==='done'?'CLOSING THIS STAGE':'MOVING FORWARD';$('#outcome-fields').hidden=i.closed;$('#outcome').required=!i.closed;$('#outcome').value=i.closed?'':editValues().subname||editValues().title;$('#outcome').setCustomValidity('');$('#outcome').classList.toggle('suggested',!i.closed);$('#kind').value='accomplished';$('#next-fields').hidden=mode==='done';$('#nextrows').innerHTML='';let nextRow=null;if(mode==='onto')nextRow=addNext();$('#commit').textContent=mode==='done'?'Done':'ONTO →';$('#transition').showModal();const first=nextRow?nextRow.querySelector('.next-subname'):$('#outcome');first.focus();if(!nextRow)first.select?.();}
$('#finish').onclick=()=>startTransition('done');$('#onto').onclick=()=>startTransition('onto');
function addNext(){const row=document.createElement('div');row.className='nextrow';row.innerHTML=`<button type="button" class="remove" aria-label="Remove this next step">×</button><label>Name<input class="next-name suggested" maxlength="240" value="${esc(editValues().title)}" required></label><label>Next step / subname<input class="next-subname" maxlength="240" placeholder="What’s next for this?" required></label><div class="two"><label>Status<select class="next-status suggested">${statusMarkup()}</select></label><label>Category<input class="next-category" list="categories" placeholder="Unsorted" maxlength="60"></label></div><label>When<select class="next-when suggested">${whenMarkup()}</select><input type="date" class="next-date" hidden aria-label="Scheduled date"></label><details><summary>Add details</summary><label>Details<textarea class="next-details" rows="2"></textarea></label></details>`;row.querySelector('.remove').onclick=()=>{if($('#nextrows').children.length>1)row.remove();else message('Keep one next step, or choose Done instead.');};row.querySelector('.next-status').value=state.attributes.defaultStatus;row.querySelector('.next-when').value=state.attributes.defaultWhen;row.querySelector('.next-when').onchange=()=>syncWhenFields(row.querySelector('.next-when'),row.querySelector('.next-date'));$('#nextrows').append(row);return row;}
$('#another').onclick=()=>{const row=addNext();row.querySelector('.next-subname').focus();};
$('#transitionform').onsubmit=e=>{e.preventDefault();const i=get(selected),values=editValues(),outcome=$('#outcome').value.trim();if(!i.closed&&!outcome){$('#outcome').setCustomValidity('Record what happened before moving forward.');$('#outcome').reportValidity();return;}const rows=transitionMode==='onto'?$$('.nextrow'):[];for(const r of rows){for(const selector of ['.next-name','.next-subname']){const input=r.querySelector(selector);if(!input.value.trim()){input.setCustomValidity(selector==='.next-name'?'Keep or change the name.':'Describe the next step.');input.reportValidity();return;}}}for(const r of rows){if(!validWhenFields(whenFields(r.querySelector('.next-when'),r.querySelector('.next-date')))){r.querySelector('.next-date').reportValidity();return;}}if(!validWhenFields(values))return;if(!canAddTiles(rows.length-Number(countsTowardFreeLimit(i)))){tileLimitNotice();return;}const before=clone(state),wasClosed=i.closed;Object.assign(i,values);if(!i.closed){i.closed=true;i.outcome=outcome;i.kind=$('#kind').value;i.completed=new Date().toISOString();}const next=rows.map(r=>stage(r.querySelector('.next-name').value.trim(),{subname:r.querySelector('.next-subname').value.trim(),status:r.querySelector('.next-status').value,category:r.querySelector('.next-category').value.trim(),details:r.querySelector('.next-details').value,...whenFields(r.querySelector('.next-when'),r.querySelector('.next-date')),parent:i.id}));state.items.push(...next);recordMoment(next.length?'onto':'done',i,next,wasClosed);const idx=state.order.indexOf(i.id);state.order.splice(idx<0?0:idx,0,...next.map(n=>n.id));persist();$('#transition').close();if(next.length){returnToNow();categoryFilter='';statusFilter='';whenFilter='';}render();message(next.length?'Onto '+next.length+' next '+(next.length===1?'stage.':'stages.'):i.kind==='fizzled'?'Fizzled out. Saved in History.':'Done. This stage is in your history.',before);};
document.addEventListener('change',e=>e.target.classList?.remove('suggested'));
document.addEventListener('input',e=>{if(e.target instanceof HTMLInputElement)e.target.setCustomValidity('');e.target.classList?.remove('suggested');});
$('#undo').onclick=()=>{if(!undoState)return;state=undoState;undoState=null;persist();render();$('#toast').hidden=true;$('#undo').disabled=true;$('#undo').classList.remove('undo-ready');};
// Export/import are owned by browser.js to avoid duplicate event handlers.
// Pointer gestures work with a mouse, pen, or one-finger hold. Attribute changes never close a stage.
function renderTray(){const phonePortrait=window.matchMedia('(pointer:coarse) and (max-width:600px) and (orientation:portrait)').matches;const sizeMode=trayMode==='size';$('#attributes').classList.toggle('size-picker',sizeMode);$('#attributes').classList.toggle('color-picker',trayMode==='color');if(trayMode==='when'){$('#attributes').innerHTML=[...whenOptions().filter(value=>!phonePortrait||!['started','pending'].includes(value.toLowerCase())).map(value=>[value,value]),['__today__','Today'],['__tomorrow__','Tomorrow'],['__pickdate__',phonePortrait?'SCHED…':'Pick date…']].map(([value,label])=>`<button data-attribute="${esc(value)}">${esc(label)}</button>`).join('');}else if(sizeMode){const sizes=[1,2,4],current=get(drag?.id),original=drag?.before?.items?.find(item=>item.id===drag.id),w=current?.size?.width||2,h=current?.size?.height||2,ow=original?.size?.width||2,oh=original?.size?.height||2;$('#attributes').style.setProperty('--selected-cols',String(sizes.indexOf(w)+1));$('#attributes').style.setProperty('--selected-rows',String(sizes.indexOf(h)+1));$('#attributes').style.setProperty('--original-cols',String(sizes.indexOf(ow)+1));$('#attributes').style.setProperty('--original-rows',String(sizes.indexOf(oh)+1));$('#attributes').innerHTML=sizes.flatMap((height,row)=>sizes.map((width,col)=>`<button data-attribute="${width}:${height}" class="${width<=w&&height<=h?'filled ':''}${width===w&&height===h?'chosen':''}" aria-label="${width} by ${height}" title="${width} by ${height}"></button>`)).join('');}else if(trayMode==='color'){const current=get(drag?.id);$('#attributes').dataset.intensity=current?.intensity||'soft';$('#attributes').innerHTML=tileColors.map(value=>`<button data-attribute="${value}" data-swatch="${value}" aria-label="${colorNames[value]}" title="${colorNames[value]}"><span class="color-swatch"></span></button>`).join('')+intensityDots(current?.color||'none',current?.intensity||'soft','tray');}else{const choices=trayMode==='status'?statusOptions():['',...categories()];$('#attributes').innerHTML=choices.map(value=>`<button data-attribute="${esc(value)}">${esc(value||'None')}</button>`).join('');}$$('[data-tray]').forEach(b=>b.classList.toggle('selected',b.dataset.tray===trayMode));$$('#tray [title]').forEach(b=>b.removeAttribute('title'));updateTrayConfirmation();}
function switchTrayMode(mode){if(!['status','category','when','size','color'].includes(mode)||(mode==='color'&&state.colorMode!=='user'))return;clearHover();trayMode=mode;renderTray();}
$$('[data-tray]').forEach(b=>b.onclick=()=>switchTrayMode(b.dataset.tray));
function clearHover(){if(drag){clearTimeout(drag.hoverTimer);clearTimeout(drag.modeTimer);drag.hoverTimer=null;drag.modeTimer=null;drag.hoverKey=null;drag.modeKey=null;}$$('#attributes .hover, [data-tray].mode-hover, #never-mind.hover, #tray-delete.hover, #tray-close.hover').forEach(b=>{b.classList.remove('hover');b.classList.remove('mode-hover');});}
function hoverTrayControl(hit){const mode=hit?.closest('[data-tray]');if(mode){if(mode.disabled){clearHover();return true;}if(drag.modeKey!==mode.dataset.tray){clearHover();drag.modeKey=mode.dataset.tray;if(trayMode!==mode.dataset.tray){mode.classList.add('mode-hover');drag.modeTimer=setTimeout(()=>{if(drag?.active&&drag.modeKey===mode.dataset.tray)switchTrayMode(mode.dataset.tray);},350);}}return true;}const deleteButton=hit?.closest('#tray-delete');if(deleteButton&&!deleteButton.hidden){clearHover();deleteButton.classList.add('hover');return true;}const closeButton=hit?.closest('#tray-close');if(closeButton){if(drag.hoverKey!=='tray-close'){clearHover();drag.hoverKey='tray-close';closeButton.classList.add('hover');drag.hoverTimer=setTimeout(()=>{if(drag?.active&&drag.hoverKey==='tray-close')closeDragTray();},1000);}return true;}const neverMind=hit?.closest('#never-mind');if(neverMind){clearHover();neverMind.classList.add('hover');return true;}return false;}
function cancelCurrentDrag(){if(drag?.active)endDrag({pointerId:drag.pointer,clientX:drag.x,clientY:drag.y},true);}
function closeDragTray(){if(!drag?.active)return;clearHover();drag.trayClosed=true;drag.trayYielded=false;$('#tray').classList.remove('tray-yielded');$('#tray').hidden=true;drag.inDrawer=false;}
$('#tray-close').onclick=e=>{e.preventDefault();};$('#never-mind').onclick=cancelCurrentDrag;$('#tray-delete').onclick=()=>{if(!drag?.active)return;deleteDragGroup();if(drag?.groupDeleted)finishDeletedDrag();};
function finishDeletedDrag(){document.querySelectorAll('#grid .flow-drop-target').forEach(t=>t.classList.remove('flow-drop-target'));const d=drag;if(!d)return;clearHover();cancelAnimationFrame(d.scrollFrame);d.ghost?.remove();d.crosshair?.remove();$('#tray').classList.remove('tray-yielded');$('#tray').hidden=true;document.body.classList.remove('dragging');drag=null;render();}
function updateTrayConfirmation(){if(!drag?.active)return;const i=get(drag.id);if(trayMode==='color'){$('#attributes').dataset.intensity=i.intensity||'soft';for(const dot of $$('#attributes .intensity-dot'))dot.dataset.swatch=i.color||'none';}$('#tray-confirmation').textContent=(i.closed?'History':i.status)+' · '+(i.category||'None')+' · '+(drag.pendingDate?'Pick date on release':whenLabel(i))+(trayMode==='size'?' · '+sizeLabel(i):trayMode==='color'?' · '+colorNames[i.color||'none']:'');$$('#attributes [data-attribute]').forEach(b=>{const selected=b.dataset.attribute===(trayMode==='color'&&b.dataset.attribute.startsWith('intensity:')?'intensity:'+(i.intensity||'soft'):trayMode==='size'?sizeKey(i):trayMode==='when'?(drag.pendingDate?'__pickdate__':i.when==='__date__'?(i.date===dateAfter()?'__today__':i.date===dateAfter(1)?'__tomorrow__':''):i.when):i[trayMode]);b.classList.toggle('applied',selected);b.setAttribute('aria-pressed',selected);});}
function enterDrawer(hit){const inside=!!hit?.closest('#tray');if(inside&&layout==='fixed')clearFixedPreview();if(inside&&!drag.inDrawer){drag.inDrawer=true;state.order=drag.before.order.slice();renderGrid();}else if(!inside)drag.inDrawer=false;return inside;}
function applyAttribute(button){
 if(!drag?.active)return;
 const i=get(drag.id),value=button.dataset.attribute;
 if(!i||i.preset)return;
 if(trayMode==='color'&&state.colorMode!=='user')return;
 if(trayMode==='status'&&!statusOptions().includes(value))return;
 const targets=(drag.groupIds?.length>1?drag.groupIds:[drag.id]).map(get).filter(item=>item&&!item.preset);
 let changed=false;
 const set=(item,key,next)=>{if(item[key]!==next){item[key]=next;changed=true;}};
 if(trayMode==='color'&&value.startsWith('intensity:')){
  const level=value.slice(10);if(!['soft','hot','hotter'].includes(level))return;
  targets.forEach(item=>set(item,'intensity',level));
  drag.ghost.dataset.intensity=level;
 }else if(trayMode==='when'){
  if(value==='__pickdate__'){drag.pendingDate=true;updateTrayConfirmation();return;}
  const fields=['__today__','__tomorrow__'].includes(value)?{when:'__date__',date:dateAfter(value==='__tomorrow__'?1:0)}:{when:value,date:''};
  if(!validWhenFields(fields))return;
  drag.pendingDate=false;
  targets.forEach(item=>{set(item,'when',fields.when);set(item,'date',fields.date);});
 }else if(trayMode==='size'){
  const [width,height]=value.split(':').map(Number);
  if(![1,2,4].includes(width)||![1,2,4].includes(height))return;
  const blocked=targets.map(item=>layout==='fixed'&&item.fixed?{item,blocker:fixedBlocker(item,item.fixed,{width,height}),outside:!validFixed(item.fixed,{width,height})}:null).find(result=>result&&(result.blocker||result.outside));
  if(blocked){
   const reason=sizePlacementReason(blocked.item,blocked.item.fixed,{width,height});
   $('#tray-confirmation').textContent=reason+' — move this tile into a clear area before resizing.';
   button.classList.add('size-blocked');
   setTimeout(()=>button.classList.remove('size-blocked'),900);
   return;
  }
  targets.forEach(item=>{if(sizeKey(item)!==value){item.size={width,height};changed=true;}});
  $('#attributes').style.setProperty('--selected-cols',String([1,2,4].indexOf(width)+1));
  $('#attributes').style.setProperty('--selected-rows',String([1,2,4].indexOf(height)+1));
  $$('#attributes [data-attribute]').forEach(cell=>{const [cw,ch]=cell.dataset.attribute.split(':').map(Number);cell.classList.toggle('filled',cw<=width&&ch<=height);cell.classList.toggle('chosen',cw===width&&ch===height);});
 }else if(trayMode==='color'){
  if(!tileColors.includes(value))return;
  targets.forEach(item=>set(item,'color',value));
 }else if(trayMode==='status'){
  targets.filter(item=>!item.closed).forEach(item=>set(item,'status',value));
 }else if(trayMode==='category'){
  targets.forEach(item=>set(item,'category',value));
 }else return;
 if(changed)drag.changed=true;
 button.classList.remove('hover');
 if(!i.closed){drag.ghost.querySelector('.tile-status').textContent=i.status;drag.ghost.dataset.status=i.status;}
 const category=drag.ghost.querySelector('.category-tag');if(category)category.textContent=i.category||'None';
 drag.ghost.dataset.color=effectiveColor(i);
 const when=drag.ghost.querySelector('.tile-when');if(when)when.textContent=whenLabel(i);
 updateTrayConfirmation();
}
function syncGhostSize(i){if(layout==='smash')return;if(!drag?.ghost?.style||!$('#grid').clientWidth)return;const sz=sizeOf(i),unit=parseFloat($('#grid').style.getPropertyValue('--cell-size'));if(!unit)return;const scale=boardScale(),width=(unit*sz.width+12*(sz.width-1))*scale,height=(unit*sz.height+12*(sz.height-1))*scale;drag.ghost.style.width=width+'px';drag.ghost.style.height=height+'px';drag.ghost.dataset.w=sz.width;drag.ghost.dataset.h=sz.height;drag.offsetX=Math.min(drag.offsetX,width);drag.offsetY=Math.min(drag.offsetY,height);positionGhost();}
function dragTarget(){if(!drag)return {x:0,y:0};const r=drag.ghost?.getBoundingClientRect();const viewport=window.visualViewport;const maxX=(viewport?.width||innerWidth)-12,maxY=(viewport?.height||innerHeight)-12;return {x:Math.max(12,Math.min(maxX,(r?.left??drag.x)+(r?.width??0)/2)),y:Math.max(12,Math.min(maxY,(r?.top??drag.y)+16))};}
function boardTarget(){return drag?{x:drag.x,y:drag.y}:{x:0,y:0};}
function dragHit(){const cross=dragTarget(),hover=document.elementFromPoint(cross.x,cross.y);if(!drag.trayYielded&&hover?.closest('#tray'))return {point:cross,hit:hover};const point=boardTarget();return {point,hit:document.elementFromPoint(point.x,point.y)};}
function groupDrag(){return !!(drag&&layout==='smash'&&drag.groupIds?.length>1);}
function deleteDragGroup(){if(!groupDrag())return;const ids=(drag.groupIds||[]).filter(id=>get(id));if(!ids.length)return;const before=drag.before;removeStages(ids);bulkSelection.clear();drag.changed=false;drag.groupDeleted=true;persist();message(ids.length+' '+(ids.length===1?'tile':'tiles')+' deleted.',before);}
function beginDrag(){if(!drag||drag.active)return;clearTimeout(drag.timer);drag.groupIds=layout==='smash'&&bulkSelection.size>1&&bulkSelection.has(drag.id)?[...bulkSelection].filter(id=>get(id)):[];drag.active=true;drag.before=clone(state);const tile=$(`[data-id="${drag.id}"]`),r=tile.getBoundingClientRect();drag.offsetX=drag.x-r.left;drag.offsetY=drag.y-r.top;drag.ghost=tile.cloneNode(true);drag.ghost.removeAttribute('data-id');drag.ghost.removeAttribute('aria-label');drag.ghost.classList.add('ghost');for(const selector of ['.tile-status','.tile-title','.tile-bottom','.category-tag','.tile-when','.tile-step']){const original=tile.querySelector(selector),copy=drag.ghost.querySelector(selector);if(original&&copy){const style=getComputedStyle(original);for(const prop of ['font-size','line-height','letter-spacing','font-weight','padding-top','padding-bottom','padding-left','padding-right'])copy.style.setProperty(prop,style.getPropertyValue(prop),'important');}}drag.ghost.style.width=r.width+'px';drag.ghost.style.height=r.height+'px';document.body.append(drag.ghost);{drag.crosshair=document.createElement('div');drag.crosshair.className='drag-crosshair';drag.crosshair.setAttribute('aria-hidden','true');drag.crosshair.textContent='+';document.body.append(drag.crosshair);}tile.classList.add('drag-source');document.body.classList.add('dragging');$('#toast').hidden=true;if(layout==='fixed'&&fitBoard){fitBoard=false;}trayMode='status';renderTray();$('#tray').hidden=!!get(drag.id)?.preset;$('#tray-title').textContent=groupDrag()?'GROUP THERAPY · '+drag.groupIds.length+' SELECTED':'';$('#tray-delete').hidden=false;$('#tray').classList.toggle('group-therapy',groupDrag());positionGhost();drag.extraRows=matrixRows();drag.scrollFrame=requestAnimationFrame(autoScroll);}
function positionGhost(){if(drag?.ghost){drag.ghost.style.left=(drag.x-drag.offsetX)+'px';drag.ghost.style.top=(drag.y-drag.offsetY)+'px';if(drag.crosshair){const point=dragTarget();drag.crosshair.style.left=point.x+'px';drag.crosshair.style.top=point.y+'px';}}}
function scrollBoard(delta,horizontal=0){$('#board-scroll').scrollBy?.(horizontal,delta);}
function autoScroll(){
 if(!drag?.active)return;
 const scroller=$('#board-scroll'),board=scroller.getBoundingClientRect(),dock=$('#bottom-dock').getBoundingClientRect();
 const tray=$('#tray'),trayRect=tray.getBoundingClientRect(),cross=dragTarget();
 // Move the hoverboard out of the way only when the tile's top-center crosshair
 // reaches its top edge. Restore it once the tile moves away.
 if(!drag.trayClosed&&!tray.hidden&&!drag.trayYielded&&cross.y<=trayRect.top+24&&cross.x>=trayRect.left&&cross.x<=trayRect.right){
  drag.trayYielded=true;tray.classList.add('tray-yielded');clearHover();
 }else if(!drag.trayClosed&&drag.trayYielded&&cross.y>trayRect.bottom+36){
  drag.trayYielded=false;tray.classList.remove('tray-yielded');
 }
 // The dock occupies only the right side on desktop. Do not treat its top
 // as the bottom edge of the entire backsplash.
 const pointerOverDockX=drag.x>=dock.left&&drag.x<=dock.right;
 const visibleBottom=pointerOverDockX?Math.min(board.bottom,dock.top):board.bottom;
 const bottom=Math.min(visibleBottom,window.innerHeight);
 const top=board.top;
 const threshold=40;
 const pointerInsideBoardX=drag.x>=board.left+8&&drag.x<=board.right-8;
 const down=pointerInsideBoardX&&drag.y>bottom-threshold&&drag.y<=bottom;
 const up=pointerInsideBoardX&&drag.y<top+threshold&&drag.y>=top;
 const delta=down?Math.min(22,Math.max(3,(drag.y-(bottom-threshold))*.35)):up?-Math.min(22,Math.max(3,((top+threshold)-drag.y)*.35)):0;
 const horizontal=layout==='fixed'&&drag.y<bottom?(drag.x<board.left+35?-10:drag.x>board.right-35?10:0):0;
 if(delta>0&&layout==='fixed'&&scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-40&&(!drag.lastExtendAt||performance.now()-drag.lastExtendAt>450)){
  drag.lastExtendAt=performance.now();
  // Extend the fixed matrix while dragging so new space can actually be reached.
  drag.extraRows=Math.max(drag.extraRows||0,matrixRows())+2;
  measureGrid();
 }
 if(delta||horizontal){scrollBoard(delta,horizontal);if(layout==='fixed'&&!drag.inDrawer)previewFixed(drag.x,drag.y);}
 drag.scrollFrame=requestAnimationFrame(autoScroll);
}
// Native click opens a tile only after an unmoved tap finishes.
// Opening on pointerup lets WebKit's following click land inside the new dialog.
let pendingTileClick=null;
$('#grid').addEventListener('pointerdown',e=>{pendingTileClick=null;if(drag||e.button!==0||e.target.closest('[data-select], [data-preset-edit]'))return;const tile=e.target.closest('.tile');if(!tile)return;drag={id:tile.dataset.id,pointer:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,lastY:e.clientY,lastX:e.clientX,active:false,moved:false,changed:false};drag.timer=setTimeout(beginDrag,320);});
document.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;const distance=Math.hypot(drag.x-drag.startX,drag.y-drag.startY);if(!drag.active){if(distance>8){if(drag.type==='mouse')beginDrag();else{clearTimeout(drag.timer);drag.moved=true;scrollBoard(drag.lastY-drag.y,layout==='fixed'?drag.lastX-drag.x:0);}}drag.lastY=drag.y;drag.lastX=drag.x;return;}e.preventDefault();positionGhost();const {point,hit}=dragHit();if(drag.trayClosed){if(layout==='fixed')previewFixed(drag.x,drag.y);return;}const inDrawer=enterDrawer(hit);if(hoverTrayControl(hit))return;const attr=hit?.closest('[data-attribute]');if(attr){const key=trayMode+':'+attr.dataset.attribute;if(drag.hoverKey!==key){clearHover();drag.hoverKey=key;attr.classList.add('hover');if(trayMode==='size'){drag.pendingSize=attr.dataset.attribute;drag.hoverTimer=setTimeout(()=>{if(drag?.active&&drag.hoverKey===key){applyAttribute(attr);}},1000);}else{drag.pendingSize=null;drag.hoverTimer=setTimeout(()=>applyAttribute(attr),650);}}return;}clearHover();drag.pendingSize=null;if(inDrawer||groupDrag())return;if(layout==='fixed'){previewFixed(drag.x,drag.y);return;}const target=hit?.closest('.tile');document.querySelectorAll('#grid .flow-drop-target').forEach(t=>{if(t!==target)t.classList.remove('flow-drop-target');});if(!target||target.dataset.id===drag.id)return;target.classList.add('flow-drop-target');const r=target.getBoundingClientRect();const after=layout==='smash'?point.y>r.top+r.height/2:point.y>r.top+r.height*.7||(point.y>=r.top+r.height*.3&&point.x>r.left+r.width/2);const old=state.order.indexOf(drag.id);state.order.splice(old,1);const idx=state.order.indexOf(target.dataset.id);state.order.splice(idx+(after?1:0),0,drag.id);if(state.order.indexOf(drag.id)!==old){drag.changed=true;renderGrid();}}, {passive:false});
function endDrag(e,cancel=false){document.querySelectorAll('#grid .flow-drop-target').forEach(t=>t.classList.remove('flow-drop-target'));if(!drag||e.pointerId!==drag.pointer)return;clearTimeout(drag.timer);const d=drag;pendingTileClick=null;if(d.active){const {point,hit}=dragHit();if(hit?.closest('#tray-close')){ /* CLOSE is a dwell target, not a cancel/drop target. */ }if(hit?.closest('#tray-delete')){if(groupDrag()){deleteDragGroup();}else{removeStages([d.id]);d.groupDeleted=true;persist();message('Tile deleted.',d.before);}if(d.groupDeleted){finishDeletedDrag();return;}cancel=true;}cancel=cancel||!!hit?.closest('#never-mind');const attr=d.trayClosed?null:hit?.closest('[data-attribute]'),inDrawer=!d.trayClosed&&!!hit?.closest('#tray');if(!cancel){if(attr)applyAttribute(attr);if(inDrawer||attr)state.order=d.before.order.slice();else if(layout==='fixed'){const candidate=fixedCandidateAt(d.x,d.y);d.fixedRejected=!!candidate&&!candidate.valid;if(candidate?.valid){const i=get(d.id);if(i.fixed.col!==candidate.col||i.fixed.row!==candidate.row){placeFixed(i,candidate);d.changed=true;}}}}clearFixedPreview();clearHover();cancelAnimationFrame(d.scrollFrame);d.ghost.remove();d.crosshair?.remove();$('#tray').classList.remove('tray-yielded');$('#tray').hidden=true;document.body.classList.remove('dragging');drag=null;if(cancel){state=d.before;render();message('Never mind. Tile restored.');}else{persist();render();if(d.changed)message(inDrawer||attr?'Choices saved. Tile returned to its original position.':'Position and attributes saved.',d.before);if(d.fixedRejected)message('Occupied space. Tile kept its original position.',d.changed?d.before:null);if(d.pendingDate)startDateEdit(d.id,d.before);}}else{drag=null;if(!cancel&&!d.moved)pendingTileClick=d.id;}}
document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)endDrag({pointerId:drag.pointer,clientX:drag.x,clientY:drag.y},true);});
$('#attributes').addEventListener('click',e=>{const button=e.target.closest('[data-attribute]');if(button)applyAttribute(button);});
$('#grid').addEventListener('click',e=>{
 const edit=e.target.closest('[data-preset-edit]');
 if(edit){pendingTileClick=null;e.preventDefault();e.stopPropagation();const i=get(edit.dataset.presetEdit);if(i?.preset)openEditor(i.id);return;}
 if(e.target.closest('[data-select]')){pendingTileClick=null;return;}
 const tile=e.target.closest('.tile');if(!tile)return;
 const id=tile.dataset.id,activate=e.detail===0||pendingTileClick===id;
 pendingTileClick=null;if(!activate)return;
 const i=get(id);if(!i)return;
 if(i.preset)recallPreset(i);else openEditor(id);
});$('#grid').addEventListener('contextmenu',e=>{const tile=e.target.closest('.tile');if(tile){e.preventDefault();const i=get(tile.dataset.id);if(i?.preset)openEditor(i.id);}});
// The same capture and read actions are available in browsers supporting WebMCP.
if(document.modelContext?.registerTool){for(const tool of [{name:'list_onto_stages',description:'Read all ONTO stages and their visual order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>clone(state)},{name:'capture_onto_stage',description:'Capture a new ONTO stage at the top of the board.',inputSchema:{type:'object',properties:{title:{type:'string',minLength:1,maxLength:240}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input||typeof input.title!=='string'||!input.title.trim()||input.title.length>240||Object.keys(input).some(k=>k!=='title'))throw Error('Provide a title between 1 and 240 characters.');if(!canAddTiles())throw Error('Free ONTO allows 6 unfinished tasks.');const i=stage(input.title.trim());state.items.push(i);state.order.unshift(i.id);returnToNow();categoryFilter='';statusFilter='';whenFilter='';persist();render();return {id:i.id,title:i.title};}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch(e){}}}
setInterval(()=>{if(!drag&&!$$('dialog').some(d=>d.open))renderGrid();},60000);
// Momentum records deliberate outcomes, never board rearrangements or sample loading.
function validateMoments(value,stageIds){if(value===undefined)return [];if(!Array.isArray(value)||value.length>50000)throw Error('Invalid momentum history.');const ids=new Set();for(const m of value){if(m?.voided!==undefined&&typeof m.voided!=='boolean'||m?.closureAt!==undefined&&!(m.closureAt===null||typeof m.closureAt==='string'&&Number.isFinite(Date.parse(m.closureAt))))throw Error('Invalid moment closure.');if(!m||typeof m.id!=='string'||ids.has(m.id)||!['onto','done','win'].includes(m.type)||typeof m.text!=='string'||!m.text.trim()||m.text.length>1000||typeof m.title!=='string'||m.title.length>240||typeof m.at!=='string'||!Number.isFinite(Date.parse(m.at))||!(m.stageId===null||stageIds.has(m.stageId))||!Array.isArray(m.nextIds)||m.nextIds.some(id=>!stageIds.has(id)))throw Error('Invalid momentum moment.');ids.add(m.id);}return value.map(m=>({...m,nextIds:m.nextIds.slice()}));}
function localDay(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
let momentumDay=localDay(),momentumToday=true,momentumSelection=null,momentumOpen=false;
function dailyMoments(day=momentumDay){return (state.moments||[]).filter(m=>!m.voided&&localDay(new Date(m.at))===day).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));}
function recordMoment(type,i,next=[],wasClosed=false){if(type==='done'&&i.kind==='fizzled')return;const text=wasClosed?'Next: '+next.slice(0,3).map(n=>n.subname||n.title).join(' · ')+(next.length>3?' · +'+(next.length-3)+' more':''):i.outcome;state.moments.push({id:uuid(),type,text,title:i.title,at:new Date().toISOString(),closureAt:i.completed,stageId:i.id,nextIds:next.map(n=>n.id)});momentumToday=true;momentumDay=localDay();momentumSelection=state.moments.at(-1).id;}
function momentLabel(m){return m.type==='onto'?'ONTO progression':m.type==='done'?'Done':'Small win';}
function renderMomentum(){$('#momentum').dataset.open=String(momentumOpen);if(momentumToday)momentumDay=localDay();const all=dailyMoments(),moments=all.slice(-80),today=momentumDay===localDay();$('#momentum-day').textContent=today?'Today':new Date(momentumDay+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});$('#momentum-forward').disabled=today;$('#momentum-total').textContent=all.length;$('#momentum-tally').innerHTML=[['onto','Progressions'],['done','Dones'],['win','Small wins']].map(([type,label])=>`<span data-momentum-kind="${type}"><b>${all.filter(m=>m.type===type).length}</b> ${label}</span>`).join('');$('#momentum-body').hidden=!momentumOpen;$('#momentum-toggle').textContent=momentumOpen?'−':'+';$('#momentum-toggle').setAttribute('aria-expanded',momentumOpen);$('#momentum-toggle').setAttribute('aria-label',momentumOpen?'Collapse Momentum':'Expand Momentum');if(!moments.some(m=>m.id===momentumSelection))momentumSelection=moments.at(-1)?.id||null;const compact=window.innerWidth<=540,columns=compact?4:7,width=compact?360:640,height=Math.max(168,Math.ceil(moments.length/columns)*70+45),points=moments.map((m,index)=>{const row=Math.floor(index/columns),col=index%columns;return {m,x:40+(row%2?columns-1-col:col)*(width-80)/(columns-1),y:48+row*70};});let paths='';for(let idx=1;idx<points.length;idx++){const a=points[idx-1],b=points[idx];paths+=`<path class="moment-trail" d="M${a.x},${a.y} L${b.x},${b.y}"/>`;}for(let idx=0;idx<points.length;idx++){const b=points[idx];if(!b.m.stageId)continue;const ancestors=new Set([b.m.stageId]);let stage=get(b.m.stageId);while(stage?.parent){ancestors.add(stage.parent);stage=get(stage.parent);}const a=points.slice(0,idx).reverse().find(p=>p.m.stageId&&ancestors.has(p.m.stageId));if(a)paths+=`<path class="moment-link" d="M${a.x},${a.y} Q${a.x},${b.y} ${b.x},${b.y}"/>`;}
const nodes=points.map(({m,x,y})=>`<g class="moment-node ${m.type}${m.id===momentumSelection?' selected':''}${Date.now()-Date.parse(m.at)<4000?' fresh':''}" transform="translate(${x} ${y})" role="button" tabindex="0" data-moment="${esc(m.id)}" aria-label="${esc(momentLabel(m)+': '+m.text)}" aria-pressed="${m.id===momentumSelection}"><title>${esc(momentLabel(m)+': '+m.text)}</title><circle class="moment-hit" r="23"/><circle class="moment-halo" r="18"/><circle class="moment-ring" r="12"/>${m.type==='win'?'<path class="moment-core" d="M0,-7 L7,0 L0,7 L-7,0 Z"/>':'<circle class="moment-core" r="5"/>'}<text y="34" text-anchor="middle">${new Date(m.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</text></g>`).join('');$('#momentum-graph').innerHTML=`<svg viewBox="0 0 ${width} ${height}" aria-label="${all.length} recorded moments; glowing paths connect stages in the same chain"><defs><pattern id="moment-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#839bbf" opacity=".2"/></pattern></defs><rect width="100%" height="100%" fill="url(#moment-dots)"/>${paths}${nodes}</svg>`;$('#momentum-empty').hidden=!!moments.length;$('#momentum-graph').hidden=!moments.length;$('#momentum-caption').textContent=all.length>80?'Showing the latest 80 moments. All '+all.length+' count toward this day.':moments.length?'Tap a point. Faint trail = day order · Glow = shared lineage.':'Record an outcome or add a small win. Your constellation grows from there.';renderMomentDetail();}
function renderMomentDetail(){const m=(state.moments||[]).find(n=>n.id===momentumSelection);$('#momentum-detail').hidden=!m;if(!m)return;$('#momentum-detail').innerHTML=`<span class="eyebrow">${momentLabel(m)} · ${new Date(m.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span>${m.title?`<strong>${esc(m.title)}</strong>`:''}<p>${esc(m.text)}</p>${m.stageId?`<button type="button" id="moment-open-stage">Open stage →</button>`:''}`;if(m.stageId)$('#moment-open-stage').onclick=()=>openEditor(m.stageId);}
function chooseMoment(id){if(!dailyMoments().some(m=>m.id===id))return;momentumSelection=id;renderMomentum();}
$('#momentum-graph').addEventListener('click',e=>{const node=e.target.closest('[data-moment]');if(node)chooseMoment(node.dataset.moment);});
$('#momentum-graph').addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const node=e.target.closest('[data-moment]');if(node){e.preventDefault();chooseMoment(node.dataset.moment);$(`[data-moment="${node.dataset.moment}"]`)?.focus();}});
function shiftMomentumDay(offset){const date=new Date(momentumDay+'T12:00:00');date.setDate(date.getDate()+offset);const day=localDay(date);if(day>localDay())return;momentumDay=day;momentumToday=day===localDay();momentumSelection=null;renderMomentum();}
$('#momentum-back').onclick=()=>shiftMomentumDay(-1);$('#momentum-forward').onclick=()=>shiftMomentumDay(1);$('#momentum-day').onclick=()=>{momentumToday=true;renderMomentum();};$('#momentum-toggle').onclick=()=>{momentumOpen=!momentumOpen;renderMomentum();};
// The former WIN button was replaced by DONE! in the entry bar.
// Do not bind a handler to the removed #add-win element.
$('#winform').onsubmit=e=>{e.preventDefault();const text=$('#win-text').value.trim();if(!text){$('#win-text').setCustomValidity('Give your small win a few words.');$('#win-text').reportValidity();return;}const before=clone(state),m={id:uuid(),type:'win',text,title:'',at:new Date().toISOString(),stageId:null,nextIds:[]};state.moments.push(m);momentumToday=true;momentumDay=localDay();momentumSelection=m.id;persist();$('#win').close();render();message('A small win. Count it.',before);};
setInterval(()=>{if(!drag&&!$$('dialog').some(d=>d.open))renderMomentum();},60000);
let manageDraft=null,manageMode='category';
function makeAttributeDraft(){const a=state.attributes;return {statuses:a.statuses.map(name=>({id:uuid(),name,originals:[name]})),categories:a.categories.map(name=>({id:uuid(),name,originals:[name],color:a.categoryColors[name]??null})),whens:a.whens.map(name=>({id:uuid(),name,originals:[name],future:a.futureWhens.includes(name)})),defaultId:null,defaultWhenId:null,uncategorized:[]};}
function openManage(mode){cancelCurrentDrag();manageMode=mode;manageDraft=makeAttributeDraft();manageDraft.defaultId=manageDraft.statuses.find(r=>r.name===state.attributes.defaultStatus).id;manageDraft.defaultWhenId=manageDraft.whens.find(r=>r.name===state.attributes.defaultWhen).id;$('#manage-error').textContent='';renderManage();$('#manage').showModal();}
function manageRows(){return manageDraft[manageMode==='status'?'statuses':manageMode==='when'?'whens':'categories'];}
function collectManage(){for(const input of $$('#manage-list [data-name]')){const row=manageRows().find(r=>r.id===input.dataset.name);if(row)row.name=input.value.trim();}for(const input of $$('#manage-list [data-color-choice]')){const row=manageRows().find(r=>r.id===input.dataset.colorChoice);if(row)row.color=input.value==='auto'?null:input.value;}for(const input of $$('#manage-list [data-future-choice]')){const row=manageRows().find(r=>r.id===input.dataset.futureChoice);if(row)row.future=input.checked;}}
function draftError(){if(manageDraft.statuses.some(r=>['Accomplished','Changed direction','Stopped'].some(n=>n.toLowerCase()===r.name.toLowerCase())))return 'History outcomes are reserved. Choose a status for work in progress.';for(const list of [manageDraft.statuses,manageDraft.categories,manageDraft.whens]){if(list.some(r=>!validAttributeName(r.name)))return 'Use names of 1–60 characters.';if(new Set(list.map(r=>r.name.toLowerCase())).size!==list.length)return 'Each name must be unique within its attribute.';}return '';}
function renderManage(){const list=manageRows(),isStatus=manageMode==='status',isWhen=manageMode==='when',hasDefault=isStatus||isWhen;for(const mode of ['category','status','when'])$('#manage-'+mode).classList.toggle('selected',mode===manageMode);$('#manage-help').textContent=isWhen?'When describes your intention, independently of status. Future hides marked choices and dates after today. New stages use the default. Calendar dates stay separate from these custom choices.':isStatus?'These describe work in progress. Done and ONTO record an outcome separately.':'Categories describe this stage. Colors apply when Color is set to By category.';$('#manage-list').innerHTML=list.map((r,idx)=>`<div class="attribute-row${isWhen?' when-attribute-row':''}" data-row="${r.id}"><label class="attribute-name">Name<input data-name="${r.id}" value="${esc(r.name)}" maxlength="60" required aria-label="${isWhen?'When':isStatus?'Status':'Category'} name"></label>${hasDefault?`<label class="default-choice"><input type="radio" name="default-${manageMode}" ${isWhen?'data-default-when':'data-default'}="${r.id}" ${r.id===(isWhen?manageDraft.defaultWhenId:manageDraft.defaultId)?'checked':''}> Default</label>`:`<label>Color<select data-color-choice="${r.id}"><option value="auto">Automatic</option>${tileColors.map(c=>`<option value="${c}" ${r.color===c?'selected':''}>${colorNames[c]}</option>`).join('')}</select></label>`}${isWhen?`<label class="default-choice future-choice"><input type="checkbox" data-future-choice="${r.id}" ${r.future?'checked':''}> Include in Future</label>`:''}<div class="attribute-order"><button type="button" data-move="${r.id}" data-direction="-1" ${idx===0?'disabled':''} aria-label="Move ${esc(r.name)} up">↑</button><button type="button" data-move="${r.id}" data-direction="1" ${idx===list.length-1?'disabled':''} aria-label="Move ${esc(r.name)} down">↓</button></div><details class="attribute-remove"><summary>Remove</summary><label>Move existing items to<select data-replacement="${r.id}">${hasDefault?'':'<option value="">None</option>'}${list.filter(n=>n.id!==r.id).map(n=>`<option value="${n.id}">${esc(n.name)}</option>`).join('')}</select></label><button type="button" data-remove="${r.id}" ${hasDefault&&list.length===1?'disabled':''}>Remove ${esc(r.name)}</button>${hasDefault&&list.length===1?'<small>Keep at least one choice.</small>':''}</details></div>`).join('');}
function removeDraftAttribute(id,replacementId){const list=manageRows(),row=list.find(r=>r.id===id),target=list.find(r=>r.id===replacementId);if(!row||target===row||(manageMode!=='category'&&!target))return;if(target)target.originals.push(...row.originals);else manageDraft.uncategorized.push(...row.originals);if(manageDraft.defaultId===id)manageDraft.defaultId=target.id;if(manageDraft.defaultWhenId===id)manageDraft.defaultWhenId=target.id;list.splice(list.indexOf(row),1);}
function finalizeAttributeSettings(draft){const next=clone(state),statusMap=new Map(),categoryMap=new Map(),whenMap=new Map();for(const r of draft.statuses)for(const n of r.originals)statusMap.set(n,r.name);for(const r of draft.categories)for(const n of r.originals)categoryMap.set(n,r.name);for(const r of draft.whens)for(const n of r.originals)whenMap.set(n,r.name);for(const n of draft.uncategorized)categoryMap.set(n,'');next.attributes={statuses:draft.statuses.map(r=>r.name),categories:draft.categories.map(r=>r.name),whens:draft.whens.map(r=>r.name),defaultWhen:draft.whens.find(r=>r.id===(draft.defaultWhenId||draft.whens.find(n=>n.name===state.attributes.defaultWhen)?.id)).name,futureWhens:draft.whens.filter(r=>r.future).map(r=>r.name),defaultStatus:draft.statuses.find(r=>r.id===draft.defaultId).name,categoryColors:Object.fromEntries(draft.categories.filter(r=>r.color!==null).map(r=>[r.name,r.color]))};for(const i of next.items){i.status=statusMap.get(i.status)||i.status;if(categoryMap.has(i.category))i.category=categoryMap.get(i.category);if(i.when!=='__date__')i.when=whenMap.get(i.when)||i.when;}return validate(next);}
function switchManage(mode){collectManage();manageMode=mode;renderManage();}
$('#manage-category').onclick=()=>switchManage('category');$('#manage-status').onclick=()=>switchManage('status');$('#manage-when').onclick=()=>switchManage('when');
$('#manage-add').onclick=()=>{collectManage();const list=manageRows(),base=manageMode==='status'?'New status':manageMode==='when'?'New intention':'New category';let name=base,n=2;while(list.some(r=>r.name.toLowerCase()===name.toLowerCase()))name=base+' '+n++;const row={id:uuid(),name,originals:[],color:null,future:false};list.push(row);renderManage();const input=$(`[data-name="${row.id}"]`);input.focus();input.select();};
$('#manage-list').addEventListener('change',e=>{if(e.target.dataset.default)manageDraft.defaultId=e.target.dataset.default;if(e.target.dataset.defaultWhen)manageDraft.defaultWhenId=e.target.dataset.defaultWhen;if(e.target.dataset.futureChoice){const row=manageDraft.whens.find(r=>r.id===e.target.dataset.futureChoice);if(row)row.future=e.target.checked;}});
$('#manage-list').addEventListener('click',e=>{const move=e.target.closest('[data-move]'),remove=e.target.closest('[data-remove]');if(!move&&!remove)return;collectManage();if(move){const list=manageRows(),index=list.findIndex(r=>r.id===move.dataset.move),target=index+Number(move.dataset.direction);if(target>=0&&target<list.length)[list[index],list[target]]=[list[target],list[index]];}else removeDraftAttribute(remove.dataset.remove,$(`[data-replacement="${remove.dataset.remove}"]`).value);renderManage();});
$('#manageform').onsubmit=e=>{e.preventDefault();collectManage();const error=draftError();if(error){$('#manage-error').textContent=error;return;}try{const next=finalizeAttributeSettings(manageDraft),before=clone(state);state=next;categoryFilter='';statusFilter='';whenFilter='';persist();render();$('#manage').close();message('Attributes updated.',before);}catch(error){$('#manage-error').textContent=error.message;}};
function pruneBulkSelection(items){const ids=new Set(items.map(i=>i.id));for(const id of bulkSelection)if(layout!=='smash'||!ids.has(id))bulkSelection.delete(id);}
function renderGroupStrip(){/* Selection is shown by checked boxes and the GROUP THERAPY hoverboard. */}
$('#grid').addEventListener('change',e=>{if(!e.target.matches?.('[data-select]'))return;const id=e.target.dataset.select;if(e.target.checked)bulkSelection.add(id);else bulkSelection.delete(id);renderGrid();$(`[data-select="${id}"]`)?.focus();});
normalize();render();measureGrid();requestAnimationFrame(()=>{const b=$('#board-scroll');if(b&&!fitBoard){b.scrollTop=0;b.scrollLeft=0;}});if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>requestAnimationFrame(measureGrid)).observe($('#board-scroll'));}if(loadError)message('Could not read saved data. Import an export to recover it.');

function measureDock(){const dock=$('#bottom-dock');if(!dock.getBoundingClientRect||!document.documentElement?.style)return;document.documentElement.style.setProperty('--dock-height',dock.getBoundingClientRect().height+'px');if(fitBoard)measureGrid();}
measureDock();if(typeof ResizeObserver!=='undefined')new ResizeObserver(measureDock).observe($('#bottom-dock'));
if(typeof ResizeObserver!=='undefined'){const boardInsets=new ResizeObserver(()=>requestAnimationFrame(measureGrid));boardInsets.observe($('#capture'));boardInsets.observe($('#momentum-slot'));}

window.addEventListener?.('resize',measureGrid);

// The board is the only scrolling surface. Never use visualViewport.height to size
// body/main: iOS can change that reading during tile insertion or UI animations.
// Re-measure the grid only when the actual layout viewport changes.
let ontoViewportFrame=0;
let ontoLastLayoutWidth=0;
function refreshIOSViewport(force=false){
  cancelAnimationFrame(ontoViewportFrame);
  ontoViewportFrame=requestAnimationFrame(()=>{
    const width=document.documentElement.clientWidth;
    if(force || width!==ontoLastLayoutWidth){
      ontoLastLayoutWidth=width;
      measureGrid();
      measureDock();
    }
  });
}
window.addEventListener('resize',()=>refreshIOSViewport(true));
window.addEventListener('orientationchange',()=>refreshIOSViewport(true));
window.addEventListener('pageshow',()=>refreshIOSViewport(true));
refreshIOSViewport(true);

// Page restoration re-measures the board; the saved tiles are not redrawn.
window.addEventListener('pageshow',()=>requestAnimationFrame(measureGrid));

window.addEventListener("resize",()=>{if(!drag)requestAnimationFrame(fitTileTitles);});
