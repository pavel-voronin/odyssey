export function delveLayoutHTML(s,escape){
 const h=s.hero,places=Object.values(h.delvePaths?.places||{});if(!places.length)return '';
 return '<p class="detail-label">ЛИЧНО ОСМОТРЕННЫЕ ПОДЗЕМЕЛЬЯ</p>'+places.map(m=>`<details class="habit"><summary>${escape(m.rooms[m.root]?.name||'Известный спуск')}</summary><p>${escape(m.returning||'Проходы отмечены по собственным наблюдениям. За дверью может быть неизвестная опасность.')}</p>${Object.values(m.rooms).map(n=>`<p><b>${escape(n.name)}</b>: ${Object.values(n.exits).map(e=>escape(e.label)+(e.gate==='closed'?' · замечена решётка':'')+(!m.rooms[e.to]&&e.kind!=='surface'?' · за проходом не осмотрено':'')).join('; ')||'Проходы ещё не осмотрены'}</p>`).join('')}<p>Получено находок: ${m.gains.length}.</p></details>`).join('');
}
