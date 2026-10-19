import {commonEntry} from './diplomacy-state.js';
import {authoritiesOn,authorityBody,borderAt,borderGuard,borderMemory,authorityKey} from './authority-state.js';
import {fordBypass} from './fords.js';
import {physicalDistance} from '../geometry.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {npcAction,npcController} from './npc-control.js';
function guardFree(s,p){const c=p.actionControl;return p.borderDuty.servicedAt!==s.tick&&(s.rules['npc-control']===false||c?.tick!==s.tick||c.owner==='personal'&&c.phases.length===1&&c.phases[0]==='act'&&p.borderDuty.idleAt===s.tick);}
function serve(s,p){if(!guardFree(s,p))return false;if(p.actionControl?.tick!==s.tick&&!npcAction(s,p,'personal'))return false;p.borderDuty.servicedAt=s.tick;p.needs.energy=Math.max(0,p.needs.energy-1);return true;}
function record(s,p,b,g){const m=borderMemory(p);let r=m.entries.find(r=>r.id===m.pending);if(r?.edge===b.edge)return r;r={id:p.id+'/border/'+(++m.serial),actor:p.id,edge:b.edge,from:b.from,to:b.to,state:b.receiver,law:b.law,started:s.tick,guard:g.id,status:'working',steps:[],payment:null,admitted:null,crossed:null};m.entries.push(r);if(m.entries.length>24)m.entries.shift();m.pending=r.id;return r;}
export function authorityPassage(s,id,to,target){
 if(!authoritiesOn(s))return {status:'clear'};const p=s.people[id],body=authorityBody(s,id),b=body&&borderAt(s,body.area,to);if(!p?.alive||!body||!b||body.transit||p.roadTransit||p.fordCrossing||p.liftTransit)return {status:'clear'};
 if(!body.lineage&&s.rules['npc-control']!==false&&(p.actionControl?.tick!==s.tick||p.actionControl.owner!==npcController(s,p)||!p.actionControl.phases.includes('act')))return {status:'unavailable',reason:'Путник не владеет действием своего тела.'};
 if(commonEntry(s,b))return {status:'clear'};
 if(physicalDistance(s.areas[b.from],body.x,b.x)>1)return {status:'unavailable',reason:'До поста ещё нужно дойти.'};
 const m=borderMemory(p),old=m.entries.find(r=>r.id===m.pending);if(old?.edge===b.edge&&old.status==='admitted')return {status:'clear'};if(m.lastAt===s.tick)return {status:'held',reason:'Одна операция на посту за ход.'};
 const state=s.authorities.byId[b.receiver],law=state.law;let known=m.known.find(k=>k.edge===b.edge);if(!known){known={edge:b.edge,from:b.from,to:b.to,state:state.id,law:law.id,fee:law.fee,workAllowed:law.workAllowed,workRequired:law.workRequired,seen:s.tick};m.known.push(known);}else known.seen=s.tick;
 const g=borderGuard(s,b),work=old?.edge===b.edge?old.steps.length:0,due=law.fee-work,money=marketWallet(s,p.id),path=fordBypass(s,body,target||to,b.edge),energy=body.lineage?body.energy:p.needs.energy,hunger=body.lineage?body.hunger:p.needs.hunger,canWork=law.workAllowed&&b.maintenance.remaining>=due&&energy>=25&&hunger<60;
 const bypass=()=>{m.lastAt=s.tick;m.refusal={at:s.tick,edge:b.edge,reason:!g?'Пост сейчас не принимает путников.':'Нет доступной оплаты или дорожной работы.'};return path.length>1?{status:'bypass',path,reason:'Известная дорога обходит платный въезд.'}:{status:'defer',reason:m.refusal.reason};};
 if(!g)return bypass();
 if(!guardFree(s,g)){if(!m.wait||m.wait.edge!==b.edge)m.wait={edge:b.edge,since:s.tick,attempts:0};m.wait.attempts++;m.lastAt=s.tick;return m.wait.attempts<=2?{status:'held',reason:'Принимающий страж занят другим телесным действием.'}:bypass();}m.wait=null;
 if(money<due+4&&path.length>1)return bypass();if(money<due&&!canWork)return bypass();
 if(!serve(s,g))return {status:'held',reason:'Страж не смог принять операцию.'};const r=record(s,p,b,g);m.lastAt=s.tick;
 if(canWork&&money<due+4){const before=energy;b.maintenance.remaining--;b.maintenance.done++;if(body.lineage){body.energy-=2;body.lastAction='work';}else p.needs.energy-=2;r.steps.push({at:s.tick,actor:id,guard:g.id,before:b.maintenance.remaining+1,after:b.maintenance.remaining,energyBefore:before,energyAfter:before-2});
 }else{const a=s.areas[state.treasuryArea],treasury=a.civic.treasury;setActorMoney(s,p,money-due);a.civic.treasury+=due;r.payment={at:s.tick,guard:g.id,amount:due,before:money,after:money-due,treasuryBefore:treasury,treasuryAfter:treasury+due,work:r.steps.length};if(body.lineage)body.lastAction='talk';}
 if(r.steps.length+(r.payment?.amount||0)>=law.fee){r.status='admitted';r.admitted=s.tick;return {status:'held',action:r.payment?'talk':'work',reason:r.payment?'Пошлина уплачена в казну; допуск на одно пересечение.':'Три действия дорожного содержания приняты вместо пошлины.'};}return {status:'held',action:'work',reason:'Дорожное содержание вместо пошлины: '+r.steps.length+'/3.'};
}
