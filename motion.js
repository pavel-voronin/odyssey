export function walkPose(progress,distance=16){
  const amplitude=Math.max(3,Math.min(7,distance*.3)),phase=((progress%1)+1)%1;
  const foot=t=>{
    t=(t+1)%1;
    return t<.6?{x:amplitude*(1-t/.3),y:0}:{x:-amplitude+(t-.6)/.4*amplitude*2,y:-Math.sin((t-.6)/.4*Math.PI)*4};
  };
  return {feet:[foot(phase),foot(phase+.5)],bodyY:-(Math.cos(phase*Math.PI*4)+1)*.6,arm:Math.sin(phase*Math.PI*2)*3};
}
export function heroStance(s){
  const campRest=s.hero.lastAction==='rest'&&s.areas[s.hero.area].type==='camp';
  return {offsetX:campRest?-22:0,direction:campRest?1:s.hero.facing,campRest};
}

// View memory only: a world's next tick is not a second death of the same body.
export const DEATH_ANIMATION_MS=240;
export class DeathMotion{
 constructor(){this.observed=null;this.current=null;}
 update(s,{scene=s.hero.area,now=0,reset=false,animate=true}={}){
  const h=s.hero,id=`${s.seed}/${h.lineage}/${h.born}`,before=this.observed;
  const same=!reset&&before?.id===id&&before.scene===scene;
  if(h.alive)this.current=null;
  else{
   const at=[h.deathSnapshot?.tick,h.life?.endedAt,s.people?.[h.lineage]?.died].find(Number.isFinite),key=`${id}/${at??'unknown'}`;
   if(!same||!this.current||this.current.key!==key){
    const fresh=same&&before.alive&&s.tick===before.tick+1&&(at===undefined||at===s.tick);
    this.current={key,started:fresh&&animate?now:null};
   }else if(s.tick>before.tick+1)this.current.started=null;
  }
  this.observed={id,scene,tick:s.tick,alive:h.alive};
 }
 progress(now,animate=true){
  if(!this.current)return 0;
  if(!animate||this.current.started===null){this.current.started=null;return 1;}
  const phase=Math.max(0,Math.min(1,(now-this.current.started)/DEATH_ANIMATION_MS));
  if(phase===1)this.current.started=null;
  return phase;
 }
}

export function quadrupedPose(track,progress,distance=0){
  const t=Math.max(0,Math.min(1,progress)),active=t<1;
  const dead=Boolean(track?.dead),death=dead?(track?.death?t:1):0;
  const attack=Boolean(!dead&&track?.attack&&active),hurt=Boolean(!dead&&track?.hurt&&active);
  const reach=attack?Math.sin(Math.PI*Math.min(1,t/.6))*5:0;
  const recoil=hurt&&t>=.55?Math.sin(Math.PI*(t-.55)/.45)*3:0;
  const resting=Boolean(!dead&&track?.rest),walking=!dead&&!resting&&distance>0&&active;
  const gait=walking?walkPose(t,distance):{feet:[{x:0,y:0},{x:0,y:0}],bodyY:0};
  return {direction:track?.direction||1,bodyY:dead?7*death:resting?7:gait.bodyY,reach:reach-recoil,dead,death,
    jaw:attack&&t>.18&&t<.65?2:0,hurt:hurt&&t>=.55&&t<.92,resting,walking,
    feet:[0,1,1,0].map((pair,i)=>({x:[-10,-6,8,12][i]+gait.feet[pair].x,y:gait.feet[pair].y}))};
}

export function creatureActionPose(shape,track,progress,distance=0){
  const t=Math.max(0,Math.min(1,progress)),dead=Boolean(track?.dead),death=dead?(track?.death?t:1):0;
  const rest=Boolean(!dead&&track?.rest),walking=!dead&&!rest&&shape!=='chest'&&distance>0&&t<1;
  const strike=!dead&&track?.attack&&t<1?Math.sin(Math.PI*Math.min(1,t/.6)):0;
  const recoil=!dead&&track?.hurt&&t>=.55&&t<1?Math.sin(Math.PI*(t-.55)/.45):0;
  const gait=walking?walkPose(t,distance):{feet:[{x:0,y:0},{x:0,y:0}],bodyY:0};
  return {direction:track?.direction||1,dead,death,rest,walking,hurt:recoil>0,
    feet:gait.feet,lean:strike*4-recoil*3,bounce:walking?(shape==='dragon'?gait.bodyY:-(Math.sin(Math.PI*t*2)**2)*3):0,
    wing:walking?Math.sin(Math.PI*t*2)*3:strike*5,alpha:shape==='ghost'?(dead?.7*(1-death*.8):.7):1};
}
