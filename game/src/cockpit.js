// The cockpit interior: canopy arch and side posts framing the view, a glare
// shield with live round gauges (airspeed, attitude, altimeter), a compass
// strip, fuel and hull lamps, and the throttle lever. Drawn in cockpit view
// between the 3D scene and the HUD.

const FRAME = '#20262e';
const FRAME_LIGHT = '#343c46';
const PANEL = '#1b2027';
const PANEL_EDGE = '#39424d';
const DIAL = '#0d1218';
const NEEDLE = '#ffd257';
const TEXT = 'rgba(214,228,240,0.85)';

export function drawCockpit(ctx, plane, w, h) {
  drawGlassTint(ctx, w, h);
  drawCanopy(ctx, w, h);
  drawPanel(ctx, plane, w, h);
}

function drawGlassTint(ctx, w, h) {
  // faint canopy sheen and edge shadow: reads as looking through glass
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.2, w * 0.5, h * 0.42, h * 0.95);
  g.addColorStop(0, 'rgba(120,170,210,0.03)');
  g.addColorStop(0.7, 'rgba(40,60,80,0.10)');
  g.addColorStop(1, 'rgba(6,10,16,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawCanopy(ctx, w, h) {
  // top arch: two curved bars sweeping to the centre
  ctx.fillStyle = FRAME;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.035);
  ctx.quadraticCurveTo(w * 0.78, h * 0.115, w * 0.5, h * 0.125);
  ctx.quadraticCurveTo(w * 0.22, h * 0.115, 0, h * 0.035);
  ctx.closePath();
  ctx.fill();

  // side posts
  for (const side of [-1, 1]) {
    const x = side < 0 ? 0 : w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + side * -w * 0.055, 0);
    ctx.quadraticCurveTo(x + side * -w * 0.02, h * 0.5, x + side * -w * 0.075, h * 0.78);
    ctx.lineTo(x, h * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  // arch highlight
  ctx.strokeStyle = FRAME_LIGHT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.036);
  ctx.quadraticCurveTo(w * 0.22, h * 0.118, w * 0.5, h * 0.128);
  ctx.quadraticCurveTo(w * 0.78, h * 0.118, w, h * 0.036);
  ctx.stroke();

  // wing tips peeking in at the bottom corners
  ctx.fillStyle = 'rgba(120,52,36,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.79);
  ctx.lineTo(w * 0.13, h * 0.80);
  ctx.lineTo(w * 0.10, h * 0.84);
  ctx.lineTo(0, h * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, h * 0.79);
  ctx.lineTo(w * 0.87, h * 0.80);
  ctx.lineTo(w * 0.90, h * 0.84);
  ctx.lineTo(w, h * 0.88);
  ctx.closePath();
  ctx.fill();
}

function drawPanel(ctx, plane, w, h) {
  const panelH = Math.max(130, h * 0.24);
  const y0 = h - panelH;
  // glare shield lip
  ctx.fillStyle = '#12161c';
  ctx.fillRect(0, y0, w, 8);
  // main panel face
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, '#242b34');
  g.addColorStop(1, PANEL);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0 + 8, w, panelH - 8);
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, y0 + 12, w - 12, panelH - 22);

  const gaugeR = Math.min(52, panelH * 0.33);
  const cy = y0 + panelH * 0.46;
  const cx = w / 2;
  airspeedGauge(ctx, cx - gaugeR * 2.9, cy, gaugeR, plane.speed * 1.944);
  attitudeGauge(ctx, cx, cy, gaugeR * 1.25, plane.pitch, plane.roll);
  altitudeGauge(ctx, cx + gaugeR * 2.9, cy, gaugeR, plane.alt * 3.281);

  compassStrip(ctx, cx, y0 + 18, Math.min(360, w * 0.3), plane.heading);
  engineLamps(ctx, w - 170, y0 + 26, plane);
  throttleQuadrant(ctx, 92, y0 + 26, plane.throttle);
}

function gaugeBase(ctx, x, y, r, label) {
  ctx.fillStyle = DIAL;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5d6873';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = TEXT;
  ctx.font = `${Math.max(9, r * 0.2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + r * 0.62);
}

function ticks(ctx, x, y, r, from, to, count, major) {
  ctx.strokeStyle = 'rgba(210,225,235,0.7)';
  for (let i = 0; i <= count; i++) {
    const a = from + (to - from) * (i / count);
    const long = i % major === 0;
    ctx.lineWidth = long ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * (long ? 0.68 : 0.76), y + Math.sin(a) * r * (long ? 0.68 : 0.76));
    ctx.lineTo(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88);
    ctx.stroke();
  }
}

function airspeedGauge(ctx, x, y, r, knots) {
  gaugeBase(ctx, x, y, r, 'KNOTS');
  const from = Math.PI * 0.75, to = Math.PI * 2.25;
  ticks(ctx, x, y, r, from, to, 10, 2);
  const t = Math.max(0, Math.min(1, knots / 220));
  const a = from + (to - from) * t;
  needle(ctx, x, y, r, a);
  ctx.fillStyle = TEXT;
  ctx.font = `${Math.max(10, r * 0.32)}px monospace`;
  ctx.fillText(String(Math.round(knots)), x, y + r * 0.28);
}

function altitudeGauge(ctx, x, y, r, feet) {
  gaugeBase(ctx, x, y, r, 'FEET');
  const from = Math.PI * 0.75, to = Math.PI * 2.25;
  ticks(ctx, x, y, r, from, to, 10, 2);
  const t = Math.max(0, Math.min(1, feet / 9000));
  needle(ctx, x, y, r, from + (to - from) * t);
  ctx.fillStyle = TEXT;
  ctx.font = `${Math.max(10, r * 0.3)}px monospace`;
  ctx.fillText(String(Math.round(feet)), x, y + r * 0.28);
}

function attitudeGauge(ctx, x, y, r, pitch, roll) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(roll);
  const shift = pitch * r * 0.9;
  ctx.fillStyle = '#3b6a94';
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 + shift);
  ctx.fillStyle = '#6d4a2e';
  ctx.fillRect(-r * 2, shift, r * 4, r * 2);
  ctx.strokeStyle = '#f0f4f8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, shift);
  ctx.lineTo(r, shift);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#5d6873';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // fixed aircraft symbol
  ctx.strokeStyle = NEEDLE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.lineTo(x - r * 0.16, y);
  ctx.moveTo(x + r * 0.16, y);
  ctx.lineTo(x + r * 0.5, y);
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x, y + 3);
  ctx.stroke();
}

function needle(ctx, x, y, r, angle) {
  ctx.strokeStyle = NEEDLE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(angle) * r * 0.14, y - Math.sin(angle) * r * 0.14);
  ctx.lineTo(x + Math.cos(angle) * r * 0.78, y + Math.sin(angle) * r * 0.78);
  ctx.stroke();
  ctx.fillStyle = '#c9d4de';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function compassStrip(ctx, cx, y, width, heading) {
  const deg = (heading * 180 / Math.PI + 360) % 360;
  ctx.fillStyle = DIAL;
  ctx.fillRect(cx - width / 2, y - 11, width, 22);
  ctx.strokeStyle = '#4b555f';
  ctx.strokeRect(cx - width / 2, y - 11, width, 22);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - width / 2, y - 11, width, 22);
  ctx.clip();
  ctx.fillStyle = TEXT;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let d = -40; d <= 40; d += 10) {
    const value = (Math.round(deg / 10) * 10 + d + 360) % 360;
    const px = cx + (d / 80) * width;
    ctx.fillText(String(value).padStart(2, '0'), px, y);
  }
  ctx.restore();
  ctx.fillStyle = NEEDLE;
  ctx.beginPath();
  ctx.moveTo(cx, y + 13);
  ctx.lineTo(cx - 4, y + 19);
  ctx.lineTo(cx + 4, y + 19);
  ctx.fill();
}

function engineLamps(ctx, x, y, plane) {
  const lamps = [
    ['FUEL', plane.fuel > 25 ? '#79d98a' : '#ff6a58'],
    ['OIL', plane.damage < 70 ? '#79d98a' : '#ffb347'],
    ['GEN', plane.throttle > 0.05 ? '#79d98a' : '#ffb347'],
  ];
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  lamps.forEach(([name, colour], i) => {
    const ly = y + i * 18;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.fillText(name, x + 9, ly + 1);
  });
}

function throttleQuadrant(ctx, x, y, throttle) {
  ctx.fillStyle = DIAL;
  ctx.fillRect(x - 10, y - 4, 12, 64);
  ctx.strokeStyle = '#4b555f';
  ctx.strokeRect(x - 10, y - 4, 12, 64);
  const ty = y + 60 - throttle * 58;
  ctx.fillStyle = '#d9dee4';
  ctx.fillRect(x - 16, ty - 3, 24, 7);
  ctx.fillStyle = TEXT;
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('THR', x - 10, y + 74);
}
