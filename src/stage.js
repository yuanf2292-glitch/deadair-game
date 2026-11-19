// Screens and persistence: title, pause, win/lose, checkpoints.
// A checkpoint stores the contract, the cash, the courier's spot and the
// cars that matter, so a run can be resumed in the same browser.
function showModal(tag, title, body, buttons) {
  el("modal").innerHTML =
    "<article><label>" + tag + "</label><h2>" + title + "</h2><p>" + body + "</p></article>";
  for (const [text, fn] of buttons) {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = fn;
    el("modal").firstChild.append(b);
  }
  el("modal").hidden = false;
  buildTouch();
}

function showTitle() {
  W.mode = "title";
  el("title").hidden = false;
  el("modal").hidden = true;
  el("hud").hidden = true;
  try {
    el("resume").hidden = !localStorage.quaySave;
  } catch {}
  buildTouch();
}

function saveCheckpoint() {
  try {
    localStorage.quaySave = JSON.stringify({
      stage: W.stage,
      leg: W.leg,
      cash: W.cash,
      score: W.score,
      bought: W.bought,
      x: ME.x,
      y: ME.y,
      vitality: W.vitality,
      heat: W.heat,
      remaining: W.deadline ? W.deadline - W.t : 0,
      markedCar: W.stage === 1 ? { ...W.targetCar } : null,
      kiteCar: W.parked.find((c) => c.model === "Kite RS"),
      ride: ME.ride ? { ...ME.ride, marked: ME.ride === W.targetCar } : null,
    });
    pauseGame("Checkpoint saved on this browser.");
  } catch {
    pauseGame("Storage unavailable.");
  }
}

function loadCheckpoint() {
  try {
    const d = JSON.parse(localStorage.quaySave);
    startRun();
    Object.assign(W, {
      stage: d.stage,
      leg: d.leg,
      cash: d.cash,
      score: d.score,
      bought: d.bought,
      vitality: d.vitality,
      heat: d.heat,
      deadline: d.remaining,
    });
    ME.x = d.x;
    ME.y = d.y;
    if (d.stage === 1) {
      spawnTargetCar();
      if (d.markedCar) Object.assign(W.targetCar, d.markedCar);
    }
    if (d.kiteCar && d.ride?.model !== "Kite RS") W.parked.push(d.kiteCar);
    if (d.ride) {
      ME.ride = d.ride.marked ? W.targetCar : d.ride;
      Object.assign(ME.ride, d.ride);
      if (!W.parked.includes(ME.ride)) W.parked.push(ME.ride);
    }
    W.cam.x = ME.x;
    W.cam.y = ME.y;
    initAudio();
    flash("Checkpoint restored");
  } catch {
    showTitle();
  }
}

function resumeGame() {
  W.mode = "play";
  el("modal").hidden = true;
  buildTouch();
}

function pauseGame(msg) {
  W.mode = "pause";
  showModal(
    "CHANNEL 07　/　STANDBY",
    "Signal paused.",
    msg ||
      "WASD / arrows: walk or drive. E: enter or exit. Space: brake / hold to tune a transmitter. Drag to look. F / click: arc pulse. U: buy Kite RS ($350). M: mute.",
    [
      ["Resume feed", resumeGame],
      ...(W.demo
        ? [["Start a new run", () => startRun()]]
        : [
            ["Save checkpoint", saveCheckpoint],
            [
              "Buy Kite RS · $350",
              () => {
                resumeGame();
                buyKite();
              },
            ],
          ]),
      ["Title screen", showTitle],
    ],
  );
}

function endRun(won) {
  if (W.mode !== "play") return;
  W.mode = "over";
  try {
    if (!W.demo) localStorage.quayBest = Math.max(bestScore(), W.score);
  } catch {}
  showModal(
    won ? "CHANNEL 07　/　SIGNAL RESTORED" : "CHANNEL 07　/　CONNECTION LOST",
    won ? "Back on air." : W.vitality <= 0 ? "Intercepted." : "Out of time.",
    (won ? "Vale’s tapes go live across the harbor." : "The port authority cut the transmission.") +
      " Score: " +
      W.score +
      "　/　Best: " +
      bestScore(),
    [
      ["Restart transmission", () => startRun()],
      ["Title screen", showTitle],
    ],
  );
}

function startRun(demo = "") {
  Object.assign(W, {
    mode: "play",
    t: 0,
    heat: 0,
    lastOffence: -99,
    nextPatrol: 0,
    cash: 0,
    score: 0,
    vitality: 100,
    stage: 0,
    leg: 0,
    deadline: 0,
    link: 0,
    bought: false,
    patrol: [],
    sparks: [],
    demo,
    ripple: -9,
    nextPulse: 0,
    nextBump: 0,
    autoStep: 0,
    targetCar: null,
  });
  ME.x = BLOCK;
  ME.y = 2 * BLOCK;
  ME.a = 0;
  ME.ride = null;
  viewYaw = 0;
  camOrbit = 0;
  lastFrame = -10;
  clearActors();
  seedStreets();
  W.parked[0].owned = true;
  W.parked[0].x = ME.x + 32;
  W.parked[0].y = ME.y + 9;
  seedWalkers();
  if (demo) {
    ME.ride = W.parked[0];
    ME.ride.owned = true;
    ME.ride.y = ME.y + 19;
    if (demo === "chase") {
      raiseHeat(3);
      W.patrol = [buildCar(ME.x - 100, ME.y + 19, 0, "#d9e2c9", "PATROL")];
    }
  }
  W.cam.x = ME.x;
  W.cam.y = ME.y;
  el("title").hidden = true;
  el("modal").hidden = true;
  el("hud").hidden = false;
  buildTouch();
  flash(
    demo
      ? "City feed live · Esc for menu"
      : "MIRA / Your Moth is idling ahead. E to drive. Get the master tape.",
  );
}
