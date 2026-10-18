import {weaponStylesOn,weaponDescription,WEAPON_STYLES} from './modules/weapon-styles.js';
export function weaponStylesHTML(s,escape){
 if(!weaponStylesOn(s))return '';
 const h=s.hero,p=s.people[h.lineage]?.weaponPractice,item=h.equipment?.weapon;
 if(!p&&!item?.weaponStyle)return '';
 return `<section data-weapon-styles><p class="detail-label">ОРУЖЕЙНЫЕ ПРИЁМЫ</p>${Object.entries(WEAPON_STYLES).map(([id,def])=>`<p>${escape(def.name)} · ${p?.methods?.[id]?p.methods[id].origin==='role'?'известен по подготовке':'освоен на практике':`попаданий ${p?.counts?.[id]||0} / 3`}</p>`).join('')}<p class="empty">${escape(weaponDescription(s,item)||'Обычное оружие. Знакомые приёмы сохраняются, но требуют подходящей вещи.')}</p>${h.weaponWindup?'<p>Размах начат. Следующее действие зависит от того, что успеет сделать противник.</p>':''}</section>`;
}
