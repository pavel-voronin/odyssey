import {enabled} from '../rules.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {assetStore,assetOwner} from './asset-risk-state.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
import {claimHostileAction} from './hostile-state.js';
import {carriedFood} from './stores.js';
import {stackRoom} from './container-state.js';
import {woundStride,woundActivity} from './wound-state.js';
import {strikeRaidGuard} from './raid-guard.js';
import {killEnemyPerson} from './enemy-mercy.js';
import {actorView} from '../actor-view.js';
export const assetRiskOn=s=>enabled(s,'asset-risk');
const memory=p=>p.assetRaid ||= {version:1,known:[],plan:null,serial:0,history:[]};
function record(s,p,kind,data={}){const m=memory(p);m.history.push({at:s.tick,kind,...data});if(m.history.length>12)m.history.shift();}
export function storeDefender(s,area,x,contacts,exclude=null){return contacts.find(({p,at})=>p.id!==exclude&&p.alive&&!p.needs?.sleeping&&p.agenda?.job==='guard'&&npcController(s,p)==='personal'&&p.needs.energy>=10&&physicalDistance(s.areas[area],at.x,x)<=12)?.p||null;}
function observe(s,p,contacts){
 const a=s.areas[p.area];for(const o of a.objects){if(!assetStore(o)||physicalDistance(a,p.x,o.x)>18)continue;const m=memory(p),d=storeDefender(s,a.id,o.x,contacts.filter(c=>physicalDistance(a,p.x,c.at.x)<=18),p.id);let n=m.known.find(n=>n.object===o.id);if(!n){n={object:o.id,area:a.id,after:0};m.known.push(n);}Object.assign(n,{x:o.x,owner:assetOwner(o),food:o.food||0,seen:s.tick,guard:d?.id??null,barrier:o.stockade?.current||0});if(m.known.length>8)m.known.shift();}
}
function warn(s,p,o,contacts,ctx,receipt=null){
 const owner=assetOwner(o),w=contacts.find(c=>c.p.id===owner&&physicalDistance(s.areas[p.area],c.at.x,receipt?o.x:p.x)<=(receipt?12:18));if(!w)return;
 const notes=w.p.assetWarnings ||= [];if(notes.some(n=>receipt?n.receipt===receipt.id:n.mode==='witness'&&n.actor===p.id&&n.object===o.id&&s.tick-n.at<64))return;notes.push({at:s.tick,actor:p.id,area:p.area,object:o.id,mode:receipt?'loss':'witness',...(receipt?{receipt:receipt.id,amount:receipt.amount}:{})});if(notes.length>8)notes.shift();
 const h=s.actorStates?.[owner]||(s.hero.lineage===owner?s.hero:null);if(h)ctx.log(actorView(s,h),receipt?p.name+' забирает еду из оставленного груза: '+receipt.amount+'. Потеря настоящая; оставшиеся припасы и люди сохраняются.':p.name+' осматривает оставленные припасы. Можно перенести груз или позаботиться о настоящей охране.','npc');
}
export function assetRaidTurn(s,p,e,ctx,contacts){
 if(!assetRiskOn(s))return false;observe(s,p,contacts);const m=p.assetRaid;if(!m)return false;const n=p.needs,own=carriedFood(p,p.actorLink?.inventory);
 if(!m.plan){
  if(n.energy<25||e.hp<e.maxHp*.35||own>=4||!(n.hunger>=65||p.agenda.wealth<12&&p.agenda.duty<.35))return false;
  const options=m.known.filter(k=>k.food>=1&&k.after<=s.tick&&s.tick-k.seen<=96&&k.area===p.area).sort((a,b)=>(b.food-physicalDistance(s.areas[p.area],p.x,b.x))-(a.food-physicalDistance(s.areas[p.area],p.x,a.x)));
  const k=options.find(k=>!(k.guard||k.barrier)&&e.hp>=e.maxHp*.5||n.hunger>=90&&e.hp>=e.maxHp*.6);if(!k){for(const k of options){k.after=s.tick+64;record(s,p,'avoid',{object:k.object,guard:k.guard,barrier:k.barrier});}const weak=p.hostileLife.known.people.find(v=>v.after<=s.tick&&s.tick-v.seen<=96&&!storeDefender(s,p.area,v.x,contacts.filter(c=>physicalDistance(s.areas[p.area],p.x,c.at.x)<=18),p.id));if(options.length&&weak&&n.hunger>=65&&!own)p.hostileLife.goal={kind:'raid',x:weak.x,person:weak.person};return false;}
  const o=s.areas[k.area].objects.find(o=>o.id===k.object);if(!o||!assetStore(o))return false;
  if(!claimHostileAction(s,p,'search'))return true;m.plan={area:k.area,object:k.object,x:k.x,started:s.tick};p.hostileLife.goal=null;record(s,p,'recon',{object:o.id});warn(s,p,o,contacts,ctx);return true;
 }
 const g=m.plan,a=s.areas[p.area],k=m.known.find(k=>k.object===g.object),o=a.objects.find(o=>o.id===g.object);
 if(g.area!==p.area||!o||!assetStore(o)){m.plan=null;if(k)k.after=s.tick+64;return false;}
 const guard=storeDefender(s,p.area,o.x,contacts.filter(c=>physicalDistance(a,p.x,c.at.x)<=18),p.id);
 if(guard&&n.hunger<90){if(!claimHostileAction(s,p,'search'))return true;record(s,p,'driven',{object:o.id,guard:guard.id});m.plan=null;if(k)k.after=s.tick+64;return true;}
 if(physicalDistance(a,p.x,o.x)>2){if(!claimHostileAction(s,p,'walk'))return true;const next=p.x+areaStep(a,p.x,o.x,6*woundStride(s,p));if(a.objects.some(other=>other!==e&&other.kind==='enemy'&&other.alive&&!other.resolved&&other.x>=Math.min(p.x,next)&&other.x<=Math.max(p.x,next))){record(s,p,'blocked',{object:o.id});m.plan=null;if(k)k.after=s.tick+64;return true;}p.x=next;e.x=next;n.energy=Math.max(0,n.energy-1);woundActivity(s,p,'leg');return true;}
 if(!claimHostileAction(s,p,'raid'))return true;
 if(guard){strikeRaidGuard(s,p,e,guard,ctx);if(!e.hp){record(s,p,'died',{object:o.id,guard:guard.id});m.plan=null;killEnemyPerson(s,e,guard.id);return true;}}
 if(o.stockade?.current>0){const before=o.stockade.current;o.stockade.current--;n.energy=Math.max(0,n.energy-2);record(s,p,'barrier',{object:o.id,before,after:o.stockade.current});return true;}
 const amount=Math.min(o.food||0,Math.max(0,4-own),stackRoom(s,p.id,'food',4));if(amount>0){const before=o.food;o.food-=amount;p.roadSupplies.food+=amount;p.hostileLife.supplies.raided+=amount;const id=p.id+'/asset/'+(++m.serial);const receipt={id,at:s.tick,actor:p.id,owner:assetOwner(o),before,after:o.food,amount,witnesses:contacts.filter(c=>c.p.id!==p.id&&physicalDistance(a,c.at.x,o.x)<=12).slice(0,16).map(c=>c.p.id)};(o.raidLosses ||= []).push(receipt);if(o.raidLosses.length>12)o.raidLosses.shift();record(s,p,'taken',{object:o.id,id});o.taken=!['food','medicine','tools'].some(key=>o[key]>0);warn(s,p,o,contacts,ctx,receipt);}
 else record(s,p,'empty',{object:o.id});m.plan=null;if(k)k.after=s.tick+64;return true;
}
