import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createWorld,step,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {weatherAt} from '../modules/weather.js';
import {sceneCamera,cameraPoint} from '../scene-camera.js';
import {syncActiveActor} from '../actor-projection.js';
const views=['appearance','scenery','facades','lighting','color-profile','scene-planes','animation','camera-probe','effects'];
function generateRoad(seed){
 const s=createWorld(seed);for(const m of MODULES)setModule(s,m.id,false);setModule(s,'travel',true);setModule(s,'long-roads',true);
 const h=s.hero,parent=s.areas.a2;Object.assign(h,{area:parent.id,x:20,energy:100,hunger:0,hp:h.maxHp,combat:null,transit:null,goal:{kind:'expand',area:parent.id,x:20}});step(s);
 const road=Object.values(s.areas).find(a=>a.roadProfile==='long-tract');if(!road)return null;
 Object.assign(h,{area:road.id,x:5,goal:{kind:'expand',area:road.id,x:5}});step(s);
 const right=road.links.find(id=>Number(id.slice(1))>Number(road.id.slice(1))&&(s.edges[[road.id,id].sort().join('|')]?.mode||'road')==='road');
 if(!right)return null;return {s,road:road.id,left:parent.id,right};
}
export function roadCase({length=260,direction=1,weather='clear',threat=false}={}){
 let found;for(let seed=0;seed<64;seed++){
  const candidate=generateRoad(seed);if(!candidate)continue;const{s}=candidate;s.tick=weather==='snow'?14400:0;setModule(s,'climate',true);setModule(s,'weather',weather!=='clear');
  if(weatherAt(s,s.areas[candidate.road]).id!==weather)continue;found=candidate;break;
 }
 if(!found)throw Error('No deterministic road/weather specimen: '+weather);
 const {s}=found,h=s.hero,a=s.areas[found.road];a.length=length;for(const id of views)setModule(s,id,true);
 Object.assign(h,{area:a.id,x:direction>0?0:100,energy:100,hp:h.maxHp,hunger:0,distance:0,combat:null,transit:null,lastAction:'idle',speech:'',goal:{kind:'routeWait',area:direction>0?found.right:found.left,x:42,until:100000},intent:'Пройти знакомую дорогу',reason:'Контрольный маршрут: тот же герой и те же объекты.'});h.facing=direction;
 if(threat)a.objects.push({id:a.id+'-comparison-guard',kind:'enemy',name:'Дорожный дозорный',shape:'guard',x:direction>0?70:30,hp:10,maxHp:10,attack:1,alive:true,patrol:0});syncActiveActor(s);return {...found,s,h,a};
}
const visible=(s,a,o,width=390)=>{const c=sceneCamera(s,a,width),p=cameraPoint(c,24+o.x/100*(c.worldWidth-48),140);return p.x>=0&&p.x<=width;};
export function compareTrip(options){
 const {s,h,a}=roadCase(options),target=h.goal.area,start=s.tick,initialEnergy=h.energy,initialVisits=s.areas[target].visits,initialObjectCount=a.objects.length,initialGold=h.gold;
 const firstSeen={};let ticks=0,walkTicks=0,emptyViewTicks=0;
 while(h.area===a.id&&h.alive&&ticks<300){
  const objects=a.objects.filter(o=>o.kind==='loot'&&!o.taken||o.kind==='herb'&&o.count>0||o.kind==='encounter'&&!o.resolved||o.kind==='enemy'&&o.alive);
  let inView=0;for(const o of objects)if(visible(s,a,o)){inView++;firstSeen[o.id]??=ticks;}if(!inView)emptyViewTicks++;
  const distance=h.distance;step(s);ticks++;if(h.area===a.id&&h.distance>distance)walkTicks++;
 }
 assert.equal(h.area,target);assert.equal(s.areas[target].visits-initialVisits,1);assert.equal(h.gold,initialGold);assert.equal(a.objects.length,initialObjectCount);
 const out={length:a.length,direction:options.direction||1,weather:weatherAt(s,a).id,seed:s.seed,ticks:s.tick-start,walkTicks,distance:h.distance,energySpent:initialEnergy-h.energy,objects:initialObjectCount,firstSeen,emptyViewTicks,transitions:1};
  assert.ok(Math.abs(out.distance-a.length)<=1+1e-6);return out;
}
export function compareThreat(options){
 const {s,h,a}=roadCase({...options,threat:true}),enemy=a.objects.find(o=>o.id.endsWith('-comparison-guard')),hp=h.hp;let firstVisible=null,contact=null,firstViewSave;
 for(let i=0;i<100&&h.alive;i++){
  if(firstVisible===null&&visible(s,a,enemy)){firstVisible=i;firstViewSave=serialize(s);}if(h.combat===enemy.id){contact=i;break;}assert.equal(h.hp,hp);step(s);
 }
 assert.ok(firstVisible!==null&&contact!==null&&firstVisible<contact);
 return {row:{length:a.length,direction:options.direction||1,firstVisible,contact,leadTicks:contact-firstVisible,hpBeforeContact:h.hp},firstViewSave,contactSave:serialize(s)};
}
export async function runComparison(){
 const trips=[],threats=[];for(const weather of ['clear','rain','snow'])for(const direction of [1,-1]){
  const pair=[100,260].map(length=>compareTrip({length,direction,weather}));assert.equal(pair[0].objects,pair[1].objects);assert.ok(pair[1].ticks>pair[0].ticks);assert.ok(pair[1].energySpent>pair[0].energySpent);trips.push(...pair);
 }
 for(const direction of [1,-1])for(const length of [100,260]){const result=compareThreat({length,direction});threats.push(result.row);if(direction===1&&length===260){await writeFile('artifacts/road-threat-visible-life.json',result.firstViewSave);await writeFile('artifacts/road-threat-contact-life.json',result.contactSave);}}
 for(const length of [100,260]){const {s,h,a}=roadCase({length});h.x=50;h.goal={kind:'routeWait',area:a.id,x:50,until:100000};h.lastAction='idle';s.tick=100;syncActiveActor(s);await writeFile(`artifacts/road-perf-${length}-life.json`,serialize(s));}
 const report={trips,threats,scope:'Prepared matched route, not a frequency or player-interest sample. Visibility means object anchor inside viewport, not GPU occlusion.'};await writeFile('artifacts/road-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await runComparison();
