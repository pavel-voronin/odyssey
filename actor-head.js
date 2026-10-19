export function actorSkin(look={},species=null){return !species||['human','halfling','gnome','dwarf'].includes(species.id)?look.skin||species?.skin||'#d4bb92':species.skin;}
export function drawHead(c,look={},species=null,color='#a9c686',skin=actorSkin(look,species),hero=false){
    c.fillStyle = skin; c.fillRect(-4, -41, 9, 10); c.fillStyle = look.hair||(hero ? '#595d3d' : '#554b3d');
    if(look.hairStyle!=='bald')c.fillRect(-5,-43,11,5);
    if(look.hairStyle==='long'||look.hairStyle==='braid')c.fillRect(-6,-40,4,look.hairStyle==='braid'?17:12);
    if(look.hairStyle==='crest'){c.fillRect(-1,-48,4,8);c.fillRect(2,-45,3,5);}
    if(look.hairStyle==='curls'){for(let i=0;i<4;i++){c.beginPath();c.arc(-4+i*3,-43,3,0,7);c.fill();}}
    c.fillStyle = species?.id==='automaton'?'#9bcecf':'#2a3a2c'; c.fillRect(3, -36, 2, 2);
    if(look.glasses&&look.compact){c.fillStyle='#ded5b9';c.fillRect(-2,-38,8,look.detailLine||1);}else if(look.glasses){c.strokeStyle='#c8bda1';c.lineWidth=1;c.strokeRect(-1,-38,7,5);c.beginPath();c.moveTo(-1,-36);c.lineTo(-5,-36);c.stroke();}
    if(look.earring&&!look.compact){c.strokeStyle='#e3c17e';c.lineWidth=1;c.beginPath();c.arc(-4,-33,2,0,7);c.stroke();}
    if(look.hat==='cap'){c.fillStyle=color;c.fillRect(-6,-46,12,5);c.fillRect(3,-42,6,2);}
    if(look.hat==='brim'){c.fillStyle=look.shoes;c.fillRect(-4,-48,8,7);c.fillRect(-9,-42,18,2);}
    if(look.hat==='hood'){c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(-6,-34);c.lineTo(-6,-43);c.lineTo(0,-47);c.lineTo(7,-41);c.stroke();}
    if(look.hat==='coif'){c.fillStyle=look.plateColor||color;c.fillRect(-5,-45,11,6);c.fillRect(-5,-39,2,9);c.fillRect(5,-39,2,9);c.strokeStyle=look.edgeColor||'#d1d8c6';c.lineWidth=.7;c.beginPath();c.moveTo(-4,-42);c.lineTo(5,-42);c.stroke();}
    if(look.scarf){c.fillStyle=look.scarfColor;c.fillRect(-5,-32,12,3);c.fillRect(-5,-30,3,11);}
    if(species?.id==='elf'||species?.id==='goblin'){c.fillStyle=species.skin;c.beginPath();c.moveTo(-4,-36);c.lineTo(-10,-39);c.lineTo(-4,-33);c.fill();}
    if(species?.id==='dwarf'){c.fillStyle=look.hair||'#9b8764';c.fillRect(-4,-33,8,6);}
    if(species?.id==='dragonkin'){c.strokeStyle='#d2c098';c.lineWidth=2;c.beginPath();c.moveTo(-4,-42);c.lineTo(-8,-47);c.moveTo(4,-42);c.lineTo(7,-46);c.stroke();}
    if(species?.id==='myconid'){c.fillStyle=look.capColor||look.cloak||'#b0988f';c.beginPath();c.ellipse(0,-41,13,8,0,Math.PI,Math.PI*2);c.fill();}
    for(const mark of look.injuryMarks||[]){
      if(mark.part==='cap'&&species?.id!=='myconid'||mark.part==='plating'&&species?.id!=='automaton')continue;
      const y=mark.part==='cap'?-44:-36;
      if(mark.kind==='burn'){c.fillStyle=mark.part==='plating'?'#514b45':'#80534a';c.fillRect(-3,y,3,3);}
      else {c.strokeStyle='#9f5149';c.lineWidth=.8;c.beginPath();c.moveTo(-2,y-1);c.lineTo(1,y+3);c.stroke();}
    }
}
