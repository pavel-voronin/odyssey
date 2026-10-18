import {paintPetCargo} from './pet-cargo-view.js';
export function paintQuadruped(c,pose,kind,cargo=null){
    const dog=kind==='dog',scale=dog?.7:1;
    c.save();c.scale(pose.direction*scale,scale*(1-(pose.death||0)*.35));
    const body=pose.hurt?'#d1aaa0':dog?'#b3a284':'#9aa99a',dark=dog?'#7e705b':'#687f74';
    c.lineWidth=3;c.lineCap='round';
    // Knees join the body to planted/swinging feet; feet never pass below their support.
    for(let i=0;i<4;i++){
      const foot=pose.feet[i],hip=i<2?-9:8,hipY=-11+pose.bodyY;
      c.strokeStyle=i===0||i===2?dark:body;c.beginPath();c.moveTo(hip,hipY);
      c.lineTo((hip+foot.x)/2-2,(hipY+foot.y)/2);c.lineTo(foot.x,foot.y);c.lineTo(foot.x+2,foot.y);c.stroke();
    }
    c.translate(pose.reach,pose.bodyY);c.fillStyle=body;
    c.beginPath();c.ellipse(-1,-14,15,7,0,0,Math.PI*2);c.fill();
    c.strokeStyle=body;c.lineWidth=4;c.beginPath();c.moveTo(-13,-15);c.lineTo(-21,-21+(pose.resting?7:0));c.stroke();
    c.beginPath();c.moveTo(7,-15);c.lineTo(9,-27);c.lineTo(14,-21);c.lineTo(20,-19);c.lineTo(24,-15);c.lineTo(15,-12);c.closePath();c.fill();
    if(dog){c.fillStyle=dark;c.beginPath();c.moveTo(10,-24);c.lineTo(7,-15);c.lineTo(15,-20);c.fill();c.strokeStyle='#7b7770';c.lineWidth=2;c.beginPath();c.moveTo(8,-14);c.lineTo(12,-18);c.stroke();}
    c.fillStyle='#293c32';c.fillRect(21,-16,3,2);
    if(pose.resting||pose.dead){c.strokeStyle='#293c32';c.lineWidth=1;c.beginPath();c.moveTo(14,-20);c.lineTo(17,-20);c.stroke();}
    else{c.fillStyle=dog?'#293c32':'#e2c694';c.fillRect(15,-21,2,2);}
    if(pose.jaw){c.strokeStyle='#3d453d';c.lineWidth=2;c.beginPath();c.moveTo(15,-13);c.lineTo(22,-13+pose.jaw);c.stroke();}
    if(dog)paintPetCargo(c,cargo);
    c.restore();
}
