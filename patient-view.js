import {withLimbLook} from './modules/limb-state.js';
import {personAppearance} from './appearance.js';
import {race} from './content.js';
import {supportedPatient} from './modules/patient-state.js';
export function paintPatient(scene,s,h,x,ground,phase){const p=supportedPatient(s,h);if(!p||p.id===s.hero.lineage)return;const look=withLimbLook(p,(s.rules?.appearance===false?p.appearance:personAppearance(s,p))||{});scene.person(x+(h.facing||1)*12,ground-17,look.cloak||'#ad9872',false,h.facing||1,0,false,true,look,s.rules?.lineage===false?null:race(p.race),{kind:'rest',progress:phase});}
export function patientHTML(s,escape){return Object.values(s.hero.patientNotes||{}).map(n=>`<p class="empty">${escape(n.name)}: ${escape(({waiting:'ожидает помощи',supported:'с физической поддержкой',joined:'снова в отряде',left:'совместное ожидание закончено',dead:'встреченная гибель'})[n.stage])}. Последняя личная отметка: ${escape(s.areas[n.area]?.name||n.area)}, ${Math.round(n.x)}.</p>`).join('');}
