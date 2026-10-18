import {enabled} from '../rules.js';
import {physicalDistance,areaScale} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcController,canStartNPCActivity,markNPCDeparture} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {itemWorking} from './item-condition.js';
import {walkCampOrder} from './camp-route.js';
export const commissionedOn=s=>enabled(s,'commissioned-orders')&&enabled(s,'orders')&&enabled(s,'equipment')&&enabled(s,'npc-control')&&enabled(s,'npc-watch-needs')&&enabled(s,'npc-needs');
export function guardWeapon(s,p,id=null){const h=s.actorStates?.[p.id],items=h?[...h.bag,...Object.values(h.equipment).filter(Boolean)]:p.looseItems||[];return items.find(i=>(id===null||i.id===id)&&i.slot==='weapon'&&i.stat==='attack'&&i.power>0&&itemWorking(i))||null;}
const ledger=a=>a.commandLedger ||= {version:1,serial:0,attempt:null,history:[],notices:{},reportedThreats:{}};
function refuse(s,a,reason,ctx){ledger(a).attempt={tick:s.tick,chief:s.hero.lineage,reason};ctx.log(s,reason,'orders');return null;}
export function commissionGuard(s,a,crisis,ctx){
 const h=s.hero;if(!commissionedOn(s)||!h.alive||h.combat||h.actorMode==='npc'||h.transit||h.area!==a.id||a.civic?.ruler!==h.lineage||physicalDistance(a,h.x,42)>12)return null;
 const path=(ctx.knownRoute||ctx.route)(s,a.id,crisis.area);if(!path.length||path[0]!==a.id||path.at(-1)!==crisis.area||path.slice(1).some((id,i)=>!s.areas[path[i]].links.includes(id)))return refuse(s,a,'Совет не передаёт приказ по неизвестной дороге.',ctx);
 if(a.civic.treasury<4)return refuse(s,a,'В казне нет четырёх монет на согласованную предоплату.',ctx);
 const candidates=Object.values(s.people).filter(p=>p.id!==h.lineage&&p.alive&&p.role!=='ребёнок'&&p.area===a.id&&p.status==='resident'&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p)&&!p.agenda.task&&!p.needs.sleeping&&p.needs.energy>=45&&p.needs.hunger<60&&!p.ailment&&p.health>=(p.maxHealth||100)*.85&&guardWeapon(s,p)&&localContact(s,p.id,a.id)&&physicalDistance(a,h.x,p.x)<=12&&!Object.values(p.familyNeeds?.cases||{}).some(c=>['known','active'].includes(c.status))&&(p.agenda.job==='guard'||p.agenda.duty>=.5&&p.agenda.sociability>=.4)).sort((a,b)=>b.agenda.duty-a.agenda.duty||a.id.localeCompare(b.id));
 const p=candidates[0];if(!p)return refuse(s,a,'Рядом некому принять поручение: нужен свободный вооружённый человек, согласный идти.',ctx);
 const book=ledger(a),id=`commission/${a.id}/${++book.serial}`,weapon=guardWeapon(s,p),treasuryBefore=a.civic.treasury,walletBefore=marketWallet(s,p.id);
 a.civic.treasury-=4;setActorMoney(s,p,walletBefore+4);book.attempt=null;
 const commission={version:1,id,chief:h.lineage,worker:p.id,issued:s.tick,path:[...path],weapon:weapon.id,wage:4,treasuryBefore,walletBefore,deadline:s.tick+path.length*80+96,completed:false,failure:null};
 p.status='marching';p.agenda.task=null;markNPCDeparture(s,p,'orders');
 return {person:p.id,owner:h.lineage,from:a.id,to:crisis.area,enemy:crisis.enemy,stage:'marching',remaining:0,commission};
}
export function commissionedWalk(s,p,o,ctx){
 const c=o.commission,path=o.stage==='returning'?[...c.path].reverse():c.path,index=path.indexOf(p.area),destination=o.stage==='returning'?o.from:o.to;
 if(index<0)return 'blocked';
 const here=s.areas[p.area];let x=42;
 if(o.stage==='marching'&&p.area===o.to){
  const enemy=here.objects.find(e=>e.id===o.enemy&&e.alive&&!e.resolved);
  if(!enemy)return 'arrived';
  if(physicalDistance(here,p.x,enemy.x)<=12)return 'arrived';
  if(physicalDistance(here,p.x,enemy.x)<=30)x=enemy.x-Math.sign(enemy.x-p.x)*12/areaScale(here);
  else {o.searchDirection ??=p.x>=50?-1:1;x=Math.max(5,Math.min(95,p.x+o.searchDirection*12));if(x===p.x)return 'blocked';}
 }
 const result=walkCampOrder(s,p,destination,x,{...ctx,route:()=>path.slice(index)},o);
 if(result==='blocked'&&!c.failure)c.failure='На согласованном пути обнаружена преграда или живая опасность. Он не прошёл сквозь неё.';
 return result;
}
export function finishCommission(s,o,outcome){
 const c=o.commission;if(!c)return;const a=s.areas[o.from],book=ledger(a);if(book.history.some(r=>r.id===c.id))return;
 book.history.push({...c,path:[...c.path],enemy:o.enemy,area:o.to,ended:s.tick,outcome,notified:null,authorityBefore:null,authorityAfter:null});
 while(book.history.length>24){const i=book.history.findIndex(r=>r.notified!==null);if(i<0)break;book.history.splice(i,1);}
}
export function commissionReports(s,ctx){
 if(!commissionedOn(s))return;
 for(const a of Object.values(s.areas)){
  const book=a.commandLedger;if(!book)continue;
  const pending=[...s.society.orders.filter(o=>o.from===a.id&&o.commission).map(o=>o.commission),...book.history.filter(r=>r.notified===null)];
  for(const r of pending){
   const h=s.actorStates?.[r.chief],chief=localContact(s,r.chief,a.id),worker=localContact(s,r.worker,a.id);
   if(!h?.alive||h.life.ended||!chief||s.people[r.chief].needs.sleeping||s.tick<=r.deadline||book.notices[r.id]||physicalDistance(a,chief.x,42)>12||worker&&physicalDistance(a,chief.x,worker.x)<=12)continue;
   const before=h.civic.authority;h.civic.authority=Math.max(0,before-1);book.notices[r.id]={tick:s.tick,chief:r.chief,worker:r.worker,authorityBefore:before,authorityAfter:h.civic.authority};
   if(s.hero.lineage===r.chief)ctx.log(s,'Срок поручения '+s.people[r.worker].name+' истёк: возвращение не подтверждено. Причина неизвестна; начальник отвечает за отправленного человека.','orders');
  }
  for(const r of book.history){
   if(r.notified!==null)continue;const h=s.actorStates?.[r.chief],chief=localContact(s,r.chief,a.id),p=s.people[r.worker],worker=localContact(s,r.worker,a.id);
   if(!h?.alive||h.life.ended||!chief||s.people[r.chief].needs.sleeping)continue;
   const returned=r.outcome==='returned'&&worker&&!p.needs.sleeping&&physicalDistance(a,chief.x,worker.x)<=12;
   if(!returned)continue;r.notified=s.tick;
   if(r.completed&&!book.reportedThreats[r.enemy]){book.reportedThreats[r.enemy]={order:r.id,tick:s.tick};a.civic.safety=Math.min(100,a.civic.safety+25);if(a.civic.crisis?.enemy===r.enemy)a.civic.crisis=null;}r.authorityBefore=h.civic.authority;const failed=!r.completed;if(failed&&!book.notices[r.id])h.civic.authority=Math.max(0,h.civic.authority-1);r.authorityAfter=h.civic.authority;
   if(s.hero.lineage===r.chief)ctx.log(s,p.name+' отчитывается: '+(r.completed?'известная угроза устранена':r.failure||'поручение не выполнено')+'. Предоплата остаётся у исполнителя.'+(failed?' Начальник отвечает за неудачное поручение.':''),'orders');
  }
 }
}
