import {militaryControl,campaignsOn,campaignNear} from './campaign-state.js';
import {authorityBody} from './authority-state.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
export function militaryPassage(s,id,b){
 const c=militaryControl(s,b);if(!c||!campaignsOn(s))return null;const p=s.people[id],body=authorityBody(s,id);if(!p?.alive||body?.area!==b.from||!campaignNear(s,p,b.from,b.x,1))return {status:'unavailable',reason:'Нужно дойти до занятого перехода.'};
 const old=p.campaignPasses?.find(r=>r.operation===c.operation&&r.status==='admitted');if(old)return {status:'clear'};
 const guard=s.people[c.guard];if(!guard?.alive||guard.needs.sleeping||guard.needs.energy<20||guard.health<(guard.maxHealth||100)*.5||npcController(s,guard)!=='personal'||!campaignNear(s,guard,b.from,b.x,2)||!canStartNPCActivity(s,guard))return {status:'defer',reason:'Новая служба перехода сейчас недоступна.'};
 const wallet=marketWallet(s,id),a=s.areas[s.authorities.byId[c.state].treasuryArea];if(wallet<c.fee)return {status:'defer',reason:'Нет средств для нового допуска.'};if(!npcAction(s,guard,'personal','campaign-passage'))return {status:'held',reason:'Страж занят.'};guard.needs.energy--;const treasury=a.civic.treasury;setActorMoney(s,p,wallet-c.fee);a.civic.treasury+=c.fee;(p.campaignPasses ||= []).push({operation:c.operation,at:s.tick,guard:guard.id,actor:id,edge:b.edge,state:c.state,paid:c.fee,before:wallet,after:wallet-c.fee,treasuryBefore:treasury,treasuryAfter:treasury+c.fee,status:'admitted',crossed:null});if(p.campaignPasses.length>24)p.campaignPasses.shift();return {status:'held',reason:'Настоящая пошлина нового контроля оплачена один раз.'};
}
