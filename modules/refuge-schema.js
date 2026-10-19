export function validateRefuges(s,fail){
 const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,pos=n=>Number.isFinite(n)&&n>=0&&n<=100,qty=n=>Number.isSafeInteger(n)&&n>=0,person=id=>Boolean(s.people[id]);
 for(const a of Object.values(s.areas)){const r=a.refugeSite;if(r!==undefined&&(r?.version!==1||r.id!==a.id+'/refuge-site'||r.area!==a.id||!pos(r.x)||r.food!==a.forage?.localFood?.id||a.type!=='forest'||!time(r.created)||r.water?.kind!=='spring'||!time(r.water.discovered)||r.water.discovered!==r.created||!person(r.water.by)))fail(a.id+'.refugeSite');}
 for(const p of Object.values(s.people)){
  const k=p.refugeKnowledge;if(k!==undefined){if(!k||typeof k!=='object'||Array.isArray(k)||Object.keys(k).length>24)fail(p.id+'.refugeKnowledge');for(const [id,n]of Object.entries(k))if(!s.areas[id]||n?.area!==id||!['camp','plot'].includes(n.mode)||typeof n.site!=='string'||!pos(n.x)||!time(n.seen)||n.witness!==p.id||typeof n.water!=='boolean'||!qty(n.food)||n.mode==='plot'&&(!n.water||!['mushroom','fish'].includes(n.foodKind)||n.rest!==null)||n.mode==='camp'&&(n.water||n.food!==0||n.foodKind!==null||n.rest!==n.site))fail(p.id+'.refugeKnowledge.note');}
  const r=p.refugeSurvey;if(r!==undefined&&(!s.areas[r?.area]||!time(r.tick)||!['spring','dry'].includes(r.result)))fail(p.id+'.refugeSurvey');
  if(p.refugeGroup!==undefined){const g=s.migrations[p.refugeGroup];if(!g||!g.members.includes(p.id)||!g.arrivals[p.id]||!g.refuge||g.refuge.mode==='join')fail(p.id+'.refugeGroup');}
  const t=p.agenda?.task;if(t?.kind==='refugeSurvey'&&(!s.areas[t.target]||!pos(t.x)||!qty(t.turns)||t.turns>2||t.remaining!==3-t.turns))fail(p.id+'.refugeSurvey.task');
 }
 for(const g of Object.values(s.migrations)){const r=g.refuge;if(r===undefined)continue;const key=g.id+'.refuge';if(r?.version!==1||!['join','camp','found'].includes(r.mode)||!time(r.decided)||r.decided<g.started||!pos(r.x)||!['work','kin','address','survey','visit'].includes(r.knowledge)||!g.knowledge||!s.areas[g.target])fail(key);
  if(r.mode==='join'&&(r.site!==null||r.kit!==null)||r.mode==='camp'&&(typeof r.site!=='string'||r.kit!==null||r.knowledge!=='visit')||r.mode==='found'&&(r.site!==g.target+'/refuge-site'||r.knowledge!=='survey'))fail(key+'.site');
  if(r.mode==='found'){const k=r.kit;if(!k||!g.members.includes(k.builder)||!g.members.includes(k.forager)||k.raw!==4||k.tools!==1||k.setupFood!==g.members.length*2||!qty(k.roadFood)||k.roadFood<g.members.length)fail(key+'.kit');}
  if(['camped','site-ready'].includes(g.status)&&(g.status!==(r.mode==='camp'?'camped':r.mode==='found'?'site-ready':'none')||!time(g.ended)||g.members.some(id=>s.people[id]?.alive&&!g.arrivals[id])))fail(key+'.arrival');
 }
}
