import {physicalDistance} from '../geometry.js';
export const navigationToolsOn=s=>s.rules?.['navigation-tools']!==false&&s.rules?.equipment!==false;
export const isRopeItem=i=>i?.kind==='fieldTool'&&i.base==='rope'&&i.rope?.version===1;
export function ownedRope(s,h=s.hero){return h.bag.find(isRopeItem)||null;}
export function ropeKnots(s,id=s.hero.lineage){return s.people[id]?.toolPractice?.rope?.lessons?.length>=2;}
export function descentObjects(s,area){return s.areas[area]?.objects.filter(o=>o.kind==='descent'&&o.descent?.version===1)||[];}
export function attachedRope(o){return o?.items?.find(i=>isRopeItem(i)&&i.rope.attached?.anchor===o.id)||null;}
export function visibleDescent(s,o){const h=s.hero;return !h.transit&&s.areas[h.area]?.objects.includes(o)&&physicalDistance(s.areas[h.area],h.x,o.x)<=30;}
export function usableAnchor(o){return o?.descent?.anchor?.intact===true;}
export function ropeBusy(s,id,except=s.hero.lineage){const actors=new Map(Object.entries(s.actorStates||{}));actors.set(s.hero.lineage,s.hero);return [...actors.values()].some(h=>h.lineage!==except&&h.alive&&h.goal?.rope===id&&['ropeCross','ropePull','ropePractice'].includes(h.goal.kind));}
