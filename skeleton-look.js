// The scene and its contour recorder use exactly the same bone geometry.
export function drawSkeletonTorso(c){c.strokeStyle='#ddd3b8';c.lineWidth=2;c.beginPath();c.moveTo(0,-32);c.lineTo(0,-13);c.moveTo(-5,-14);c.lineTo(5,-14);c.moveTo(-5,-14);c.lineTo(-3,-11);c.lineTo(3,-11);c.lineTo(5,-14);for(let y=-28;y<=-20;y+=4){c.moveTo(-6,y);c.lineTo(-5,y+2);c.lineTo(5,y+2);c.lineTo(6,y);}c.stroke();}
