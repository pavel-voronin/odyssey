export const archiveKey=l=>`${l.lineage}/${l.outcome}/${l.ended}`;
export function currentLife(s,h=s.hero){return s.lives.findLast(l=>l.lineage===h.lineage&&(h.alive||l.outcome==='dead'));}
