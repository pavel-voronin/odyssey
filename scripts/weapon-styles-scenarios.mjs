import {combatFixture} from './combat-judgment-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export const styleItem=(id='heavy',suffix='test')=>({id:`weapon-${id}-${suffix}`,base:id==='quick'?'blade':'axe',slot:'weapon',stat:'attack',power:4,rarity:1,value:24,modifier:'plain',name:id==='quick'?'Короткий дорожный клинок':'Походный топор',found:0,history:[],weaponStyle:{version:1,id}});
export function weaponFixture({style='heavy',profession='soldier',courage=.8,hp=100,attack=2,enemyHp=1000,tactic='simple',intent='idle'}={}){
 const f=combatFixture({hp,attack,enemyHp,tactic,intent,courage});
 for(const id of ['weapon-styles','identity','equipment'])setModule(f.s,id,true);
 Object.assign(f.h,{profession,stats:{might:4,wit:2,guile:0,luck:2,spirit:0}});f.h.equipment.weapon=styleItem(style);syncActiveActor(f.s);return f;
}
