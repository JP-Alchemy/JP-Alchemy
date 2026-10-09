// This profile is drawn with the website's own parts (github.com/JP-Alchemy/CV):
// the pixel font, the mark, the halftone pictures and the brand colours.
// Locally that's the site's folder next to this one; the workflow checks the
// site out into ./site. SITE_DIR points somewhere else.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const SITE = path.resolve(process.env.SITE_DIR || path.join(ROOT, '../personal-website-v3'));
const load = (p) => import(pathToFileURL(path.join(SITE, p)).href);

export const { typeset, measure } = await load('src/engine/typeset.js');
export const { ICONS, iconFrames } = await load('src/icons.js');
export const { imageBlocks, setPhoto, GENERATORS } = await load('src/engine/images.js');
export const { THEMES, SPECTRUM, COLOURS, rgb } = await load('src/brand.js');
export const { Raster, decodePNG } = await load('scripts/png.mjs');
