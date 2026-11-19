// Particles and the arc pulse. Sparks fly on impacts; the pulse is a
// close-range discharge that knocks out nearby patrol cars at the cost
// of a little extra heat. The expanding ring it leaves is drawn by the
// renderer from W.ripple.
function burst(p) {
  for (let i = 0; i < 12; i++) {
    W.sparks.push({
      x: p.x,
      y: p.y,
      dx: (toss() - 0.5) * 120,
      dy: (toss() - 0.5) * 120,
      life: 0.4,
    });
  }
}

function arcPulse() {
  if (W.mode !== "play" || W.t < W.nextPulse) return;
  W.nextPulse = W.t + 1;
  W.ripple = W.t;
  raiseHeat(0.35);
  playSound("pulse");
  for (const c of W.patrol) {
    if (gap(ME, c) < 105) {
      burst(c);
      c.knocked = true;
    }
  }
  W.patrol = W.patrol.filter((c) => !c.knocked);
  flash("Arc pulse discharged");
}

function stepSparks(dt) {
  for (const f of W.sparks) {
    f.life -= dt;
    f.x += f.dx * dt;
    f.y += f.dy * dt;
  }
  W.sparks = W.sparks.filter((f) => f.life > 0);
}
