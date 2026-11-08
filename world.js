'use strict';

async function startWorld() {
const dockAssets = await loadSouthDock();
const arrivalLayout = typeof southDockLayout === 'object'
  ? southDockLayout : {hub:[7.3,16.9],lab:[-8.1,13]};
const places = [
  ['Orientation Hub', ...arrivalLayout.hub, '#76e5bb', 2],
  ['My Portfolio', 0, -17, '#f1ce92', 3],
  ['Communication Skills Lab', ...arrivalLayout.lab, '#5ff2d2', 4],
  ['Collaboration Skills Lab', 9, 8, '#8ebcf9', 2],
  ['Initiative Skills Lab', -15, 6, '#f1a677', 3],
  ['Problem-solving Skills Lab', 14, 1, '#b3a1fb', 4],
  ['Adaptability Skills Lab', -14, -8, '#75d6a0', 2],
  ['Self-management Skills Lab', 14, -8, '#f3c882', 3],
  ['Creativity Skills Lab', -8, -14, '#f09bbd', 3],
  ['Leadership Skills Lab', 8, -14, '#8cd9ef', 5],
  ['Discovery Plaza', 0, 0, '#a6f5cf', 0],
];
const byId = id => document.getElementById(id);
const canvas = byId('scene');
const ctx = canvas.getContext('2d');
const view3d = byId('view3d');
let island = null;
try {
  island = createIsland(view3d, places,dockAssets);
} catch (error) {
  console.warn('WebGL renderer unavailable', error);
}
const view = new URLSearchParams(location.search).get('view');
if (view === 'arrival-study') {
  const arrivalCanvas = island ? view3d : canvas;
  arrivalCanvas.tabIndex = 0;
  arrivalCanvas.removeAttribute('aria-hidden');
  arrivalCanvas.setAttribute('aria-label','Skillsville arrival view. Use arrow keys to walk.');
}
let overview = view === 'overview';
let angle = 0;
const look = byId('look');
look.hidden = !island;
look.onclick = () => {
  angle += Math.PI / 4;
  overview = false;
  camera.setAttribute('aria-pressed', 'false');
  draw();
};
const camera = byId('camera');
camera.hidden = !island;
camera.setAttribute('aria-pressed', String(overview));
camera.onclick = () => {
  overview = !overview;
  camera.setAttribute('aria-pressed', String(overview));
  draw();
};
const panel = byId('panel');
const hasDock = Boolean(island && dockAssets.southDockVertices?.length);
const avatar = { x: 0, z: hasDock ? 29 : 19, facing: -1, color: '#a6f5cf' };
const fields = ['Situation', 'Task', 'Action', 'Result'];
let data = { earned: false, entries: [] };
let storage = true;
try {
  const saved = localStorage.getItem('waypoint-demo-v1');
  if (saved) data = JSON.parse(saved);
} catch {
  storage = false;
}
let draft = {};
let step = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stillControl = byId('still-view');
let stillView = false;
stillControl.hidden = !island;
stillControl.onclick = () => {
  stillView = !stillView;
  stillControl.setAttribute('aria-pressed',String(stillView));
  draw();
};
reducedMotion.addEventListener('change',draw);
const motionEnabled = () => !stillView && !reducedMotion.matches;
const stepDuration = 315;
let movement = null;
let animationFrame = 0;
let lastWaterFrame = 0;
let studioView = 'welcome';
let insideStudio = false;
let sort = 'timeline';

function save() {
  try {
    localStorage.setItem('waypoint-demo-v1', JSON.stringify(data));
  } catch {
    storage = false;
  }
  byId('reward').textContent = data.earned ? '1 expedition stamp' : '0 expedition stamps';
}
save();

function add(tag, value, parent = panel) {
  const el = document.createElement(tag);
  el.textContent = value;
  parent.append(el);
  return el;
}
function button(value, action, parent = panel) {
  const el = add('button', value, parent);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}
function openPlace(index, focus = true) {
  if (index !== 2) studioView = 'welcome';
  insideStudio = index === 2;
  if (insideStudio) {
    const studioArt = byId('studio-art');
    if (!studioArt.hasAttribute('src')) studioArt.src=studioArt.dataset.src;
  }
  canvas.hidden = insideStudio || Boolean(island);
  view3d.hidden = insideStudio || !island;
  byId('studio-scene').hidden = !insideStudio;
  byId('world-controls').hidden = insideStudio;
  byId('title').textContent = places[index][0];
  byId('label').textContent = ({0:'01 / SOUTH DOCK', 1:'YOUR PRIVATE COLLECTION', 2:'03 / INSIDE THE STUDIO', 10:'02 / DISCOVERY PLAZA'})[index] || 'TRAINING DISTRICT';
  panel.replaceChildren();
  if (index === 0) {
    add('p', 'Welcome to Skillsville. A relay beacon has gone quiet. Follow the mint lights north from the landing dock to Discovery Plaza. Look west for the glass-domed Communication Skills Lab.');
    const row = add('div', '');
    row.className = 'row';
    button('Mint flight suit', () => { avatar.color = '#a6f5cf'; draw(); }, row);
    button('Amber flight suit', () => { avatar.color = '#ffc27c'; draw(); }, row);
    button('Go to Discovery Plaza', () => travel(10)).className = 'primary';
    add('p', 'Prototype data stays in this browser when storage is available. Use a fictional example while testing.');
  } else if (index === 1) {
    gallery();
  } else if (index === 2) {
    studio();
  } else if (index === 10) {
    add('p', 'You’ve reached the island’s meeting place. The glowing rings mark the centre. Take the southwest path to the studio with the twin signal masts.');
    button('Walk to Communication Skills Lab', () => {
      const [, x, z] = places[2];
      Object.assign(avatar, {x, z: z + 4.4});
      update();
      add('p', 'Lab entrance reached. Select Enter Communication Skills Lab to step inside.').setAttribute('role', 'status');
      byId('enter').focus();
    }).className = 'primary';
  } else {
    add('p', 'Proposed training building. Explore its exterior and visit Communication for a playable mission.');
  }
  if (focus) byId('title').focus();
}
function gallery() {
  const row = add('div', '');
  row.className = 'row';
  for (const [key, name] of [['timeline', 'Timeline'], ['skill', 'By capability']]) {
    const control = button(name, () => { sort = key; openPlace(1); }, row);
    control.setAttribute('aria-pressed', String(sort === key));
  }
  if (!data.entries.length) add('p', 'Your saved STAR reflections will appear here.');
  if (sort === 'skill' && data.entries.length) add('h3', 'Communication');
  for (const entry of [...data.entries].reverse()) {
    const card = add('article', '');
    card.className = 'card';
    add('h3', 'Communication · ' + entry.date, card);
    const list = add('dl', '', card);
    for (const field of fields) {
      add('dt', field, list);
      add('dd', entry[field], list);
    }
  }
}
const challenges = [
  {
    prompt: 'The delivery drone is headed for a closed bridge. Kai is new to the island. What do you radio?',
    choices: ['Take the usual detour.', 'Stop at the orange beacon. Take the east ramp to Dock 2.', 'The bridge is closed. Figure something out.'],
    correct: 1,
    hint: 'Kai needs a clear action and a landmark. Try giving both.',
    success: 'Kai turns at the beacon. A familiar landmark and a specific action make the route easier to follow.',
  },
  {
    prompt: 'Kai replies, “I’m at the ramp, heading to Dock 3.” How do you respond?',
    choices: ['Good, keep going.', 'I already told you where to go.', 'You’re at the right ramp. Head to Dock 2. Can you repeat the dock number?'],
    correct: 2,
    hint: 'Listen for the mismatch. Correct it and check what Kai heard.',
    success: 'Kai repeats “Dock 2” and the drone lands. Checking understanding caught the mix-up before delivery.',
  },
];
function studio() {
  const descriptions = {
    welcome: 'A delivery drone is waiting on the far side of the island. From this studio, crews listen, make a plan and check that their message got through.',
    discover: 'Communication means making yourself understood and understanding others. Choose words that fit the person and situation, listen for what they heard, and check back when it matters.',
  };
  if (descriptions[studioView]) add('p', descriptions[studioView]);
  const choices = add('div', '');
  choices.className = 'studio-choices';
  for (const [view, name, hint] of [
    ['discover', 'Discover', 'See the skill in everyday life'],
    ['practise', 'Practise', 'Take on Relay Rescue'],
    ['evidence', 'My Portfolio', 'Record a STAR example'],
  ]) {
    const control = button(name, () => showStudio(view), choices);
    add('small', hint, control);
    control.setAttribute('aria-label', name);
    control.setAttribute('aria-pressed', String(studioView === view));
  }
  if (studioView === 'discover') {
    add('h3', 'One skill, different situations');
    const list = add('ul', '');
    add('li', 'At work, show a new teammate where supplies go and ask them to explain the steps back.', list);
    add('li', 'At sport, listen to what a teammate saw before deciding what the team should try next.', list);
    add('li', 'At home, change how you explain a task when someone is unfamiliar with it.', list);
  }
  if (studioView === 'practise') mission();
  if (studioView === 'evidence') reflection();
  button('Return to the plaza', () => travel(10)).className = 'quiet';
}

function showStudio(view) {
  studioView = view;
  openPlace(2);
}

let feedback = '';
function mission() {
  add('p', 'Relay Rescue · Practise giving clear directions, listening and checking understanding.');
  if (step < challenges.length) {
    const challenge = challenges[step];
    add('p', challenge.prompt);
    const options = add('div', '');
    options.className = 'stack';
    const response = add('p', '');
    response.setAttribute('role', 'status');
    for (const [index, choice] of challenge.choices.entries()) {
      button(choice, () => {
        if (index !== challenge.correct) {
          response.textContent = challenge.hint;
          return;
        }
        feedback = challenge.success;
        step += 1;
        if (step === challenges.length) {
          data.earned = true;
          save();
        }
        openPlace(2);
      }, options);
    }
    if (feedback) add('p', feedback).className = 'card';
    return;
  }
  add('p', feedback);
  add('p', 'Relay restored. You earned the Signal Keeper expedition stamp.');
  button('Record in My Portfolio', () => showStudio('evidence')).className = 'primary';
}

function reflection() {
  add('h3', 'Take it into your world');
  add('p', 'Recall a real time you explained something, listened or checked understanding. For this demo, enter a fictional example.');
  const form = add('form', '');
  const prompts = ['Where were you and what was happening?', 'What did you need to communicate?', 'What did you say, do or check?', 'What happened? What might you try next time?'];
  for (const [index, field] of fields.entries()) {
    const label = add('label', field + ' · ' + prompts[index], form);
    const area = add('textarea', '', label);
    area.required = true;
    area.maxLength = 900;
    area.value = draft[field] || '';
    area.addEventListener('input', () => { draft[field] = area.value; });
  }
  const submit = add('button', 'Save and open My Portfolio', form);
  submit.className = 'primary';
  const error = add('p', '', form);
  error.setAttribute('role', 'status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (fields.some(field => !draft[field]?.trim())) {
      error.textContent = 'Please write something in each STAR field.';
      return;
    }
    data.entries.push({...draft, date: new Date().toLocaleDateString('en-AU')});
    save();
    draft = {};
    travel(1);
    add('p', storage ? 'Reflection saved in this browser.' : 'Reflection added for this session. Browser storage is unavailable.').setAttribute('role', 'status');
  });
}

function travel(index) {
  movement = null;
  const [, x, z] = places[index];
  const hubPromenade = index === 0 && hasDock;
  const approach = {0: hubPromenade ? 3.55 : 3.65, 2: 4.4, 10: 2}[index] ?? 3.5;
  Object.assign(avatar, {x: hubPromenade ? x-1.8 : x, z: z+approach, facing: -1, heading: 0});
  openPlace(index);
  update();
}
function walk(dx, dz) {
  const x = avatar.x + dx, z = avatar.z + dz;
  const islandLimit = hasDock ? Math.min(x>=-13.5 && x<=11 ? 22.35 : 21,dockShoreEdge(x)-.35) : 21;
  const onIsland = Math.abs(x)<=18 && z>=-21 && z<=islandLimit;
  const onDock = hasDock && z>21 && z<=33 && Math.abs(x)<=2.28*dockBridgeScale(z)-.27;
  if (!onIsland && !onDock) return;
  if (hasDock && isDockTree(x,z)) return;
  if (places.some(([, bx, bz,, levels], index) => {
    if (!levels) return false;
    if (index === 2) return Math.hypot((x-bx)/5.05,(z-bz)/3.9) < 1;
    if (index === 0) return Math.hypot((x-bx)/4.48,(z-bz)/3.55) < 1;
    return Math.abs(x-bx)<2.5 && Math.abs(z-bz)<2.5;
  })) return;
  const now = performance.now();
  const previous = movement && motionEnabled() ? sampleStep(now) : avatar;
  const strideDistance = Math.min(.56,Math.hypot(x-previous.x,z-previous.z)*.5);
  movement = {x:previous.x,z:previous.z,heading:previous.heading || 0,start:now,strideDistance};
  Object.assign(avatar, {x, z, facing: dx || dz, heading: Math.atan2(-dx,-dz)});
  update();
}
function nearby() {
  return places.findIndex(([, x, z]) =>
    Math.hypot(x - avatar.x, z + 3 - avatar.z) < 2.7);
}
function update() {
  const index = nearby();
  const message = index < 0 ? (avatar.z > 22 ? 'On South Dock · walk north to Discovery Plaza' : 'On the island trail') : 'At the entrance to ' + places[index][0];
  if (byId('position').textContent !== message) byId('position').textContent = message;
  const enter = byId('enter');
  enter.disabled = index < 0;
  enter.textContent = index < 0 ? 'Enter' : 'Enter ' + places[index][0];
  draw();
}
for (const [index, [name]] of places.entries()) {
  add('option', name, byId('travel')).value = index;
}
byId('go').onclick = () => travel(Number(byId('travel').value));
byId('enter').onclick = () => { if (nearby() >= 0) openPlace(nearby()); };
document.querySelectorAll('[data-move]').forEach(control => {
  control.onclick = () => walk(...control.dataset.move.split(',').map(Number));
});
const keys = {arrowup:[0,-1], w:[0,-1], arrowdown:[0,1], s:[0,1], arrowleft:[-1,0], a:[-1,0], arrowright:[1,0], d:[1,0]};
document.addEventListener('keydown', event => {
  if (insideStudio || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('button,select,textarea,input')) return;
  const direction = keys[event.key.toLowerCase()];
  if (direction) {
    event.preventDefault();
    if (!event.repeat || !movement || performance.now()-movement.start >= stepDuration*.90) walk(...direction);
  } else if (event.key === 'Enter' && nearby() >= 0) {
    openPlace(nearby());
  }
});

function sampleStep(now) {
  const progress = Math.min(1,(now-movement.start)/stepDuration);
  const x = movement.x+(avatar.x-movement.x)*progress;
  const z = movement.z+(avatar.z-movement.z)*progress;
  const delta = (avatar.heading || 0)-movement.heading;
  const heading = movement.heading+Math.atan2(Math.sin(delta),Math.cos(delta))*Math.min(1,progress*2);
  const gaitPhase = (progress*2)%1;
  const swingSide = progress<.5 ? -1 : 1;
  return {...avatar,x,z,heading,progress,gaitPhase,swingSide,strideDistance:movement.strideDistance};
}

function tickWater(now) {
  if (now-lastWaterFrame >= 45) draw();
  else animationFrame = requestAnimationFrame(tickWater);
}
document.addEventListener('visibilitychange', draw);

// Orthographic projection of real x/y/z geometry. The north-up camera has no rotation or motion effects.
function draw() {
  if (island) {
    cancelAnimationFrame(animationFrame);
    const now = performance.now();
    const animateWater = !insideStudio && !overview && avatar.z>18 && motionEnabled() && !document.hidden;
    const time = animateWater ? (now%120000)/1000 : 0;
    if (movement && motionEnabled() && !insideStudio) {
      const sample = sampleStep(now);
      if (sample.progress < 1) {
        island(sample,overview,angle,Math.sin(sample.gaitPhase*Math.PI)*sample.swingSide,time);
        animationFrame = requestAnimationFrame(draw);
        return;
      }
    }
    movement = null;
    island(avatar,overview,angle,0,time);
    if (animateWater) {
      lastWaterFrame = now;
      animationFrame = requestAnimationFrame(tickWater);
    }
    return;
  }
  if (!ctx) return;
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  const scale = Math.min(width / 48, height / 37);
  const project = ([x, y, z]) => [width / 2 + (x + z * .13) * scale, height * .54 + (z * .65 - y * .88) * scale];
  function poly(points, color) {
    ctx.beginPath();
    points.forEach((point, i) => {
      const [x, y] = project(point);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function slab(x, z, w, d, color, y = 0) {
    poly([[x-w,y,z-d],[x+w,y,z-d],[x+w,y,z+d],[x-w,y,z+d]], color);
  }
  function box(x,z,w,d,base,h,top,front,side) {
    const a=x-w,b=x+w,c=z-d,e=z+d,y=base+h;
    poly([[b,base,c],[b,base,e],[b,y,e],[b,y,c]], side);
    poly([[a,base,e],[b,base,e],[b,y,e],[a,y,e]], front);
    slab(x,z,w,d,top,y);
  }
  function ring(x, z, radius, y) {
    return Array.from({length: 32}, (_, i) => {
      const angle = i / 32 * Math.PI * 2;
      return [x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius];
    });
  }
  function drum(x,z,base,height,radius,upper,roof,walls) {
    const bottom = ring(x,z,radius,base);
    const top = ring(x,z,upper,base+height);
    for (let i=0;i<16;i++) {
      const j=i+1;
      poly([bottom[i],bottom[j],top[j],top[i]],walls[i % walls.length]);
    }
    if (roof) poly(top,roof);
  }
  function stroke(points, color, width) {
    ctx.beginPath();
    points.forEach((point, i) => {
      const [x, y] = project(point);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function label(name,x,z) {
    const [sx,sy] = project([x,.15,z]);
    ctx.font = '700 ' + Math.max(9, Math.min(13, scale)) + 'px system-ui';
    const w = ctx.measureText(name).width;
    ctx.fillStyle = '#142c33';
    ctx.fillRect(sx-w/2-5,sy-10,w+10,15);
    ctx.fillStyle = '#f5fffa';
    ctx.textAlign = 'center';
    ctx.fillText(name,sx,sy+1);
  }
  const water = ctx.createLinearGradient(0,0,width,height);
  water.addColorStop(0,'#15304c');
  water.addColorStop(.55,'#1c6b79');
  water.addColorStop(1,'#459b97');
  ctx.fillStyle=water;
  ctx.fillRect(0,0,width,height);
  for (let i=0;i<130;i++) {
    ctx.fillStyle = i%3 ? '#a9ddd91a' : '#d7f4ed38';
    ctx.fillRect((i*97)%width, (i*67)%height, 9 + i%8*5, 1);
  }
  const shore = [[-17,-22],[16,-22],[19,-17],[20,16],[17,22],[7,23],[-15,23],[-20,16],[-20,-14]];
  const coast = y => shore.map(([x,z]) => [x,y,z]);
  for (let i=0;i<shore.length;i++) {
    const a=coast(0)[i], b=coast(0)[(i+1)%shore.length];
    poly([[a[0],-2.3,a[2]],[b[0],-2.3,b[2]],b,a],'#48585a');
    for (let t=0;t<1;t+=.065) {
      const x=a[0]+(b[0]-a[0])*t, z=a[2]+(b[2]-a[2])*t;
      if (z > 15 || Math.abs(x) > 18) {
        box(x,z,.36,.38,-1.6,.48,'#92918a','#697774','#485a61');
        box(x+.27,z,.4,.33,-.8,.64,'#adaca0','#818680','#596b68');
      }
    }
  }
  poly(coast(0),'#456e58');
  stroke([...coast(.02),coast(.02)[0]],'#b1b5a0',2);
  box(0,23,2.7,2,-.65,.65,'#b29776','#5f4c3f','#756153');
  for(let z=21.5;z<25;z+=.38) stroke([[-2.7,.02,z],[2.7,.02,z]],'#766550',.8);
  slab(0,0,2.2,22,'#c1b99b',.02);
  for (const [,x,z] of places) {
    slab(x/2,z+3.5,Math.max(.5,Math.abs(x)/2),.85,'#a9aa91',.03);
  }
  slab(-4.6,0,4.6,1.18,'#d0c4a6',.06);
  for (const z of [-1.03,1.03]) stroke([[-8.8,.08,z],[-3,.08,z]],'#a6f5cf',2);
  for (const x of [-1.85,1.85]) stroke([[x,.08,4],[x,.08,22]],'#a6f5cf',2);
  drum(0,0,.05,.18,5,4.9,'#d7cbb0',['#827d71','#a09b87']);
  stroke([...ring(0,0,4.5,.24),ring(0,0,4.5,.24)[0]],'#eaf7db',1);
  drum(0,-1.45,.25,.28,1.9,1.9,'#568d89',['#6b7f76','#62716e']);
  for (const [tilt,radius,y] of [[.6,1.45,1.8],[-.7,1.12,1.8]]) {
    const orbit = Array.from({length: 49}, (_, i) => {
      const angle = i/48*Math.PI*2;
      return [Math.cos(angle)*radius, y + Math.sin(angle)*radius, -1.45 + Math.cos(angle)*tilt];
    });
    stroke(orbit, '#67d9cb66', 6);
    stroke(orbit, '#c4ffe7', 1.5);
  }

  const objects = places.flatMap(([name,x,z,color,levels], index) => {
    if (index === 10) return [];
    return [{z:z+2.5,paint() {
      slab(x+.6,z+.5,3.05,2.85,'#334e45',.07);
      drum(x,z,.07,.25,3,2.85,'#adab9a',['#74817a','#969688']);
      const ceramic=['#e7d9bb','#cdbd9f','#e3cfac','#b7b0a1'];
      const glass=['#508b99','#387482','#5fa4ad','#346879'];
      if (index === 2) {
        drum(x,z,.32,1.65,2.65,2.65,'#efe6cd',ceramic);
        drum(x,z,1.96,.22,2.77,2.77,'#fff2d2',ceramic);
        const dome = [[2.48,2.2],[2.26,2.73],[1.81,3.25],[1.05,3.64],[0,3.78]];
        dome.slice(1).forEach(([r,y],i) => drum(x,z,dome[i][1],y-dome[i][1],dome[i][0],r,null,glass));
        for (const offset of [-2.03,2.03]) {
          box(x+offset,z,.1,.12,2.05,2.45,'#e4fff3','#c2d2c4','#718b84');
          box(x+offset,z,.21,.21,4.45,.25,'#e8fff1',color,'#55ad9e');
        }
      } else if (index === 0 || index === 1 || index === 3 || index === 6) {
        drum(x,z,.32,1.45,2.38,2.38,'#d6e4da',glass);
        drum(x,z,1.76,.55,2.8,index===1?1.8:2.5,'#eee4ca',ceramic);
        if (index === 1) drum(x,z,2.31,.84,1.75,1.3,'#efce92',glass);
      } else {
        box(x,z,2.1,1.86,.32,1.55,'#e9dec4','#d7c9ac','#aba794');
        box(x+.24,z,1.55,1.42,1.87,levels*.33,'#ded8bf','#4a7880','#78999c');
        box(x+.24,z,1.67,1.49,1.87+levels*.33,.14,color,'#ede2c9','#c1b8a5');
      }
      box(x,z+2.38,.68,.22,.3,1.25,'#e9dcc4','#273f50','#698286');
      box(x,z+2.62,.7,.035,1.36,.11,'#faffea',color,color);

    }}];
  });
  for (const [x,z] of [[-17,-17],[17,-17],[-17,-10],[17,-4],[-16,13],[16,13],[-12,19],[12,19],[-6,9],[5,7],[-5,-6],[5,-6],[3,15],[9,-4]]) {
    objects.push({z,paint() {
      drum(x,z,.02,.25,1.03,.99,'#76836a',['#918a74','#b4ad93']);
      box(x,z,.12,.12,.25,1.18,'#97836b','#866752','#625d49');
      drum(x,z,1,.52,.63,.92,'#588866',['#3d775d','#548a69']);
      drum(x,z,1.52,.72,.92,.28,'#a0b977',['#599371','#73a47b','#85aa77']);
    }});
  }
  const {x,z,color,facing} = avatar;
  objects.push({z,paint() {
    slab(x,z,.65,.43,'#324843',.11);
    for (const foot of [-.2,.2]) box(x+foot,z,.14,.18,0,.56,'#324453','#233441','#2c4151');
    box(x,z,.36,.24,.54,.68,color,'#f2eee0','#537d78');
    box(x-.39,z,.11,.16,.56,.57,color,color,'#537d78');
    box(x+.39,z,.11,.16,.56,.57,color,color,'#537d78');
    box(x,z,.26,.22,1.22,.43,'#faf0d7','#d3b99e','#a28d7b');
    box(x+facing*.06,z+.23,.19,.02,1.35,.13,color,'#173440','#314f60');
    const [sx,sy] = project([x,2.18,z]);
    ctx.fillStyle='#fff1c1';
    ctx.beginPath();
    ctx.moveTo(sx-5,sy-6);
    ctx.lineTo(sx+5,sy-6);
    ctx.lineTo(sx,sy);
    ctx.fill();
  }});
  objects.sort((a,b) => a.z-b.z).forEach(object => object.paint());
  for (const [index,[name,bx,bz]] of places.entries()) {
    if (index === 2 || index === 10 || (width >= 580 && (index === 0 || index === 1))) {
      label(name,bx,bz+3.8);
    }
  }
}
new ResizeObserver(draw).observe(island ? view3d : canvas);
openPlace(0, false);
update();
byId('world-controls').inert = false;
let materialPaint = 0;
view3d.addEventListener('material-ready',()=>{
  if (materialPaint) return;
  materialPaint=requestAnimationFrame(()=>{
    materialPaint=0;
    draw();
  });
});
}
void startWorld();
