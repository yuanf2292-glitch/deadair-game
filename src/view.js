// The 3D view: Three.js, dusk light, wet streets. Static geometry is
// collected per material and baked into instanced meshes once; cars and
// people are live groups repositioned every frame. Only objects near the
// courier are kept visible.
const T = THREE;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(63, 1, 1, 2300);
const unitBox = new T.BoxGeometry(1, 1, 1);
const unitBall = new T.SphereGeometry(1, 10, 7);
const unitTube = new T.CylinderGeometry(1, 1, 1, 12);
const scratch = new T.Object3D();
const staticBatches = new Map();
const liveActors = new Map();
const scatter = makeStream(199807);
let webgl = null;
let lastFrame = -10;
let eyePos = new T.Vector3();
let lookAt = new T.Vector3();
let yawNow = 0;

scene.fog = new T.FogExp2(0x8b798d, 0.00095);
scene.add(new T.HemisphereLight(0xffe3d7, 0x52678d, 1.85));
const sun = new T.DirectionalLight(0xffc292, 2.5);
sun.position.set(-340, 470, -220);
scene.add(sun);

const matte = new T.MeshStandardMaterial({ roughness: 0.76 });
const glowMat = new T.MeshBasicMaterial();
const pane = new T.MeshStandardMaterial({ metalness: 0.32, roughness: 0.22 });

// Paint a small canvas and turn it into a texture.
function paintTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function texMaterial(tex, emissive = false) {
  return emissive
    ? new T.MeshBasicMaterial({ map: tex })
    : new T.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

// Queue one box (or other unit geometry) into the static batch for its
// material; everything is baked into instanced meshes at the end.
function addBox(x, y, z, w, h, d, color, geo = unitBox, mat = matte, rx = 0, ry = 0, rz = 0) {
  const key = geo.uuid + "|" + mat.uuid;
  if (!staticBatches.has(key)) staticBatches.set(key, { geo, mat, items: [] });
  scratch.position.set(x, y, z);
  scratch.rotation.set(rx, ry, rz);
  scratch.scale.set(w, h, d);
  scratch.updateMatrix();
  staticBatches.get(key).items.push([scratch.matrix.clone(), color]);
}

function bakeStatic(parent) {
  for (const b of staticBatches.values()) {
    const mesh = new T.InstancedMesh(b.geo, b.mat, b.items.length);
    b.items.forEach(([m, c], i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new T.Color(c));
    });
    mesh.computeBoundingSphere();
    mesh.castShadow = b.mat !== glowMat;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  staticBatches.clear();
}

// A strut between two points, for lamp arms, crane frames and palm trunks.
function addStrut(x1, y1, z1, x2, y2, z2, r, color) {
  const a = new T.Vector3(x1, y1, z1);
  const v = new T.Vector3(x2 - x1, y2 - y1, z2 - z1);
  scratch.position.copy(a).addScaledVector(v, 0.5);
  scratch.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.clone().normalize());
  scratch.scale.set(r, v.length(), r);
  scratch.updateMatrix();
  const key = unitTube.uuid + "|" + matte.uuid;
  if (!staticBatches.has(key)) {
    staticBatches.set(key, { geo: unitTube, mat: matte, items: [] });
  }
  staticBatches.get(key).items.push([scratch.matrix.clone(), color]);
}

// Seven facade patterns: a base wash, speckle, then a grid of windows,
// some lit warm, some lit cool, most dark.
const FACADE_BASE = ["#666470", "#8d8988", "#405264", "#636c6f", "#817574", "#8c7f6c", "#3a4b5c"];
const facades = [];
for (let k = 0; k < 7; k++) {
  facades.push(
    texMaterial(
      paintTexture(256, 256, (c, w, h) => {
        c.fillStyle = FACADE_BASE[k];
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) {
          c.fillStyle = scatter() < 0.5 ? "#ffffff12" : "#00000012";
          c.fillRect(scatter() * w, scatter() * h, 1 + scatter() * 3, 1);
        }
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 6; col++) {
            const x = 8 + col * 42;
            const y = 8 + row * 27;
            const lit = scatter();
            c.fillStyle = "#23272f";
            c.fillRect(x - 2, y - 2, 30, 20);
            c.fillStyle =
              lit > 0.86 ? "#f2c184" : lit > 0.72 ? "#aebfb2" : lit > 0.3 ? "#5d7080" : "#37434f";
            c.fillRect(x, y, 26, 16);
            c.fillStyle = "#20242c";
            c.fillRect(x + 12, y, 2, 16);
          }
        }
      }),
    ),
  );
}

const SHOPS = [
  "NIGHT TIDE",
  "SALT MARKET",
  "MIRA MOTORS",
  "CHANNEL 07",
  "KITE CLUB",
  "LOW WATER",
  "HOTEL ORBIT",
  "FEN SHIPPING",
  "SEA GLASS",
];
const signMats = SHOPS.map((name, i) =>
  texMaterial(
    paintTexture(512, 96, (c, w, h) => {
      c.fillStyle = ["#382c38", "#193d48", "#523334"][i % 3];
      c.fillRect(0, 0, w, h);
      c.fillStyle = ["#ffaa7e", "#8ff8e3", "#ff92ad"][i % 3];
      c.fillRect(9, 7, w - 18, 3);
      c.fillRect(9, h - 10, w - 18, 3);
      c.shadowBlur = 7;
      c.shadowColor = c.fillStyle;
      c.font = "bold 49px sans-serif";
      c.textAlign = "center";
      c.fillText(name, w / 2, 65, 480);
    }),
    true,
  ),
);

// Sky gradient with a low skyline silhouette, used as the environment
// map so paint and glass pick up the dusk colours.
const skyTex = paintTexture(512, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#243145");
  g.addColorStop(0.35, "#718799");
  g.addColorStop(0.49, "#ecb39e");
  g.addColorStop(0.56, "#515466");
  g.addColorStop(1, "#252631");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 80; i++) {
    const x = scatter() * w;
    const y = 109 + scatter() * 33;
    c.fillStyle = drawOne(["#3c4054", "#505465", "#3c4a51"]);
    c.fillRect(x, y, 6 + scatter() * 12, 150 - y);
    c.fillStyle = "#ecad73";
    c.fillRect(x, y + 3, 1, 3);
  }
});
skyTex.mapping = T.EquirectangularReflectionMapping;

const carPaint = new T.MeshStandardMaterial({
  envMap: skyTex,
  envMapIntensity: 1.35,
  metalness: 0.55,
  roughness: 0.2,
  side: T.DoubleSide,
});
pane.envMap = skyTex;
pane.envMapIntensity = 1.4;
pane.metalness = 0.65;
matte.side = pane.side = T.DoubleSide;

const plateTex = texMaterial(
  paintTexture(128, 44, (c) => {
    c.fillStyle = "#dbc99b";
    c.fillRect(0, 0, 128, 44);
    c.fillStyle = "#3f423c";
    c.font = "bold 26px monospace";
    c.fillText("KQ·984", 14, 33);
  }),
);

function addLamp(x, z, side) {
  addBox(x, 20, z, 1.2, 40, 1.2, "#455061");
  addStrut(x, 39, z, x - side * 9, 42, z, 0.7, "#344453");
  addBox(x - side * 10, 42, z, 6, 1.4, 2.5, "#ffdda4", unitBox, glowMat);
  addBox(x - side * 9, 0.16, z, 3, 0.03, 20, "#6d645e");
}

let palmLeaves = [];
function addPalm(x, z, h) {
  const lean = 4;
  addStrut(x, 0, z, x + lean, h, z, 1.6, "#6d5d53");
  for (let i = 0; i < 9; i++) {
    const a = i * 2.5;
    const len = 15 + scatter() * 9;
    const tip = new T.Vector3(
      x + lean + Math.cos(a) * len,
      h - 5 - scatter() * 6,
      z + Math.sin(a) * len,
    );
    const mid = new T.Vector3(
      x + lean + Math.cos(a) * len * 0.55,
      h + 6,
      z + Math.sin(a) * len * 0.55,
    );
    const root = new T.Vector3(x + lean, h, z);
    for (const j of [-1, 1]) {
      const p = mid
        .clone()
        .add(new T.Vector3(-Math.sin(a) * 3 * j, 0, Math.cos(a) * 3 * j));
      palmLeaves.push(...root.toArray(), ...p.toArray(), ...mid.toArray());
      palmLeaves.push(...mid.toArray(), ...p.toArray(), ...tip.toArray());
    }
  }
}

function addBuilding(x, z, w, d, h, id, side, storefront = true) {
  const k = Math.abs(id) % 7;
  addBox(x, h / 2 + 2, z, w, h, d, "#ffffff", unitBox, facades[k]);
  addBox(x, h + 2, z, w + 2, 2, d + 2, "#9a9397");
  addBox(x + 4, h + 7, z + 6, w * 0.29, 9, d * 0.24, "#758087");
  if (!storefront) return;
  const front = z + side * (d / 2 + 0.5);
  addBox(x, 9, front, w - 1, 14, 1, "#283640", unitBox, pane);
  for (let j = -2; j <= 2; j++) {
    addBox(x + j * 13, 9, front + side, 10, 10, 1, j % 2 ? "#b18a75" : "#77918d");
    addBox(x + j * 13, 8, front + side * 1.8, 0.5, 11, 0.3, "#352e38");
  }
  addBox(x, 20, front + side, Math.min(w, 63), 9, 1, "#ffffff", unitBox, signMats[(id + 9) % 9]);
  addBox(x, 16, front + side * 2, w + 1, 1.4, 6, "#4b4e5a");
}

function addContainerYard(x, z) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const X = x + 25 + i * 55;
      const Z = z + 25 + j * 56;
      const col = ["#a14d3d", "#3b727a", "#7c7b71"][(i + j) % 3];
      const h = 12 + (i % 2) * 12;
      addBox(X, h / 2 + 2, Z, 48, h, 24, col);
      for (let a = -20; a < 22; a += 4) addBox(X + a, h / 2 + 2, Z - 12, 0.8, h, 1, "#473b42");
    }
  }
  for (const xx of [0, 130]) {
    for (const zz of [12, 110]) addStrut(x + xx, 2, z + zz, x + xx, 96, z + zz, 2.2, "#b67248");
    addStrut(x + xx, 94, z + 12, x + xx, 94, z + 110, 3, "#be754c");
  }
  for (const zz of [12, 110]) {
    addStrut(x, 94, z + zz, x + 154, 94, z + zz, 3, "#ce8150");
    addStrut(x, 106, z + zz, x + 154, 106, z + zz, 1.5, "#c78356");
    for (let a = 0; a < 150; a += 22) {
      addStrut(x + a, 94, z + zz, x + a + 11, 106, z + zz, 1.1, "#965443");
    }
  }
}

function addNightMarket(x, z) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const X = x + 17 + i * 43;
      const Z = z + 17 + j * 55;
      for (const a of [-14, 14]) {
        for (const b of [-11, 11]) addBox(X + a, 9, Z + b, 0.8, 16, 0.8, "#716467");
      }
      addBox(X, 6, Z, 29, 6, 17, "#947a5c");
      for (let k = 0; k < 7; k++) {
        addBox(X - 15 + k * 5, 18, Z, 5, 2.5, 26, k % 2 ? "#dfb995" : ["#a14942", "#497d7d"][(i + j) % 2]);
        addBox(X - 15 + k * 5, 16, Z - 13, 5, 4, 0.7, k % 2 ? "#dfb995" : "#ac6351");
      }
      for (let k = 0; k < 6; k++) {
        addBox(X - 10 + scatter() * 22, 10, Z - 7 + scatter() * 12, 2, 2, 2, "#d5874b", unitBall);
      }
    }
  }
  for (const s of [0, 1]) {
    addStrut(x, 27, z + s * 146, x + 159, 27, z + s * 146, 0.22, "#4c4542");
    for (let k = 0; k < 10; k++) {
      addBox(x + k * 17, 26, z + s * 146, 1.1, 1.7, 1.1, "#ffc993", unitBall, glowMat);
    }
  }
}

function addRelayTower(x, z) {
  addBuilding(x + 75, z + 78, 140, 120, 34, 3, -1);
  const X = x + 68;
  const Z = z + 70;
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    addStrut(X + a * 11, 35, Z + b * 11, X + a, 148, Z + b, 1.2, "#bb645d");
    for (let k = 0; k < 6; k++) {
      const w = 11 - k * 1.65;
      addStrut(
        X + a * w, 36 + k * 18, Z + b * w,
        X - a * (w - 1.65), 54 + k * 18, Z + b * (w - 1.65),
        0.62, "#c6ada1",
      );
    }
  }
  addStrut(X, 146, Z, X, 177, Z, 0.65, "#a7948e");
  addBox(X, 178, Z, 1.5, 1.5, 1.5, "#ff4038", unitBall, glowMat);
}

function buildCity() {
  addBox(EDGE / 2, -6, EDGE / 2, 7900, 2, 7900, "#446875", unitBox, pane);
  const asphalt = paintTexture(512, 512, (c, w, h) => {
    c.fillStyle = "#3b404e";
    c.fillRect(0, 0, w, h);
    const im = c.getImageData(0, 0, w, h);
    for (let i = 0; i < im.data.length; i += 4) {
      const n = (scatter() - 0.5) * 28;
      for (let j = 0; j < 3; j++) im.data[i + j] += n;
    }
    c.putImageData(im, 0, 0);
    for (let i = 0; i < 80; i++) {
      c.fillStyle = "#727a8c32";
      c.fillRect(scatter() * 512, scatter() * 512, 10 + scatter() * 72, 0.6 + scatter() * 2);
    }
  });
  asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping;
  asphalt.repeat.set(28, 28);
  const roadMat = new T.MeshStandardMaterial({
    map: asphalt,
    roughness: 0.43,
    envMap: skyTex,
    envMapIntensity: 0.48,
    metalness: 0.28,
  });
  addBox(EDGE / 2, -1, EDGE / 2, EDGE + 156, 2, EDGE + 156, "#ffffff", unitBox, roadMat);
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = i * BLOCK;
      const z = j * BLOCK;
      for (let k = 66; k < 260; k += 31) {
        if (i < GRID - 1) {
          addBox(x + k, 0.09, z, 17, 0.06, 0.9, "#c6ad7d");
          addBox(x + k, 0.08, z + 2, 17, 0.06, 0.7, "#c6ad7d");
        }
        if (j < GRID - 1) {
          addBox(x, 0.09, z + k, 0.9, 0.06, 17, "#c6ad7d");
          addBox(x + 2, 0.08, z + k, 0.7, 0.06, 17, "#c6ad7d");
        }
      }
      for (let n = -40; n < 46; n += 10) {
        for (const q of [-56, 56]) {
          addBox(x + n, 0.1, z + q, 4.8, 0.06, 10, "#a4a5ad");
          addBox(x + q, 0.1, z + n, 10, 0.06, 4.8, "#a4a5ad");
        }
      }
      if (i < GRID - 1) {
        for (const side of [-1, 1]) {
          addLamp(x + 145, z + side * 53, side);
          addPalm(x + 215, z + side * 61, 39 + scatter() * 13);
        }
      }
    }
  }
  for (const b of cells) {
    const x = b.x;
    const z = b.y;
    addBox(x + 82, 0.9, z + 82, 205, 1.8, 205, "#998e93");
    if ((b.i === 1 && b.j === 1) || (b.i === 2 && b.j === 0)) {
      addContainerYard(x, z);
      continue;
    }
    if ((b.i === 3 && b.j === 3) || (b.i === 4 && b.j === 4)) {
      addNightMarket(x, z);
      continue;
    }
    if (b.i === 1 && b.j === 2) {
      addRelayTower(x, z);
      continue;
    }
    if (b.park) {
      for (let j = 0; j < 8; j++) addPalm(x + scatter() * 155, z + scatter() * 155, 43 + scatter() * 21);
      addBox(x + 82, 2, z + 82, 167, 2, 160, "#41534e");
      continue;
    }
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const X = x + 38 + i * 85;
        const Z = z + 38 + j * 84;
        const H = 38 + scatter() * 40 + (b.i > 2 ? scatter() * 120 : 0);
        addBuilding(X, Z, 72 + scatter() * 7, 71, H, b.i + i + b.j + j, j === 0 ? -1 : 1);
      }
    }
    if ((b.i + b.j) % 3 === 0) {
      const X = x + 85;
      const Z = z + 85;
      addStrut(X, 60, Z, X, 160, Z, 1.5, "#bd8478");
      addBox(X, 161, Z, 2, 2, 2, "#ff4e42", unitBall, glowMat);
    }
  }
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * TAU;
    const r = 1750 + scatter() * 420;
    addBuilding(
      EDGE / 2 + Math.cos(a) * r,
      EDGE / 2 + Math.sin(a) * r,
      50 + scatter() * 70,
      50 + scatter() * 70,
      90 + scatter() * 340,
      i,
      1,
      false,
    );
  }
  for (let i = 0; i < 8; i++) {
    const x = i * BLOCK;
    const z = -180;
    addStrut(x, 0, z, x, 200, z, 4, "#967168");
    addStrut(x + 30, 0, z, x, 190, z, 3, "#967168");
    addStrut(x - 95, 152, z, x + 135, 180, z, 3, "#937067");
    addStrut(x - 95, 152, z, x, 209, z, 1.3, "#5b5461");
    addStrut(x, 209, z, x + 135, 180, z, 1.3, "#5b5461");
    addStrut(x + 120, 178, z, x + 120, 65, z, 0.6, "#514c57");
  }
  const leafGeo = new T.BufferGeometry();
  leafGeo.setAttribute("position", new T.Float32BufferAttribute(palmLeaves, 3));
  leafGeo.computeVertexNormals();
  scene.add(new T.Mesh(leafGeo, new T.MeshStandardMaterial({ color: 0x2b4841, side: T.DoubleSide })));
  buildFurniture();
  bakeStatic(scene);
}

function buildFurniture() {
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      const X = i * BLOCK;
      const Z = j * BLOCK;
      for (const [dx, dz] of [[-51, -50], [51, 50]]) {
        const x = X + dx;
        const z = Z + dz;
        addStrut(x, 0, z, x, 35, z, 0.73, "#485365");
        addStrut(x, 35, z, x - dx * 0.66, 35, z, 0.68, "#515365");
        const tx = x - dx * 0.66;
        addBox(tx, 32, z, 3.3, 7, 2.6, "#303540");
        for (let k = 0; k < 3; k++) {
          addBox(
            tx, 34 - k * 2, z + Math.sign(dz) * 1.5, 1, 1, 0.45,
            k === (i + j) % 3 ? ["#ff7363", "#ffc779", "#81ffd2"][k] : "#483c40",
            unitBall, glowMat,
          );
        }
      }
      if ((i + j) % 2 === 0) {
        for (let s = 0; s < 3; s++) {
          const z = Z - 54 + s * 1.5;
          addStrut(X - 56, 47, z, X + 100, 40, z, 0.16, "#242a37");
          addStrut(X + 100, 40, z, X + 264, 47, z, 0.16, "#242a37");
        }
        addStrut(X - 56, 0, Z - 54, X - 56, 48, Z - 54, 1.2, "#5c5455");
      }
      for (let k = 0; k < 4; k++) {
        const x = X + 76 + k * 46;
        const z = Z + 62;
        addBox(x, 1.1, z, 34, 2.2, 2.6, "#aa9e9c");
        if (k % 2 === 0) {
          addBox(x, 3.5, z + 3, 11, 1.4, 3, "#805e4d");
          addBox(x, 5.5, z + 4, 11, 3, 0.6, "#936a53");
          addBox(x - 4, 1.8, z + 3, 0.8, 3, 1, "#44434a");
          addBox(x + 4, 1.8, z + 3, 0.8, 3, 1, "#44434a");
        }
      }
    }
  }
}

// Cars are built from boxes: a low body, a cabin, a hood and a boot,
// four wheels, headlights and tail lights. The Fen Runner and the Barge
// get a roof box; the patrol car gets a light bar; the Kite RS gets a
// rear wing. A soft glow underneath grounds the car on the street.
const wheelGeo = new T.CylinderGeometry(1, 1, 1, 18);
const haloTex = paintTexture(64, 64, (c) => {
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.12, "#ffffffb0");
  g.addColorStop(0.5, "#ffffff26");
  g.addColorStop(1, "#fff0");
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
});

function addGlow(root, x, y, z, w, h, color, alpha = 0.65) {
  const mat = new T.MeshBasicMaterial({
    map: haloTex,
    color,
    transparent: true,
    opacity: alpha,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  root.add(m);
  return m;
}

function buildCarMesh(car) {
  const parts = new Map();
  const root = new T.Group();
  const put = (x, y, z, w, h, d, col, geo = unitBox, mat = carPaint, rx = 0, ry = 0, rz = 0) => {
    const key = geo.uuid + "|" + mat.uuid;
    if (!parts.has(key)) parts.set(key, { geo, mat, items: [] });
    scratch.position.set(x, y, z);
    scratch.rotation.set(rx, ry, rz);
    scratch.scale.set(w, h, d);
    scratch.updateMatrix();
    parts.get(key).items.push([scratch.matrix.clone(), col]);
  };
  // Body: long low slab, cabin, hood and boot slopes.
  put(0, 4.5, 0, 42, 5, 19, car.paint);
  put(0, 8.5, 0, 22, 5, 16, "#263e50", unitBox, pane);
  put(16, 6.5, 0, 10, 2.5, 17, car.paint, unitBox, carPaint, 0, 0, -0.18);
  put(-16, 6.5, 0, 10, 2.5, 17, car.paint, unitBox, carPaint, 0, 0, 0.18);
  put(0, 7.2, 0, 42, 0.7, 19.4, "#10141a");
  for (const s of [-1, 1]) {
    for (const x of [-13, 13]) {
      put(x, 4.3, s * 9.2, 4.3, 2, 4.3, "#171b22", wheelGeo, matte, Math.PI / 2);
      put(x, 4.3, s * 10.3, 2.75, 0.25, 2.75, "#40444b", wheelGeo, matte, Math.PI / 2);
      put(x, 4.3, s * 10.6, 0.65, 0.3, 0.65, "#90969e", wheelGeo, matte, Math.PI / 2);
    }
    put(0, 7, s * 9.8, 27, 0.65, 0.5, "#acb3ad");
    put(6, 9, s * 10, 2, 1.4, 2.8, car.paint);
    put(-2, 10.8, s * 8.3, 0.65, 4.6, 0.65, car.paint);
    put(-20.8, 6, s * 5.7, 0.7, 1.8, 5.2, "#ff443c", unitBox, glowMat);
    put(20.8, 6, s * 5.7, 0.8, 2.1, 5.2, "#fff5c3", unitBox, glowMat);
  }
  put(-21.3, 3.6, 0, 1, 1.3, 17, "#35363c");
  put(-21.6, 5.5, 0, 0.4, 1.65, 4.8, "#ffffff", unitBox, plateTex);
  put(-20.8, 6, 0, 0.65, 2.6, 16, "#292934");
  put(21.32, 4, 0, 0.65, 1.4, 14, "#1d2229");
  put(21.35, 3.1, 0, 0.7, 0.55, 16, "#878283");
  if (car.model === "Fen Runner" || car.model === "Barge 8") {
    put(-6, 12, 0, 18, 6.7, 16.5, car.paint);
    for (const s of [-1, 1]) put(-5, 12.5, s * 8.35, 15, 3.7, 0.28, "#334957", unitBox, pane);
    put(-15.15, 12.2, 0, 0.3, 3.2, 13, "#344552", unitBox, pane);
  }
  if (car.model === "PATROL") {
    put(-1, 15, 0, 3, 1, 13, "#273043");
    put(-1, 16, -4, 3, 1.3, 5, "#ff274f", unitBox, glowMat);
    put(-1, 16, 4, 3, 1.3, 5, "#4696ff", unitBox, glowMat);
  }
  if (car.model === "Kite RS") {
    put(-18, 10, 0, 4, 1.2, 22, car.paint);
    put(-18, 8, 0, 2, 4, 11, "#303034");
  }
  bakeStaticInto(parts, root);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(52, 29),
    new T.MeshBasicMaterial({
      map: haloTex,
      color: 0x010716,
      opacity: 0.85,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.position.set(1, 0.19, 1.6);
  shadow.rotation.x = -Math.PI / 2;
  root.add(shadow);
  addGlow(root, 38, 0.23, 0, 65, 23, 0xffe3a1, 0.53);
  addGlow(root, -25, 0.24, 0, 24, 20, 0xff3826, 0.65);
  if (car.model === "PATROL") {
    root.userData.strobe = addGlow(root, 0, 0.3, 0, 76, 75, 0x246bff, 0.95);
  }
  scene.add(root);
  return root;
}

function bakeStaticInto(groups, parent) {
  for (const b of groups.values()) {
    const mesh = new T.InstancedMesh(b.geo, b.mat, b.items.length);
    b.items.forEach(([m, c], i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new T.Color(c));
    });
    mesh.computeBoundingSphere();
    parent.add(mesh);
  }
}

// A walker: torso, head, hair, arms and legs, with a walk swing.
function buildPersonMesh(root, coat, isHero) {
  const piece = (geo, col, x, y, z, w, h, d) => {
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: col }));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    root.add(m);
    return m;
  };
  piece(unitBall, coat, 0, 9.7, 0, 2.2, 3.3, 3);
  piece(unitBall, "#c68e73", 0.15, 15.1, 0, 1.7, 2.2, 1.65);
  piece(unitBall, "#332d31", -0.15, 16.4, 0, 1.8, 1.1, 1.75);
  const legs = [];
  const arms = [];
  for (const s of [-1, 1]) {
    legs.push(piece(unitTube, "#283346", 0, 4, 1.4 * s, 1.2, 7, 1.1));
    arms.push(piece(unitTube, coat, 0.15, 9.1, 3 * s, 1, 5.6, 1));
    piece(unitBall, "#28262c", 0.6, 1, 1.4 * s, 1.8, 0.85, 1.25);
  }
  if (isHero) piece(unitBox, "#40342d", -2.1, 9.5, 0, 2, 4.5, 5);
  root.userData = { legs, arms };
  return root;
}

function swingLimbs(root, t, moving) {
  root.userData.legs.forEach((leg, i) => {
    const v = moving ? Math.sin(t + i * Math.PI) * 0.48 : 0;
    leg.rotation.z = v;
    root.userData.arms[i].rotation.z = -v * 0.8;
  });
}

const heroMesh = buildPersonMesh(new T.Group(), "#d3673d", true);
scene.add(heroMesh);

const targetRing = new T.Mesh(
  new T.TorusGeometry(16, 0.8, 8, 48),
  new T.MeshBasicMaterial({ color: 0xffb451 }),
);
targetRing.rotation.x = -Math.PI / 2;
scene.add(targetRing);
const targetGem = new T.Mesh(
  new T.OctahedronGeometry(3.8),
  new T.MeshBasicMaterial({ color: 0xffb451 }),
);
scene.add(targetGem);
const pulseRing = new T.Mesh(
  new T.TorusGeometry(1, 0.019, 6, 60),
  new T.MeshBasicMaterial({ color: 0x95ffee }),
);
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);

function placeActor(mesh, p, angle) {
  mesh.position.set(p.x, 0, p.y);
  mesh.rotation.y = -angle;
}

function clearActors() {
  for (const mesh of liveActors.values()) {
    scene.remove(mesh);
    mesh.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
    });
  }
  liveActors.clear();
}

function drawFrame() {
  if (!webgl) {
    try {
      webgl = new T.WebGLRenderer({
        canvas: el("screen"),
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      webgl.setClearColor(0, 0);
      webgl.shadowMap.enabled = true;
      webgl.shadowMap.type = T.PCFShadowMap;
      sun.castShadow = true;
      Object.assign(sun.shadow.camera, {
        left: -160,
        right: 160,
        top: 160,
        bottom: -160,
        near: 1,
        far: 900,
      });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.bias = -0.0008;
      scene.add(sun.target);
      buildCity();
    } catch (err) {
      W.mode = "pause";
      showModal("GRAPHICS / WEBGL", "Graphics unavailable.", "Enable hardware acceleration in Chrome, then reload.", [
        ["Reload", () => location.reload()],
      ]);
      return;
    }
  }
  const w = el("screen").clientWidth;
  const h = el("screen").clientHeight;
  const dpr = Math.min(devicePixelRatio, 1.3);
  if (
    webgl.domElement.width !== Math.round(w * dpr) ||
    webgl.domElement.height !== Math.round(h * dpr)
  ) {
    webgl.setPixelRatio(dpr);
    webgl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const visible = new Set();
  for (const c of [...W.parked, ...W.flow, ...W.patrol]) {
    if (gap(c, ME) > 470) continue;
    visible.add(c);
    if (!liveActors.has(c)) liveActors.set(c, buildCarMesh(c));
    const mesh = liveActors.get(c);
    mesh.visible = true;
    placeActor(mesh, c, c.a);
    const strobe = mesh.userData.strobe;
    if (strobe) {
      strobe.material.color.setHex(Math.sin(W.t * 15) > 0 ? 0xff2449 : 0x387dff);
      strobe.material.opacity = 0.7 + 0.3 * Math.sin(W.t * 30);
    }
  }
  for (const p of W.walkers) {
    if (gap(p, ME) > 230) continue;
    visible.add(p);
    if (!liveActors.has(p)) {
      const mesh = buildPersonMesh(new T.Group(), p.coat, false);
      liveActors.set(p, mesh);
      scene.add(mesh);
    }
    const mesh = liveActors.get(p);
    mesh.visible = true;
    placeActor(mesh, p, p.dir > 0 ? 0 : Math.PI);
    swingLimbs(mesh, W.t * 6 + p.y, true);
  }
  for (const [p, mesh] of liveActors) {
    if (!visible.has(p)) mesh.visible = false;
  }
  heroMesh.visible = !ME.ride;
  placeActor(heroMesh, ME, ME.a);
  swingLimbs(heroMesh, W.t * 9, heldKey("w") || heldKey("s") || heldKey("a") || heldKey("d"));
  const stop = currentStop();
  targetRing.position.set(stop.x, 0.35, stop.y);
  targetGem.position.set(stop.x, 17 + 2 * Math.sin(W.t * 3), stop.y);
  targetGem.rotation.y = W.t * 1.4;
  pulseRing.visible = W.t - W.ripple < 0.44;
  pulseRing.scale.setScalar(Math.max(0.1, (W.t - W.ripple) * 240));
  pulseRing.position.set(ME.x, 2, ME.y);
  const dt = clampNum(W.t - lastFrame, 0, 0.05);
  const snap = lastFrame < 0 || lastFrame > W.t;
  lastFrame = W.t;
  if (ME.ride) {
    yawNow += Math.atan2(Math.sin(ME.a - yawNow), Math.cos(ME.a - yawNow)) * (snap ? 1 : 1 - Math.exp(-5 * dt));
    if (!dragging) {
      const want = W.demo === "chase" ? 2.44 + 0.16 * Math.sin(W.t * 0.33) : 0;
      camOrbit += (want - camOrbit) * (snap ? 1 : 1 - Math.exp(-2.8 * dt));
    }
  } else {
    yawNow = viewYaw;
  }
  const a = yawNow + camOrbit;
  const back = ME.ride ? 64 + Math.abs(ME.ride.speed) * 0.05 : 42;
  const vx = Math.cos(a);
  const vz = Math.sin(a);
  const goal = new T.Vector3(ME.x - vx * back, ME.ride ? 25 : 22, ME.y - vz * back);
  for (let k = 0; k < 14 && blocked(goal.x, goal.z); k++) {
    goal.x += (ME.x - goal.x) * 0.15;
    goal.z += (ME.y - goal.z) * 0.15;
  }
  eyePos.lerp(goal, snap ? 1 : 1 - Math.exp(-15 * dt));
  lookAt.set(ME.x + vx * (ME.ride ? 51 : 24), ME.ride ? 11 : 10, ME.y + vz * (ME.ride ? 51 : 24));
  camera.position.copy(eyePos);
  camera.lookAt(lookAt);
  sun.target.position.set(ME.x, 0, ME.y);
  sun.position.set(ME.x - 290, 430, ME.y - 220);
  webgl.render(scene, camera);
}

let dragging = false;
let dragMoved = 0;
let dragX = 0;
el("screen").onpointerdown = (e) => {
  if (e.pointerType === "touch") return;
  dragging = true;
  dragX = e.clientX;
  dragMoved = 0;
  el("screen").setPointerCapture(e.pointerId);
};
el("screen").onpointermove = (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragX;
  dragX = e.clientX;
  dragMoved += Math.abs(dx);
  if (ME.ride) camOrbit += dx * 0.006;
  else viewYaw += dx * 0.006;
};
el("screen").onpointerup = () => {
  if (dragging && dragMoved < 5) arcPulse();
  dragging = false;
};
