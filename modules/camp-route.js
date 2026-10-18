import {observeShortcutPerson} from './shortcut-observation.js';
import {isShortcut} from './shortcut-state.js';
import {campPassage,physicalDistance,areaStep} from '../geometry.js';
import {fordDetour} from './fords.js';
import {npcFordGate} from './ford-actors.js';

// The orders controller has already claimed this action and paid its upkeep.
// Only orders touching a real camp use this walk; ordinary timed orders retain
// their previous contract. No new clock, route knowledge, stock or body is made.
export function walkCampOrder(s,p,target,x,ctx,holder={}){
 observeShortcutPerson(s,p);
 if(p.fordCrossing||p.liftTransit||p.roadTransit){const r=npcFordGate(s,p,(p.fordCrossing||p.liftTransit||p.roadTransit).to,(p.fordCrossing||p.liftTransit||p.roadTransit).arrivalX,holder,target);if(r.status==='arrived'){const a=s.areas[p.area];a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);p.area=r.crossing.to;p.x=r.crossing.arrivalX;s.areas[p.area].objects.push({id:'watch-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}return ['aborted','unavailable'].includes(r.status)?'blocked':'walking';}
 const path=fordDetour(s,p,holder,target,ctx.route(s,p.area,target,p));if(!path.length)return 'blocked';
 const a=s.areas[p.area],next=path[1],passage=next&&campPassage(s,a.id,next,p.id);
 if(passage&&!passage.allowed&&(!isShortcut(s,a.id,next)||physicalDistance(a,p.x,passage.x)<=30))return 'blocked';
 const to=next?passage?.x??(Number(next.slice(1))>Number(a.id.slice(1))?100:0):x;
 if(physicalDistance(a,p.x,to)>1){
  const end=p.x+areaStep(a,p.x,to,6);
  if(a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&o.x>=Math.min(p.x,end)&&o.x<=Math.max(p.x,end)))return 'blocked';
  p.facing=Math.sign(to-p.x)||p.facing||1;p.x=end;const body=a.objects.find(o=>o.kind==='resident'&&o.person===p.id);if(body)body.x=p.x;return 'walking';
 }
 if(!next)return 'arrived';
 if(!a.links.includes(next)||!s.areas[next]?.links.includes(a.id))return 'blocked';
 const ford=passage?{status:'clear'}:npcFordGate(s,p,next,to===100?5:95,holder,target);if(ford.status!=='clear'){if(ford.status==='bypass')holder.fordDetour={target,path:ford.path};return ['defer','unavailable','aborted'].includes(ford.status)?'blocked':'walking';}
 a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);
 p.area=next;p.x=passage?.arrival??(to===100?5:95);const b=s.areas[next];
 if(!b.objects.some(o=>o.kind==='resident'&&o.person===p.id))b.objects.push({id:'watch-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
 return 'walking';
}
