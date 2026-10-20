import {petPack} from './pack-pet-state.js';
// Present canonical roots only. Archives and legacy snapshots of detailed actors
// are not another inventory, and nested components never become a second root.
export function socketRoots(s){
 const roots=[],actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));if(s.hero)actors.set(s.hero.lineage,s.hero);const add=list=>{for(const item of list||[])if(item&&typeof item.id==='string')roots.push(item);},pet=p=>add(petPack(p)?.items);
 for(const h of actors.values()){add(h.bag);add(Object.values(h.equipment||{}).filter(Boolean));for(const c of h.companions||[])pet(c);}
 for(const p of Object.values(s.people)){if(!actors.has(p.id)){add(p.looseItems);add(p.legacy?.keepsakes);}for(const c of p.pets||[])pet(c);if(p.petBoarding?.pet)pet(p.petBoarding.pet);if(p.prosthetic?.item)add([p.prosthetic.item]);for(const o of Object.values(p.socketWork?.orders||{}))if(o.result&&o.collected===null)add([o.result]);}
 for(const a of Object.values(s.areas))for(const o of a.objects){add(o.items);add(o.paymentItems);pet(o.existingPet||o.packPetBody||o.petBody);}
 for(const h of Object.values(s.horses?.byId||{}))add(h.cargo?.items);for(const e of Object.values(s.edges||{}))add(e.lift?.parts);add(s.merchant.items);return roots;
}
