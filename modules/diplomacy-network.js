import {worldBackbone} from './world-change-network.js';
export function politicsNetwork(s){
 const centers=worldBackbone(s),states=Object.keys(s.authorities?.byId||{}).sort(),covered=centers.map(id=>[id,s.areas[id].authority||null]),b=s.authorities?.border;
 const mandates=Object.values(s.authorities?.diplomacy?.proposals||{}).map(q=>({id:q.id,centers:q.order.centers,states:q.order.states,covered:q.order.covered,signed:[q.origin?.choice==='accepted'&&[q.fromState,q.origin.actor],q.response?.choice==='accepted'&&[q.toState,q.response.actor]].filter(Boolean)}));
 return {version:1,kind:'canonical-political-order',centers,states,covered,mandates,gates:b?[{edge:b.edge,parties:[s.areas[b.from].authority,b.receiver].sort(),law:b.law,fee:s.edges[b.edge]?.commonAccess?.rule==='free-entry'?0:3,policy:s.edges[b.edge]?.commonAccess?.id||null,mandateStates:s.edges[b.edge]?.commonAccess?.states||[]}]:[]};
}
export function assessPolitics(before,now,source){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);if(before.kind!=='canonical-political-order'||!same(before.centers,now.centers)||!same(before.states,now.states)||before.states.length<2||before.centers.length<2||!before.covered.every(([,id])=>before.states.includes(id))||!now.covered.every(([,id])=>now.states.includes(id)))return {world:false,reason:'Соглашение местное: заранее существовавший порядок не охватывает канонический мировой каркас.'};
 if(!before.gates.length||!same(before.gates.map(g=>g.edge),now.gates.map(g=>g.edge)))return {world:false,reason:'Состав реальных межгосударственных переходов изменился вне этой причины.'};
 const refs=new Set(source.effects.filter(e=>e.ref.root==='edges'&&e.ref.path.join('.')==='commonAccess').map(e=>e.ref.id)),changed=before.gates.filter((g,i)=>g.fee>0&&now.gates[i].fee===0&&now.gates[i].policy===source.id+'/common-border');
 const mandate=before.mandates.find(q=>q.id===source.id);if(!mandate||!same(mandate.centers,before.centers)||!same(mandate.states,before.states)||!mandate.covered.every(([,id])=>before.states.includes(id))||!same(mandate.signed.map(([id])=>id).sort(),before.states)||!now.gates.every(g=>same(g.mandateStates,before.states)))return {world:false,reason:'Нет действительного согласия всего заранее определённого политического порядка; договор остаётся местным.'};
 if(changed.length!==before.gates.length||changed.some(g=>!refs.has(g.edge)))return {world:false,reason:'Не все реальные границы политического порядка получили общее право этой причины.'};
 return {world:true,reason:'Все прежние участники охваченного мирового порядка ввели общее право на каждом его действительном переходе.',signature:JSON.stringify([now.centers,now.covered,now.gates,source.id]),changed:changed.map(g=>[g.edge,'entry-fee','common-free-entry'])};
}
