// The three contracts. Each has a name, a type shown in the HUD, a list
// of stops (grid cell + instruction) and a payout. The courier wins by
// finishing all three; the third is timed and needs the brake held at
// each transmitter until the link locks.
const CONTRACTS = [
  {
    name: "Dead letter",
    kind: "COURIER",
    stops: [
      { i: 2, j: 2, note: "Collect the master tape" },
      { i: 4, j: 3, note: "Deliver to the relay booth" },
    ],
    pay: 350,
  },
  {
    name: "A borrowed frequency",
    kind: "VEHICLE LIFT",
    stops: [
      { i: 5, j: 3, note: "Lift the marked Fen Runner" },
      { i: 5, j: 5, note: "Deliver the Fen to Salt Gardens" },
    ],
    pay: 650,
  },
  {
    name: "Thirty seconds of truth",
    kind: "TIMED BROADCAST",
    stops: [
      { i: 4, j: 5, note: "Arm the first transmitter" },
      { i: 3, j: 4, note: "Link the market repeater" },
      { i: 1, j: 3, note: "Broadcast the harbor tapes" },
    ],
    pay: 1000,
  },
];

function currentStop() {
  const stop = CONTRACTS[W.stage].stops[W.leg];
  return nodeAt(stop.i, stop.j);
}

// A street route from one point to another: snap both ends onto the
// nearest street, then walk the grid with at most two turns.
function streetRoute(from, to) {
  const project = (p) =>
    Math.abs(p.x - snapLine(p.x)) < Math.abs(p.y - snapLine(p.y))
      ? { x: snapLine(p.x), y: p.y }
      : { x: p.x, y: snapLine(p.y) };
  const a = project(from);
  const b = project(to);
  const path = [from, a];
  if (a.x === b.x || a.y === b.y) {
    path.push(b);
  } else if (a.x % BLOCK === 0 && b.y % BLOCK === 0) {
    path.push({ x: a.x, y: b.y }, b);
  } else if (a.y % BLOCK === 0 && b.x % BLOCK === 0) {
    path.push({ x: b.x, y: a.y }, b);
  } else if (a.x % BLOCK === 0) {
    const y = snapLine((a.y + b.y) / 2);
    path.push({ x: a.x, y }, { x: b.x, y }, b);
  } else {
    const x = snapLine((a.x + b.x) / 2);
    path.push({ x, y: a.y }, { x, y: b.y }, b);
  }
  path.push(to);
  return path.filter((p, i) => i === 0 || gap(p, path[i - 1]) > 2);
}

function stepContract(dt) {
  if (W.demo) return;
  if (W.deadline && W.t > W.deadline) {
    endRun(false);
    return;
  }
  if (gap(ME, currentStop()) > 53) {
    W.link = 0;
    return;
  }
  if (W.stage === 2) {
    const parked = !heldKey(" ") || Math.abs(ME.ride?.speed || 0) > 30;
    if (parked) {
      W.link = 0;
      return;
    }
    W.link += dt;
    if (W.link < 1.15) return;
    W.link = 0;
  }
  if (W.stage === 0 && W.leg === 0) raiseHeat(1.5);
  if (W.stage === 1) {
    if (ME.ride !== W.targetCar) return;
    if (W.leg === 0) raiseHeat(1);
  }
  if (W.stage === 2 && W.leg === 0) W.deadline = W.t + 65;
  const job = CONTRACTS[W.stage];
  playSound("pickup");
  if (++W.leg < job.stops.length) {
    flash(
      W.stage === 0
        ? "MIRA / Tape secured. Port patrol is listening. Lose them at the booth."
        : W.stage === 1
          ? "MIRA / That is the relay van. Bring it home in one piece."
          : "MIRA / Carrier locked. Next transmitter, go!",
    );
    return;
  }
  W.cash += job.pay;
  W.score += job.pay;
  W.vitality = 100;
  flash("Contract paid +$" + job.pay + "  /  U: buy Kite RS · $350");
  W.leg = 0;
  if (++W.stage === CONTRACTS.length) {
    W.stage--;
    endRun(true);
  } else if (W.stage === 1) {
    spawnTargetCar();
  }
}

function spawnTargetCar() {
  const spot = nodeAt(5, 3);
  W.targetCar = buildCar(spot.x, spot.y, 0, "#e9b759", "Fen Runner");
  W.parked.push(W.targetCar);
}

function buyKite() {
  if (W.bought) return flash("Kite RS already purchased");
  if (W.cash < 350) return flash("Kite RS needs $350");
  W.cash -= 350;
  W.bought = true;
  const kite = buildCar(ME.x, ME.y, ME.a, "#ebc65d", "Kite RS");
  kite.owned = true;
  if (ME.ride) ME.ride.x += 24;
  W.parked.push(kite);
  ME.ride = kite;
  flash("Kite RS delivered  /  performance tuned");
}
