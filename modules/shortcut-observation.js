import {shortcutsOn,layoutStair,shortcutKey} from './shortcut-state.js';
import {physicalDistance} from '../geometry.js';
import {observeGrate} from './mechanisms.js';
import {initializeNPCKnowledge,NPC_PLACE_LIMIT,NPC_ROAD_LIMIT} from './npc-knowledge.js';
// Called by the body's existing controller, never by the UI or a distant opener.
export function observeShortcutPerson(s,p){
 if(!shortcutsOn(s)||!p?.alive||p.needs.sleeping||p.fordCrossing||p.liftTransit)return;
 const a=s.areas[p.area];if(!a?.dungeon?.layoutNode)return;
 initializeNPCKnowledge(s,p);const nav=p.navigation,remember=b=>{const old=nav.places.find(n=>n.area===b.id);if(old){old.name=b.name;old.seen=s.tick;}else nav.places.push({area:b.id,name:b.name,seen:s.tick});};remember(a);
 for(const door of a.objects){if(door.kind!=='gate'||!layoutStair(s,a.id,door.to)||physicalDistance(a,p.x,door.x)>30)continue;
  const key=shortcutKey(a.id,door.to);observeGrate(s,p,a.id,door.to);remember(s.areas[door.to]);const r={key,from:a.id,to:door.to,seen:s.tick,layoutRoot:a.dungeon.layoutNode.root,layoutGate:s.edges[key]?.mechanism?key:null},old=nav.roads.find(e=>e.key===key);if(old)Object.assign(old,r);else nav.roads.push(r);
 }
 if(nav.places.length>NPC_PLACE_LIMIT)nav.places.sort((a,b)=>Number(a.area===p.area)-Number(b.area===p.area)||a.seen-b.seen).splice(0,nav.places.length-NPC_PLACE_LIMIT);
 if(nav.roads.length>NPC_ROAD_LIMIT)nav.roads.sort((a,b)=>a.seen-b.seen).splice(0,nav.roads.length-NPC_ROAD_LIMIT);
}
