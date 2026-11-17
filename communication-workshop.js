/* Discover · Communication Skills Lab */
const communicationIntroTranscript = [
  "I communicate all day, every day. Why do I need to learn about it?",
  "Because even an ordinary conversation can go wrong. At work, people might hear different things, miss an instruction or feel unsure about what to do next.",
  "Your order won't be ready today. I know you came in to collect it. I can arrange delivery tomorrow. Would that work for you?",
  "I can see you're restocking. Could you help me clear the entrance first? We open in five minutes. Then I can help you finish.",
  "You stayed calm when the customer changed their order. Want to practise putting the change through together?",
  "Think about your purpose, the person and the situation. Choose clear words and a tone that fits. Listen to the response, check what they understood and adjust if needed.",
  "Look closely at the next workplace scene. What might stop the message from getting through?"
];

const handoverChecks = [
  {
    skill: 'Active listening',
    prompt: 'Your coworker starts explaining while you are packing. What do you do first?',
    choices: ['Keep packing and guess what they need.', 'Pause, give them your attention and let them finish.'],
    correct: 1,
    hint: 'What would give them space to tell you the whole story?',
    feedback: 'Giving them your attention helps you hear the change before you act.'
  },
  {
    skill: 'Paraphrasing',
    prompt: '“The customer changed their order after I’d packed two bags.” How could you check that you followed?',
    choices: ['“So the two bags were already packed when the order changed?”', '“You packed the wrong bags again?”'],
    correct: 0,
    hint: 'Say back what you heard in your own words. Leave room for them to correct you.',
    feedback: 'You checked the sequence without assuming who made a mistake.'
  },
  {
    skill: 'Open questions',
    prompt: 'You need the full story about the change. What do you ask?',
    choices: ['“Was it the drink?”', '“What did the customer ask us to change?”'],
    correct: 1,
    hint: 'Choose a question that invites more than a yes or no.',
    feedback: 'Your coworker can explain all the changes in their own words.'
  },
  {
    skill: 'Clarifying questions',
    prompt: '“Put the replacement in the second bag.” There are two bags side by side.',
    choices: ['“When you say the second bag, do you mean the one with the blue label?”', '“Sure, I’ll pick one.”'],
    correct: 0,
    hint: 'Ask about the detail that could mean different things to each of you.',
    feedback: 'The blue label gives both of you a specific bag to check.'
  },
  {
    skill: 'Closed questions',
    prompt: 'You only need to confirm the collection time. What do you ask?',
    choices: ['“How has the whole afternoon been?”', '“Is the customer still collecting at four?”'],
    correct: 1,
    hint: 'Use a focused question for the one detail you need.',
    feedback: 'A short answer is enough when you’re confirming a single detail.'
  },
  {
    skill: 'Restating the desired outcome',
    prompt: 'Your coworker confirms collection at four. Agree on what needs to happen.',
    choices: ['“Before four, both bags need to match the updated order. I’ll check the contents. Can you update the labels?”', '“Let’s deal with it soon.”'],
    correct: 0,
    hint: 'Name what success looks like, when it needs to happen and who will do what.',
    feedback: 'You agreed on the result, the deadline and each person’s next action.'
  }
];

function communicationWorkshop(parent, {add, button, startRelay}) {
  const root = add('section', '', parent);
  root.className = 'communication-workshop';
  root.setAttribute('aria-label', 'Workplace communication mini-workshop');
  const steps = ['Intro', 'Café', 'Stockroom', 'Perspective', 'Handover'];
  let stage = 0;
  let handoverStep = 0;
  let furthestStage = 0;
  const nav = add('nav', '', root);
  nav.setAttribute('aria-label', 'Workshop steps');
  const body = add('div', '', root);

  function heading(title) {
    const titleNode = add('h3', title, body);
    titleNode.tabIndex = -1;
    return titleNode;
  }

  function next(label, action) {
    const control = button(label, action, body);
    control.className = 'primary workshop-next';
    return control;
  }

  function answerGroup(parent, choices, label) {
    parent.setAttribute('role', 'group');
    parent.setAttribute('aria-label', label);
    const buttons = [];
    const status = document.createElement('p');
    status.className = 'workshop-feedback';
    status.setAttribute('role', 'status');
    for (const choice of choices) {
      const control = button(choice.text, () => {
        if (status.classList.contains('workshop-success')) return;
        status.textContent = choice.correct ? choice.feedback : 'Try again. ' + choice.hint;
        status.classList.toggle('workshop-success', choice.correct);
        if (choice.correct) {
          choice.advance.hidden = false;
          for (const option of buttons) option.setAttribute('aria-disabled', 'true');
          control.classList.add('workshop-correct');
        }
      }, parent);
      buttons.push(control);
    }
    parent.after(status);
  }

  function picture(title, prompt, scene, items, nextLabel) {
    heading(title);
    add('p', prompt, body);
    const picture = add('div', '', body);
    picture.className = 'workshop-picture workshop-' + scene;
    const advance = next(nextLabel, () => show(stage + 1));
    advance.hidden = true;
    answerGroup(picture, items.map(item => ({...item, advance})), title);
  }

  function intro() {
    heading('Communication? I do that all day.');
    const video = add('video', '', body);
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', 'Workplace communication introduction');
    const transcript = add('details', '', body);
    add('summary', 'Read the video transcript', transcript);
    for (const line of communicationIntroTranscript) add('p', line, transcript);
    const videoStatus = add('p', '', body);
    videoStatus.setAttribute('role', 'status');
    video.addEventListener('error', () => {
      videoStatus.textContent = 'The video could not load. You can read the transcript and continue.';
    });
    video.src = 'communication-intro.mp4?v=caption-fit';
    next('Start picture checks', () => show(1));
  }

  function perspective() {
    heading('What can they each see?');
    add('p', 'Two coworkers stand on opposite sides of the same mark. Switch sides to see what each person sees.', body);
    const picture = add('div', '', body);
    picture.className = 'workshop-perspective';
    const mark = add('span', '6', picture);
    mark.className = 'workshop-mark';
    mark.setAttribute('aria-hidden', 'true');
    const viewpoint = add('p', 'From Alex’s side, it looks like a 6.', body);
    viewpoint.setAttribute('role', 'status');
    let otherSide = false;
    let seenBoth = false;
    const toggle = button('View from Sam’s side', () => {
      otherSide = !otherSide;
      seenBoth ||= otherSide;
      question.hidden = !seenBoth;
      question.nextElementSibling.hidden = !seenBoth;
      mark.classList.toggle('other-side', otherSide);
      viewpoint.textContent = otherSide ? 'From Sam’s side, it looks like a 9.' : 'From Alex’s side, it looks like a 6.';
      toggle.textContent = otherSide ? 'View from Alex’s side' : 'View from Sam’s side';
    }, body);
    const question = add('div', '', body);
    question.className = 'stack';
    question.hidden = true;
    add('p', 'At work, Alex and Sam face each other. Alex says “the left shelf”. What would help both find it?', question);
    const advance = next('Practise the handover', () => show(4));
    advance.hidden = true;
    answerGroup(question, [
      {text: '“The shelf with the blue label beside the door.”', correct: true, feedback: 'Both people can be right from where they stand. You chose a landmark they can share.', advance},
      {text: '“It’s on my left. Just look again.”', correct: false, hint: 'What could they both recognise from either side?', advance}
    ], 'Choose a shared landmark');
    question.nextElementSibling.hidden = true;
  }

  function handover() {
    const check = handoverChecks[handoverStep];
    if (!check) {
      heading('Handover complete');
      const message = add('p', 'You listened, checked the details and agreed on what needed to happen next.', body);
      message.className = 'workshop-feedback workshop-success';
      button('Try Kai’s optional radio challenge', startRelay, body);
      return;
    }
    heading(check.skill + ' · ' + (handoverStep + 1) + ' of ' + handoverChecks.length);
    add('p', check.prompt, body);
    const options = add('div', '', body);
    options.className = 'stack';
    const advance = next(handoverStep === handoverChecks.length - 1 ? 'Finish handover' : 'Next handover step', () => {
      handoverStep += 1;
      render(true);
    });
    advance.hidden = true;
    answerGroup(options, check.choices.map((choice, index) => ({
      text: choice, correct: index === check.correct, hint: check.hint, feedback: check.feedback, advance
    })), check.skill);
  }

  function show(index) {
    stage = index;
    furthestStage = Math.max(furthestStage, index);
    render(true);
  }

  function render(focus) {
    nav.replaceChildren();
    body.replaceChildren();
    for (const [index, label] of steps.entries()) {
      const control = button(label, () => show(index), nav);
      control.disabled = index > furthestStage;
      if (index === stage) control.setAttribute('aria-current', 'step');
    }
    if (stage === 0) intro();
    if (stage === 1) picture('The noisy café', 'The supervisor calls out an instruction while a new worker runs the blender. Click something that makes the message hard to hear.', 'cafe', [
      {text: 'Speaking across the café', correct: true, feedback: 'You spotted the distance. Move closer and check the worker can hear.'},
      {text: 'Blender running', correct: true, feedback: 'You spotted the noise. Wait for the blender to stop before giving the instruction.'},
      {text: 'Cup on the counter', correct: false, hint: 'Imagine you’re the worker. What else can you hear?'}
    ], 'Next picture');
    if (stage === 2) picture('The vague stockroom message', 'A team message says “Put those away before close.” Click two words or an object you’d ask about before starting.', 'stockroom', [
      {text: '“Those” and “away”', correct: true, feedback: 'Those words leave out the boxes and destination. Ask “Which boxes, and where should they go?”'},
      {text: 'Two sets of boxes', correct: true, feedback: 'Both sets could fit the message. Ask which boxes they mean.'},
      {text: 'Clock on the wall', correct: false, hint: 'The deadline is before closing. What is unclear about the job itself?'}
    ], 'Try the perspective activity');
    if (stage === 3) perspective();
    if (stage === 4) handover();
    if (focus) body.querySelector('h3').focus();
  }

  render(false);
}
