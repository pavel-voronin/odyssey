import {enabled} from '../rules.js';import {physicalDistance} from '../geometry.js';import {petPack,packPetTrace} from './pack-pet-state.js';
export const petTransfersOn=s=>enabled(s,'pet-transfer')&&enabled(s,'companions');
export const trainedDog=c=>Boolean(c?.id==='dog'&&!c.person&&c.hp>0&&c.petTraining?.lessons.length===3);
export const petPosition=c=>petPack(c)?.body||c?.petCustody?.body||null;
export function custodyNear(s,c,p=s.hero,radius=3){const b=petPosition(c);return (!b||b.area===p.area&&physicalDistance(s.areas[b.area],b.x,p.x)<=radius)&&!p.transit&&!p.roadTransit;}
export function petMemo(h,e){const q=h.petTransfers ||= {version:1,checked:null,lastActionTick:-1,events:[]};q.events.push(e);if(q.events.length>8)q.events.shift();return q;}
export function recordPetCustody(s,c,from,to,amount,kind,position){const q=c.petCustody ||= {version:1,owner:from,lastStep:s.tick,events:[],...(!petPack(c)?{body:{...position}}:{})};q.owner=to;q.lastStep=s.tick;q.events.push({tick:s.tick,from,to,amount,kind,area:position.area});if(q.events.length>8)q.events.shift();if(petPack(c)){c.packCargo.owner=to;c.packCargo.lastKnown={...c.packCargo.body,at:s.tick,reason:'owner-transfer'};}return q;}
export function ownedNPCPet(s,p,uid){return p?.pets?.find(c=>c.uid===uid)||null;}

export function custodyTrace(s,c,reason='owner-lost'){if(petPack(c))return packPetTrace(s,c,reason);const b=petPosition(c),a=s.areas[b?.area];if(!a)return null;const id='pet-owner/'+c.uid;let o=a.objects.find(o=>o.id===id);if(!o){o={id,x:b.x,name:c.name,icon:'pet'};a.objects.push(o);}o.x=b.x;if(c.hp>0){o.kind='encounter';o.encounter='familiar';o.resolved=false;o.existingPet=c;delete o.petBody;}else{o.kind='grave';o.resolved=true;o.petBody=c;delete o.existingPet;}return o;}
