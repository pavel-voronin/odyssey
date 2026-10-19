// Actual source owners emit only from completed work/damage, never restore.
let handler=()=>null;
export const installPaperFireHandler=fn=>{handler=fn;};
export const emitPaperFire=(s,a,source)=>handler(s,a,source);
