import {fracturesOn,fracturePending,boneSite} from './fracture-state.js';
import {woundActor,woundActivity} from './wound-state.js';
import {careState} from './wound-care-state.js';
import {physicalDistance} from '../geometry.js';
import {productionSources} from './goods.js';
import {isTown} from './common.js';
import {npcAction,npcController} from './npc-control.js';
import {setActorMoney} from '../actor-projection.js';
const site=(s,p)=>{const h=woundActor(s,p),a=s.areas[h?.area||p.area];return {h,a,x:h?.x??p.x};};
const free=(s,p,inTurn=false)=>p.woundCare?.lastActionTick!==s.tick&&(!p.actionControl||p.actionControl.tick!==s.tick||!p.actionControl.phases.some(k=>!['upkeep','social',...(inTurn?['act',...(p.actionControl.owner==='actor'?['decision']:[])]:[])].includes(k)));
const quiet=(s,a,x)=>!a?.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(a,e.x,x)<=15);
const skilled=p=>['healer','alchemist'].includes(p.agenda?.job);
export function fitSplint(s,p,w,by=p,ctx){
 const {h,a,x}=site(s,p),b=site(s,by),f=w?.fracture;
 if(!fracturesOn(s)||!p.alive||!by.alive||!p.localWounds?.active.includes(w)||!fracturePending(w)||!boneSite(p,w)||f.splint?.remaining>0||!free(s,p,true)||!free(s,by,by===p)||h?.combat||h?.transit||!quiet(s,a,x)||!isTown(a)||physicalDistance(a,x,42)>3||b.a!==a||physicalDistance(a,b.x,x)>9||(b.h?.energy??by.needs.energy)<6||by.needs?.sleeping||!boneSite(by,{part:'leftArm'})&&!boneSite(by,{part:'rightArm'}))return false;
 // The same finite town raw stock already supplies wooden prosthetic blanks.
 // Purchase and shape one blank here; binding is one owned medical dressing.
 const raw=productionSources(s,a),stock=raw?.materials,money=h?.gold??p.agenda.wealth;
 if(!stock||stock.stock<1||money<3||!(by.roadSupplies?.medicine>=1))return false;
 if(by!==p&&(!skilled(by)||(by.agenda.generosity??.5)<.4||npcController(s,by)!=='personal'||!npcAction(s,by,'personal','splint-fit')))return false;
 const before=stock.stock,medicine=by.roadSupplies.medicine;stock.stock--;stock.used++;a.civic.treasury+=3;setActorMoney(s,p,money-3);by.roadSupplies.medicine--;
 f.splint={version:1,at:s.tick,by:by.id,quality:skilled(by)?2:1,remaining:12,wood:{source:stock.id,area:a.id,before,after:stock.stock,units:1,paid:3},binding:{holder:by.id,before:medicine,after:medicine-1,units:1}};
 if(b.h){b.h.energy-=4;b.h.lastAction='heal';}else by.needs.energy-=4;
 careState(p).lastActionTick=s.tick;careState(by).lastActionTick=s.tick;woundActivity(s,p,'body',true);
 if(h){h.lastAction='heal';h.speech=skilled(by)?'Шина держит кость.':'Закреплю, как умею.';}
 ctx?.log?.(s,`${by.name}: ${skilled(by)?'подогнанная':'грубая'} шина — ${w.label}. Одна деревянная заготовка (◈3) и одна лекарственная повязка израсходованы; кость ещё не срослась.`,'heal');return true;
}
export function fractureCare(s,p,ctx){
 if(!fracturesOn(s)||!p?.alive)return false;const w=p.localWounds?.active.find(w=>fracturePending(w));if(!w)return false;
 const {h,a,x}=site(s,p);if(h?.transit||h?.combat||!quiet(s,a,x)||(h?.hunger??p.needs.hunger)>75)return false;
 if(p.woundCare?.lastActionTick===s.tick)return true;
 if(!(w.fracture.splint?.remaining>0)){
  // Only visible idle, willing clinicians are asked; no remote private stock scan.
  const helper=Object.values(s.people).find(q=>q!==p&&q.alive&&q.area===a.id&&physicalDistance(a,q.x,x)<=9&&skilled(q)&&free(s,q)&&(q.agenda.generosity??.5)>=.4&&q.roadSupplies?.medicine>=1);
  if(helper&&fitSplint(s,p,w,helper,ctx)||fitSplint(s,p,w,p,ctx)){ctx?.cancelWeapon?.(s,'Подгонка шины вместо размаха.');return true;}
 }
 const severe=w.fracture.union<70,brave=h&&(h.personality.courage??0)>=.8&&h.hp>=h.maxHp*.65&&w.fracture.splint?.remaining>0;
 if(!severe||brave)return false;
 if(h){
  // A known market in this same visible town is the only short detour. Empty
  // stock or missing binding leads to local rest, never a repeated distant trip.
  const canReach=!w.fracture.splint?.remaining&&isTown(a)&&physicalDistance(a,x,42)<=16&&p.roadSupplies?.medicine>=1&&h.gold>=3&&(a.goods?.sources?.materials.stock??0)>=1;
  if(!h.goal?.woundCare){ctx?.goal?.(s,'rest',a.id,canReach?42:x,'Поберечь сломанную кость','Шина и покой помогают срастанию; кожа не заменяет кость.',{woundCare:true});}
  return false;
 }
 woundActivity(s,p,'body',true);p.needs.energy=Math.min(100,p.needs.energy+4);careState(p).lastActionTick=s.tick;return true;
}
