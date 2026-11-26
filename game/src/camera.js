// The camera: a chase view that lags gently behind the plane and a cockpit
// view locked to the nose, plus the shared view/projection math the renderer
// and the HUD use.

import { CHASE_BACK, CHASE_UP, CAMERA_LERP } from './config.js';

export const VIEW_CHASE = 'chase';
export const VIEW_COCKPIT = 'cockpit';

export function createCamera() {
  return {
    view: VIEW_CHASE,
    x: 0, y: 0, z: 0,      // eye position, smoothed
    yaw: 0, pitch: -0.08,  // eye angles, smoothed
  };
}

/** Follow the plane for this frame; `dt` drives the smoothing. */
export function follow(camera, plane, dt) {
  const sinH = Math.sin(plane.heading), cosH = Math.cos(plane.heading);
  const behind = CHASE_BACK * Math.cos(plane.pitch);
  if (camera.view === VIEW_CHASE) {
    const targetX = plane.x - sinH * behind - cosH * plane.roll * 3;
    const targetZ = plane.z - cosH * behind + sinH * plane.roll * 3;
    const targetY = plane.alt + CHASE_UP;
    const k = Math.min(1, CAMERA_LERP * dt);
    camera.x += (targetX - camera.x) * k;
    camera.y += (targetY - camera.y) * k;
    camera.z += (targetZ - camera.z) * k;
    camera.yaw = lerpAngle(camera.yaw, plane.heading, k * 1.4);
    camera.pitch = lerp(camera.pitch, -plane.pitch * 0.35 - 0.06, k * 1.4);
  } else {
    // cockpit: the eye sits in the canopy, looking where the nose points
    camera.x = plane.x + sinH * 2.2 - cosH * 0;
    camera.z = plane.z + cosH * 2.2;
    camera.y = plane.alt + 1.4;
    camera.yaw = plane.heading + Math.sin(plane.roll) * 0.25;
    camera.pitch = -plane.pitch * 0.8 - 0.05;
  }
}

/** Snap immediately (used when a sortie starts). */
export function snap(camera, plane) {
  camera.x = plane.x - Math.sin(plane.heading) * CHASE_BACK;
  camera.y = plane.alt + CHASE_UP;
  camera.z = plane.z - Math.cos(plane.heading) * CHASE_BACK;
  camera.yaw = plane.heading;
  camera.pitch = -0.06;
}

/**
 * World -> camera space, then perspective. Returns null when the point is
 * behind the eye. Units: world metres, focal length in pixels.
 */
export function project(camera, w, h, focal, x, y, z, clampNear = false) {
  const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const sinY = Math.sin(camera.yaw), cosY = Math.cos(camera.yaw);
  // forward is +yaw: rotate world into view
  const vz = dx * sinY + dz * cosY;          // depth ahead
  const vx = dx * cosY - dz * sinY;          // right
  const sinP = Math.sin(camera.pitch), cosP = Math.cos(camera.pitch);
  const cy = dy * cosP - vz * sinP;          // up after pitch
  const cz = dy * sinP + vz * cosP;          // depth after pitch
  if (cz <= 1) return null;
  const scale = focal / cz;
  return { x: w / 2 + vx * scale, y: h / 2 - cy * scale, depth: cz, scale };
}

/**
 * World-space polygon -> screen polygon, clipped against the near plane
 * (cz >= 1) with Sutherland-Hodgman, so ground under the eye never vanishes.
 * Returns an array of screen points (possibly empty).
 */
export function projectPoly(camera, w, h, focal, pts) {
  const sinY = Math.sin(camera.yaw), cosY = Math.cos(camera.yaw);
  const sinP = Math.sin(camera.pitch), cosP = Math.cos(camera.pitch);
  const view = pts.map(([x, y, z]) => {
    const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
    const vz = dx * sinY + dz * cosY;
    const vx = dx * cosY - dz * sinY;
    return [vx, dy * cosP - vz * sinP, dy * sinP + vz * cosP];
  });
  const NEAR = 1;
  const out = [];
  for (let i = 0; i < view.length; i++) {
    const a = view[i], b = view[(i + 1) % view.length];
    const aIn = a[2] >= NEAR, bIn = b[2] >= NEAR;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  if (out.length < 3) return [];
  return out.map(([vx, cy, cz]) => {
    const scale = focal / cz;
    return { x: w / 2 + vx * scale, y: h / 2 - cy * scale, depth: cz, scale };
  });
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
