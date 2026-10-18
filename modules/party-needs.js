import {petPack,petNear} from './pack-pet-state.js';
import {fieldMedicineCost} from './skill-branches.js';
import {recordCompanionRemains} from './remains.js';
import {areaOffset} from '../geometry.js';
import {enabled} from '../rules.js';
import {partyBodySpent} from './party-combat-policy.js';
import {initializeNeeds,personNeeds} from './needs.js';
import {consumeCarriedSupplies,consumeTravelMeal,carriedFood} from './stores.js';
import {markActorDeath,companionKey,companionShape} from '../actor-facts.js';
const active=s=>enabled(s,'npc-party-needs')&&enabled(s,'companions')&&enabled(s,'npc-needs');
export function humanParty(s){return s.hero.companions.filter(c=>c.person&&s.people[c.person]?.alive).slice(0,3);}
export function partyDemand(s){
 if(!active(s))return null;
 const people=humanParty(s).map(c=>s.people[c.person]);
 if(enabled(s,'supply')&&people.some(p=>(p.needs?.hunger||0)>=65))return 'food';
 if(people.some(p=>(p.needs?.energy??100)<25||p.needs?.sleeping||p.health<(p.maxHealth||100)*.45))return 'rest';
 return null;
}
export function partyRestReady(s){return !active(s)||humanParty(s).every(c=>{const p=s.people[c.person];return (p.needs?.energy??100)>=90&&!p.needs?.sleeping&&p.health>=(p.maxHealth||100)*.85;});}
// One ration is made from four food units: one hero and at most three human portions.
// The caller must already have paid the ration or four civic food units.
export function partyMealSize(s){return 1+(active(s)&&enabled(s,'supply')?humanParty(s).length:0);}
export function feedParty(s,portions=3){
 if(!active(s)||!enabled(s,'supply'))return;
 for(const c of humanParty(s).slice(0,Math.max(0,portions))){const p=s.people[c.person];initializeNeeds(p);p.needs.hunger=Math.max(0,p.needs.hunger-48);p.needs.meals++;}
}
function lost(s,c,p,ctx){
 const h=s.hero;h.companions=h.companions.filter(other=>other!==c);h.social.lostCompanions++;c.hp=0;
 if(h.transit){p.deathJourney={from:h.transit.from,to:h.transit.to,mode:h.transit.mode,tick:s.tick};p.area=null;p.x=null;}
 else {p.area=h.area;p.x=h.x-areaOffset(s.areas[h.area],4);const a=s.areas[h.area],id='npc-grave-'+p.id;if(!a.objects.some(o=>o.id===id)){const grave={id,kind:'grave',name:p.name,x:p.x};markActorDeath(s,grave,companionKey(c),companionShape(c));a.objects.push(grave);}}
 recordCompanionRemains(s,c,s.areas[h.area].objects.find(o=>o.id==='npc-grave-'+p.id));
 h.mind.stress=Math.min(100,h.mind.stress+18);ctx.log(s,p.name+' не переживает голод в общей дороге. Отряд теряет своего человека.','loss');
}
export function partyCare(s,c,ctx){
 if(!active(s))return;
 const p=s.people[c.person];if(!p?.alive)return;
 if(p.partyNeeds?.tick===s.tick||s.tick%8!==0)return;
 p.area=s.hero.area;p.x=s.hero.x-areaOffset(s.areas[s.hero.area],4);initializeNeeds(p);
 // A passenger can eat a real carried ration without borrowing from the departure town.
 if(s.hero.transit&&p.needs.hunger>=65&&enabled(s,'supply')&&carriedFood(s.people[s.hero.lineage],s.hero.inventory)>0){const h=s.hero,opened=(s.people[h.lineage]?.roadSupplies?.food||0)>0,portions=consumeTravelMeal(s.people[h.lineage],h.inventory,partyMealSize(s));if(portions){h.hunger=Math.max(0,h.hunger-65);h.counters.meals++;feedParty(s,portions-1);ctx.log(s,opened?'В пути отряд делит открытые припасы. Запас в сумке уменьшается.':'В пути отряд делит дорожный паёк. Запас в сумке уменьшается.','food');}}
 let activity=null;
 personNeeds(s,p,ctx,{onlyUpkeep:Boolean(s.hero.combat)||partyBodySpent(s,p),migration:false,localFood:false,grave:false,social:false,sleep:false,
  aid(){const max=p.maxHealth||100;if(!enabled(s,'npc-personal-supplies')||!enabled(s,'supply')||!(p.health<max*.75||p.ailment)||!consumeCarriedSupplies(p,null,'medicine',fieldMedicineCost(s,p.id)))return false;p.health=Math.min(max,p.health+25);if(p.health>=max*.85)p.ailment=null;activity='medicine';return true;},
  meal(){if(!enabled(s,'npc-personal-supplies')||!enabled(s,'supply')||!consumeCarriedSupplies(p,null,'food',1))return false;p.needs.hunger=Math.max(0,p.needs.hunger-48);p.needs.meals++;activity='eat';return true;},
  onDeath(){lost(s,c,p,ctx);}
 });
 if(p.alive){c.hp=Math.max(1,Math.ceil(c.maxHp*p.health/(p.maxHealth||100)));if(p.needs.energy<25&&!s.hero.combat)p.needs.sleeping=true;if(s.hero.transit&&p.needs.sleeping){p.needs.energy=Math.min(100,p.needs.energy+8);if(p.needs.energy>=90){p.needs.sleeping=false;p.needs.sleeps++;}}}
 p.partyNeeds={tick:s.tick,activity:activity||(p.needs.sleeping?'rest':null)};
 if(activity)ctx.log(s,p.name+(activity==='medicine'?' расходует свои лекарства.':' съедает часть собственного запаса.'),'npc');
}

export function partyPrepared(s,estimate){
 if(!active(s))return true;
 const energy=Math.min(90,24+Math.ceil(estimate.ticks*.1));
 return humanParty(s).every(c=>{const p=s.people[c.person];return (p.needs?.energy??100)>=energy&&!p.needs?.sleeping&&p.health>=(p.maxHealth||100)*.55;});
}

export function partyAvailable(s,c){
 if((petPack(c)||c.petCustody)&&(!petNear(s,c,12)||c.petTraining?.energy<25||c.petTraining?.hunger>=80))return false;
 if(c.petTraining?.lastActionTick===s.tick)return false;
 if(c.person&&partyBodySpent(s,s.people[c.person]))return false;
 if(!active(s)||!c.person)return true;
 const p=s.people[c.person];return Boolean(p?.alive&&(p.needs?.energy??100)>=25&&!p.needs?.sleeping&&!(p.partyNeeds?.tick===s.tick&&p.partyNeeds.activity));
}
