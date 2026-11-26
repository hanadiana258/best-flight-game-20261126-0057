// Screenshot staging: ?shot=<name>&seed=N renders a deterministic scene of the
// game itself (title, chase, cockpit, approach) and sets window.__shotReady so
// a headless browser knows when to grab the frame.

import { MISSIONS } from './config.js';
import { createAircraft } from './aircraft.js';
import { startMission, SCREEN_TITLE, SCREEN_END } from './world.js';
import { snap as snapCamera } from './camera.js';

const SHOTS = {
  // the cover: chase view over the coast, first ring ahead, HUD lit
  chase(world, camera, renderer) {
    world.screen = 'play';
    startMission(world, 0);
    world.plane = Object.assign(world.plane, { x: -620, z: -1080, alt: 268, speed: 58, heading: 0.5, pitch: 0.02, roll: 0.12, throttle: 0.7 });
    world.ringIndex = 0;
    snapCamera(camera, world.plane);
    camera.view = 'chase';
    camera.x += 4; // settle the framing
  },
  // cockpit close-up: instruments and glass, terrain sliding past
  cockpit(world, camera, renderer) {
    world.screen = 'play';
    startMission(world, 1);
    world.plane = Object.assign(world.plane, { x: 60, z: -520, alt: 210, speed: 62, heading: 0.2, pitch: 0.04, roll: -0.18, throttle: 0.75 });
    world.ringIndex = 1;
    snapCamera(camera, world.plane);
    camera.view = 'cockpit';
  },
  // final approach: runway dead ahead, gear down, low over the threshold
  approach(world, camera, renderer) {
    world.screen = 'play';
    startMission(world, 0);
    world.plane = Object.assign(world.plane, {
      x: 0, z: -1500, alt: 60, speed: 42, heading: 0, pitch: -0.03, roll: 0,
      throttle: 0.35, gearUp: false,
    });
    world.ringIndex = world.rings.length; // all rings cleared: the HUD points at the runway
    snapCamera(camera, world.plane);
    camera.view = 'chase';
    camera.pitch = -0.02;
  },
  // the debrief after a won sortie
  debrief(world, camera, renderer) {
    world.screen = 'play';
    startMission(world, 0);
    world.ringIndex = world.rings.length;
    world.plane = Object.assign(world.plane, { x: 0, z: 60, alt: 16, speed: 0.5, onGround: true, throttle: 0 });
    world.result = {
      won: true, reason: 'landed', score: 5230,
      fuelBonus: 312, landBonus: 800, rings: 6, totalRings: 6, elapsed: 214,
    };
    world.screen = SCREEN_END;
  },
};

export function stageShot(world, camera, renderer, name) {
  const fn = SHOTS[name];
  if (!fn) return false;
  fn(world, camera, renderer);
  return true;
}

export const SHOT_NAMES = Object.keys(SHOTS);
export { SCREEN_TITLE };
