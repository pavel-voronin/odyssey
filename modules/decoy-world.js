import {noticeGuard} from './stealth.js';
import {decoysOn} from './decoy-state.js';
import {activeGuard,guardReady,stealthBody,guardSense} from './stealth-state.js';
import {physicalDistance} from '../geometry.js';
export function decoyWorldTick(s){
 if(!decoysOn(s))return;
 for(const a of Object.values(s.areas))for(const o of a.objects){if(o.kind!=='noiseTrap')continue;const item=o.items[0],d=item?.decoy,p=o.decoyPlacement;if(!d||d.state!=='armed'||s.tick<p.due)continue;
  d.state='spent';d.charge=0;const g=activeGuard(s,a.id),heard=Boolean(g&&guardReady(s,g)&&6>=1.2+physicalDistance(a,g.x,o.x)*.3),check=heard&&!g.guardWatch.search&&g.needs.energy>=35&&g.agenda.duty>=.45;
  d.sound={at:s.tick,area:a.id,x:o.x,guard:heard?g.id:null,response:check?'check':heard?'ignore':'unheard',noise:6};o.decoySound={...d.sound};
  if(heard){const q=g.guardWatch;q.history.push({at:s.tick,kind:check?'decoy-check':'decoy-ignore',actor:null,x:o.x,source:item.id});if(q.history.length>12)q.history.shift();if(check){q.search={actor:null,area:a.id,x:o.x,at:s.tick,until:s.tick+24,steps:0,kind:'heard',source:item.id,focusUntil:s.tick+8};g.facing=q.facing=Math.sign(o.x-g.x)||g.facing||1;for(const p of Object.values(s.people)){const b=stealthBody(s,p.id);if(!p.alive||!b||b.area!==a.id||!b.lineage&&!['resident','wandering'].includes(p.status)||physicalDistance(a,b.x,o.x)>2)continue;const sense=guardSense(s,g,p.id,b.x);if(sense.seen)noticeGuard(s,g,p.id,sense,'quiet',b.x);}}}
 }
}
