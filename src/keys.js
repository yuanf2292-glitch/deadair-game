// Keyboard, mouse and touch. Keys are tracked in a plain map; actions
// fire once per press. Mouse drag orbits the camera while driving and
// turns the courier on foot; a quick click fires the arc pulse.
const pressed = {};
let viewYaw = 0;
let camOrbit = 0;

const ARROW_ALIAS = {
  ArrowUp: "w",
  ArrowDown: "s",
  ArrowLeft: "a",
  ArrowRight: "d",
};

function keyAxis(pos, neg) {
  return (pressed[pos] ? 1 : 0) - (pressed[neg] ? 1 : 0);
}

function heldKey(k) {
  return !!pressed[k];
}

function runAction(k) {
  if (k === "escape" || k === "p") {
    if (W.mode === "pause") resumeGame();
    else if (W.mode === "play") pauseGame();
    return;
  }
  if (W.mode !== "play" || W.demo) return;
  if (k === "e") hopInOut();
  if (k === "f") arcPulse();
  if (k === "u") buyKite();
  if (k === "m") silenced = !silenced;
}

onkeydown = (e) => {
  const k = ARROW_ALIAS[e.key] || e.key.toLowerCase();
  if (["w", "s", "a", "d", " "].includes(k)) e.preventDefault();
  if (!e.repeat) runAction(k);
  pressed[k] = true;
};
onkeyup = (e) => {
  pressed[ARROW_ALIAS[e.key] || e.key.toLowerCase()] = false;
};
onblur = () => {
  for (const k in pressed) pressed[k] = false;
  if (W.mode === "play" && !W.demo) pauseGame();
};

function buildTouch() {
  const pad = el("touch");
  pad.hidden = !matchMedia("(pointer:coarse)").matches || W.mode !== "play";
  if (pad.children.length) return;
  for (const [k, label] of Object.entries({
    a: "◀",
    w: "▲",
    s: "▼",
    d: "▶",
    e: "Ride",
    f: "Arc",
    u: "Buy",
    " ": "Brake / Link",
    p: "Ⅱ",
  })) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      pressed[k] = true;
      runAction(k);
    };
    b.onpointerup = b.onpointercancel = () => {
      pressed[k] = false;
    };
    pad.append(b);
  }
}
