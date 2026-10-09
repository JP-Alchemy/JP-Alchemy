// SVG pieces for the animated images: blocks as paths, the dot grid, the
// pixel cursor and the click light (rings of the seven colours running out
// from a point, lighting only the blocks and dots they pass, as on the site).
// Animations are SMIL and CSS, which GitHub plays inside an <img>.
import { THEMES, SPECTRUM, rgb } from './site.mjs';

export const num = (v) => +(+v).toFixed(2);

/** The shader's per-pixel hash, so randomness matches the site's. */
export function hash(px, py) {
  const fract = (v) => v - Math.floor(v);
  let x = fract(px * 0.1031), y = fract(py * 0.1031), z = fract(px * 0.1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d; y += d; z += d;
  return fract((x + y) * z);
}

/** Paper and ink for a theme, and the tones between them. */
export function palette(theme) {
  const T = THEMES[theme];
  const a = rgb(T.bg), b = rgb(T.fg);
  const mix = (t) => `#${a.map((c, k) => Math.round(c + (b[k] - c) * t).toString(16).padStart(2, '0')).join('')}`;
  return { bg: T.bg, fg: T.fg, dots: mix(T.dots), mix };
}

/** Blocks (x, y, w, h, tone) as one path; touching blocks in a row merge into one rect. */
export function blockPath(b, ox = 0, oy = 0, keep = null) {
  const rects = [];
  for (let i = 0; i < b.length; i += 5) {
    const x = b[i] + ox, y = b[i + 1] + oy;
    if (!keep || keep(x, y)) rects.push([x, y, b[i + 2], b[i + 3]]);
  }
  rects.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  const out = [];
  for (const r of rects) {
    const last = out[out.length - 1];
    if (last && last[1] === r[1] && last[3] === r[3] && Math.abs(last[0] + last[2] - r[0]) < 0.01) last[2] += r[2];
    else out.push([...r]);
  }
  return out.map(([x, y, w, h]) => `M${num(x)} ${num(y)}h${num(w)}v${num(h)}h${num(-w)}z`).join('');
}

/** A pattern of grid dots. With `keep`, only some cells of a larger tile get one (a dither). */
export function dotPattern(id, fill, { step = 16, size = 2, tile = 1 } = {}) {
  const T = step * tile, o = (step - size) / 2;
  let rects = '';
  for (let j = 0; j < tile; j++) {
    for (let i = 0; i < tile; i++) {
      if (tile > 1 && hash(i * 7.3 + 1, j * 5.9 + 3) > 0.62) continue;
      rects += `<rect x="${i * step + o}" y="${j * step + o}" width="${size}" height="${size}" fill="${fill}"/>`;
    }
  }
  return `<pattern id="${id}" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${rects}</pattern>`;
}

/**
 * The click light: seven rings, red outermost, running out from (x, y) at
 * `speed` px/s from `at` seconds into a `loop`-second cycle, fading as they
 * go. `mask` is what they may light.
 */
export function light({ x, y, at, loop, reach, speed = 800, width = 150, mask }) {
  const band = width / 7, t1 = at + reach / speed;
  const k = (t) => num(Math.min(Math.max(t / loop, 0), 1));
  const rings = SPECTRUM.map((c, i) => {
    const off = (i + 0.5) * band;
    return `<circle cx="${x}" cy="${y}" r="0" fill="none" stroke="${c}" stroke-width="${num(band + 0.6)}">`
      + `<animate attributeName="r" dur="${loop}s" repeatCount="indefinite" keyTimes="0;${k(at + off / speed)};${k(t1)};1" values="0;0;${num(reach - off)};${num(reach - off)}"/></circle>`;
  }).join('');
  const fade = `<animate attributeName="opacity" dur="${loop}s" repeatCount="indefinite" keyTimes="0;${k(at)};${k(at + 0.04)};${k(at + (t1 - at) * 0.55)};${k(t1)};1" values="0;0;1;0.75;0;0"/>`;
  return `<g class="light" mask="url(#${mask})" opacity="0">${fade}${rings}</g>`;
}

// The site's pointer: ink outline, paper fill.
const ARROW = [
  '#..........', '##.........', '#=#........', '#==#.......', '#===#......', '#====#.....',
  '#=====#....', '#======#...', '#=======#..', '#========#.', '#=====#####', '#==#==#....',
  '#=#.#==#...', '##..#==#...', '#....#==#..', '.....#==#..', '......##...',
];

/** The pointer: shows up before `at`, presses, and goes once the light is out. */
export function cursor({ x, y, at, loop, px = 3, ink, paper }) {
  const cells = (ch) => ARROW.flatMap((r, j) => [...r].flatMap((c, i) => (c === ch ? [i * px, j * px, px, px, 1] : [])));
  const k = (t) => num(Math.min(Math.max(t / loop, 0), 1));
  return `<g class="light" transform="translate(${x} ${y})" opacity="0">`
    + `<animate attributeName="opacity" dur="${loop}s" repeatCount="indefinite" keyTimes="0;${k(at - 0.7)};${k(at - 0.45)};${k(at + 0.9)};${k(at + 1.2)};1" values="0;0;1;1;0;0"/>`
    + `<g><animateTransform attributeName="transform" type="translate" dur="${loop}s" repeatCount="indefinite" keyTimes="0;${k(at - 0.1)};${k(at)};${k(at + 0.12)};1" values="0 0;0 0;2 2;0 0;0 0"/>`
    + `<path d="${blockPath(cells('='))}" fill="${paper}"/><path d="${blockPath(cells('#'))}" fill="${ink}"/></g></g>`;
}

/** Everything that moves stops for people who ask for less motion. */
export const CALM = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .light { display: none; } }';
