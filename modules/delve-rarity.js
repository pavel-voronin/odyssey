import {enabled} from '../rules.js';
import {canStartPersonalLine,claimPersonalLine} from './story-rarity.js';

// Continuing an existing undertaking and keeping an accepted promise are not
// fresh opportunities. In particular a pause never rolls away the same stairs.
export function newDelveAllowed(s,prior,reason){
 if(!enabled(s,'delve-rarity')||!enabled(s,'story-rarity')||prior||reason?.startsWith('promise:'))return true;
 return !(s.hero.storyRarity?.delves?.length)&&canStartPersonalLine(s,'expedition');
}
export function claimDelveOpportunity(s,root,prior,reason){
 if(!enabled(s,'delve-rarity')||!enabled(s,'story-rarity')||prior||reason?.startsWith('promise:'))return;
 claimPersonalLine(s);s.hero.storyRarity.delves=[root];
}
