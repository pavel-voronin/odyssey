import {enabled} from '../rules.js';
import {physicalDistance,campPassage} from '../geometry.js';
import {npcAction,npcController} from './npc-control.js';
import {partyAvailable} from './party-needs.js';
import {PARTY_PASSIVE_PHASES,partyBodySpent} from './party-combat-policy.js';
import {campActivityAvailable,reserveCampActivity,safeCampActivity} from './camp-session.js';
import {combinationsOn,pairConsent,learnedPair,PAIR_METHOD,PAIR_POLICY as P} from './party-combination-policy.js';

function ready(s,c){
 const p=s.people[c?.person],claim=p?.actionControl;
 return Boolean(p?.alive&&p.role!=='ребёнок'&&c.hp>=c.maxHp*.8&&p.health>=(p.maxHealth||100)*.8&&p.area===s.hero.area&&Number.isFinite(p.x)&&physicalDistance(s.areas[p.area],p.x,s.hero.x)<=9&&npcController(s,p)==='party'&&partyAvailable(s,c)&&!partyBodySpent(s,p)&&!p.needs.sleeping&&p.needs.energy>=40&&p.needs.hunger<55&&!(claim?.tick===s.tick&&(claim.owner!=='party'||claim.phases.some(v=>!PARTY_PASSIVE_PHASES.includes(v)))));
}
function record(p,other,guard,striker,event){
 const state=p.pairPractice ||= {version:1,partners:{},lastActionTick:-1};
 const r=state.partners[other.id] ||= {partner:other.id,name:other.name,guard,striker,operations:[],total:0};
 if(r.operations.some(o=>o.id===event.id)||r.method)return;
 r.operations.push({...event});r.total++;r.last=event.tick;state.lastActionTick=event.tick;
 if(r.total===P.lessons){r.method=PAIR_METHOD;r.learnedAt=event.tick;}
 const ids=Object.keys(state.partners).sort((a,b)=>state.partners[a].last-state.partners[b].last||a.localeCompare(b));
 for(const id of ids.slice(0,Math.max(0,ids.length-8)))delete state.partners[id];
}
function compatible(s,guard,striker){
 return [[guard,striker],[striker,guard]].every(([a,b])=>{const r=s.people[a.person].pairPractice?.partners[b.person];return !r||!r.method&&r.guard===guard.person&&r.striker===striker.person;});
}
function quiet(s){
 const a=s.areas[s.hero.area],near=(area,x)=>area.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(area,o.x,x)<28);
 if(!safeCampActivity(s)||near(a,s.hero.x))return false;
 const parent=s.areas[a.temporaryCamp.parent],passage=parent&&campPassage(s,a.id,parent.id);
 return !passage?.allowed||!near(parent,passage.arrival);
}
export function pairDrill(s,ctx){
 if(!combinationsOn(s)||!enabled(s,'camp-life')||!enabled(s,'npc-needs')||!enabled(s,'skill-branches'))return false;
 const h=s.hero,a=s.areas[h.area];if(!a.temporaryCamp||h.goal?.kind!=='rest'||physicalDistance(a,h.x,h.goal.x)>1)return false;
 let r=h.pairDrill;if(r&&(r.number!==h.counters.camps||r.area!==a.id))r=null;
 if(r?.status==='done'||r?.lastTick===s.tick)return false;
 if(!quiet(s)){if(r){r.status='paused';r.reason='Сейчас важнее безопасность и восстановление.';}return false;}
 const members=h.companions.filter(c=>ready(s,c));
 let guard=r&&members.find(c=>c.person===r.guard),striker=r&&members.find(c=>c.person===r.striker);
 if(!r){
  if(!campActivityAvailable(h))return false;
  for(const g of members){if(g.attack<=0||g.job!=='Страж'&&s.people[g.person].agenda.job!=='guard')continue;
   const f=members.find(c=>c!==g&&c.attack>=2&&pairConsent(s,g,c)&&compatible(s,g,c));
   if(f){guard=g;striker=f;break;}
  }
  if(!guard||!striker||!reserveCampActivity(h,'pair-drill'))return false;
  r=h.pairDrill={version:1,id:`${h.lineage}/camp/${h.counters.camps}/pair-drill`,number:h.counters.camps,area:a.id,guard:guard.person,striker:striker.person,started:s.tick,lastTick:-1,actions:0,status:'active',reason:null};
 }
 if(!guard||!striker||!pairConsent(s,guard,striker)){
  if(r.status!=='paused')ctx.log(s,'Совместная тренировка прервана: один из участников не готов продолжать. Сделанное не забыто.','skill');
  r.status='paused';r.reason='Нужен готовый и согласный партнёр рядом.';return false;
 }
 const g=s.people[guard.person],f=s.people[striker.person];
 if(!npcAction(s,g,'party','pair-drill')||!npcAction(s,f,'party','pair-drill'))throw Error('Pair drill lost its synchronous checked body turn');
 const event={id:r.id+'/'+s.tick,tick:s.tick,area:a.id,camp:r.id,guard:g.id,striker:f.id,energy:P.practiceEnergy};
 for(const [p,other]of [[g,f],[f,g]]){p.needs.energy-=P.practiceEnergy;record(p,other,g.id,f.id,event);}
 r.lastTick=s.tick;r.actions++;r.status='active';r.reason=null;h.lastAction='talk';
 if(learnedPair(s,g.id,f.id)){
  r.status='done';r.completed=s.tick;
  ctx.log(s,`${g.name} и ${f.name} отрабатывают последний заход: один закрывает подготовку другого. Теперь они знают общий приём — именно с этим партнёром.`,'skill');
 }else ctx.log(s,`${g.name} прикрывает учебный размах ${f.name}. Они тратят силы на совместную практику вместо отдыха.`,'skill');
 return true;
}
