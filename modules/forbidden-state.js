import {enabled} from '../rules.js';
import {meatOn,meatBody,meatKnife,knowsGameMeat} from './meat-state.js';
import {adultPerson} from './age-state.js';
import {nutritionView,nutritionProfile} from './nutrition-state.js';
import {authorityAt} from './authority-state.js';
import {physicalDistance} from '../geometry.js';
export const forbiddenOn=s=>enabled(s,'forbidden-food')&&meatOn(s);
export const forbiddenMemory=p=>p.forbiddenFood ||= {version:1,lastAt:-1,work:null,meals:[],reports:[],answers:[]};
export const forbiddenLaw=(a,p,at,culture,origin='charter')=>({version:1,id:a.id+'/flesh-law/1',authority:a.id,officer:p,since:at,origin,rule:culture==='ember'?'permitted':'fine',fine:culture==='ember'?0:6});
export const fleshLawAt=(s,area)=>authorityAt(s,area)?.fleshLaw||null;
export function fleshPermission(s,p){const b=p&&meatBody(s,p);return forbiddenOn(s)&&p?.alive&&adultPerson(s,p)&&!p.returnEpisode&&nutritionProfile(s,b).rate>0&&['human','elf','dwarf','halfling','orc','goblin'].includes(p.race)&&knowsGameMeat(s,p)&&Boolean(p.culture==='ember'||nutritionView(s,b).severe&&(b.personality?.generosity??1)<.15&&(b.personality?.courage??0)>.6);}
export function fleshBody(s,b){return Boolean(b&&s.remains?.byId[b.id]===b&&b.source.kind==='person'&&s.people[b.source.id]?.alive===false&&b.substance?.kind==='organic'&&b.stage==='fresh'&&b.substance.flesh.remaining>0&&!b.carrier&&b.position.kind==='area'&&s.tick-b.death.tick<240);}
export function fleshNear(s,p,b){const h=meatBody(s,p);return fleshBody(s,b)&&h.area===b.position.area&&physicalDistance(s.areas[h.area],h.x,b.position.x)<=2;}
export function fleshChoice(s,p){if(!fleshPermission(s,p)||!meatKnife(s,p))return null;return Object.values(s.remains?.byId||{}).find(b=>fleshNear(s,p,b))||null;}
