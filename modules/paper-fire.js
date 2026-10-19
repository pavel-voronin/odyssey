import {fragmentInfo} from './paper-fragment-state.js';
import {enabled,moduleRandom} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {rootWorld} from '../world-ref.js';
import {heldTexts,textActor} from './text-state.js';
import {actorView} from '../actor-view.js';
export const paperFireOn=s=>enabled(s,'paper-fire')&&enabled(s,'texts')&&enabled(s,'equipment');
function sourcePlace(s,a,src){
 if(src.kind==='cooking'){const b=a.hearthKitchen?.current,hearth=a.objects.find(o=>o.id===b?.hearth&&o.kind==='homeHearth');if(!b||b.id!==src.batch||b.status!=='ready'||b.finished!==s.tick||b.work!==3||!hearth)return null;return {id:'paper-fire/'+b.id,kind:'hearth-spark',area:a.id,source:b.id,x:hearth.x,mode:'fragment',areas:[a.id],batch:b};}
 const profile=a.facades?.profiles.find(p=>p.id===src.building),event=profile?.structure?.history.at(-1);if(src.kind!=='building'||event?.kind!=='fire'||event.tick!==s.tick)return null;
 const o=a.objects.find(o=>o.building===profile.id),areas=[a.id,...Object.values(s.areas).filter(r=>r.interior&&(r.interior.exterior===a.id&&(r.interior.building===profile.id||r.interior.building===o?.id)||o?.workshopInterior?.area===r.id)).map(r=>r.id)];return {id:'paper-fire/'+profile.id+'/'+s.tick,kind:'building-fire',area:a.id,source:profile.id,x:o?.x??profile.x??50,mode:'lost',areas};
}
export function damagePaperFromSource(input,a,src,ctx={}){
 const s=rootWorld(input);
 if(!paperFireOn(s))return null;const fire=sourcePlace(s,a,src);if(!fire||s.paperFires?.events[fire.id])return null;
 const near=(area,x)=>fire.areas.includes(area)&&(area!==a.id||physicalDistance(a,x,fire.x)<=18),items=new Map();
 for(const id of fire.areas)for(const o of s.areas[id].objects)if(near(id,o.x))for(const i of o.items||[])if(i.textCopy)items.set(i.id,{item:i,area:id});
 for(const p of Object.values(s.people)){const at=textActor(s,p.id)||personLocation(s,p.id);if(!at||at.transit||!near(at.area,at.x))continue;for(const i of heldTexts(s,p.id))if(i.textCopy)items.set(i.id,{item:i,area:at.area});}
 if(!items.size)return null;
 if(fire.batch){if(fire.batch.paperFireChecked!==undefined)return null;fire.batch.paperFireChecked=s.tick;if(moduleRandom(s,'paper-fire')>=.02)return null;}
 const damaged=[];for(const {item:i,area}of items.values()){
  const c=i.textCopy,w=s.literature?.works[c.content];if(!w||c.condition==='damaged'&&c.fireResidue?.mode==='lost')continue;const mode=fire.mode==='lost'||c.condition!=='intact'?'lost':'fragment',info=mode==='fragment'?(c.condition==='intact'?fragmentInfo(w):structuredClone(c.fireResidue.info)):null;
  c.condition='damaged';c.damage={kind:'paper-fire',cause:fire.id,tick:s.tick,area};c.fireResidue={version:1,mode,info};i.history.push({tick:s.tick,text:mode==='lost'?'Огонь уничтожил читаемые страницы; описание содержания не является вторым экземпляром.':'После огня уцелели отдельные страницы. Полной записи здесь больше нет.'});damaged.push({item:i.id,area,mode});
 }
 if(!damaged.length)return null;
 s.paperFires ||= {version:1,events:{}};const event=s.paperFires.events[fire.id]={id:fire.id,at:s.tick,kind:fire.kind,area:a.id,source:fire.source,damaged};
 for(const p of Object.values(s.people)){const at=p.alive&&personLocation(s,p.id);if(!at||at.transit||!near(at.area,at.x))continue;const h=s.actorStates?.[p.id]||(s.hero.lineage===p.id?s.hero:null);if(h)ctx.log?.(actorView(s,h),'Огонь повреждает настоящие бумажные записи в этом месте. Уцелевшие экземпляры снаружи остаются прежними; прочитанное из памяти не исчезает.','story');}
 return event;
}
