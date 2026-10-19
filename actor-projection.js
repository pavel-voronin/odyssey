import {areaOffset} from './geometry.js';
// Detailed actors and person records are two views of one controller-owned body.
import {projectNPCView} from './npc-view.js';
// Every continuing adventurer owns its fields; retired actors follow their NPC controller.
const bindings=new WeakMap();
export function detailedActors(s){return Object.values(s.actorStates||{}).sort((a,b)=>(a.actorGeneration||0)-(b.actorGeneration||0)||(a.lineage<b.lineage?-1:a.lineage>b.lineage?1:0));}
export function selfDrivenActor(s,actor){const h=typeof actor==='string'?s.actorStates?.[actor]:actor;return Boolean(h?.alive&&!h.life.ended&&h.actorMode!=='npc');}
const active=selfDrivenActor;
const purse=p=>p.agenda||p.actorLink;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function actorItems(h){return [...h.bag,...Object.values(h.equipment).filter(Boolean)];}
function legacyView(p,h){if(p.legacy){p.legacy.wealth=purse(p).wealth;p.legacy.keepsakes=actorItems(h);}}
function physicalFromActor(p,h){p.area=h.area;p.x=h.x;p.alive=h.alive;p.health=Math.max(0,Math.ceil((p.maxHealth||100)*h.hp/h.maxHp));p.actorLink.health=p.health;p.needs.energy=h.energy;p.needs.hunger=h.hunger;Object.assign(p.actorLink,{energy:p.needs.energy,hunger:p.needs.hunger,area:p.area,x:p.x});}
export function setActorMoney(s,p,amount){
 if(!Number.isFinite(amount)||amount<0)throw new Error('Invalid actor wallet');
 const h=s.actorStates?.[p.id];purse(p).wealth=amount;if(h&&p.actorLink){p.actorLink.wallet=amount;h.gold=amount;legacyView(p,h);}else if(p.legacy)p.legacy.wealth=amount;
}
export function initializeActorProjections(s){
 for(const [id,h]of Object.entries(s.actorStates||{})){
  h.ruleFlags=s.rules;const p=s.people[id];if(!p||h.lineage!==id||!Number.isFinite(h.hp)||!(h.maxHp>0)||bindings.get(p)===h)continue;
  if(!p.actorLink){
   p.actorLink={version:1,health:p.health};
   if(active(s,h)||!h.alive)physicalFromActor(p,h);
   purse(p).wealth=h.gold;
  }
  p.actorLink.inventory=h.inventory;p.actorLink.wallet ??=purse(p).wealth;p.actorLink.energy ??=p.needs.energy;p.actorLink.hunger ??=p.needs.hunger;p.actorLink.area ??=p.area;p.actorLink.x ??=p.x;
  bindings.set(p,h);legacyView(p,h);
 }
}
// validateSave has already verified both serialized views. Rebind identities
// only: no purse merging, position correction, estate transfer or generation.
export function restoreActorBindings(s){
 for(const [id,h]of Object.entries(s.actorStates)){
  h.ruleFlags=s.rules;s.people[id].actorLink.inventory=h.inventory;
  if(s.people[id].legacy)s.people[id].legacy.keepsakes=actorItems(h);
  bindings.set(s.people[id],h);
 }
}
export function syncNPCActors(s){
 for(const [id,h]of Object.entries(s.actorStates||{})){
  const p=s.people[id];if(!p?.actorLink||active(s,h))continue;
  const position={area:h.area,x:h.x};
  const maximum=p.maxHealth||100,previous=p.actorLink.health??p.health;
  if(!p.alive){h.alive=false;h.hp=0;h.life.ended=true;h.life.outcome='dead';h.life.endedAt ??=p.died??s.tick;}
  else if(p.health!==previous)h.hp=clamp(h.hp+(p.health-previous)*h.maxHp/maximum,0,h.maxHp);
  if(h.actorMode==='npc'){h.maxHp=maximum;h.hp=p.alive?p.health:0;}
  const leader=actorPartyLeader(s,p.id);p.actorLink.health=p.health;h.personPosition={area:leader?(leader.transit?null:leader.area):p.area??null,x:leader?(leader.coverRetreat?.status==='active'&&leader.coverRetreat.guard===p.id?p.x:leader.x-areaOffset(s.areas[leader.area],4)):p.x??null,status:p.status};
  if(p.area&&s.areas[p.area]){h.area=p.area;h.x=p.x??h.x;}
  if(leader&&p.bodyCarry?.stage!=='carrying'){h.area=leader.area;h.x=leader.x-areaOffset(s.areas[leader.area],4);}
  h.energy=p.needs.energy;h.hunger=p.needs.hunger;h.gold=purse(p).wealth;legacyView(p,h);
  Object.assign(p.actorLink,{wallet:h.gold,energy:p.needs.energy,hunger:p.needs.hunger,area:p.area,x:p.x});
  if(h.actorMode==='npc')projectNPCView(s,h,p,leader,position);
 }
}
export function syncActiveActor(s,finalBody=false){
 const h=s.hero,p=s.people[h.lineage];if(!p?.actorLink||!active(s,h)&&!finalBody)return;
 physicalFromActor(p,h);purse(p).wealth=h.gold;p.actorLink.wallet=h.gold;legacyView(p,h);
}
export function takeLegacyMoney(s,p,wanted){
 const funds=purse(p).wealth,amount=Math.min(Math.max(0,funds),Math.max(0,wanted));
 setActorMoney(s,p,funds-amount);
 return amount;
}
export function takeLegacyItem(s,p){
 const h=s.actorStates[p.id];
 const item=actorItems(h)[0];if(!item)return null;
 h.bag=h.bag.filter(other=>other!==item);for(const key of Object.keys(h.equipment))if(h.equipment[key]===item)h.equipment[key]=null;
 legacyView(p,h);return item;
}

export function applyActorExternal(s,h){
 const p=s.people[h.lineage],link=p?.actorLink;if(!link||!active(s,h))return;
 if(!p.alive){h.alive=false;h.hp=0;h.life.ended=true;h.life.outcome='dead';h.life.endedAt ??=p.died??s.tick;return;}
 if(p.health!==link.health)h.hp=clamp(h.hp+(p.health-link.health)*h.maxHp/(p.maxHealth||100),0,h.maxHp);
 h.gold=Math.max(0,h.gold+(purse(p).wealth-(link.wallet??purse(p).wealth)));
 h.energy=clamp(h.energy+(p.needs.energy-(link.energy??p.needs.energy)),0,100);h.hunger=clamp(h.hunger+(p.needs.hunger-(link.hunger??p.needs.hunger)),0,100);
 if(p.area!==link.area&&p.area&&s.areas[p.area]){h.area=p.area;h.x=p.x??h.x;}else if(p.x!==link.x&&p.area===h.area)h.x=p.x;
 Object.assign(link,{health:p.health,wallet:purse(p).wealth,energy:p.needs.energy,hunger:p.needs.hunger,area:p.area,x:p.x});
}

export function actorPartyLeader(s,person){if(typeof person!=='string')return null;return detailedActors(s).find(h=>selfDrivenActor(s,h)&&h.companions?.some(c=>c.person===person))||null;}
