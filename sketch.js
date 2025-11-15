// Wave-driven neon halftone sphere + mouse magnet (smooth)
// Multi-color neon themes + DARK GREY gradient background

let t = 0;
let points = [];

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

let lightDir = { x: 0.35, y: 0.8, z: 0.5 };
let currentTheme = "orange";

function mapValue(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}
function clamp(v, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, v));
}

// 테마 변경 함수
window.setNeonTheme = function (theme) {
  currentTheme = theme;
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  pixelDensity(2);

  // Normalize light vector
  let len = Math.sqrt(
    lightDir.x * lightDir.x +
      lightDir.y * lightDir.y +
      lightDir.z * lightDir.z
  ) || 1;
  lightDir.x /= len;
  lightDir.y /= len;
  lightDir.z /= len;

  // Golden angle sampling
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOT_COUNT; i++) {
    let y = 1 - (i / (DOT_COUNT - 1)) * 2;
    let radius = Math.sqrt(1 - y * y);
    let theta = goldenAngle * i;

    let x = Math.cos(theta) * radius;
    let z = Math.sin(theta) * radius;

    points.push({
      baseLat: Math.asin(y),
      baseLon: Math.atan2(z, x),
      bulge: 0,
    });
  }
}

function draw() {
  drawBackgroundGradient();

  let sphereRadius = Math.min(width, height) * 0.40;

  let angleY = t * 0.22;
  let angleX = -Math.PI / 7 + Math.sin(t * 0.12) * 0.05;

  let centerX = width * 0.55;
  let centerY = height * 0.55;
  translate(centerX, centerY);

  let globalPulse = 1.0 + 0.05 * Math.sin(t * 0.9);

  let localMouseX = mouseX - centerX;
  let localMouseY = mouseY - centerY;
  let magnetRadius = sphereRadius * 0.7;

  for (let p of points) {
    //---------------------------------------
    // Wave motion
    //---------------------------------------
    let lat0 = p.baseLat;
    let lon0 = p.baseLon;
    let waveTime = t * 1.0;

    let waveLat =
      0.18 * Math.sin(lon0 * 3 + waveTime * 1.2) +
      0.06 * Math.sin(lat0 * 6 - waveTime * 1.8);

    let waveLon =
      0.16 * Math.sin(lat0 * 2.4 - waveTime * 1) +
      0.05 * Math.sin(lon0 * 5 + waveTime * 2.1);

    let lat = lat0 + waveLat;
    let lon = lon0 + waveLon;

    //---------------------------------------
    // Sphere position from lat/lon
    //---------------------------------------
    let yN = Math.sin(lat);
    let rN = Math.cos(lat);
    let xN = rN * Math.cos(lon);
    let zN = rN * Math.sin(lon);

    let nLen = Math.sqrt(xN*xN + yN*yN + zN*zN) || 1;
    let nx = xN/nLen, ny=yN/nLen, nz=zN/nLen;

    let x = nx * sphereRadius;
    let y = ny * sphereRadius;
    let z = nz * sphereRadius;

    //---------------------------------------
    // Camera rotation
    //---------------------------------------
    let x1 = x * Math.cos(angleY) + z * Math.sin(angleY);
    let z1 = -x * Math.sin(angleY) + z * Math.cos(angleY);

    let y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
    let z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX);

    //---------------------------------------
    // Magnet effect (mouse)
    //---------------------------------------
    let dx = x1 - localMouseX;
    let dy = y1 - localMouseY;
    let dist2d = Math.sqrt(dx*dx + dy*dy);

    let desired = 0;
    if (dist2d < magnetRadius) {
      let norm = 1 - dist2d / magnetRadius;
      desired = Math.pow(norm, 1.5);
    }

    p.bulge += (desired - p.bulge) * 0.18;

    let scale = 1.0 + 0.28 * p.bulge;
    x1 *= scale;
    y1 *= scale;
    z2 *= scale;

    //---------------------------------------
    // Depth / Rim / Shading
    //---------------------------------------
    let depth = mapValue(z2, -sphereRadius*1.4, sphereRadius*1.2, 0.12, 1.0);
    depth = clamp(depth, 0, 1);

    let radial2D = Math.sqrt(x1*x1 + y1*y1);
    let rim = mapValue(radial2D, sphereRadius*0.93, sphereRadius*1.05, 0, 1);
    rim = clamp(rim, 0, 1);
    rim = rim ** 2.0;

    let lightDot = Math.max(0, nx*lightDir.x + ny*lightDir.y + nz*lightDir.z);
    let shade = lightDot ** 1.4;

    let waveBright = clamp(Math.sqrt(waveLat*waveLat + waveLon*waveLon)/0.25, 0, 1);

    //---------------------------------------
    // Dot size
    //---------------------------------------
    let dotSize =
      (BASE_SIZE +
       MAX_EXTRA_SIZE * depth * (0.35 + 0.65 * shade)) *
      (1 + 0.25*(waveBright - 0.5)) *
      (1 + 0.04 * Math.sin(t*1.8 + depth*3)) *
      globalPulse *
      (1 + rim * 0.35);

    //---------------------------------------
    // Theme color
    //---------------------------------------
    let col = computeThemeColor(
      currentTheme, rim, shade, waveBright, p.bulge, depth, globalPulse
    );

    fill(col.r, col.g, col.b, col.a);
    circle(x1, y1, dotSize);
  }

  t += 0.01;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// DARK GREY GRADIENT
function drawBackgroundGradient() {
  let steps = 40;

  for (let i = 0; i < steps; i++) {
    let p = i / (steps - 1);
    let y = p * height;

    let wobble = 0.015 * Math.sin(t * 0.25 + p * 4.0);
    let mix = clamp(p + wobble, 0, 1);

    let c1 = { r: 27, g: 27, b: 28 };
    let c2 = { r: 14, g: 14, b: 16 };

    let rr = lerp(c1.r, c2.r, mix);
    let gg = lerp(c1.g, c2.g, mix);
    let bb = lerp(c1.b, c2.b, mix);

    fill(rr, gg, bb);
    noStroke();
    rect(0, y, width, height / steps + 2);
  }

  blendMode(BLEND);
}

// THEME COLOR ENGINE
function computeThemeColor(theme, rim, shade, waveBright, bulge, depth, globalPulse) {
  let baseR, baseG, baseB;

  if (theme === "orange") {
    baseR = 255; baseG = 162; baseB = 57;  // FFA239
  } else if (theme === "blue") {
    baseR = 90; baseG = 160; baseB = 255;
  } else if (theme === "purple") {
    baseR = 190; baseG = 130; baseB = 255;
  } else if (theme === "green") {
    baseR = 120; baseG = 220; baseB = 150;
  } else {
    baseR = 255; baseG = 162; baseB = 57;
  }

  let energy =
    0.45 * rim + 0.3 * shade + 0.2 * waveBright + 0.25 * bulge;

  let colR = clamp(baseR + 140 * energy, 0, 255);
  let colG = clamp(baseG + 120 * energy, 0, 255);
  let colB = clamp(baseB + 100 * energy, 0, 255);

  let glow =
    150 * rim + 90 * shade + 75 * waveBright + 70 * bulge;

  let alpha =
    (160 + 300 * depth + glow * 2.4) *
    (1 + 0.25 * globalPulse);

  return { r: colR, g: colG, b: colB, a: alpha };
}
