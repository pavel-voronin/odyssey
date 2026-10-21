import {physicalDistance} from '../geometry.js';
import {newsOn,rememberNews} from './news-memory.js';
const body=(s,p)=>s.hero?.lineage===p.id?s.hero:s.actorStates?.[p.id]||p;
export function publishMasteryNews(s,p,achievement){
 if(!newsOn(s)||achievement.kind!=='career')return;
 const h=body(s,p),a=s.areas[h.area];if(!a||h.transit)return;
 const source=p.id+'/'+achievement.profession+'/'+achievement.at,id='news/mastery/'+source,registry=s.newsEvents ||= {version:1,events:{}};
 if(registry.events[id])return;
 const witnesses=Object.values(s.people).filter(q=>{const b=body(s,q);return q.alive&&!q.needs?.sleeping&&!b.transit&&!q.roadTransit&&!q.fordCrossing&&!q.liftTransit&&(b===q?['resident','wandering'].includes(q.status):b.alive)&&b.area===a.id&&physicalDistance(a,h.x,b.x)<=12;}).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,32).map(q=>q.id);
 const fact={id,revision:1,status:'mastered',occurred:s.tick,area:a.id,actor:{id:p.id,name:p.name},patient:{id:p.id,name:p.name},source:{kind:'career-achievement',id:source},mastery:{profession:achievement.profession,rank:12},witnesses};
 registry.events[id]={version:1,id,kind:'mastery',source,versions:{1:fact}};
 for(const person of witnesses)rememberNews(s,s.people[person],{...fact,origin:{person,at:s.tick},heardAt:s.tick,mode:'witness',via:[]});
}
export function validateMasteryNews(s,fail,id,e){
 const f=e.versions?.[1],p=s.people[f?.actor?.id],q=p?.professionalDevelopment?.achievements.find(a=>a.kind==='career'&&a.profession===f.mastery?.profession&&a.at===f.occurred);
 if(e.version!==1||e.id!==id||id!=='news/mastery/'+e.source||Object.keys(e.versions||{}).join()!=='1'||!q||e.source!==p.id+'/'+q.profession+'/'+q.at||f.id!==id||f.revision!==1||f.status!=='mastered'||f.area!==q.area||f.patient?.id!==p.id||f.mastery?.rank!==12||f.source?.kind!=='career-achievement'||f.source.id!==e.source||!Array.isArray(f.witnesses)||f.witnesses.length>32||new Set(f.witnesses).size!==f.witnesses.length||f.witnesses.some(id=>!s.people[id]))fail('news.mastery');
}
