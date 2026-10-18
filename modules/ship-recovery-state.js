import {enabled} from '../rules.js';
import {knowsPracticalMethod,practicalSkill} from './skill-branches.js';
export const shipRecoveryOn=s=>enabled(s,'ship-recovery')&&enabled(s,'expeditions')&&enabled(s,'stories');
const signature=m=>m?JSON.stringify([m.id,m.learnedAt??m.recordedAt,m.source]):null;
export function rememberShipFailure(s,c,before){
 if(!shipRecoveryOn(s))return;
 c.shipRecovery={version:1,status:'available',failure:{id:c.id+'/launch',tick:s.tick,actor:s.hero.lineage,object:c.console,area:c.target,hpBefore:before,hpAfter:s.hero.hp,fuel:1,method:signature(practicalSkill(s,s.hero.lineage,'craft')?.method)},attempt:null};
}
export function shipRecoveryAvailable(s,c){
 const h=s.hero,r=c.shipRecovery,m=practicalSkill(s,h.lineage,'craft')?.method;
 return shipRecoveryOn(s)&&c.owner===h.lineage&&c.status==='failed'&&c.variant==='ship'&&r?.version===1&&['available','working'].includes(r.status)&&!c.launchResult&&knowsPracticalMethod(s,h.lineage,'craft')&&(m.learnedAt??m.recordedAt)>r.failure.tick&&signature(m)!==r.failure.method&&h.inventory.relics>0&&(r.attempt||(s.people[h.lineage]?.marketCargo?.tools||0)>0);
}
export function shipRecoveryText(c){
 const r=c.shipRecovery;if(!r)return '';
 return r.status==='done'?'После провала освоенная подгонка и новая деталь позволили запустить корабль. Прежние ожоги и затраты остались.':r.status==='missing'?'На месте больше нет пригодного к ремонту сердца.':r.attempt?`Подгонка сердца: осталось ${r.attempt.remaining} рабочих действий. Деталь уже установлена.`:'Сердце пережило перегрузку. Новое умение, инструментальная деталь и другое топливо могут дать повод вернуться; это не обязательство.';
}
