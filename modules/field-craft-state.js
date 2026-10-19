import {enabled} from '../rules.js';
import {knowsPracticalMethod,skillBranchesEnabled} from './skill-branches.js';
import {SKILL_TREE} from './skill-tree-data.js';
export const fieldCraftEnabled=s=>enabled(s,'field-craft')&&skillBranchesEnabled(s)&&enabled(s,'equipment')&&enabled(s,'item-wear');
const cache=new WeakMap();
export function fieldCraftNodes(s,id){
 const p=s.people[id];if(!p)return [];const f=p.fieldCraft,sp=p.skillPractice||{},signature=[fieldCraftEnabled(s),...['scholar','craft','aid','trade','tracking','sailing','magic','mechanic','combat'].map(k=>`${knowsPracticalMethod(s,id,k)}/${sp[k]?.total||0}/${sp[k]?.operations?.length||0}/${sp[k]?.lastTick??-1}`),f?.learned?.at,f?.efficient?.at,f?.total||0].join('|'),old=cache.get(p);if(old?.signature===signature)return old.nodes;
 const known=new Set(SKILL_TREE.filter(n=>n.branch&&knowsPracticalMethod(s,id,n.branch)).map(n=>n.id));if(f?.learned)known.add('field-maintenance');if(f?.efficient)known.add('careful-maintenance');
 const proofs=Boolean(sp.craft?.operations.length&&sp.aid?.operations.length),nodes=SKILL_TREE.map(n=>{const missing=n.requires.filter(id=>!known.has(id)),evidence=n.id==='field-maintenance'&&!proofs?'Нужны собственные подтверждённые ремонт и помощь.':n.id==='careful-maintenance'&&(f?.total||0)<3?'Нужно три выполненных обслуживания.':null;return {...n,known:known.has(n.id),available:fieldCraftEnabled(s)&&!known.has(n.id)&&!n.branch&&!missing.length&&!evidence,reason:missing.length?'Сначала: '+missing.map(id=>SKILL_TREE.find(n=>n.id===id).name).join(', '):evidence||null};});cache.set(p,{signature,nodes});return nodes;
}
export function fieldNodeAvailable(s,id,node){return fieldCraftNodes(s,id).some(n=>n.id===node&&n.available);}
