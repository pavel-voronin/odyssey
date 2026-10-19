import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {roomAdmission} from './room-state.js';
import {textActor,textsOn} from './text-state.js';
export const librariesOn=s=>enabled(s,'libraries')&&textsOn(s)&&enabled(s,'homes')&&enabled(s,'interiors')&&enabled(s,'lodging');
export const fundChest=a=>a?.objects.find(o=>o.id===a.home?.chest&&o.kind==='homeChest')||null;
export const bookFund=a=>fundChest(a)?.library||null;
export const activeBookLoan=i=>i?.libraryLoan?.version===1&&i.libraryLoan.returned===null;
export const libraryPosition=(s,p)=>textActor(s,p?.id)||(p?.alive?personLocation(s,p.id):null);
export function libraryHere(s,p,a){const h=textActor(s,p?.id),b=p?.alive&&libraryPosition(s,p);return Boolean(librariesOn(s)&&a?.home?.state==='ready'&&b&&!b.transit&&b.area===a.id&&physicalDistance(a,b.x,56)<=6&&roomAdmission(s,a,p.id)&&!h?.combat&&!p.needs.sleeping&&(h?h.energy:p.needs.energy)>=30&&(h?h.hunger:p.needs.hunger)<60&&(p.textCraft?.lastActionTick??-1)<s.tick);}
export function borrowedReading(s,p,item){const q=item?.libraryLoan,f=bookFund(s.areas[q?.source]);return Boolean(activeBookLoan(item)&&q.borrower===p.id&&f?.copies.includes(item.id)&&f.owner===item.textCopy.owner);}
export function libraryMembership(s,id){for(const a of Object.values(s.areas))if(bookFund(a)?.copies.includes(id))return a;return null;}
