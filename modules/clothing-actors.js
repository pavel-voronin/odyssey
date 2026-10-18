import {practicalClothingOn,clothingKind} from './clothing-state.js';import {changeSpareOutfit} from './spare-outfit.js';
// Only a person who already owns an actual equipment-bearing actor record can
// wear its originals. Looking at a resident is never a reason to issue a suit.
export function npcClothingTurn(s,p,ctx){const h=s.actorStates?.[p.id],t=p.agenda?.task;if(!practicalClothingOn(s)||!h||h.actorMode!=='npc'||!p.alive||!t||!['work','learn','return','medicine'].includes(t.kind)||p.needs?.sleeping||p.ailment||!h.bag.some(clothingKind))return false;
 const hero={...h,area:p.area,x:p.x,alive:p.alive,hp:p.health,maxHp:p.maxHealth||100,energy:p.needs.energy,hunger:p.needs.hunger,goal:{kind:t.kind==='return'?'travel':'work',job:({artisan:'repair',merchant:'market',healer:'medicine'})[p.agenda.job]||p.agenda.job,area:t.target,x:t.x,started:t.started||0}};
 const view={...s,hero};if(!changeSpareOutfit(view,{...ctx,npcClothing:true}))return false;h.wardrobe=hero.wardrobe;h.energy=p.needs.energy=hero.energy;h.lastAction='equipment';return true;
}
