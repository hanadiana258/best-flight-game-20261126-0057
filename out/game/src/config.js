// Tunables and mission definitions for Skyward Patrol. One place to balance the
// flight model, the world scale and the three mission briefings the title offers.

export const STEP = 1 / 60;              // fixed simulation step, seconds
export const MAX_FRAME = 0.25;           // longest stall the loop catches up on

// Flight model (SI-ish units, shown as knots / feet on the HUD).
export const GRAVITY = 9.81;
export const THROTTLE_MIN = 0, THROTTLE_MAX = 1, THROTTLE_RATE = 0.45;
export const PITCH_RATE = 0.9;           // rad/s at full elevator
export const ROLL_RATE = 1.7;            // rad/s at full aileron
export const YAW_RATE = 0.35;            // rudder
export const PITCH_LIMIT = 1.1;          // rad, elevator authority cap
export const SPEED_MIN = 18;             // stall speed, m/s
export const SPEED_MAX = 95;             // structural overspeed, m/s
export const SPEED_THRUST = 62;          // speed full throttle chases in still air
export const DRAG = 0.16;                // per second, towards SPEED_THRUST * throttle
export const LIFT_PITCH = 9.0;           // climb authority from airspeed, m/s per (rad * factor)
export const FUEL_FULL = 100;            // units; one unit lasts ~ 5 s at cruise
export const FUEL_BURN = 0.2;            // units/s at full throttle
export const DAMAGE_MAX = 100;
export const CEILING = 2400;             // m, engine power fades above this

// Camera
export const CHASE_BACK = 21, CHASE_UP = 5.6;
export const CAMERA_LERP = 6.0;

// World
export const CELL = 220;                 // terrain cell size, m
export const VIEW_CELLS = 26;            // render radius in cells
export const RUNWAY = { x: 0, z: 0, len: 640, width: 46, heading: 0 };
export const START = { x: -900, z: -2200, alt: 320, speed: 55, heading: 0 };

// Mission scoring
export const RING_SCORE = 500;
export const LANDING_BONUS = 800;
export const FUEL_BONUS_UNIT = 8;
export const TIME_LIMIT = 420;           // s, per sortie

// The three missions: different goals, same sky.
export const MISSIONS = [
  {
    id: 'patrol',
    name: 'Coastal Patrol',
    brief: 'Thread all 6 patrol rings over the coast, then land. Watch your fuel.',
    rings: [
      { x: -600, z: -900, alt: 260, r: 90 },
      { x: 300, z: -500, alt: 300, r: 90 },
      { x: 1500, z: -200, alt: 220, r: 80 },
      { x: 2400, z: 500, alt: 320, r: 80 },
      { x: 1400, z: 1400, alt: 240, r: 80 },
      { x: 200, z: 1100, alt: 180, r: 70 },
    ],
  },
  {
    id: 'valley',
    name: 'Canyon Run',
    brief: '8 tight rings low through the canyon. Speed and turn discipline win.',
    rings: [
      { x: -400, z: -1100, alt: 200, r: 70 },
      { x: 400, z: -800, alt: 150, r: 65 },
      { x: 1100, z: -600, alt: 180, r: 65 },
      { x: 1700, z: -300, alt: 140, r: 60 },
      { x: 2100, z: 300, alt: 170, r: 60 },
      { x: 1700, z: 1000, alt: 150, r: 60 },
      { x: 900, z: 1400, alt: 190, r: 65 },
      { x: 100, z: 1200, alt: 170, r: 65 },
    ],
  },
  {
    id: 'freight',
    name: 'High Freight',
    brief: 'Climb to 4 mountain rings above 900 m, then land heavy and slow.',
    rings: [
      { x: -800, z: -400, alt: 950, r: 100 },
      { x: 600, z: -200, alt: 1050, r: 90 },
      { x: 1900, z: 700, alt: 980, r: 90 },
      { x: 400, z: 1700, alt: 880, r: 85 },
    ],
  },
];

export const LANES = ['Coastal Patrol', 'Canyon Run', 'High Freight'];
