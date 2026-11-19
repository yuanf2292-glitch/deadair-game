// Cars and movement. A car is a plain record; the renderer draws it.
// Driving is arcade: accelerate, brake, reverse, steer harder the faster
// you go, bounce off blocks. On foot the courier walks the streets.
function buildCar(x, y, a, paint, model = "Moth 4") {
  return { x, y, a, paint, model, speed: 0, owned: false };
}

function hopInOut() {
  if (ME.ride) {
    // Step out to either side of the car, whichever is not inside a block.
    const car = ME.ride;
    for (const side of [1, -1]) {
      const x = car.x - Math.sin(car.a) * 23 * side;
      const y = car.y + Math.cos(car.a) * 23 * side;
      if (!blocked(x, y)) {
        ME.x = x;
        ME.y = y;
        ME.ride = null;
        car.speed = 0;
        flash("On foot");
        return;
      }
    }
    return;
  }
  // Nearest car of any kind within reach; the contract-2 target is
  // preferred while its first leg is open.
  const pool = [...W.parked, ...W.flow].sort((a, b) => gap(a, ME) - gap(b, ME));
  let car = pool[0];
  if (W.stage === 1 && !W.leg && W.targetCar && gap(W.targetCar, ME) < 54) {
    car = W.targetCar;
  }
  if (car && gap(car, ME) < 54) {
    if (W.flow.includes(car)) {
      W.flow.splice(W.flow.indexOf(car), 1);
      W.parked.push(car);
    }
    ME.ride = car;
    car.speed = 0;
    viewYaw = car.a;
    if (!car.owned) {
      raiseHeat(1);
      car.owned = true;
    }
    flash(car.model + "  /  ignition live");
  } else {
    flash("Move closer to a vehicle");
  }
}

function steer(dt) {
  const car = ME.ride;
  const gas = keyAxis("w", "s");
  const wheel = keyAxis("d", "a");
  if (car) {
    const top = car.model === "Kite RS" ? 395 : 270;
    const braking = heldKey(" ");
    car.speed =
      clampNum(car.speed + gas * 220 * dt, -95, top) *
      Math.pow(braking ? 0.1 : gas ? 0.98 : 0.49, dt);
    car.a += wheel * 2.8 * dt * clampNum(Math.abs(car.speed) / 55, 0, 1) * Math.sign(car.speed);
    const nx = car.x + Math.cos(car.a) * car.speed * dt;
    const ny = car.y + Math.sin(car.a) * car.speed * dt;
    if (blocked(nx, ny)) {
      if (Math.abs(car.speed) > 85) {
        damage(7);
        playSound("crash");
        burst(car);
      }
      car.speed *= -0.35;
    } else {
      car.x = nx;
      car.y = ny;
    }
    ME.x = car.x;
    ME.y = car.y;
    ME.a = car.a;
  } else {
    viewYaw += wheel * 2.65 * dt;
    const fx = Math.cos(viewYaw) * gas;
    const fy = Math.sin(viewYaw) * gas;
    if (gas || wheel) ME.a = viewYaw + (gas < 0 ? Math.PI : 0);
    if (!blocked(ME.x + fx * dt * 113, ME.y)) ME.x += fx * dt * 113;
    if (!blocked(ME.x, ME.y + fy * dt * 113)) ME.y += fy * dt * 113;
  }
}
