import {validateWorldChanges} from './world-changes-schema.js';
import {validatePeriodDate} from './period-date.js';
export function validatePeriodHistory(s,fail){
 const h=s.chronology?.periodHistory;if(h!==undefined){const bad=()=>fail('chronology.periodHistory'),time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
  if(h?.version!==1||!Array.isArray(h.entries)||!h.entries.length||h.serial!==h.entries.length-1)bad();
  const causes=new Set();for(const [i,p]of h.entries.entries()){if(p.id!==`period/${s.seed}/${i}`||!time(p.startTick)||!Number.isSafeInteger(p.firstYear)||typeof p.name!=='string'||!p.name||p.name.length>80||typeof p.shortName!=='string'||!p.shortName||p.shortName.length>24||typeof p.reason!=='string')bad();
   if(!i){if(p.kind!=='legacy'||p.startTick!==0||p.knownStart!==false||p.previous!==null||p.cause!==null)bad();}
   else{const c=p.cause;if(p.kind!=='historical'||p.knownStart!==true||p.firstYear!==1||p.startTick<=h.entries[i-1].startTick||p.previous!==h.entries[i-1].id||!c||c.tick!==p.startTick||typeof c.id!=='string'||!c.id||causes.has(c.id)||typeof c.domain!=='string'||!c.domain||typeof c.text!=='string'||c.area!==null&&!s.areas[c.area]||!['actors','knownBy','witnesses'].every(k=>Array.isArray(c[k]))||c.actors.some(id=>!s.people[id]))bad();causes.add(c.id);}
  }
 }
 validateWorldChanges(s,fail);
 for(const w of Object.values(s.literature?.works||{}))if(w.dating!==undefined)validatePeriodDate(s,w.dating,w.written,fail,'literature.period');
}
