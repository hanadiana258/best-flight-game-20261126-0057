// The scene renderer: sky, sea and terrain drawn back-to-front as shaded
// quads, then the runway, mission rings, clouds and the aircraft. A painter's
// algorithm over a projected heightfield grid — no WebGL, one 2D canvas.

import { CELL, VIEW_CELLS, RUNWAY, SPEED_MAX, CEILING } from './config.js';
import { groundHeight } from './terrain.js';
import { project, projectPoly } from './camera.js';
import { MODEL, toWorld } from './aircraft-model.js';

const FOCAL = 0.95;              // focal length as a fraction of canvas height
const FOG_START = 2400, FOG_END = 6400;
const SKY_TOP = [72, 126, 200], SKY_HORIZON = [182, 208, 230];
const FOG = [172, 196, 216];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, draw: (world, camera, w, h) => drawScene(ctx, world, camera, w, h) };
}

function fogT(depth) { return Math.min(1, Math.max(0, (depth - FOG_START) / (FOG_END - FOG_START))); }

function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rgb(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

/** Cheap deterministic tint: flat ground reads as textured ground, not paper. */
function cellTint(wx, wz) {
  let n = (Math.imul(wx | 0, 374761393) + Math.imul(wz | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) | 0;
  return ((n >>> 16) & 255) / 255 - 0.5; // -0.5 .. 0.5
}

/** Terrain colour by height and slope, then fogged toward the horizon haze. */
function terrainColour(h, depth, slope, wx, wz) {
  let c;
  if (h < 0.5) c = [36, 82, 128];                                  // sea
  else if (h < 17) c = [190, 172, 118];                            // beach sand
  else if (h < 130) c = [92, 140, 70];                             // grass
  else if (h < 240) c = [56, 96, 58];                              // forest
  else if (h < 520) c = [118, 104, 86];                            // rock
  else c = [226, 230, 236];                                        // snow
  if (slope > 0.45 && h > 30) c = mix(c, [104, 90, 74], 0.5);      // cliffs
  const shade = 0.74 + 0.26 * Math.max(0, 1 - slope * 1.6);
  c = [c[0] * shade, c[1] * shade, c[2] * shade];
  const tint = cellTint(Math.round(wx / 14), Math.round(wz / 14)) * 12;
  c = [c[0] + tint, c[1] + tint, c[2] + tint * 0.8];
  return rgb(mix(c, FOG, fogT(depth)));
}

function drawScene(ctx, world, camera, w, h) {
  const focal = h * FOCAL;
  const plane = world.plane;

  // --- sky ---
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  const tilt = Math.max(0, Math.min(1, (camera.pitch + 0.5) / 1.0));
  sky.addColorStop(0, rgb(mix(SKY_TOP, [30, 60, 110], tilt)));
  sky.addColorStop(1, rgb(SKY_HORIZON));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // sun
  const sun = project(camera, w, h, focal, plane.x + 2600, plane.alt + 2100, plane.z - 1600);
  if (sun) {
    ctx.fillStyle = 'rgba(255,246,214,0.85)';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.14)';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- clouds: a few fixed puffs around the plane ---
  drawClouds(ctx, camera, plane, w, h, focal);

  // --- terrain grid, painted back to front ---
  const cells = [];
  const pcx = Math.round(camera.x / CELL), pcz = Math.round(camera.z / CELL);
  for (let gz = -VIEW_CELLS; gz <= VIEW_CELLS; gz++) {
    for (let gx = -VIEW_CELLS; gx <= VIEW_CELLS; gx++) {
      const cx = pcx + gx, cz = pcz + gz;
      const wx = cx * CELL, wz = cz * CELL;
      const dx = wx - camera.x, dz = wz - camera.z;
      const depth = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
      if (depth - CELL > FOG_END * 1.3) continue; // far cull only; near cells clip in projectPoly
      cells.push({ wx, wz, depth });
    }
  }
  cells.sort((a, b) => b.depth - a.depth);

  for (const cell of cells) {
    const corners = [
      [cell.wx, cell.wz], [cell.wx + CELL, cell.wz],
      [cell.wx + CELL, cell.wz + CELL], [cell.wx, cell.wz + CELL],
    ];
    const pts = projectPoly(camera, w, h, focal,
      corners.map(([x, z]) => [x, groundHeight(x, z), z]));
    if (pts.length < 3) continue;
    const cx = cell.wx + CELL / 2, cz = cell.wz + CELL / 2;
    const hMid = groundHeight(cx, cz);
    const slope = Math.abs(groundHeight(cx + CELL / 2, cz) - hMid) / CELL
      + Math.abs(groundHeight(cx, cz + CELL / 2) - hMid) / CELL;
    ctx.fillStyle = terrainColour(hMid, cell.depth, slope, cx, cz);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --- runway: a flat ribbon through the plain, drawn over its cells ---
  drawRunway(ctx, camera, w, h, focal);
  drawRings(ctx, world, camera, w, h, focal);

  // --- the aircraft itself (hidden in cockpit view) ---
  if (camera.view === 'chase' && !plane.crashed) drawPlane(ctx, camera, plane, w, h, focal);
  if (plane.crashed) drawWreckSmoke(ctx, camera, plane, w, h, focal);
  if (camera.view === 'cockpit') drawCockpitFrame(ctx, plane, w, h);
}

// The cockpit itself: a dashboard across the bottom of the screen with a
// three-dial instrument cluster (airspeed, horizon, altimeter), canopy struts
// and a glareshield, so the cockpit view reads as sitting in the aeroplane.
function drawCockpitFrame(ctx, plane, w, h) {
  const dashTop = h * 0.74;

  // canopy struts
  ctx.fillStyle = 'rgba(28,32,38,0.92)';
  ctx.fillRect(0, 0, w * 0.045, h);
  ctx.fillRect(w * 0.955, 0, w * 0.045, h);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.53, 0);
  ctx.lineTo(w * 0.62, dashTop);
  ctx.lineTo(w * 0.56, dashTop);
  ctx.closePath();
  ctx.fill();

  // dashboard: a curved dark panel with a leather-tone glareshield edge
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, dashTop + 26);
  ctx.quadraticCurveTo(w * 0.5, dashTop - 8, w, dashTop + 26);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = '#22262c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, dashTop + 26);
  ctx.quadraticCurveTo(w * 0.5, dashTop - 8, w, dashTop + 26);
  ctx.stroke();

  // instrument cluster: three round dials, each needle live
  const cy = dashTop + (h - dashTop) * 0.46, r = Math.min(58, (h - dashTop) * 0.34);
  drawDial(ctx, w * 0.34, cy, r, 'SPD', (plane.speed / SPEED_MAX) * 300 - 150, '#8fe08a');
  drawHorizon(ctx, w * 0.5, cy, r, plane.pitch, plane.roll);
  drawDial(ctx, w * 0.66, cy, r, 'ALT', (plane.alt / CEILING) * 300 - 150, '#7fb8ff');
}

function drawDial(ctx, x, y, r, label, angleDeg, needle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d1015';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let i = -3; i <= 3; i++) {
    const a = (i * 50 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  const a = (angleDeg - 90) * Math.PI / 180;
  ctx.strokeStyle = needle;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `${Math.round(r * 0.28)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, r * 0.55);
  ctx.restore();
}

function drawHorizon(ctx, x, y, r, pitch, roll) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-roll);
  const off = pitch * r * 1.4;
  ctx.fillStyle = '#3f74a8';
  ctx.fillRect(-r, -r + off, r * 2, r);
  ctx.fillStyle = '#6d5a3c';
  ctx.fillRect(-r, off, r * 2, r);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, off);
  ctx.lineTo(r, off);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.lineTo(x - r * 0.15, y);
  ctx.moveTo(x + r * 0.15, y);
  ctx.lineTo(x + r * 0.5, y);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + r * 0.12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawClouds(ctx, camera, plane, w, h, focal) {
  const puffs = [
    [1200, 760, -800, 190], [-2000, 620, 600, 240], [3400, 900, 1800, 300],
    [-900, 1050, 2600, 260], [2600, 700, -2600, 220],
  ];
  for (const [x, y, z, r] of puffs) {
    const p = project(camera, w, h, focal, x + plane.x * 0.2, y, z + plane.z * 0.2);
    if (!p) continue;
    const rad = Math.max(4, r * p.scale);
    ctx.fillStyle = `rgba(255,255,255,${0.75 - fogT(p.depth) * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + rad * 0.7, p.y + rad * 0.18, rad * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x - rad * 0.68, p.y + rad * 0.2, rad * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRunway(ctx, camera, w, h, focal) {
  const rw = RUNWAY;
  const strip = [
    [rw.x - rw.width, rw.z - rw.len / 2 - 60],
    [rw.x + rw.width, rw.z - rw.len / 2 - 60],
    [rw.x + rw.width, rw.z + rw.len / 2 + 60],
    [rw.x - rw.width, rw.z + rw.len / 2 + 60],
  ];
  const pts = projectPoly(camera, w, h, focal, strip.map(([x, z]) => [x, 24.5, z]));
  if (pts.length < 3) return;
  ctx.fillStyle = 'rgb(72,74,80)';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // centre dashes
  ctx.strokeStyle = 'rgb(230,230,225)';
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i++) {
    const a = project(camera, w, h, focal, rw.x, 25, rw.z + i * 120 - 40);
    const b = project(camera, w, h, focal, rw.x, 25, rw.z + i * 120 + 30);
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  // threshold bars
  ctx.fillStyle = 'rgb(240,240,235)';
  for (const endZ of [rw.z - rw.len / 2, rw.z + rw.len / 2]) {
    for (let i = -3; i <= 3; i++) {
      const quad = projectPoly(camera, w, h, focal, [
        [rw.x + i * 11 - 4, 25, endZ - 34], [rw.x + i * 11 + 4, 25, endZ - 34],
        [rw.x + i * 11 + 4, 25, endZ + 10], [rw.x + i * 11 - 4, 25, endZ + 10],
      ]);
      if (quad.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        for (let j = 1; j < quad.length; j++) ctx.lineTo(quad[j].x, quad[j].y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawRings(ctx, world, camera, w, h, focal) {
  world.rings.forEach((ring, index) => {
    if (index > world.ringIndex) return; // show passed + the next one only
    const active = index === world.ringIndex;
    const colour = ring.passed ? 'rgba(120,200,140,' : (active ? 'rgba(255,196,64,' : 'rgba(150,150,160,');
    const segments = 18;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1.35) / segments) * Math.PI * 2;
      const p0 = project(camera, w, h, focal, ring.x + Math.cos(a0) * ring.r, ring.alt + Math.sin(a0) * ring.r, ring.z);
      const p1 = project(camera, w, h, focal, ring.x + Math.cos(a1) * ring.r, ring.alt + Math.sin(a1) * ring.r, ring.z);
      if (!p0 || !p1) continue;
      ctx.strokeStyle = colour + (active ? '0.95)' : '0.8)');
      ctx.lineWidth = Math.max(1.5, 3 * p0.scale);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    if (active) {
      const c = project(camera, w, h, focal, ring.x, ring.alt, ring.z);
      if (c) {
        // a thin soft ring echo, not a filled disc
        ctx.strokeStyle = 'rgba(255,196,64,0.22)';
        ctx.lineWidth = Math.max(3, 9 * c.scale);
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.max(3, ring.r * c.scale), 0, Math.PI * 2);
        ctx.stroke();
        // centre pipper
        ctx.strokeStyle = 'rgba(255,214,110,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - 7, c.y); ctx.lineTo(c.x - 2, c.y);
        ctx.moveTo(c.x + 2, c.y); ctx.lineTo(c.x + 7, c.y);
        ctx.moveTo(c.x, c.y - 7); ctx.lineTo(c.x, c.y - 2);
        ctx.moveTo(c.x, c.y + 2); ctx.lineTo(c.x, c.y + 7);
        ctx.stroke();
      }
    }
  });
}

function drawPlane(ctx, camera, plane, w, h, focal) {
  const faces = [];
  for (const face of MODEL.f) {
    const pts = [];
    let behind = false;
    for (const vi of face.i) {
      const [lx, ly, lz] = MODEL.v[vi];
      const [wx, wy, wz] = toWorld(plane, lx, ly, lz);
      const p = project(camera, w, h, focal, wx, wy, wz);
      if (!p) { behind = true; break; }
      pts.push(p);
    }
    if (behind || pts.length < 2) continue;
    let depth = 0;
    for (const p of pts) depth += p.depth;
    faces.push({ pts, depth: depth / pts.length, face });
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const { pts, face } of faces) {
    const shade = 0.45 + 0.55 * face.s;
    const c = face.c.map((v) => v * 255 * shade);
    ctx.fillStyle = rgb(c);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }
  // wheels: three dark discs under the model
  for (const wi of MODEL.wheels) {
    const [lx, ly, lz] = MODEL.v[wi];
    const [wx, wy, wz] = toWorld(plane, lx, ly, lz);
    const p = project(camera, w, h, focal, wx, wy - 0.35, wz);
    if (!p) continue;
    ctx.fillStyle = 'rgb(28,30,34)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5, 0.42 * p.scale), 0, Math.PI * 2);
    ctx.fill();
  }
  // spinning propeller: two blurred blade arcs, thin so it never blobs the view
  const nose = toWorld(plane, 0, 0.6, 6.4);
  const pn = project(camera, w, h, focal, nose[0], nose[1], nose[2]);
  if (pn) {
    const r = Math.max(2, Math.min(1.5 * pn.scale, 0.055 * focal));
    const spin = (Date.now() / 90) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(60,62,70,0.5)';
    ctx.lineWidth = Math.max(1, 1.5 * Math.min(pn.scale, 4));
    for (const off of [0, Math.PI / 2]) {
      ctx.beginPath();
      ctx.ellipse(pn.x, pn.y, r, r * 0.25, spin + off, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,205,212,0.9)';
    ctx.beginPath();
    ctx.arc(pn.x, pn.y, Math.max(1.5, 0.006 * focal), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWreckSmoke(ctx, camera, plane, w, h, focal) {
  for (let i = 0; i < 6; i++) {
    const t = (Date.now() / 700 + i * 0.9) % 3;
    const p = project(camera, w, h, focal, plane.x + Math.sin(i * 2.4) * 6 * t, plane.alt + t * 26, plane.z + Math.cos(i * 1.7) * 5 * t);
    if (!p) continue;
    ctx.fillStyle = `rgba(90,86,82,${0.5 - t * 0.14})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2, (6 + t * 16) * p.scale * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
}
