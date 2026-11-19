// Deterministic random numbers, so the city layout and traffic are the
// same on every run. A mulberry-style LCG kept in a closure per stream.
function makeStream(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const toss = makeStream(984); // world dressing
const drawOne = (arr) => arr[Math.floor(toss() * arr.length)];
