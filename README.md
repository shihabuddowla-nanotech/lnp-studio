# LNP / Liposome Formulation Studio

An **online web app** for designing liposome and lipid-nanoparticle (LNP)
formulations: a reactive stoichiometric matrix, a local Avanti lipid repository,
SI-unit reference, Excel export, and a predictive engine for the resulting particle
characteristics. It is served over the web (**online-only** — not installable and no
offline mode); each browser keeps its own saved lipids in IndexedDB.

![icon](icons/icon-192.png)

---

## Quick start

This build has **no compile step** — every library is vendored locally. It only needs
a tiny web server (browsers block ES modules over `file://`); the same `serve.py` runs
it locally and in the cloud.

**Windows:** double-click **`start.cmd`**.
It serves the app at <http://localhost:8080/> and opens your browser. Uses Python
if present (auto-detected), otherwise falls back to a dependency-free PowerShell
server.

**Manually (any OS with Python):**

```bash
python serve.py 8080      # or: py -3 serve.py 8080
```

Then open <http://localhost:8080/>.

### Hosting (shared link, auto-updating)
The app is deployed as a **Render** web service running `serve.py`, auto-deploying from
GitHub on every push — so one link always serves the latest version to the whole lab.
It is **online-only**: no offline cache, and it cannot be installed as an app. Saved
lipids live in each user's own browser (IndexedDB) and are not shared between people.

```bash
# one-time: put the project on GitHub
git init && git add -A && git commit -m "Initial commit"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
# then on Render: New → Blueprint → pick the repo (it reads render.yaml) → Deploy
```

After that, every `git push` redeploys automatically and all users get the update on
their next reload.

---

## Features

### 1. Avanti lipid repository + smart search
- ~36 seeded Avanti Polar Lipids (ionizable, cationic, helper PC/PE, sterol,
  PEG-lipid, anionic, fluorescent) with molar weight, apparent pKa, default stock
  concentration and SMILES where available.
- Type-ahead search by name, abbreviation or class. Selecting a lipid pulls its
  fixed properties into the matrix automatically. The auto-complete dropdown is
  layered above all tables and cards.
- **Add custom lipid** — a modal to register your own lipid (abbreviation, molecular
  weight, class, optional pKa and a product web link). It is written to IndexedDB,
  is immediately searchable, and its name renders as a clickable hyperlink (opening
  the product page in a new tab) in the matrix header.
  - **Auto-fill from Avanti** — paste an Avanti product URL and click **Fetch**
    (or just blur the field). The page is scraped *server-side* (`/api/fetch-lipid`
    in `serve.py` — direct browser scraping is blocked by CORS) and the chemical
    name, product code, molecular weight and class are auto-filled for review. A
    spinner shows while fetching; if you are offline or the scrape fails you get a
    graceful "enter details manually" notice.
- Stored locally in **IndexedDB** (via Dexie), per browser on each user's device — saved
  lipids are not shared between users or computers (export to Excel to share).

### Light / dark theme
A sun/moon toggle in the header switches between a soft light theme (slate-50) and a
dark theme (zinc-900). The choice is remembered and applied before first paint to
avoid any flash; it defaults to your OS preference.

### 2. Reactive formulation matrix
- Columns = lipids (up to **15**), rows = physicochemical properties, plus a **Total** column.
- Rows: molar ratio, molar %, molar weight, stock concentration, concentration in
  thin-film solution (mM), n (mmol), mass (mg), volume of stock for 1 ml film (µl).
- **Strict editable / read-only fields.** To protect the stoichiometry, only three
  inputs are editable; everything else is auto-generated and locked (shown with a
  muted fill and no border, vs. a white bordered box with an "EDIT" badge for the
  editable rows):
  - **Molar ratio** (editable) — re-slices the composition at *constant total
    concentration*; the edited lipid takes/cedes share, the others keep proportions.
  - **Stock solution concentration** (editable) — drives the stock volume needed.
  - **Total Concentration in Thin Film Solution (mM)** (editable master, see below).
  - *Read-only / auto-generated:* molar %, molar weight, concentration (mM), n (mmol),
    mass (mg) and volume of stock for 1 ml film (µl).
- **Total Concentration in Thin Film Solution (mM)** — a prominent master field
  above the matrix. Setting it redistributes each lipid's concentration by its
  molar %; editing any individual concentration, ratio or mass instantly recomputes
  the total. (The total is a *derived read-out* that only writes back on direct user
  input, so the multi-directional updates cannot form a circular loop.)
- **Solution volume (mL)** master field. If a prerequisite is missing the app
  prompts for it and leaves dependent cells blank.

### 3. SI-unit reference table
A read-only mirror converting the matrix into SI units (M, l, mol, g, ml).

### 4. Predictive engine
Distinct visualization cards that react live to the formulation:
- **Morphology** — logic tree (Aqueous Core Liposome → Solid Core LNP → Lipoplex →
  micelle / passively-loaded vesicle) from the ionizable-lipid / nucleic-acid combo.
- **Size & PDI** — regressor inversely correlating PEG mol % and flow-rate ratio with
  size, with a hard **40 nm** physical floor.
- **Zeta potential** — Henderson–Hasselbalch estimate at physiological pH 7.4 and
  endosomal pH 4.0 from the ionizable pKa.
- **Encapsulation efficiency** — N/P-driven saturation curve (N/P computed from the
  ionizable amine : payload phosphate ratio, or entered manually).

### 5. Excel export
**Export .xlsx** (SheetJS) writes a 4-sheet workbook: Formulation, SI Units,
Predictions, Lipid Library.

---

## Project layout

```
index.html              app shell (loads vendored libs + module entry)
service-worker.js       retired self-destruct SW (flushes the old offline cache)
render.yaml             Render deploy blueprint (web service running serve.py)
requirements.txt        empty — serve.py is standard-library only
serve.py / serve.ps1    dependency-free servers (correct MIME types, no-cache headers)
start.cmd               one-click local launcher (Windows)
icons/                  PNG icons (favicon + in-app logo)
vendor/                 React, ReactDOM, htm, Dexie, SheetJS, Tailwind (vendored)
src/
  main.js               bootstrap + one-time service-worker teardown
  lipids.js             Avanti seed data + example formulations
  calc.js               reactive stoichiometric engine + edit handlers
  predict.js            predictive engine (morphology/size/zeta/EE)
  db.js                 Dexie repository (local IndexedDB)
  exportXlsx.js         SheetJS workbook builder
  components/           React UI (htm — no JSX build required)
```

## Tech stack
React 18 (UMD) + `htm` (no build step) · Tailwind CSS (Play CDN, vendored) ·
Dexie / IndexedDB · SheetJS (xlsx) · Python `http.server` (serve.py).

## Developer note
The app is online-only and the server sends `Cache-Control: no-cache`, so edits show up
on the next reload — there is no cache version to bump. `service-worker.js` is now a
one-time kill switch that flushes the old offline cache from returning browsers; once
everyone has loaded a post-migration build it can be deleted along with its teardown in
`src/main.js`.

## Disclaimer
The predictive outputs are **physically-motivated heuristics for design-space
guidance only** — validate experimentally (DLS, zeta, RiboGreen/RiboGreen-equivalent).
Curated molar weights are vendor spec-sheet values and remain user-editable.
