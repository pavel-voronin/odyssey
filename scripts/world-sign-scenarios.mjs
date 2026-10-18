import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {interiorFixture} from './interiors-scenarios.mjs';
import {lodgingFixture} from './lodging-scenarios.mjs';
const directory='artifacts/world-signs-94';await mkdir(directory,{recursive:true});
function graphics(s){for(const id of ['world-signs','scene-planes','lighting','contour-shadows','source-shadows','camera-probe','scenery','facades','color-profile','appearance','lineage'])setModule(s,id,true);}
const rows=[];
async function capture(s,id){await writeFile(`${directory}/${id}.state.json`,serialize(s));return id+'.state.json';}
{
 const {s,h,d,hall}=interiorFixture();graphics(s);h.x=d.x;h.speech='';syncActiveActor(s);await capture(s,'exterior.before');step(s);assert.equal(h.area,hall.id);await capture(s,'hall-entry.after');rows.push({id:'exterior-to-hall',before:'exterior.before.state.json',after:'hall-entry.after.state.json',tick:s.tick});
 let found=false;for(let i=0;i<150;i++){const before=serialize(s),area=h.area;step(s);if(area===hall.id&&h.area==='a1'){await writeFile(`${directory}/outside-return.before.state.json`,before);await capture(s,'outside-return.after');found=true;break;}}assert.ok(found);
}
{
 const {s,h,hall,room}=lodgingFixture();graphics(s);h.speech='';syncActiveActor(s);let entered=false,left=false;
 for(let i=0;i<300;i++){
  const before=serialize(s),area=h.area;step(s);
  if(!entered&&area===hall.id&&h.area===room.id){entered=true;await writeFile(`${directory}/room-entry.before.state.json`,before);await capture(s,'room-entry.after');rows.push({id:'hall-to-room',before:'room-entry.before.state.json',after:'room-entry.after.state.json',tick:s.tick});}
  if(entered&&area===room.id&&h.area===hall.id){left=true;await writeFile(`${directory}/hall-return.before.state.json`,before);await capture(s,'hall-return.after');rows.push({id:'room-to-hall',before:'hall-return.before.state.json',after:'hall-return.after.state.json',tick:s.tick});break;}
 }assert.ok(entered&&left,'real booking, rest and return');
 s.tick=210;h.area=room.id;h.x=30;h.goal={kind:'routeWait',area:room.id,x:h.x,until:100000};h.intent='Наблюдение за гостевой';h.speech='';syncActiveActor(s);await capture(s,'room-night');
 h.area='a1';h.x=s.areas.a1.objects.find(o=>o.kind==='tavern').x;h.goal={kind:'routeWait',area:h.area,x:h.x,until:100000};syncActiveActor(s);await capture(s,'exterior-night');
 const d=s.areas.a1.objects.find(o=>o.kind==='tavern');d.closed=true;await capture(s,'exterior-closed');
}
await writeFile(`${directory}/routes.json`,JSON.stringify({rows,notes:['Snapshots bracket actual engine.step transitions with the same body, existing doors and real paid lodging.','Night and closed variants are explicit prepared visual controls, not a claim of their natural frequency.']},null,2));console.log(directory);
