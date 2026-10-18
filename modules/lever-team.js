import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController,invalidateNPCControl} from './npc-control.js';
import {partyBodySpent,PARTY_PASSIVE_PHASES} from './party-combat-policy.js';
import {grateAt,mechanismKey} from './mechanism-policy.js';
import {observeGrate} from './mechanisms.js';
import {walkCampOrder} from './camp-route.js';
import {personNeeds} from './needs.js';
const on=s=>enabled(s,'mechanisms')&&enabled(s,'companions')&&enabled(s,'people');
function danger(s,p,g){return s.areas[g.lever.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(s.areas[g.lever.area],g.lever.x,o.x)<=30);}
function willing(s,h,c,g){
 const p=s.people[c?.person],b=p&&localContact(s,p.id,h.area),claim=p?.actionControl;
 return on(s)&&p?.alive&&!selfDrivenActor(s,p.id)&&c.hp>0&&c.loyalty>=55&&h.memory.people.includes(p.id)&&b?.area===g.lever.area&&physicalDistance(s.areas[b.area],b.x,g.lever.x)<=9&&p.health>=(p.maxHealth||100)*.65&&!p.needs.sleeping&&p.needs.energy>=40&&p.needs.hunger<65&&npcController(s,p)==='party'&&!partyBodySpent(s,p)&&!(p.personalJourney?.status==='active'&&p.personalJourney.due<s.tick+48)&&!(claim?.tick===s.tick&&claim.phases.some(k=>!PARTY_PASSIVE_PHASES.includes(k)))&&!danger(s,p,g);
}
function state(s,g,value,person){g.state=value;g.changed=s.tick;g.operations.push({tick:s.tick,person,state:value});if(g.operations.length>8)g.operations.shift();s.graphRevision=(s.graphRevision||0)+1;}
function removeBody(s,p){for(const a of Object.values(s.areas)){a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);if(a.population)a.population=a.population.filter(id=>id!==p.id);}}
function resident(s,p){const a=s.areas[p.area];if(!a)return;removeBody(s,p);a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);a.objects.push({id:'lever-duty/'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}
export function teamLeverPlan(s,to,ctx){
 const h=s.hero,g=grateAt(s,h.area,to);if(!on(s)||!g?.holding||g.state!=='closed'||g.holding.person)return false;
 const n=observeGrate(s,s.people[h.lineage],h.area,to);if(!n||n.leverArea!==h.area)return false;
 const c=h.companions.find(c=>willing(s,h,c,g));if(!c){n.holdAfter=s.tick+48;return false;}
 const resume=structuredClone(h.goal);ctx.goal(s,'mechanismHold',h.area,g.lever.x,'Попросить придержать рычаг',`${c.name} может остаться у рычага, пока герой проходит. Потом придётся встретиться снова.`,{key:mechanismKey(h.area,to),helper:c.person,resume});return true;
}
export function beginLeverHold(s,key,person,ctx={},resume=null){
 const h=s.hero,g=s.edges[key]?.mechanism,c=h.companions.find(c=>c.person===person),p=s.people[person],lever=s.areas[g?.lever.area]?.objects.find(o=>o.id===g.lever.id&&o.kind==='mechanismLever');
 if(!g?.holding||g.state!=='closed'||g.holding.person||!lever||!h.alive||h.transit||h.combat||h.area!==g.lever.area||h.energy<2||physicalDistance(s.areas[h.area],h.x,lever.x)>9||!willing(s,h,c,g)||!npcAction(s,p,'party','lever'))return false;
 const member=structuredClone(c);h.companions=h.companions.filter(m=>m!==c);p.mechanismDuty={version:1,key,leader:h.lineage,stage:'holding',started:s.tick,tick:s.tick,released:null,member};
 p.area=g.lever.area;p.x=g.lever.x;p.status='lever-duty';p.needs.energy-=2;if(p.agenda)p.agenda.task=null;resident(s,p);g.holding.person=p.id;state(s,g,'open',p.id);observeGrate(s,s.people[h.lineage],g.from,g.to);h.energy-=1;h.goal=resume;h.lastAction='talk';invalidateNPCControl(s);
 ctx.log?.(s,`${p.name} остаётся у рычага. Решётка поднята, пока он удерживает тягу; герой может пройти.`,'companion');return true;
}
export function leverHoldAction(s,ctx){const h=s.hero,g=h.goal;if(!g||!beginLeverHold(s,g.key,g.helper,ctx,g.resume))h.goal=null;}
function release(s,p,g,reason,ctx){const d=p.mechanismDuty;if(g?.holding?.person===p.id){g.holding.person=null;state(s,g,'closed',p.id);}d.stage='returning';d.released=s.tick;d.reason=reason;ctx.log?.(s,`${p.name} отпускает рычаг: ${reason}. Решётка опускается; обход остаётся открыт.`,'companion');}
function finish(s,p,h,join){const d=p.mechanismDuty;if(join){const member=d.member;member.hp=Math.max(1,Math.ceil(member.maxHp*p.health/(p.maxHealth||100)));h.companions.push(member);p.status='withHero';p.partyNeeds={tick:s.tick,activity:'lever'};removeBody(s,p);d.stage='joined';}else{p.status=p.alive?'resident':'dead';if(p.alive)resident(s,p);d.stage=p.alive?'left':'dead';}delete d.member;d.finished=s.tick;invalidateNPCControl(s);}
export function leverTeamTick(s,ctx){
 for(const p of Object.values(s.people)){
  const d=p.mechanismDuty;if(!d||!['holding','returning'].includes(d.stage)||d.tick===s.tick)continue;
  const g=s.edges[d.key]?.mechanism,h=s.actorStates[d.leader];
  if(!p.alive){release(s,p,g,'держатель погиб',ctx);finish(s,p,h,false);continue;}
  if(d.stage==='holding'){
   const lever=s.areas[g?.lever.area]?.objects.find(o=>o.id===g.lever.id&&o.kind==='mechanismLever'),separated=!h?.alive||h.life.ended||(h.relations[p.id]?.trust??0)<0;
   const reason=!on(s)?'помощь прекращена':separated?'общая дорога закончилась':!lever||p.area!==g.lever.area||physicalDistance(s.areas[p.area],p.x,g.lever.x)>9?'рычаг недоступен':danger(s,p,g)?'приближается опасность':p.needs.sleeping||p.needs.energy<28||p.needs.hunger>=65||p.health<(p.maxHealth||100)*.65?'нужен отдых':h.area!==g.lever.area&&!h.transit?'герой уже прошёл':s.tick-d.started>=96?'долгое ожидание окончено':p.personalJourney?.status==='active'&&p.personalJourney.due<=s.tick?'пора заняться своим делом':null;
   if(reason)release(s,p,g,reason,ctx);
  }
  if(!npcAction(s,p,'mechanism'))continue;
  d.tick=s.tick;
  if(s.tick%8===0)personNeeds(s,p,ctx,{onlyUpkeep:true,migration:false,localFood:false,social:false,sleep:false});
  if(!p.alive){if(d.stage==='holding')release(s,p,g,'держатель погиб',ctx);finish(s,p,h,false);continue;}
  if(d.stage==='holding'){p.needs.energy=Math.max(0,p.needs.energy-.5);continue;}
  const join=on(s)&&h?.alive&&!h.life.ended&&(h.relations[p.id]?.trust??0)>=0&&d.member.loyalty>=55&&!h.companions.some(c=>c.person===p.id)&&h.companions.filter(c=>c.person).length<3;
  if(!join||s.tick-d.released>96){finish(s,p,h,false);continue;}
  if(h.transit)continue;
  p.needs.energy=Math.max(0,p.needs.energy-.5);
  if(p.needs.sleeping||p.needs.energy<25||p.needs.hunger>=65){finish(s,p,h,false);continue;}
  const result=walkCampOrder(s,p,h.area,h.x,ctx,d);
  if(result==='arrived'){finish(s,p,h,true);ctx.log?.(s,`${p.name} догоняет отряд по обходу. Ожидание и дорога утомили его.`,'companion');}
 }
}
