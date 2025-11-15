// Neon Sphere + Wave + Magnet + Color Themes + Dark Background
// + Audio Reactive (mic) + external enableMicFromOutside()

let t = 0;
let points = [];
let mic = null;
let audioActive = false;

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

let lightDir = { x: 0.35, y: 0.8, z: 0.5 };
let currentTheme = "orange";

// Utils
function mapValue(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}
function clamp(v, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, v));
}

// index.html에서 호출할 테마 변경 함수
window.setNeonTheme = function (theme) {
  currentTheme = theme;
};

// index.html에서 호출할 마이크 활성화 함수
window.enableMicFromOutside = function () {
  if (!mic) {
    mic = new p5.AudioIn();
  }
  mic.start();
  audioActive = true;
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  pixelDensity(2);

  // Light vector normalize
  let L =
    Math.sqrt(
      lightDir.x * lightDir.x +
        lightDir.y * lightDir.y +
        lightDir.z * lightDir.z
    ) || 1;
  lightDir.x /= L;
  lightDir.y /= L;
  lightDir.z /= L;

  // Golden angle sphere distribution
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOT_COUNT; i++) {
    let y = 1 - (i / (DOT_COUNT - 1)) * 2;
    let r = Math.sqrt(1 - y * y);
    let theta = ga * i;

    let x = Math.cos(theta) * r;
    let z = Math.sin(theta) * r;

    points.push({
      baseLat: Math.asin(y),
      baseLon: Math.atan2(z, x),
      bulge: 0,
    });
  }
}

function draw() {
  drawBackground();

  // mic level
  let micLevel = 0.0;
  if (audioActive && mic) {
    micLevel = mic.getLevel();
  }
  let audioEnergy = clamp(micLevel * 3.5, 0, 1);

  let R = Math.min(width, height) * 0.4;

  let angleY = t * 0.22;
  let angleX = -Math.PI / 7 + Math.sin(t * 0.12) * 0.05;

  let cx = width * 0.55;
  let cy = height * 0.55;
  translate(cx, cy);

  let globalPulse =
    1 + 0.05 * Math.sin(t * 0.9) + audioEnergy * 0.35;

  let mX = mouseX - cx;
  let mY = mouseY - cy;
  let magnetR = R * 0.7;

  for (let p of points) {
    // 1) Wave motion
    let lat0 = p.baseLat;
    let lon0 = p.baseLon;
    let wt = t;

    let waveBoost = 1 + audioEnergy * 1.3;

    let wLat =
      (0.18 * waveBoost) * Math.sin(lon0 * 3 + wt * 1.2) +
      (0.06 * waveBoost) * Math.sin(lat0 * 6 - wt * 1.8);

    let wLon =
      (0.16 * waveBoost) * Math.sin(lat0 * 2.4 - wt * 1.0) +
      (0.05 * waveBoost) * Math.sin(lon0 * 5 + wt * 2.1);

    let lat = lat0 + wLat;
    let lon = lon0 + wLon;

    // 2) Lat/Lon → unit vector
    let yN = Math.sin(lat);
    let rN = Math.cos(lat);
    let xN = rN * Math.cos(lon);
    let zN = rN * Math.sin(lon);

    let NL = Math.sqrt(xN * xN + yN * yN + zN * zN) || 1;
    let nx = xN / NL,
      ny = yN / NL,
      nz = zN / NL;

    let x = nx * R;
    let y = ny * R;
    let z = nz * R;

    // 3) Camera rotation
    let x1 = x * Math.cos(angleY) + z * Math.sin(angleY);
    let z1 = -x * Math.sin(angleY) + z * Math.cos(angleY);

    let y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
    let z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX);

    // 4) Magnet (mouse)
    let dx = x1 - mX;
    let dy = y1 - mY;
    let d2 = Math.sqrt(dx * dx + dy * dy);

    let target = 0;
    if (d2 < magnetR) {
      let n = 1 - d2 / magnetR;
      target = Math.pow(n, 1.5);
    }

    // bulge reacts to audio + magnet
    p.bulge += ((target + audioEnergy * 0.25) - p.bulge) * 0.18;

    let s = 1 + 0.28 * p.bulge;
    x1 *= s;
    y1 *= s;
    z2 *= s;

    // 5) Depth / Rim / Shade
    let depth = clamp(
      mapValue(z2, -R * 1.4, R * 1.2, 0.12, 1),
      0,
      1
    );

    let rimV = clamp(
      mapValue(
        Math.sqrt(x1 * x1 + y1 * y1),
        R * 0.93,
        R * 1.05,
        0,
        1
      ),
      0,
      1
    );
    let rim = rimV * rimV;

    let shade = Math.max(
      0,
      nx * lightDir.x + ny * lightDir.y + nz * lightDir.z
    );
    shade = shade ** 1.4;

    let waveBright = clamp(
      Math.sqrt(wLat * wLat + wLon * wLon) / 0.25,
      0,
      1
    );

    // 6) Dot size
    let dotSize =
      (BASE_SIZE +
        MAX_EXTRA_SIZE * depth * (0.35 + 0.65 * shade)) *
      (1 + 0.25 * (waveBright - 0.5)) *
      (1 + audioEnergy * 0.8) *
      (1 + 0.04 * Math.sin(t * 1.8 + depth * 3)) *
      globalPulse *
      (1 + rim * 0.35);

    // 7) Color
    let col = computeColor(
      currentTheme,
      rim,
      shade,
      waveBright,
      p.bulge,
      depth,
      globalPulse,
      audioEnergy
    );

    fill(col.r, col.g, col.b, col.a);
    circle(x1, y1, dotSize);
  }

  t += 0.01;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Dark gradient background
function drawBackground() {
  let steps = 40;
  for (let i = 0; i < steps; i++) {
    let p = i / (steps - 1);
    let y = p * height;

    let wobble = 0.015 * Math.sin(t * 0.25 + p * 4);
    let mix = clamp(p + wobble, 0, 1);

    let c1 = { r: 27, g: 27, b: 28 };
    let c2 = { r: 14, g: 14, b: 16 };

    let r = lerp(c1.r, c2.r, mix);
    let g = lerp(c1.g, c2.g, mix);
    let b = lerp(c1.b, c2.b, mix);

    noStroke();
    fill(r, g, b);
    rect(0, y, width, height / steps + 2);
  }

  blendMode(BLEND);
}

// Color engine
function computeColor(
  theme,
  rim,
  shade,
  waveB,
  bulge,
  depth,
  pulse,
  audioEnergy
) {
  let baseR, baseG, baseB;

  if (theme === "orange") {
    baseR = 255;
    baseG = 162;
    baseB = 57;
  } else if (theme === "blue") {
    baseR = 90;
    baseG = 160;
    baseB = 255;
  } else if (theme === "purple") {
    baseR = 190;
    baseG = 130;
    baseB = 255;
  } else if (theme === "green") {
    baseR = 120;
    baseG = 220;
    baseB = 150;
  } else {
    baseR = 255;
    baseG = 162;
    baseB = 57;
  }

  let energy =
    0.45 * rim +
    0.3 * shade +
    0.2 * waveB +
    0.25 * bulge +
    audioEnergy * 0.8;

  let r = clamp(baseR + 140 * energy, 0, 255);
  let g = clamp(baseG + 120 * energy, 0, 255);
  let b = clamp(baseB + 100 * energy, 0, 255);

  let glow =
    150 * rim +
    90 * shade +
    75 * waveB +
    70 * bulge +
    audioEnergy * 200;

  let a =
    (160 + 300 * depth + glow * 2.4) *
    (1 + 0.25 * pulse);

  return { r, g, b, a };
}
