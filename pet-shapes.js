// Species is an existing companion ID. Drawing never creates or modifies a pet.
export const PET_SHAPES=Object.freeze(['fox','owl','cat']);
export function petShape(companion){return PET_SHAPES.includes(companion?.id)?companion.id:null;}
export function petPartyOffset(party,index){
  if(!party.some(petShape))return 24+index*19;
  const half=c=>c?.id==='fox'?34:c?.id==='owl'?12:c?.id==='cat'?22:16;
  let offset=24+Math.max(0,half(party[0])-10);
  for(let i=1;i<=index;i++)offset+=half(party[i-1])+half(party[i])+4;
  return offset;
}
function path(c,color,points){c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();}
function oval(c,color,x,y,rx,ry){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
export function paintPet(c,kind,{rest=false,hurt=false,motion=null}={}){
  if(!PET_SHAPES.includes(kind))return false;
  c.save();if(motion?.dead)c.scale(1,.38);else if(rest)c.scale(1,.75);
  const bodyY=motion?.bodyY||0;c.translate(motion?.reach||0,bodyY);
  const leg=(x,color,hip,i)=>{const foot=motion.feet[i];c.strokeStyle=color;c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(x,hip);c.lineTo(x+foot.x*.4-1,(hip+foot.y-bodyY)/2);c.lineTo(x+foot.x,foot.y-bodyY-1);c.lineTo(x+foot.x+2,foot.y-bodyY-1);c.stroke();};
  const ink='#28362f',cream='#e0d1ac';
  if(kind==='fox'){
    const fur=hurt?'#cf9a87':'#bc8759',shade='#79553f';
    // Broad tapered brush, narrow muzzle and separated pointed ears define the outline.
    path(c,fur,[[-8,-14],[-19,-20],[-29,-18],[-34,-12],[-27,-7],[-17,-8],[-8,-10]]);
    path(c,cream,[[-27,-18],[-34,-12],[-27,-7],[-24,-12]]);
    for(const[i,[x,color]]of[[-9,shade],[-6,fur],[5,shade],[10,fur]].entries())if(motion?.walking)leg(x,color,-11,i);else path(c,color,[[x,-11],[x+2,-11],[x+3,0],[x-1,0]]);
    oval(c,fur,-1,-13,13,5.5);
    path(c,fur,[[5,-16],[6,-26],[11,-21],[15,-27],[17,-19],[25,-15],[27,-12],[17,-10],[9,-11]]);
    path(c,cream,[[9,-13],[17,-14],[26,-12],[17,-10],[10,-9]]);
    path(c,'#c6c8b1',[[7,-24],[8,-18],[10,-21]]);path(c,'#c6c8b1',[[15,-25],[14,-20],[16,-20]]);
    oval(c,ink,25,-13,1.8,1.2);c.fillStyle=ink;c.fillRect(17,-18,1.8,1.6);
  }else if(kind==='owl'){
    const fur=hurt?'#c79b8c':'#a48c69',shade='#6c604d';
    if(motion?.walking){leg(-4,shade,-5,0);leg(4,shade,-5,1);}else{path(c,shade,[[-4,-5],[-4,0],[-8,0],[-7,-2],[-2,-2],[-1,-5]]);path(c,shade,[[3,-5],[3,0],[7,0],[7,-2],[5,-2],[5,-5]]);}
    const wing=motion?.wing||0;
    oval(c,fur,0,-13,10,12);path(c,shade,[[-8,-20],[-12-wing,-10-wing],[-9,-3],[-4,-8],[-4,-18]]);path(c,shade,[[8,-20],[12+wing,-10-wing],[9,-3],[4,-8],[4,-18]]);
    path(c,fur,[[-10,-24],[-11,-34],[-4,-29],[4,-29],[11,-34],[10,-24]]);oval(c,fur,0,-25,10,8);
    oval(c,cream,-4,-25,4.4,5.5);oval(c,cream,4,-25,4.4,5.5);
    if(rest){c.strokeStyle=ink;c.lineWidth=1.3;c.beginPath();c.moveTo(-6,-25);c.lineTo(-2,-25);c.moveTo(2,-25);c.lineTo(6,-25);c.stroke();}
    else{oval(c,'#dcaf64',-4,-25,2.5,2.7);oval(c,'#dcaf64',4,-25,2.5,2.7);oval(c,ink,-3.5,-25,1.2,2);oval(c,ink,4.5,-25,1.2,2);}
    path(c,'#ad8350',[[0,-23],[-2,-21],[0,-18],[2,-21]]);
    path(c,cream,[[-3,-13],[0,-10],[3,-13],[0,-8]]);
  }else{
    const fur=hurt?'#c79f96':'#a3aaa0',shade='#667a73';
    // A high curled tail and short round muzzle distinguish the cat from the dog.
    c.strokeStyle=fur;c.lineWidth=3.5;c.lineCap='round';c.beginPath();c.moveTo(-8,-11);c.quadraticCurveTo(-22,-14,-19,-28);c.quadraticCurveTo(-17,-33,-14,-28);c.stroke();
    if(motion?.walking){for(const[i,x]of[-7,-4,4,7].entries())leg(x,i%2?fur:shade,-9,i);}else for(const x of[-6,5])path(c,shade,[[x,-9],[x+3,-9],[x+3,0],[x-1,0]]);
    oval(c,fur,0,-11,10,6);path(c,fur,[[4,-14],[4,-26],[9,-22],[14,-26],[16,-16],[12,-12]]);oval(c,fur,10,-18,7,5.5);
    path(c,'#c9a99f',[[5,-24],[6,-20],[8,-22]]);path(c,'#c9a99f',[[14,-24],[12,-22],[14,-20]]);
    path(c,cream,[[10,-18],[15,-18],[17,-16],[13,-14],[10,-15]]);oval(c,ink,16,-17,1,1);c.fillStyle=ink;c.fillRect(11,-21,1.5,1.5);
    c.strokeStyle=shade;c.lineWidth=1;c.beginPath();c.moveTo(-3,-15);c.lineTo(-2,-10);c.moveTo(1,-16);c.lineTo(2,-11);c.moveTo(14,-16);c.lineTo(20,-15);c.moveTo(14,-15);c.lineTo(20,-12);c.stroke();
  }
  c.restore();return true;
}
