// Only the real unfinished local foundation is drawn. No generic town buildings.
export function paintFoundation(c,r){
 c.save();c.fillStyle='#75654d';c.fillRect(-25,-5,50,5);c.fillStyle='#b29463';
 if(r.progress>=2){c.fillRect(-23,-38,4,34);c.fillRect(19,-38,4,34);c.fillRect(-23,-39,46,4);}
 if(r.progress>=3){c.fillStyle='#918469';c.fillRect(-19,-34,38,28);c.strokeStyle='#b99b68';c.lineWidth=3;c.beginPath();c.moveTo(-26,-39);c.lineTo(0,-55);c.lineTo(26,-39);c.stroke();}
 c.fillStyle='#d8d2b4';c.font='11px sans-serif';c.textAlign='center';c.fillText((r.label||'Общий дом')+' · '+r.progress+'/'+(r.required||4),0,-62);if(r.pause){c.fillStyle='#c9a181';c.fillText('Работа приостановлена',0,-77);}c.restore();
}
