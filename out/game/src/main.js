// Boot and the one loop: input read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), then the scene
// and the HUD paint. Screens: title -> brief -> play -> paused / end.
//
// ?seed=N fixes the terrain feel. ?shot=chase|cockpit|approach|debrief stages
// that screenshot scene instead of running the loop and sets window.__shotReady.

import { STEP, MAX_FRAME } from './config.js';
import { MISSIONS } from './config.js';
import { createInput } from './input.js';
import { createWorld, advance as advanceWorld, startMission, setGroundProbe,
         SCREEN_TITLE, SCREEN_BRIEF, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_END } from './world.js';
import { createCamera, follow } from './camera.js';
import { createRenderer } from './render.js';
import { drawHUD } from './hud.js';
import { drawScreens } from './screens.js';
import { drawCockpit } from './cockpit.js';
import { groundHeight } from './terrain.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261126;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

const world = createWorld(seed, 0);
setGroundProbe(world, groundHeight);
const camera = createCamera();
const renderer = createRenderer(canvas);
const input = createInput(canvas);
let selectedMission = 0;
const MISSIONS_COUNT = MISSIONS.length;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function announce(text) {
  if (status) status.textContent = text;
}

function frame() {
  const w = canvas.width, h = canvas.height;
  renderer.draw(world, camera, w, h);
  if (world.screen === SCREEN_PLAY) {
    if (camera.view === 'cockpit') drawCockpit(ctx2d(), world.plane, w, h);
    drawHUD(ctx2d(), world, camera, w, h);
  }
  drawScreens(ctx2d(), world, w, h, selectedMission);
}

function ctx2d() { return canvas.getContext('2d'); }

function playStatus() {
  if (world.screen !== SCREEN_PLAY) return 'Skyward Patrol menu';
  const p = world.plane;
  return `flying: ${Math.round(p.alt)} m, ${Math.round(p.speed * 1.944)} knots, hull ${Math.round(100 - p.damage)} percent`;
}

function handleMenus() {
  if (world.screen === SCREEN_TITLE) {
    if (input.action('up')) selectedMission = (selectedMission + MISSIONS_COUNT - 1) % MISSIONS_COUNT;
    if (input.action('down')) selectedMission = (selectedMission + 1) % MISSIONS_COUNT;
    if (input.action('confirm')) world.screen = SCREEN_BRIEF;
  } else if (world.screen === SCREEN_BRIEF) {
    if (input.action('confirm')) startMission(world, selectedMission);
    if (input.take('Escape')) world.screen = SCREEN_TITLE;
  } else if (world.screen === SCREEN_PLAY) {
    if (input.action('pause')) world.screen = SCREEN_PAUSED;
    if (input.action('view')) camera.view = camera.view === 'chase' ? 'cockpit' : 'chase';
  } else if (world.screen === SCREEN_PAUSED) {
    if (input.action('pause')) world.screen = SCREEN_PLAY;
  } else if (world.screen === SCREEN_END) {
    if (input.action('confirm')) startMission(world, selectedMission);
    if (input.take('Escape')) world.screen = SCREEN_TITLE;
  }
}

function driftTitleCamera(dt) {
  // slow aerial drift behind the title card
  const drift = { x: world.plane?.x ?? 0, z: (world.plane?.z ?? -3000) - 12 * dt, alt: 520,
    heading: 0.3, pitch: 0, roll: 0, speed: 60, crashed: false, landed: false };
  world.plane = drift;
  follow(camera, drift, dt);
}

// screenshot mode: stage one deterministic scene, paint a few frames, no loop
const staged = shotName ? stageShot(world, camera, renderer, shotName) : false;
if (staged) {
  let painted = 0;
  const paint = () => {
    frame();
    painted += 1;
    if (painted >= 3) {
      window.__shotReady = true;
      try {
        const d = ctx2d().getImageData(0, 0, canvas.width, canvas.height).data;
        const hist = {};
        for (let i = 0; i < d.length; i += 1600) {
          const k = `${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`;
          hist[k] = (hist[k] || 0) + 1;
        }
        const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([k, n]) => `${k}:${n}`).join('  ');
        document.title = `DBG ${canvas.width}x${canvas.height} ${top}`;
      } catch (e) {
        document.title = 'DBGERR ' + e.message;
      }
    }
    else requestAnimationFrame(paint);
  };
  requestAnimationFrame(paint);
} else {
  let last = performance.now();
  let accumulator = 0;
  function loop(now) {
    const frameTime = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += frameTime;

    handleMenus();

    while (accumulator >= STEP) {
      if (world.screen === SCREEN_PLAY) advanceWorld(world, input, STEP);
      accumulator -= STEP;
    }

    if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED) follow(camera, world.plane, frameTime);
    else driftTitleCamera(frameTime);
    frame();
    announce(playStatus());
    input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
