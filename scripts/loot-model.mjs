import {visibleRemains} from '../actor-facts.js';
import {createSpeech,visibleSpeech} from '../presentation.js';
import {enabled} from '../rules.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const carried=h=>[...h.bag.map(i=>[i.id,{item:i,place:'bag'}]),...Object.entries(h.equipment).filter(([,i])=>i).map(([slot,i])=>[i.id,{item:i,place:'equipped:'+slot}])];
const owned=h=>new Map(carried(h));
const tally=(m,k,n=1)=>{m[k]=(m[k]||0)+n;};
const receipt=e=>e.text.startsWith('Находка: ')||e.text.startsWith('Находка отправляется в сумку: ');
function source(entries,kills){
 if(kills)return 'enemy-victory';
 if(entries.some(e=>e.type==='treasure'&&/^Зал \d+ очищен/.test(e.text)))return 'dungeon-floor';
 if(entries.some(e=>e.text==='Найден осколок древнего света.'))return 'relic';
 if(entries.some(e=>e.type==='heritage'))return 'existing-heritage';
 if(entries.some(e=>e.text.includes('Печать раскрыта, ловушка обезврежена')))return 'sealed-chest';
 if(entries.some(e=>e.text.includes('раскапывает могилу ради находки')))return 'grave-dig';
 if(entries.some(e=>e.text.includes('Разобрал сердце корабля')))return 'expedition';
 return 'unresolved-source';
}
function npcDefeats(s){return new Set(Object.values(s.areas).flatMap(a=>a.objects.filter(o=>o.kind==='enemy'&&!o.alive&&o.defeatedBy).map(o=>o.id)));}
export class LootRecorder{
 constructor(s){
  this.person=s.hero.lineage;this.start=s.tick;this.generation=s.generation;this.initial={name:s.hero.name,race:s.hero.race,profession:s.hero.profession,habits:[...s.hero.habits],nextItem:s.hero.nextItem};
  this.items=new Map();this.receipts=[];this.victories=[];this.counters={};this.sourceCounts={};this.overflows=[];this.unresolved=[];this.duplicates=[];this.initialNpcDefeats=npcDefeats(s);this.speech=createSpeech();visibleSpeech(this.speech,s);
  for(const [id,v]of owned(s.hero))this.items.set(id,{id,initial:true,original:copy(v.item),transitions:[{tick:s.tick,place:v.place}]});
 }
 before(s){
  const h=s.hero,a=s.areas[h.area];return {tick:s.tick,head:s.journal[0],nextItem:h.nextItem,kills:h.kills,gold:h.gold,area:h.area,combat:h.combat,owned:owned(h),enemies:a.objects.filter(o=>o.kind==='enemy'&&o.alive).map(o=>o.id),objects:new Set(a.objects.map(o=>o.id)),heirlooms:a.objects.flatMap(o=>(o.items||[]).map(item=>({item,place:'heirloom:'+o.id})))};
 }
 after(s,b){
  const h=s.hero,now=owned(h),index=b.head?s.journal.indexOf(b.head):-1,entries=(index>=0?s.journal.slice(0,index):s.journal.filter(e=>e.tick===s.tick)).slice().reverse().filter(e=>!e.actor||e.actor===this.person),received=entries.filter(receipt),kills=h.kills-b.kills;
  const generated=Array.from({length:h.nextItem-b.nextItem},(_,i)=>`item-${this.generation}-${b.nextItem+i}`),gained=[...now.keys()].filter(id=>!b.owned.has(id)&&!generated.includes(id));
  if(carried(h).length!==now.size)this.duplicates.push({tick:s.tick,ids:carried(h).map(([id])=>id)});
  const accessible=new Map([...b.heirlooms.map(v=>[v.item.id,v.item]),...now.entries()].map(([id,v])=>[id,v.item||v]));
  for(const id of generated){
   const item=accessible.get(id)||s.itemArchive?.[id];this.items.set(id,{id,initial:false,generatedAt:s.tick,original:item?copy(item):null,transitions:[]});
  }
  for(const id of gained)if(!this.items.has(id))this.items.set(id,{id,initial:false,original:copy(now.get(id).item),transitions:[]});
  const kind=source(entries,kills),visible=visibleSpeech(this.speech,s);
  for(const e of received){
   const candidates=[...new Set([...generated,...gained])].filter(id=>{const name=this.items.get(id)?.original?.name;return name&&e.text.includes(name);});
   const id=candidates.length===1?candidates[0]:generated.length===1&&received.length===1&&!gained.length?generated[0]:null;
   const event={tick:s.tick,area:h.area,source:kind,id,text:e.text,immediateSpeech:visible===e.text,placement:e.type==='equipment'?'equipped':'bag'};
   this.receipts.push(event);tally(this.sourceCounts,kind);if(id){const item=this.items.get(id);(item.receipts||=[]).push(event);if(!item.original)item.receiptText=e.text;}else this.unresolved.push(event);
  }
  tally(this.counters,'generated',generated.length);tally(this.counters,'receipts',received.length);tally(this.counters,'existingReceipts',Math.max(0,received.length-generated.length));
  if(kills){
   const a=s.areas[b.area],candidates=a.objects.filter(o=>b.enemies.includes(o.id)&&!o.alive&&!o.defeatedBy),enemy=candidates.length===1?candidates[0]:a.objects.find(o=>o.id===b.combat&&!o.alive&&!o.defeatedBy);
   const rendered=Boolean(enemy&&enabled(s,'creature-motion')&&visibleRemains(s,enemy));
   this.victories.push({tick:s.tick,area:b.area,kills,enemy:enemy?.id||null,name:enemy?.name||null,shape:enemy?.shape||null,deadObject:Boolean(enemy),renderedRemains:rendered,pickableItemOnBody:false,receipts:received.length,generated:generated.length,sourceNote:'Current defeatEnemy awards directly; dead enemies have no item inventory/pickup action.'});
  }
  if(entries.some(e=>e.text.startsWith('В забытом кошеле ')))tally(this.counters,'purses');
  if(entries.some(e=>e.text==='Найден осколок древнего света.'))tally(this.counters,'relics');
  const a=s.areas[h.area],overflow=entries.some(e=>e.text.startsWith('Сумка переполнена.'))?a.objects.filter(o=>o.id.startsWith('discard-')&&(b.area===h.area?!b.objects.has(o.id):[...generated,...gained].some(id=>o.id==='discard-'+id))):[];
  for(const o of overflow)this.overflows.push({tick:s.tick,object:o.id,gold:o.gold,hasOriginalItems:Boolean(o.items?.length)});
  for(const [id,row]of this.items){
   let place=now.get(id)?.place;
   if(!place&&s.itemArchive?.[id]?.history?.some(e=>e.tick===s.tick&&e.text.startsWith('Продано торговцу'))){place='sold';row.soldAt??=s.tick;row.saleOriginal=copy(s.itemArchive[id]);}
   if(!place&&!h.alive&&a.objects.some(o=>o.kind==='heirloom'&&o.items?.some(i=>i.id===id)))place='death-cache';
   if(!place&&overflow.length&&(b.owned.has(id)||generated.includes(id)))place='abandoned-as-gold';
   if(place&&row.transitions.at(-1)?.place!==place)row.transitions.push({tick:s.tick,place});
  }
 }
 finish(s){
  const h=s.hero,now=owned(h),physical=new Map();
  const add=(item,place)=>{if(!physical.has(item.id))physical.set(item.id,[]);physical.get(item.id).push(place);};
  for(const [id,v]of carried(h))add(v.item,v.place);
  for(const item of s.merchant.items||[])add(item,'merchant');
  for(const a of Object.values(s.areas))for(const o of a.objects)for(const item of o.items||[])add(item,`${o.kind}:${o.id}`);
  for(const other of Object.values(s.actorStates||{}))if(other!==h)for(const [,v]of carried(other))add(v.item,'other-actor:'+other.lineage);
  const retained=e=>list=>list.some(v=>v.tick===e.tick&&v.text===e.text);
  const receipts=this.receipts.map(e=>({...e,inEndJournal:retained(e)(s.journal),inEndTimeline:retained(e)(h.timeline),inEndBiography:retained(e)(h.biography)}));
  const items=[...this.items.values()].map(row=>({...row,physicalPlaces:physical.get(row.id)||[],archivedOriginal:Boolean(s.itemArchive?.[row.id]),lifeArchiveOriginal:s.lives.some(l=>l.items?.some(i=>i.id===row.id))}));
  return {person:this.person,initial:this.initial,start:this.start,end:s.tick,windowSteps:s.tick-this.start,alive:h.alive,counters:this.counters,sourceCounts:this.sourceCounts,receipts,items,victories:this.victories,overflows:this.overflows,unresolved:this.unresolved,duplicates:this.duplicates,npcDefeats:[...npcDefeats(s)].filter(id=>!this.initialNpcDefeats.has(id)),summary:{receipts:receipts.length,generated:this.counters.generated||0,existingReceipts:this.counters.existingReceipts||0,immediateSpeech:receipts.filter(e=>e.immediateSpeech).length,endJournal:receipts.filter(e=>e.inEndJournal).length,endTimeline:receipts.filter(e=>e.inEndTimeline).length,heroVictories:this.victories.reduce((n,v)=>n+v.kills,0),victoriesWithItem:this.victories.filter(v=>v.receipts>0).length,renderedRemains:this.victories.filter(v=>v.renderedRemains).length,deadObjects:this.victories.filter(v=>v.deadObject).length,sold:items.filter(i=>i.soldAt!==undefined).length,abandoned:items.filter(i=>i.transitions.some(t=>t.place==='abandoned-as-gold')).length,initialItems:items.filter(i=>i.initial).length,unresolvedReceipts:this.unresolved.length,duplicateCarriedStates:this.duplicates.length},notes:['Successful receiveItem logs are counted; a disabled no-op hook is not an awarded item.','Generated IDs follow the observed nextItem counter and the sole makeItem caller; no RNG is drawn by this observer.','Immediate speech is the existing presentation model rendered after each tick, not proof the player read it or that offline playback renders intermediate ticks.','Historical itemArchive/lifeArchive entries are not second physical items.','A dead canonical enemy, a visible corpse pose and a separate pickup interaction are different observations.']};
 }
}
