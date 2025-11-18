// Neon Sphere – Enhanced Layout Version (central canvas + responsive scale)

let t = 0;
let points = [];
let mic = null;
let audioActive = false;

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

let lightDir = { x: 0.35, y: 0.8, z: 0.5 };
let currentTheme = "orange";

window.setNeonTheme = (theme) => (currentTheme = theme);
window.enableMicFromOutside = () => {
  if (!mic) mic = new p5.AudioIn();
  mic.start();
  audioActive = true;
};

function setup() {
  const w = min(windowWidth, 900);  // 🔥 가독성 좋은 최대 폭 제한
  const h = w;

  const canvas = createCanvas(w, h);
  canvas.parent("canvas-wrapper");

  noStroke();
  pixelDensity(2);

  let L = sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2) || 1;
  lightDir.x /= L; lightDir.y /= L; lightDir.z /= L;

  const ga = PI * (3 - sqrt(5));
  for (let i = 0; i < DOT_COUNT; i++) {
    let y = 1 - (i/(DOT_COUNT - 1))*2;
    let r = sqrt(1 - y*y);
    let theta = ga * i;

    let x = cos(theta)*r;
    let z = sin(theta)*r;

    points.push({
      baseLat: asin(y),
      baseLon: atan2(z, x),
      bulge: 0,
    });
  }
}

function draw() {
  drawBackground();

  let micLevel = audioActive && mic ? mic.getLevel() : 0;
  let audioEnergy = constrain(micLevel * 3.5, 0, 1);

  let R = min(width, height) * 0.4;
  let angleY = t * 0.22;
  let angleX = -PI/7 + sin(t*0.12)*0.05;

  translate(width/2, height/2);

  let globalPulse = 1 + 0.05 * sin(t*0.9) + audioEnergy*0.35;

  let mX = mouseX - width/2;
  let mY = mouseY - height/2;
  let magnetR = R * 0.7;

  for (let p of points) {
    let lat0 = p.baseLat;
    let lon0 = p.baseLon;
    let wt = t;

    let waveBoost = 1 + audioEnergy * 1.3;

    let wLat =
      0.18 * waveBoost * sin(lon0*3 + wt*1.2) +
      0.06 * waveBoost * sin(lat0*6 - wt*1.8);

    let wLon =
      0.16 * waveBoost * sin(lat0*2.4 - wt*1.0) +
      0.05 * waveBoost * sin(lon0*5 + wt*2.1);

    let lat = lat0 + wLat;
    let lon = lon0 + wLon;

    let yN = sin(lat);
    let rN = cos(lat);
    let xN = rN*cos(lon);
    let zN = rN*sin(lon);

    let NL = sqrt(xN*xN + yN*yN + zN*zN) || 1;
    let nx = xN/NL, ny=yN/NL, nz=zN/NL;

    let x = nx * R;
    let y = ny * R;
    let z = nz * R;

    let x1 = x*cos(angleY) + z*sin(angleY);
    let z1 = -x*sin(angleY) + z*cos(angleY);

    let y1 = y*cos(angleX) - z1*sin(angleX);
    let z2 = y*sin(angleX) + z1*cos(angleX);

    let dx = x1 - mX;
    let dy = y1 - mY;
    let d2 = sqrt(dx*dx + dy*dy);

    let target = 0;
    if (d2 < magnetR) target = pow(1 - d2/magnetR, 1.5);

    p.bulge += ((target + audioEnergy*0.25) - p.bulge) * 0.18;

    let s = 1 + 0.28 * p.bulge;
    x1 *= s; y1 *= s; z2 *= s;

    let depth = constrain(map(z2, -R*1.4, R*1.2, 0.12, 1), 0, 1);

    let rimV = constrain(map(sqrt(x1*x1 + y1*y1),
         R*0.93, R*1.05, 0, 1), 0, 1);
    let rim = rimV*rimV;

    let shade = max(0, nx*lightDir.x + ny*lightDir.y + nz*lightDir.z);
    shade = shade**1.4;

    let waveBright = constrain(
      sqrt(wLat*wLat + wLon*wLon) / 0.25, 0, 1
    );

    let dotSize =
      (BASE_SIZE +
       MAX_EXTRA_SIZE * depth*(0.35 + 0.65*shade)) *
      (1 + 0.25*(waveBright - 0.5)) *
      (1 + audioEnergy*0.8) *
      (1 + 0.04*sin(t*1.8 + depth*3)) *
      globalPulse *
      (1 + rim*0.35);

    let col = computeColor(
      currentTheme, rim, shade, waveBright,
      p.bulge, depth, globalPulse, audioEnergy
    );

    fill(col.r, col.g, col.b, col.a);
    circle(x1, y1, dotSize);
  }

  t += 0.01;
}

function drawBackground() {
  let steps = 40;
  for (let i = 0; i < steps; i++) {
    let p = i/(steps-1);
    let y = p * height;
    let wobble = 0.015 * sin(t*0.25 + p*4);
    let mix = constrain(p + wobble, 0, 1);

    let c1 = { r: 27, g: 27, b: 28 };
    let c2 = { r: 14, g: 14, b: 16 };

    let r = lerp(c1.r, c2.r, mix);
    let g = lerp(c1.g, c2.g, mix);
    let b = lerp(c1.b, c2.b, mix);

    noStroke();
    fill(r, g, b);
    rect(0, y, width, height/steps + 2);
  }
}

function windowResized() {
  const w = min(windowWidth, 900);
  const h = w;
  resizeCanvas(w, h);
}

function computeColor(theme, rim, shade, waveB, bulge, depth, pulse, audioEnergy) {
  let baseR, baseG, baseB;

  if (theme === "orange")   [baseR, baseG, baseB] = [255, 162, 57];
  else if (theme === "blue")   [baseR, baseG, baseB] = [90, 160, 255];
  else if (theme === "purple") [baseR, baseG, baseB] = [190, 130, 255];
  else if (theme === "green")  [baseR, baseG, baseB] = [120, 220, 150];
  else                         [baseR, baseG, baseB] = [255, 162, 57];

  let energy =
    0.45*rim + 0.3*shade + 0.2*waveB + 0.25*bulge +
    audioEnergy * 0.8;

  let r = constrain(baseR + 140*energy, 0, 255);
  let g = constrain(baseG + 120*energy, 0, 255);
  let b = constrain(baseB + 100*energy, 0, 255);

  let glow =
    150*rim + 90*shade + 75*waveB + 70*bulge +
    audioEnergy * 200;

  let a =
    (160 + 300*depth + glow*2.4) *
    (1 + 0.25*pulse);

  return { r, g, b, a };
}
