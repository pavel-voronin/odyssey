import {enabled,moduleRandom} from '../rules.js';

export function initializeStoryRarity(s,h){
  if(h.storyRarity)return;
  const roll=()=>moduleRandom(s,'story-rarity');
  h.storyRarity={affinity:{pact:roll()<.08,mystery:roll()<Math.min(.14,.08+(h.stats?.wit||0)*.005),expedition:roll()<.04+h.personality.curiosity*.08},budget:roll()<.05?2:1,started:0,nextEligible:h.born};
}
export function canStartPersonalLine(s,kind){
  if(!enabled(s,'story-rarity'))return true;
  const h=s.hero,r=h.storyRarity,previous=(s.storyCases||[]).filter(c=>c.owner===h.lineage);
  return Boolean(r.affinity[kind]&&Math.max(r.started,previous.length)<r.budget&&s.tick>=r.nextEligible&&!previous.some(c=>c.kind===kind));
}
export function claimPersonalLine(s){
  if(!enabled(s,'story-rarity'))return;
  const h=s.hero,r=h.storyRarity;
  r.started=Math.max(r.started,(s.storyCases||[]).filter(c=>c.owner===h.lineage).length)+1;
  r.nextEligible=s.tick+2400;
}
