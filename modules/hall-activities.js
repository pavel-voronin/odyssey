import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {setActorMoney} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {npcController} from './npc-control.js';
import {interiorBuilding,tavernIn,tavernAvailable} from './interiors.js';
import {advanceCareer} from './identity.js';
import {meetPerson} from './social.js';
import {weatherAt} from './weather.js';
import {revealArea} from '../actor-atlas.js';
import {profile} from './common.js';

const active=s=>enabled(s,'hall-activities')&&enabled(s,'interiors')&&enabled(s,'work');
const price=9,duration=4;
function money(s,p){return s.actorStates?.[p.id]?.actorMode!=='npc'&&s.actorStates?.[p.id]?.alive?s.actorStates[p.id].gold:p.agenda?.wealth||0;}
export function willingListener(s,p,h,area){
 return Boolean(p?.alive&&p.id!==h.lineage&&p.area===area&&npcController(s,p)==='personal'&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<65&&Math.abs(p.x-50)*areaScale(s.areas[p.area])<=45&&(!p.agenda.task||p.interiorStay)&&((p.agenda.sociability||0)>=.35||enabled(s,'relationships')&&((p.agenda.bonds[h.lineage]||0)>0||(h.relations[p.id]?.trust||0)>5)));
}
export function songQuote(s,h=s.hero){
 if(!active(s)||profile(h).skill!=='parley'||h.combat||h.transit)return null;
 const a=s.areas[h.area],door=interiorBuilding(s,a),payer=s.people[door?.owner];
 if(!door||door.performance?.status==='active'||!tavernAvailable(s,door)||!payer?.alive||payer.id===h.lineage||payer.area!==a.id||money(s,payer)<price||enabled(s,'relationships')&&(h.relations[payer.id]?.trust||0)<-15)return null;
 const audience=Object.values(s.people).filter(p=>willingListener(s,p,h,a.id)).map(p=>p.id).sort().slice(0,8);
 return audience.length?{door,payer,audience}:null;
}
export function planSongWork(s,ctx,motive){
 const h=s.hero,a=s.areas[h.area];if(!active(s)||(h.tavernWorkAfter||0)>s.tick)return false;
 if(a.interior){const quote=songQuote(s);if(!quote)return false;ctx.goal(s,'work',a.id,50,'Спеть для слушателей в зале',motive.reason,{job:'song',remaining:duration,venue:quote.door.id});return true;}
 const door=tavernIn(s,a.id);if(!tavernAvailable(s,door))return false;
 revealArea(s,door.hall);ctx.goal(s,'hallWorkVisit',door.hall,50,'Найти работу: '+door.name,'Сначала нужно войти и встретить настоящих слушателей и плательщика.',{motive:motive.kind});return true;
}
export function visitForWork(s,ctx){
 if(!planSongWork(s,ctx,{reason:'В зале есть согласные слушатели и настоящий бюджет на выступление.'})){s.hero.tavernWorkAfter=s.tick+240;s.hero.goal=null;ctx.log(s,'Сейчас выступление не складывается: нет согласных слушателей или доступной платы. Он займётся другим делом.','work');}
}
function validPerformance(s,door,r){
 const h=s.actorStates[r.performer];return Boolean(active(s)&&h?.alive&&!h.life.ended&&!h.combat&&!h.transit&&h.area===r.area&&Math.abs(h.x-50)*areaScale(s.areas[h.area])<=1&&h.goal?.kind==='work'&&h.goal?.job==='song'&&h.goal?.performance===r.id&&tavernAvailable(s,door)&&s.people[r.payer]?.alive&&s.people[r.payer].area===r.area&&r.until>=s.tick&&r.audience.some(id=>willingListener(s,s.people[id],h,r.area)));
}
function cancel(s,door,r,ctx){
 if(r.status!=='active')return;
 r.status='cancelled';r.ended=s.tick;const payer=s.people[r.payer];
 if(payer){const refund=r.held;r.held=0;setActorMoney(s,payer,money(s,payer)+refund);r.refunded=refund;}
 const h=s.actorStates[r.performer];if(h){if(h.goal?.performance===r.id)h.goal=null;h.workAfter=s.tick+48;ctx.log(actorView(s,h),'Выступление прервалось. Неизрасходованная плата возвращается заказчику; потраченное время не вернуть.','work');}
}
export function hallActivitiesTick(s,ctx){
 for(const a of Object.values(s.areas))for(const door of a.objects.filter(o=>o.kind==='tavern')){const r=door.performance;if(r?.status==='active'&&!validPerformance(s,door,r))cancel(s,door,r,ctx);}
}
export function songAction(s,ctx){
 const h=s.hero,g=h.goal,a=s.areas[h.area],door=interiorBuilding(s,a);
 if(!active(s)||!door||g.kind!=='work'||g.job!=='song'||g.venue!==door.id||Math.abs(h.x-50)*areaScale(s.areas[h.area])>1){h.goal=null;return;}
 let r=door.performance;
 if(!g.performance){
  const quote=songQuote(s);if(!quote){h.goal=null;h.tavernWorkAfter=s.tick+240;return;}
  setActorMoney(s,quote.payer,money(s,quote.payer)-price);door.nextPerformance=(door.nextPerformance||0)+1;
  r=door.performance={id:door.id+'/song/'+door.nextPerformance,performer:h.lineage,payer:quote.payer.id,area:a.id,audience:quote.audience,price,held:price,remaining:duration,status:'active',started:s.tick,actionAt:s.tick,until:s.tick+24};g.performance=r.id;
  h.lastAction='talk';ctx.log(s,`${quote.payer.name} откладывает ◈${price} на выступление. Слушателей: ${r.audience.length}. Оплата — после песни.`,'work');return;
 }
 if(!r||r.id!==g.performance||r.status!=='active'||r.performer!==h.lineage){h.goal=null;return;}
 if(r.actionAt===s.tick)return;
 if(!validPerformance(s,door,r)){cancel(s,door,r,ctx);return;}
 r.actionAt=s.tick;h.energy=Math.max(0,h.energy-2);h.lastAction='talk';h.speech='Песня звучит над столами…';r.remaining--;g.remaining=r.remaining;advanceCareer(s,1,ctx,{family:'song',cause:'song/'+r.id+'/'+r.remaining});
 if(r.remaining>0)return;
 const pay=r.held;r.held=0;r.paid=pay;r.status='done';r.ended=s.tick;h.gold+=pay;h.goal=null;h.workAfter=s.tick+120;ctx.gainXp(s,5,'song-result/'+r.id);h.counters.peacefulWork=(h.counters.peacefulWork||0)+1;
 for(const id of r.audience)if(willingListener(s,s.people[id],h,a.id))meetPerson(s,id,ctx,1);
 ctx.log(s,`${h.name} заканчивает песню и получает обещанные ◈${pay}. ${s.people[r.payer].name} благодарит за выступление.`,'work');
}
export function hallConversation(s,ctx){
 if(!enabled(s,'hall-activities')||!enabled(s,'interiors'))return false;
 const h=s.hero,a=s.areas[h.area];if(!a.interior)return false;
 const p=Object.values(s.people).filter(p=>willingListener(s,p,h,a.id)&&Math.abs(p.x-h.x)*areaScale(s.areas[h.area])<35).sort((a,b)=>a.id.localeCompare(b.id))[0];if(!p)return false;
 h.hallTalkAfter ||= {};if((h.hallTalkAfter[p.id]||0)>s.tick)return false;h.hallTalkAfter[p.id]=s.tick+720;
 const note=p.agenda.knowledge.at(-1),parent=s.areas[a.interior.parent],topic=note?`вспоминает: «${note.text}»`:`говорит о погоде за дверью: ${weatherAt(s,parent).name.toLowerCase()}`;
 meetPerson(s,p.id,ctx,1);if(enabled(s,'relationships'))p.agenda.bonds[h.lineage]=(p.agenda.bonds[h.lineage]||0)+1;h.lastAction='talk';ctx.log(s,`${h.name} и ${p.name} разговаривают. Собеседник ${topic}. Они узнают друг друга чуть лучше.`,'relationship');return true;
}
