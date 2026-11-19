// Traffic and pedestrians. Traffic cars cruise the streets on fixed
// lanes and wrap around the map edges. Walkers stroll the sidewalks and
// scatter when a hot car bears down on them.
const PAINTS = ["#ee794b", "#cbbd83", "#769d98", "#bf766b", "#b4bfb0"];

function seedStreets() {
  W.parked = [buildCar(BLOCK + 26, 2 * BLOCK + 38, 0, "#e17c4e")];
  W.flow = [];
  for (let i = 0; i < 30; i++) {
    const along = i % 2 === 0;
    const dir = i % 4 < 2 ? 1 : -1;
    const lane = snapLine(toss() * EDGE) + dir * (along ? 19 : -19);
    const pos = toss() * EDGE;
    W.flow.push(
      buildCar(
        along ? pos : lane,
        along ? lane : pos,
        along ? (dir > 0 ? 0 : Math.PI) : (dir * Math.PI) / 2,
        drawOne(PAINTS),
        drawOne(["Moth 4", "Fen Runner", "Barge 8"]),
      ),
    );
  }
  for (let i = 0; i < 19; i++) {
    W.parked.push(buildCar(toss() * EDGE, snapLine(toss() * EDGE) + 40, 0, drawOne(PAINTS)));
  }
}

function stepTraffic(dt) {
  for (const c of W.flow) {
    c.x += Math.cos(c.a) * 61 * dt;
    c.y += Math.sin(c.a) * 61 * dt;
    for (const axis of ["x", "y"]) {
      if (c[axis] < -57) c[axis] = EDGE + 54;
      if (c[axis] > EDGE + 57) c[axis] = -54;
    }
    if (ME.ride && gap(c, ME) < 22 && Math.abs(ME.ride.speed) > 60 && W.t > W.nextBump) {
      damage(5);
      ME.ride.speed *= -0.25;
      burst(c);
      playSound("crash");
      W.nextBump = W.t + 1;
    }
  }
}

function seedWalkers() {
  W.walkers = Array.from({ length: 105 }, (_, i) => ({
    x: toss() * EDGE,
    y: snapLine(toss() * EDGE) + (i % 2 ? 65 : -65),
    dir: i % 3 ? 1 : -1,
    coat: drawOne(PAINTS),
  }));
}

function stepWalkers(dt) {
  for (const p of W.walkers) {
    const fleeing = W.heat > 0 && gap(ME, p) < 140;
    p.x += p.dir * dt * (fleeing ? 58 : 17);
    if (p.x > EDGE + 55 || p.x < -55) p.dir *= -1;
    if (ME.ride && Math.abs(ME.ride.speed) > 65 && gap(ME, p) < 12) {
      raiseHeat(0.7);
      p.x = clampNum(p.x + 80, 0, EDGE);
    }
  }
}
