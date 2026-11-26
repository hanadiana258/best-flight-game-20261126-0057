// The aircraft: state, flight model, ground contact. One advance(step, input)
// integrates throttle, pitch, bank turns, lift, fuel and damage, and resolves
// the two ways a sortie ends on the ground: a landing or a crash.

import {
  GRAVITY, THROTTLE_RATE, PITCH_RATE, ROLL_RATE, YAW_RATE, PITCH_LIMIT,
  SPEED_MIN, SPEED_MAX, SPEED_THRUST, DRAG, LIFT_PITCH, FUEL_FULL, FUEL_BURN,
  DAMAGE_MAX, CEILING, STEP,
} from './config.js';
import { groundHeight, isWater } from './terrain.js';

export const EVENT_LANDED = 'landed';
export const EVENT_CRASH = 'crash';
export const EVENT_RING = 'ring';

/** Heading angle in radians, wrapped to [0, 2PI). */
function wrap(a) { a %= Math.PI * 2; return a < 0 ? a + Math.PI * 2 : a; }

export function createAircraft(start) {
  return {
    x: start.x, z: start.z, alt: start.alt,
    heading: start.heading, pitch: 0, roll: 0,
    speed: start.speed, vspeed: 0,
    throttle: 0.65,
    fuel: FUEL_FULL, damage: 0,
    engineCeilingFade: 1,
    onGround: false, crashed: false, landed: false,
    stall: false, overspeed: false,
    gearUp: false, // gear is down on the ground and on takeoff runs
  };
}

/**
 * Integrate one fixed step. `events` collects {type, ...} this step produced.
 * Controls: axis pitch/roll/yaw in [-1, 1], throttleDir -1|0|1.
 */
export function advance(plane, input, dt = STEP, events = []) {
  if (plane.crashed || plane.landed) return;

  // --- controls ---
  plane.throttle = Math.min(1, Math.max(0, plane.throttle + input.throttle(1) * THROTTLE_RATE * dt - input.throttle(-1) * THROTTLE_RATE * dt));
  const authority = clamp(plane.speed / 40, 0.25, 1.4); // dead controls when slow
  const elev = clamp(input.axis('pitch'), -1, 1);
  const ail = clamp(input.axis('roll'), -1, 1);
  const rud = clamp(input.axis('yaw'), -1, 1);
  plane.pitch = clamp(plane.pitch - elev * PITCH_RATE * authority * dt, -PITCH_LIMIT, PITCH_LIMIT);
  plane.roll += ail * ROLL_RATE * authority * dt;
  plane.roll = clamp(plane.roll, -Math.PI, Math.PI);
  plane.roll *= Math.pow(0.25, dt); // wings level themselves slowly
  plane.heading = wrap(plane.heading + rud * YAW_RATE * dt - Math.sin(plane.roll) * 0.55 * authority * dt);

  // --- engine and speed ---
  plane.engineCeilingFade = clamp(1 - Math.max(0, plane.alt - CEILING) / 800, 0.25, 1);
  let thrust = plane.throttle * (plane.fuel > 0 ? 1 : 0.15) * plane.engineCeilingFade;
  const target = SPEED_THRUST * thrust + 8;
  plane.speed += ((target - plane.speed) * DRAG - GRAVITY * Math.sin(plane.pitch) * 0.35) * dt;
  plane.speed = Math.max(0, plane.speed);

  // --- lift and climb ---
  plane.stall = plane.speed < SPEED_MIN && !plane.onGround;
  const lift = clamp(plane.speed / 40, 0, 1.6) * Math.cos(plane.roll * 1.2);
  const climb = Math.sin(plane.pitch) * LIFT_PITCH * lift - GRAVITY * (1 - lift * 0.9);
  plane.vspeed = plane.vspeed * 0.5 + climb * 0.5;

  // --- move ---
  plane.x += Math.sin(plane.heading) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;
  plane.alt += plane.vspeed * dt;

  // --- fuel and damage ---
  plane.fuel = Math.max(0, plane.fuel - FUEL_BURN * (0.35 + plane.throttle) * dt);
  plane.overspeed = plane.speed > SPEED_MAX;
  if (plane.overspeed) plane.damage += 6 * dt;
  if (plane.stall && plane.alt - groundHeight(plane.x, plane.z) < 60) plane.damage += 4 * dt;
  if (plane.damage >= DAMAGE_MAX) crash(plane, 'structural failure', events);

  // --- ground contact ---
  const ground = groundHeight(plane.x, plane.z);
  const height = plane.alt - ground;
  if (height <= 2) {
    const sink = -plane.vspeed;
    const slope = groundSlope(plane.x, plane.z);
    const flat = isWater(plane.x, plane.z);
    const overRunway = onRunway(plane.x, plane.z);
    if (flat || sink > 10 || Math.abs(plane.roll) > 0.5 || plane.speed > SPEED_MAX) {
      crash(plane, flat ? 'ditched in the sea' : 'hit the ground hard', events);
      plane.alt = ground + 2;
      return;
    }
    if (overRunway && sink < 4.5 && Math.abs(plane.pitch) < 0.25 && plane.speed < 75) {
      // wheels on tarmac: roll out
      plane.onGround = true;
      plane.alt = ground + 2;
      plane.vspeed = 0;
      plane.pitch *= 0.5;
      plane.roll *= 0.5;
      plane.speed = Math.max(0, plane.speed - 14 * dt - plane.throttle * 0);
      if (plane.speed < 2) {
        plane.landed = true;
        events.push({ type: EVENT_LANDED });
      }
      return;
    }
    if (!overRunway) {
      crash(plane, 'belly landing off the field', events);
      plane.alt = ground + 2;
      return;
    }
    // too fast / too steep on the runway: bounce, take damage
    plane.damage += sink * 4;
    plane.vspeed = Math.abs(sink) * 0.4 + 3;
    if (plane.damage >= DAMAGE_MAX) crash(plane, 'wrecked on touchdown', events);
  } else {
    plane.onGround = false;
  }
}

function groundSlope(x, z) {
  const d = 8;
  const h = groundHeight(x, z);
  return Math.max(Math.abs(groundHeight(x + d, z) - h), Math.abs(groundHeight(x, z + d) - h)) / d;
}

export function onRunway(x, z) {
  const rw = { x: 0, z: 0, len: 640, width: 46 };
  return Math.abs(x - rw.x) < rw.width / 2 + 8 && Math.abs(z - rw.z) < rw.len / 2 + 8;
}

export function crash(plane, cause, events) {
  if (plane.crashed) return;
  plane.crashed = true;
  events.push({ type: EVENT_CRASH, cause });
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
