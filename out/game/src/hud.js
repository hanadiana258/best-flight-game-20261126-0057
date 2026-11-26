// The flight HUD: heading tape, altitude and speed readouts, throttle and fuel
// gauges, damage bar, objective arrow, minimap and message line. Drawn over
// the 3D scene every frame while playing.

import { SPEED_MIN, SPEED_MAX, CEILING } from './config.js';
import { currentMessage, objective } from './world.js';

const INK = 'rgba(16,22,30,0.62)';
const GLASS = 'rgba(220,236,248,0.92)';
const WARN = '#ffb347';
const BAD = '#ff5a4e';
const GOOD = '#8fe08a';

export function drawHUD(ctx, world, camera, w, h) {
  const plane = world.plane;
  ctx.save();
  ctx.textBaseline = 'middle';

  drawHeadingTape(ctx, plane, w, h);
  drawSpeedBox(ctx, plane, 16, h * 0.32);
  drawAltitudeBox(ctx, plane, w - 118, h * 0.32);
  drawThrottle(ctx, plane, 16, h - 148);
  drawFuelDamage(ctx, plane, 16, h - 92);
  drawVerticalSpeed(ctx, plane, w - 118, h * 0.32 + 130);
  drawObjectiveArrow(ctx, world, camera, plane, w, h);
  drawMinimap(ctx, world, w, h);
  drawMessage(ctx, world, w, h);

  // stall / overspeed warnings
  if (plane.stall) banner(ctx, w, h, 'STALL — LOWER THE NOSE, ADD POWER', BAD);
  else if (plane.overspeed) banner(ctx, w, h, 'OVERSPEED — EASE OFF THE THROTTLE', WARN);
  else if (plane.fuel <= 0) banner(ctx, w, h, 'FUEL EMPTY — GLIDE TO THE RUNWAY', WARN);

  ctx.restore();
}

function panel(ctx, x, y, w2, h2) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w2, h2, 6);
  ctx.fill();
  ctx.stroke();
}

function drawHeadingTape(ctx, plane, w, h) {
  const tw = Math.min(460, w * 0.5), x = (w - tw) / 2, y = 12, th = 30;
  panel(ctx, x - 8, y, tw + 16, th + 22);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, tw, th + 12);
  ctx.clip();
  const pxPerDeg = tw / 90;
  const hdgDeg = (plane.heading * 180 / Math.PI + 360) % 360;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 5) {
    const deg = (Math.round(hdgDeg / 5) * 5 + d + 360) % 360;
    const px = x + tw / 2 + d * pxPerDeg;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(px - 0.5, y + 6, 1, 7);
    const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    const label = labels[deg] ?? String(deg).padStart(3, '0');
    ctx.fillStyle = GLASS;
    ctx.fillText(label, px, y + 24);
  }
  ctx.restore();
  // heading caret
  ctx.fillStyle = '#ffd257';
  ctx.beginPath();
  ctx.moveTo(w / 2, y + th + 8);
  ctx.lineTo(w / 2 - 6, y + th + 18);
  ctx.lineTo(w / 2 + 6, y + th + 18);
  ctx.closePath();
  ctx.fill();
}

function drawSpeedBox(ctx, plane, x, y) {
  panel(ctx, x, y, 102, 46);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = GLASS;
  ctx.textAlign = 'left';
  ctx.fillText(String(Math.round(plane.speed * 1.944)).padStart(3, ' '), x + 10, y + 22);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,214,226,0.8)';
  ctx.fillText('KTS', x + 10, y + 36);
  // speed band
  const t = Math.min(1, plane.speed / (SPEED_MAX * 1.15));
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 64, y + 8, 8, 30);
  ctx.fillStyle = plane.stall ? BAD : plane.overspeed ? WARN : GOOD;
  ctx.fillRect(x + 64, y + 38 - t * 30, 8, t * 30);
}

function drawAltitudeBox(ctx, plane, x, y) {
  panel(ctx, x, y, 102, 46);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = GLASS;
  ctx.textAlign = 'left';
  ctx.fillText(String(Math.round(plane.alt * 3.281)).padStart(5, ' '), x + 10, y + 22);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,214,226,0.8)';
  ctx.fillText('FT', x + 10, y + 36);
  // ceiling band
  const t = Math.min(1, plane.alt / CEILING);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 70, y + 8, 8, 30);
  ctx.fillStyle = plane.alt > CEILING ? WARN : '#7fb4ff';
  ctx.fillRect(x + 70, y + 38 - t * 30, 8, t * 30);
}

function drawVerticalSpeed(ctx, plane, x, y) {
  panel(ctx, x, y, 102, 34);
  ctx.font = '13px monospace';
  const fpm = Math.round(plane.vspeed * 196.85 / 10) * 10;
  ctx.fillStyle = fpm >= 0 ? GOOD : WARN;
  ctx.textAlign = 'left';
  ctx.fillText(`${fpm >= 0 ? '+' : ''}${fpm} fpm`, x + 10, y + 17);
}

function drawThrottle(ctx, plane, x, y) {
  panel(ctx, x, y, 92, 46);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,214,226,0.8)';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', x + 10, y + 12);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 10, y + 20, 72, 10);
  ctx.fillStyle = '#ffd257';
  ctx.fillRect(x + 10, y + 20, 72 * plane.throttle, 10);
}

function drawFuelDamage(ctx, plane, x, y) {
  panel(ctx, x, y, 148, 46);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,214,226,0.8)';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', x + 10, y + 12);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 46, y + 8, 92, 8);
  ctx.fillStyle = plane.fuel < 20 ? BAD : GOOD;
  ctx.fillRect(x + 46, y + 8, 92 * (plane.fuel / 100), 8);
  ctx.fillText('HULL', x + 10, y + 32);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 46, y + 28, 92, 8);
  const dmg = plane.damage / 100;
  ctx.fillStyle = dmg > 0.5 ? BAD : WARN;
  ctx.fillRect(x + 46, y + 28, 92 * dmg, 8);
}

function drawObjectiveArrow(ctx, world, camera, plane, w, h) {
  const target = objective(world);
  const dx = target.x - plane.x, dz = target.z - plane.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const bearing = Math.atan2(dx, dz);
  let rel = bearing - plane.heading;
  rel = ((rel + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  // compass arrow near the heading tape
  const cx = w / 2 + Math.max(-180, Math.min(180, Math.tan(Math.max(-1.2, Math.min(1.2, rel))) * 220));
  const cy = 52;
  ctx.save();
  ctx.translate(cx, cy + 12);
  ctx.rotate(rel);
  ctx.fillStyle = '#ffd257';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(7, 6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // distance + objective label
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = GLASS;
  const altHint = target.alt > plane.alt + 40 ? ' ↑' : target.alt < plane.alt - 40 ? ' ↓' : '';
  ctx.fillText(`${target.label} ${(dist / 1000).toFixed(1)} km${altHint}`, cx, cy + 34);
}

function drawMinimap(ctx, world, w, h) {
  const size = 150, pad = 14;
  const x = w - size - pad, y = pad;
  panel(ctx, x, y, size, size);
  const cx = x + size / 2, cy = y + size / 2;
  const span = 6000; // metres across the map
  const plane = world.plane;
  const sinH = Math.sin(plane.heading), cosH = Math.cos(plane.heading);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  const toMap = (wx, wz) => {
    const dx = (wx - plane.x) / span * size, dz = (wz - plane.z) / span * size;
    return [cx + dx * cosH - dz * sinH, cy - (dx * sinH + dz * cosH)];
  };
  // rings
  world.rings.forEach((ring, i) => {
    const [mx, my] = toMap(ring.x, ring.z);
    ctx.fillStyle = i < world.ringIndex ? GOOD : i === world.ringIndex ? '#ffd257' : 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(mx, my, i === world.ringIndex ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // runway
  const [rx, ry] = toMap(0, 0);
  ctx.strokeStyle = '#dfe8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  const [rx2, ry2] = toMap(0, 0 + 1);
  ctx.lineTo(rx + (rx2 - rx) * 0.001, ry);
  ctx.lineTo(rx, ry);
  ctx.stroke();
  ctx.fillStyle = '#dfe8f0';
  ctx.fillRect(rx - 3, ry - 3, 6, 6);
  ctx.restore();
  // plane marker, always centred pointing up
  ctx.fillStyle = '#ff8a5c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 4, cy + 5);
  ctx.lineTo(cx - 4, cy + 5);
  ctx.closePath();
  ctx.fill();
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,214,226,0.8)';
  ctx.textAlign = 'left';
  ctx.fillText('6 km', x + 8, y + size - 10);
}

function drawMessage(ctx, world, w, h) {
  const msg = currentMessage(world);
  if (!msg) return;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(msg).width;
  panel(ctx, w / 2 - tw / 2 - 14, h * 0.79, tw + 28, 28);
  ctx.fillStyle = GLASS;
  ctx.fillText(msg, w / 2, h * 0.79 + 14);
}

function banner(ctx, w, h, text, colour) {
  const blink = Math.sin(Date.now() / 180) > -0.3;
  if (!blink) return;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.fillText(text, w / 2, h * 0.24);
}
