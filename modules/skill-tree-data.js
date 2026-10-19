export const SKILL_TREE=Object.freeze([
 {id:'check-cargo-lashing',branch:'sailing',name:'Проверка крепления груза',requires:[]},
 {id:'read-trail-direction',branch:'tracking',name:'Направление настоящего следа',requires:[]},
 {id:'fit-working-part',branch:'craft',name:'Подгонка рабочей детали',requires:[]},
 {id:'field-dressing',branch:'aid',name:'Полевая повязка',requires:[]},
 {id:'check-account',branch:'trade',name:'Проверка расчёта',requires:[]},
 {id:'field-maintenance',name:'Походный мастер',requires:['fit-working-part','field-dressing']},
 {id:'careful-maintenance',name:'Бережное обслуживание',requires:['field-maintenance']}
]);
export function acyclicSkillTree(nodes=SKILL_TREE){const done=new Set(),visiting=new Set(),byId=new Map(nodes.map(n=>[n.id,n]));if(byId.size!==nodes.length)return false;function visit(id){if(done.has(id))return true;if(visiting.has(id)||!byId.has(id))return false;visiting.add(id);for(const r of byId.get(id).requires)if(!visit(r))return false;visiting.delete(id);done.add(id);return true;}return nodes.every(n=>visit(n.id));}
