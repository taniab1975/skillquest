'use strict';

window.createSkillsvilleMap = function (places, coast, hasDock) {
  const panel = document.getElementById('route-map');
  const toggle = document.getElementById('map-toggle');
  const canvas = panel.querySelector('canvas');
  const instruction = panel.querySelector('p');
  const ctx = canvas.getContext('2d');
  const width = 264, height = 244;
  const point = (x,z) => [132+x*4.55,103+z*3.95];
  const [,labX,labZ] = places[2];
  const [,portfolioX,portfolioZ] = places[1];
  const labTurn = labZ+4.4;
  const labStops = [[0,labTurn],[labX,labTurn],[labX,labZ+4.15]];
  let origin = [0,hasDock ? 29 : 19];
  let stops = labStops;
  let destination = 2;
  let active = false;
  let leg = 0;
  let routeDone = false;

  function toggleMap(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.hidden = false;
  toggle.onclick = () => toggleMap(panel.hidden);
  function update(avatar) {
    if (active && leg < stops.length-1 && Math.hypot(stops[leg][0]-avatar.x,stops[leg][1]-avatar.z)<.85) leg++;
    if (panel.hidden) return;
    const name = places[destination][0];
    const current = active
      ? leg === stops.length-1 ? 'Walk straight through the doorway to '+name+'.'
        : destination === 2 && leg === 0 ? 'Walk north off South Dock.'
        : 'Follow the arrows to '+name+'.'
      : routeDone ? name : 'South Dock and the Skillsville campus';
    if (instruction.textContent !== current) instruction.textContent = current;
    ctx.setTransform(2,0,0,2,0,0);
    ctx.fillStyle = '#173c50';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle = '#40655b';
    ctx.beginPath();
    if (coast) {
      coast.forEach(([x,z],index) => index ? ctx.lineTo(...point(x,z)) : ctx.moveTo(...point(x,z)));
    } else {
      ctx.ellipse(132,103,85,82,0,0,Math.PI*2);
    }
    ctx.closePath();
    ctx.fill();
    if (hasDock) {
      const [x,y] = point(0,21);
      ctx.fillStyle = '#aa7e56';
      ctx.fillRect(x-8,y,16,40);
    }
    ctx.font = '600 11px system-ui';
    ctx.fillStyle = '#e1f9ef';
    ctx.fillText('↑ N',14,22);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = active ? '#b8ff91' : '#9bbda8';
    ctx.beginPath();
    [origin,...stops].forEach(([x,z],index) => index ? ctx.lineTo(...point(x,z)) : ctx.moveTo(...point(x,z)));
    ctx.stroke();
    function label(text,x,z,color,dx=8,dy=-5) {
      const [left,top] = point(x,z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(left,top,3,0,2*Math.PI);
      ctx.fill();
      ctx.fillText(text,left+dx,top+dy);
    }
    label('Discovery Plaza',0,0,'#ecf6ef');
    label('My Portfolio',portfolioX,portfolioZ,destination === 1 ? '#b8ff91' : '#ffd99c');
    label('Communication Lab',labX,labZ,destination === 2 ? '#b8ff91' : '#ecf6ef',-72,-8);
    if (hasDock) label('South Dock',0,27,'#ecf6ef',-70,8);
    label('You',avatar.x,avatar.z,'#fff',8,12);
  }

  return {
    update,
    start(index, avatar) {
      origin = [avatar.x,avatar.z];
      destination = index;
      stops = index === 1
        ? [[0,Math.round(labTurn)],[0,4],[3,4],[3,-10],[portfolioX,-10],[portfolioX,portfolioZ+3.5],[portfolioX,portfolioZ+2.25]]
        : labStops;
      active = true;
      routeDone = false;
      leg = 0;
      toggleMap(true);
    },
    finish(index) {
      if (index !== destination) return;
      active = false;
      routeDone = true;
    },
    next() { return active ? stops[leg] : null; },
  };
};
