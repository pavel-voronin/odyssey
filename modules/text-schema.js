import {validSequence} from './sequence-memory.js';
export function validateTexts(s,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,lib=s.literature;
 if(lib!==undefined){
  if(lib?.version!==1||!integer(lib.serial)||!lib.works||typeof lib.works!=='object'||Array.isArray(lib.works)||Object.keys(lib.works).length>lib.serial)fail('literature');
  for(const [id,w]of Object.entries(lib.works)){
   const key='literature.work.'+id,n=w?.content,src=w?.source;
   if(w?.version!==1||w.id!==id||!id.startsWith('text-work/'+w.author+'/')||!s.people[w.author]||w.editor!==w.author||w.revision!==1||w.parent!==null||!integer(w.written)||w.written>s.tick||typeof w.language!=='string'||!w.language||typeof w.title!=='string'||src?.observer!==w.author||!s.areas[src?.area]||n?.area!==src.area||typeof n.name!=='string'||typeof n.text!=='string')fail(key);
   if(n.kind==='employment-note'){if(src.kind!=='own-market-observation'||src.at!==w.written||src.x!==42||n.observed!==w.written||typeof n.available!=='boolean')fail(key);}
   else if(n.kind==='mechanism-sequence'){
    const g=s.edges[n.key]?.mechanism;
    if(src.kind!=='personal-sequence-knowledge'||!integer(src.at)||src.at>w.written||src.at!==n.observed||src.x!==n.x||!src.basis||typeof src.basis.kind!=='string'||!s.people[src.basis.person]||!integer(src.basis.tick)||src.basis.tick>src.at||typeof src.basis.id!=='string'||g?.id!==n.node||!g.sequence||g.lever.area!==n.area||g.lever.x!==n.x||!validSequence(n.order)||n.order.length!==3||n.complete!==true)fail(key);
   }else fail(key);
  }
 }
 for(const p of Object.values(s.people)){
  const m=p.textCraft;if(m===undefined)continue;const key=p.id+'.textCraft';
  if(m?.version!==1||!integer(m.serial)||!Number.isInteger(m.lastActionTick)||m.lastActionTick< -1||m.lastActionTick>s.tick||m.work!==null&&lib?.works[m.work]?.author!==p.id||!Array.isArray(m.copied)||new Set(m.copied).size!==m.copied.length||m.copied.some(id=>!lib?.works[id])||!Array.isArray(m.readings)||new Set(m.readings.map(e=>e.content)).size!==m.readings.length)fail(key);
  for(const e of m.readings)if(!lib?.works[e.content]||typeof e.copy!=='string'||e.author!==lib.works[e.content].author||e.revision!==1||!integer(e.at)||e.at<lib.works[e.content].written||e.at>s.tick)fail(key+'.reading');
  if(m.sequenceWorks!==undefined)for(const [node,id]of Object.entries(m.sequenceWorks)){const w=lib?.works[id];if(w?.author!==p.id||w.content.kind!=='mechanism-sequence'||w.content.node!==node)fail(key+'.sequenceWorks');}
  if(m.sales!==undefined){
   if(!Array.isArray(m.sales)||m.sales.length>24)fail(key+'.sales');
   for(const [i,r]of m.sales.entries())if(!integer(r.tick)||r.tick>s.tick||i>0&&r.tick<=m.sales[i-1].tick||typeof r.item!=='string'||!lib?.works[r.content]||!s.people[r.buyer]||r.buyer===p.id||![1,2,4].includes(r.price)||!['need','spare','unneeded','uninterested'].includes(r.reason)||![r.buyerBefore,r.buyerAfter,r.sellerBefore,r.sellerAfter].every(n=>Number.isFinite(n)&&n>=0)||Math.abs(r.buyerBefore-r.buyerAfter-r.price)>1e-7||Math.abs(r.sellerAfter-r.sellerBefore-r.price)>1e-7)fail(key+'.sale');
  }
  if(m.offer!==null&&(!m.offer||!m.copied.includes(m.offer.content)||typeof m.offer.item!=='string'||!integer(m.offer.tick)||m.offer.tick>s.tick))fail(key+'.offer');
 }
 const seen=new Set(),items=[];
 for(const h of [s.hero,...Object.values(s.actorStates).filter(h=>h.lineage!==s.hero.lineage)])items.push(...h.bag,...Object.values(h.equipment||{}).filter(Boolean));
 for(const p of Object.values(s.people))if(p.id!==s.hero.lineage&&!s.actorStates[p.id])items.push(...(p.looseItems||[]),...(p.legacy?.keepsakes||[]));
 for(const h of [s.hero,...Object.values(s.actorStates).filter(h=>h.lineage!==s.hero.lineage)])for(const c of h.companions||[])items.push(...(c.packCargo?.items||[]));
 for(const p of Object.values(s.people))for(const c of [...(p.pets||[]),...(p.petBoarding?.pet?[p.petBoarding.pet]:[])])items.push(...(c.packCargo?.items||[]));
 items.push(...(s.merchant.items||[]));for(const a of Object.values(s.areas))for(const o of a.objects)items.push(...(o.items||[]),...(o.paymentItems||[]),...((o.existingPet||o.packPetBody||o.petBody)?.packCargo?.items||[]));
 for(const item of items){
  const m=item.writingMaterial,c=item.textCopy;if(m===undefined&&c===undefined&& !['textCopy','writingPaper'].includes(item.kind))continue;
  const key='text.item.'+item.id;
  if(!m||m.version!==1||m.id!==item.id||!item.id.startsWith('text-sheet/'+m.buyer+'/')||!s.people[m.buyer]||!s.areas[m.area]||!s.areas[m.sourceArea]||m.source!==s.areas[m.sourceArea].goods?.sources?.materials.id||m.paid!==2||!integer(m.created)||m.created>s.tick||!integer(m.stockBefore)||m.stockBefore<1||m.stockAfter!==m.stockBefore-1||item.slot!=='document'||item.stat!=='writing'||item.power!==0||item.rarity!==1||seen.has(item.id)||!item.physical)fail(key);seen.add(item.id);
  if(item.kind==='writingPaper'){if(c!==undefined||item.base!=='paper')fail(key+'.blank');continue;}
  const w=lib?.works[c?.content];
  if(item.kind!=='textCopy'||item.base!=='booklet'||c?.version!==1||!w||c.revision!==w.revision||c.owner!=='merchant'&&!s.people[c.owner]||!s.people[c.writer]||!integer(c.written)||c.written<m.created||c.written<w.written||c.written>s.tick||c.sourceCopy!==null&&(typeof c.sourceCopy!=='string'||c.sourceCopy===item.id)||!['intact','damaged'].includes(c.condition)||item.physical.holder.kind==='person'&&c.owner!==item.physical.holder.id&&!(item.libraryLoan?.version===1&&item.libraryLoan.returned===null||item.libraryTheft?.version===1&&item.libraryTheft.returned===null)||item.physical.holder.kind==='merchant'&&c.owner!=='merchant')fail(key+'.copy');
  if(c.condition==='intact'&&c.damage!==null||c.condition==='damaged'&&(!c.damage||c.damage.kind!=='rain-while-open'||!s.people[c.damage.actor]||!s.areas[c.damage.area]||!integer(c.damage.tick)||c.damage.tick<c.written||c.damage.tick>s.tick))fail(key+'.damage');
 }
}
