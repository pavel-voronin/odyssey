import {createWorld} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function lethalViewFixture(){
 const s=createWorld(12);for(const m of MODULES)setModule(s,m.id,false);
 for(const id of ['animation','appearance','scenery','lighting','facades','scene-planes','color-profile','identity','lineage'])setModule(s,id,true);
 const h=s.hero,a=s.areas.a2,enemy=a.objects.find(o=>o.kind==='enemy');Object.assign(enemy,{hp:10000,maxHp:10000,attack:1000,x:82});h.area=a.id;h.x=82;h.hp=h.maxHp;h.energy=100;h.companions=[];h.combat=enemy.id;h.goal=null;h.inventory.herbs=0;h.inventory.potions=0;h.intent='Сражаться: '+enemy.name;h.reason='Противник преградил путь.';h.action='БОЙ';syncActiveActor(s);return {s,h,enemy};
}
