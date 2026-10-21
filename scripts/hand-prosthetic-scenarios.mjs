import {receiveItem} from '../modules/inventory.js';
import {workshopAt} from '../modules/property.js';
import assert from 'node:assert/strict';
import {limbFixture,quietLimb,limbContext} from './limb-loss-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {productionSources} from '../modules/goods.js';
import {orderPeg,prostheticNPCTurn,collectPeg,observeProstheticMasters} from '../modules/prosthetics.js';
import {fitHand} from '../modules/hand-prosthetic.js';
import {npcAction} from '../modules/npc-control.js';
import {serialize,restore,knownRoute,log} from '../engine.js';
export const hookContext={...limbContext,knownRoute,log,receiveItem};
export function hookFixture({both=false,part='rightArm',parts:chosen=null}={}){const f=limbFixture({damage:0}),{s,h,p,enemy}=f;h.hp=h.maxHp=200;syncActiveActor(s);const parts=chosen||(both?['rightArm','leftArm']:[part]);for(const [i,target]of parts.entries()){s.tick=i+1;const before=h.hp;h.hp-=80;syncActiveActor(s);const w=recordLocalWound(s,p,enemy,{before,after:h.hp,maximum:200,area:h.area,controller:i?'hook-source-0':'hook-source-6',scarPart:target},hookContext);assert.equal(w.loss,p.limbLosses.events.at(-1).id);assert.equal(p.limbLosses.events.at(-1).part,target);}quietLimb(f);
 for(const id of ['prosthetics','forging','goods-cycle','property','item-originals','containers','npc-control','people','supply','equipment'])setModule(s,id,true);
 // Selected post-injury arrival and closed-stump boundary; no long recovery is simulated.
 const a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),master=s.people[o.owner];h.area=a.id;h.x=42;h.gold=100;h.energy=100;h.hunger=0;h.hp=160;h.goal=null;h.bag=[];h.inventory.herbs=0;h.inventory.rations=0;for(const w of p.localWounds.active){w.closure=100;w.function=50;w.bleed=0;}Object.assign(master,{area:a.id,x:42,status:'resident',health:master.maxHealth||100});Object.assign(master.needs,{energy:100,hunger:0,sleeping:false});Object.assign(master.agenda,{job:'artisan',task:null,due:s.tick});productionSources(s,a);syncActiveActor(s);return {...f,a,o,master};}
export function hookAct(f,fn){f.s.tick++;const result=fn();syncActiveActor(f.s);return result;}
export function madeHook(f=hookFixture()){assert.ok(hookAct(f,()=>orderPeg(f.s,f.master,hookContext,{hand:true})));for(let i=0;i<3;i++)assert.equal(hookAct(f,()=>{assert.ok(npcAction(f.s,f.master,'personal'));return prostheticNPCTurn(f.s,f.master,hookContext);}),true);assert.equal(hookAct(f,()=>collectPeg(f.s,f.master,hookContext)),true);return f;}
export function fittedHand(f=madeHook()){assert.equal(hookAct(f,()=>fitHand(f.s,f.master,hookContext)),true);return f;}
export function exactHook(f){syncActiveActor(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}
