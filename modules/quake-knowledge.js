import {physicalDistance} from '../geometry.js';
import {quakeKey,quakeDamage} from './quake-state.js';
export function observeRupture(s,p,from,to,{atGate=false}={}){const d=quakeDamage(s,from,to),h=s.hero?.lineage===p?.id?s.hero:s.actorStates?.[p?.id],body=h?.actorMode!=='npc'&&h?.alive?h:p,a=s.areas[body?.area];if(!d||!p?.alive||body.transit||body.roadTransit||![from,to].includes(body.area)||!atGate&&physicalDistance(a,body.x,Number((body.area===from?to:from).slice(1))>Number(body.area.slice(1))?100:0)>24)return false;
 const m=p.ruptureMemory ||= {version:1,known:{}},key=quakeKey(from,to),old=m.known[key];if(old?.state===d.state&&old.cause===d.cause)return false;m.known[key]={key,state:d.state,cause:d.cause,at:s.tick,witness:p.id};const ids=Object.keys(m.known);if(ids.length>24){ids.sort((a,b)=>m.known[a].at-m.known[b].at);delete m.known[ids[0]];}return true;
}

