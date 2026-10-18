export function validateHomeBuilding(s,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 for(const a of Object.values(s.areas)){
  const d=a.roomDemand,r=a.extension,key=a.id+'.extension';
  if(d!==undefined&&(d?.version!==1||!a.lodging||a.interior?.kind!=='room'||!s.people[d.actor]||!s.people[d.owner]||!integer(d.tick)||d.tick>s.tick||!integer(d.capacity)||d.capacity<1||d.needed!==d.capacity+1||!Array.isArray(d.party)||d.party.length!==d.needed||new Set(d.party).size!==d.party.length||d.party[0]!==d.actor||d.party.some(id=>!s.people[id])))fail(a.id+'.roomDemand');
  if(r===undefined)continue;
  const out=s.areas[r?.area],door=out?.objects.find(o=>o.id===r?.building),pay=r?.payment,m=r?.materials,steps=r?.steps;
  if(r?.version!==1||!d||r.id!==a.id+'/extension/1'||r.room!==a.id||r.area!==a.interior.exterior||!door||door.kind!=='tavern'||door.room!==a.id||!s.people[r.owner]||r.owner!==d.owner||!integer(r.planned)||r.planned<d.tick||r.planned>s.tick||r.baseCapacity!==d.capacity||!Number.isFinite(r.x)||r.x<0||r.x>100||!['self','hire'].includes(r.mode)||!['planned','foundation','frame','fitting','done'].includes(r.status)||!Array.isArray(steps)||steps.length>6||!pay)fail(key);
  if(r.hired!==null&&(!r.hired||!s.people[r.hired.person]||r.hired.person===r.owner||!integer(r.hired.tick)||r.hired.tick<r.planned||r.hired.tick>s.tick||!integer(r.hired.lastActionTick)||r.hired.lastActionTick<r.hired.tick||r.hired.lastActionTick>s.tick||r.claimUntil!==r.hired.tick+96))fail(key+'.hired');
  if(r.worker!==null&&![r.owner,r.hired?.person].includes(r.worker)||r.mode==='self'&&r.worker!==r.owner||r.mode==='hire'&&r.worker!==(r.hired?.person??null)||r.claimUntil!==null&&!integer(r.claimUntil))fail(key+'.worker');
  if(m!==null&&(!m||m.source!==out.goods?.sources?.materials.id||m.place!==out.id||m.owner!==r.owner||m.units!==3||m.paid!==9||!integer(m.stockBefore)||m.stockBefore<3||m.stockAfter!==m.stockBefore-3||!integer(m.tick)||m.tick<r.planned||m.tick>s.tick))fail(key+'.materials');
  for(const [i,e]of steps.entries())if(e.id!==r.id+'/work/'+(i+1)||!integer(e.tick)||e.tick<=m?.tick||e.tick>s.tick||i>0&&e.tick<=steps[i-1].tick||![r.owner,r.hired?.person].includes(e.actor)||e.energy!==3||e.actor===r.hired?.person&&e.tick<=r.hired.tick)fail(key+'.work');
  const n=steps.length,status=n===6?'done':n>=4?'fitting':n>=2?'frame':m?'foundation':'planned';
  if(r.status!==status||r.lastWorkTick!==(steps.at(-1)?.tick??-1)||!m&&n||a.lodging.capacity!==r.baseCapacity+(r.status==='done'?1:0)||r.status==='done'&&r.completed!==r.lastWorkTick)fail(key+'.progress');
  const reserved=m&&r.claimUntil!==null?12:0,earned=r.status==='done'&&r.hired?steps.filter(e=>e.actor===r.hired.person).length*2:0;
  if(pay.reserved!==reserved||!integer(pay.available)||!integer(pay.paid)||!integer(pay.refunded)||pay.available+pay.paid!==earned||pay.refunded!==(r.status==='done'?reserved-earned:0)||pay.recipient!==(r.status==='done'?(r.hired?.person??null):null)||pay.paid!==0&&pay.paid!==earned||pay.claimed!==null&&(!integer(pay.claimed)||pay.claimed<r.completed||pay.claimed>s.tick||!pay.paid)||pay.paid>0&&pay.claimed===null)fail(key+'.payment');
 }
}
