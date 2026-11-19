// The city itself: one district block per grid cell, each with a name,
// a roof colour and a few prop positions. A handful of cells are special:
// the container yard, the night market, the relay tower and the parks.
const DISTRICTS = [
  "TIDELINE",
  "DRY DOCK",
  "KITE WORKS",
  "PUBLIC MARKET",
  "CHANNEL 07",
  "QUAY DEPOT",
  "EAST EXCHANGE",
];

const cells = [];
for (let i = 0; i < GRID - 1; i++) {
  for (let j = 0; j < GRID - 1; j++) {
    const stream = makeStream(i * 756 + j * 43 + 12);
    cells.push({
      x: i * BLOCK + 78,
      y: j * BLOCK + 78,
      i,
      j,
      park: (i + j * 4) % 9 === 2,
      roof: drawOne(["#a99b7f", "#bead8c", "#9aab97", "#cbad8d"]),
      label: DISTRICTS[(i * 3 + j) % DISTRICTS.length],
      props: Array.from({ length: 8 }, () => [stream() * 125, stream() * 120]),
    });
  }
}

function districtName() {
  if (ME.x > EDGE * 0.65) return "EAST EXCHANGE";
  if (ME.y > EDGE * 0.55) return "SALT GARDENS";
  return "SOUTH DOCKS";
}
