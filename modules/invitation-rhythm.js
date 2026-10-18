import {enabled} from '../rules.js';

export const INVITATION_PAUSE=720;
export const OFFER_WINDOW=1200;
export const OFFER_LIMIT=4;
const LIMIT=64;
const active=s=>enabled(s,'invitation-rhythm');
const record=(s,kind,key)=>s.hero.invitationRhythm?.offers?.find(o=>o.kind===kind&&o.key===key);
function state(s){return s.hero.invitationRhythm ||= {version:1,offers:[],starts:[],nextStart:0};}

// Queries never draw randomness or invent a past invitation on old saves.
// The domain owner still checks actual trust, affinity, route and preparation.
export function invitationAllowed(s,kind,key,{continuation=false,urgent=false}={}){
 if(!active(s)||continuation||urgent)return true;
 const r=s.hero.invitationRhythm;
 if(r&&r.version!==1)return false;
 const old=record(s,kind,key);
 if(old)return old.status==='pending'&&s.tick>=(r.nextStart||0);
 if(r&&(r.offers.length>=LIMIT||s.tick<(r.nextStart||0)||r.offers.filter(o=>s.tick-o.tick<OFFER_WINDOW).length>=OFFER_LIMIT))return false;
 return true;
}
export function offerInvitation(s,kind,key){
 if(!active(s))return true;
 if(!invitationAllowed(s,kind,key))return false;
 const r=state(s);
 if(!record(s,kind,key))r.offers.push({kind,key,tick:s.tick,status:'pending'});
 return true;
}
export function declineInvitation(s,kind,key){
 if(!active(s))return;
 const o=record(s,kind,key);if(o?.status==='pending'){o.status='declined';o.ended=s.tick;}
}
export function startInvitation(s,kind,key){
 if(!active(s)||s.hero.invitationRhythm&&s.hero.invitationRhythm.version!==1)return;
 const r=state(s),old=record(s,kind,key);
 if(old?.status==='started')return;
 if(!old&&r.offers.length>=LIMIT)return;
 // An actual transition is never cancelled by a proposal budget. It can be a
 // promised route or the sole exit; record its fact even when no offer was due.
 if(!old&&r.offers.length<LIMIT)r.offers.push({kind,key,tick:s.tick,status:'started',started:s.tick});
 else if(old){old.status='started';old.started=s.tick;}
 r.starts.push({kind,key,tick:s.tick});if(r.starts.length>24)r.starts.shift();
 r.nextStart=s.tick+INVITATION_PAUSE;
}

// Only the attraction of a fresh exotic destination changes. Existing edges,
// ordinary path finding, accepted goals and returning through a gate stay real.
export function exoticInvitationPenalty(s,area){
 if(!active(s)||s.hero.memory.places.includes(area.id))return 0;
 const from=s.hero.area,key=[from,area.id].sort().join('|'),edge=s.edges?.[key];
 if(!edge||!['portal','time'].includes(edge.mode))return 0;
 return invitationAllowed(s,edge.mode,key)?0:12;
}
