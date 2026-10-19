import {worldNetwork} from './world-change-network.js';
import {causewayReady} from './causeway-state.js';
import {quakeBlocked} from './quake-state.js';
function connected(links,from,to){const adjacency=new Map();for(const [,a,b]of links){if(!adjacency.has(a))adjacency.set(a,[]);if(!adjacency.has(b))adjacency.set(b,[]);adjacency.get(a).push(b);adjacency.get(b).push(a);}const seen=new Set(),todo=[from];while(todo.length){const id=todo.pop();if(id===to)return true;if(seen.has(id))continue;seen.add(id);todo.push(...(adjacency.get(id)||[]));}return false;}
export function economyNetwork(s){
 const n=worldNetwork(s,{blocked:(_s,a,b)=>{const key=[a,b].sort().join('|'),e=s.edges[key];return quakeBlocked(s,a,b)||Boolean(e.mode==='road'&&e.ford&&!causewayReady(s,key));}});
 return {...n,kind:'steady-cargo-backbone',proofs:Object.values(s.edges).flatMap(e=>e.causeway?.status==='done'&&e.causeway.firstDelivery&&causewayReady(s,e.causeway.key)?[{project:e.causeway.id,...e.causeway.firstDelivery}]:[])};
}
export function assessEconomy(before,now,source){
 if(before.kind!=='steady-cargo-backbone'||JSON.stringify(before.centers)!==JSON.stringify(now.centers))return {world:false,reason:'Нет сопоставимых канонических хозяйственных центров.'};
 const old=new Set(before.links.map(e=>e[0])),current=new Set(now.links.map(e=>e[0])),delta=[...new Set([...old,...current])].filter(k=>old.has(k)!==current.has(k)),refs=new Set(source.effects.filter(e=>e.ref.root==='edges'&&e.ref.path.join('.')==='causewayAccess').map(e=>e.ref.id));
 if(!delta.length||delta.some(k=>!refs.has(k)))return {world:false,reason:'Перемена устойчивых путей не принадлежит только этой стройке.'};
 const changed=before.pairs.filter((p,i)=>!p[2]&&now.pairs[i]?.[2]),proof=now.proofs.find(p=>p.project===source.id);
 if(!changed.length)return {world:false,reason:'Освоенная переправа осталась местным улучшением; опорные системы снабжения уже были связаны.'};
 if(!proof||connected(before.links,proof.source,proof.to)||!connected(now.links,proof.source,proof.to))return {world:false,reason:'Нужен действительный доставленный груз между прежними разными устойчивыми системами снабжения.'};
 return {world:true,reason:'Настоящий рейс освоил построенный путь между прежде разобщёнными устойчивыми хозяйственными центрами.',signature:JSON.stringify([now.pairs,source.id,proof.convoy,proof.at]),changed};
}
