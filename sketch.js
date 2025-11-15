// Wave-driven neon halftone sphere + mouse magnet (smooth, distance-based)
// Light background optimized + FFA239 ORANGE NEON version

let t = 0;
let points = [];

const DOT_COUNT = 5200;
const BASE_SIZE = 0.7;
const MAX_EXTRA_SIZE = 1.0;

// 기본 위도/경도 저장용 + bulge 상태
let lightDir = { x: 0.35, y: 0.8, z: 0.5 };

function mapValue(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}
function clamp(v, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, v));
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  pixelDensity(2);

  // 라이트 벡터 정규화
  let len = Math.sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2) || 1;
  lightDir.x /= len; lightDir.y /= len; lightDir.z /= len;

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
      bulge: 0
    });
  }
}

function draw() {

  // 라이트배경 (애플 느낌)
  background(245, 245, 247);

  let sphereRadius = Math.min(width, height) * 0.40;

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

    let nLen = Math.sqrt(xN*xN + yN*yN + zN*zN) || 1;
    let nx = xN/nLen, ny=yN/nLen, nz=zN/nLen;

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
    let dist2d = Math.sqrt(dx*dx + dy*dy);

    let desiredInfluence = 0.0;
    if (dist2d < magnetRadius) {
      let norm = 1.0 - dist2d / magnetRadius;
      desiredInfluence = norm ** 1.5;
    }

    // "물처럼" 부드럽게 변화하는 bulge 값
    p.bulge += (desiredInfluence - p.bulge) * 0.18;

    // 반지름 확장
    let radiusScale = 1.0 + 0.28 * p.bulge;
    x1 *= radiusScale;
    y1 *= radiusScale;
    z2 *= radiusScale;

    // ---- 6) 깊이값 ----
    let depth = mapValue(z2, -sphereRadius*1.4, sphereRadius*1.2, 0.12, 1.0);
    depth = clamp(depth, 0, 1);

    // ---- 7) 림 계산 (화이트 배경용 넓혀서 조정) ----
    let radial2D = Math.sqrt(x1*x1 + y1*y1);
    let rim = mapValue(radial2D, sphereRadius*0.93, sphereRadius*1.05, 0, 1);
    rim = clamp(rim, 0, 1);
    rim = rim ** 2.0;

    // ---- 8) 조명 ----
    let lightDot = Math.max(0, nx*lightDir.x + ny*lightDir.y + nz*lightDir.z);
    let shade = lightDot ** 1.4;

    // ---- 9) 파도 기반 밝기 ----
    let waveMag = Math.sqrt(waveLat*waveLat + waveLon*waveLon);
    let waveBright = clamp(waveMag / 0.25, 0, 1);

    // ---- 10) 점 크기 ----
    let dotSize =
      (BASE_SIZE +
       MAX_EXTRA_SIZE * depth * (0.35 + 0.65 * shade)) *
      (1.0 + 0.25 * (waveBright - 0.5)) *
      (1.0 + 0.04 * Math.sin(t*1.8 + depth*3.0)) *
      globalPulse *
      (1.0 + rim * 0.35);

    // ---- 11) ORANGE NEON (FFA239) 색상 구성 ----
    let baseR = 255;
    let baseG = 162;
    let baseB = 57;

    let colR = clamp(baseR + 40*rim + 30*shade, 0, 255);
    let colG = clamp(baseG + 25*rim + 20*shade, 0, 255);
    let colB = clamp(baseB + 20*rim + 15*shade, 0, 255);

    // ---- 12) 발광량(glow) 강화 ----
    let glowBoost =
      160 * rim +
      90 * shade +
      75 * waveBright +
      70 * p.bulge;

    // ---- 13) 알파(화이트 배경 대응 강화) ----
    let alpha =
      (160 + 300 * depth + glowBoost * 2.5) *
      (1.0 + 0.3 * globalPulse);

    // ---- 14) 최종 렌더 ----
    fill(colR, colG, colB, alpha);
    circle(x1, y1, dotSize);
  }

  t += 0.01;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
