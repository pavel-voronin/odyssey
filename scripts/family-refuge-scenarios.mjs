import assert from 'node:assert/strict';
import {createWorld,createArea,connectAreas,route,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeRefuge} from '../modules/refuge-state.js';
import {refugePersonalPlan} from '../modules/family-refuge.js';
import {migrationsTick,migrationArrived} from '../modules/migrations.js';
import {peopleTick} from '../modules/people.js';
import {extractRaw,takeGoods,initializeGoodsArea} from '../modules/goods.js';
import {syncActiveActor} from '../actor-projection.js';
export const refugeContext={route,knownRoute:route,log(){},gainXp(){},random:()=>.5};
export function refugeFixture({kit=true}={}){
 const flags=['identity','people','npc-control','npc-knowledge','migration-knowledge','migrations','supply','local-food','goods-cycle','service-access'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))});
 for(const p of Object.values(s.people)){p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 const make=(type,name)=>s.areas[createArea(s,type,name,0)],source=make('village','Старый двор'),town=make('village','Родная слобода'),camp=make('camp','Временный привал'),plot=make('forest','Лесной участок');
 for(const a of [town,camp,plot])connectAreas(s,source.id,a.id,{mode:'road',duration:0});
 const add=(area,name,job,parents=[],role='житель')=>{const p=s.people[createPerson(s,{area:area.id,name,role,parents,alive:true},{initialJob:job})];p.area=area.id;p.x=42;p.status='resident';p.health=p.maxHealth||100;p.ailment=null;Object.assign(p.needs,{hunger:0,energy:100,sleeping:false});Object.assign(p.agenda,{task:null,due:1e9,duty:.1});return p;};
 const leader=add(source,'Мира','farmer'),builder=add(source,'Тар','artisan'),child=add(source,'Лин','student',[leader.id,builder.id],'ребёнок'),host=add(town,'Работник','farmer');source.population=[leader.id,builder.id,child.id];town.population=[host.id];
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 // A finite initial checkpoint, not a long hunger life. Preserve the goods ledger.
 initializeGoodsArea(s,source);source.goods.ledger.food.initial+=18-source.civic.food;source.civic.food=18;source.exodus.pressure={since:0,reason:'долгая нехватка еды'};source.exodus.nextAttempt=0;
 if(kit){const raw=extractRaw(s,plot,4);assert.equal(raw,4);builder.goodsRawCargo={quantity:raw,source:plot.id,owner:builder.id};assert.equal(takeGoods(s,source,'tools',1,{flow:'exported',reason:'fixture-owned-tool',actor:builder.id}),1);builder.agenda.tools=1;}
 for(const a of [town,camp,plot,source]){leader.area=a.id;leader.x=a.type==='camp'?68:42;observeNPCPlace(s,leader);}leader.area=source.id;leader.x=42;
 s.hero.goal=null;s.hero.transit=null;s.hero.combat=null;syncActiveActor(s);return {s,source,town,camp,plot,leader,builder,child,host,members:[leader,builder,child]};
}
export function surveyPlot(f){const {s,leader,plot}=f;leader.area=plot.id;leader.x=plot.forage.x;leader.agenda.task=null;leader.agenda.due=0;assert.ok(refugePersonalPlan(s,leader));assert.equal(leader.agenda.task.kind,'refugeSurvey');for(let n=0;n<3;n++){s.tick=Math.floor(s.tick/8)*8+8;peopleTick(s,refugeContext);}assert.ok(plot.refugeSite,'fixture has actual discovered water');leader.area=f.source.id;leader.x=42;leader.agenda.task=null;leader.agenda.due=1e9;return f;}
export function refugeDepart(f){f.s.tick=Math.max(96,Math.ceil(f.s.tick/16)*16);migrationsTick(f.s,refugeContext);return Object.values(f.s.migrations).find(g=>g.source===f.source.id);}
export function refugeNearArrival(f,g){for(const p of f.members){p.area=g.target;p.x=g.refuge.x;p.agenda.task={kind:'resettle',target:g.target,x:g.refuge.x,remaining:1,migration:g.id,knownNavigation:true};assert.ok(migrationArrived(f.s,p));p.agenda.task=null;}f.s.tick+=16;migrationsTick(f.s,refugeContext);return g;}
export function refugeSave(f){syncActiveActor(f.s);return serialize(f.s);}
