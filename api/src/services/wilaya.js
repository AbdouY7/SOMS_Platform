// src/services/wilaya.js
// wilayaNormalize(value) -> '01'..'58' | null      (never guesses)
// wilayaList()           -> all active wilayas      (cached after first call)
//
// Expects a Prisma model `Wilaya { code, nameAr, nameFr, nameEn, aliases String[], isActive }`.
import { prisma } from '../prisma.js';

let listCache = null;
let indexCache = null; // Map<normalizedText, code | null>  (null = ambiguous)

/** trim, lowercase, strip diacritics (+ light Arabic letter folding). */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')          // Latin accents and Arabic tashkeel
    .replace(/\u0640/g, '')          // tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[\s'’\-_.]+/g, ' ')
    .trim();
}

async function load() {
  if (listCache) return;
  const rows = await prisma.wilaya.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  const index = new Map();

  const add = (text, code) => {
    const key = normalizeText(text);
    if (!key) return;
    if (index.has(key) && index.get(key) !== code) index.set(key, null); // ambiguous -> never guess
    else index.set(key, code);
  };

  for (const w of rows) {
    add(w.code, w.code);
    add(w.nameAr, w.code);
    add(w.nameFr, w.code);
    add(w.nameEn, w.code);
    for (const alias of w.aliases ?? []) add(alias, w.code);
  }
  listCache = rows;
  indexCache = index;
}

export async function wilayaNormalize(value) {
  if (value === null || value === undefined) return null;
  await load();
  const key = normalizeText(value);
  if (!key) return null;

  if (/^\d{1,2}$/.test(key)) {
    const code = key.padStart(2, '0');
    const n = Number(code);
    if (n < 1 || n > 58) return null;
    return indexCache.get(code) ?? null;
  }
  return indexCache.get(key) ?? null;
}

export async function wilayaList() {
  await load();
  return listCache;
}

/** For tests or after editing the wilayas table. */
export function resetWilayaCache() {
  listCache = null;
  indexCache = null;
}
