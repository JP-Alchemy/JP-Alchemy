// The garden on the profile. A visitor picks a colour, which opens an issue
// titled "garden: plant violet"; the Garden workflow runs this script, which
// plants the flower with their name on it, redraws the garden, updates the
// README, commits, and closes the issue with a note. One flower per person a
// day; the bed keeps the newest 24.
//   node scripts/garden.mjs          redraw from garden/garden.json
//   node scripts/garden.mjs plant    plant from open issues (the workflow does this)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, typeset, SPECTRUM, COLOURS } from './site.mjs';
import { hash, palette, blockPath, dotPattern, light, CALM } from './svg.mjs';

const STATE = path.join(ROOT, 'garden/garden.json');
const README = path.join(ROOT, 'README.md');
const REPO = process.env.GITHUB_REPOSITORY || 'JP-Alchemy/JP-Alchemy';
const OWNER = REPO.split('/')[0];
const BED = 24, DAY = 24 * 3600 * 1000;
const NAMES = COLOURS.map((c) => c.toLowerCase());
const TITLE = new RegExp(`^garden:\\s*plant\\s+(${NAMES.join('|')})\\s*$`, 'i');

// ---------------------------------------------------------------- drawing

const W = 1200, H = 300, B = 6, GROUND = 246;

/** One flower's blocks: stem and leaves in ink, a 5×5 head (no corners) in its colour, a dark middle. */
function flower(f, slot) {
  const x = 42 + slot * 48, s = f.issue * 1.37 + slot * 0.71;
  const tall = 6 + Math.floor(hash(s, 1.3) * 7);
  const stem = [], leaves = [], petals = [];
  for (let k = 1; k <= tall; k++) stem.push(x, GROUND - k * B, B, B, 1);
  for (const [at, side] of [[2 + Math.floor(hash(s, 2.1) * 2), hash(s, 3.7) < 0.5 ? -1 : 1], [4 + Math.floor(hash(s, 4.9) * 2), hash(s, 5.3) < 0.5 ? -1 : 1]]) {
    if (at >= tall - 1) continue;
    const y = GROUND - at * B;
    leaves.push(x + side * B, y, B, B, 1, x + side * 2 * B, y - B, B, B, 1);
  }
  const cy = GROUND - (tall + 3) * B;
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      if (Math.abs(i) === 2 && Math.abs(j) === 2) continue;
      if (i === 0 && j === 0) stem.push(x, cy, B, B, 1);
      else petals.push(x + i * B, cy + j * B, B, B, 1);
    }
  }
  return { ink: [...stem, ...leaves], petals, head: { x: x + B / 2, y: cy + B / 2 } };
}

/** Soil: blocks of sand, thicker further down. */
function soil() {
  const out = [];
  for (let y = GROUND; y < H - 18; y += B) {
    const depth = (y - GROUND) / (H - 18 - GROUND);
    for (let x = 12; x < W - 12; x += B) if (hash(x * 0.71 + 3, y * 0.53 + 9) < 0.5 + depth * 0.45) out.push(x, y, B, B, 1);
  }
  return out;
}

export function drawGarden(state, theme) {
  const P = palette(theme);
  // The bed fills from the middle out.
  const from = Math.floor((BED - state.flowers.length) / 2);
  const beds = state.flowers.map((f, i) => ({ f, ...flower(f, from + i) }));
  const ground = soil();
  const newest = beds[beds.length - 1];
  const title = typeset('■ THE GARDEN', { size: 3 });
  const count = typeset(`PLANTED SO FAR: ${state.planted}`, { size: 2, tone: 0.55 });
  let label = '';
  if (newest) {
    const t = typeset(`@${newest.f.who}`, { size: 2 });
    const x = Math.round(Math.min(Math.max(newest.head.x - t.width / 2, 12), W - 12 - t.width));
    label = `<path fill="${P.fg}" d="${blockPath(t.blocks, x, newest.head.y - 3 * B - 22)}"/>`;
  }
  const flowers = beds.map(({ f, ink, petals }) => `<path fill="${P.fg}" d="${blockPath(ink)}"/><path fill="${SPECTRUM[f.colour]}" d="${blockPath(petals)}"/>`).join('');
  const lit = (x, y) => hash(x * 0.37 + 1, y * 0.41 + 2) < 0.7;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="A pixel garden of ${state.flowers.length} flowers planted by visitors${newest ? `; the newest by @${newest.f.who}` : ''}">
<style>${CALM}</style>
<defs>
${dotPattern('dots', P.dots)}
${dotPattern('litdots', '#fff', { size: 6, tile: 4 })}
<mask id="lit" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#litdots)"/><path fill="#fff" d="${blockPath(ground, 0, 0, lit)}"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="${P.bg}"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
<path fill="${P.fg}" d="${blockPath(title.blocks, 24, 24)}"/>
<path fill="${P.mix(0.55)}" d="${blockPath(count.blocks, W - 24 - count.width, 27)}"/>
<path fill="${P.mix(0.5)}" d="${blockPath(ground)}"/>
${flowers}
${label}
${newest ? light({ x: newest.head.x, y: newest.head.y, at: 1, loop: 6, reach: 520, speed: 420, width: 110, mask: 'lit' }) : ''}
</svg>
`;
}

// ---------------------------------------------------------------- README

/** The issue link that plants a colour. */
export function plantURL(k) {
  const name = NAMES[k];
  const body = `Press **Submit new issue** and a GitHub Action plants a ${name} flower in the garden on my profile, with your name on it. It takes about a minute, then this issue closes itself.\n\nOne flower per person a day. The garden keeps the newest ${BED}.`;
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`garden: plant ${name}`)}&body=${encodeURIComponent(body)}`;
}

function readmeSection(state) {
  const v = state.planted;
  const recent = state.flowers.slice(-6).reverse().map((f) => `[@${f.who}](https://github.com/${f.who}) (${NAMES[f.colour]})`).join(', ');
  const pic = `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="assets/garden-dark.svg?v=${v}">\n  <img alt="A pixel garden of flowers planted by visitors" src="assets/garden-light.svg?v=${v}" width="100%">\n</picture>`;
  const n = state.planted;
  return `${pic}\n\n**${n} ${n === 1 ? 'flower' : 'flowers'} planted so far.** Newest: ${recent}.`;
}

function writeAll(state) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  for (const t of ['light', 'dark']) fs.writeFileSync(path.join(ROOT, `assets/garden-${t}.svg`), drawGarden(state, t));
  const md = fs.readFileSync(README, 'utf8');
  const next = md.replace(/<!-- garden -->[\s\S]*?<!-- \/garden -->/, `<!-- garden -->\n${readmeSection(state)}\n<!-- /garden -->`);
  if (next === md && !md.includes('<!-- garden -->')) throw new Error('README has no <!-- garden --> section');
  fs.writeFileSync(README, next);
}

// ---------------------------------------------------------------- planting

async function api(method, url, body) {
  const r = await fetch(`https://api.github.com${url}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: 'pipe' }).toString().trim();

async function plant() {
  const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  // Every open garden issue, oldest first, so none is missed if runs overlap.
  const open = (await api('GET', `/repos/${REPO}/issues?state=open&per_page=100&sort=created&direction=asc`))
    .filter((i) => !i.pull_request && /^garden:/i.test(i.title.trim()));
  const replies = [];
  for (const i of open) {
    const who = i.user.login, m = TITLE.exec(i.title.trim());
    if (!m) {
      replies.push({ i, ok: false, text: `I couldn't tell which colour you meant. The colour links on the profile (https://github.com/${OWNER}) fill this in for you: ${NAMES.join(', ')}.` });
      continue;
    }
    const k = NAMES.indexOf(m[1].toLowerCase());
    // (The starter flower, issue 0, doesn't count.)
    if (state.flowers.some((f) => f.issue && f.who === who && Date.parse(i.created_at) - Date.parse(f.at) < DAY)) {
      replies.push({ i, ok: false, text: "You've already planted today, so this one stays a seed. Come back tomorrow." });
      continue;
    }
    state.flowers.push({ who, colour: k, at: i.created_at, issue: i.number });
    state.flowers = state.flowers.slice(-BED);
    state.planted += 1;
    replies.push({ i, ok: true, text: `Planted. Your ${NAMES[k]} flower is in the garden on https://github.com/${OWNER} now, with your name on it (the picture can take a minute to refresh). Thanks for stopping by.` });
  }
  const planted = replies.filter((r) => r.ok);
  if (planted.length) {
    writeAll(state);
    if (process.env.GITHUB_ACTIONS === 'true') {
      git('config', 'user.name', 'github-actions[bot]');
      git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    }
    git('add', 'garden/garden.json', 'assets/garden-light.svg', 'assets/garden-dark.svg', 'README.md');
    git('commit', '-m', `Garden: ${planted.map((r) => `@${r.i.user.login} planted ${TITLE.exec(r.i.title.trim())[1].toLowerCase()}`).join(', ')}`);
    for (let attempt = 0; ; attempt++) {
      try { git('push'); break; } catch (e) {
        if (attempt === 2) throw e;
        git('pull', '--rebase');
      }
    }
  }
  for (const r of replies) {
    await api('POST', `/repos/${REPO}/issues/${r.i.number}/comments`, { body: r.text });
    await api('PATCH', `/repos/${REPO}/issues/${r.i.number}`, { state: 'closed', state_reason: r.ok ? 'completed' : 'not_planned' });
  }
  console.log(`garden: ${planted.length} planted, ${replies.length - planted.length} turned away, ${state.flowers.length} in the bed`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'plant') await plant();
  else {
    writeAll(JSON.parse(fs.readFileSync(STATE, 'utf8')));
    console.log('redrew the garden');
  }
}
