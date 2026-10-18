import {occupiedCover} from './modules/position-state.js';
export function positionHTML(s,escape){
 const h=s.hero,m=h.positionNotes;if(!m||!Object.keys(m.covers).length)return '';const held=occupiedCover(s,h);
 return '<p class="detail-label">ЗАМЕЧЕННЫЕ УКРЫТИЯ</p>'+Object.values(m.covers).map(o=>`<details class="habit"><summary>${escape(o.name)}</summary><p>${held?.id===o.id?'Занята '+(h.coverPosition.side==='left'?'левая':'правая')+' грань.':'Позиция не занята: одного знания об укрытии недостаточно.'}</p><p>Низкий прямой осколок может остановиться о камень. Близкий удар, другой угол и магический отклик остаются опасны.</p></details>`).join('');
}
