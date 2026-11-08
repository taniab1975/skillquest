'use strict';

const labThemes = {
  2: {accent:'#70e7df', enamel:'#2f8084', landmark:'Signal observatory',
    detail:'Twin aerials send a clear signal across the harbour.',
    symbol:'M3 12h5l3-6 4 17 4-15 3 9h7'},
  3: {accent:'#a8c8ff', enamel:'#365d9c', landmark:'Linked workshops',
    detail:'Two blue workshops share one covered meeting place.',
    symbol:'M13 9H9a6 6 0 0 0 0 12h4m6-12h4a6 6 0 0 1 0 12h-4M11 15h10'},
  4: {accent:'#ffad7c', enamel:'#b3542b', landmark:'Launch workshop',
    detail:'A copper sail rises above a workshop for taking the first step.',
    symbol:'M6 25 24 7M13 7h11v11M5 16v10h10'},
  5: {accent:'#d3b7ff', enamel:'#695393', landmark:'Systems workshop',
    detail:'Violet test bays meet around a faceted lens for comparing solutions.',
    symbol:'M16 4 27 10v12l-11 6-11-6V10l11-6Zm0 12 11-6M5 10l11 6v12'},
  6: {accent:'#a7eabb', enamel:'#367a52', landmark:'Tidal conservatory',
    detail:'Jade roof petals open in different directions above the growing beds.',
    symbol:'M5 21c3-8 10-11 21-14-1 11-7 18-15 18-3 0-5-2-6-4Zm2 5L22 12'},
  7: {accent:'#ffdf8f', enamel:'#ad7a2b', landmark:'Planning terraces',
    detail:'Three amber terraces and a clock face give the lab a steady rhythm.',
    symbol:'M6 8h20v18H6zM6 13h20M11 5v6m10-6v6M11 19h4m3 0h3m-10 3h7'},
  8: {accent:'#ffafe0', enamel:'#9e4678', landmark:'Prism atelier',
    detail:'Rose fins and coloured glazing split the roof into a fan of ideas.',
    symbol:'M16 4l2.9 8.8L28 16l-9.1 3.2L16 28l-2.9-8.8L4 16l9.1-3.2L16 4Z'},
  9: {accent:'#ffa3a8', enamel:'#8c3348', landmark:'Guiding beacon',
    detail:'A garnet tower and an open compass crown mark the way for the group.',
    symbol:'M16 4v5m0 14v5M4 16h5m14 0h5M16 8a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm3 5-2 5-4 1 1-4 5-2Z'},
};

function createLabSignAtlas(places) {
  const atlas=document.createElement('canvas');
  const cellWidth=512,cellHeight=128;
  atlas.width=cellWidth*2;
  atlas.height=cellHeight*4;
  const ink=atlas.getContext('2d');
  for (const [key,{accent,symbol}] of Object.entries(labThemes)) {
    const slot=Number(key)-2,x=slot%2*cellWidth,y=Math.floor(slot/2)*cellHeight;
    ink.fillStyle='#13272d';
    ink.fillRect(x,y,cellWidth,cellHeight);
    ink.strokeStyle='#78664d';
    ink.lineWidth=4;
    ink.strokeRect(x+4,y+4,cellWidth-8,cellHeight-8);
    ink.fillStyle=accent;
    ink.fillRect(x+12,y+12,8,cellHeight-24);
    ink.save();
    ink.translate(x+32,y+27);
    ink.scale(2.22,2.22);
    ink.strokeStyle=accent;
    ink.lineWidth=1.95;
    ink.lineJoin='round';
    ink.lineCap='round';
    ink.stroke(new Path2D(symbol));
    ink.restore();
    ink.fillStyle='#fff8e7';
    ink.font='700 48px system-ui, sans-serif';
    ink.fillText(places[key][0].replace(' Skills Lab',''),x+115,y+62,381);
    ink.fillStyle=accent;
    ink.font='700 26px system-ui, sans-serif';
    ink.fillText('S K I L L S   L A B',x+117,y+99);
  }
  return atlas;
}

// Dimensions in metres. Each entrance meets its existing south approach.
const districtPavilions = {
  1: {roof:'archive', width:3.58, depth:2.36, eave:2.32, rise:1.97, shape:.74},
  3: {roof:'linked', width:2.75, depth:2.21, eave:2.14, rise:.68, shape:1},
  4: {roof:'sail', width:2.62, depth:2.14, eave:1.96, rise:2.59, shape:.49},
  5: {roof:'facets', width:2.52, depth:2.25, eave:2.17, rise:1.03, shape:.31},
  6: {roof:'petals', width:2.63, depth:2.22, eave:1.82, rise:1.94, shape:1.12},
  7: {roof:'terraces', width:2.60, depth:2.20, eave:2.07, rise:1.61, shape:.33},
  8: {roof:'wave', width:2.69, depth:2.24, eave:2.04, rise:2.13, shape:.64},
  9: {roof:'beacon', width:2.53, depth:2.11, eave:2.32, rise:.96, shape:.86},
};

const plazaCenter = [0,-.53];
const districtTrees = [
  [-8.75,3.90,3.51,1.71,.37,-.16],[-16.72,2.66,4.05,1.82,.42,-.14],
  [-17.65,-3.93,3.89,1.56,-.24,.31],[-16.95,-13.38,4.20,1.94,.28,-.36],
  [-10.98,-17.39,3.74,1.78,.41,.29],[-4.83,-18.88,4.58,2.06,-.27,.31],
  [4.77,-18.78,4.47,1.98,.34,.14],[12.15,-15.48,3.77,1.73,.22,.27],
  [16.93,-11.88,4.30,1.96,-.35,-.21],[17.19,-2.70,3.63,1.59,-.31,.26],
  [10.27,-1.65,3.42,1.56,-.22,.19],[5.99,8.95,3.58,1.67,-.37,.25],
  [16.26,12.79,4.22,1.72,-.39,-.16],[-4.52,-7.81,3.22,1.47,-.31,.27],
  [4.73,-7.77,3.53,1.53,.24,.14],
];
const tideGardens = [[-7.60,-7.72,1.21,.69],[7.87,-7.55,1.32,.69]];

function terraceHeight(x,z) {
  const ease = value => {
    const t=Math.max(0,Math.min(1,value));
    return t*t*(3-2*t);
  };
  return .66*ease((6.50-Math.abs(x))/2.22)*ease((-z-9.6)/4.5)*ease((22.15+z)/2.95);
}

function pavilionBlocks(index, dx, dz) {
  const pavilion=districtPavilions[index];
  if (!pavilion) return Math.abs(dx)<2.5 && Math.abs(dz)<2.5;
  const outline=Math.max(2.5,2/pavilion.shape);
  return Math.abs(dx/(pavilion.width+.17))**outline+Math.abs(dz/(pavilion.depth+.17))**outline<1;
}

function districtGardenBlocks(x,z) {
  return Math.hypot(x-plazaCenter[0],z-plazaCenter[1])<1.92
    || districtTrees.some(([tx,tz,height])=>Math.hypot(x-tx,z-tz)<.21+height*.057)
    || tideGardens.some(([px,pz,r,ratio])=>Math.hypot(x-px,(z-pz)/ratio)<r+.15);
}

function buildSkillsvilleDistricts(places, art, authoredDock, coast, authoredBuildings) {
  const {finish, tri, quad, box, shell, taper, leaf, coastalTree, rockShelf, shrub, glass, light, breaker, sign} = art;
  const tau=2*Math.PI;
  const ceramic='#e9c79c', pale='#f2dbb3', bronze='#a17248', shadowBronze='#624c3a';
  const mint='#a2f4d6', amber='#ffd49a', stone='#cab195';
  const tiles=['#d4b89b','#d0b599','#d7bda2','#c9ab92','#cdb096'];
  const greens=['#699346','#466b3b','#8f9f50','#658544'];
  const at=(x,y,z,r,a,ratio=1)=>[x+r*Math.cos(a),y,z+r*Math.sin(a)*ratio];
  const base=(x,z)=>terraceHeight(x,z);

  function lantern(x,z,y=base(x,z),height=.85,pool=1.24) {
    finish(18);
    shell(x,z,[[y,.137],[y+.045,.161],[y+.17,.119],[y+height*.51,.098]],ceramic,12);
    finish(4);
    shell(x,z,[[y+height*.48,.108],[y+height*.52,.114],[y+height*.55,.110]],bronze,12);
    finish(17);
    shell(x,z,[[y+height*.54,.098],[y+height*.92,.098]],amber,12);
    finish(4);
    for(let j=0;j<4;j++) taper(at(x,y+height*.52,z,.101,j*tau/4),
      at(x,y+height*.94,z,.101,j*tau/4),.012,.012,shadowBronze);
    shell(x,z,[[y+height*.93,.119],[y+height*.99,.139],[y+height*1.04,.08],[y+height*1.04,0]],bronze,12);
    if (pool) light(x,z,pool,pool,.64,y);
  }

  function plantedBed(x,z,r,ratio=1,accent=0) {
    const y=base(x,z);
    finish(18);
    shell(x,z,[[y-.045,r-.10],[y+.225,r],[y+.282,r+.025],[y+.328,r-.07],[y+.328,r-.136]],ceramic,24,ratio);
    finish(4);
    shell(x,z,[[y+.132,r-.014],[y+.153,r-.011]],'#ba8a5d',24,ratio);
    finish(0);
    shell(x,z,[[y+.276,r-.095],[y+.276,0]],'#534936',24,ratio);
    finish(6);
    for (let j=0;j<10;j++) {
      const a=j*2.399+accent;
      const [px,py,pz]=at(x,y+.28,z,Math.sqrt((j+.7)/10)*(r-.23),a,ratio);
      const width=.46+.34*((j*7)%11)/11;
      shrub(px,py-.045,pz,width,width*.83,a,(j+accent)%4,.59+(j%4)*.11);
      if (j%2===0) shrub(px,py-.045,pz,width*.93,width*.87,a+1.5,(j+1+accent)%4,.78);
      for(let k=0;k<4;k++) leaf(px,py,pz,a+k*1.57,.24+.055*(j%5),.051,.13+.061*k,
        (j+accent)%5===0?'#ab5148':greens[(k+j)%greens.length]);
    }
    finish(0);
  }

  // The paving uses the terrain height at every edge, including the ramp to the archive.
  function trail(points,width,{center=false}={}) {
    const samples=[];
    for(let i=0;i<points.length-1;i++) {
      const a=points[Math.max(0,i-1)], b=points[i], c=points[i+1], d=points[Math.min(points.length-1,i+2)];
      const steps=Math.max(3,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/.34));
      for(let j=0;j<steps;j++) {
        const t=j/steps;
        samples.push(b.map((v,k)=>.5*(2*v+(c[k]-a[k])*t+
          (2*a[k]-5*v+4*c[k]-d[k])*t*t+(3*v-a[k]-3*c[k]+d[k])*t*t*t)));
      }
    }
    samples.push(points.at(-1));
    const edge=(i,shift,lift)=>{
      const [x,z]=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(i+1,samples.length-1)];
      const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      const px=x-dz*shift/len,pz=z+dx*shift/len;
      return [px,base(px,pz)+lift,pz];
    };
    const band=(i,a,b,lift,color)=>quad(edge(i,a,lift),edge(i,b,lift),edge(i+1,b,lift),edge(i+1,a,lift),color,false);
    for(let i=0;i<samples.length-1;i++) {
      finish(22);
      band(i,-width,width,.037,tiles[1]);
      finish(18);
      for (const side of [-1,1]) band(i,side*(width-.08),side*width,.042,'#b59776');
      finish(9);
      for(const side of [-1,1]) band(i,side*(width-.175),side*(width-.233),.046,mint);
      if (center) {
        finish(2);
        band(i,-.30,.30,.044,'#5f8b7d');
        if(i%2===0) {
          finish(9);
          for(const offset of [-.183,0,.183]) {
            const [x,y,z]=edge(i,offset,.045);
            shell(x,z,[[y,.052],[y+.010,.060],[y+.010,0]],mint,8);
          }
        }
      }
    }
    finish(0);
  }

  // A broad foundation carries the raised terrace into the gardens beside it.
  finish(16);
  for(let z=-22;z<-9.7;z+=.4) for(let x=-6.5;x<6.5;x+=.4) {
    const p=(px,pz)=>[px,base(px,pz),pz];
    quad(p(x,z),p(x,z+.4),p(x+.4,z+.4),p(x+.4,z),'#7f8464');
  }
  finish(0);
  trail([[0,15.21],[-.44,11.63],[.31,8.43],[0,4.47]],1.76,{center:true});
  trail([[0,-5.84],[.33,-8.0],[-.40,-10.66],[0,-13.60]],1.65,{center:true});
  trail([[4.25,2.10],[7.2,3.6],[10.1,4.93],[14,4.46]],1.06);
  trail([[3.90,-3.08],[7.3,-4.94],[10.4,-4.92],[14,-4.57]],1.07);
  trail([[0.37,10.67],[3.34,11.68],[6.76,12.30],[9,11.50]],1.07);
  trail([[-4.13,2.18],[-7.04,6.70],[-11.43,10.06],[-15,9.49]],1.08);
  trail([[-4.58,-2.28],[-8.34,-4.81],[-11.50,-4.77],[-14,-4.53]],1.11);
  trail([[-.32,-9.92],[-3.61,-10.94],[-6.23,-10.18],[-8,-10.55]],1.08);
  trail([[.25,-8.92],[3.35,-10.75],[5.86,-11.06],[8,-10.52]],1.05);
  trail([[10.05,-4.81],[9.16,-1.64],[10.7,1.53],[10.10,4.87]],.87);
  trail([[-15.02,9.52],[-17.20,5.48],[-17.38,1.01],[-16.36,-3.79],[-14.55,-4.61]],.92);
  trail([[14,-4.60],[17.08,-4.91],[17.78,-.87],[17.68,2.15],[14,4.50]],.90);
  if (authoredDock) {
    trail([[.54,18.88],[-2.17,18.71],[-4.92,19.36],[-8.05,19.14]],1.03);
    trail([[1.20,18.94],[3.31,19.30],[5.19,19.78]],.84);
  }
  for (const [x,z,r,ratio,accent] of [
    [-3.13,6.77,1.04,.70,0],[3.50,6.37,1.07,.74,1],[-3.31,8.78,1.18,.71,1],
    [3.19,8.91,1.12,.82,2],[-3.38,12.00,1.16,.81,2],[3.07,13.52,1.13,.71,0],
    [-7.54,2.22,1.24,.71,3],[7.32,1.66,1.24,.67,1],[-3.47,-6.91,1.15,.63,1],
    [3.57,-6.59,1.05,.68,0],[-2.88,-12.04,1.24,.72,0],[3.01,-12.03,1.22,.66,3],
  ]) plantedBed(x,z,r,ratio,accent);

  const [cx,cz]=plazaCenter;
  function plazaBand(inner,outer,start,end,y,color) {
    quad(at(cx,y,cz,inner,start),at(cx,y,cz,inner,end),at(cx,y,cz,outer,end),at(cx,y,cz,outer,start),color,false);
  }
  finish(18);
  shell(cx,cz,[[0,5.70],[.035,5.76],[.048,5.67],[.048,0]],'#b79b80',80);
  for(let row=0;row<9;row++) {
    const inner=1.62+row*.446,outer=inner+.429;
    const count=32+4*row;
    finish(22);
    for(let j=0;j<count;j++) {
      const a=(j+(row%2)*.5)*tau/count,b=a+tau/count;
      plazaBand(inner,outer,a+.003,b-.003,.052,tiles[(row*9+j*3)%tiles.length]);
    }
  }
  for(const [r,w,color,material] of [[5.64,.054,mint,9],[4.21,.041,'#aa8663',4],[3.27,.066,mint,9],[2.28,.027,'#b18155',4]]) {
    finish(material);
    for(let i=0;i<80;i++) plazaBand(r-w,r+w,i*tau/80,(i+1)*tau/80,.058,color);
  }
  // Inlaid compass points sit in the paving between the luminous rings.
  for(let i=0;i<8;i++) {
    const a=i*tau/8, tip=i%2===0?4.16:3.80;
    finish(4);
    tri(at(cx,.059,cz,3.35,a-.047),at(cx,.059,cz,tip,a),at(cx,.059,cz,3.35,a),'#a57e5b',false);
    finish(18);
    tri(at(cx,.059,cz,3.35,a),at(cx,.059,cz,tip,a),at(cx,.059,cz,3.35,a+.047),'#e4cd9d',false);
  }
  finish(18);
  shell(cx,cz,[[.052,1.87],[.16,1.91],[.23,1.82],[.28,1.65],[.41,1.64],
    [.48,1.49],[.58,1.43],[.60,0]],pale,64);
  finish(17);
  shell(cx,cz,[[.28,1.668],[.334,1.663]],amber,64);
  finish(9);
  shell(cx,cz,[[.442,1.566],[.463,1.544]],mint,64);
  finish(4);
  shell(cx,cz,[[.59,.69],[.74,.73],[.84,.51],[1.11,.42],[1.22,.58],[1.28,.58],[1.28,0]],bronze,40);
  const globeY=2.95;
  for(const [radius,tilt,yaw,color,line,lineFinish] of [
    [1.92,.67,.53,'#d8aa68',mint,9],[1.84,-.51,-.62,'#d6a161',amber,17],[1.68,1.30,1.10,'#aa7c52','#edb678',17],
  ]) {
    const orbit=(a,r,offset=0)=>{
      const x=Math.cos(a)*r,z=Math.sin(a)*r*Math.sin(tilt);
      return [cx+x*Math.cos(yaw)-z*Math.sin(yaw),globeY+Math.sin(a)*r*Math.cos(tilt)+offset,
        cz+x*Math.sin(yaw)+z*Math.cos(yaw)];
    };
    for(let j=0;j<72;j++) {
      const a=j*tau/72,b=(j+1)*tau/72;
      finish(4);
      for(const face of [-1,1]) quad(orbit(a,radius,face*.042),orbit(b,radius,face*.042),
        orbit(b,radius-.14,face*.042),orbit(a,radius-.14,face*.042),color);
      quad(orbit(a,radius,-.042),orbit(b,radius,-.042),orbit(b,radius,.042),orbit(a,radius,.042),bronze);
      quad(orbit(a,radius-.14,-.042),orbit(b,radius-.14,-.042),orbit(b,radius-.14,.042),orbit(a,radius-.14,.042),bronze);
      if (j%18!==17) {
        finish(lineFinish);
        for(const face of [-1,1]) quad(orbit(a,radius-.030,face*.045),orbit(b,radius-.030,face*.045),
          orbit(b,radius-.093,face*.045),orbit(a,radius-.093,face*.045),line,false);
        quad(orbit(a,radius+.002,-.018),orbit(b,radius+.002,-.018),
          orbit(b,radius+.002,.018),orbit(a,radius+.002,.018),line,false);
      }
    }
  }
  finish(25);
  shell(cx,cz,Array.from({length:19},(_,i)=>{
    const a=(i/18-.5)*Math.PI;
    return [globeY+.49*Math.sin(a),.49*Math.cos(a)];
  }),'#8ed5c2',40);
  finish(0);
  light(cx,cz,2.58,2.42,.63,.052);

  for(const a of [.97,2.17,3.74,4.04,5.28,5.66]) {
    const [x,,z]=at(cx,0,cz,5.19,a);
    const end=a+.165,start=a-.165;
    for(let j=0;j<9;j++) {
      const lo=start+(end-start)*j/9,hi=start+(end-start)*(j+1)/9;
      finish(18);
      quad(at(cx,.40,cz,4.80,lo),at(cx,.40,cz,4.80,hi),at(cx,.40,cz,5.10,hi),at(cx,.40,cz,5.10,lo),ceramic);
      quad(at(cx,.05,cz,4.80,lo),at(cx,.05,cz,4.80,hi),at(cx,.40,cz,4.80,hi),at(cx,.40,cz,4.80,lo),ceramic);
      finish(17);
      quad(at(cx,.16,cz,4.795,lo),at(cx,.16,cz,4.795,hi),at(cx,.194,cz,4.795,hi),at(cx,.194,cz,4.795,lo),amber,false);
      finish(0);
      quad(at(cx,.441,cz,4.83,lo),at(cx,.441,cz,4.83,hi),at(cx,.441,cz,5.086,hi),at(cx,.441,cz,5.086,lo),'#568c81',false);
    }
    plantedBed(x,z,.57,.72,Math.floor(a));
  }
  for(const [x,z] of [[-2.05,7.24],[2.23,7.14],[-2.55,12.23],[2.22,12.42],[-3.05,-6.75],[3.12,-6.83],
    [-2.29,-11.54],[2.21,-11.46],[-6.86,1.1],[6.92,.86],[-9.28,-3.22],[11.85,-3.63]]) lantern(x,z);

  // The north gardens flank the continuous walk up to My Portfolio.
  for(const [x,z,r,ratio] of tideGardens) {
    const y=base(x,z);
    finish(18);
    shell(x,z,[[y,r-.09],[y+.10,r+.04],[y+.17,r],[y+.17,r-.13],[y+.092,r-.13]],ceramic,38,ratio);
    finish(24);
    shell(x,z,[[y+.101,r-.12],[y+.101,0]],'#306d63',38,ratio);
    finish(6);
    for(let j=0;j<15;j++) {
      const [px,py,pz]=at(x,y+.111,z,r*(.60+.22*Math.cos(j)),j*2.399,ratio);
      leaf(px,py,pz,j*2.399,.22,.107,.02,greens[j%4]);
    }
    finish(0);
  }
  for(const [x,z,r,h] of [[-4.32,-13.56,1.16,.52],[4.45,-13.92,1.32,.61],[-4.42,-17.12,1.15,.65],[4.69,-16.85,1.23,.61]]) {
    const y=base(x,z);
    rockShelf(x,y-.38,z,r,.78,h,.31,true);
    plantedBed(x,z+1.05,r*.83,.68,2);
  }
  for(const [x,z,h,spread,leanX,leanZ] of districtTrees) {
    const y=base(x,z);
    coastalTree(x,y,z,h,spread,leanX,leanZ);
    for(let j=0;j<9;j++) {
      const [px,py,pz]=at(x,y-.025,z,.53+.12*(j%5),j*2.399);
      shrub(px,py,pz,.66+(j%3)*.14,.54+(j%4)*.07,j*2.399,j%4,.52+(j%3)*.18);
    }
  }

  function portal(x,y,z,accent,scale) {
    finish(18);
    for(const side of [-1,1]) box(x+side*scale,y+.10,z+.075,.179*scale,.89,.171,pale);
    const point=(a,w,h,d)=>[x+w*scale*Math.cos(a),y+.98+h*Math.sin(a),z+d];
    for(let j=0;j<22;j++) {
      const a=j*Math.PI/22,b=(j+1)*Math.PI/22;
      const ribbon=(w,h,w2,h2,d,c)=>quad(point(a,w,h,d),point(b,w,h,d),point(b,w2,h2,d),point(a,w2,h2,d),c);
      finish(18);
      ribbon(.82,1.09,1.18,1.38,.245,j%4===0?'#ebc89f':pale);
      quad(point(a,.82,1.09,.245),point(b,.82,1.09,.245),point(b,.82,1.09,-.09),point(a,.82,1.09,-.09),ceramic);
      quad(point(a,1.18,1.38,-.09),point(b,1.18,1.38,-.09),point(b,1.18,1.38,.245),point(a,1.18,1.38,.245),ceramic);
      finish(17);
      ribbon(.849,1.106,.880,1.136,.248,amber);
      if (j>3 && j<18) {
        finish(9);
        ribbon(1.037,1.276,1.083,1.311,.249,accent);
      }
    }
    finish(4);
    for(const dx of [-.787,0,.787]) box(x+dx*scale,y+.27,z-.035,.026,1.57,.042,shadowBronze);
    box(x,y+1.827,z-.035,.80*scale,.031,.045,shadowBronze);
    for(const dx of [-.113,.113]) box(x+dx,y+.84,z+.059,.026,.30,.025,bronze);
    finish(17);
    for(const dx of [-.113,.113]) box(x+dx,y+.87,z+.086,.014,.17,.010,amber);
    finish(0);
  }

  function vaultRib(x,z,y,width,height,spring,deep,bright) {
    const profile=(a,w,h,d)=>[x+w*Math.cos(a),y+spring+h*Math.sin(a),z+d];
    for(let j=0;j<32;j++) {
      const a=j*Math.PI/32,b=(j+1)*Math.PI/32;
      const inner=(t,d)=>profile(t,width-.22,height-.18,d);
      const outer=(t,d)=>profile(t,width,height,d);
      finish(18);
      quad(outer(a,deep),outer(b,deep),inner(b,deep),inner(a,deep),pale);
      quad(outer(a,-deep),outer(b,-deep),outer(b,deep),outer(a,deep),ceramic);
      quad(inner(a,deep),inner(b,deep),inner(b,-deep),inner(a,-deep),'#c89e78');
      if (bright) {
        finish(17);
        quad(profile(a,width-.191,height-.15,deep+.006),profile(b,width-.191,height-.15,deep+.006),
          profile(b,width-.155,height-.12,deep+.006),profile(a,width-.155,height-.12,deep+.006),amber,false);
      }
    }
    finish(18);
    for(const side of [-1,1]) box(x+side*(width-.116),y+.15,z,.119,spring-.15,deep,ceramic);
  }

  function nameplate(index,x,y,z,width) {
    const height=width/4;
    finish(4);
    for (const side of [-1,1]) box(x+side*width*.33,y-.19,z-.18,.055,.32,.13,bronze);
    box(x,y-.04,z-.085,width*.515,height+.08,.104,shadowBronze);
    sign(index,x,y,z+.023,width,height);
  }

  const entryProfiles = {
    linked:[[-.90,.24],[-.90,1.80],[-.73,1.96],[.73,1.96],[.90,1.80],[.90,.24]],
    sail:[[-.89,.24],[-.89,1.59],[.89,2.09],[.89,.24]],
    facets:[[-.86,.24],[-.86,1.54],[-.57,1.97],[.57,1.97],[.86,1.54],[.86,.24]],
    petals:[[-.93,.24],[-.90,1.49],[-.66,1.87],[-.30,2.03],[.14,2.00],[.57,1.80],[.90,1.44],[.91,.24]],
    terraces:[[-.90,.24],[-.90,1.78],[-.68,1.91],[.68,1.91],[.90,1.78],[.90,.24]],
    wave:[[-.92,.24],[-.88,1.65],[-.58,2.00],[-.16,1.94],[.25,1.83],[.63,1.95],[.91,1.62],[.92,.24]],
    beacon:[[-.78,.24],[-.78,1.62],[-.54,1.95],[0,2.12],[.54,1.95],[.78,1.62],[.78,.24]],
  };

  function labEntrance(index,form,x,y,z,theme) {
    const outline=entryProfiles[form];
    const corner=([u,v],rim,d)=>[x+u*(1+.22*rim),y+v+.17*rim*(v-.24)/1.88,z+d];
    for(let j=1;j<outline.length;j++) {
      const a=outline[j-1],b=outline[j];
      finish(18);
      quad(corner(a,0,.15),corner(b,0,.15),corner(b,1,.15),corner(a,1,.15),pale);
      quad(corner(a,0,-.085),corner(b,0,-.085),corner(b,0,.15),corner(a,0,.15),ceramic);
      quad(corner(a,1,.15),corner(b,1,.15),corner(b,1,-.085),corner(a,1,-.085),ceramic);
      finish(28);
      quad(corner(a,.50,.155),corner(b,.50,.155),corner(b,.84,.155),corner(a,.84,.155),theme.accent,false);
    }
    const lintel=Math.max(...outline.map(([,h])=>h));
    // Recessed double doors and brass hardware read through the glazed opening.
    finish(4);
    for (const u of [-.73,0,.73]) box(x+u,y+.27,z-.037,.024,1.43,.031,shadowBronze);
    box(x,y+1.70,z-.038,.76,.026,.034,shadowBronze);
    for (const u of [-.10,.10]) box(x+u,y+.83,z+.022,.024,.31,.026,bronze);
    finish(17);
    for (const u of [-.10,.10]) box(x+u,y+.87,z+.050,.012,.20,.011,amber);
    nameplate(index,x,y+lintel+.14,z+.151,3.33);
  }

  function linkedWorkshops(x,y,z,theme) {
    const ratio=1.35;
    for(const side of [-1,1]) {
      const cx=x+side*1.33,cz=z+side*.13;
      const top=y+(side<0?3.11:3.46);
      finish(18);
      shell(cx,cz,[[y+.23,1.36],[y+.40,1.37],[y+.48,1.31]],pale,36,ratio);
      finish(28);
      shell(cx,cz,[[y+.42,1.31],[y+.70,1.30]],theme.enamel,36,ratio);
      const atBay=(a,h)=>[cx+Math.cos(a)*1.30,h,cz+Math.sin(a)*1.30*ratio];
      for(let j=0;j<28;j++) {
        const a=j*tau/28,b=(j+1)*tau/28;
        glass([atBay(b,y+.68),atBay(a,y+.68),atBay(a,top-.27),atBay(b,top-.27)],theme.accent,false);
        if (j%2===0) {
          finish(4);
          taper(atBay(a,y+.64),atBay(a,top-.23),.026,.031,shadowBronze);
        }
      }
      finish(18);
      shell(cx,cz,[[top-.30,1.31],[top-.24,1.46],[top-.16,1.47],[top-.10,1.39]],pale,40,ratio);
      finish(28);
      shell(cx,cz,[[top-.15,1.435],[top-.09,1.40],[top+.09,1.14],[top+.18,.89],[top+.18,0]],theme.enamel,40,ratio);
      finish(18);
      shell(cx,cz,[[top+.161,.70],[top+.20,.70],[top+.22,.63],[top+.22,.54]],pale,36,ratio);
      finish(28);
      shell(cx,cz,[[top+.21,.55],[top+.22,0]],theme.accent,36,ratio);
    }
    finish(18);
    box(x,y+2.23,z+.72,1.76,.21,1.12,pale);
    finish(28);
    box(x,y+2.30,z+1.847,1.75,.074,.020,theme.enamel);
    finish(17);
    box(x,y+2.237,z+1.85,1.56,.026,.018,amber);
  }

  function emblem(x,y,z,r,sides,accent,enamel) {
    const edge=(a,scale,d)=>[x+Math.cos(a)*r*scale,y+Math.sin(a)*r*scale,z+d];
    for(let j=0;j<sides;j++) {
      const a=(j+.5)*tau/sides,b=(j+1.5)*tau/sides;
      finish(18);
      quad(edge(a,1,-.13),edge(b,1,-.13),edge(b,1,0),edge(a,1,0),pale);
      finish(28);
      quad(edge(a,1,0),edge(b,1,0),edge(b,.78,.012),edge(a,.78,.012),accent,false);
      tri([x,y,z+.013],edge(a,.78,.013),edge(b,.78,.013),enamel,false);
    }
  }

  function tidalPetals(x,y,z,theme) {
    for(const side of [-1,1]) {
      const edge=(t,edgeWidth,dy)=>{
        const flare=Math.sin(Math.PI*t);
        return [x+side*(.61+t*1.57+edgeWidth*.68*flare),
          y+2.65+.92*t+.36*flare+dy,z+(side*.18+t*.84-.68)+edgeWidth*.77*flare];
      };
      for(let j=0;j<24;j++) {
        const a=j/24,b=(j+1)/24;
        finish(18);
        quad(edge(a,-1,-.06),edge(b,-1,-.06),edge(b,1,-.06),edge(a,1,-.06),pale);
        finish(28);
        quad(edge(a,-.86,.006),edge(b,-.86,.006),edge(b,.86,.006),edge(a,.86,.006),
          j%4===0?theme.accent:theme.enamel);
        finish(18);
        for(const rim of [-1,1]) taper(edge(a,rim,0),edge(b,rim,0),.038,.037,pale);
      }
    }
  }

  function roofHeight(form,u,v,r) {
    const arch=Math.sqrt(Math.max(0,1-u*u));
    switch(form) {
      case 'archive': return arch*(.88+.12*(1-v*v));
      case 'sail': return .23+.20*arch+.56*u+.10*v+.30*u*u;
      case 'facets': return .07+.77*Math.max(0,1-Math.max(Math.abs(u-.19),Math.abs(v+.20)));
      case 'petals': return .15+.63*Math.sqrt(Math.max(0,1-r*r))+.14*Math.sin(3*u+2*v);
      case 'terraces': return 0;
      case 'wave': return .47-.36*Math.cos(u*2.35*Math.PI)+.23*u-.11*v;
      case 'beacon': return .10+.45*(1-r*r);
    }
  }

  for(const [key,spec] of Object.entries(districtPavilions)) {
    const index=Number(key);
    const [,x,z,accent]=places[index];
    const theme=labThemes[index];
    const {roof,width,depth,eave,rise,shape}=spec;
    const y=base(x,z);
    const sideCount=roof==='facets'?24:48,roofRows=roof==='facets'?6:9;
    function plan(a,r,lift) {
      const coord=value=>Math.sign(value)*Math.abs(value)**shape;
      return [x+r*width*coord(Math.cos(a)),y+lift,z+r*depth*coord(Math.sin(a))];
    }
    function cover(a,r,offset=0) {
      const p=plan(a,r,0);
      p[1]+=eave+rise*roofHeight(roof,(p[0]-x)/(width*1.04),(p[2]-z)/(depth*1.04),Math.min(1,r))+offset;
      return p;
    }
    function ring(r1,r2,y1,y2,color,material) {
      finish(material);
      for(let j=0;j<sideCount;j++) {
        const a=j*tau/sideCount,b=(j+1)*tau/sideCount;
        quad(plan(b,r1,y1),plan(a,r1,y1),plan(a,r2,y2),plan(b,r2,y2),color);
      }
    }
    ring(1.075,1.087,-.047,.10,stone,2);
    ring(1.087,1.042,.10,.234,pale,18);
    ring(1.042,.014,.234,.234,'#ac8763',18);
    ring(1.023,1.024,.150,.174,amber,17);
    const paneColor=['#785945','#a87856','#bd9168'];
    if (roof==='linked') linkedWorkshops(x,y,z,theme);
    else for(let j=0;j<sideCount;j++) {
      const a=j*tau/sideCount,b=(j+1)*tau/sideCount;
      const middle=(a+b)/2,front=Math.sin(middle),flank=Math.abs(Math.cos(middle));
      const apron=theme ? (roof==='facets'?.70:roof==='beacon'?.62:.54) : .302;
      const la=plan(a,1,apron),lb=plan(b,1,apron);
      const ua=cover(a,1,-.143),ub=cover(b,1,-.143);
      if (front<-.55) {
        const pa=plan(a,.954,.236),pb=plan(b,.954,.236);
        const ra=cover(a,.954,-.227),rb=cover(b,.954,-.227);
        finish(26);
        quad(pb,pa,ra,rb,paneColor[j%3]);
      }
      if (theme) {
        finish(28);
        quad(plan(b,1,.236),plan(a,1,.236),la,lb,theme.enamel);
        const solidBay=(roof==='facets'&&flank>.62) ||
          (roof==='sail'&&flank>.81) || (roof==='beacon'&&j%6<2) ||
          (roof==='wave'&&front<.2&&j%5<2);
        if (solidBay) quad(lb,la,ua,ub,theme.enamel);
        else glass([lb,la,ua,ub],theme.accent,false);
      } else glass([lb,la,ua,ub],'#d3ab7d',false);
      if (j%2===0) {
        finish(4);
        taper(la,ua,theme&&j%6===0?.071:.029,.041,shadowBronze);
      }
      finish(18);
      quad(ua,ub,cover(b,1,.015),cover(a,1,.015),ceramic);
      finish(theme?28:17);
      quad(cover(a,1.006,-.121),cover(b,1.006,-.121),
        cover(b,1.006,-.065),cover(a,1.006,-.065),theme?theme.accent:amber,false);
    }
    if (roof!=='linked' && roof!=='terraces') for(let row=0;row<roofRows;row++) for(let j=0;j<sideCount;j++) {
      const a=j*tau/sideCount,b=(j+1)*tau/sideCount,r=row*1.048/roofRows,t=(row+1)*1.048/roofRows;
      const face=[cover(a,r),cover(b,r),cover(b,t),cover(a,t)];
      const across=Math.cos((a+b)/2);
      const skylight=row>0&&row<roofRows-1&&(roof==='sail'?across<-.35:
        roof==='facets'?j%6===2||j%6===3:roof==='wave'?Math.abs(across)<.70:
        roof==='beacon'?j%6===3:roof==='petals'?j%8<5:j%12!==0);
      if (skylight) glass(face,theme?.enamel||'#4d7992',true);
      else {
        const coloured=theme&&(row<roofRows-1||roof==='sail'||roof==='wave');
        finish(coloured?28:18);
        quad(...face,coloured ? theme.enamel : (j+row)%4===0?ceramic:pale);
      }
      if (j%6===0 && row>0) {
        finish(theme?18:4);
        taper(cover(a,r,.035),cover(a,t,.035),theme ? .049 : .028,.037,theme?pale:bronze);
      }
      if (row===2 || row===5 || row===roofRows-1) {
        finish(row===roofRows-1?18:4);
        taper(cover(a,t,.024),cover(b,t,.024),row===roofRows-1?.066:.020,row===roofRows-1?.066:.020,
          row===roofRows-1?pale:bronze);
      }
    }
    if (roof==='archive') {
      vaultRib(x,z+depth*.54,y,width+.085,eave+rise-1.01,1.34,.155,true);
      vaultRib(x,z-depth*.37,y,width+.034,eave+rise-1.01,1.34,.102,false);
    } else if (roof==='sail') {
      // Two leaning supports carry the higher copper wing over the entry.
      for (const [side,top] of [[-1,2.47],[1,4.45]]) {
        finish(18);
        taper([x+side*1.76,y+.25,z+1.20],[x+side*2.55,y+top,z+1.53],.19,.107,pale);
        finish(28);
        taper([x+side*1.83,y+.34,z+1.32],[x+side*2.58,y+top,z+1.58],.042,.043,theme.accent);
      }
    } else if (roof==='facets') {
      // Offset test bays interlock around a violet diagnostic lens.
      for (const [dx,dz,span,height] of [[-.84,-.64,.89,.68],[.56,.23,1.00,.99]]) {
        const [px,pz]=[x+dx,z+dz],level=y+2.73;
        finish(28);
        shell(px,pz,[[level,span],[level+.18,span*1.13],[level+height-.18,span*1.13],
          [level+height,span],[level+height,0]],theme.enamel,8,.81);
        finish(18);
        shell(px,pz,[[level+height-.11,span*1.07],[level+height+.035,span],[level+height+.035,span*.79]],pale,8,.81);
      }
      emblem(x+.56,y+3.40,z+1.23,.54,6,theme.accent,'#31294b');
      finish(28);
      taper([x+.24,y+3.39,z+1.251],[x+.46,y+3.20,z+1.251],.027,.027,theme.accent);
      taper([x+.46,y+3.20,z+1.251],[x+.88,y+3.54,z+1.251],.027,.027,theme.accent);
    } else if (roof==='petals') {
      tidalPetals(x,y,z,theme);
      for (const side of [-1,1]) {
        finish(18);
        shell(x+side*1.91,z+.14,[[y+1.91,.55],[y+2.09,.58],[y+2.12,.52],[y+2.12,0]],pale,24,1.55);
        for(let j=0;j<9;j++) shrub(x+side*1.91+.38*Math.cos(j*2.39),y+2.06,
          z+.14+.62*Math.sin(j*2.39),.64,.69,j*2.39,j%4,.87);
      }
    } else if (roof==='terraces') {
      for(const [outer,inner,level] of [[1.065,.81,2.07],[.849,.60,2.53],[.641,.02,2.99]]) {
        ring(outer-.033,outer,level-.032,level+.056,pale,18);
        ring(outer,outer,level+.056,level+.21,theme.enamel,28);
        ring(outer,outer-.041,level+.21,level+.268,pale,18);
        ring(outer-.041,inner,level+.268,level+.268,ceramic,18);
        if(inner>.04) ring(inner,inner,level+.268,level+.44,theme.enamel,28);
      }
      const dial=y+3.59,dialZ=z+depth*.67;
      finish(18);
      box(x,y+3.18,dialZ-.11,.42,.44,.115,pale);
      emblem(x,dial,dialZ,.53,36,theme.accent,'#443724');
      finish(28);
      for(let j=0;j<4;j++) {
        const a=j*tau/4;
        taper([x+.332*Math.cos(a),dial+.332*Math.sin(a),dialZ+.019],
          [x+.390*Math.cos(a),dial+.390*Math.sin(a),dialZ+.019],.019,.019,theme.accent);
      }
      taper([x,dial,dialZ+.02],[x,dial+.253,dialZ+.02],.025,.022,theme.accent);
      taper([x,dial,dialZ+.02],[x+.178,dial-.077,dialZ+.02],.025,.022,theme.accent);
    } else if (roof==='wave') {
      // Three roof fins carry different colour facets over the same glazed atelier.
      for(const [dx,height,color] of [[-1.14,.67,'#de7eb3'],[.02,1.03,theme.enamel],[1.18,.79,'#a85b9a']]) {
        const peak=[x+dx+.53,y+3.47+height,z-.52];
        const front=[x+dx-.45,y+2.95,z+1.54],back=[x+dx-.20,y+3.06,z-1.58];
        finish(28);
        tri(front,peak,back,color,true);
        finish(18);
        taper(front,peak,.052,.042,pale);
        taper(peak,back,.042,.047,pale);
      }
    }
    if (theme) labEntrance(index,roof,x,y,z+depth*.995,theme);
    else portal(x,y,z+depth*.995,accent,1.24);
    finish(17);
    shell(x,z+.25,[[y+eave-.38,width*.62],[y+eave-.34,width*.62],[y+eave-.34,width*.54]],amber,36,.69);
    shell(x,z+.27,[[y+eave-.49,width*.32],[y+eave-.45,width*.32],[y+eave-.45,width*.26]],amber,32,.70);
    finish(26);
    shell(x,z-.15,[[y+.23,.83],[y+.31,.83],[y+.31,.55],[y+.90,.62],[y+.99,.91],[y+1.07,.91],[y+1.07,0]],'#cfab80',24,.69);
    for(const side of [-1,1]) {
      for(let shelf=0;shelf<3;shelf++) box(x+side*width*.62,y+.52+shelf*.40,z-.60,.43,.065,.36,'#bb895a');
      for(let book=0;book<5;book++) {
        box(x+side*width*.62+(book-2)*.145,y+.59+((index+book)%3)*.40,z-.52,.050,.18+book*.021,.20,
          [accent,'#d6ae7f','#b87662'][book%3]);
      }
    }
    if (roof==='beacon') {
      const top=y+eave+.43,zCrown=z-.28;
      finish(18);
      shell(x,zCrown,[[top-.11,1.01],[top+.11,1.01],[top+.24,.77]],pale,12);
      finish(28);
      shell(x,zCrown,[[top+.20,.79],[top+1.62,.57]],theme.enamel,12);
      finish(18);
      shell(x,zCrown,[[top+1.55,.58],[top+1.64,.82],[top+1.77,.79],[top+1.80,.66]],pale,24);
      for(let j=0;j<8;j++) {
        const a=j*tau/8;
        finish(4);
        taper(at(x,top+1.75,zCrown,.63,a),at(x,top+2.42,zCrown,.65,a),.042,.042,bronze);
      }
      finish(17);
      shell(x,zCrown,[[top+1.81,.30],[top+1.91,.34],[top+2.20,.26],[top+2.26,.09]],amber,24);
      finish(28);
      shell(x,zCrown,[[top+2.38,.69],[top+2.47,.79],[top+2.54,.69],[top+2.81,.13],[top+2.84,0]],theme.enamel,24);
      finish(17);
      shell(x,zCrown,[[top+2.49,.76],[top+2.515,.74]],amber,24);
      emblem(x,top+1.09,zCrown+.70,.38,8,theme.accent,'#592635');
    }
    if (index===1) {
      for(let row=0;row<4;row++) {
        const level=y+.46+row*.45;
        finish(26);
        box(x,level,z-1.32,1.52,.050,.30,'#b78457');
        for(let spine=0;spine<17;spine++) {
          const h=.14+.145*((spine*7+row*11)%13)/13;
          const color=['#4f807a','#a96551','#d4ad78','#667b95','#98765a'][(spine+row*2)%5];
          box(x+(spine-8)*.162,level+.051,z-1.28,.051+(spine%3)*.012,h,.17,color);
        }
        finish(17);
        box(x,level+.004,z-1.006,1.49,.018,.014,amber);
      }
      for(const side of [-1,1]) {
        finish(18);
        shell(x+side*2.75,z-.12,[[y+.23,.80],[y+.50,.80],[y+.58,.75],[y+.58,0]],pale,22,.77);
        for(let j=0;j<7;j++) shrub(x+side*2.75+(j%3-1)*.34,y+.56,z-.12+Math.sin(j*2.39)*.42,.63,.67,j*2.39,j%4,.83);
      }
    }
    const door=z+depth+.28;
    for(const side of [-1,1]) {
      const px=x+side*(width*.62+.37);
      plantedBed(px,door+.43,.64,.66,index%4);
      lantern(x+side*1.18,door+.69,base(x+side*1.18,door+.69),.74,.93);
    }
    light(x,door+.34,1.48,1.27,.79,base(x,door+.34));
    finish(18);
    const threshold=(side,dz)=>[x+side*1.24,base(x+side*1.24,door+dz)+.043,door+dz];
    quad(threshold(-1,-.07),threshold(-1,1.21),threshold(1,1.21),threshold(1,-.07),stone,false);
    if (theme) {
      finish(28);
      for (const side of [-1,1]) {
        const pin=x+side*.97;
        const atPin=(px,pz)=>[px,base(px,pz)+.049,pz];
        quad(atPin(pin-.071,door+.19),atPin(pin-.071,door+1.10),
          atPin(pin+.071,door+1.10),atPin(pin+.071,door+.19),theme.accent,false);
      }
    }
  }

  const [,signalX,signalZ]=places[2];
  nameplate(2,signalX,authoredBuildings?3.63:2.23,signalZ+(authoredBuildings?3.86:2.57),3.74);

  if (!authoredDock) return;
  // Connect the stone cap and balustrade around the outer terraces.
  for(let j=0;j<coast.length;j++) {
    const [x,z]=coast[j],[xx,zz]=coast[(j+1)%coast.length];
    if (z>=16 && zz>=16) continue;
    const dx=xx-x,dz=zz-z,length=Math.hypot(dx,dz);
    const p=(run,inset,y)=>[x+(dx*run-dz*inset)/length,y,z+(dz*run+dx*inset)/length];
    const segments=Math.ceil(length/1.62);
    for(let i=0;i<segments;i++) {
      const a=i*length/segments,b=(i+1)*length/segments;
      finish(22);
      quad(p(a,-.07,.054),p(a,1.68,.054),p(b,1.68,.054),p(b,-.07,.054),stone,false);
      finish(18);
      quad(p(a,-.08,-.22),p(b,-.08,-.22),p(b,-.08,.057),p(a,-.08,.057),ceramic);
      quad(p(a,-.08,.058),p(a,.25,.058),p(b,.25,.058),p(b,-.08,.058),i%2===0?pale:ceramic);
      finish(4);
      taper(p(a,.20,.65),p(b,.20,.65),.025,.025,bronze);
      taper(p(a,.20,.33),p(b,.20,.33),.013,.013,shadowBronze);
      const [px,,pz]=p(a,.20,0);
      shell(px,pz,[[.06,.072],[.12,.085],[.15,.044],[.64,.044],[.69,.079],[.72,0]],bronze,10);
      if (i%4===1) {
        const [lx,,lz]=p(a,.42,0);
        lantern(lx,lz,.054,.87,0);
        const [gx,,gz]=p(a,1.02,0);
        light(gx,gz,.94,.94,.60,.054);
      }
      if(i%3===1) {
        const [sx,,sz]=p((a+b)*.50,-.87,0);
        const height=1.29+.38*Math.sin(j*2.9+i);
        const shelf=rockShelf(sx,-2.91,sz,1.09+.13*(i%3),.82+.09*(j%4),height,j*.61+i*.31);
        breaker(shelf.rings,(.233*j+.271*i)%1,height*.85);
      }
      if(i%3===2) {
        const center=(a+b)*.5;
        finish(2);
        for(let stoneIndex=0;stoneIndex<13;stoneIndex++) {
          const c=stoneIndex*Math.PI/13,d=(stoneIndex+1)*Math.PI/13;
          const voussoir=(theta,r)=>p(center+r*Math.cos(theta),-.094,-1.44+r*Math.sin(theta));
          quad(voussoir(c,.84),voussoir(d,.84),voussoir(d,1.05),voussoir(c,1.05),tiles[stoneIndex%tiles.length],false);
        }
        finish(17);
        const [px,,pz]=p(center,-.108,-.83);
        box(px,-.94,pz,.065,.21,.065,amber);
      }
    }
  }
  finish(0);
}
