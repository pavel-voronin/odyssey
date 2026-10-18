import {bodyParts} from './anatomy-state.js';
export function validateProstheticItem(s,i,fail){
 if(i.kind!=='prosthesis'&&!i.prosthesis)return;
 const m=i.prosthesis,p=s.people[m?.patient],o=s.people[m?.maker]?.prostheticCraft?.orders[m?.order];
 if(i.kind!=='prosthesis'||i.base!=='wooden-leg'||i.slot!==undefined||m?.version!==1||!p||!o||o.status!=='completed'||o.item!==i.id||m.patient!==o.patient||m.part!==o.part||m.quality!==o.quality||m.created!==o.finished||i.creator!==o.master||i.createdAt!==o.finished||!i.physical||i.physical.version!==1)fail('prosthetic.item.'+i.id);
}
export function validateProsthetics(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 for(const p of Object.values(s.people)){
  const r=p.prostheticRequest;if(r!==undefined){const o=s.people[r?.master]?.prostheticCraft?.orders[r?.order];if(r?.version!==1||o?.patient!==p.id)fail(p.id+'.prostheticRequest');}
  const q=p.prostheticCraft;
  if(q!==undefined){
   if(q?.version!==1||!int(q.serial,1,Number.MAX_SAFE_INTEGER)||!int(q.lastActionTick,0,s.tick)||!q.orders||typeof q.orders!=='object'||Object.keys(q.orders).length!==q.serial||q.active!==null&&q.orders[q.active]?.status!=='working')fail(p.id+'.prostheticCraft');
   for(const [id,o]of Object.entries(q.orders)){
    const patient=s.people[o.patient],part=bodyParts(patient).find(([id])=>id===o.part);
    if(o.id!==id||!id.startsWith(p.id+'/peg/')||o.master!==p.id||!patient||!part||part[2]!=='leg'||!['leftLeg','rightLeg'].includes(o.part)||!patient.anatomy?.missing?.includes(o.part)||!s.areas[o.area]?.objects.some(a=>a.id===o.workshop&&a.kind==='workshop')||!tick(o.started)||!int(o.lastWorkTick,-1,s.tick)||!int(o.progress,0,3)||o.required!==3||o.paid!==12||![.5,.75].includes(o.quality)||!['working','completed'].includes(o.status)||o.status==='working'&&(q.active!==id||o.progress>=3)||o.status==='completed'&&(o.progress!==3||!tick(o.finished)||o.finished<o.started||o.item!==id+'/leg')||o.collected!==undefined&&(!tick(o.collected)||o.status!=='completed'||o.collected<o.finished))fail(p.id+'.prostheticOrder');
    const m=o.material;if(!m||m.source!==(s.areas[s.areas[o.area]?.city]||s.areas[o.area])?.goods?.sources?.materials?.id||m.units!==2||m.price!==6||!int(m.before,2,Number.MAX_SAFE_INTEGER)||m.after!==m.before-2)fail(p.id+'.prostheticMaterial');
   }
  }
  if(p.prosthetic!==undefined){const f=p.prosthetic;validateProstheticItem(s,f?.item||{},fail);if(f?.version!==1||!f.item?.prosthesis||f.item.prosthesis.patient!==p.id||f.part!==f.item.prosthesis.part||!tick(f.installedAt)||f.installedAt<f.item.createdAt||f.by!==p.id||f.item.physical?.holder?.kind!=='person'||f.item.physical.holder.id!==p.id||!p.anatomy?.missing?.includes(f.part))fail(p.id+'.prostheticFit');}
 }
}
