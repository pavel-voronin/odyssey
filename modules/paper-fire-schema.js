import {fragmentInfo} from './paper-fragment-state.js';
export function validatePaperFires(s,fail,items=[]){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 if(s.paperFires){if(s.paperFires.version!==1||!s.paperFires.events||typeof s.paperFires.events!=='object'||Array.isArray(s.paperFires.events))fail('paperFires');for(const [id,e]of Object.entries(s.paperFires.events))if(e.id!==id||!id.startsWith('paper-fire/')||!tick(e.at)||!s.areas[e.area]||!['hearth-spark','building-fire'].includes(e.kind)||typeof e.source!=='string'||!Array.isArray(e.damaged)||!e.damaged.length||new Set(e.damaged.map(d=>d.item)).size!==e.damaged.length||e.damaged.some(d=>typeof d.item!=='string'||!s.areas[d.area]||!['fragment','lost'].includes(d.mode)))fail('paperFires.event');}
 for(const item of items){const c=item.textCopy;if(!c)continue;const f=c.fireResidue,d=c.damage,r=c.salvaged;
  if(d?.kind==='paper-fire'){const event=s.paperFires?.events[d.cause],work=s.literature?.works[c.content];if(!work||!event||!tick(d.tick)||event.at!==d.tick||!event.damaged.some(e=>e.item===item.id&&e.area===d.area&&e.mode===f?.mode)||f?.version!==1||!['fragment','lost'].includes(f.mode)||f.mode==='lost'&&f.info!==null||f.mode==='fragment'&&JSON.stringify(f.info)!==JSON.stringify(fragmentInfo(work)))fail(item.id+'.fireResidue');}
  else if(f)fail(item.id+'.fireResidue');
  if(r&&(!tick(r.at)||!s.people[r.by]||!s.paperFires?.events[r.cause]?.damaged.some(d=>d.item===item.id)||typeof r.result!=='string'||r.result===item.id||typeof r.source!=='string'||!['full','fragment'].includes(r.mode)||r.mode==='fragment'&&r.source!==item.id))fail(item.id+'.salvaged');
 }
}
