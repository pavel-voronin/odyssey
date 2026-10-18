import {enabled} from '../rules.js';
import {selfDrivenActor,actorPartyLeader,detailedActors} from '../actor-projection.js';
import {rootWorld} from '../world-ref.js';
import {pendingMaterialContract} from './material-delivery-state.js';
import {partyBodySpent,PARTY_PASSIVE_PHASES} from './party-combat-policy.js';
const indexes=new WeakMap();
export function invalidateNPCControl(s){indexes.delete(rootWorld(s));}
function claims(input){
 const s=rootWorld(input),actors=detailedActors(s),parties=actors.filter(h=>selfDrivenActor(s,h)).map(h=>h.companions),arrays=[...parties,s.society.orders,s.logistics.convoys,s.society.journeys];let cache=indexes.get(s);
 if(!cache||cache.tick!==s.tick||arrays.length!==cache.arrays.length||arrays.some((a,i)=>cache.arrays[i]!==a||cache.lengths[i]!==a.length)){
  const owners=new Map(actors.filter(h=>selfDrivenActor(s,h)).map(h=>[h.lineage,'actor']));
  for(const party of parties)for(const c of party)if(c.person&&!owners.has(c.person))owners.set(c.person,'party');
  for(const [records,owner]of [[s.society.orders,'orders'],[s.logistics.convoys,'caravan'],[s.society.journeys,'journey']])for(const r of records)if(r.person&&!owners.has(r.person))owners.set(r.person,owner);
  cache={tick:s.tick,arrays,lengths:arrays.map(a=>a.length),owners};indexes.set(s,cache);
 }
 return cache.owners;
}
export function npcController(s,p){
 if(p?.alive&&['holding','returning'].includes(p.mechanismDuty?.stage))return 'mechanism';
 if(!p?.alive)return 'none';const owner=claims(s).get(p.id);if(owner)return owner;
 if(!['resident','wandering'].includes(p.status))return 'none';const m=s.migrations?.[p.migration];if(m?.status==='active'&&m.members.includes(p.id)&&!m.arrivals[p.id])return 'migration';return 'personal';
}
export function npcControlledBy(s,p,owner){if(selfDrivenActor(s,p?.id))return owner==='actor';if(actorPartyLeader(s,p?.id))return owner==='party';return !enabled(s,'npc-control')||npcController(s,p)===owner;}
export function canStartNPCActivity(s,p){if(partyBodySpent(s,p)||selfDrivenActor(s,p?.id)||actorPartyLeader(s,p?.id))return false;const delivery=p&&pendingMaterialContract(rootWorld(s),p.id);if(delivery?.carrier===p.id&&delivery.status!=='quoted')return false;return !enabled(s,'npc-control')||p?.actionControl?.tick!==s.tick;}
export function markNPCDeparture(s,p,owner){if(enabled(s,'npc-control'))p.actionControl={tick:s.tick,owner,phases:['depart']};}
export function npcAction(s,p,owner,phase='act'){
 if(partyBodySpent(s,p)&&!PARTY_PASSIVE_PHASES.includes(phase))return false;
 if(selfDrivenActor(s,p?.id)&&owner!=='actor')return false;
 if(actorPartyLeader(s,p?.id)&&owner!=='party')return false;
 if(!enabled(s,'npc-control'))return true;if(npcController(s,p)!==owner)return false;
 if(p.actionControl?.tick!==s.tick)p.actionControl={tick:s.tick,owner,phases:[]};const c=p.actionControl;
 if(c.owner!==owner||c.phases.includes(phase)||c.phases.length>=4)return false;c.phases.push(phase);return true;
}
