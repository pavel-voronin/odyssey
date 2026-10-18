// The same retention rule applies to known hero promises and personal NPC
// affairs. Callers own importance, urgency, availability and deterministic ties.
export const AFFAIR_POLICY={margin:12,minimumTicks:4};
export function stableAffairChoice(options,{current:currentId,since,tick,locked=false,retainedReason='Небольшой перевес другого дела не отменяет прежний выбор.'}={}){
 const best=options[0];if(!best)return null;
 const current=options.find(o=>o.id===currentId);if(!current||current.id===best.id)return best;
 const immediate=best.urgency>=60&&best.urgency>=current.urgency+40;
 if(!immediate&&(locked&&tick-since<AFFAIR_POLICY.minimumTicks||best.value<current.value+AFFAIR_POLICY.margin))return {...current,retained:true,reason:retainedReason};
 return best;
}
