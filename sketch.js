// Wave-driven neon halftone sphere + mouse magnet (smooth, distance-based)
// Light background optimized + multi-color neon themes + animated gradient bg

let t = 0;
let points = [];

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

// 기본 위도/경도 저장용 + bulge 상태
let lightDir = { x: 0.35, y: 0.8, z: 0.5 };

// 현재 테마
let currentTheme = "orange"; // "orange" | "blue" | "purple" | "green"

function mapValue(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}
function clamp(v, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, v));
}

// 외부(index.html)에서 호출할 수 있게 전역 함수로 등록
window.setNeonTheme = function (theme) {
  currentTheme = theme;
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  pixelDensity(2);

  // 라이트 벡터 정규화
  let len = Math.sqrt(
    lightDir.x * lightDir.x +
      lightDir.y * lightDir.y +
      lightDir.z * lightDir.z
  ) || 1;
  lightDir.x /= len;
  lightDir.y /= len;
  lightDir.z /= len;

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
  // 현재 활성 테마
  let theme = currentTheme;
blendMode(BLEND);   // 🔥 필수, 안 하면 구가 눌려서 안 보임

  // 테마별 부드러운 배경 그라디언트
  drawBackgroundGradient(theme);

  let sphereRadius = Math.min(width, height) * 0.4;

  // 구 약간 자동 회전
  let angleY = t * 0.22;
  let angleX = -Math.PI / 7 + Math.sin(t * 0.12) * 0.05;

  let centerX = width * 0.55;
  let centerY = height * 0.55;
  translate(centerX, centerY);

  // 전체 펄스
  let globalPulse = 1.0 + 0.05 * Math.sin(t * 0.9);

  // 마우스 로컬 좌표
  let localMouseX = mouseX - centerX;
  let localMouseY = mouseY - centerY;

  let magnetRadius = sphereRadius * 0.7;

  for (let i = 0; i < points.length; i++) {
    let p = points[i];

    // ---- 1) 파도 변조 ----
    let lat0 = p.baseLat;
    let lon0 = p.baseLon;
    let waveTime = t * 1.0;

    let waveLat =
      0.18 * Math.sin(lon0 * 3.0 + waveTime * 1.2) +
      0.06 * Math.sin(lat0 * 6.0 - waveTime * 1.8);

    let waveLon =
      0.16 * Math.sin(lat0 * 2.4 - waveTime * 1.0) +
      0.05 * Math.sin(lon0 * 5.0 + waveTime * 2.1);

    let lat = lat0 + waveLat;
    let lon = lon0 + waveLon;

    // ---- 2) 위도/경도 → 유닛 벡터 ----
    let yN = Math.sin(lat);
    let rN = Math.cos(lat);
    let xN = rN * Math.cos(lon);
    let zN = rN * Math.sin(lon);

    let nLen = Math.sqrt(xN * xN + yN * yN + zN * zN) || 1;
    let nx = xN / nLen,
      ny = yN / nLen,
      nz = zN / nLen;

    // ---- 3) 기본 반지름 적용 ----
    let x = nx * sphereRadius;
    let y = ny * sphereRadius;
    let z = nz * sphereRadius;

    // ---- 4) 카메라 회전 ----
    let x1 = x * Math.cos(angleY) + z * Math.sin(angleY);
    let z1 = -x * Math.sin(angleY) + z * Math.cos(angleY);

    let y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
    let z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX);

    // ---- 5) 마우스 거리 기반 "자석 효과" 계산 ----
    let dx = x1 - localMouseX;
    let dy = y1 - localMouseY;
    let dist2d = Math.sqrt(dx * dx + dy * dy);

    let desiredInfluence = 0.0;
    if (dist2d < magnetRadius) {
      let norm = 1.0 - dist2d / magnetRadius;
      desiredInfluence = Math.pow(norm, 1.5); // 중앙부가 더 강하게
    }

    // "물처럼" 부드럽게 변화하는 bulge 값
    p.bulge += (desiredInfluence - p.bulge) * 0.18;

    // 반지름 확장
    let radiusScale = 1.0 + 0.28 * p.bulge;
    x1 *= radiusScale;
    y1 *= radiusScale;
    z2 *= radiusScale;

    // ---- 6) 깊이값 ----
    let depth = mapValue(
      z2,
      -sphereRadius * 1.4,
      sphereRadius * 1.2,
      0.12,
      1.0
    );
    depth = clamp(depth, 0, 1);

    // ---- 7) 림 계산 ----
    let radial2D = Math.sqrt(x1 * x1 + y1 * y1);
    let rimRaw = mapValue(
      radial2D,
      sphereRadius * 0.93,
      sphereRadius * 1.05,
      0,
      1
    );
    let rim = clamp(rimRaw, 0, 1);
    rim = Math.pow(rim, 2.0);

    // ---- 8) 조명 ----
    let lightDot = Math.max(
      0,
      nx * lightDir.x + ny * lightDir.y + nz * lightDir.z
    );
    let shade = Math.pow(lightDot, 1.4);

    // ---- 9) 파도 기반 밝기 ----
    let waveMag = Math.sqrt(waveLat * waveLat + waveLon * waveLon);
    let waveBright = clamp(waveMag / 0.25, 0, 1);

    // ---- 10) 점 크기 ----
    let dotSize =
      (BASE_SIZE +
        MAX_EXTRA_SIZE * depth * (0.35 + 0.65 * shade)) *
      (1.0 + 0.25 * (waveBright - 0.5)) *
      (1.0 + 0.04 * Math.sin(t * 1.8 + depth * 3.0)) *
      globalPulse *
      (1.0 + rim * 0.35);

    // ---- 11) 테마 기반 색상/알파 계산 ----
    let col = computeThemeColor(
      theme,
      rim,
      shade,
      waveBright,
      p.bulge,
      depth,
      globalPulse
    );

    fill(col.r, col.g, col.b, col.a);
    circle(x1, y1, dotSize);
  }

  t += 0.01;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ========================
// 배경 그라디언트 애니메이션
// ========================
function drawBackgroundGradient(theme) {
  let steps = 40;
  for (let i = 0; i < steps; i++) {
    let p = i / (steps - 1);
    let y = p * height;

    // 파도치는 듯한 subtle wobble
    let wobble = 0.06 * Math.sin(t * 0.35 + p * 5.0);
    let mix = clamp(p + wobble, 0, 1);

    let c1, c2;

    if (theme === "orange") {
      c1 = { r: 250, g: 244, b: 235 };
      c2 = { r: 245, g: 227, b: 205 };
    } else if (theme === "blue") {
      c1 = { r: 236, g: 242, b: 252 };
      c2 = { r: 224, g: 233, b: 250 };
    } else if (theme === "purple") {
      c1 = { r: 243, g: 238, b: 252 };
      c2 = { r: 231, g: 222, b: 249 };
    } else if (theme === "green") {
      c1 = { r: 238, g: 248, b: 241 };
      c2 = { r: 222, g: 241, b: 230 };
    } else {
      // fallback
      c1 = { r: 245, g: 245, b: 247 };
      c2 = { r: 240, g: 240, b: 244 };
    }

    let rr = lerp(c1.r, c2.r, mix);
    let gg = lerp(c1.g, c2.g, mix);
    let bb = lerp(c1.b, c2.b, mix);

    noStroke();
    fill(rr, gg, bb);
    rect(0, y, width, height / steps + 2);
  }
}

// ========================
// 테마별 네온 색상/알파 계산
// ========================
function computeThemeColor(
  theme,
  rim,
  shade,
  waveBright,
  bulge,
  depth,
  globalPulse
) {
  let baseR, baseG, baseB;

  if (theme === "orange") {
    // FFA239
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

  // 에너지 레벨 (발광 강도)
  let energy =
    0.45 * rim + 0.3 * shade + 0.2 * waveBright + 0.25 * bulge; // 0~대략 1 사이

  let colR = clamp(baseR + 140 * energy, 0, 255);
  let colG = clamp(baseG + 120 * energy, 0, 255);
  let colB = clamp(baseB + 100 * energy, 0, 255);

  // 테마별 알파/글로우 튜닝
  let glowBase, glowRim, glowShade, glowWave, glowBulge, alphaBase, alphaDepth, alphaGlowMul;

  if (theme === "orange") {
    glowBase = 0;
    glowRim = 170;
    glowShade = 90;
    glowWave = 75;
    glowBulge = 70;
    alphaBase = 160;
    alphaDepth = 300;
    alphaGlowMul = 2.5;
  } else if (theme === "blue") {
    glowBase = 0;
    glowRim = 140;
    glowShade = 85;
    glowWave = 70;
    glowBulge = 60;
    alphaBase = 150;
    alphaDepth = 280;
    alphaGlowMul = 2.3;
  } else if (theme === "purple") {
    glowBase = 0;
    glowRim = 150;
    glowShade = 85;
    glowWave = 80;
    glowBulge = 70;
    alphaBase = 155;
    alphaDepth = 290;
    alphaGlowMul = 2.4;
  } else if (theme === "green") {
    glowBase = 0;
    glowRim = 130;
    glowShade = 80;
    glowWave = 70;
    glowBulge = 60;
    alphaBase = 150;
    alphaDepth = 270;
    alphaGlowMul = 2.2;
  } else {
    glowBase = 0;
    glowRim = 160;
    glowShade = 90;
    glowWave = 75;
    glowBulge = 70;
    alphaBase = 160;
    alphaDepth = 300;
    alphaGlowMul = 2.5;
  }

  let glow =
    glowBase +
    glowRim * rim +
    glowShade * shade +
    glowWave * waveBright +
    glowBulge * bulge;

 let alpha =
    (alphaBase + alphaDepth * depth + glow * alphaGlowMul) *
    (1.0 + 0.15 * globalPulse);

  return { r: colR, g: colG, b: colB, a: alpha };
}
