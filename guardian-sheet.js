export function guardianHTML(s,escape){
 const m=s.hero.guardianNotes;if(!m||!Object.keys(m.enemies).length)return '';
 return '<p class="detail-label">ЗАМЕЧЕННЫЕ ЗАЩИТНЫЕ УЗЛЫ</p>'+Object.values(m.enemies).map(n=>`<details class="habit"><summary>${escape(n.name)}</summary><p>${n.shield==='on'?'При последнем осмотре щит действовал.':'При последнем осмотре защитный пульс погас.'}</p><p>${n.node?escape(m.nodes[n.node]?.name||'Замеченный камень')+': связь изучена '+(n.link.method==='hit'?'после собственного удара.':'собственным осмотром.'):'Источник щита ещё не изучен.'}</p></details>`).join('');
}
