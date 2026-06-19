// ---------------------------------------------------------------------------
//  Local lipid repository (IndexedDB via Dexie) + best-effort online sync.
//  Works fully offline; when a network is available it tops up missing
//  structure data (SMILES / reference MW) from the PubChem PUG-REST API and
//  caches it locally.
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

export async function getMeta(key) {
  const r = await db.meta.get(key);
  return r ? r.value : null;
}
export async function setMeta(key, value) {
  await db.meta.put({ key, value });
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

// --- online sync (best effort) --------------------------------------------
//  Fills in missing SMILES + a reference molecular weight from PubChem.
//  Curated MW values are preserved (salt forms differ); the fetched value is
//  stored as `mwRef` for transparency.
async function pubchemLookup(name) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularWeight,CanonicalSMILES/JSON`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const p = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
  if (!p) throw new Error('no property');
  return { mwRef: p.MolecularWeight != null ? Number(p.MolecularWeight) : null, smiles: p.CanonicalSMILES || null };
}

export async function syncFromRemote({ onProgress, max = 10 } = {}) {
  if (!navigator.onLine) return { ok: false, reason: 'offline', updated: 0 };
  const all = await getAllLipids();
  const targets = all.filter((l) => !l.smiles).slice(0, max);
  let updated = 0, tried = 0;
  for (const lip of targets) {
    tried++;
    if (onProgress) onProgress({ tried, total: targets.length, name: lip.abbr });
    let found = null;
    for (const q of [lip.name, lip.abbr]) {
      try { found = await pubchemLookup(q); if (found && (found.smiles || found.mwRef)) break; }
      catch (_) { /* try next */ }
    }
    if (found && (found.smiles || found.mwRef)) {
      const patch = {};
      if (found.smiles && !lip.smiles) patch.smiles = found.smiles;
      if (found.mwRef) patch.mwRef = found.mwRef;
      if (Object.keys(patch).length) { await updateLipid(lip.id, patch); updated++; }
    }
    // be polite to the public API
    await new Promise((r) => setTimeout(r, 250));
  }
  await setMeta('lastSync', new Date().toISOString());
  return { ok: true, updated, tried };
}
