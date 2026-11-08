'use strict';

// Each mark is a filled silhouette in a 32 by 32 grid, shared by the world and Blueprint.
const labThemes = {
  2: {
    name:'Communication', accent:'#81e4dd', enamel:'#246f7b', landmark:'Signal forum',
    detail:'Two aerials carry messages in both directions from the glazed forum.',
    meaning:'Two speech bubbles represent speaking, listening and replying.',
    mark:'M3 4h17a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H10l-6 5v-5H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm22 10h3a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-1v4l-5-4h-8a3 3 0 0 1-3-3v-5h9a5 5 0 0 0 5-5Z',
  },
  3: {
    name:'Collaboration', accent:'#a9c7ff', enamel:'#315796', landmark:'Woven commons',
    detail:'Two roof wings join above an open meeting court and shared worktable.',
    meaning:'Two people work on one piece together.',
    mark:'M8.2 3.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm15.6 0a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2ZM8.2 12c-3.4 0-5.7 2.3-5.7 5.6v10h5.1V21l3-2.2h2.5v-4.2h-2.3A3.1 3.1 0 0 0 8.2 12Zm15.6 0c3.4 0 5.7 2.3 5.7 5.6v10h-5.1V21l-3-2.2h-2.5v-4.2h2.3a3.1 3.1 0 0 1 2.6-2.6ZM14 13.5h4v6.4h-4Z',
  },
  4: {
    name:'Initiative', accent:'#ffad85', enamel:'#ae542e', landmark:'Launch ramp',
    detail:'A copper roof rises from a low workbench bay into a forward cantilever.',
    meaning:'An arrow rises from the first step.',
    mark:'M14 5h15v15h-5.5v-5.6L14 24l-4-4 9.5-9.5H14V5ZM3 24h5v3h8v3H3v-6Z',
  },
  5: {
    name:'Problem-solving', accent:'#d7bdff', enamel:'#685393', landmark:'Test foundry',
    detail:'Two faceted test chambers meet at a violet observation bridge.',
    meaning:'A checked puzzle piece represents testing a solution.',
    mark:'M4 9h7V7a5 5 0 0 1 10 0v2h6v5h-1a4.5 4.5 0 0 0 0 9h1v5H4V9Zm5 9.5 4.6 4.6 7.4-7.6-2.5-2.4-4.9 5-2.1-2.1-2.5 2.5Z',
  },
  6: {
    name:'Adaptability', accent:'#a8ecc0', enamel:'#3c795b', landmark:'Tidefold conservatory',
    detail:'Offset jade roof segments unfold over the greenhouse and its planted court.',
    meaning:'A curved arrow changes course around an obstacle.',
    mark:'M4 27v-5C4 13.6 9.6 8.5 18 8.5h3V3l9 8.5-9 8.5v-5.7h-3c-5 0-8.1 2.8-8.1 7.7v5H4Zm15-5a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z',
  },
  7: {
    name:'Self-management', accent:'#ffdd92', enamel:'#aa7b32', landmark:'Planning terraces',
    detail:'Three staggered bays follow an ordered sequence under a stepped roof.',
    meaning:'A calendar with organised rows represents planning time and effort.',
    mark:'M7 3h4v3h10V3h4v3h2.5A2.5 2.5 0 0 1 30 8.5v18a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 26.5v-18A2.5 2.5 0 0 1 4.5 6H7V3Zm0 9v3h18v-3H7Zm0 6v3h11v-3H7Zm0 6v2h15v-2H7Z',
  },
  8: {
    name:'Creativity', accent:'#ffb6df', enamel:'#a2537e', landmark:'Prism atelier',
    detail:'Three pleated glass sails fan out above a workshop floor.',
    meaning:'A spark inside a bulb represents an idea taking shape.',
    mark:'M16 2.8c-6.6 0-11.3 4.7-11.3 10.5 0 4 2.1 7 5.2 9.2V25h12.2v-2.5c3.1-2.2 5.2-5.2 5.2-9.2C27.3 7.5 22.6 2.8 16 2.8Zm0 4.2 1.9 4.8 4.9 1.9-4.9 1.9-1.9 4.8-1.9-4.8-4.9-1.9 4.9-1.9L16 7Zm-5 19.8h10v3H11v-3Z',
  },
  9: {
    name:'Leadership', accent:'#ffa9ad', enamel:'#8e3d4f', landmark:'Guiding beacon',
    detail:'A lighthouse lantern rises from an arcaded meeting terrace.',
    meaning:'A flag on a summit marks a shared direction.',
    mark:'M9 3h20l-5.2 6.1L29 15H13v8.2l3.7-3L30 29H2l7-5.2V3Z',
  },
};

function createLabMark(index) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 32 32');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  svg.classList.add('lab-mark');
  const shape=document.createElementNS(svg.namespaceURI,'path');
  shape.setAttribute('d',labThemes[index].mark);
  shape.setAttribute('fill','currentColor');
  shape.setAttribute('fill-rule','evenodd');
  svg.append(shape);
  return svg;
}

function createLabSignAtlas() {
  const atlas=document.createElement('canvas');
  const cellWidth=512,cellHeight=160;
  atlas.width=cellWidth*2;
  atlas.height=cellHeight*4;
  const ink=atlas.getContext('2d');
  for (const [key,theme] of Object.entries(labThemes)) {
    const slot=Number(key)-2,x=slot%2*cellWidth,y=Math.floor(slot/2)*cellHeight;
    ink.fillStyle='#12282f';
    ink.fillRect(x,y,cellWidth,cellHeight);
    ink.strokeStyle='#a6855d';
    ink.lineWidth=5;
    ink.strokeRect(x+5,y+5,cellWidth-10,cellHeight-10);
    ink.fillStyle=theme.accent;
    ink.fillRect(x+23,y+37,84,84);
    ink.save();
    ink.translate(x+35,y+49);
    ink.scale(1.86,1.86);
    ink.fillStyle='#132a31';
    ink.fill(new Path2D(theme.mark),'evenodd');
    ink.restore();
    ink.fillStyle='#fff8e9';
    ink.font='700 47px system-ui, sans-serif';
    ink.fillText(theme.name,x+127,y+75,358);
    ink.fillStyle=theme.accent;
    ink.font='750 27px system-ui, sans-serif';
    ink.fillText('S K I L L S   L A B',x+129,y+115);
  }
  return atlas;
}

// Site extents and plaque positions are in local metres from each lab centre.
const labSites = {
  2: {plaque:[1.94,3.93,2.60]},
  3: {bounds:[0,-.07,2.94,2.09,2.3], plaque:[-1.88,2.40,2.58]},
  4: {bounds:[0,-.06,2.79,2.14,4.0], plaque:[1.89,2.45,2.58]},
  5: {bounds:[0,-.14,2.82,2.13,3.1], plaque:[-1.90,2.42,2.88]},
  6: {bounds:[-.16,-.10,2.73,2.27,2.4], plaque:[1.89,2.54,2.57]},
  7: {bounds:[0,-.07,2.86,2.34,4.8], plaque:[1.64,2.42,2.68]},
  8: {bounds:[0,-.18,2.85,2.28,2.6], plaque:[-1.88,2.48,2.64]},
  9: {bounds:[0,-.15,2.83,2.38,2.4], plaque:[1.93,2.52,2.62]},
};

function labExteriorBlocks(index,dx,dz) {
  const {bounds,plaque}=labSites[index];
  const [x,z,rx,rz,shape]=bounds;
  const [px,pz,width]=plaque;
  const body=Math.abs((dx-x)/(rx+.13))**shape+Math.abs((dz-z)/(rz+.13))**shape<1;
  const sign=Math.abs(dx-px)<width*.51 && Math.abs(dz-pz)<.27;
  return body||sign;
}

function buildLabExteriors(places, art, landscape, authoredBuildings) {
  const {finish,tri,quad,box,shell,taper,glass,shrub,light,sign}=art;
  const {lantern,plantedBed}=landscape;
  const tau=2*Math.PI;
  const ivory='#f3d9b5', stone='#b89d83', brass='#a5794c', dark='#53483d', amber='#ffd69a';

  function site(index) {
    const [,x,z]=places[index];
    const y=terraceHeight(x,z);
    return {index,x,y,z,theme:labThemes[index],p:(u,h,v)=>[x+u,y+h,z+v]};
  }
  function ellipse(x,z,w,d,count=32,angle=0) {
    return Array.from({length:count},(_,i)=>{
      const a=tau*i/count+angle;
      return [x+w*Math.cos(a),z+d*Math.sin(a)];
    });
  }
  function chamfer(x,z,w,d,cut) {
    return [[-w+cut,-d],[w-cut,-d],[w,-d+cut],[w,d-cut],[w-cut,d],
      [-w+cut,d],[-w,d-cut],[-w,-d+cut]].map(([u,v])=>[x+u,z+v]);
  }
  function inset(outline,scale,x=0,z=0) {
    return outline.map(([u,v])=>[x+(u-x)*scale,z+(v-z)*scale]);
  }
  function ring(site,rows,color,material,cap=false) {
    const {p}=site;
    finish(material);
    for(let level=1;level<rows.length;level++) {
      const [bottom,lo]=rows[level-1],[top,hi]=rows[level];
      for(let i=0;i<bottom.length;i++) {
        const j=(i+1)%bottom.length;
        const a=bottom[i],b=bottom[j],c=top[i],d=top[j];
        quad(p(b[0],lo,b[1]),p(a[0],lo,a[1]),p(c[0],hi,c[1]),p(d[0],hi,d[1]),color);
      }
    }
    if(cap) {
      const [top,h]=rows.at(-1);
      const [x,z]=top.reduce(([a,b],[u,v])=>[a+u/top.length,b+v/top.length],[0,0]);
      for(let i=0;i<top.length;i++) {
        const a=top[i],b=top[(i+1)%top.length];
        tri(p(x,h,z),p(b[0],h,b[1]),p(a[0],h,a[1]),color,true);
      }
    }
  }
  function deck(site,outline,top=.20) {
    ring(site,[[outline,.012],[outline,top-.055],[inset(outline,.977),top]],stone,2);
    ring(site,[[inset(outline,.977),top]],ivory,22,true);
  }
  function wall(site,outline,bottom,crown,solid=()=>false) {
    const {p,theme}=site;
    for(let i=0;i<outline.length;i++) {
      const [x,z]=outline[i],[u,v]=outline[(i+1)%outline.length];
      const h=crown(x,z),k=crown(u,v);
      const a=p(u,bottom,v),b=p(x,bottom,z),c=p(x,h,z),d=p(u,k,v);
      if(solid(i)) {
        finish(28);
        quad(a,b,c,d,theme.enamel);
      } else glass([a,b,c,d],theme.accent,false);
      finish(4);
      taper(b,c,.040,.047,dark);
    }
  }
  function interiorTable(site,u,v,r) {
    const {x,y,z}=site;
    finish(26);
    shell(x+u,z+v,[[y+.21,r*.62],[y+.34,r*.57],[y+.76,r*.38],
      [y+.82,r],[y+.91,r],[y+.94,0]],'#bd9369',32);
    finish(17);
    shell(x+u,z+v,[[y+.855,r+.006],[y+.877,r+.007]],amber,32);
  }
  function windowSeat(site,u,v,width,colour) {
    const {x,y,z}=site;
    finish(18);
    box(x+u,y+.21,z+v,width*.52,.34,.21,ivory);
    finish(28);
    box(x+u,y+.54,z+v,width*.53,.10,.23,colour);
  }
  function border(site,start,end,r=.055,colour=ivory) {
    finish(18);
    taper(site.p(...start),site.p(...end),r,r,colour);
  }
  function framedPanel(site,face,colour,window=false) {
    const points=face.map(point=>site.p(...point));
    if(window) {
      glass(points,colour,true);
      glass([...points].reverse(),colour,true);
    } else {
      finish(28);
      quad(...points,colour);
    }
  }

  function collaboration(s) {
    const {p,theme,x,y,z}=s;
    deck(s,ellipse(0,-.12,2.98,2.30,56));
    const wing=(side,t,v)=>{
      const sweep=Math.sin(Math.PI*t);
      return [side*(2.84-3.30*t)+.14*v*t,2.31+1.36*t+.43*sweep+side*.19*t+.32*side*v*t,
        v*(1.93-.25*t)+side*.47*t-.13];
    };
    for(const side of [-1,1]) {
      for(let j=0;j<20;j++) {
        const a=j/20,b=(j+1)/20;
        for(let row=0;row<8;row++) {
          const u=-1+row/4,v=u+.25;
          const face=[wing(side,a,u),wing(side,a,v),wing(side,b,v),wing(side,b,u)];
          framedPanel(s,side>0?face.reverse():face,theme.enamel,row>=2&&row<=5&&j>3&&j<17);
        }
        for(const rim of [-1,1]) {
          const first=wing(side,a,rim),last=wing(side,b,rim);
          border(s,first,last,.091);
          finish(17);
          taper(p(first[0],first[1]-.074,first[2]),p(last[0],last[1]-.074,last[2]),.023,.022,amber);
        }
        if(j%4===0) border(s,wing(side,a,-1),wing(side,a,1),.044);
      }
      for(const depth of [-1,1]) {
        const top=wing(side,.10,depth*.78);
        finish(18);
        taper(p(side*2.48,.19,depth*1.47),p(...top),.194,.112,ivory);
      }
      windowSeat(s,side*1.92,-.75,1.40,theme.enamel);
      for(let j=0;j<8;j++) {
        const u=side*(1.18+j*.18),v=-1.53+.15*Math.sin(j*.41);
        finish(1);
        box(x+u,y+.23,z+v,.045,1.40-j*.055,.037,'#b98d67');
      }
      for(const h of [.46,1.11,1.66]) {
        finish(4);
        box(x+side*2.30,y+h,z-.89,.055,.046,.63,brass);
      }
    }
    interiorTable(s,0,.03,1.12);
    for(const side of [-1,1]) windowSeat(s,side*1.20,.49,.43,theme.enamel);
    finish(1);
    shell(x,z+.03,[[y+.930,1.08],[y+.956,1.08],[y+.956,0]],'#bc915f',40);
    for (const [u,v,h,colour] of [[-.36,-.15,.20,theme.enamel],[.04,.08,.31,ivory],[.37,-.12,.23,'#7396b7']]) {
      finish(28);
      box(x+u,y+.955,z+v,.16,h,.18,colour);
    }
    finish(17);
    shell(x,z+.08,[[y+3.19,.69],[y+3.24,.71],[y+3.24,.57]],amber,42);
    finish(4);
    for(const side of [-1,1]) taper(p(side*.54,3.23,.08),p(side*.54,3.68,.08),.019,.018,brass);
  }

  function initiative(s) {
    const {p,theme,x,y,z}=s;
    const outline=chamfer(0,-.07,2.68,2.04,.34);
    deck(s,chamfer(0,-.07,2.79,2.21,.34));
    const height=(u,v)=>{
      const t=(u+2.79)/5.59;
      return .86+3.61*t+.48*Math.sin(Math.PI*t)+.16*v;
    };
    const walls=outline.flatMap(([u,v],i)=>{
      const [a,b]=outline[(i+1)%outline.length],points=Math.ceil(Math.hypot(a-u,b-v)/.73);
      return Array.from({length:points},(_,j)=>[u+(a-u)*j/points,v+(b-v)*j/points]);
    });
    wall(s,walls,.31,(u,v)=>height(u,v)-.13,i=>walls[i][1]<-.8 || walls[i][0]<-1.85);
    const roof=(t,v)=>[-2.86+t*5.84,height(-2.86+t*5.84,v)+.12,v];
    for(let j=0;j<28;j++) {
      const a=j/28,b=(j+1)/28;
      framedPanel(s,[roof(a,2.12),roof(b,2.12),roof(b,.61),roof(a,.61)],theme.enamel,j>11&&j<23);
      framedPanel(s,[roof(a,.61),roof(b,.61),roof(b,-2.23),roof(a,-2.23)],theme.enamel);
      for(const v of [-2.23,.61,2.12]) border(s,roof(a,v),roof(b,v),v===.61?.036:.086);
      if(j%5===0) border(s,roof(a,-2.23),roof(a,2.12),.037);
    }
    for(const [u,v] of [[2.60,1.71],[1.65,-1.74]]) {
      finish(18);
      taper(p(u-.40,.21,v),p(u+.16,height(u,v)-.02,v),.155,.105,ivory);
      finish(28);
      taper(p(u-.31,.31,v+.04),p(u+.19,height(u,v)-.03,v+.04),.043,.041,theme.accent);
    }
    for(let j=0;j<6;j++) {
      finish(26);
      box(x-1.69+j*.55,y+.22,z+.22,.26,.18+j*.14,.58,'#b99170');
      finish(17);
      box(x-1.69+j*.55,y+.39+j*.14,z+.805,.247,.027,.019,amber);
    }
    finish(18);
    quad(p(-1.20,1.52,2.14),p(1.22,2.41,2.14),p(1.22,2.51,1.72),p(-1.20,1.63,1.72),ivory);
    finish(28);
    taper(p(-1.20,1.545,2.17),p(1.22,2.435,2.17),.049,.047,theme.accent);
  }

  function problemSolving(s) {
    const {p,theme,x,y,z}=s;
    deck(s,chamfer(0,-.14,2.88,2.22,.43));
    for(const [u,v,w,d,turn,top] of [[-1.31,.04,1.41,1.80,.18,2.68],[1.31,-.39,1.47,1.69,-.22,3.70]]) {
      const footprint=ellipse(u,v,w,d,6,turn);
      ring(s,[[footprint,.23],[footprint,.50]],theme.enamel,28);
      wall(s,footprint,.52,()=>top-.19,i=>i===3||i===4||i===5);
      ring(s,[[footprint,top-.24],[inset(footprint,1.08,u,v),top-.04],[inset(footprint,1.03,u,v),top+.09]],ivory,18);
      const crown=inset(footprint,.68,u,v);
      ring(s,[[footprint,top+.09],[crown,top+.43]],theme.enamel,28,true);
      ring(s,[[inset(crown,.86,u,v),top+.438]],'#9980c1',28,true);
      for(const [a,b] of footprint) border(s,[a,.45,b],[a,top-.22,b],.068);
    }
    const bridge=chamfer(-.05,.40,1.53,.67,.19);
    ring(s,[[bridge,1.50],[bridge,1.72]],ivory,18);
    wall(s,bridge,1.73,()=>2.38,i=>i===1||i===5);
    ring(s,[[bridge,2.37],[inset(bridge,1.06),2.51],[bridge,2.63]],theme.enamel,28,true);
    for(const side of [-1,1]) {
      finish(4);
      taper(p(side*1.13,.24,.83),p(side*.41,1.57,.91),.077,.060,brass);
      finish(17);
      box(x+side*.57,y+1.55,z+1.08,.40,.039,.030,amber);
    }
    interiorTable(s,-1.30,.18,.54);
    interiorTable(s,1.27,-.21,.61);
    const lens=(a,r,d)=>p(1.44+r*Math.cos(a),2.73+r*Math.sin(a),1.09+d);
    for(let j=0;j<6;j++) {
      const a=(j+.5)*tau/6,b=(j+1.5)*tau/6;
      finish(18);
      quad(lens(a,.58,-.12),lens(b,.58,-.12),lens(b,.58,.052),lens(a,.58,.052),ivory);
      finish(28);
      quad(lens(a,.58,.052),lens(b,.58,.052),lens(b,.455,.076),lens(a,.455,.076),theme.accent);
      tri(p(1.44,2.73,1.167),lens(a,.455,.076),lens(b,.455,.076),'#394865',false);
    }
    finish(17);
    taper(p(1.13,2.73,1.178),p(1.73,2.73,1.178),.018,.018,amber);
  }

  function adaptability(s) {
    const {p,theme,x,y,z}=s;
    const ribs=[[-2.26,-.45,1.93,1.80],[-1.20,-.56,2.40,2.57],
      [-.06,-.33,2.62,2.86],[1.04,.02,2.43,2.42],[2.04,.25,1.97,1.81]];
    deck(s,ellipse(-.15,-.12,2.81,2.32,48));
    const arc=(station,a)=>{
      const [v,center,w,h]=ribs[station];
      return [center+w*Math.cos(a),.68+h*Math.sin(a),v+.23*Math.cos(a)*Math.sin(a)];
    };
    for(let s1=0;s1<ribs.length;s1++) {
      for(let j=0;j<24;j++) {
        const a=j*Math.PI/24,b=(j+1)*Math.PI/24;
        border(s,arc(s1,a),arc(s1,b),s1===4?.087:.057);
        if(s1<ribs.length-1) {
          const face=[arc(s1,a),arc(s1,b),arc(s1+1,b),arc(s1+1,a)];
          const vent=(s1===1&&j>=6&&j<=9)||(s1===2&&j>=14&&j<=16);
          if(vent) {
            const lift=([u,h,v])=>[u,h+.20,v+.10];
            framedPanel(s,face.map(lift),theme.enamel);
            border(s,lift(face[0]),lift(face[1]),.042);
            if(j===6||j===9||j===14||j===16) {
              finish(4);
              taper(p(...face[0]),p(...lift(face[0])),.033,.032,brass);
            }
          } else framedPanel(s,face,j%4===0?theme.accent:theme.enamel,j%6!==0);
        }
        if(s1===0 || s1===ribs.length-1) {
          const [u,h,v]=arc(s1,a),[xx,hh,zz]=arc(s1,b);
          const face=[p(xx,.28,zz),p(u,.28,v),p(u,h,v),p(xx,hh,zz)];
          glass(s1===4?face:face.reverse(),theme.accent,false);
          if(j%4===0) border(s,[u,.24,v],[u,h,v],.030,brass);
        }
      }
      for(const a of [0,Math.PI]) {
        const [u,h,v]=arc(s1,a);
        border(s,[u,.20,v],[u,h+.08,v],.115);
      }
    }
    for(const side of [-1,1]) {
      finish(18);
      shell(x+side*1.22,z+.45,[[y+.18,.65],[y+.53,.69],[y+.56,.64],[y+.56,0]],ivory,28,1.75);
      for(let j=0;j<9;j++) shrub(x+side*1.22+.38*Math.cos(j*2.399),y+.53,
        z+.43+.85*Math.sin(j*2.399),.80,.94,j*2.399,j%4,.85);
    }
    finish(4);
    box(x+.24,y+.24,z+2.06,.047,1.43,.042,dark);
  }

  function selfManagement(s) {
    const {p,theme,x,y,z}=s;
    deck(s,chamfer(0,-.10,2.88,2.35,.32));
    for(const [i,u,v,w,d,top] of [[0,-1.83,.21,.86,1.74,1.98],[1,0,.10,.94,2.00,2.77],[2,1.81,-.18,.91,2.04,3.63]]) {
      const walls=chamfer(u,v,w,d,.19);
      ring(s,[[walls,.22],[walls,.57]],theme.enamel,28);
      wall(s,walls,.59,()=>top-.12,j=>j!==3&&j!==4&&j!==5);
      const cap=chamfer(u,v,w+.14,d+.15,.23);
      ring(s,[[walls,top-.12],[cap,top],[cap,top+.18],[inset(cap,.97,u,v),top+.25]],ivory,18,true);
      for(let row=0;row<3;row++) {
        finish(28);
        box(x+u,y+top-.09+row*.095,z+v+d+.154,w+.075,.034,.019,theme.enamel);
      }
      const beds=chamfer(u,v-.63,w*.62,.66,.15);
      ring(s,[[beds,top+.25],[beds,top+.40]],'#777e4a',16,true);
      for(let j=0;j<5;j++) shrub(x+u+.41*Math.cos(j*2.399),y+top+.37,
        z+v-.61+.51*Math.sin(j*2.399),.44,.34,j*2.399,j%4,.75);
      windowSeat(s,u,v+1.02,1.19,theme.enamel);
      finish(26);
      box(x+u,y+.25,z+v-.49,w*.71,.49,.37,'#ac805b');
      box(x+u,y+.73,z+v-.49,w*.77,.078,.43,'#deba91');
      for(let row=0;row<i+1;row++) {
        finish(18);
        box(x+u-.27+row*.27,y+.82,z+v-.36,.092,.21+row*.095,.15,ivory);
      }
      finish(17);
      box(x+u,y+.711,z+v-.054,w*.68,.021,.016,amber);
      finish(4);
      box(x+u,y+.60,z+v+d+.008,.024,top-.71,.037,dark);
      if(i===2) {
        const center=top-.44,front=v+d+.039;
        for(let j=0;j<28;j++) {
          const circle=(a,r,dz)=>p(u+r*Math.cos(a),center+r*Math.sin(a),front+dz);
          const a=j*tau/28,b=(j+1)*tau/28;
          finish(28);
          quad(circle(a,.342,0),circle(b,.342,0),circle(b,.277,.012),circle(a,.277,.012),theme.accent);
          tri(p(u,center,front),circle(a,.277,0),circle(b,.277,0),'#493b2c',false);
        }
        finish(17);
        taper(p(u,center,front+.025),p(u,center+.18,front+.025),.019,.016,amber);
        taper(p(u,center,front+.025),p(u+.115,center-.054,front+.025),.019,.016,amber);
      }
    }
  }

  function creativity(s) {
    const {p,theme,x,y,z}=s;
    const floor=ellipse(0,-.18,2.86,2.28,48);
    deck(s,floor);
    const wallPlan=ellipse(0,-.18,2.66,2.10,32);
    const eave=(u,v)=>1.88+.28*Math.cos(u*.72)+.11*v;
    wall(s,wallPlan,.29,eave,i=>i>16&&i<27);
    const skirt=inset(wallPlan,1.056,0,-.18);
    const crown=inset(wallPlan,.37,0,-.18);
    for(let j=0;j<skirt.length;j++) {
      const k=(j+1)%skirt.length;
      const [a,b]=skirt[j],[c,d]=skirt[k],[u,v]=crown[j],[xx,zz]=crown[k];
      framedPanel(s,[[c,eave(c,d),d],[a,eave(a,b),b],[u,2.41,v],[xx,2.41,zz]],theme.enamel,j%4!==0);
      border(s,[a,eave(a,b),b],[c,eave(c,d),d],.068);
      if(j%4===0) border(s,[a,eave(a,b),b],[u,2.41,v],.040);
    }
    const sails=[
      [-2.35,-1.11,3.71,'#ad5489','#cf91b5'],
      [.10,.16,4.80,'#995887','#ad92d4'],
      [2.55,1.54,4.08,'#a65376','#e0a588'],
    ];
    for(const [tip,start,top,colour,tint] of sails) {
      const pleat=(t,side)=>{
        const spread=.28+.59*Math.sin(Math.PI*t*.80);
        return [start+(tip-start)*t+side*spread,1.87+(top-1.87)*t-.27*side,
          -1.93+4.13*t-.71*side*t];
      };
      for(let j=0;j<20;j++) {
        const a=j/20,b=(j+1)/20;
        for(const side of [-1,1]) {
          const face=[pleat(a,0),pleat(a,side),pleat(b,side),pleat(b,0)];
          framedPanel(s,side===1?face.reverse():face,side===1?tint:colour,j>5&&j%5!==0&&side===1);
        }
        for(const side of [-1,0,1]) border(s,pleat(a,side),pleat(b,side),side===0?.063:.038);
      }
      const [u,h,v]=pleat(1,0);
      finish(18);
      taper(p(u*.87,.23,v-.29),p(u,h,v),.084,.044,ivory);
      finish(17);
      taper(p(u*.87,.63,v-.25),p(u,h-.32,v+.045),.020,.018,amber);
    }
    interiorTable(s,-.47,.17,.71);
    for(let i=0;i<3;i++) {
      finish(28);
      box(x+.82+i*.35,y+.62,z-.53,.13,.48+i*.18,.39,sails[i][3]);
    }
  }

  function leadership(s) {
    const {p,theme,x,y,z}=s;
    deck(s,ellipse(0,-.15,2.94,2.40,56));
    const u=.83,v=-.68, tower=ellipse(u,v,.89,.88,24);
    const narrow=inset(tower,.67,u,v);
    ring(s,[[tower,.20],[inset(tower,1.22,u,v),.30],[tower,.58]],ivory,18);
    ring(s,[[tower,.57],[narrow,4.61]],theme.enamel,28);
    for(const a of [-.83,.46,1.72,2.97,4.20]) {
      finish(18);
      taper(p(u+.87*Math.cos(a),.57,v+.86*Math.sin(a)),
        p(u+.61*Math.cos(a),4.68,v+.59*Math.sin(a)),.082,.070,ivory);
    }
    const balcony=inset(tower,1.11,u,v);
    ring(s,[[narrow,4.45],[balcony,4.70],[balcony,4.85],[inset(balcony,.92,u,v),4.90]],ivory,18,true);
    const crown=inset(tower,.79,u,v);
    wall(s,crown,4.91,()=>5.66);
    for(let j=0;j<8;j++) {
      const a=j*tau/8;
      border(s,[u+.79*Math.cos(a),4.84,v+.77*Math.sin(a)],
        [u+.79*Math.cos(a),5.71,v+.77*Math.sin(a)],.036,brass);
    }
    finish(17);
    shell(x+u,z+v,[[y+4.98,.34],[y+5.12,.42],[y+5.47,.34],[y+5.60,.13]],amber,24);
    ring(s,[[crown,5.63],[inset(tower,1.01,u,v),5.76],[crown,5.88],
      [inset(tower,.21,u,v),6.23]],theme.enamel,28,true);
    finish(4);
    shell(x+u,z+v,[[y+6.21,.19],[y+6.31,.16],[y+6.41,0]],brass,20);
    const loggia=(a,r,h)=>[-.62+r*Math.cos(a),h,.03+r*.81*Math.sin(a)];
    for(let j=0;j<32;j++) {
      const a=(.12+j*.84/32)*Math.PI,b=(.12+(j+1)*.84/32)*Math.PI;
      const top=2.19+.15*Math.sin(a);
      finish(18);
      quad(p(...loggia(a,2.02,top)),p(...loggia(b,2.02,top)),p(...loggia(b,.48,top)),p(...loggia(a,.48,top)),ivory);
      border(s,loggia(a,2.04,top),loggia(b,2.04,top),.081);
      const arcade=top-.35+.23*Math.sin((j%6)*Math.PI/6);
      const next=top-.35+.23*Math.sin(((j+1)%6)*Math.PI/6);
      finish(18);
      quad(p(...loggia(a,2.02,top)),p(...loggia(b,2.02,top)),
        p(...loggia(b,2.02,next)),p(...loggia(a,2.02,arcade)),ivory);
      finish(17);
      taper(p(...loggia(a,2.031,arcade)),p(...loggia(b,2.031,next)),.021,.020,amber);
      if(j%6===0) {
        const [px,,pz]=loggia(a,1.98,top);
        finish(18);
        taper(p(px,.23,pz),p(px,top,pz),.109,.092,ivory);
      }
    }
    windowSeat(s,-1.76,.28,1.40,theme.enamel);
    interiorTable(s,-.68,.66,.66);
  }

  function plaque(s) {
    const {index,x,z,theme}=s;
    const [u,v,width]=labSites[index].plaque;
    const depth=index===2&&!authoredBuildings?v-.80:v;
    const ground=terraceHeight(x+u,z+depth),height=width/3.2;
    const px=x+u,pz=z+depth;
    const bottom=index===2?.97:.565;
    finish(18);
    box(px,ground+.015,pz,width*.53,.14,.245,ivory);
    for(const side of [-1,1]) box(px+side*width*.32,ground+.14,pz,.088,bottom-.11,.112,ivory);
    finish(4);
    box(px,ground+bottom-.025,pz,width*.515,height+.052,.107,brass);
    finish(28);
    box(px,ground+bottom-.075,pz+.071,width*.48,.058,.031,theme.enamel);
    sign(index,px,ground+bottom,pz+.112,width,height);
  }

  const labs=[collaboration,initiative,problemSolving,adaptability,selfManagement,creativity,leadership];
  for(const [i,build] of labs.entries()) {
    const s=site(i+3),{x,z,theme,index}=s;
    build(s);
    const approach=(u,v)=>[x+u,terraceHeight(x+u,z+v)+.055,z+v];
    finish(22);
    quad(approach(-1.21,2.05),approach(-1.21,4.30),approach(1.21,4.30),approach(1.21,2.05),stone,false);
    for(const side of [-1,1]) {
      finish(28);
      const inner=side*.88,outer=side*.98;
      const stripe=(u,v)=>[x+u,terraceHeight(x+u,z+v)+.061,z+v];
      quad(stripe(inner,2.34),stripe(inner,4.13),stripe(outer,4.13),stripe(outer,2.34),theme.accent,false);
      lantern(x+side*1.21,z+3.09,terraceHeight(x+side*1.21,z+3.09),.72,.87);
    }
    const side=Math.sign(labSites[index].plaque[0]);
    plantedBed(x-side*2.05,z+2.65,.62,.73,index%4);
    light(x,z+2.66,1.51,1.31,.65,terraceHeight(x,z+2.66));
    plaque(s);
  }
  plaque(site(2));
  finish(0);
}
