import {enabled} from '../rules.js';import {petPosition} from './pet-custody-state.js';import {knownArea,knownRoad} from '../actor-atlas.js';
export const petPassageOn=s=>enabled(s,'pet-passage')&&enabled(s,'companions');
export const passagePet=s=>s.hero.companions.find(c=>c.id==='dog'&&!c.person&&c.hp>0&&petPosition(c));
export function petEdgeAllows(s,from,to){const a=s.areas[from],b=s.areas[to],e=s.edges[[from,to].sort().join('|')];return Boolean(a&&b&&e?.mode==='road'&&a.realm===b.realm&&!a.interior&&!b.interior&&!a.temporaryCamp&&!b.temporaryCamp&&!e.ford&&!e.mechanism&&!e.lift);}
export function knownPetRoute(s,from,to,avoid=null){if(!s.areas[from]||!s.areas[to]||!knownArea(s,to))return [];const q=[from],parent={[from]:null};for(let i=0;i<q.length;i++)for(const id of s.areas[q[i]].links)if(!(id in parent)&&knownArea(s,id)&&knownRoad(s,q[i],id)&&!avoid?.(id)&&petEdgeAllows(s,q[i],id)){parent[id]=q[i];q.push(id);}if(!(to in parent))return [];const out=[];for(let id=to;id!==null;id=parent[id])out.push(id);return out.reverse();}
export const petRouteDeferred=(s,to)=>petPassageOn(s)&&passagePet(s)&&s.hero.petPassage?.deferred?.target===to&&s.hero.petPassage.deferred.until>s.tick;
export function passageState(h){return h.petPassage ||= {version:1,lastActionTick:-1,deferred:null,memories:[]};}
export function boardingMemory(h,uid){return h.petPassage?.memories.find(m=>m.uid===uid&&m.state!=='retrieved')||null;}

export function petPassageEntered(s){if(!petPassageOn(s))return;for(const m of s.hero.petPassage?.memories||[])if(m.state!=='retrieved'&&!m.departed&&s.hero.area!==m.area){m.departed=true;m.departedAt=s.tick;}}
