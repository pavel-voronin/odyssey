import {acceptQuest,planQuest} from '../modules/quests.js';
import {createWorld,serialize} from '../engine.js';import {MODULES,setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';import {recordAreaVisit} from '../actor-atlas.js';
import {recordLocalWound} from '../modules/wound-events.js';import {woundActivity} from '../modules/wound-state.js';import {woundsTick} from '../modules/wound-world.js';
export const infectionContext={log(){},cancelWeapon(){},knownRoute(s,from,to){return from===to?[from]:s.areas[from].links.includes(to)?[from,to]:[];},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;}};
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export function infectionController(s,p,enemy,label='infection-impact'){const id=JSON.stringify([p.id,s.tick,enemy.id,label]);return hash(s.seed+'/'+id)%4===0?label+'A':label;}
export function infectionFixture({medicine=0,herbs=0,urgent=false}={}){
 const flags=['local-wounds','wound-care','wound-infection','body','identity','people','npc-control','districts','origins','birthplaces'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,p=s.people[h.lineage],a=Object.values(s.areas).find(a=>a.objects.some(e=>e.kind==='enemy')),enemy=a.objects.find(e=>e.kind==='enemy');
 Object.assign(h,{area:a.id,x:enemy.x,race:'human',hp:65,maxHp:100,energy:100,hunger:0,conditions:[],companions:[],quests:[],habits:[],combat:null,transit:null,goal:null});p.race='human';p.anatomy={parts:['leftLeg']};enemy.species='wolf';enemy.damageType='cut';h.stories.active=null;h.destiny.completed=true;h.gold=0;h.personality.courage=.3;h.inventory.herbs=herbs;p.roadSupplies={food:0,medicine};recordAreaVisit(s,a);syncActiveActor(s);
 if(urgent){setModule(s,'quests',true);const town=s.areas.a1,supplier=Object.values(s.areas).find(b=>b.id!==town.id&&b.civic?.food>55);town.civic.food=30;recordAreaVisit(s,supplier);h.area=town.id;h.x=42;h.goal={peaceful:true};acceptQuest(s,infectionContext);const q=h.quests[0];if(!q?.deadline)throw Error('No actual dated accepted offer');s.tick=q.deadline-8;h.area=a.id;h.x=enemy.x;}
 // One explicit already-debited impact checkpoint. Pick its source label before
 // recording, so the existing deterministic composition yields a cut, not a bruise.
 const controller=infectionController(s,p,enemy);
 const w=recordLocalWound(s,p,enemy,{before:100,after:65,maximum:100,area:a.id,controller});if(w?.kind!=='cut')throw Error('Prepared physical cut absent');for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}if(urgent)planQuest(s,h.quests[0],infectionContext);else h.goal={kind:'work',area:a.id,x:h.x,job:'dock',remaining:4,started:s.tick};syncActiveActor(s);return {s,h,p,w,a,enemy,calls:[]};
}
export function infectionPhases(f,count,{rest=false,role='leg'}={}){
 for(let i=0;i<count;i++){woundActivity(f.s,f.p,role,rest);f.s.tick++;woundsTick(f.s,{bleed(p,h,amount,damage){f.calls.push({tick:f.s.tick,amount,damage});if(h)h.hp=Math.max(0,h.hp-amount);else p.health=Math.max(0,p.health-amount);}});}return f;
}
export function infectionSave(f){syncActiveActor(f.s);return serialize(f.s);}
