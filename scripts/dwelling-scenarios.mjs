import assert from 'node:assert/strict';
import {foundationFixture,foundationSteps,foundationContext} from './foundation-scenarios.mjs';
import {setModule} from '../rules.js';import {homeBuildingNPCTask,homeBuildingNPCAction,homeBuildingPlan,homeBuildingAction} from '../modules/home-building.js';
import {extractRaw,deliverRaw} from '../modules/goods.js';import {setActorMoney,syncActiveActor} from '../actor-projection.js';import {npcAction} from '../modules/npc-control.js';import {serialize} from '../engine.js';
export const dwellingContext={...foundationContext,goal:(s,kind,area,x,title,reason,extra)=>s.hero.goal={kind,area,x,title,reason,...extra},maySpend:()=>true};
export function finiteSavings(s,p,amount){const h=s.hero.lineage===p.id?s.hero:s.actorStates[p.id],current=h?.actorMode!=='npc'&&h?h.gold:p.agenda.wealth;let need=Math.max(0,amount-current);for(const a of Object.values(s.areas)){if(!a.civic)continue;const n=Math.min(a.civic.treasury,need);a.civic.treasury-=n;need-=n;if(!need)break;}assert.equal(need,0);setActorMoney(s,p,amount);}
export function dwellingFixture({family=false,hire=false}={}){
 const f=foundationSteps(foundationFixture(),4),{s,a,leader:owner,builder}=f;for(const k of ['home-building','homes','interiors','lodging','containers'])setModule(s,k,true);owner.needs.energy=100;owner.needs.hunger=0;owner.housePreference='family';Object.assign(owner.agenda,{task:null,due:0,duty:hire?.2:.9});finiteSavings(s,owner,family?70:22);
 const raw=extractRaw(s,a,family?6:4);assert.equal(raw,family?6:4);owner.goodsRawCargo={quantity:raw,owner:owner.id,source:a.id};owner.x=42;assert.equal(deliverRaw(s,a,owner,raw),raw);
 for(const p of [builder,f.child]){p.agenda.task=null;p.agenda.due=1e9;p.needs.energy=100;p.needs.hunger=0;}return {...f,owner,worker:builder};
}
// Prepared physical workplace checkpoints, each followed by one real native owner act.
export function dwellingTurn(f,p=f.owner,expected=null){const active=p.agenda.task?.dwelling&&['work','gather'].includes(p.agenda.task.houseStage)&&(!expected||p.agenda.task.houseStage===expected)?p.agenda.task:null;if(!active)p.agenda.task=null;const t=active||homeBuildingNPCTask(f.s,p);assert.ok(t,'available dwelling act');if(expected)assert.equal(t.houseStage,expected);p.area=t.target;p.x=t.x;f.s.tick=Math.floor(f.s.tick/8)*8+8;assert.equal(npcAction(f.s,p,'personal'),true);assert.equal(homeBuildingNPCAction(f.s,p),true);return t;}
export function buildSelfDwelling(f=dwellingFixture()){for(const stage of ['allocate','start','supply'])dwellingTurn(f,f.owner,stage);const n=f.a.dwellingPlot.project.required;for(let i=0;i<n;i++)dwellingTurn(f,f.owner,'work');return f;}
export function hireDwelling(f=dwellingFixture({family:true,hire:true})){for(const stage of ['allocate','start','supply','offerWork'])dwellingTurn(f,f.owner,stage);dwellingTurn(f,f.worker,'acceptWork');return f;}
export function actorDwellingTurn(f,expected=null){const {s}=f;s.hero.goal=null;assert.equal(homeBuildingPlan(s,dwellingContext),true);const g=s.hero.goal;if(expected)assert.equal(g.houseStage,expected);s.hero.area=g.area;s.hero.x=g.x;s.tick++;assert.equal(homeBuildingAction(s,dwellingContext),true);syncActiveActor(s);return g;}
export function dwellingSave(f){syncActiveActor(f.s);return serialize(f.s);}
