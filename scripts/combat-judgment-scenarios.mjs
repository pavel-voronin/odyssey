import {lootVictoryFixture} from './loot-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function combatFixture({hp=20,attack=20,tactic='simple',intent='idle',enemyHp=1000,courage=.5,blocked=false,potions=0,mana=0,spells=[]}={}){
 const {s,h,enemy}=lootVictoryFixture();
 for(const id of ['identity','lineage','body','enchantments','elements','companions'])setModule(s,id,false);
 for(const id of ['combat-judgment','enemies','tactics','mutations'])setModule(s,id,true);
 setModule(s,'magic',spells.length>0);
 Object.assign(h,{hp,maxHp:100,energy:100,weapon:0,armor:0,level:1,conditions:[],magic:{mana,maxMana:40,spells:[...spells],cooldowns:{},casts:0},lastAction:'idle'});h.personality.courage=courage;h.inventory.potions=potions;
 Object.assign(enemy,{hp:enemyHp,maxHp:1000,attack,tactic,mutation:'none',element:'normal',powers:[],battle:{turns:0,intent,summons:0,echo:0}});
 s.rng=blocked?1600:0;syncActiveActor(s);return {s,h,enemy};
}
