import {takeGoods} from './goods.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {actualService,rememberService} from './service-access.js';
export const TOOL_PRICE=3,MATERIAL_PLACE_LIMIT=32;
export function initializeWorkMaterials(h){h.workMaterials ||= {known:{},cargo:[],revision:0};}

// This is a person's old stock observation, not a live remote inventory query.
export function observeMaterials(s){
 const h=s.hero,a=s.areas[h.area];
 if(!enabled(s,'work-materials')||!h.alive||h.transit||!a?.civic||Math.abs(h.x-42)*areaScale(s.areas[h.area])>18)return;
 initializeWorkMaterials(h);const m=h.workMaterials,previous=m.known[a.id],available=a.civic.tools>=1&&actualService(s,a,'warehouse').available;
 if(!previous||previous.available!==available)m.revision++;
 m.known[a.id]={area:a.id,name:a.name,available,price:TOOL_PRICE,seen:s.tick};
 const entries=Object.values(m.known).sort((x,y)=>x.seen-y.seen||x.area.localeCompare(y.area));
 for(const old of entries.slice(0,Math.max(0,entries.length-MATERIAL_PLACE_LIMIT)))delete m.known[old.area];
}

export function carriedServiceTool(h,c){
 if(!c?.toolPurchase||c.materialSpent!==TOOL_PRICE||c.toolConsumed!==undefined)return null;
 return h.workMaterials?.cargo.find(t=>t.id===c.toolPurchase.id&&t.service===c.id&&t.owner===c.client&&t.kind==='tool')||null;
}

export function materialSource(s,c,ctx){
 if(!enabled(s,'work-materials'))return null;
 const h=s.hero,route=ctx.knownRoute||ctx.route;if(!route)return null;
 const candidates=[];
 for(const k of Object.values(h.workMaterials?.known||{})){
  if(!k.available||k.area===c.area||k.price!==TOOL_PRICE||k.avoidUntil>s.tick||!knownArea(s,k.area))continue;
  const outward=route(s,h.area,k.area),back=route(s,k.area,c.area);if(!outward.length||!back.length||outward.length>6||back.length>6)continue;
  const duration=path=>path.slice(1).reduce((sum,id,i)=>{const edge=s.edges[[path[i],id].sort().join('|')];return sum+18+(edge?.duration||0);},0);
  candidates.push({...k,ticks:duration(outward)+duration(back)+12});
 }
 return candidates.sort((a,b)=>a.ticks-b.ticks||a.area.localeCompare(b.area))[0]||null;
}

export function buyServiceTool(s,c,ctx){
 const h=s.hero,g=h.goal,a=s.areas[h.area],o=s.areas[c?.area]?.objects.find(o=>o.id===c?.property);
 if(!['work-materials','work-orders','work','property','property-damage'].every(id=>enabled(s,id))||!c||c.status!=='active'||c.helper!==h.lineage||!h.alive||h.transit||g?.kind!=='serviceSupply'||g.service!==c.id||g.area!==h.area||c.supplySource!==h.area||Math.abs(h.x-42)*areaScale(s.areas[h.area])>1||!s.people[c.client]?.alive||!o||o.owner!==c.client||o.state!=='burned'||o.damagedAt!==c.damageAt||o.repair?.materials||c.materialSpent||c.toolPurchase||c.escrow<TOOL_PRICE+c.fee||s.tick>c.deadline)return false;
 if(!(a.civic?.tools>=1)||!actualService(s,a,'warehouse').available){
  rememberService(s,a,'warehouse');
  observeMaterials(s);const k=h.workMaterials?.known[h.area];if(k)k.avoidUntil=s.tick+240;h.goal=null;
  ctx.log(s,'Знакомая кладовая уже без инструмента. Покупка не состоялась; деньги остались в резерве заказа.','work');return false;
 }
 initializeWorkMaterials(h);const tool={id:c.id+'/tool',kind:'tool',owner:c.client,service:c.id,source:a.id,paid:TOOL_PRICE,bought:s.tick};
 takeGoods(s,a,'tools',1,{flow:'exported',reason:'service-tool',actor:h.lineage});a.civic.treasury+=TOOL_PRICE;c.escrow-=TOOL_PRICE;c.materialSpent=TOOL_PRICE;
 h.workMaterials.cargo.push(tool);c.toolPurchase={id:tool.id,holder:h.lineage,source:a.id,paid:TOOL_PRICE,at:s.tick};h.goal=null;h.lastAction='trade';h.speech='Инструмент найден.';
 observeMaterials(s);ctx.log(s,`${h.name} покупает инструмент в «${a.name}» за ◈${TOOL_PRICE} из материального резерва заказа. Инструмент принадлежит заказчику и едет с мастером.`,'work');return true;
}

export function consumeServiceTool(s,c){
 const h=s.hero,tool=carriedServiceTool(h,c);if(!tool)return false;
 h.workMaterials.cargo.splice(h.workMaterials.cargo.indexOf(tool),1);c.toolConsumed=s.tick;return true;
}
