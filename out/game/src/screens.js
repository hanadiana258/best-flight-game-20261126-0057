// Title, briefing, pause and end screens: the menus drawn over a slowly
// drifting aerial view, with mission selection and the sortie debrief.

import { MISSIONS } from './config.js';
import { SCREEN_TITLE, SCREEN_BRIEF, SCREEN_PAUSED, SCREEN_END } from './world.js';

const INK = 'rgba(10,14,22,0.72)';
const CREAM = '#f2ede2';
const ACCENT = '#ffb347';

export function drawScreens(ctx, world, w, h, selectedMission) {
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, w, h, selectedMission);
  else if (world.screen === SCREEN_BRIEF) drawBrief(ctx, world, w, h, selectedMission);
  else if (world.screen === SCREEN_PAUSED) drawPause(ctx, w, h);
  else if (world.screen === SCREEN_END) drawEnd(ctx, world, w, h);
}

function card(ctx, w, h, title, sub) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, w / 2, h * 0.24);
  if (sub) {
    ctx.font = '15px monospace';
    ctx.fillStyle = 'rgba(230,238,246,0.85)';
    ctx.fillText(sub, w / 2, h * 0.30);
  }
}

function drawTitle(ctx, world, w, h, selected) {
  card(ctx, w, h, 'SKYWARD PATROL', 'an original flight game — choose your sortie');
  ctx.font = '18px monospace';
  MISSIONS.forEach((mission, i) => {
    const y = h * 0.42 + i * 44;
    const on = i === selected;
    if (on) {
      ctx.fillStyle = 'rgba(255,179,71,0.18)';
      ctx.fillRect(w / 2 - 240, y - 20, 480, 34);
    }
    ctx.fillStyle = on ? ACCENT : 'rgba(230,238,246,0.85)';
    ctx.fillText(`${on ? '▶ ' : '  '}${i + 1}. ${mission.name}  (${mission.rings.length} rings)`, w / 2, y - 2);
  });
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(200,212,224,0.75)';
  ctx.fillText('↑/↓ pick   Enter brief   — fly with arrows, W/S, throttle Shift/Ctrl, C camera, P pause', w / 2, h * 0.72);
}

function drawBrief(ctx, world, w, h, selected) {
  const mission = MISSIONS[selected];
  card(ctx, w, h, mission.name.toUpperCase(), mission.brief);
  ctx.font = '14px monospace';
  ctx.fillStyle = CREAM;
  const lines = [
    'CONTROLS',
    '  Arrow Up/Down or W/S .... elevator (pitch)',
    '  Arrow Left/Right or A/D . ailerons (bank turns)',
    '  Q / E ................... rudder',
    '  Shift / Ctrl ............ throttle up / down',
    '  C ....................... chase / cockpit view',
    '',
    'Survive the rings, keep fuel and hull up, land on runway 36',
    'into the wind: slow, shallow, wings level.',
  ];
  lines.forEach((line, i) => {
    ctx.textAlign = line === 'CONTROLS' ? 'center' : 'left';
    const x = line === 'CONTROLS' ? w / 2 : w / 2 - 230;
    ctx.fillStyle = line === 'CONTROLS' ? ACCENT : CREAM;
    ctx.fillText(line, x, h * 0.40 + i * 22);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.fillText('Enter — take off', w / 2, h * 0.86);
}

function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(8,10,16,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.font = '13px monospace';
  ctx.fillText('P — resume', w / 2, h / 2 + 22);
}

function drawEnd(ctx, world, w, h) {
  const r = world.result;
  card(ctx, w, h, r.won ? 'SORTIE COMPLETE' : 'SORTIE FAILED', r.won ? 'safely back on the tarmac' : r.reason);
  ctx.font = '16px monospace';
  const rows = [
    `Rings threaded   ${r.rings} / ${r.totalRings}`,
    `Ring score       ${r.score - r.fuelBonus - r.landBonus}`,
    `Fuel bonus       ${r.fuelBonus}`,
    `Landing bonus    ${r.landBonus}`,
    `Flight time      ${Math.floor(r.elapsed / 60)}m ${r.elapsed % 60}s`,
  ];
  ctx.textAlign = 'left';
  rows.forEach((row, i) => {
    ctx.fillStyle = i === 0 ? CREAM : 'rgba(230,238,246,0.8)';
    ctx.fillText(row, w / 2 - 130, h * 0.40 + i * 26);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`SCORE  ${r.score}`, w / 2, h * 0.68);
  ctx.font = '13px monospace';
  ctx.fillStyle = CREAM;
  ctx.fillText('Enter — fly again   Esc — hangar', w / 2, h * 0.78);
}
