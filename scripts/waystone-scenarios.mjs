import assert from 'node:assert/strict';
import {createWorld,step,createEnemy} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {meetPerson} from '../modules/social.js';
import {setActorMoney} from '../actor-projection.js';
import {teachSpell} from '../modules/magic.js';
import {heldWaystones} from '../modules/waystone-state.js';
import {commonContext} from './common-life-scenarios.mjs';
export const waystoneContext={...commonContext,defeatEnemy(s,e){e.hp=0;e.alive=false;e.resolved=true;s.hero.combat=null;s.hero.goal=null;}};
export function waystoneFixture({trained=true,curiosity=.8,generosity=.2}={}){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,['waystones','magic','equipment','item-originals','people','npc-control','identity','relationships'].includes(m.id));
 const h=s.hero,a=Object.values(s.areas).find(a=>a.objects.some(o=>o.kind==='relic'&&!o.taken)),relic=a?.objects.find(o=>o.kind==='relic'&&!o.taken);assert.ok(relic);
 for(const p of Object.values(s.people))if(p.id!==h.lineage){p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 for(const b of Object.values(s.areas))for(const o of b.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 Object.assign(h,{area:a.id,x:relic.x,hp:h.maxHp,energy:100,hunger:0,combat:null,habits:[],quests:[],conditions:[]});Object.assign(h.personality,{curiosity,generosity});h.stories.active=null;h.destiny.completed=true;
 assert.equal(h.magic.spells.length,0);if(trained)assert.equal(teachSpell(s,'spark',waystoneContext,'Прежнее обучение'),true);
 h.goal={kind:'collect',area:a.id,x:relic.x,object:relic.id,started:s.tick};step(s);const item=heldWaystones(h)[0];assert.ok(item);assert.equal(s.waystoneOrigin.item,item.id);
 const buyer=s.people[createPerson(s,{name:'Эна',role:'житель',area:a.id,x:h.x,culture:a.culture,alive:true},{initialJob:'scholar'})];Object.assign(buyer.agenda,{curiosity:.9,task:null,due:1e9});Object.assign(buyer.needs,{energy:100,hunger:0,sleeping:false});setActorMoney(s,buyer,20);meetPerson(s,buyer.id,waystoneContext,1);
 return {s,h,a,relic,item,buyer};
}
export function waystoneBattle(f){
 const {s,h,a}=f;for(const id of ['identity','lineage','body','enchantments','elements','companions'])setModule(s,id,false);for(const id of ['combat-judgment','enemies','tactics','mutations'])setModule(s,id,true);
 Object.assign(h,{hp:8,maxHp:100,energy:100,weapon:0,armor:0,level:1,conditions:[],goal:null});h.personality.courage=.5;h.inventory.potions=0;h.magic.mana=1;s.rng=1600;
 const enemy=createEnemy(s,a,{species:'bandit',x:h.x});Object.assign(enemy,{hp:8,maxHp:1000,attack:44,tactic:'simple',mutation:'none',element:'normal',powers:[],battle:{turns:0,intent:'idle',summons:0,echo:0}});h.combat=enemy.id;return enemy;
}

export function waystoneTarget(f,h=f.s.hero){const e=createEnemy(f.s,f.s.areas[h.area],{species:'bandit',x:h.x});Object.assign(e,{hp:1,maxHp:1,attack:1,powers:[],element:'normal',mutation:'none'});h.combat=e.id;return e;}
