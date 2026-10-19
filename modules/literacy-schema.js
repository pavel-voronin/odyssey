import {TEXT_LANGUAGES} from './literacy-state.js';
import {validSequence} from './sequence-memory.js';
export function validateLiteracy(s,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,list=a=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(id=>TEXT_LANGUAGES.includes(id));
 for(const p of Object.values(s.people)){
  const l=p.literacy,key=p.id+'.literacy';
  if(l!==undefined){
   if(l?.version!==1||!TEXT_LANGUAGES.includes(l.native)||!list(l.reading)||!list(l.writing)||!list(l.spoken)||!l.spoken.includes(l.native)||!l.origin||!integer(l.origin.tick)||l.origin.tick>s.tick||typeof l.origin.kind!=='string'||!list(l.origin.reading)||!list(l.origin.writing)||!list(l.origin.spoken)||!Array.isArray(l.courses)||new Set(l.courses.map(c=>c.id)).size!==l.courses.length||!Array.isArray(l.reports)||!Number.isInteger(l.lastActionTick)||l.lastActionTick< -1||l.lastActionTick>s.tick)fail(key);
   for(const c of l.courses){
    if(!['reading','writing','language'].includes(c.branch)||!TEXT_LANGUAGES.includes(c.language)||c.id!==c.branch+'/'+c.language||!integer(c.started)||c.started>s.tick||!Array.isArray(c.steps)||c.steps.length<1||c.steps.length>3||!['learning','learned'].includes(c.status)||(c.status==='learned')!==(c.steps.length===3)||c.started!==c.steps[0].tick)fail(key+'.course');
    for(const [i,e]of c.steps.entries()){const w=s.literature?.works[e.content];if(!integer(e.tick)||e.tick>s.tick||i>0&&e.tick<=c.steps[i-1].tick||!s.people[e.teacher]||e.teacher===p.id||typeof e.copy!=='string'||!w||w.language!==c.language||e.tick<w.written||e.paid!==1||e.energy!==2)fail(key+'.lesson');}
    if(c.status==='learned'&&(c.finished!==c.steps.at(-1).tick||!l[c.branch==='language'?'spoken':c.branch].includes(c.language)))fail(key+'.learned');
   }
   for(const [field,branch]of [['reading','reading'],['writing','writing'],['spoken','language']])for(const lang of l[field])if(!l.origin[field].includes(lang)&&!l.courses.some(c=>c.branch===branch&&c.language===lang&&c.status==='learned'))fail(key+'.unearned.'+field);
   const reports=new Set();for(const r of l.reports){
    const w=s.literature?.works[r.content],id=r.content+'/'+r.helper;
    if(!w||typeof r.copy!=='string'||!s.people[r.helper]||r.helper===p.id||!TEXT_LANGUAGES.includes(r.medium)||!integer(r.at)||r.at<w.written||r.at>s.tick||r.paid!==1||typeof r.partial!=='boolean'||!r.known||r.known.area!==w.content.area||r.known.name!==w.content.name||r.known.observed!==w.content.observed||reports.has(id))fail(key+'.report');reports.add(id);
    if(w.content.kind==='spell-manual'){if(r.known.kind!=='spell-manual'||r.known.spell!==w.content.spell||r.known.complete!==!r.partial||Object.hasOwn(r.known,'available'))fail(key+'.report.spell');}
    else if(w.content.kind==='mechanism-sequence'){const n=r.known,c=w.content;if(n.kind!==c.kind||n.node!==c.node||n.key!==c.key||n.x!==c.x||!validSequence(n.order)||JSON.stringify(n.order)!==JSON.stringify(r.partial?c.order.slice(0,2):c.order)||n.complete!==(!r.partial&&c.complete))fail(key+'.report.sequence');}
    else if(r.partial&&Object.hasOwn(r.known,'available')||!r.partial&&r.known.available!==w.content.available)fail(key+'.report.employment');
   }
  }
  const t=p.literacyTeaching;if(t!==undefined){
   if(t?.version!==1||!s.people[t.pupil]||t.pupil===p.id||!['reading','writing','language','aloud'].includes(t.branch)||!TEXT_LANGUAGES.includes(t.language)||!s.literature?.works[t.content]||s.literature.works[t.content].language!==t.language||typeof t.copy!=='string'||!s.areas[t.area]||!integer(t.requested)||t.requested>s.tick||!integer(t.until)||t.until<t.requested||t.until>s.tick+24||!Number.isInteger(t.turn)||t.turn< -1||t.turn>s.tick||typeof t.used!=='boolean')fail(key+'.teaching');
  }
  const r=p.textPurchase;if(r!==undefined){if(r?.version!==1||!s.people[r.seller]||r.seller===p.id||typeof r.item!=='string'||!s.literature?.works[r.content]||!s.areas[r.area]||![1,2,4].includes(r.price)||!integer(r.requested)||r.requested>s.tick||r.until!==r.requested+16||!Number.isInteger(r.turn)||r.turn< -1||r.turn>s.tick||r.turn!==-1&&r.turn<r.requested)fail(key+'.textPurchase');}
 }
}
