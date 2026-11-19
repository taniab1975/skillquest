'use strict';

const sampleEntries = [
  [2, '2026-02-16', 'Explaining the relay route',
    'A new teammate needed directions in Relay Rescue.', 'Guide them to the right dock.',
    'I read the route aloud after a prompt from my partner.', 'They reached the ramp but asked which dock to use. Next time I will give the dock number first.'],
  [3, '2026-03-11', 'Sharing jobs for a display',
    'Our group was preparing a class display.', 'Agree who would make each part.',
    'I chose the captions and checked our jobs against the teacher’s checklist.', 'All parts were finished, but two of us had written the same caption.'],
  [4, '2026-04-29', 'Noticing a queue bottleneck',
    'The school stall queue was blocking the pickup table.', 'Find one change we could try.',
    'I pointed out the overlap and suggested a separate pickup sign after a teammate asked for ideas.', 'We had a change to try at the next stall.'],
  [2, '2026-05-20', 'Briefing stall volunteers',
    'Two volunteers arrived halfway through setup.', 'Explain where customers should order and collect.',
    'I pointed to each station and asked a volunteer to repeat the pickup instructions.', 'They spotted that one sign faced the wrong way, so we turned it before opening.'],
  [3, '2026-06-24', 'Coordinating a handover',
    'Our event team changed shifts during lunch.', 'Help the next group take over.',
    'I asked each teammate what still needed doing, agreed who would own each job and wrote a shared handover.', 'The next group picked up all three jobs without asking us to return.'],
  [4, '2026-08-05', 'Testing a new pickup layout',
    'A later stall had the same congestion.', 'Improve the layout before the busiest break.',
    'I sketched two layouts, asked the supervisor to approve a trial and counted how often the queue crossed the pickup area.', 'Crossings fell from six to two in the same five-minute window. I shared the layout for the next team.'],
  [2, '2026-09-16', 'Adapting a visitor briefing',
    'At a school open day, visitors were unfamiliar with campus names.', 'Help families reach the workshop.',
    'I swapped building names for visible landmarks, asked a family to tell me their next turn and adjusted my wording when they hesitated.', 'The next three families followed the route without needing a second explanation.'],
].map(([skill, date, title, Situation, Task, Action, Result]) => ({
  skill, date, title, Situation, Task, Action, Result,
}));

async function startWorld() {
const dockAssets = await loadSouthDock();
const arrivalLayout = typeof southDockLayout === 'object'
  ? southDockLayout : {hub:[7.3,16.9],lab:[-8.1,13]};
const labName=index=>labThemes[index].name+' Skills Lab';
const places = [
  ['Orientation Hub', ...arrivalLayout.hub, '#76e5bb', 2],
  ['My Portfolio', 0, -17, '#f1ce92', 3],
  [labName(2), ...arrivalLayout.lab, labThemes[2].accent, 4],
  [labName(3), 9, 8, labThemes[3].accent, 2],
  [labName(4), -15, 6, labThemes[4].accent, 3],
  [labName(5), 14, 1, labThemes[5].accent, 4],
  [labName(6), -14, -8, labThemes[6].accent, 2],
  [labName(7), 14, -8, labThemes[7].accent, 3],
  [labName(8), -8, -14, labThemes[8].accent, 3],
  [labName(9), 8, -14, labThemes[9].accent, 5],
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
const play = document.documentElement.hasAttribute('data-play');
const playCanvas = island ? view3d : canvas;
let arrivalGuide;
let routeMap;
let guideLoading;
let guideReady = false;
let playerCharacter;
let playerRequest;
let running = false;
let walkingUntil = 0;
let lastDoor = -1;
if (play || view === 'embed' || view === 'arrival-study') {
  const arrivalCanvas = playCanvas;
  arrivalCanvas.tabIndex = 0;
  arrivalCanvas.removeAttribute('aria-hidden');
  arrivalCanvas.setAttribute('aria-label','Skillsville. Use arrow keys or WASD to walk and walk through doorways to enter buildings.');
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
const coastline = island ? skillsvilleCoast(hasDock) : null;
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
const movementDuration = () => running ? 190 : stepDuration;
let movement = null;
let animationFrame = 0;
let lastWaterFrame = 0;
let studioView = 'welcome';
let insideStudio = false;
let archive = null;
let sort = 'timeline';
let teacherView = false;
let portfolioSource = view === 'embed' ? 'sample' : 'saved';

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
function approachCommunication() {
  const [,x,z]=places[2];
  movement=null;
  angle=0;
  Object.assign(avatar,{x,z:z+4.4,facing:-1,heading:0});
  update();
  if (play) {
    closePlayActivity();
  } else {
    const activity = byId('embed-activity');
    if (view === 'embed' && activity?.getAttribute('aria-expanded') === 'true') activity.click();
    byId('enter').focus({preventScroll:true});
  }
}
function labDirectory() {
  const directory=add('details','');
  directory.className='lab-directory';
  add('summary','Skills Lab directory',directory);
  const scroll = add('div', '', directory);
  scroll.className = 'portfolio-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Skills Lab logos');
  const list=add('ul','',scroll);
  for (const [key,theme] of Object.entries(labThemes)) {
    const index=Number(key);
    const row=add('li','',list);
    const visit=button('',index===2 ? approachCommunication : ()=>travel(index),row);
    visit.style.setProperty('--lab-accent',theme.accent);
    visit.append(createLabMark(index));
    const name=add('span',places[index][0],visit);
    add('small',theme.meaning,name);
  }
}
function closePlayActivity() {
  if(archive){archive.leave();return;}
  document.documentElement.removeAttribute('data-play-activity');
  const leavingLab = insideStudio;
  if (leavingLab) openPlace(0, false);
  playCanvas.focus({preventScroll:true});
  if (leavingLab) arrivalGuide?.offerPortfolio();
}
function enterArchive() {
  if (archive) return;
  function station(title, render) {
    archive.room.inert=true;
    document.documentElement.dataset.archiveStation = '';
    panel.replaceChildren();
    byId('title').textContent=title;
    byId('label').textContent='PORTFOLIO BUILDER';
    button('Back to room', lobby);
    render();
    byId('title').focus();
  }
  function lobby() {
    delete document.documentElement.dataset.archiveStation;
    archive.room.inert=false;
    archive.room.querySelector('button').focus();
  }
  function leave() {
    archive.destroy();archive=null;
    delete document.documentElement.dataset.archiveStation;
    insideStudio=false;
    openPlace(0,false);
    closePlayActivity();
    const toggle=byId('embed-activity');
    if(view==='embed' && toggle.getAttribute('aria-expanded')==='true') toggle.click();
    lastDoor=1;
    update();playCanvas.focus();
  }
  archive=openPortfolioStudio({
    build:()=>station('Story desk',()=>reflection(panel,true)),
    collection:()=>{teacherView=false;station('My collection',gallery)},
    review:()=>{teacherView=true;station('Teacher desk',gallery)},leave
  });
  archive.lobby=lobby;
  archive.collection=()=>{teacherView=false;station('My collection',gallery)};
  archive.refresh=()=>station(teacherView?'Teacher desk':'My collection',gallery);
  archive.leave=leave;
}
function openPlace(index, focus = true) {
  if(index===1){
    lastDoor=1;routeMap?.finish(1);insideStudio=true;
    enterArchive();return;
  }
  if (index !== 2) studioView = 'welcome';
  insideStudio = index === 2;
  if (focus && places[index][4]) lastDoor = index;
  routeMap?.finish(index);
  if (insideStudio) {
    const studioArt = byId('studio-art');
    if (!studioArt.hasAttribute('src')) studioArt.src=studioArt.dataset.src;
  }
  canvas.hidden = insideStudio || Boolean(island);
  view3d.hidden = insideStudio || !island;
  byId('studio-scene').hidden = !insideStudio;
  byId('world-controls').hidden = insideStudio;
  byId('title').textContent = places[index][0];
  const theme=labThemes[index];
  const label=byId('label');
  label.textContent=({0:'01 / SOUTH DOCK', 1:'YOUR PRIVATE COLLECTION', 2:'03 / INSIDE THE STUDIO', 10:'02 / DISCOVERY PLAZA'})[index] || theme.landmark;
  label.style.color=theme?.accent||'';
  if(theme) label.prepend(createLabMark(index));
  panel.replaceChildren();
  if (index === 0) {
    add('p', 'Welcome to Skillsville. Follow the mint trail to Discovery Plaza, then explore the Skills Labs, coastal promenade and My Portfolio terrace. A relay beacon has gone quiet near the glass-domed Communication Skills Lab.');
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
    add('p', 'Discovery Plaza will introduce what skills are, why they matter, how you can develop them, and how My Portfolio helps you record and reflect on your experiences. For now, choose a Skills Lab below or explore the island. My Portfolio is north of the plaza.');
    button('Walk to Communication Skills Lab',approachCommunication).className='primary';
    button('Open My Portfolio', () => travel(1));
    labDirectory();
  } else {
    add('p',theme.detail);
    add('p','Recommended pilot lab: exterior preview only. Learning activities remain to be designed. Visit Communication to play Relay Rescue.');
  }
  if (focus) {
    if (play) {
      document.documentElement.dataset.playActivity = '';
      const activityPanel = byId('activity-panel');
      if (!activityPanel.querySelector('.play-close')) {
        const close = button('Back to island', closePlayActivity, activityPanel);
        close.className = 'play-close';
        activityPanel.prepend(close);
      }
    }
    const activity = byId('embed-activity');
    if (view === 'embed' && activity?.getAttribute('aria-expanded') === 'false') activity.click();
    byId('title').focus();
  }
}
function gallery() {
  const modes = add('div', '');
  modes.className = 'row';
  for (const [label, teacher] of [['Student portfolio', false], ['Teacher review', true]]) {
    const tab = button(label, () => { teacherView = teacher; archive.refresh(); }, modes);
    tab.setAttribute('aria-pressed', String(teacherView === teacher));
  }
  add('p', 'Fictional classroom preview · records and teacher feedback stay in this browser.');
  if (!teacherView && !archive) {
    const entry = add('details', '');
    add('summary', 'Add an experience', entry);
    reflection(entry);
  } else if (teacherView) {
    add('h3', 'Class overview');
    const roster = add('div', '');
    roster.className = 'row';
    for (const [key, name, records] of [['saved', 'Your demo student', data.entries], ['sample', 'Alex Morgan', sampleEntries]]) {
      const covered = new Set(records.map(record => record.skill ?? 2));
      button(name + ' · ' + records.length + ' entries · ' + covered.size + '/8 capabilities', () => {
        portfolioSource = key;
        archive.refresh();
      }, roster).setAttribute('aria-pressed', String(portfolioSource === key));
    }
  }
  const source = add('div', '');
  const order = add('div', '');
  const content = add('div', '');
  const formatter = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  function choices(parent, label, options, selected, onChange) {
    parent.className = 'row';
    parent.setAttribute('role', 'group');
    parent.setAttribute('aria-label', label);
    for (const [key, name] of options) {
      const control = button(name, () => {
        for (const sibling of parent.children) sibling.setAttribute('aria-pressed', String(sibling === control));
        onChange(key);
        renderEntries();
      }, parent);
      control.setAttribute('aria-pressed', String(selected === key));
    }
  }

  function skillHeading(parent, skill, tag) {
    const theme = labThemes[skill];
    const heading = add(tag, theme.name, parent);
    heading.className = 'portfolio-skill';
    heading.style.setProperty('--lab-accent', theme.accent);
    heading.prepend(createLabMark(skill));
  }

  function entryCard(entry, parent, grouped) {
    const card = add('article', '', parent);
    card.className = 'card portfolio-entry';
    if (!grouped) skillHeading(card, entry.skill, 'p');
    if (entry.context) add('small', entry.context, card);
    if (entry.title) add('h4', entry.title, card);
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(entry.date);
    const date = add('time', iso ? formatter.format(new Date(entry.date)) : entry.date, card);
    if (iso) date.dateTime = entry.date;
    const star = add('details', '', card);
    add('summary', 'Read STAR reflection', star);
    const list = add('dl', '', star);
    for (const field of fields) {
      add('dt', field, list);
      add('dd', entry[field], list);
    }
    if (entry.interests) {
      add('dt', 'Interests and possible futures', list);
      add('dd', entry.interests, list);
    }
    if (entry.evidence) {
      try {
        const url = new URL(entry.evidence);
        if (url.protocol === 'https:') {
          const link = add('a', 'Open supporting evidence', star);
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      } catch {}
    }
    const key = entry.reviewKey;
    const review = data.reviews?.[key];
    if (review) add('p', review.status + ' · ' + review.note, card);
    if (teacherView) {
      const editor = add('details', '', card);
      add('summary', review ? 'Update teacher feedback' : 'Review this entry', editor);
      const status = add('select', '', add('label', 'Review outcome', editor));
      for (const value of ['Reviewed', 'Follow-up requested']) add('option', value, status);
      status.value = review?.status || 'Reviewed';
      const note = add('textarea', '', add('label', 'Feedback for the student', editor));
      note.value = review?.note || '';
      note.required = true;
      note.maxLength = 900;
      button('Save feedback', () => {
        if (!note.value.trim()) { note.value = ''; note.reportValidity(); return; }
        data.reviews ||= {};
        data.reviews[key] = { status: status.value, note: note.value.trim() };
        save();
        renderEntries();
        add('p', storage ? 'Feedback saved.' : 'Feedback available for this session only.', content).setAttribute('role', 'status');
      }, editor);
    }

  }

  function renderEntries() {
    content.replaceChildren();
    const sample = portfolioSource === 'sample';
    const entries = (sample ? sampleEntries : data.entries).map((entry, index) => {
      const legacyDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(entry.date);
      const date = legacyDate ? [legacyDate[3], legacyDate[2].padStart(2, '0'), legacyDate[1].padStart(2, '0')].join('-') : entry.date;
      return { ...entry, date, skill: entry.skill ?? 2, reviewKey: portfolioSource + '-' + (entry.id || index) };
    }).sort((a, b) => b.date.localeCompare(a.date));
    add('p', sample
      ? 'Alex Morgan · Fictional student. Follow the evidence from February to September.'
      : 'Your STAR reflections are saved in this browser.', content);
    if (!entries.length && sort === 'timeline') {
      add('p', 'Your saved STAR reflections will appear here.', content);
      return;
    }
    const scroll = add('div', '', content);
    scroll.className = 'portfolio-scroll';
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', sort === 'skill' ? 'Employability skills and evidence' : 'Chronological evidence');
    if (sort === 'timeline') {
      for (const entry of entries) entryCard(entry, scroll, false);
      return;
    }
    for (const [key, theme] of Object.entries(labThemes)) {
      const skill = Number(key);
      const group = add('section', '', scroll);
      group.className = 'portfolio-group';
      skillHeading(group, skill, 'h3');
      add('p', theme.meaning, group);
      const matching = entries.filter(entry => entry.skill === skill);
      if (!matching.length) add('small', 'No entries yet', group);
      for (const entry of matching) entryCard(entry, group, true);
    }
  }

  if (!teacherView) choices(source, 'Portfolio records', [['sample', 'Sample student'], ['saved', 'My entries']],
    portfolioSource, key => { portfolioSource = key; });
  choices(order, 'View evidence', [['timeline', 'Chronology'], ['skill', 'By skill type']],
    sort, key => { sort = key; });
  renderEntries();
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
    welcome: 'Explore how people communicate at work, spot what can go wrong and practise a workplace handover.',
  };
  if (descriptions[studioView]) add('p', descriptions[studioView]);
  const choices = add('div', '');
  choices.className = 'studio-choices';
  for (const [view, name, hint] of [
    ['discover', 'Discover', 'Start the workplace mini-workshop'],
    ['practise', 'Practise', 'Optional · Relay Rescue with Kai'],
    ['evidence', 'My Portfolio', 'Record a STAR example'],
  ]) {
    const control = button(name, () => showStudio(view), choices);
    add('small', hint, control);
    control.setAttribute('aria-label', name);
    control.setAttribute('aria-pressed', String(studioView === view));
  }
  if (studioView === 'discover') communicationWorkshop(panel, {add, button, startRelay: () => showStudio('practise')});
  if (studioView === 'practise') mission();
  if (studioView === 'evidence') reflection();
  if (play || view === 'embed') {
    button('Leave the lab', () => play ? closePlayActivity() : byId('embed-activity').click()).className = 'quiet';
  } else {
    button('Return to the plaza', () => travel(10)).className = 'quiet';
  }
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

function reflection(parent = panel, guided = false) {
  add('h3', 'Capture an experience', parent);
  add('p', 'Choose a fictional example from school, work or everyday life. What did you do that shows this capability?', parent);
  const form = add('form', '', parent);
  function input(label, key, type, required = false) {
    const field = add('input', '', add('label', label, form));
    field.type = type;
    field.required = required;
    field.value = draft[key] || '';
    field.addEventListener('input', () => { draft[key] = field.value; });
    return field;
  }
  input('Experience title', 'title', 'text', true);
  const date = input('Experience date', 'date', 'date', true);
  if (!date.value) date.value = new Date().toLocaleDateString('sv-SE');
  function select(label, options, key) {
    const field = add('select', '', add('label', label, form));
    for (const [value, name] of options) add('option', name, field).value = value;
    if (draft[key]) field.value = draft[key];
    field.onchange = () => { draft[key] = field.value; };
    return field;
  }
  const skill = select('Capability demonstrated', Object.entries(labThemes).map(([key, theme]) => [key, theme.name]), 'skill');
  const context = select('Where did it happen?', ['School', 'Work', 'Home', 'Volunteering', 'Sport or community', 'Other'].map(name => [name, name]), 'context');
  const prompts = ['Where were you and what was happening?', 'What were you responsible for?', 'What did you personally do?', 'What changed and how could you tell?'];
  for (const [index, field] of fields.entries()) {
    const label = add('label', field + ' · ' + prompts[index], form);
    const area = add('textarea', '', label);
    area.required = true;
    area.maxLength = 900;
    area.value = draft[field] || '';
    area.addEventListener('input', () => { draft[field] = area.value; });
  }
  input('What did you enjoy or want to explore next? (optional)', 'interests', 'text');
  input('Supporting evidence link (optional, https://)', 'evidence', 'url').pattern = 'https://.+';
  const submit = add('button', 'Save and open My Portfolio', form);
  submit.className = 'primary';
  const error = add('p', '', form);
  error.setAttribute('role', 'status');
  if(guided){
    const labels=[...form.querySelectorAll('label')];
    const stages=[[0,1,3],[4],[5],[6],[7],[2,8,9]];
    const titles=['Choose a memory','Set the scene','Your part','Your move','What changed?','Curate your story'];
    const heading=add('h3','',form);form.prepend(heading);
    const nav=add('div','',form);nav.className='row';
    let page=0;
    const back=button('Previous',()=>{page--;show()},nav);
    const next=button('Continue',()=>{
      for(const i of stages[page]){
        const control=labels[i].lastElementChild;
        if(!control.reportValidity())return;
      }
      page++;show();
    },nav);
    function show(){
      labels.forEach((label,i)=>label.style.display=stages[page].includes(i)?'block':'none');
      heading.textContent=titles[page];back.disabled=page===0;
      next.hidden=page===stages.length-1;submit.hidden=!next.hidden;
      labels[stages[page][0]].lastElementChild.focus();
    }
    submit.textContent='Place story in my collection';show();
    form.addEventListener('submit',event=>{
      if(page<stages.length-1){event.preventDefault();event.stopImmediatePropagation();next.click()}
    },true);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (fields.some(field => !draft[field]?.trim())) {
      error.textContent = 'Please write something in each STAR field.';
      return;
    }
    data.entries.push({...draft, id: crypto.randomUUID(), skill: Number(skill.value), context: context.value, date: date.value});
    teacherView = false;
    save();
    draft = {};
    portfolioSource = 'saved';
    travel(1);
    archive.collection();
    add('p', storage ? 'Reflection saved in this browser.' : 'Reflection added for this session. Browser storage is unavailable.').setAttribute('role', 'status');
  });
}

function travel(index) {
  movement = null;
  if (labThemes[index]) angle=0;
  const [, x, z] = places[index];
  const hubPromenade = index === 0 && hasDock;
  const approach = {0: hubPromenade ? 3.55 : 3.65, 2: 4.4, 10: 2}[index] ?? 3.5;
  Object.assign(avatar, {x: hubPromenade ? x-1.8 : x, z: z+approach, facing: -1, heading: 0});
  openPlace(index);
  update();
}
function canWalk(x,z) {
  const onIsland = coastline ? insideIslandShore(x,z,coastline) : Math.abs(x)<=18 && z>=-21 && z<=21;
  const onDock = hasDock && z>21 && z<=33 && Math.abs(x)<=2.28*dockBridgeScale(z)-.27;
  if (!onIsland && !onDock) return false;
  if (hasDock && isDockTree(x,z)) return false;
  if (island && districtGardenBlocks(x,z)) return false;
  if (places.some(([, bx, bz,, levels], index) => {
    if (!levels) return false;
    if (index === 2) return Math.hypot((x-bx)/5.05,(z-bz)/3.9) < 1;
    if (index === 0) return Math.hypot((x-bx)/4.48,(z-bz)/3.55) < 1;
    return island ? pavilionBlocks(index,x-bx,z-bz) : Math.abs(x-bx)<2.5 && Math.abs(z-bz)<2.5;
  })) return false;
  return true;
}
function doorway(index) {
  const [,x,z] = places[index];
  const front = index === 0 ? 3.65 : index === 1 ? archivePavilion.depth+.17
    : index === 2 ? 4.35 : labSites[index].bounds[1]+labSites[index].bounds[3]+.13;
  return [x,z+front];
}
function walkInDoor(x,z) {
  if ((!play && view !== 'embed') || z >= avatar.z) return -1;
  return places.findIndex(([, , , , levels], index) => {
    if (!levels || index === lastDoor) return false;
    const [doorX,doorZ] = doorway(index);
    return Math.abs(x-doorX) <= 1.2 && avatar.z >= doorZ-.55 && z <= doorZ && z >= doorZ-1.6;
  });
}
function walk(dx, dz) {
  if (insideStudio || document.documentElement.hasAttribute("data-play-activity") || document.documentElement.hasAttribute("data-activity-open")) return;
  const x = avatar.x + dx, z = avatar.z + dz;
  const entrance = walkInDoor(x,z);
  if (entrance >= 0) {
    movement = null;
    openPlace(entrance);
    update();
    return;
  }
  if (!canWalk(x,z)) return;
  if (lastDoor >= 0) {
    const [doorX,doorZ] = doorway(lastDoor);
    if (Math.abs(x-doorX)>1.4 || Math.abs(z-doorZ)>1.65) lastDoor = -1;
  }
  const now = performance.now();
  const previous = movement && motionEnabled() ? sampleStep(now) : avatar;
  const strideDistance = Math.min(.56,Math.hypot(x-previous.x,z-previous.z)*.5);
  movement = {x:previous.x,z:previous.z,heading:previous.heading || 0,start:now,strideDistance};
  walkingUntil = now+movementDuration()+150;
  Object.assign(avatar, {x, z, facing: dx || dz, heading: Math.atan2(-dx,-dz)});
  update();
}
function nearby() {
  return places.findIndex(([, x, z]) =>
    Math.hypot(x - avatar.x, z + 3 - avatar.z) < 2.7);
}
function update() {
  const index = nearby();
  routeMap?.update(avatar);
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
  if (byId('arrival-guide').open) return;
  running = event.shiftKey;
  if (play && document.documentElement.hasAttribute('data-play-activity')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePlayActivity();
    }
    return;
  }
  if (insideStudio || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('button,select,textarea,input,.portfolio-scroll,summary')) return;
  const direction = keys[event.key.toLowerCase()];
  if (direction) {
    event.preventDefault();
    if (!event.repeat || !movement || performance.now()-movement.start >= movementDuration()*.90) walk(...direction);
  } else if (event.key === 'Enter' && nearby() >= 0) {
    openPlace(nearby());
  }
});

function sampleStep(now) {
  const progress = Math.min(1,(now-movement.start)/movementDuration());
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
document.addEventListener('keyup', event => { if (event.key === 'Shift') running = false; });
window.addEventListener('blur', () => { running = false; });
document.addEventListener('visibilitychange', draw);

async function selectPlayer(name) {
  playerRequest?.abort();
  const request = new AbortController();
  playerRequest = request;
  const status = byId('avatar-status');
  status.textContent = 'Loading '+name+'…';
  try {
    const {loadPlayer} = await import('./player-avatar/player.js');
    if (request.signal.aborted) return;
    const character = await loadPlayer(name,request.signal);
    if (request.signal.aborted) { character?.dispose(); return; }
    playerCharacter?.dispose();
    playerCharacter = character;
    try { localStorage.setItem('skillsville-player-v1',name); } catch {}
    byId('player-choice').value = name;
    status.textContent = name === 'girl' ? 'Girl selected' : 'Boy selected';
    draw();
  } catch (error) {
    if (!request.signal.aborted) {
      status.textContent = 'Character could not load. Choose again to retry.';
      console.warn('Player character unavailable',error);
    }
  }
}

async function selectGuide(name) {
  if (!island) return;
  guideLoading?.abort();
  const request = new AbortController();
  guideLoading = request;
  guideReady = false;
  island.setGuideModel(null);
  draw();
  try {
    const { loadGuideAvatar } = await import('./arrival-guide/avatar.js');
    if (request.signal.aborted) return;
    const vertices = await loadGuideAvatar(name.toLowerCase(), request.signal);
    if (request.signal.aborted || !vertices?.length) return;
    island.setGuideModel(vertices);
    guideReady = true;
    draw();
  } catch (error) {
    if (!request.signal.aborted) console.warn('Skillsville guide avatar failed to load.', error);
  }
}

function guideFrame(player, time) {
  const target = routeMap?.next();
  if (insideStudio || (!guideReady && !target)) return null;
  let x = player.x, z = player.z;
  const sideX = Math.cos(angle)*.86, sideZ = -Math.sin(angle)*.86;
  const aheadX = -Math.sin(angle)*.68, aheadZ = -Math.cos(angle)*.68;
  for (const side of [1,-1]) {
    const nextX = player.x+sideX*side+aheadX;
    const nextZ = player.z+sideZ*side+aheadZ;
    if (!canWalk(nextX,nextZ)) continue;
    x = nextX;
    z = nextZ;
    break;
  }
  let hint;
  if (target && Math.hypot(target[0]-player.x,target[1]-player.z)>.05) {
    const dx = target[0]-player.x, dz = target[1]-player.z;
    const distance = Math.hypot(dx,dz);
    const step = Math.min(.85,2.65/distance);
    const rightX = -dz/distance*.48, rightZ = dx/distance*.48;
    const nextX = player.x+dx*step, nextZ = player.z+dz*step;
    const offset = canWalk(nextX+rightX,nextZ+rightZ) ? 1 : 0;
    hint = {x:nextX+rightX*offset,z:nextZ+rightZ*offset,heading:Math.atan2(-dx,-dz)};
  }
  return {x,z,heading:angle+Math.sin(time*.0025)*.18,bob:Math.sin(time*.005)*.07,hint};
}

// Orthographic projection of real x/y/z geometry. The north-up camera has no rotation or motion effects.
function draw() {
  if (island) {
    cancelAnimationFrame(animationFrame);
    const now = performance.now();
    if (playerCharacter) island.setPlayerFrame(playerCharacter.frame(now,Boolean(movement) || now<walkingUntil,running,!motionEnabled()));
    const nearWater=avatar.z>13 || avatar.z<-14 || Math.abs(avatar.x)>12;
    const animateWater = !insideStudio && !overview && nearWater && motionEnabled() && !document.hidden;
    const animateGuide = guideReady && !insideStudio && !overview && motionEnabled() && !document.hidden;
    const guideTime = animateGuide ? now : 0;
    const time = animateWater ? (now%120000)/1000 : 0;
    if (movement && motionEnabled() && !insideStudio) {
      const sample = sampleStep(now);
      if (sample.progress < 1) {
        island(sample,overview,angle,Math.sin(sample.gaitPhase*Math.PI)*sample.swingSide,time,guideFrame(sample,guideTime));
        animationFrame = requestAnimationFrame(draw);
        return;
      }
    }
    movement = null;
    island(avatar,overview,angle,0,time,guideFrame(avatar,guideTime));
    if (animateWater || animateGuide || (playerCharacter && !insideStudio && motionEnabled() && !document.hidden)) {
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
  const atEntrance=nearby();
  for (const [index,[name,bx,bz]] of places.entries()) {
    if (index === atEntrance || index === 2 || index === 10 || (width >= 580 && (index === 0 || index === 1))) {
      label(name,bx,bz+3.8);
    }
  }
}
new ResizeObserver(draw).observe(island ? view3d : canvas);
openPlace(0, false);
update();
byId('world-controls').inert = false;
if (island) {
  byId('player-picker').hidden = false;
  let savedPlayer = 'boy';
  try { if (localStorage.getItem('skillsville-player-v1') === 'girl') savedPlayer = 'girl'; } catch {}
  byId('player-choice').value = savedPlayer;
  byId('player-choice').onchange = event => selectPlayer(event.target.value);
  void selectPlayer(savedPlayer);
}
if (play || view === 'embed') {
  routeMap = createSkillsvilleMap(places,coastline,hasDock);
  byId('map-toggle').addEventListener('click', () => routeMap.update(avatar));
  function startWalkingRoute(destination) {
    routeMap.start(destination,avatar);
    playCanvas.focus({preventScroll:true});
    update();
  }
  arrivalGuide = createArrivalGuide({
    onSelect: selectGuide,
    onExplore: () => startWalkingRoute(2),
    onPortfolio: () => startWalkingRoute(1),
    onClose: () => byId('your-guide').focus({preventScroll:true}),
  });
  byId('embed-activity').addEventListener('activity-closed', () => {
    if(archive){archive.leave();return;}
    if (!insideStudio) return;
    openPlace(0, false);
    arrivalGuide.offerPortfolio();
  });
}
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
