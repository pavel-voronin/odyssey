import {stealthOn,stealthBody,activeGuard,seesGuard,guardSense,guardAway} from './stealth-state.js';
import {physicalDistance} from '../geometry.js';
export const decoysOn=s=>stealthOn(s)&&s.rules['noise-decoys']!==false&&s.rules.equipment!==false;
export const decoyItems=(s,id)=>{const h=s.hero?.lineage===id?s.hero:s.actorStates?.[id];return h?.bag||s.people[id]?.looseItems||[];};
export const heldDecoy=(s,id,{ready=false}={})=>decoyItems(s,id).find(i=>i.decoy?.version===1&&(!ready||i.decoy.state==='ready'))||null;
export function decoyWalkQuote(s,id,target){
 if(!decoysOn(s))return null;const p=s.people[id],b=stealthBody(s,id),g=b&&activeGuard(s,b.area);if(!p?.alive||!b||!g||!seesGuard(s,id,g)||(b.lineage?b.personality.courage:1-p.agenda.duty)>=.5)return null;
 const a=s.areas[b.area],post=g.guardWatch.post,d=physicalDistance(a,b.x,post.x),crosses=(target-post.x)*(b.x-post.x)<0&&physicalDistance(a,target,post.x)>=8;
 if(!crosses&&!p.stealth?.active||d>20)return null;
 const placed=a.objects.find(o=>o.kind==='noiseTrap'&&o.decoyPlacement.by===id&&physicalDistance(a,b.x,o.x)<=20&&s.tick-o.decoyPlacement.at<=8);
 const item=heldDecoy(s,id,{ready:true}),known=p.stealth?.known.some(k=>k.guard===g.id&&k.post===post.id);
 if(!placed&&item&&known&&d>=14&&!guardAway(s,g.guardWatch)&&!guardSense(s,g,id,b.x,{quiet:true}).seen)return {mode:'decoy-set',item:item.id};return null;
}
