// The patrol plane's low-poly body: local-space vertices and shaded faces,
// with one local->world transform the renderer uses for the chase view.
// Signal-orange trainer with dark trim, a tall fin and fixed landing gear.

// Local axes: +z forward (nose), +y up, +x right. Metres, origin at the wing root.
export const MODEL = (() => {
  const v = [
    [0, 0.6, 6.4],     // 0 nose tip
    [0.9, 0.9, 2.4],   // 1 canopy right front
    [-0.9, 0.9, 2.4],  // 2 canopy left front
    [0.9, 1.6, 0.6],   // 3 canopy right top
    [-0.9, 1.6, 0.6],  // 4 canopy left top
    [1.0, 0.3, -2.6],  // 5 tail right
    [-1.0, 0.3, -2.6], // 6 tail left
    [0, 1.0, -3.4],    // 7 tail top
    [0, -0.5, 1.4],    // 8 belly
    [0, -0.1, -3.0],   // 9 tail underside
    [8.4, 0.5, 1.2],   // 10 right wingtip front
    [-8.4, 0.5, 1.2],  // 11 left wingtip front
    [5.6, 0.2, -2.0],  // 12 right wing trailing
    [-5.6, 0.2, -2.0], // 13 left wing trailing
    [2.4, 0.5, 0.4],   // 14 right wing root front
    [-2.4, 0.5, 0.4],  // 15 left wing root front
    [2.8, 0.9, -3.2],  // 16 right tailplane
    [-2.8, 0.9, -3.2], // 17 left tailplane
    [2.8, 0.25, -2.1], // 18 right tailplane root
    [-2.8, 0.25, -2.1],// 19 left tailplane root
    [0, 2.6, -3.4],    // 20 fin tip
    [0, 1.0, -1.9],    // 21 fin front root
    [1.1, -1.5, 2.0],  // 22 right gear leg bottom
    [-1.1, -1.5, 2.0], // 23 left gear leg bottom
    [0, -1.5, -2.6],   // 24 tail wheel
  ];
  // Each face: vertex indices, base colour [r,g,b] 0..1, shade 0..1 (how much
  // its normal points towards the sun).
  const f = [
    { i: [0, 1, 3, 2], c: [0.76, 0.80, 0.86], s: 0.9 },   // nose deck
    { i: [3, 1, 5, 7], c: [0.76, 0.80, 0.86], s: 0.55 },  // fuselage right
    { i: [4, 2, 6, 7], c: [0.62, 0.68, 0.76], s: 0.4 },   // fuselage left
    { i: [7, 5, 9, 6], c: [0.52, 0.58, 0.66], s: 0.25 },  // tail cap
    { i: [0, 8, 5, 1], c: [0.68, 0.72, 0.80], s: 0.45 },  // belly right
    { i: [0, 2, 6, 8], c: [0.62, 0.66, 0.74], s: 0.4 },   // belly left
    { i: [14, 10, 12, 5], c: [0.88, 0.46, 0.30], s: 0.9 },// right wing
    { i: [15, 6, 13, 11], c: [0.74, 0.36, 0.26], s: 0.6 },// left wing
    { i: [10, 12, 13, 11], c: [0.42, 0.20, 0.15], s: 0.2 },// trailing edge strip
    { i: [7, 16, 18, 5], c: [0.88, 0.46, 0.30], s: 0.8 }, // right tailplane
    { i: [7, 5, 19, 17], c: [0.74, 0.36, 0.26], s: 0.5 }, // left tailplane
    { i: [7, 20, 21, 9], c: [0.90, 0.48, 0.32], s: 0.95 },// fin right
    { i: [7, 9, 21, 20], c: [0.76, 0.38, 0.28], s: 0.6 }, // fin left
    { i: [20, 7, 9, 21], c: [0.46, 0.44, 0.50], s: 0.2 }, // fin trailing edge
    { i: [3, 4, 7], c: [0.30, 0.36, 0.46], s: 1.0 },      // canopy top
    { i: [3, 1, 2, 4], c: [0.34, 0.60, 0.72], s: 1.0 },   // windshield glass
    { i: [1, 5, 9, 6, 2, 0, 3, 4], c: [0.30, 0.36, 0.46], s: 0.5 }, // cabin band
    { i: [8, 22, 23], c: [0.35, 0.38, 0.44], s: 0.35 },   // gear legs
    { i: [9, 24, 22], c: [0.35, 0.38, 0.44], s: 0.25 },   // tail wheel leg
  ];
  // wheels: drawn as dark discs by the renderer at 22, 23, 24
  return { v, f, wheels: [22, 23, 24] };
})();

/**
 * Local model point -> world point for the plane's current pose.
 * Roll about forward (z), pitch about right (x), heading about up (y).
 * Returns [x, y, z] in world metres.
 */
export function toWorld(plane, lx, ly, lz) {
  const sinR = Math.sin(plane.roll), cosR = Math.cos(plane.roll);
  const sinP = Math.sin(plane.pitch), cosP = Math.cos(plane.pitch);
  const sinH = Math.sin(plane.heading), cosH = Math.cos(plane.heading);
  let x = lx * cosR - ly * sinR;
  let y = lx * sinR + ly * cosR;
  let z = lz;
  const y2 = y * cosP - z * sinP;
  const z2 = y * sinP + z * cosP;
  y = y2; z = z2;
  const wx = x * cosH + z * sinH;
  const wz = z * cosH - x * sinH;
  return [plane.x + wx, plane.alt + y2, plane.z + wz];
}
