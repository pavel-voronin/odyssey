import {createWorld,serialize} from '../engine.js';import {MODULES} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {castInCombat} from '../modules/magic.js';import {combatResponse} from '../modules/combat.js';import {FACTION_BRANCHES,factionDuty} from '../modules/faction-paths.js';
export const measuredContext={log(){},random:()=>.99,gainXp(){},defeatEnemy(){}};
export function measuredFixture(){
 const flags=['people','identity','magic','body','skill-branches','tactics','combat-judgment','faction-paths','equipment','item-originals','place-rules'];const s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero;
 Object.assign(h,{hp:h.maxHp,energy:100,hunger:0,conditions:[],companions:[],bag:[],quests:[],habits:[],goal:null,combat:null,transit:null});h.equipment={weapon:null,armor:null,charm:null};Object.assign(h.inventory,{rations:0,herbs:0,potions:0,relics:0});h.stories.active=null;h.destiny.completed=true;h.magic.spells=['ward'];h.magic.mana=h.magic.maxMana;h.personality.courage=.5;h.memory.shopAfter=100000;
 const threats=Object.values(s.areas).flatMap(a=>a.objects.filter(e=>e.kind==='enemy'&&e.alive&&!e.resolved).map(e=>({a,e})));if(threats.length<3)throw Error('Need three existing world threats');syncActiveActor(s);return {s,h,threats};
}
export function presentThreat(q,index=0){const {a,e}=q.threats[index],{h}=q;h.area=a.id;h.x=e.x;h.combat=e.id;h.goal=null;Object.assign(e,{hidden:false,attack:3,tactic:'simple',element:'normal',mutation:'none',powers:[],patrol:0});return e;}
export function threeWardThreats(){
 const q=measuredFixture();for(let i=0;i<3;i++){
  // Explicit cooldown/effect-expiry and encounter checkpoints, not simulated lives.
  q.s.tick=i*19+1;q.h.conditions=[];const e=presentThreat(q,i);if(!castInCombat(q.s,e,measuredContext,'ward','normal'))throw Error('No actual ward');q.h.hp-=combatResponse(q.s,e,3,measuredContext);if(i===0){q.s.tick++;q.h.hp-=combatResponse(q.s,e,3,measuredContext);if(q.s.people[q.h.lineage].skillPractice.magic.total!==1)throw Error('Repeated threat credited twice');}
 }syncActiveActor(q.s);return q;
}
export function archiveCourse(q){
 const {s,h}=q,a=Object.values(s.areas).find(a=>a.civic&&FACTION_BRANCHES[a.faction]?.some(p=>p.service==='study')),b=FACTION_BRANCHES[a.faction].find(p=>p.service==='study');h.area=a.id;h.x=42;h.combat=null;h.goal={kind:'factionDuty',area:a.id,x:42,started:s.tick,remaining:4,faction:a.faction};h.counters.research=4;
 h.affiliation.primary=a.faction;h.affiliation.paths[a.faction]={branch:b.id,branchName:b.name,rank:2,office:null,privileges:[...b.privileges],service:b.service,profession:b.profession,ethic:b.ethic,suspended:false,joined:0,duties:4};
 for(let i=0;i<4;i++){s.tick++;factionDuty(s,measuredContext);}syncActiveActor(s);return q;
}
export function measuredSave(q){syncActiveActor(q.s);return serialize(q.s);}
