// Boot: the frame loop, the autopilot demo and the ?shot= staging.
// The loop ticks the simulation only while the run is live; the view and
// the HUD draw in every mode except the title screen.
function autoDrive(dt) {
  const stops = [nodeAt(1, 2), nodeAt(5, 2), nodeAt(5, 5), nodeAt(1, 5)];
  const car = ME.ride;
  const next = stops[(W.autoStep + 1) % 4];
  const d = gap(car, next);
  if (d < 4) {
    W.autoStep = (W.autoStep + 1) % 4;
  } else {
    car.a = Math.atan2(next.y - car.y, next.x - car.x);
    car.speed = 124;
    car.x += Math.cos(car.a) * dt * car.speed;
    car.y += Math.sin(car.a) * dt * car.speed;
  }
  ME.x = car.x;
  ME.y = car.y;
  ME.a = car.a;
  if (W.demo === "chase") W.lastOffence = W.t;
}

function advance(dt) {
  W.t += dt;
  if (W.demo) autoDrive(dt);
  else steer(dt);
  stepTraffic(dt);
  stepWalkers(dt);
  stepPatrol(dt);
  if (W.mode === "play") stepContract(dt);
  stepSparks(dt);
  const k = 1 - Math.exp(-6 * dt);
  W.cam.x += (ME.x + Math.cos(ME.a) * (ME.ride ? 39 : 0) - W.cam.x) * k;
  W.cam.y += (ME.y + Math.sin(ME.a) * (ME.ride ? 39 : 0) - W.cam.y) * k;
}

el("start").onclick = () => {
  initAudio();
  startRun();
};
el("resume").onclick = loadCheckpoint;
el("watch").onclick = () => {
  initAudio();
  startRun("chase");
};

buildHud();
showTitle();

const shotParam = new URLSearchParams(location.search).get("shot");
if (["play", "chase", "win", "over", "pause"].includes(shotParam)) {
  startRun(shotParam);
  if (shotParam === "win") {
    W.score = 2000;
    W.stage = 2;
    endRun(true);
  }
  if (shotParam === "over") {
    W.vitality = 0;
    endRun(false);
  }
  if (shotParam === "pause") pauseGame();
}

let prevNow = performance.now();
function frame(now) {
  const dt = Math.min(0.045, (now - prevNow) / 1000);
  prevNow = now;
  if (W.mode === "play") advance(dt);
  if (W.mode !== "title") {
    drawFrame();
    refreshHud();
  }
  stepAudio();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
