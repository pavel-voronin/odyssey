import {suspendRoadFight} from '../modules/road-contacts.js';
// Prepared positions/energy checkpoints; actual constructors and bounded actions, not a life-frequency sample.
import {mapFixture} from './map-scales-scenarios.mjs';
import {step,serialize,restore,connectAreas,createEnemy,log,route,knownRoute} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';import {setModule} from '../rules.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';import {startPublicJourney,advancePublicJourney} from '../modules/public-journeys.js';
export const publicRoadContext={log,route,knownRoute};
export function roadStopFixture({stop=false,peer=false,peerReverse=true,gap=42}={}){
 const f=mapFixture(),{s,h,area}=f,from=peer?area('capital'):area('crossroads'),to=peer?area('center'):area('capital');connectAreas(s,from.id,to.id,{metric:{version:1,unit:'world',distance:gap,terrain:'road',speed:6}});h.area=from.id;h.x=100;Object.assign(h.inventory,{herbs:0,relics:0,rations:0});h.bag=[];h.goal={kind:'explore',area:to.id,x:5};syncActiveActor(s);
 let p,j;if(peer){for(const flag of ['npc-travel','npc-knowledge','npc-control'])setModule(s,flag,true);const pSource=peerReverse?to:from,pTarget=peerReverse?from:to;p=Object.values(s.people).find(p=>p.area===pSource.id&&p.id!==h.lineage&&p.alive&&p.role!=='ребёнок'&&p.agenda);Object.assign(p,{area:pTarget.id,x:42,status:'resident',health:p.maxHealth||100});p.agenda.task=null;p.needs={...p.needs,energy:100,hunger:0,sleeping:false};p.navigation={version:1,places:[],roads:[]};observeNPCPlace(s,p);p.area=pSource.id;p.x=Number(pTarget.id.slice(1))>Number(pSource.id.slice(1))?100:0;observeNPCPlace(s,p);j=startPublicJourney(s,p,pSource,{place:{area:pTarget.id}},publicRoadContext);if(!j)throw Error('No actual public traveller');}
 const tick=()=>{step(s);if(j)advancePublicJourney(s,j,publicRoadContext);};for(let n=0;n<3;n++)tick();
 if(h.transit?.metric.travelled!==12)throw Error('No actual road prefix');
 if(stop){for(const flag of ['fieldcamp','camp-sites'])setModule(s,flag,true);h.energy=18;if(p)p.needs.energy=18;syncActiveActor(s);for(let n=0;n<3;n++)tick();}
 return {...f,from,to,p,j,tick,site:h.roadStop&&s.areas[h.roadStop.site],camp:s.areas[h.area]};
}
export const exactRoadCopy=s=>restore(serialize(s));

export function localRoadFixture({enemy=false,merchant=false}={}){const f=mapFixture(),{s,h,area}=f;h.area=merchant?s.merchant.area:area('crossroads').id;h.x=54;h.goal={kind:'explore',area:merchant?area('hollow').id:area('capital').id,x:5};h.gold=merchant?7:0;h.weapon=3;h.armor=1;Object.assign(h.inventory,{potions:0,relics:0,herbs:0,rations:0});h.bag=[];h.personality.courage=1;if(merchant)setModule(s,'service-access',true);const threat=enemy?createEnemy(s,s.areas[h.area],{x:58,hp:25,maxHp:25,attack:1,patrol:0}):null;syncActiveActor(s);return {...f,enemy:threat};}

export function deathRoadFixture(){const f=localRoadFixture({enemy:true}),{s,h,enemy}=f;h.hp=1;h.weapon=0;h.armor=0;enemy.hp=enemy.maxHp=100;enemy.attack=20;suspendRoadFight(s,enemy);h.combat=enemy.id;s.rng=Math.imul((0xffffffff-1013904223)>>>0,4276115653)>>>0;syncActiveActor(s);return f;}
