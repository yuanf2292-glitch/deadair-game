// DEAD AIR — core state and helpers.
// Kestrel Quay is a square grid city. Streets run along the grid lines;
// the blocks between them are solid. Everything else in the game reads
// the two globals declared here: W (world state) and ME (the courier).
const el = (id) => document.getElementById(id);
const BLOCK = 320; // distance between neighbouring street centrelines
const GRID = 8; // streets per side, indices 0..7
const EDGE = BLOCK * (GRID - 1); // far street centreline, 2240
const CURB = 59; // half-width of a street before a block starts
const TAU = Math.PI * 2;

const clampNum = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nodeAt = (i, j) => ({ x: i * BLOCK, y: j * BLOCK });
const snapLine = (v) => clampNum(Math.round(v / BLOCK), 0, GRID - 1) * BLOCK;

// A point is inside a building block (and therefore solid) when it is
// off both the nearest vertical and the nearest horizontal street.
function blocked(x, y) {
  if (x < -CURB || y < -CURB || x > EDGE + CURB || y > EDGE + CURB) return true;
  const dx = Math.abs(x - snapLine(x));
  const dy = Math.abs(y - snapLine(y));
  return dx > CURB + 16 && dy > CURB + 16;
}

// The courier. x/y are world metres, a is the facing angle, ride is the
// car object currently driven (null while on foot).
const ME = { x: BLOCK, y: 2 * BLOCK, a: 0, ride: null };

const W = {
  mode: "title", // title | play | pause | over
  t: 0, // seconds since the run started
  cash: 0,
  score: 0,
  vitality: 100,
  heat: 0, // wanted level, 0..5
  stage: 0, // which contract, 0..2
  leg: 0, // which stop inside the contract
  deadline: 0, // 0 = no timer running
  link: 0, // seconds spent tuning the current transmitter
  lastOffence: -99,
  nextPatrol: 0,
  nextBump: 0,
  nextPulse: 0,
  ripple: -9, // time of the last arc-pulse wave
  demo: "", // ?shot= value: play | chase | pause | over | win
  autoStep: 0, // autopilot waypoint index
  bought: false, // Kite RS purchased
  targetCar: null, // the marked Fen Runner, contract 2
  cam: { x: 0, y: 0 },
  parked: [], // stealable cars standing in the city
  flow: [], // moving traffic
  walkers: [], // pedestrians
  patrol: [], // police cars
  sparks: [], // crash / pulse particles
  note: "",
  noteUntil: 0,
};

function flash(text) {
  W.note = text;
  W.noteUntil = W.t + 3.2;
}

function bestScore() {
  try {
    return +localStorage.quayBest || 0;
  } catch {
    return 0;
  }
}
