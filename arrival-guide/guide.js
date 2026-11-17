'use strict';

window.createArrivalGuide = function ({ onExplore, onSelect, onPortfolio, onClose }) {
  const names = ['Echo', 'Sprout', 'Moss', 'Bloom', 'Spark', 'Pax', 'Atlas'];
  const storageKey = 'skillsville-arrival-helper-v1';
  const dialog = document.getElementById('arrival-guide');
  const title = dialog.querySelector('h2');
  const content = dialog.querySelector('.guide-content');
  const reopen = document.getElementById('your-guide');
  const welcome = [
    'Hi! Welcome to the Skillsville test world. This 3D town will eventually be home to the learning activities for the proposed SkillQuest Endorsed Program.',
    'In the Skills Labs, you’ll learn about skills people use at work, play games and try out what you’ve learned. My Portfolio is where you’ll record experiences that show those skills in action.',
    'We’re also planning a Learner Log so you can record time spent on lab and portfolio activities and see your progress towards a proposed 55-hour target. You’ll be able to make your portfolio look the way you want and export a PDF to keep.',
    'For now, let’s visit the Communication Skills Lab. It’s an early version you can try today. I’ll meet you outside when you’re done.',
  ];
  const followUp = ['Ready to try a portfolio entry? I can take you to My Portfolio.'];
  let selected;
  try { selected = localStorage.getItem(storageKey); } catch {}
  if (!names.includes(selected)) selected = undefined;

  function action(label, run, parent = content) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    control.addEventListener('click', run);
    parent.append(control);
    return control;
  }

  function show(heading) {
    title.textContent = heading;
    content.replaceChildren();
    if (!dialog.open) dialog.showModal();
    title.focus();
  }

  function portrait(name) {
    const image = document.createElement('img');
    image.src = 'arrival-guide/helpers/' + name.toLowerCase() + '.png';
    image.alt = '';
    image.width = image.height = 128;
    return image;
  }

  function choose() {
    show('Choose your Skillsville helper');
    const choices = document.createElement('div');
    choices.className = 'guide-choices';
    content.append(choices);
    for (const name of names) {
      const control = action(name, () => {
        selected = name;
        try { localStorage.setItem(storageKey, name); } catch {}
        onSelect(selected);
        speak(false);
      }, choices);
      control.prepend(portrait(name));
    }
    action('Explore on my own', explore);
  }

  function speak(afterLab) {
    const lines = afterLab ? followUp : welcome;
    show(selected);
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      content.append(p);
    }
    if (afterLab) {
      action('Go to My Portfolio', () => {
        dialog.close('travel');
        onPortfolio();
      }).className = 'primary';
      action('Keep exploring', () => dialog.close());
    } else {
      action('Explore Skillsville', explore).className = 'primary';
      action('Change helper', choose);
    }
  }

  function explore() {
    dialog.close('walk');
    onExplore();
  }

  dialog.addEventListener('close', () => {
    if (!['travel','walk'].includes(dialog.returnValue)) onClose();
    dialog.returnValue = '';
  });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  reopen.hidden = false;
  reopen.onclick = () => selected ? speak(false) : choose();
  if (selected) onSelect(selected);
  else choose();
  return { offerPortfolio: () => { if (selected) speak(true); } };
};
