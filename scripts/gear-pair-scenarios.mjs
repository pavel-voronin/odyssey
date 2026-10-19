import {installedSocket,socketContext} from './socket-scenarios.mjs';
import {setModule} from '../rules.js';
import {makeItem,receiveItem} from '../modules/inventory.js';
import {syncActiveActor} from '../actor-projection.js';
import {step} from '../engine.js';
export const pairContext=socketContext;
export function pairFixture({courage=.1,known=true}={}){
 const f=installedSocket(),{s,h}=f;
 for(const id of ['gear-pairs','brace','tactics','enemies','combat-judgment','mutations','armor-balance'])setModule(s,id,true);
 for(const id of ['identity','lineage','enchantments','body'])setModule(s,id,false);
 let calls=0;const ctx={...socketContext,random:()=>[.35,.11,0,0][calls++]??0},coat=makeItem(s,ctx,1);receiveItem(s,ctx,1,coat);
 const area=Object.values(s.areas).find(a=>a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved)),enemy=area.objects.find(e=>e.kind==='enemy'&&e.alive&&!e.resolved);
 Object.assign(h,{area:area.id,x:enemy.x,hp:80,maxHp:100,energy:100,weapon:0,armor:0,level:1,combat:enemy.id,conditions:[],goal:null});h.personality.courage=courage;h.inventory.potions=0;h.companions=[];
 Object.assign(enemy,{hp:1000,maxHp:1000,attack:14,tactic:'charged',mutation:'none',element:'normal',powers:[],battle:{turns:0,intent:'idle',summons:0,echo:0}});
 if(known){setModule(s,'magic',false);step(s);setModule(s,'magic',true);}else{enemy.battle.turns=1;enemy.battle.intent='strike';}
 syncActiveActor(s);return {...f,coat,enemy};
}
