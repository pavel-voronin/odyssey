import {airshipOn} from './airship-state.js';
// Actual construction only. Existing saves/readers never acquire a craft or skill.
export function createAirship(s,newArea=null){if(s.airships||!airshipOn(s)||s.rules.people===false||!newArea&&(s.hero||s.tick!==0))return;
 const edges=Object.entries(s.edges).filter(([,e])=>e.metric&&e.metric.distance<=96&&[e.a,e.b].every(id=>{const a=s.areas[id];return a.realm==='surface'&&!a.interior&&!a.dungeon;})&&(!newArea||[e.a,e.b].includes(newArea.id))).sort((a,b)=>a[1].metric.distance-b[1].metric.distance||a[0].localeCompare(b[0]));
 for(const [key,e]of edges)for(const id of [e.a,e.b]){const a=s.areas[id],p=(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&['artisan','merchant'].includes(p.agenda.job));if(!p)continue;const pads=Object.fromEntries([e.a,e.b].map(id=>[id,{area:id,x:Number((id===e.a?e.b:e.a).slice(1))>Number(id.slice(1))?100:0}])),uid='airship/'+key;
 s.airships={version:1,byId:{[uid]:{version:1,id:uid,name:'Малый эфирный челнок',owner:p.id,edge:key,pads,body:{kind:'area',...pads[id]},capacity:16,hp:20,charge:72,spent:0,added:0,flight:null,lastAction:-1,history:[],source:{kind:'initial-air-corridor',person:p.id,area:id,at:s.tick,charge:72},refills:[]}}};p.flightTraining={version:1,origin:'initial-pilot',at:s.tick,craft:uid,teacher:null};for(const pad of Object.values(pads))s.areas[pad.area].objects.push({id:uid+'/'+pad.area,kind:'airshipPad',name:'Площадка эфирного челнока',x:pad.x,craft:uid});return;
 }
}
