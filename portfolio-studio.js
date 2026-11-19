// An architectural perspective of the archive, looking towards the harbour.
function openPortfolioStudio({build, collection, review, leave}) {
  const room = document.createElement('section');
  room.id = 'archive-interior';
  room.setAttribute('aria-label','Inside the Portfolio Builder');
  document.body.append(room);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  room.append(canvas);
  const heading = document.createElement('h1');
  heading.textContent = 'Portfolio Builder';
  room.append(heading);
  function station(name, action, x, y) {
    const control = document.createElement('button');
    control.textContent = name;
    control.onclick = action;
    control.style.left = x+'%';
    control.style.top = y+'%';
    room.append(control);
    return control;
  }
  const first = station('Story desk', build, 49, 72);
  station('My collection', collection, 21, 45);
  station('Teacher desk', review, 80, 54);
  const exit = station('Leave building', leave, 50, 92);
  exit.className = 'archive-exit';
  const ctx = canvas.getContext('2d');
  function paint() {
    const w=room.clientWidth,h=room.clientHeight;
    if (!w || !h) return;
    canvas.width=w*devicePixelRatio; canvas.height=h*devicePixelRatio;
    ctx.scale(canvas.width/1000,canvas.height/650);
    const sky=ctx.createLinearGradient(0,100,0,375);
    sky.addColorStop(0,'#91bdc7');sky.addColorStop(.6,'#fbd5ab');sky.addColorStop(1,'#7babb0');
    ctx.fillStyle='#ead4ae';ctx.fillRect(0,0,1000,650);
    function shape(points,fill,stroke) {
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
    }
    function box(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
    shape([[0,0],[1000,0],[739,117],[267,117]],'#bb9773');
    for(let i=0;i<9;i++) shape([[i*140-75,0],[i*140-57,0],[270+i*62,117],[264+i*62,117]],'#80624c');
    shape([[0,0],[267,117],[267,365],[0,505]],'#d1b591');
    shape([[1000,0],[739,117],[739,365],[1000,505]],'#ddc49f');
    shape([[0,505],[267,365],[739,365],[1000,505],[1000,650],[0,650]],'#e7d2af');
    for(let i=-4;i<=5;i++)shape([[500+i*50,365],[502+i*50,365],[502+i*190,650],[500+i*190,650]],'#c9b18c');
    for(const y of [393,441,526,629])box(0,y,1000,1,'#c4ad8e');
    ctx.save();ctx.beginPath();ctx.roundRect(305,131,390,211,[105,105,4,4]);ctx.clip();
    box(305,131,390,211,sky);box(305,259,390,84,'#83b4b2');
    shape([[305,259],[345,242],[385,249],[435,233],[496,254],[526,259]],'#799392');
    for(let i=0;i<55;i++)box(310+(i*73)%380,265+(i*17)%73,5+i%20,1,'#bad2c3');
    for(const x of [399,498,597])box(x,130,5,214,'#aa8d6b');ctx.restore();
    // Recessed oak display shelving, with individual portfolio volumes.
    for(let row=0;row<3;row++){
      const y=174+row*53;
      box(36,y,210,46,'#725747');
      for(let i=0;i<16;i++){const bh=21+(i*7+row*11)%18;box(43+i*12,y+42-bh,9,bh,['#adc2b1','#d49b77','#dbbf88','#698e8a'][(i+row)%4]);}
      box(31,y+43,220,7,'#aa825c');
    }
    function desk(x,y,w){
      shape([[x,y],[x+w*.14,y-22],[x+w*.86,y-22],[x+w,y]],'#ae8764');
      shape([[x+6,y],[x+w-6,y],[x+w-18,y+55],[x+18,y+55]],'#986f50');
      box(x,y,w,7,'#735941');
    }
    desk(731,324,215);desk(312,442,360);
    shape([[415,431],[441,414],[485,417],[467,436]],'#fff7dd');
    shape([[467,436],[485,417],[529,414],[519,431]],'#f0dfba');
    for(const x of [290,707]){box(x,304,12,49,'#946e51');for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#547c68':'#789578';ctx.beginPath();ctx.ellipse(x+6+Math.sin(i)*12,297+i%3*5,7,21,i-.8,0,Math.PI*2);ctx.fill()}}
  }
  const observer=new ResizeObserver(paint);observer.observe(room);paint();first.focus();
  return {room, destroy(){observer.disconnect();room.remove()}};
}
