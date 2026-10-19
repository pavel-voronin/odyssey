import {itemUnits} from './container-state.js';
export function validateHomes(s,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 for(const a of Object.values(s.areas)){
  const h=a.home;if(h===undefined)continue;const key=a.id+'.home';
  if(h?.version!==1||a.interior?.kind!=='room'||!a.lodging||h.id!==a.id+'/home'||!s.people[h.owner]||!s.people[h.tenant]||h.owner===h.tenant&&a.residence?.owner!==h.owner||!['bench','hearth'].includes(h.configuration)||!['building','ready'].includes(h.state)||h.paid!==(a.residence?0:8)||a.residence&&h.permission!==a.residence.title||!integer(h.agreed)||h.agreed>s.tick||typeof h.permission!=='string'||!integer(h.remaining)||h.remaining>3||!Number.isInteger(h.lastWorkTick)||h.lastWorkTick< -1||h.lastWorkTick>s.tick||!Array.isArray(h.steps)||h.steps.length!==3-h.remaining||h.steps.some((e,i)=>!integer(e.tick)||e.tick<=h.agreed||e.tick>s.tick||e.energy!==2||i>0&&e.tick<=h.steps[i-1].tick)||h.lastWorkTick!==(h.steps.at(-1)?.tick??-1)||h.material?.kind!=='tools'||!integer(h.material.before)||h.material.before<2||h.material.after!==h.material.before-2||h.chest!==(a.residence?a.residence.chest:h.id+'/chest')||h.device!==h.id+'/'+h.configuration||(h.state==='ready')!==(h.remaining===0)||h.state==='ready'&&h.finished!==h.lastWorkTick)fail(key);
  const chest=a.objects.find(o=>o.id===h.chest),device=a.objects.find(o=>o.id===h.device);
  if(!chest||chest.kind!=='homeChest'||chest.owner!==h.tenant||chest.capacity!==(a.residence&&h.state==='building'?(a.residence.plan==='small'?6:10):12)||!Array.isArray(chest.items)||chest.items.reduce((n,i)=>n+itemUnits(i),0)>chest.capacity||h.state==='building'&&device||h.state==='ready'&&(!device||device.kind!==(h.configuration==='bench'?'homeBench':'homeHearth')||device.owner!==h.owner||device.tenant!==h.tenant))fail(key+'.objects');
  if(h.lastStoreTick!==undefined&&(!integer(h.lastStoreTick)||h.lastStoreTick<h.agreed||h.lastStoreTick>s.tick))fail(key+'.store');
 }
}
