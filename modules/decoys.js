import {decoysOn,decoyItems,heldDecoy} from './decoy-state.js';
import {stealthBody,activeGuard,guardSense,seesGuard} from './stealth-state.js';
import {noticeGuard} from './stealth.js';
import {physicalDistance} from '../geometry.js';
import {forgingEnabled} from './forging.js';
import {workshopSite,workshopPosition,ownedWorkshopSite} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {tradeGoods,quoteMarket,marketWallet} from './market.js';
import {fitsPack} from './container-state.js';
import {itemLocation,actorItemLocation} from './item-originals.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
const held=(s,p)=>{const h=s.hero?.lineage===p.id?s.hero:s.actorStates?.[p.id];return h?.bag||(p.looseItems ||= []);};
const ready=(s,p)=>{const b=p&&stealthBody(s,p.id);return decoysOn(s)&&p?.alive&&b&&(b.lineage||['resident','wandering'].includes(p.status))&&(b.lineage?b.hp>0:p.health>0)&&!b.transit&&!b.combat&&!b.carriedBy&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.energy:p.needs.energy)>=25&&(b.lineage?b.hunger:p.needs.hunger)<60?b:null;};
const stamp=(s,p,cost=1)=>{const b=stealthBody(s,p.id);if(b.lineage){b.energy-=cost;b.lastAction='work';}else p.needs.energy-=cost;p.decoyLastAt=s.tick;};
const canAct=(s,p,inTurn=false)=>ready(s,p)&&(p.decoyLastAt??-1)<s.tick&&(stealthBody(s,p.id)===s.hero||!stealthBody(s,p.id).lineage&&npcController(s,p)==='personal'&&inTurn&&p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&canStartNPCActivity(s,p,{inTurn}));
function craftSite(s,p,id){const b=stealthBody(s,p.id),site=b&&workshopSite(s,b.area,id);return site&&site.object.state==='intact'&&!site.object.closed&&workToolReady(s,site.object)?site:null;}
export function buyDecoyTool(s,p,{inTurn=false}={}){
 const b=ready(s,p),a=b&&s.areas[b.area];if(!canAct(s,p,inTurn)||!forgingEnabled(s)||p.decoyCraft||!a?.civic||physicalDistance(a,b.x,58)>1)return false;
 const q=quoteMarket(s,a,'tools','buy',1,{gold:marketWallet(s,p.id)-6});if(q.quantity!==1||!fitsPack(s,p.id,{stacks:{tools:(p.marketCargo?.tools||0)+1}}))return false;
 const deal=tradeGoods(s,a,p.id,'tools','buy',1);if(deal.quantity!==1)return false;
 p.decoyCraft={version:1,item:p.id+'/noise-tool',area:a.id,at:s.tick,paid:deal.total,source:'civic/'+a.id,phase:'supplied',workshop:null,work:[],last:s.tick};stamp(s,p);return true;
}
export function workDecoy(s,p,id,{inTurn=false}={}){
 const b=ready(s,p),q=p.decoyCraft,site=b&&craftSite(s,p,id),position=site&&workshopPosition(s,site.area,site.object),goal=b?.lineage?b.goal:p.agenda.task,lease=goal?.workspace;
 if(!canAct(s,p,inTurn)||!forgingEnabled(s)||!q||q.phase==='completed'||!site||site.area.id!==q.area||b.area!==position.area||physicalDistance(s.areas[b.area],b.x,position.x)>1||site.object.owner!==p.id&&!(b.lineage&&lease?.id===site.object.id&&lease.owner===site.object.owner&&lease.until>=s.tick))return false;
 let item=heldDecoy(s,p.id);if(q.phase==='supplied'){
  if((p.marketCargo?.tools||0)<1||item||!fitsPack(s,p.id,{items:[...decoyItems(s,p.id),{slot:'tool'}],stacks:{tools:p.marketCargo.tools-1}}))return false;
  p.marketCargo.tools--;item={id:q.item,kind:'fieldTool',base:'noise-tool',slot:'tool',stat:'guile',power:0,rarity:1,modifier:'plain',value:6,name:'Шумовая приманка',creator:p.id,createdAt:s.tick,history:[{tick:s.tick,text:'Собрана из одного оплаченного инструмента.'}],decoy:{version:1,maker:p.id,state:'draft',charge:0,source:{area:q.area,at:q.at,paid:q.paid,owner:q.source},work:[],placement:null,sound:null,gift:null}};held(s,p).push(item);actorItemLocation(s,item,p.id);q.phase='working';q.workshop=site.object.id;
 }
 if(!item||item.id!==q.item||q.workshop!==site.object.id||item.decoy.state!=='draft')return false;
 q.work.push(s.tick);q.last=s.tick;item.decoy.work.push(s.tick);stamp(s,p,2);if(q.work.length===2){q.phase='completed';item.decoy.state='ready';item.decoy.charge=1;}return true;
}
export function placeDecoy(s,p,itemID,{inTurn=false}={}){
 const b=ready(s,p),item=heldDecoy(s,p.id,{ready:true}),a=b&&s.areas[b.area];if(!canAct(s,p,inTurn)||!item||item.id!==itemID||a.interior||a.objects.some(o=>o.kind==='noiseTrap'&&o.items?.some(i=>i.decoy?.state==='armed')))return false;
 const d=item.decoy,o={id:item.id+'/placement',kind:'noiseTrap',name:'Шумовая приманка',x:b.x,items:[item],taken:false,owner:p.id,decoySound:null,decoyPlacement:{version:1,by:p.id,at:s.tick,due:s.tick+2,area:a.id,x:b.x,item:item.id}};
 decoyItems(s,p.id).splice(decoyItems(s,p.id).indexOf(item),1);a.objects.push(o);d.state='armed';d.placement={...o.decoyPlacement};itemLocation(s,item,{kind:'cache',area:a.id,object:o.id});stamp(s,p);
 const g=activeGuard(s,a.id);if(g){const sense=guardSense(s,g,p.id,b.x,{quiet:true,noise:1});if(sense.seen)noticeGuard(s,g,p.id,sense,'quiet',b.x);}return true;
}
export function retrieveDecoy(s,p,object,{inTurn=false}={}){
 const b=ready(s,p),a=b&&s.areas[b.area],o=a?.objects.find(o=>o.id===object&&o.kind==='noiseTrap'),item=o?.items[0];if(!canAct(s,p,inTurn)||!o||!item||item.decoy.state!=='spent'||physicalDistance(a,b.x,o.x)>1||!fitsPack(s,p.id,{items:[...decoyItems(s,p.id),item]}))return false;
 o.items=[];o.taken=true;held(s,p).push(item);actorItemLocation(s,item,p.id);stamp(s,p);return true;
}
export function giveDecoy(s,p,to,itemID,{inTurn=false}={}){
 const b=ready(s,p),other=ready(s,to),item=decoyItems(s,p.id).find(i=>i.id===itemID&&i.decoy);if(!canAct(s,p,inTurn)||!other||other.lineage||to.id===p.id||b.area!==other.area||physicalDistance(s.areas[b.area],b.x,other.x)>3||to.agenda.task||to.agenda.sociability<.45||!canStartNPCActivity(s,to)||!item||!['ready','spent'].includes(item.decoy.state)||!fitsPack(s,to.id,{items:[...decoyItems(s,to.id),item]}))return false;
 if(npcController(s,to)!=='personal'||!npcAction(s,to,'personal'))return false;decoyItems(s,p.id).splice(decoyItems(s,p.id).indexOf(item),1);held(s,to).push(item);actorItemLocation(s,item,to.id);item.decoy.gift={from:p.id,to:to.id,at:s.tick,charge:item.decoy.charge};item.history.push({tick:s.tick,text:'Передано: '+to.name+'. Заряд сохранён без восстановления.'});stamp(s,p);return true;
}
export function decoyTask(s,p){
 const b=ready(s,p);if(!b)return null;const retrieval=s.areas[b.area].objects.find(o=>o.kind==='noiseTrap'&&o.decoyPlacement.by===p.id&&o.items[0]?.decoy.state==='spent'&&physicalDistance(s.areas[b.area],b.x,o.x)<=18);if(retrieval)return {kind:'decoyRetrieve',target:b.area,x:retrieval.x,object:retrieval.id,remaining:1};const gift=heldDecoy(s,p.id);if(gift?.decoy.state==='spent'&&!gift.decoy.gift&&(b.lineage?b.personality.generosity>=.65:p.agenda.sociability>=.8)){const to=Object.values(s.people).find(q=>{const other=stealthBody(s,q.id);return q.id!==p.id&&ready(s,q)&&!other.lineage&&other.area===b.area&&physicalDistance(s.areas[b.area],b.x,other.x)<=3&&!q.agenda.task&&q.agenda.sociability>=.45&&q.agenda.curiosity>=.6&&canStartNPCActivity(s,q)&&!heldDecoy(s,q.id);});if(to)return {kind:'decoyGift',target:b.area,x:b.x,person:to.id,item:gift.id,remaining:1};}if(!forgingEnabled(s))return null;const q=p.decoyCraft,a=s.areas[b.area];
 if(q?.phase==='completed'||q?.phase==='supplied'&&(p.marketCargo?.tools||0)<1||q?.phase==='working'&&!heldDecoy(s,p.id))return null;
 const site=q?.workshop?workshopSite(s,q.area,q.workshop):b.lineage?workshopSite(s,a):ownedWorkshopSite(s,a,p.id);if(!site||!craftSite(s,p,site.object.id)||q&&site.area.id!==q.area)return null;
 if(!q){const interested=b.lineage?b.profession==='thief'&&b.personality.courage<.5:p.agenda.job==='artisan'&&p.agenda.curiosity>=.6;if(!interested||!p.stealth?.known.length||!a.civic||!quoteMarket(s,a,'tools','buy',1,{gold:marketWallet(s,p.id)-6}).quantity)return null;return {kind:'decoySupply',target:a.id,x:58,property:site.object.id,remaining:1};}
 const pos=workshopPosition(s,site.area,site.object);return {kind:'decoyWork',target:pos.area,x:pos.x,property:site.object.id,remaining:1,...(q.workspace?{workspace:q.workspace}:{})};
}
export function decoyPlan(s,ctx){if(s.hero.goal)return false;const t=decoyTask(s,s.people[s.hero.lineage]);if(!t)return false;ctx.goal(s,t.kind,t.target,t.x,({decoySupply:'Оплатить инструмент для приманки',decoyWork:'Собрать шумовую приманку',decoyRetrieve:'Забрать пустую приманку',decoyGift:'Передать пустую приманку'})[t.kind],'Один инструмент и два рабочих действия; заряд однократный.',{property:t.property,object:t.object,workspace:t.workspace,person:t.person,item:t.item});return true;}
export function decoyAction(s,p,g,ctx,{inTurn=false}={}){let ok;if(g.kind==='decoySupply')ok=buyDecoyTool(s,p,{inTurn});else if(g.kind==='decoyWork'){if(stealthBody(s,p.id)===s.hero&&ctx.workspaceAccess(s)!=='ready')return false;ok=workDecoy(s,p,g.property,{inTurn});if(p.decoyCraft&&g.workspace)p.decoyCraft.workspace={...g.workspace};}else if(g.kind==='decoyRetrieve')ok=retrieveDecoy(s,p,g.object,{inTurn});else if(g.kind==='decoyGift')ok=giveDecoy(s,p,s.people[g.person],g.item,{inTurn});if(stealthBody(s,p.id)===s.hero)s.hero.goal=null;return Boolean(ok);}
