import {occupiedBeds} from './modules/neighbor-housing-state.js';
export function neighborHousingHTML(s,escape){
 const h=s.hero,a=s.areas[h.area],f=a?.foundedSettlement;if(!f||h.transit)return '';const m=a.neighborHousing,r=Object.values(m?.requests||{}).filter(r=>r.host===h.lineage||r.guest===h.lineage).slice(-3),own=s.people[h.lineage]?.housingRequest;
 const pending=own?.area===a.id&&own.mode==='waiting'?'<p>'+escape(own.word?.mode==='waiting'?'Для договора нужен знакомый взрослый свидетель рядом.':'Просьба передана хозяину. Личный ответ ещё не получен.')+'</p>':'';
 return '<p class="detail-label">ОБЩИЙ ДОМ</p><p>Занято мест: '+occupiedBeds(s,a)+' / '+f.housing.capacity+'. Места отсутствующих родных сохранены.</p>'+pending+r.map(r=>'<p>'+escape(r.text)+'</p>').join('');
}
