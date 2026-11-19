// HUD and minimap. The HUD is four corner panels plus a toast line;
// the minimap is a north-up street grid with the route, the target
// diamond, patrol dots and the courier's dot.
function buildHud() {
  el("hud").innerHTML =
    '<div class="mission panel"><label id="contract"></label><h3 id="job"></h3><span id="objective"></span><small id="signal"></small></div>' +
    '<div class="stats panel"><label>WALLET / HEAT</label><h3 id="money"></h3><span id="heat"></span></div>' +
    '<div class="map panel"><canvas id="mini" width="138" height="138"></canvas><small id="district"></small></div>' +
    '<div class="dash panel"><label id="model"></label><h3 id="speed"></h3><span id="life"></span></div>' +
    '<div class="toast" id="toast"></div>';
}

function refreshHud() {
  const job = CONTRACTS[W.stage];
  el("contract").textContent = (W.demo ? "LIVE FEED" : "CH 07") + "　/　0" + (W.stage + 1) + "　" + job.kind;
  el("job").textContent = job.name;
  el("objective").textContent =
    job.stops[W.leg].note +
    (W.deadline ? " · " + Math.max(0, Math.ceil(W.deadline - W.t)) + "s" : "");
  el("money").textContent = "$" + W.cash.toLocaleString();
  el("heat").textContent = "◆".repeat(Math.ceil(W.heat)) + "◇".repeat(5 - Math.ceil(W.heat));
  el("district").textContent = "⌖ " + districtName();
  el("model").textContent = ME.ride ? ME.ride.model : "VALE ROOK";
  el("speed").textContent = ME.ride ? Math.round(Math.abs(ME.ride.speed) * 0.65) + " KM/H" : "ON FOOT";
  el("life").textContent = "VITAL " + Math.ceil(W.vitality) + "%　 ESC Ⅱ";
  el("toast").textContent = W.t < W.noteUntil ? W.note : "";
  el("signal").textContent =
    W.stage === 2 && gap(ME, currentStop()) < 53
      ? "HOLD SPACE · TUNING " + Math.floor((W.link / 1.15) * 100) + "%"
      : Math.round(gap(ME, currentStop()) * 0.18) + " m　/　98.4 FM";
  drawMini();
}

function drawMini() {
  const m = el("mini");
  if (!m) return;
  const c = m.getContext("2d");
  const s = 132 / (EDGE + 120);
  const px = (v) => 3 + (v + 60) * s;
  c.fillStyle = "#263a34";
  c.fillRect(0, 0, 138, 138);
  c.strokeStyle = "#738071";
  c.lineWidth = 2;
  for (let i = 0; i < GRID; i++) {
    const n = px(i * BLOCK);
    c.beginPath();
    c.moveTo(n, 3);
    c.lineTo(n, 135);
    c.moveTo(3, n);
    c.lineTo(135, n);
    c.stroke();
  }
  const t = currentStop();
  c.beginPath();
  streetRoute(ME, t).forEach((p, i) => (i ? c.lineTo(px(p.x), px(p.y)) : c.moveTo(px(p.x), px(p.y))));
  c.strokeStyle = "#ff9463";
  c.stroke();
  c.fillStyle = "#ff9463";
  c.fillRect(px(t.x) - 3, px(t.y) - 3, 6, 6);
  for (const v of W.patrol) {
    c.fillStyle = "#ff5266";
    c.fillRect(px(v.x) - 2, px(v.y) - 2, 4, 4);
  }
  c.beginPath();
  c.arc(px(ME.x), px(ME.y), 3.4, 0, 7);
  c.fillStyle = "#fff3cf";
  c.fill();
}
