import {enabled} from '../rules.js';
export const companionAffairsEnabled=s=>['companion-affairs','companion-goals','companions','relationships','npc-intentions','mentor-journeys','property','workshop-tools','people','npc-control','npc-knowledge','npc-contacts'].every(id=>enabled(s,id));
export function postponedCompanionAffair(s,p,id){
 if(!companionAffairsEnabled(s))return null;const r=p.companionAffairs?.postponed,g=p.personalJourney;
 if(!r||r.id!==id||s.tick>=r.until||g?.status!=='active'||g.kind!=='seekMentor')return null;
 const c=Object.values(p.familyNeeds?.cases||{}).find(c=>c.id===r.family);
 if(!c||!['known','active'].includes(c.status)||c.revision!==r.revision)return null;
 return r.reason;
}
