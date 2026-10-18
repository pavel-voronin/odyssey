import {recordAreaVisit} from '../actor-atlas.js';
import {createWorld,step,serialize,restore,log,route,knownRoute} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {buyUpgrade} from '../modules/finances.js';
export function meaningFixture(kind='strike'){
 const s=createWorld(7);for(const id of Object.keys(s.rules))setModule(s,id,false);setModule(s,'event-meaning',true);
 const h=s.hero,a=Object.values(s.areas).find(a=>a.objects.some(e=>e.kind==='enemy')),enemy=a.objects.find(e=>e.kind==='enemy');
 h.area=a.id;h.x=enemy.x;h.hp=h.maxHp=100;h.energy=100;h.hunger=10;h.conditions=[];h.companions=[];h.inventory.potions=0;h.weapon=h.armor=0;h.level=1;h.equipment={weapon:null,armor:null,charm:null};h.bag=[];h.personality.courage=1;
 enemy.hp=enemy.maxHp=10000;enemy.attack=1;enemy.alive=true;h.combat=enemy.id;h.goal={kind:'hunt',area:a.id,x:enemy.x,object:enemy.id,started:s.tick};
 if(kind==='death')enemy.attack=1000;
 if(kind==='victory')enemy.hp=1;
 if(kind==='heal'){h.hp=30;h.inventory.potions=1;}
 if(kind==='buy'){setModule(s,'finances',true);h.area=s.merchant.area;recordAreaVisit(s,h.area);h.x=58;h.combat=null;h.goal=null;h.gold=100;h.memory.merchant=s.merchant.area;h.money.style='carefree';}
 syncActiveActor(s);return {s,h,enemy};
}
export function performMeaning(f,kind){if(kind==='buy')return buyUpgrade(f.s,{log,route,knownRoute});return step(f.s);}
export const withoutMeaning=s=>JSON.stringify(JSON.parse(serialize(s)),(key,value)=>['meaning','causeMeaning','event-meaning'].includes(key)?undefined:value);
export function copyMeaning(f){const s=restore(serialize(f.s));return {s,h:s.hero,enemy:s.areas[f.enemy.area||f.h.area]?.objects.find(e=>e.id===f.enemy.id)||Object.values(s.areas).flatMap(a=>a.objects).find(e=>e.id===f.enemy.id)};}
