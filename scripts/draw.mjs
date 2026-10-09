// Draws the profile's images into assets/, in light and dark: the animated
// header, the project cards and the seed chips for the garden. (The garden
// itself is scripts/garden.mjs.)
//   node scripts/draw.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, typeset, measure, ICONS, iconFrames, imageBlocks, GENERATORS, SPECTRUM, COLOURS, Raster, rgb } from './site.mjs';
import { num, hash, palette, blockPath, dotPattern, light, cursor, CALM } from './svg.mjs';
import { plantURL } from './garden.mjs';

const OUT = path.join(ROOT, 'assets');
const THEMES = ['light', 'dark'];

/** A 2px border with the corners clipped, like the site's buttons and boxes. */
function frame(x, y, w, h, b = 2) {
  return `M${x + b} ${y}h${w - 2 * b}v${b}h${-(w - 2 * b)}z M${x + w - b} ${y + b}h${b}v${h - 2 * b}h${-b}z `
    + `M${x + b} ${y + h - b}h${w - 2 * b}v${b}h${-(w - 2 * b)}z M${x} ${y + b}h${b}v${h - 2 * b}h${-b}z`;
}

// ---------------------------------------------------------------- header

// What the mark's frames stand for (the site's colophon says the same).
const MEANS = ['ME.', 'BUILD IT.', 'AIM AT THE RIGHT THING.', "CARE HOW IT'S MADE.", 'FOR PEOPLE.'];

function header(theme) {
  const P = palette(theme);
  const W = 1200, M = 64;
  const eyebrow = typeset('■ CREATIVE TECHNOLOGIST · LEIDEN, NL', { size: 3 });
  const title = typeset('JP BOTHMA', { size: 13, lh: 10 });
  const tag = typeset('THOUGHTFUL SOFTWARE FOR WORK THAT MATTERS.', { size: 4, lh: 10, width: 620 });
  const sub = typeset('INTERACTIVE 3D · DATA · AI AGENTS · SUSTAINABILITY', { size: 3, tone: 0.55 });
  const btn = typeset('JPBOTHMA.COM ↗', { size: 2 });
  const y0 = 60, yT = y0 + 21 + 30, yTag = yT + title.height + 34, ySub = yTag + tag.height + 26, yBtn = ySub + 21 + 30;
  const bw = btn.width + 32, bh = 36, H = yBtn + bh + 52;

  // The mark in its box, cycling through its five frames.
  const cell = 20, pad = 24, f = iconFrames('logo', cell);
  const boxW = f.w + pad * 2, boxH = f.h + pad * 2, bx = W - M - boxW, by = yT;
  const n = f.frames[0].length / 5, LOOP = 10, F = 5;
  let css = '', blocks = '';
  for (let j = 0; j < n; j++) {
    const at = (k) => { const fr = f.frames[k % F]; return [fr[j * 5], fr[j * 5 + 1]]; };
    let kf = '';
    for (let k = 0; k < F; k++) {
      const [x, y] = at(k), [x2, y2] = at(k + 1);
      const p = k * 20;
      const spin = hash(j * 3.1, k * 7.7) < 0.5 ? -90 : 90;
      kf += `${p}%,${p + 15}%{transform:translate(${x}px,${y}px)}`
        + `${p + 17.5}%{transform:translate(${num((x + x2) / 2)}px,${num((y + y2) / 2 - 6)}px) rotate(${spin}deg)}`;
    }
    kf += `100%{transform:translate(${at(0)[0]}px,${at(0)[1]}px)}`;
    css += `@keyframes m${j}{${kf}}`;
    // Still (no animation): frame 0, JP.
    blocks += `<rect class="mk" width="${cell}" height="${cell}" transform="translate(${at(0)[0]} ${at(0)[1]})" style="animation-name:m${j}"/>`;
  }
  // Captions: each frame's meaning while it holds.
  let caps = '';
  MEANS.forEach((str, k) => {
    const t = typeset(str, { size: 3 });
    const p = k * 20;
    css += `@keyframes c${k}{0%,100%{opacity:${k === 0 ? 1 : 0}}${k ? `${p - 0.01}%{opacity:0}` : ''}${p + 0.5}%,${p + 15}%{opacity:1}${p + 16}%{opacity:0}}`;
    caps += `<path class="cap" style="animation-name:c${k}" fill="${P.fg}"${k ? ' opacity="0"' : ''} d="${blockPath(t.blocks, bx + boxW - t.width, by + boxH + 24)}"/>`;
  });

  // The name arrives as loose squares that tumble into place.
  const C = 4 * 13, groups = new Map();
  for (let i = 0; i < title.blocks.length; i += 5) {
    const k = `${Math.floor(title.blocks[i] / C)},${Math.floor(title.blocks[i + 1] / C)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(...title.blocks.subarray(i, i + 5));
  }
  // Each group holds its loose spot for a moment, then lands. No fill mode:
  // wherever animations don't run, the name is simply there.
  const INTRO = 1.8;
  let name = '';
  [...groups].forEach(([k, b], g) => {
    const [gx, gy] = k.split(',').map(Number);
    const r = (s) => hash(gx * 13.1 + s, gy * 7.3 + s * 2.1) - 0.5;
    const hold = num(((0.1 + gx * 0.05 + r(4) * 0.12) / INTRO) * 100);
    const from = `transform:translate(${Math.round(r(1) * 160)}px,${Math.round(r(2) * 120 - 40)}px) rotate(${Math.round(r(3) * 180)}deg);opacity:0`;
    css += `@keyframes i${g}{0%,${hold}%{${from}}${num(hold + 18)}%{opacity:1}100%{transform:none;opacity:1}}`;
    name += `<path class="in" style="animation-name:i${g}" d="${blockPath(b, M, yT)}"/>`;
  });

  // The light: what it may touch is the dots (swollen, dithered) and most of the words.
  const lit = (x, y) => hash(x * 0.37 + 1, y * 0.41 + 2) < 0.7;
  const words = [[title, M, yT], [tag, M, yTag], [eyebrow, M, y0]].map(([t, x, y]) => blockPath(t.blocks, x, y, lit)).join('');
  const click = { x: bx + 34, y: by + boxH - 30 };
  const AT = 1.9, LOOP_L = 9;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="JP Bothma: creative technologist in Leiden. Thoughtful software for work that matters.">
<style>
.mk{fill:${P.fg};animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.5,0,.3,1);transform-box:fill-box;transform-origin:center}
.cap{animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}
.in{fill:${P.fg};animation-duration:${INTRO}s;animation-timing-function:cubic-bezier(.2,.9,.25,1);transform-box:fill-box;transform-origin:center}
${css}
${CALM}
</style>
<defs>
${dotPattern('dots', P.dots)}
${dotPattern('litdots', '#fff', { size: 6, tile: 4 })}
<mask id="lit" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#litdots)"/><path fill="#fff" d="${words}"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="${P.bg}"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
<path fill="${P.fg}" d="${blockPath(eyebrow.blocks, M, y0)}"/>
${name}
<path fill="${P.fg}" d="${blockPath(tag.blocks, M, yTag)}"/>
<path fill="${P.mix(0.55)}" d="${blockPath(sub.blocks, M, ySub)}"/>
<path fill="${P.fg}" d="${frame(M, yBtn, bw, bh)} ${blockPath(btn.blocks, M + 16, yBtn + 11)}"/>
<path fill="${P.fg}" d="${frame(bx, by, boxW, boxH)}"/>
<g transform="translate(${bx + pad} ${by + pad})">${blocks}</g>
${caps}
${light({ x: click.x, y: click.y, at: AT, loop: LOOP_L, reach: 1150, mask: 'lit' })}
${cursor({ x: click.x, y: click.y, at: AT, loop: LOOP_L, ink: P.fg, paper: P.bg })}
</svg>
`;
}

// ---------------------------------------------------------------- work

// The cards under "Selected work". `pic` is one of the site's procedural
// pictures (src/engine/images.js), plus the cake below.
export const WORK = [
  {
    slug: 'site', title: 'JPBOTHMA.COM', pic: { kind: 'moon' },
    line: 'My site, drawn as one field of pixel blocks: a WebGL2 renderer, its own pixel font, a falling-sand garden and a word puzzle for a 404.',
    stack: 'WEBGL2 · VITE · PLAIN JAVASCRIPT',
  },
  {
    slug: 'food', title: 'WHERE DOES MY FOOD COME FROM?', pic: { kind: 'earth' },
    line: 'A satellite globe that follows fresh food from the farm to a Dutch supermarket shelf, with the CO₂ of every leg.',
    stack: 'REACT · TYPESCRIPT · MAPLIBRE GL · ZUSTAND',
  },
  {
    slug: 'interfarm', title: 'INTERFARM', pic: { kind: 'terrain' },
    line: 'My day job: the platform where dairy customers and suppliers plan, fund and track on-farm CO₂ reduction together. I lead the tech.',
    stack: 'AZURE · DATA PLATFORMS · AI WORKFLOWS',
  },
  {
    slug: 'brickplan', title: 'BRICKPLAN', pic: { kind: 'cubes' },
    line: 'A Rust planner, compiled to WebAssembly, turns a small building into a brick-by-brick plan. A React simulator builds it in 3D.',
    stack: 'RUST · WEBASSEMBLY · REACT-THREE-FIBER',
  },
  {
    slug: 'bike-park', title: 'BIKE PARK', pic: { kind: 'switchbacks' },
    line: 'An online multiplayer bike game. One deterministic Rust physics core runs in the browser as WebAssembly and on the server.',
    stack: 'RUST · RAPIER · WEBASSEMBLY · THREE.JS',
  },
  {
    slug: 'carry-crew', title: 'CARRY CREW', pic: { kind: 'cake' },
    line: "Tied together, carry the cake, don't drop it: a co-op physics comedy for two to four friends, in the browser.",
    stack: 'TYPESCRIPT · RAPIER · THREE.JS · WEBSOCKETS',
  },
];

// A two-tier cake with a candle, lit like the site's other pictures (top left).
const LIGHT = (() => { const l = [-0.55, -0.6, 0.58]; const m = Math.hypot(...l); return l.map((v) => v / m); })();
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
GENERATORS.cake = (x, y, ar, s, dark) => {
  const px = (x - 0.5) * ar, py = y;
  const shade = (nx, nz, add = 0) => {
    const lam = clamp(nx * LIGHT[0] + nz * LIGHT[2] + 0.1);
    return dark ? clamp(0.1 + lam * 0.85 + add) : clamp(0.92 - lam * 0.8 - add);
  };
  const tier = (hw, top, bot) => {
    if (Math.abs(px) > hw || py < top - 0.03 || py > bot) return null;
    const nx = px / hw, nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    const drip = top + 0.045 + 0.025 * Math.max(0, Math.sin(px * 46 + hw * 9));
    if (py < top + 0.012) return dark ? 0.85 : 0.25; // the rim
    if (py < drip) return shade(nx, nz, dark ? 0.15 : -0.25); // icing
    return shade(nx, nz) + (Math.abs(py - (top + bot) / 2) < 0.012 ? (dark ? -0.3 : 0.3) : 0); // a band of filling
  };
  if (Math.abs(px) < 0.012 && py > 0.2 && py < 0.33) return dark ? 0.9 : 0.85; // candle
  const fx = px / 0.03, fy = (py - 0.16) / 0.05;
  if (fx * fx + fy * fy < 1) return fx * fx + fy * fy < 0.35 ? (dark ? 1 : 0.15) : (dark ? 0.55 : 0.75); // flame
  const t = tier(0.2, 0.34, 0.56) ?? tier(0.33, 0.56, 0.82);
  if (t !== null) return t;
  if (Math.abs(py - 0.84) < 0.012 && Math.abs(px) < 0.44) return dark ? 0.7 : 0.8; // plate
  return 0;
};

/** A project card, 760 × 700: picture, title, one line and the stack. */
function workCard(w, theme) {
  const { bg, fg, dots } = palette(theme), ink = rgb(fg), paper = rgb(bg);
  const W = 760, H = 700, PIC = 380;
  const r = new Raster(W, H, paper);
  const tone = (t) => paper.map((c, k) => Math.round(c + (ink[k] - c) * t));
  // The light, just off the picture's bottom right corner.
  const L = { x: W + 30, y: PIC + 40, R: 300, width: 200 };
  const lightAt = (cx, cy) => {
    const d = Math.hypot(cx - L.x, cy - L.y), u = (L.R - d) / L.width;
    if (u <= 0 || u >= 1) return null;
    const I = Math.sin(Math.PI * u) * 1.5 * Math.exp(-d / 900);
    if (hash(cx, cy) >= I) return null;
    return { rgb: rgb(SPECTRUM[clamp(Math.floor(u * 7 + (hash(cx + 17.31, cy + 17.31) - 0.5) * 0.9), 0, 6)]), I };
  };
  for (let y = 8; y < H; y += 16) {
    for (let x = 8; x < W; x += 16) {
      const l = y < PIC && lightAt(x + 1, y + 1);
      if (!l) { r.rect(x, y, 2, 2, rgb(dots)); continue; }
      const s = l.I > 0.8 ? 6 : 4;
      r.rect(x + 1 - s / 2, y + 1 - s / 2, s, s, l.rgb);
    }
  }
  const pic = imageBlocks(w.pic, W - 16, PIC - 16, { style: 'halftone', cell: 8, dark: theme === 'dark' });
  for (let i = 0; i < pic.length; i += 5) {
    const x = pic[i] + 8, y = pic[i + 1] + 8, s = pic[i + 2];
    const l = lightAt(x + s / 2, y + s / 2);
    r.rect(x, y, s, pic[i + 3], l ? l.rgb : ink);
  }
  for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [W - 2, 0, -1, 1], [0, PIC - 2, 1, -1], [W - 2, PIC - 2, -1, -1]]) {
    r.rect(Math.min(cx, cx + dx * 14), cy, 16, 2, ink);
    r.rect(cx, Math.min(cy, cy + dy * 14), 2, 16, ink);
  }
  const put = (t, x, y) => r.blocks(t.blocks, x, y, ink, paper);
  let size = 7, title;
  for (; size > 3; size--) {
    title = typeset(w.title, { size, lh: 10, width: W });
    if (title.lines <= 2 && w.title.split(' ').every((word) => measure(word, size) <= W)) break;
  }
  let y = PIC + 36;
  put(title, 0, y);
  y += title.height + 26;
  put(typeset(w.line, { size: 3, lh: 11, width: W }), 0, y);
  const stack = typeset(w.stack, { size: 3, tone: 0.55 });
  r.blocks(stack.blocks, 0, H - 21 - 6, ink, paper);
  return r.png();
}

// ---------------------------------------------------------------- seeds

/** A seed for the garden: a framed square of its colour and its name, like the site's seed chips. */
function seedChip(k, theme) {
  const P = palette(theme);
  const W = 104, H = 76, q = 44, x = (W - q) / 2;
  const name = typeset(COLOURS[k], { size: 2 });
  const fill = [];
  for (let y = 6; y + 4 <= q - 6; y += 4) for (let i = 6; i + 4 <= q - 6; i += 4) fill.push(x + i, y, 4, 4, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Plant a ${COLOURS[k].toLowerCase()} flower">
<path fill="${P.fg}" d="${frame(x, 0, q, q)}"/><path fill="${SPECTRUM[k]}" d="${blockPath(fill)}"/>
<path fill="${P.fg}" d="${blockPath(name.blocks, Math.round((W - name.width) / 2), q + 12)}"/>
</svg>
`;
}

// ---------------------------------------------------------------- run

fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(`wrote assets/${name} (${(data.length / 1024).toFixed(1)} KB)`);
};
for (const t of THEMES) {
  write(`header-${t}.svg`, header(t));
  for (const w of WORK) write(`work-${w.slug}-${t}.png`, workCard(w, t));
  COLOURS.forEach((c, k) => write(`seed-${c.toLowerCase()}-${t}.svg`, seedChip(k, t)));
}

// The seeds row in the README: each colour opens a filled-in issue.
const seeds = COLOURS.map((c, k) => {
  const n = c.toLowerCase();
  return `<a href="${plantURL(k)}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/seed-${n}-dark.svg"><img alt="Plant a ${n} flower" src="assets/seed-${n}-light.svg" height="76"></picture></a>`;
}).join('\n');
const readme = path.join(ROOT, 'README.md');
const md = fs.readFileSync(readme, 'utf8');
fs.writeFileSync(readme, md.replace(/<!-- seeds -->[\s\S]*?<!-- \/seeds -->/, `<!-- seeds -->\n<p>\n${seeds}\n</p>\n<!-- /seeds -->`));
console.log('updated the seeds in README.md');
