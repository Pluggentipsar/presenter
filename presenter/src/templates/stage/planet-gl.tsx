"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionLive } from "./sim";
import k from "./skala.module.css";

/**
 * Planeten i WebGL (visualiseringspasset nr 14, 2 oktober 2026). Ett riktigt klot i stället för
 * planetbilden på nivå 10⁷: NASA:s jord i oktober (Blue Marble Next Generation), nattljusen (Black
 * Marble 2016) och molnen (Blue Marble), med solljus, gränsen mellan dag och natt, ett glitter i haven,
 * städernas ljus på nattsidan och atmosfären längs kanten. I gryningen (fältet dygn) går solen bakom
 * jorden: nattsidan med städernas ljus vänds mot oss och kanten lyser varmt, under CSS-solen i skala.tsx.
 *
 * Klotet ritas av en enda fragmentskuggare som träffar en sfär per bildpunkt (ingen modell). Canvasen
 * ligger otransformerad över hela världen och skuggaren räknar själv baklänges genom kamerans och nivåns
 * transformer, så klotet är skarpt även när kameran är nära (horisont) och medan zoomen går in.
 * Placeringen är densamma som planetbildens: mitt (1155, 452), radie 344 i nivåns 1600 × 900, med
 * ekvatorn i mitten och mittmeridianen 22° öst (vindfältet i sim-wind.ts räknar likadant).
 *
 * Utan WebGL, innan texturerna har laddats och i miniatyrer står planetbilden kvar: canvasen får
 * data-on först när klotet är ritat, och då tonar bilden bort (skala.module.css). Molnen driver långsamt
 * bara när förlopp får spela (useMotionLive); stilla lägen och granskningens ram ritar en fast bild.
 */

const DIR = "/bilder/skala";
const TEXTURES = [`${DIR}/jorden-dag.webp`, `${DIR}/jorden-natt.webp`, `${DIR}/jorden-moln.webp`];
export const GLOBE = { x: 1155, y: 452, r: 344 };
/** Kamerans ursprung i skala.module.css (.cam, transform-origin). */
const CAM_ORIGIN = { x: 1155, y: 450 };
const LON0 = 22 * Math.PI / 180;
/** Solen i vyns rum (x höger, y upp, z mot betraktaren): dag snett framifrån vänster, gryning bakom jorden. */
const SUN_DAY = [-.62, .32, .72];
const SUN_DAWN = [.16, .56, -.81];
/** Molnens drift i varv per sekund (ungefär 0,2 grader i sekunden). */
const CLOUD_SPEED = .2 / 360;

/** Nivån 10⁷:s placering i kamerans rum, i bildpunkter (som placeLevels), och kamerans förskjutning och skala. */
export type GlobePlace = { x: number; y: number; r: number };
export type GlobeCam = { x: number; y: number; s: number };

const VERT = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";

const FRAG = `
precision highp float;
uniform vec2 uSize;
uniform vec4 uMap;
uniform vec3 uGlobe;
uniform float uPx;
uniform vec3 uSun;
uniform float uBehind;
uniform float uLon0;
uniform float uCloud;
uniform float uClear;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
const float PI = 3.14159265;

void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 L = px * uMap.xy + uMap.zw;
  vec2 d = (L - uGlobe.xy) / uGlobe.z;
  float len = length(d);
  float aa = 1.2 / max(uGlobe.z * uPx, 1.0);
  vec3 sky = vec3(0.30, 0.56, 1.0);
  vec3 warm = vec3(1.0, 0.60, 0.30);

  // Atmosfären utanför kanten: blå där solen lyser, varm framåtspridning när solen står bakom jorden.
  vec2 dir = len > 0.0 ? d / len : vec2(0.0, -1.0);
  float facing = dot(vec3(dir.x, -dir.y, 0.0), uSun);
  float lit = smoothstep(-0.5, 0.35, facing);
  float fwd = pow(max(facing, 0.0), 1.6) * uBehind;
  float h = max(len - 1.0, 0.0);
  float halo = exp(-h / 0.022) * 0.62 + exp(-h / 0.075) * 0.16;
  vec3 col = (sky * lit * (1.0 - 0.75 * uBehind) + warm * fwd * 2.2) * halo;

  if (len < 1.0 + aa) {
    float z = sqrt(max(1.0 - len * len, 0.0));
    vec3 n = vec3(d.x, -d.y, z);
    float c = cos(uLon0), s = sin(uLon0);
    vec3 w = vec3(n.x * c + n.z * s, n.y, -n.x * s + n.z * c);
    float lat = asin(clamp(w.y, -1.0, 1.0));
    float lon = atan(w.x, w.z);
    vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
    vec3 day = texture2D(uDay, uv).rgb;
    vec3 night = texture2D(uNight, uv).rgb;
    float cloud = smoothstep(0.08, 0.85, texture2D(uClouds, vec2(fract(uv.x - uCloud), uv.y)).r);

    float ndl = dot(n, uSun);
    float dayAmt = smoothstep(-0.08, 0.24, ndl);
    float diffuse = max(ndl, 0.0);
    // Haven glittrar där solen speglas (havet är blåare än landet i dagsbilden).
    float ocean = smoothstep(0.03, 0.14, day.b - max(day.r, day.g));
    vec3 hv = normalize(uSun + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, hv), 0.0), 60.0) * ocean * (1.0 - cloud);
    vec3 ground = day * (0.05 + 1.08 * diffuse) + vec3(1.0, 0.93, 0.82) * spec * 0.5;
    ground = mix(ground, vec3(0.96, 0.97, 1.0) * (0.04 + diffuse), cloud * 0.9);
    // Skymningsbandet längs gränsen mellan dag och natt.
    float tw = (ndl - 0.02) / 0.09;
    ground += vec3(1.0, 0.40, 0.16) * exp(-tw * tw) * 0.10;
    // Natten: svagt landskap och städernas ljus (Black Marble), dämpade under molnen.
    float lum = dot(night, vec3(0.299, 0.587, 0.114));
    float lights = smoothstep(0.17, 0.6, lum);
    vec3 nightCol = night * 0.07 + vec3(1.0, 0.74, 0.40) * lights * 1.45 * (1.0 - cloud * 0.8);
    vec3 surface = mix(nightCol, ground, dayAmt);
    // Atmosfären innanför kanten.
    float fres = pow(1.0 - z, 2.6);
    surface += mix(sky, warm, clamp(fwd * 1.4, 0.0, 1.0)) * fres * (0.08 + 0.5 * smoothstep(-0.3, 0.5, ndl) + 0.9 * fwd);
    col = mix(col, surface, smoothstep(1.0 + aa, 1.0 - aa, len));
  }
  // Ljust tema (T): rymden blir genomskinlig, så att klotet står tryckt på papperet.
  float alpha = mix(1.0, smoothstep(1.0 + aa, 1.0 - aa, len), uClear);
  gl_FragColor = vec4(min(col, vec3(1.0)) * alpha, alpha);
}
`;

type Gl = { gl: WebGLRenderingContext; uniforms: Record<string, WebGLUniformLocation | null>; textures: WebGLTexture[] };
type Scene = { place: GlobePlace | null; cam: GlobeCam; live: boolean; light: boolean };

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(shader)); return null; }
  return shader;
}

function setup(canvas: HTMLCanvasElement): Gl | null {
  // preserveDrawingBuffer: granskningen tar sina bilder ur DOM:en och behöver kunna läsa canvasen.
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const names = ["uSize", "uMap", "uGlobe", "uPx", "uSun", "uBehind", "uLon0", "uCloud", "uClear", "uDay", "uNight", "uClouds"];
  return { gl, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])), textures: [] };
}

function upload(g: Gl, unit: number, image: HTMLImageElement) {
  const { gl } = g;
  const texture = gl.createTexture();
  if (!texture) return;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  g.textures.push(texture);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const smooth = (t: number) => { const v = Math.min(1, Math.max(0, t)); return v * v * (3 - 2 * v); };

/** En bild av klotet. dawn är gryningen 0–1 och clouds molnens förskjutning i varv. */
function paint(g: Gl, canvas: HTMLCanvasElement, place: GlobePlace, cam: GlobeCam, dawn: number, clouds: number, light: boolean) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(2, Math.round(rect.width * dpr)), h = Math.max(2, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const { gl, uniforms: u } = g;
  gl.viewport(0, 0, w, h);
  // Enhetsbildpunkt b → kamerans rum (b − O − c) / s + O → nivåns rum, minus (X, Y) och delat med r.
  const sx = 1600 / w, sy = 900 / h, { x: X, y: Y, r } = place, { x: cx, y: cy, s } = cam;
  gl.uniform2f(u.uSize, w, h);
  gl.uniform4f(u.uMap, sx / (s * r), sy / (s * r),
    (CAM_ORIGIN.x - (CAM_ORIGIN.x + cx) / s - X) / r, (CAM_ORIGIN.y - (CAM_ORIGIN.y + cy) / s - Y) / r);
  gl.uniform3f(u.uGlobe, GLOBE.x, GLOBE.y, GLOBE.r);
  gl.uniform1f(u.uPx, (w / 1600) * s * r);
  const e = smooth(dawn);
  const sun = SUN_DAY.map((v, i) => v + (SUN_DAWN[i] - v) * e);
  const norm = Math.hypot(sun[0], sun[1], sun[2]) || 1;
  gl.uniform3f(u.uSun, sun[0] / norm, sun[1] / norm, sun[2] / norm);
  gl.uniform1f(u.uBehind, Math.max(0, -sun[2] / norm));
  gl.uniform1f(u.uLon0, LON0);
  gl.uniform1f(u.uCloud, clouds % 1);
  gl.uniform1f(u.uClear, light ? 1 : 0);
  gl.uniform1i(u.uDay, 0);
  gl.uniform1i(u.uNight, 1);
  gl.uniform1i(u.uClouds, 2);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/**
 * Klotet. place: nivå 10⁷:s placering (null när planeten inte syns), cam: kameran, dawn: gryningen 0–1,
 * light: ljust tema (rymden genomskinlig).
 * Gryningen glider som CSS-solen i skala.module.css, 4,5 s efter en halv sekunds väntan; stilla hoppar.
 */
export function PlanetGL({ place, cam, dawn, still, light = false }: { place: GlobePlace | null; cam: GlobeCam; dawn: number; still: boolean; light?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<Gl | null>(null);
  const [loaded, setLoaded] = useState(false);
  const live = useMotionLive(still);
  const scene = useRef<Scene>({ place, cam, live, light });
  const sky = useRef({ dawnFrom: dawn, dawnTo: dawn, dawnStart: 0, cloudBase: 0, cloudAt: 0 });

  const frame = (now: number) => {
    const g = glRef.current, canvas = ref.current, { place: at, cam: view, live: moving, light: paper } = scene.current;
    if (!g || !canvas || !at) return;
    const t = sky.current;
    const dawnNow = t.dawnStart ? t.dawnFrom + (t.dawnTo - t.dawnFrom) * smooth((now - t.dawnStart - 500) / 4500) : t.dawnTo;
    const clouds = (t.cloudBase + (moving && t.cloudAt ? (now - t.cloudAt) / 1000 : 0)) * CLOUD_SPEED;
    paint(g, canvas, at, view, dawnNow, clouds, paper);
  };
  const frameRef = useRef(frame);

  // Läget och funktionen uppdateras efter varje rendering; zoomen och kameran ger en rendering per bildruta.
  useLayoutEffect(() => {
    scene.current = { place, cam, live, light };
    frameRef.current = frame;
    const t = sky.current;
    if (t.dawnTo !== dawn) {
      const from = t.dawnStart ? t.dawnFrom + (t.dawnTo - t.dawnFrom) * smooth((performance.now() - t.dawnStart - 500) / 4500) : t.dawnTo;
      Object.assign(t, still ? { dawnFrom: dawn, dawnTo: dawn, dawnStart: 0 } : { dawnFrom: from, dawnTo: dawn, dawnStart: performance.now() });
    }
    if (loaded) frame(performance.now());
  });

  // Kontext och texturer, en gång per canvas.
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas ? setup(canvas) : null;
    if (!g) return;
    glRef.current = g;
    let cancelled = false;
    Promise.all(TEXTURES.map(loadImage)).then(images => {
      if (cancelled) return;
      images.forEach((image, unit) => upload(g, unit, image));
      setLoaded(true);
    }).catch(() => { /* planetbilden står kvar */ });
    return () => {
      cancelled = true;
      g.textures.forEach(texture => g.gl.deleteTexture(texture));
      glRef.current = null;
      // Släpp kontexten först när canvasen verkligen har lämnat sidan. I utvecklingsläget körs effekten
      // två gånger på samma canvas, och en förlorad kontext går inte att få tillbaka.
      setTimeout(() => { if (canvas && !canvas.isConnected) g.gl.getExtension("WEBGL_lose_context")?.loseContext(); }, 0);
    };
  }, []);

  // Molnen och gryningen rör sig mellan renderingarna, men bara när förlopp får spela.
  const shown = Boolean(place);
  useEffect(() => {
    if (!loaded || !shown || !live) return;
    const t = sky.current;
    t.cloudAt = performance.now();
    let raf = 0, last = 0;
    const loop = (now: number) => {
      // Trettio bilder i sekunden räcker för molnen.
      if (now - last > 32) { last = now; frameRef.current(now); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      t.cloudBase += (performance.now() - t.cloudAt) / 1000;
      t.cloudAt = 0;
    };
  }, [loaded, shown, live]);

  useEffect(() => {
    const onResize = () => frameRef.current(performance.now());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <canvas ref={ref} className={k.planetGl} data-on={loaded && shown} aria-hidden="true" />;
}
