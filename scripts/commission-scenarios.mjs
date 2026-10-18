import assert from 'node:assert/strict';
import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {setModule} from '../rules.js';
import {createArea,connectAreas,createEnemy,route,knownRoute} from '../engine.js';
import {revealArea} from '../actor-atlas.js';
import {governTick} from '../modules/society.js';
import {sendGuards,ordersTick} from '../modules/orders.js';
import {guardWeapon} from '../modules/commissioned-orders.js';
export const commissionContext={...forgingContext,route,knownRoute,npcVictory(s,a,e,p){e.alive=false;e.resolved=true;e.hp=0;e.defeatedBy=p.id;}};
export function commissionFixture(){
 const f=forgingFixture({npc:true}),{s,h,a,p}=f;
 for(const id of ['commissioned-orders','orders','politics','npc-control','npc-watch-needs','npc-needs','people','supply','equipment'])setModule(s,id,true);
 const forge=startKnife(s,p,f.site,forgingContext);assert.ok(forge);placeAtBench(f);for(let n=0;n<6&&p.forging.active;n++){s.tick++;assert.equal(workKnife(s,p,forgingContext),true);}assert.ok(guardWeapon(s,p));
 for(const q of Object.values(s.people))if(![p.id,h.lineage].includes(q.id))q.status='absent';
 Object.assign(p,{area:a.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false,loneliness:0});Object.assign(p.agenda,{duty:.9,sociability:.8,task:null,due:1e9});h.area=a.id;h.x=42;h.goal={kind:'govern',area:a.id,x:42,remaining:3};a.civic.ruler=null;
 for(let n=0;n<3;n++){s.tick++;governTick(s,commissionContext);}assert.equal(a.civic.ruler,h.lineage);
 const middle=s.areas[createArea(s,'forest','Средняя дорога',0)],target=s.areas[createArea(s,'forest','Дальний поворот',0)];connectAreas(s,a.id,middle.id,{mode:'road',duration:2});connectAreas(s,middle.id,target.id,{mode:'road',duration:2});
 for(const b of [a,middle,target]){b.length=50;for(const e of b.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}}
 for(const b of [a,middle,target]){revealArea(s,b.id);h.area=b.id;for(const id of b.links)revealArea(s,id);}h.area=a.id;h.x=42;
 const enemy=createEnemy(s,target,{species:'bandit',x:60});Object.assign(enemy,{attack:1,hp:1,maxHp:1});a.civic.crisis={kind:'raid',enemy:enemy.id,area:target.id};
 return {...f,middle,target,enemy,weapon:guardWeapon(s,p)};
}
export function issueCommission(f){assert.equal(sendGuards(f.s,f.a,f.a.civic.crisis,commissionContext),true);return f.s.society.orders.at(-1);}
export function advanceCommission(s){s.tick++;ordersTick(s,commissionContext);}
