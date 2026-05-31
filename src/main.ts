import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The Oldest Thing You'll Ever Own: a deep-time diamond story.
 * Crafted by ProDiam (Prodiam Trading CC), a South African diamond cutting house.
 * https://prodiam.co.za  ·  Bedfordview, South Africa
 *
 * Open-source under MIT. Reuse freely; a link back to https://prodiam.co.za is appreciated.
 * Transparent WebGL canvas over DOM era-art (Codex images + Grok films) plus voiceover.
 * The diamond starts as a rough octahedral crystal and is cut into a brilliant as you scroll.
 */

const canvas = document.querySelector<HTMLCanvasElement>('#gl')!;
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const scrollEl = document.querySelector<HTMLElement>('#scroll')!;
const preloader = document.querySelector<HTMLElement>('#preloader')!;
const bar = document.querySelector<HTMLElement>('#preloader .bar > i');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATIC = location.search.includes('static'); // render-on-demand: window.__shot(progress)

// ------------------------------------------------------------ renderer (transparent)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4.6);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

// ------------------------------------------------------------ diamond: rough octahedral crystal -> polished brilliant
const h = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const jit = (n: number) => h(n) * 2 - 1;

function makeBrilliant(N: number): THREE.BufferGeometry {
  const rg = 1.0, rt = 0.56, ht = 0.36, gd = 0.05, pd = 0.92;
  const v: number[] = [0, ht, 0]; // 0 = table center
  const tableRing = 1;
  for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; v.push(Math.cos(a) * rt, ht, Math.sin(a) * rt); }
  const girTop = 1 + N;
  for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; v.push(Math.cos(a) * rg, 0, Math.sin(a) * rg); }
  const girBot = 1 + 2 * N;
  for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; v.push(Math.cos(a) * rg, -gd, Math.sin(a) * rg); }
  const culet = 1 + 3 * N;
  v.push(0, -(gd + pd), 0);
  const t: number[] = [];
  for (let k = 0; k < N; k++) {
    const k1 = (k + 1) % N;
    t.push(0, tableRing + k1, tableRing + k);
    t.push(tableRing + k, tableRing + k1, girTop + k1, tableRing + k, girTop + k1, girTop + k);
    t.push(girTop + k, girTop + k1, girBot + k1, girTop + k, girBot + k1, girBot + k);
    t.push(girBot + k1, girBot + k, culet);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(t); g.computeVertexNormals();
  return g;
}

const NSEG = 18;
const geo = makeBrilliant(NSEG);
const bp = geo.attributes.position;
// rough morph target = irregular OCTAHEDRAL raw crystal (top apex, jittered wide equator, bottom apex)
const roughPos = new Float32Array(bp.count * 3);
const A = 0.92, B = 0.98, RG = 1.0;
for (let i = 0; i < bp.count; i++) {
  let X = 0, Y = 0, Z = 0;
  if (i === 0) { Y = A; }
  else if (i <= NSEG) { const a = ((i - 1) / NSEG) * Math.PI * 2; X = Math.cos(a) * RG * 0.5; Y = A * 0.45; Z = Math.sin(a) * RG * 0.5; }
  else if (i <= 2 * NSEG) { const a = ((i - 1 - NSEG) / NSEG) * Math.PI * 2; X = Math.cos(a) * RG * 1.05; Y = 0.05; Z = Math.sin(a) * RG * 1.05; }
  else if (i <= 3 * NSEG) { const a = ((i - 1 - 2 * NSEG) / NSEG) * Math.PI * 2; X = Math.cos(a) * RG * 1.05; Y = -0.07; Z = Math.sin(a) * RG * 1.05; }
  else { Y = -B; }
  const j = (i === 0 || i === bp.count - 1) ? 0.04 : 0.15;
  roughPos[i * 3] = X + jit(i + 11) * j;
  roughPos[i * 3 + 1] = Y + jit(i + 23) * j * 0.7;
  roughPos[i * 3 + 2] = Z + jit(i + 37) * j;
}
geo.morphAttributes.position = [new THREE.Float32BufferAttribute(roughPos, 3)];

const material = new THREE.MeshPhysicalMaterial({
  color: 0xe7edf3, metalness: 0, roughness: 0.6, transmission: 0.78, thickness: 1.1,
  ior: 2.42, dispersion: 0.2, clearcoat: 0.25, clearcoatRoughness: 0.55,
  envMapIntensity: 1.4, specularIntensity: 1, flatShading: true, side: THREE.DoubleSide,
});
const diamond = new THREE.Mesh(geo, material);
diamond.morphTargetInfluences = [1]; // start fully rough (raw crystal)
diamond.scale.setScalar(0.58);
scene.add(diamond);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 6); scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// ------------------------------------------------------------ story data
interface Act { id: string; grad: string; headline?: string; sub?: string; reveals?: string[]; link?: string; }
const ACTS: Act[] = [
  { id: 'void', grad: 'radial-gradient(circle at 50% 45%, #0b0d14 0%, #05060A 60%)', headline: 'The oldest thing you will ever own.', sub: 'Scroll slowly, and turn your sound on.' },
  { id: 'deeptime', grad: 'radial-gradient(circle at 50% 60%, #2a0d10 0%, #05060A 70%)',
    reveals: ['Older than the pyramids.', 'Older than your species.', 'Older than every dinosaur.', 'Older than the first flower, the first tree, the first bone.', 'Older than the air you breathe.', 'Older, even, than the volcano that carried it.'] },
  { id: 'mantle', grad: 'radial-gradient(circle at 50% 55%, #FF7A1A 0%, #3A0E0E 55%, #05060A 100%)', headline: 'Carbon became diamond.', sub: '150 km deep · 1,100°C · three billion years ago' },
  { id: 'eruption', grad: 'radial-gradient(circle at 50% 80%, #FF7A1A 0%, #7a1f0a 45%, #05060A 100%)', headline: 'Then the Earth fired it upward.', sub: 'to the surface, in a matter of hours' },
  { id: 'mine', grad: 'linear-gradient(180deg, #0a0f17 0%, #243140 60%, #11171f 100%)', headline: 'And there it waited.', sub: 'until we found it, in South African rock' },
  { id: 'bench', grad: 'radial-gradient(circle at 45% 50%, #2a1a08 0%, #0a0805 70%)', headline: 'Cut by hand, in Bedfordview.', sub: 'to a GIA Excellent cut' },
  { id: 'light', grad: 'radial-gradient(circle at 50% 42%, #1b2a45 0%, #080b14 72%)', headline: 'You are not buying a stone.', sub: 'You are buying the oldest thing you will ever hold.', link: 'prodiam.co.za' },
];

const style = document.createElement('style');
style.textContent = `
  #bg { position: fixed; inset: 0; z-index: 1; background: #05060A; }
  #gl { z-index: 2 !important; }
  #scroll { z-index: 3; pointer-events: none; }
  .era { position: absolute; inset: 0; opacity: 0; will-change: opacity; }
  .copy { position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(90vw, 880px); text-align: center; opacity: 0; will-change: opacity, transform; }
  .copy h2 { font-family: var(--display); font-weight: 300; line-height: 1.08; font-size: clamp(2rem, 6vw, 4.6rem); letter-spacing: -0.01em; text-shadow: 0 2px 40px rgba(0,0,0,0.55); }
  .copy p { font-family: var(--body); font-weight: 300; margin-top: 1.2rem; font-size: clamp(0.95rem, 1.8vw, 1.25rem); letter-spacing: 0.05em; opacity: 0.88; text-shadow: 0 1px 20px rgba(0,0,0,0.6); }
  .copy.on-light h2, .copy.on-light p { color: #0b0d14; text-shadow: none; }
  .reveal { position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); font-family: var(--display); font-weight: 300; font-size: clamp(1.6rem, 5vw, 3.6rem); text-align: center; width: min(90vw, 760px); opacity: 0; will-change: opacity, transform; text-shadow: 0 2px 40px rgba(0,0,0,0.85); }
  .copy::before { content:''; position:absolute; inset:-45% -18%; z-index:-1; background: radial-gradient(ellipse at center, rgba(5,6,10,0.78) 0%, rgba(5,6,10,0) 72%); }
  .copy.on-light::before { background: radial-gradient(ellipse at center, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0) 72%); }
  .reveal::before { content:''; position:absolute; inset:-70% -22%; z-index:-1; background: radial-gradient(ellipse at center, rgba(5,6,10,0.82) 0%, rgba(5,6,10,0) 72%); }
  .cta { display:inline-block; margin-top:1.8rem; font-family: var(--body); font-size: clamp(0.85rem,1.5vw,1.05rem); letter-spacing:0.22em; text-transform:uppercase; color:#eaf2ff; border:1px solid rgba(234,242,255,0.5); padding:0.75rem 1.5rem; border-radius:2rem; text-decoration:none; pointer-events:auto; transition: background .3s, color .3s; }
  .cta:hover { background:#eaf2ff; color:#0b0d14; }
  #mark { position: fixed; top: 1.3rem; left: 1.7rem; z-index: 40; font-family: var(--display); font-weight: 300; font-size: 1.25rem; letter-spacing: 0.4em; color: rgba(234,242,255,0.92); pointer-events: auto; cursor: pointer; text-decoration: none; mix-blend-mode: difference; transition: opacity .3s; }
  #mark:hover { opacity: 0.62; }
  .copy .credit { font-family: var(--body); font-weight: 400; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.5; margin-top: 1.15rem; }
  .copy.on-light .credit { color: #0b0d14; }
  #share { position: fixed; bottom: 1.25rem; left: 1.25rem; z-index: 40; pointer-events: auto; background: transparent; border: 1px solid rgba(234,242,255,0.2); color: var(--ice); font-family: var(--body); font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; padding: 0.5rem 0.8rem; border-radius: 2rem; cursor: pointer; opacity: 0.6; transition: opacity .3s; }
  #share:hover { opacity: 1; }
  #toast { position: fixed; left: 50%; bottom: 4.2rem; transform: translateX(-50%) translateY(8px); z-index: 60; background: rgba(234,242,255,0.96); color: #0b0d14; font-family: var(--body); font-size: 0.72rem; letter-spacing: 0.08em; padding: 0.5rem 0.9rem; border-radius: 2rem; opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .share { margin-top: 2rem; pointer-events: auto; }
  .share-q { font-family: var(--body); font-weight: 400; font-size: 0.8rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.6; margin-bottom: 0.9rem; }
  .copy.on-light .share-q { color: #0b0d14; }
  .share-row { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
  .sh-btn { font-family: var(--body); font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ice); background: transparent; border: 1px solid rgba(234,242,255,0.35); border-radius: 2rem; padding: 0.5rem 1rem; cursor: pointer; text-decoration: none; transition: background .3s, color .3s; }
  .sh-btn:hover { background: var(--ice); color: #0b0d14; }
  .sh-primary { background: rgba(255,122,26,0.16); border-color: var(--amber); }
  .sh-primary:hover { background: var(--amber); color: #0b0d14; }
`;
document.head.appendChild(style);

const bg = document.createElement('div'); bg.id = 'bg'; document.body.prepend(bg);
const eraEls: HTMLElement[] = ACTS.map((a, i) => {
  const el = document.createElement('div'); el.className = 'era';
  el.style.background = a.grad;
  if (a.id !== 'light') {
    const tint = 'linear-gradient(rgba(5,6,10,0.30), rgba(5,6,10,0.55))';
    el.style.backgroundImage = `${tint}, url(img/scene-${i}-${a.id}.png)`;
    el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center';
  } // the close uses only its dark gradient so the polished diamond is visible
  if (i === 0) el.style.opacity = '1';
  bg.appendChild(el); return el;
});
const copyEls: HTMLElement[] = [];
const revealEls: HTMLElement[][] = [];
ACTS.forEach((a) => {
  if (a.reveals) {
    revealEls.push(a.reveals.map((txt) => { const r = document.createElement('div'); r.className = 'reveal'; r.textContent = txt; overlay.appendChild(r); return r; }));
    copyEls.push(null as unknown as HTMLElement);
  } else {
    const c = document.createElement('div'); c.className = 'copy';
    c.innerHTML = `<h2>${a.headline ?? ''}</h2>${a.sub ? `<p>${a.sub}</p>` : ''}${a.link ? `<a class="cta" href="https://${a.link}" target="_blank" rel="noopener">${a.link}</a>` : ''}`;
    if (a.id === 'void') c.style.opacity = '1'; // opening headline visible at the very top
    overlay.appendChild(c); copyEls.push(c); revealEls.push([]);
  }
});

// ---- sharing: let anyone send the story onward (native share sheet, with graceful fallbacks)
const SHARE_TITLE = "The Oldest Thing You'll Ever Own";
const SHARE_TEXT = "A diamond is the oldest thing you'll ever own. Scroll back three billion years to the moment it formed.";
const shareUrl = () => location.href.split('#')[0];
async function doShare() {
  const url = shareUrl();
  if (navigator.share) { try { await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url }); } catch { /* user dismissed */ } return; }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { window.prompt('Copy this link', url); }
}
function toast(msg: string) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  window.setTimeout(() => { t && t.classList.remove('show'); }, 1800);
}

// a quiet sign-off on the final frame: brand mention + provenance, then a gentle share prompt
const lastCopy = copyEls[ACTS.length - 1];
if (lastCopy) {
  const cr = document.createElement('p'); cr.className = 'credit';
  cr.textContent = 'A ProDiam interactive · cut in Bedfordview, South Africa';
  lastCopy.appendChild(cr);

  const share = document.createElement('div'); share.className = 'share';
  const q = document.createElement('p'); q.className = 'share-q'; q.textContent = 'Enjoyed it? Share the story.';
  const row = document.createElement('div'); row.className = 'share-row';
  const url = shareUrl();
  const native = document.createElement('button'); native.type = 'button'; native.className = 'sh-btn sh-primary'; native.textContent = 'Share'; native.addEventListener('click', doShare);
  const x = document.createElement('a'); x.className = 'sh-btn'; x.textContent = 'X'; x.target = '_blank'; x.rel = 'noopener';
  x.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(SHARE_TEXT) + '&url=' + encodeURIComponent(url);
  const wa = document.createElement('a'); wa.className = 'sh-btn'; wa.textContent = 'WhatsApp'; wa.target = '_blank'; wa.rel = 'noopener';
  wa.href = 'https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT + ' ' + url);
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'sh-btn'; copy.textContent = 'Copy link';
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(shareUrl()); toast('Link copied'); } catch { window.prompt('Copy this link', shareUrl()); } });
  row.append(native, x, wa, copy);
  share.append(q, row); lastCopy.appendChild(share);
}

// films (Grok) layered onto their era backdrops
const VIDEOS: Record<string, string> = {
  void: 'video/scene-0-void.mp4',
  mantle: 'video/scene-2-mantle.mp4',
  eruption: 'video/eruption.mp4',
  mine: 'video/scene-4-mine.mp4',
  bench: 'video/scene-5-bench.mp4',
};
ACTS.forEach((a, i) => {
  const src = VIDEOS[a.id]; if (!src) return;
  const v = document.createElement('video');
  v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto';
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.82) saturate(1.06);';
  if (a.id === 'eruption') { v.style.opacity = '0.9'; v.style.mixBlendMode = 'screen'; }
  eraEls[i].appendChild(v); v.play().catch(() => {});
});

// voiceover + persistent hint
const vo = document.createElement('audio'); vo.src = 'audio/vo.mp3'; vo.preload = 'auto'; document.body.appendChild(vo);
const audioBtn = document.querySelector<HTMLButtonElement>('#audio')!;
const hintEl = document.querySelector<HTMLElement>('#hint');
if (hintEl) hintEl.innerHTML = 'Scroll&nbsp;&nbsp;·&nbsp;&nbsp;tap&nbsp;♪&nbsp;for sound';
let soundOn = false;
audioBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  if (soundOn) { vo.play().catch(() => {}); audioBtn.textContent = 'Sound On'; if (hintEl) hintEl.style.opacity = '0'; }
  else { vo.pause(); audioBtn.textContent = 'Sound Off'; }
});
const mark = document.createElement('a'); mark.id = 'mark'; mark.textContent = 'PRODIAM';
mark.href = 'https://prodiam.co.za'; mark.target = '_blank'; mark.rel = 'noopener';
mark.title = 'ProDiam, a natural diamond cutting house in Bedfordview, South Africa';
document.body.appendChild(mark);

// persistent, low-key share affordance so the story is always one tap from being passed on
const shareBtn = document.createElement('button'); shareBtn.id = 'share'; shareBtn.type = 'button';
shareBtn.textContent = 'Share'; shareBtn.setAttribute('aria-label', 'Share this story');
shareBtn.addEventListener('click', doShare); document.body.appendChild(shareBtn);

// ------------------------------------------------------------ scroll choreography
if (!STATIC) {
  const lenis = new Lenis({ lerp: 0.08, smoothWheel: !reduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// per-scene scroll weight (the deep-time reveals get the most room so they read)
const WEIGHTS = [1.1, 3.6, 1.4, 1.4, 1.3, 1.7, 1.5];
const totalW = WEIGHTS.reduce((a, b) => a + b, 0);
const sceneStart: number[] = [];
{ let c = 0; WEIGHTS.forEach((w, i) => { sceneStart[i] = c; c += w; }); }
scrollEl.style.height = totalW * 100 + 'vh';

// perf: only the active scene's film plays
const videoEls = ACTS.map((_, i) => eraEls[i].querySelector('video') as HTMLVideoElement | null);
videoEls.forEach((v) => v && v.pause());
let activeScene = -1;
const setActiveScene = (timePos: number) => {
  let idx = 0;
  for (let i = 0; i < ACTS.length; i++) if (timePos >= sceneStart[i] - 0.4) idx = i;
  if (idx === activeScene) return;
  activeScene = idx;
  videoEls.forEach((v, i) => { if (!v) return; if (i === idx) v.play().catch(() => {}); else v.pause(); });
};

const tl = gsap.timeline(STATIC ? { paused: true } : {
  scrollTrigger: { trigger: scrollEl, start: 'top top', end: 'bottom bottom', scrub: reduced ? false : 1.2, onUpdate: (self) => setActiveScene(self.progress * totalW) },
});

const camZ = [4.6, 5.0, 3.4, 3.0, 4.0, 3.2, 3.6];
const dY = [0, -0.12, -0.4, -0.25, 0, 0.05, 0];
ACTS.forEach((a, i) => {
  const w = WEIGHTS[i], start = sceneStart[i];
  if (i > 0) {
    tl.to(eraEls[i], { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, start)
      .to(eraEls[i - 1], { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, start);
  }
  tl.to(camera.position, { z: camZ[i], duration: w, ease: 'none' }, start)
    .to(diamond.rotation, { y: '+=0.9', duration: w, ease: 'none' }, start)
    .to(diamond.position, { y: dY[i], duration: w, ease: 'none' }, start);

  if (a.reveals) {
    const g = revealEls[i], each = w / g.length;
    g.forEach((r, k) => {
      const rs = start + k * each;
      tl.fromTo(r, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: each * 0.26, ease: 'power2.out' }, rs)
        .to(r, { opacity: 0, y: -22, duration: each * 0.26, ease: 'power2.in' }, rs + each * 0.68);
    });
  } else {
    const c = copyEls[i];
    if (i === 0) {
      tl.set(c, { opacity: 1 }, start);
      tl.to(c, { opacity: 0, y: -24, duration: w * 0.3, ease: 'power2.in' }, start + w * 0.62);
    } else if (i === ACTS.length - 1) {
      tl.fromTo(c, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: w * 0.4, ease: 'power2.out' }, start + w * 0.2);
    } else {
      tl.fromTo(c, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: w * 0.3, ease: 'power2.out' }, start + w * 0.12);
      tl.to(c, { opacity: 0, y: -24, duration: w * 0.3, ease: 'power2.in' }, start + w * 0.66);
    }
  }
});

// the CUT: rough crystal -> polished brilliant during the BENCH scene
const benchStart = sceneStart[5];
tl.to(diamond.morphTargetInfluences!, { 0: 0, duration: WEIGHTS[5] * 0.85, ease: 'power2.inOut' }, benchStart)
  .to(material, { roughness: 0, transmission: 1, dispersion: 1.25, clearcoat: 1, clearcoatRoughness: 0, thickness: 2, envMapIntensity: 2.2, duration: WEIGHTS[5] * 0.85, ease: 'power2.inOut' }, benchStart);

// ------------------------------------------------------------ render
const startTime = performance.now();
let booted = false;
if (STATIC) {
  (window as unknown as { __shot: (p: number) => string }).__shot = (p: number) => {
    tl.progress(Math.max(0, Math.min(1, p))); renderer.render(scene, camera); return 'rendered@' + p;
  };
  tl.progress(0); renderer.render(scene, camera);
  if (bar) bar.style.width = '100%'; preloader.classList.add('done');
} else {
  setTimeout(() => preloader.classList.add('done'), 3500);
  const frame = (timeMs: number) => {
    const t = (timeMs - startTime) / 1000;
    diamond.rotation.x = Math.sin(t * 0.15) * 0.08;
    renderer.render(scene, camera);
    if (!booted) { booted = true; if (bar) bar.style.width = '100%'; setTimeout(() => preloader.classList.add('done'), 200); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  const w = window.innerWidth, hh = window.innerHeight;
  camera.aspect = w / hh; camera.updateProjectionMatrix();
  renderer.setSize(w, hh); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ScrollTrigger.refresh();
});
