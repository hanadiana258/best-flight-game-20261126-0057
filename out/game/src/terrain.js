// The terrain heightfield: smooth value-noise hills with a flattened coastal
// plain under the runway and a mountain ridge east. A pure function of (x, z),
// so the sim, the renderer and the collision check all read the same ground.

import { createRandom } from './random.js';
import { RUNWAY } from './config.js';

// Two fixed octaves of value noise on a coarse integer lattice.
function noise2(seed) {
  const rnd = createRandom(seed);
  const size = 256, table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = rnd();
  function at(ix, iz) {
    return table[((iz & 255) * size + (ix & 255)) | 0];
  }
  return function (x, z, cell) {
    const fx = x / cell, fz = z / cell;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    const a = at(ix, iz), b = at(ix + 1, iz), c = at(ix, iz + 1), d = at(ix + 1, iz + 1);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
}

const wide = noise2(20261126);
const mid = noise2(97);
const fine = noise2(1337);

// Distance from the runway rectangle (and a smooth approach lane), 0 on the strip.
function flatness(x, z) {
  const dx = Math.max(Math.abs(x - RUNWAY.x) - RUNWAY.width * 3, 0);
  const dz = Math.max(Math.abs(z - RUNWAY.z) - RUNWAY.len * 1.3, 0);
  const d = Math.sqrt(dx * dx + dz * dz);
  return Math.min(1, d / 900); // 0 near the field, 1 far away
}

/** Ground height in metres at world (x, z). Sea level is 0; water floors at -12. */
export function groundHeight(x, z) {
  const west = (x - RUNWAY.x) / 1400; // coast: sea far west, hills east
  let h = 90 * wide(x, z, 1400) + 46 * mid(x, z, 480) + 10 * fine(x, z, 130);
  h += 160 * Math.max(0, west) * wide(x + 7000, z, 1900); // ridge east of the field
  h -= 120 * Math.max(0, -west) * (0.4 + wide(x - 5000, z, 900)); // western sea basin
  const flat = flatness(x, z);
  const field = 24; // the plain sits at 24 m, just above the sand line
  h = field + (h - field) * flat * flat;
  return Math.max(-12, h);
}

/** True when the point is over water (drawn and treated as a crash surface). */
export function isWater(x, z) {
  return groundHeight(x, z) < 0.5;
}
