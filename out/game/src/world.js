// The sortie: mission state around the aircraft. Rings to thread, the timer,
// score, and which messages the HUD should be shouting right now.

import { MISSIONS, RING_SCORE, LANDING_BONUS, FUEL_BONUS_UNIT, TIME_LIMIT } from './config.js';
import { createAircraft, advance as advancePlane, EVENT_LANDED, EVENT_CRASH, EVENT_RING } from './aircraft.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_BRIEF = 'brief';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_END = 'end';

export function createWorld(seed, missionIndex = 0) {
  const mission = MISSIONS[missionIndex % MISSIONS.length];
  return {
    seed, missionIndex, mission,
    screen: SCREEN_TITLE,
    plane: createAircraft({ x: 0, z: 0, alt: 300, speed: 55, heading: 0 }),
    rings: [], ringIndex: 0,
    score: 0, time: TIME_LIMIT, elapsed: 0,
    messages: [], // {text, until}
    result: null, // {won, reason, score, stats}
    shake: 0,
  };
}

/** Begin a sortie: reset the plane at the mission start and arm the rings. */
export function startMission(world, missionIndex) {
  world.missionIndex = missionIndex;
  world.mission = MISSIONS[missionIndex % MISSIONS.length];
  world.plane = createAircraft({ x: -900, z: -2200, alt: 320, speed: 55, heading: 0 });
  world.rings = world.mission.rings.map((r) => ({ ...r, passed: false }));
  world.ringIndex = 0;
  world.score = 0;
  world.time = TIME_LIMIT;
  world.elapsed = 0;
  world.result = null;
  world.shake = 0;
  world.messages = [];
  world.screen = SCREEN_PLAY;
  say(world, `${world.mission.name}: fly through ${world.rings.length} rings, then land`, 5);
}

/** One fixed simulation step while playing. */
export function advance(world, input, dt) {
  if (world.screen !== SCREEN_PLAY) return;
  const events = [];
  advancePlane(world.plane, input, dt, events);

  world.elapsed += dt;
  world.time = Math.max(0, TIME_LIMIT - world.elapsed);
  world.shake = Math.max(0, world.shake - dt * 3);

  // rings
  const ring = world.rings[world.ringIndex];
  if (ring) {
    const dx = world.plane.x - ring.x, dz = world.plane.z - ring.z;
    const dAlt = world.plane.alt - ring.alt;
    if (Math.sqrt(dx * dx + dz * dz) < ring.r && Math.abs(dAlt) < ring.r * 0.8) {
      ring.passed = true;
      world.ringIndex += 1;
      world.score += RING_SCORE + Math.round(world.plane.fuel / 2);
      world.shake = 0.4;
      events.push({ type: EVENT_RING, index: world.ringIndex });
      say(world, world.ringIndex < world.rings.length
        ? `Ring ${world.ringIndex} of ${world.rings.length} — ${RING_SCORE} pts`
        : 'All rings cleared — return and land on runway 36', 4);
    }
  }

  for (const event of events) {
    if (event.type === EVENT_LANDED) finish(world, world.ringIndex >= world.rings.length, 'landed');
    if (event.type === EVENT_CRASH) finish(world, false, event.cause);
  }

  if (world.plane.fuel <= 0 && world.plane.speed < 25 && world.plane.alt - groundAt(world) < 400) {
    finish(world, false, 'ran out of fuel');
  }
  if (world.time <= 0) finish(world, false, 'out of time');
}

function groundAt(world) {
  // lazy import avoidance: terrain is small, read via world cache
  return world.groundProbe ? world.groundProbe(world.plane.x, world.plane.z) : 0;
}

/** Wire the terrain probe in once at boot so the world never imports terrain.js. */
export function setGroundProbe(world, fn) {
  world.groundProbe = fn;
}

function finish(world, won, reason) {
  if (world.result) return;
  const fuelBonus = won ? Math.round(world.plane.fuel * FUEL_BONUS_UNIT) : 0;
  const landBonus = won ? LANDING_BONUS : 0;
  world.result = {
    won, reason,
    score: world.score + fuelBonus + landBonus,
    fuelBonus, landBonus,
    rings: world.ringIndex, totalRings: world.rings.length,
    elapsed: Math.round(world.elapsed),
  };
  world.screen = SCREEN_END;
}

export function say(world, text, seconds) {
  world.messages = world.messages.filter((m) => m.until > world.elapsed);
  world.messages.push({ text, until: world.elapsed + seconds });
}

/** The message line the HUD draws, newest first. */
export function currentMessage(world) {
  for (let i = world.messages.length - 1; i >= 0; i--) {
    if (world.messages[i].until > world.elapsed) return world.messages[i].text;
  }
  return null;
}

/** Direction and distance to the current objective, for the HUD arrow. */
export function objective(world) {
  const ring = world.rings[world.ringIndex];
  if (ring) return { x: ring.x, z: ring.z, alt: ring.alt, label: 'RING', r: ring.r };
  const rw = { x: 0, z: 640, alt: 14 };
  return { ...rw, label: 'RUNWAY', r: 80 };
}
