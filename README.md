# 🧶 Tric — custom raglan pullover pattern builder

A knitting pattern generator that runs entirely in the browser. Enter your gauge swatch and
target measurements and it writes a complete top-down raglan pullover pattern, with:

- **Top-down seamless raglan** construction (increase every other round, with compound
  body-only / sleeve-only increases when body and sleeves need different amounts)
- **Back shaping with German short rows** driven by the back/front length difference, with
  raglan increases integrated into the short rows where they cross the raglan lines (and
  overflow short rows above the hem if the raise outgrows the sleeve room)
- **Ribbing options** (1×1, 2×2, 3×1, twisted 1×1, or rolled edge) with independent depth
  for neckband, hem, and cuffs
- **A live, to-scale SVG schematic** with all measurements and stitch counts
- **Shareable URLs** — every parameter is stored in the query string as you type, so you can
  bookmark a size or send the exact pattern to someone
- A rough yarn-meterage estimate and a printable pattern layout

No build step, no dependencies, no server: plain HTML/CSS/JS.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Tests

```sh
node --test
```

The suite checks the engine against a published free pattern — [Midnight Glow / DROPS 254-39](https://www.garnstudio.com/pattern.php?id=11893&cid=19)
(top-down stockinette raglan, 17 sts × 22 rows = 10 cm): feeding the generator the finished
measurements each DROPS size implies at that gauge reproduces the published stitch counts
(neck cast-on exactly, body/sleeve/wrist within a few stitches, yoke depth within 2 cm for
the sizes DROPS knits with plain every-other-round raglan). It also sweeps the input space
for internal consistency: sections always sum, measurements are hit in cm, longer backs
produce more short rows with back = front at separation, short-row turns stay inside the
sleeves, and rib edges land on full repeats.

## Deploy to GitHub Pages

The repo root is a ready-to-serve static site. In **Settings → Pages → Build and
deployment**, set **Source** to **Deploy from a branch** and pick `main` / root.

## Notes on the math

- Gauge is converted to stitches/rows per cm; every measurement is rounded to workable
  stitch counts (ribbing edges are rounded to the rib repeat).
- Neck stitches are split ⅓ back / ⅓ front / ⅙ per sleeve — then the back is started
  narrower by exactly the stitches the short-row increases will add to it, so back and
  front hold equal counts from the end of the back shaping to the underarm separation.
- Underarm cast-on is ≈ 8 % of the chest stitch count (4 % per side).
- The generator warns about tight necks, too-steep sleeve tapers, short-row overcrowding,
  and yoke-depth conflicts instead of silently producing an unknittable pattern.

Numbers are a starting point — always trust your own swatch and try the sweater on as you go.
