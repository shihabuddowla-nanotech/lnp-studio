# User Guide — LNP / Liposome Formulation Studio

A quick, practical guide to using the dashboard. No installation needed — it runs in
your web browser.

---

## 1. What this tool does

You enter a lipid composition (which lipids and in what molar ratios) and a total
concentration, and the dashboard instantly works out **exactly how much of each lipid
stock solution to pipette**, plus a set of **predicted particle characteristics**
(morphology, size, charge, encapsulation). It also exports everything to Excel.

It is an **online tool** — you need an internet connection to open it. Anything you save
stays **in your own browser** (see [Section 9](#9-your-data--saving)).

---

## 2. Opening the dashboard

1. Open the link your lab shared (e.g. `https://lnp-studio.onrender.com`) in any modern
   browser (Chrome, Edge, Firefox, Safari).
2. **The very first load after a quiet period can take ~30–60 seconds** while the server
   wakes up. After that it's fast. This is normal.
3. You'll always get the latest version automatically — just refresh the page.

> Tip: bookmark the link. There's no app to install.

---

## 3. The screen at a glance

- **Top bar** — the title, an **Online/Offline** indicator, a **Sync** button (optional,
  see [Section 8](#8-optional-features)), and a **light/dark theme** toggle (sun/moon).
- **Snapshot cards** (four boxes near the top) — a live summary of your current
  formulation: **Total Concentration**, **Lipids in Matrix**, **Predicted Size**, and
  **Encapsulation Eff.** They update as you work.
- **Lipid Repository** — where you search for and add lipids.
- **Formulation Matrix** — the main table where you enter ratios and read results.
- **Prediction cards** — estimated particle properties.

---

## 4. Build a formulation — step by step

### Step 1 — Add your lipids

You can add up to **15 lipids**. Three ways:

- **Search:** type in the **"Search Avanti lipids…"** box (by name, abbreviation, or
  class) and click a result. It's added to the matrix as a new column.
- **Load an example:** use the **"Load example…"** dropdown to instantly load a complete
  literature formulation (e.g. *MC3 mRNA-LNP*, *SM-102 mRNA-LNP*, *Conventional
  Liposome*). Great for learning the tool or as a starting point.
- **Add a custom lipid:** click **"Add custom lipid"** if your lipid isn't listed (see
  [Section 6](#6-adding-a-custom-lipid)).

### Step 2 — Set the total concentration and volume

Just above the matrix:

- **Total Concentration in Thin Film Solution (mM)** — the total lipid concentration you
  want. This is your anchor: set it, and each lipid's amount is filled in from its molar
  share.
- **Solution volume (mL)** — the volume you're making (often `1`).

If either is missing, the app shows an amber reminder and leaves the calculated cells
blank until you fill it in.

### Step 3 — Enter your composition (molar ratios)

In the matrix, the **Molar ratio** row is editable (marked with an **EDIT** badge and a
white box). Type the relative parts for each lipid — e.g. `50`, `10`, `38.5`, `1.5`.
They don't need to add up to 100; the tool normalises them into **Molar %** for you.

### Step 4 — Set each stock concentration

The **Stock solution conc. (mg/ml)** row is also editable. Enter the concentration of the
stock you'll pipette from for each lipid. This drives the final pipetting volumes.

### Step 5 — Read your result

The bold **"Vol. of stock for 1 ml film (µl)"** row is the key output: **the volume of
each lipid's stock solution to pipette and combine.** The **Total** column shows the
combined volume. That's your recipe.

---

## 5. Reading the matrix

Each column is a lipid; the last column is the **Total**. Only the rows with an **EDIT**
badge (white boxes) are editable — **Molar ratio** and **Stock solution conc.**
Everything else is **calculated automatically** and shown in a muted style:

| Row | Meaning |
|---|---|
| **Molar ratio** *(edit)* | Relative parts you type. |
| Molar % | Normalised composition (adds to 100%). |
| Molar weight (g/mol) | From the lipid database. |
| **Stock solution conc. (mg/ml)** *(edit)* | Concentration of your pipetting stock. |
| Conc. in thin film sol. (mM) | Each lipid's concentration in the final solution. |
| n in thin film sol. (mmol) | Moles of each lipid. |
| Mass (mg) | Mass of each lipid. |
| **Vol. of stock for 1 ml film (µl)** | **What to pipette** (bold = the key output). |

The little **ⓘ** icon on each row explains it on hover. The colored dot in each column
header shows the lipid's class.

- **It's reactive:** change any editable number and the whole table recalculates instantly.
- **Remove a lipid:** click the small **×** in its column header. The remaining lipids
  re-balance and your total concentration stays the same.
- **Clear amounts:** the **"Clear amounts"** button keeps your composition but wipes the
  numbers, so you can re-enter a different total.
- Below the matrix, an **SI Unit Reference** table mirrors everything in SI units.

---

## 6. Adding a custom lipid

Click **"Add custom lipid"** to open the form. Two ways to fill it:

- **Auto-fill from Avanti:** paste an **Avanti product page URL** into the link field and
  click **Fetch** (or click out of the field). The tool reads the page and fills in the
  name, molecular weight, and class for you to review. (Only Avanti Research / Avanti
  Lipids URLs are supported. If you're offline or it can't read the page, just type the
  details in.)
- **Manual entry:** type the abbreviation, molecular weight, class, and (optionally) a
  pKa and a product web link.

Click save and the lipid is added to your repository (searchable from then on) and to the
matrix. The same lipid won't be saved twice. If you added a product link, the lipid's name
in the matrix header becomes a clickable link to that page.

---

## 7. Predictions

The prediction cards update live with your formulation:

- **Morphology** — the likely particle type (e.g. Solid Core LNP, Liposome, Lipoplex),
  with a confidence level.
- **Particle Size & Dispersity** — estimated diameter (nm) and PDI.
- **Zeta Potential** — surface charge at physiological pH 7.4 and endosomal pH 4.0.
- **Encapsulation Efficiency** — predicted payload trapping, shown as a ring (%).

Each card has a **"How this is estimated"** link you can expand to see the reasoning.

> ⚠️ **These are theoretical estimates** from physically-motivated models — not
> measurements. Real values depend on your exact chemistry, mixing and storage. **Always
> validate experimentally** (DLS, zeta, RiboGreen).

### Process & Payload (drives the predictions)

In the **Process & Payload** card you can set:

- **Payload** type (mRNA, siRNA, DNA, small molecule, protein, or None) and amount.
- **N/P ratio**, **Flow rate ratio**, and **Total flow rate**.

These refine the size and encapsulation predictions. The **Composition by class** bar
shows your formulation broken down by lipid type.

---

## 8. Optional features

- **Export .xlsx** — downloads a multi-sheet Excel workbook (Formulation, SI Units,
  Predictions, Lipid Library). Add at least one lipid first.
- **Theme** — the sun/moon button switches between light and dark mode. Your choice is
  remembered.

---

## 9. Your data & saving

- **Lipids you add are saved in your own browser** (so they're there next time you open
  the site on the **same browser and computer**).
- Your **current formulation** is also remembered locally, so a refresh won't lose your work.
- **Data is not shared between people or devices.** A lipid you add won't appear for a
  colleague, and won't follow you to another computer or browser.
- Saved data does **not** persist in **private/incognito** windows, or if you clear your
  browser's site data.
- Need to share a formulation? Use **Export .xlsx** and send the file.

---

## 10. Quick troubleshooting

| Situation | What's happening |
|---|---|
| First load is slow (~30–60 s) | The server was asleep and is waking up. Normal; it's fast afterwards. |
| Nothing loads | The tool is online-only — check your internet connection. |
| Calculated cells are blank | Set the **Solution volume** and **Total Concentration** (amber reminders point this out). |
| A colleague can't see my saved lipid | Saved data is local to each browser — it isn't shared. Export to Excel to share. |
| I don't see an "Install" option | By design — this is a website, not an installable app. Just use the link. |

---

## Disclaimer

The predictive outputs are physically-motivated heuristics for design-space guidance
only — validate experimentally. Curated molecular weights are vendor spec-sheet values
and remain editable.

*Pharmaceutical Nanotechnology, University of Helsinki.*
