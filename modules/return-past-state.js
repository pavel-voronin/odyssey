import {enabled} from '../rules.js';
import {returnsOn} from './return-state.js';
import {authorityBody} from './authority-state.js';
import {relatedPeople} from './npc-contacts.js';
import {physicalDistance} from '../geometry.js';
import {npcController} from './npc-control.js';
export const returnPastOn=s=>returnsOn(s)&&enabled(s,'relationships');
export const returnPastMemory=p=>p.returnEpisode.past ||= {version:1,contacts:[]};
export function oldReturnRecognition(s,p,other){const death=s.remains?.byId[p.returnEpisode?.body]?.death.tick,h=s.actorStates?.[p.id],r=h?.relations[other.id];if(relatedPeople(p,other))return {kind:'kin',at:death};if(r&&r.met<=death)return {kind:'old-meeting',at:r.met};const n=other.navigation?.contacts?.find(n=>n.person===p.id&&n.seen<=death);if(n)return {kind:'personal-memory',at:n.seen};return null;}
export function returnPastNear(s,p,other){const b=authorityBody(s,p.id);return Boolean(p.alive&&['actor','personal'].includes(npcController(s,p))&&other?.alive&&b&&!b.transit&&!b.combat&&!p.roadTransit&&other.area===b.area&&physicalDistance(s.areas[b.area],b.x,other.x)<=6);}
export function returnServiceRefusal(s,provider,person){return Boolean(s.people[person]?.returnEpisode?.past?.contacts.find(n=>n.person===provider&&n.stance==='afraid'));}
