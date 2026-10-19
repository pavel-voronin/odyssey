// One shared chronological work owner for the existing extension and a lawful house.
export function constructionWork(r,id,tick,{required=6,foundation=2,frame=4,energy=3}={}){
 if(r.status==='done'||!r.materials||r.lastWorkTick>=tick||r.steps.length>=required)return false;
 r.lastWorkTick=tick;r.steps.push({id:r.id+'/work/'+(r.steps.length+1),tick,actor:id,energy});
 r.status=r.steps.length===required?'done':r.steps.length<foundation?'foundation':r.steps.length<frame?'frame':'fitting';return true;
}
