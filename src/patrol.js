// Heat and the port patrol. Every offence raises heat; heat fades once
// the courier has been quiet for a while. While heat is up, patrol cars
// spawn and chase along the streets; getting caught costs vitality.
function raiseHeat(amount) {
  W.heat = Math.min(5, W.heat + amount);
  W.lastOffence = W.t;
}

function damage(amount) {
  W.vitality = Math.max(0, W.vitality - amount);
  if (W.vitality <= 0) endRun(false);
}

function stepPatrol(dt) {
  if (W.t - W.lastOffence > 9) {
    const near = W.patrol.some((c) => gap(c, ME) < 160);
    W.heat = Math.max(0, W.heat - dt * (near ? 0.025 : 0.12));
  }
  if (!W.heat) {
    W.patrol = [];
    return;
  }
  if (W.patrol.length < Math.ceil(W.heat) && W.t > W.nextPatrol) {
    const gx = snapLine(ME.x);
    const gy = snapLine(ME.y);
    W.patrol.push(
      buildCar(clampNum(gx + (gx > EDGE / 2 ? -BLOCK : BLOCK), 0, EDGE), gy, 0, "#dae0c8", "PATROL"),
    );
    W.nextPatrol = W.t + 4;
  }
  for (const c of W.patrol) {
    const waypoint = streetRoute(c, ME)[1] || ME;
    const dx = waypoint.x - c.x;
    const dy = waypoint.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      c.a = Math.atan2(dy, dx);
      const step = Math.min(d, dt * (89 + W.heat * 10));
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
    }
    if (gap(c, ME) < 31 && !W.demo) damage(dt * 17);
  }
}
