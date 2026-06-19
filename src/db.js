// ---------------------------------------------------------------------------
//  Local lipid repository (IndexedDB via Dexie). Stored per-browser on each
//  user's device; nothing is shared with a server or between users.
// ---------------------------------------------------------------------------
import { SEED_LIPIDS } from './lipids.js';

const Dexie = window.Dexie;
export const db = new Dexie('LiposomeDashboard');

db.version(1).stores({
  lipids: 'id, name, abbr, cls',
  formulations: '++localId, name, savedAt',
  meta: 'key',
});

// --- seeding ---------------------------------------------------------------
export async function initDB() {
  await db.open();
  const count = await db.lipids.count();
  if (count === 0) {
    await db.lipids.bulkPut(SEED_LIPIDS.map((l) => ({ ...l })));
    await db.meta.put({ key: 'seededAt', value: new Date().toISOString() });
  } else {
    // make sure newly-added seed lipids appear after an app update
    const existing = new Set((await db.lipids.toCollection().primaryKeys()));
    const missing = SEED_LIPIDS.filter((l) => !existing.has(l.id)).map((l) => ({ ...l }));
    if (missing.length) await db.lipids.bulkPut(missing);
  }
  return getAllLipids();
}

export async function getAllLipids() {
  return db.lipids.orderBy('name').toArray();
}

export async function updateLipid(id, patch) {
  await db.lipids.update(id, patch);
}

// Add a user-defined lipid to the local repository (immediately searchable).
// If a lipid with the same product link, abbreviation or full name already
// exists (e.g. the same Avanti page fetched and saved again), refresh that
// entry in place instead of inserting a duplicate row.
export async function addCustomLipid({ name, abbr, mw, link, cls, pka }) {
  const norm = (s) => (s || '').trim().toLowerCase();
  const nLink = norm(link), nAbbr = norm(abbr), nName = norm(name);
  const all = await getAllLipids();
  const existing = all.find((l) =>
    (nLink && norm(l.link) === nLink) ||
    (nAbbr && norm(l.abbr) === nAbbr) ||
    (nName && norm(l.name) === nName));

  if (existing && !existing.custom) return existing; // matches a built-in repository lipid — reuse as-is

  const slug = (abbr || name || 'lipid').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = existing || { stock: 25, smiles: null };
  const record = {
    ...base,
    id: existing ? existing.id : `custom-${slug}-${Date.now().toString(36)}`,
    name: name || abbr,
    abbr: abbr || name,
    mw: Number(mw),
    cls: cls || 'helper',
    pka: pka != null && pka !== '' ? Number(pka) : null,
    amines: cls === 'ionizable' || cls === 'cationic' ? 1 : 0,
    link: link || (existing && existing.link) || null,
    source: 'Custom',
    custom: true,
  };
  await db.lipids.put(record);
  return record;
}

export async function deleteLipid(id) {
  return db.lipids.delete(id);
}

// --- saved formulations ----------------------------------------------------
export async function saveFormulation(name, state, extras) {
  const payload = {
    name,
    savedAt: new Date().toISOString(),
    state,
    extras: extras || null,
  };
  return db.formulations.add(payload);
}
export async function listFormulations() {
  return db.formulations.orderBy('savedAt').reverse().toArray();
}
export async function deleteFormulation(localId) {
  return db.formulations.delete(localId);
}
