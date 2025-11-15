// Wave-driven neon halftone sphere + mouse magnet (smooth, distance-based)
// Multi-color neon themes + DARK GREY gradient background

let t = 0;
let points = [];

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

// 기본 조명 방향
let lightDir = { x: 0.35, y: 0.8, z: 0.5 };

// 현재 테마 (index.html에서 버튼으로 바뀜)
let currentTheme = "orange";

// 유틸 함수
function mapValue(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}
function clamp(v, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, v));
}

// index.html에서 호출하는 전역 테마 변경 함수
window.setNeonTheme = function (theme) {
  currentTheme = theme;
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  pixelDensity(2);

  // 라이트 벡터 정규화
  let len =
    Math.sqrt(
      lightDir.x * lightDir.x +
        lightDir.y * lightDir.y +
        lightDir.z * lightDir.z
    ) || 1;
  lightDir.x /= len;
  lightDir.y /= len;
  lightDir.z /= len;

  // 골든 앵글로 균일한 구 표면 점 생성
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOT_COUNT; i++) {
    let y = 1 - (i / (DOT_COUNT - 1)) * 2; // -1 ~ 1
    let radius = Math.sqrt(1 - y * y);     // 수평반경
    let theta = goldenAngle * i;

    let x = Math.cos(theta) * radius;
    let z = Math.sin(theta) * radius;

    let lat = Math.asin(y);          // -PI/2 ~ PI/2
    let lon = Math.atan2(z, x);      // -PI ~ PI

    points.push({
      baseLat: lat,
      baseLon: lon,
      bulge: 0.0,                   // 자석 영향 (시간에 따라 부드럽게 변함)
    });
  }
}

function draw() {
  // 🔻 어두운 회색 그라디언트 배경
  drawBackgroundGradient();

  let sphereRadius = Math.min(width, height) * 0.4;

  // 카메라 살짝 자동 회전
  let angleY = t * 0.22;
  let angleX = -Math.PI / 7 + Math.sin(t * 0.12) * 0.05;

  let centerX = width * 0.55;
  let centerY = height * 0.55;
  translate(centerX, centerY);

  let globalPulse = 1.0 + 0.05 * Math.sin(t * 0.9);

  // 마우스 기준 로컬 좌표
  let localMouseX = mouseX - centerX;
  let localMouseY = mouseY - centerY;

  let magnetRadius = sphereRadius * 0.7;

  for (let i = 0; i < points.length; i++) {
    let p = points[i];

    // 1) 파도 모션 (위도/경도 변조)
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

    // 2) 위도/경도 → 유닛 벡터
    let yN = Math.sin(lat);
    let rN = Math.cos(lat);
    let xN = rN * Math.cos(lon);
    let zN = rN * Math.sin(lon);

    let nLen = Math.sqrt(xN * xN + yN * yN + zN * zN) || 1;
    let nx = xN / nLen;
    let ny = yN / nLen;
    let nz = zN / nLen;

    // 3) 구 반지름 적용
    let x = nx * sphereRadius;
    let y = ny * sphereRadius;
    let z = nz * sphereRadius;

    // 4) 카메라 회전
    let x1 = x * Math.cos(angleY) + z * Math.sin(angleY);
    let z1 = -x * Math.sin(angleY) + z * Math.cos(angleY);

    let y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
    let z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX);

    // 5) 마우스 자석 효과
    let dx = x1 - localMouseX;
    let dy = y1 - localMouseY;
    let dist2d = Math.sqrt(dx * dx + dy * dy);

    let desiredInfluence = 0.0;
    if (dist2d < magnetRadius) {
      let norm = 1.0 - dist2d / magnetRadius; // 0~1
      desiredInfluence = Math.pow(norm, 1.5); // 중앙부가 더 강하게
    }

    // 부드러운 lerp (물처럼 왔다갔다)
    p.bulge = p.bulge + (desiredInfluence - p.bulge) * 0.18;

    let radiusScale = 1.0 + 0.28 * p.bulge;
    x1 *= radiusScale;
    y1 *= radiusScale;
    z2 *= radiusScale;

    // 6) 깊이/림/조명 계산
    let depth = mapValue(
      z2,
      -sphereRadius * 1.4,
      sphereRadius * 1.2,
      0.12,
      1.0
    );
    depth = clamp(depth, 0, 1);

    let radial2D = Math.sqrt(x1 * x1 + y1 * y1);
    let rimRaw = mapValue(
      radial2D,
      sphereRadius * 0.93,
      sphereRadius * 1.05,
      0,
      1
    );
    let rim = clamp(rimRaw, 0, 1);
    rim = Math.pow(rim, 2.0); // 림을 살짝 넓고 부드럽게

    let lightDot = Math.max(
      0,
      nx * lightDir.x + ny * lightDir.y + nz * lightDir.z
    );
    let shade = Math.pow(lightDot, 1.4);

    let waveMag = Math.sqrt(waveLat * waveLat + waveLon * waveLon);
    let waveBright = clamp(waveMag / 0.25, 0, 1);

    // 7) 점 크기
    let dotSize =
      (BASE_SIZE +
        MAX_EXTRA_SIZE * depth * (0.35 + 0.65 * shade)) *
      (1.0 + 0.25 * (waveBright - 0.5)) *
      (1.0 + 0.04 * Math.sin(t * 1.8 + depth * 3.0)) *
      globalPulse *
      (1.0 + rim * 0.35);

    // 8) 테마 기반 색상 계산
    let col = computeThemeColor(
      currentTheme,
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

// =============================================
// DARK GREY 그라디언트 배경
// =============================================
function drawBackgroundGradient() {
  let steps = 40;

  for (let i = 0; i < steps; i++) {
    let p = i / (steps - 1);
    let y = p * height;

    // 너무 과하지 않게 살짝만 출렁이는 느낌
    let wobble = 0.015 * Math.sin(t * 0.25 + p * 4.0);
    let mix = clamp(p + wobble, 0, 1);

    // Dark grey gradient (#1b1b1c → #0e0e10)
    let c1 = { r: 27, g: 27, b: 28 };
    let c2 = { r: 14, g: 14, b: 16 };

    let rr = lerp(c1.r, c2.r, mix);
    let gg = lerp(c1.g, c2.g, mix);
    let bb = lerp(c1.b, c2.b, mix);

    noStroke();
    fill(rr, gg, bb);
    rect(0, y, width, height / steps + 2);
  }

  // 혼합 모드 초기화 (혹시 모를 블렌드 문제 방지)
  blendMode(BLEND);
}

// =============================================
// 테마별 네온 컬러/알파 계산
// =============================================
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
    baseR = 255;
    baseG = 162;
    baseB = 57; // FFA239
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

  // 에너지 (네온 발광 강도)
  let energy =
    0.45 * rim + 0.3 * shade + 0.2 * waveBright + 0.25 * bulge;

  let colR = clamp(baseR + 140 * energy, 0, 255);
  let colG = clamp(baseG + 120 * energy, 0, 255);
  let colB = clamp(baseB + 100 * energy, 0, 255);

  let glow =
    150 * rim +
    90 * shade +
    75 * waveBright +
    70 * bulge;

  let alpha =
    (160 + 300 * depth + glow * 2.4) *
    (1.0 + 0.25 * globalPulse);

  return { r: colR, g: colG, b: colB, a: alpha };
}
