/* Tests for the Tric pattern engine.
   Run with:  node --test

   Reference pattern: "Midnight Glow" / DROPS 254-39 by DROPS Design (free pattern),
   https://www.garnstudio.com/pattern.php?id=11893&cid=19
   A knitted jumper in DROPS Nepal, worked top down with raglan, stocking stitch.

   Published numbers (sizes S - M - L - XL - XXL - XXXL):
     Gauge:            17 sts and 22 rows = 10 x 10 cm in stocking stitch
     Neck cast-on:     80 - 88 - 88 - 104 - 104 - 112 sts
     Body after divide: 164 - 176 - 192 - 208 - 228 - 248 sts
     Underarm cast-on:  10 - 12 - 14 - 18 - 20 - 22 sts per side
     Sleeve (held + picked up): 58 - 60 - 68 - 74 - 78 - 82 sts
     Sleeve after tapering:     48 - 50 - 52 - 54 - 56 - 58 sts (before cuff rib)
     Yoke depth at divide:      22 - 23 - 25 - 25 - 28 - 30 cm (from mid-front marker)

   We derive the finished measurements each size implies at the published gauge
   (sts / 1.7 per cm) and check the generator reproduces DROPS's stitch counts. */

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { computePattern, RIBS } = require("../pattern.js");

const SPC = 17 / 10; // sts per cm at the DROPS gauge

// One entry per DROPS size: published stitch counts + lengths.
const DROPS = [
  { size: "S",    neckCO: 80,  body: 164, sleeve: 58, wristPreRib: 48, yokeCm: 22, bodyFromDivide: 30, sleeveLen: 46 },
  { size: "M",    neckCO: 88,  body: 176, sleeve: 60, wristPreRib: 50, yokeCm: 23, bodyFromDivide: 30, sleeveLen: 46 },
  { size: "L",    neckCO: 88,  body: 192, sleeve: 68, wristPreRib: 52, yokeCm: 25, bodyFromDivide: 30, sleeveLen: 45 },
  { size: "XL",   neckCO: 104, body: 208, sleeve: 74, wristPreRib: 54, yokeCm: 25, bodyFromDivide: 31, sleeveLen: 44 },
  { size: "XXL",  neckCO: 104, body: 228, sleeve: 78, wristPreRib: 56, yokeCm: 28, bodyFromDivide: 30, sleeveLen: 42 },
  { size: "XXXL", neckCO: 112, body: 248, sleeve: 82, wristPreRib: 58, yokeCm: 30, bodyFromDivide: 30, sleeveLen: 40 },
];

// Finished measurements implied by DROPS's counts at their gauge, fed to the generator.
// DROPS uses a 2x2 rib for neck, hem and cuffs; no waist shaping (hem = chest);
// no back raise (front and back are worked to the same length).
function dropsInput(d) {
  return {
    gs: 17, gw: 10, gr: 22, gh: 10,
    nk: d.neckCO / SPC,
    ch: d.body / SPC,
    wa: d.body / SPC,
    es: 0,
    fl: d.bodyFromDivide, bl: d.bodyFromDivide,
    yd: 0,
    ua: d.sleeve / SPC,
    wr: d.wristPreRib / SPC,
    sl: d.sleeveLen,
    nrt: "2x2", nrd: 6, hrt: "2x2", hrd: 6, crt: "2x2", crd: 6,
  };
}

const within = (actual, expected, tol, label) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `${label}: got ${actual}, published ${expected} (tolerance ±${tol})`);

test("reproduces DROPS 254-39 stitch counts at the published gauge, all 6 sizes", () => {
  for (const d of DROPS) {
    const { calc } = computePattern(dropsInput(d));
    // Neck cast-on: exact — same gauge, same rib multiple.
    within(calc.neckSts, d.neckCO, 0, `${d.size} neck cast-on`);
    // Body at separation: ±4 sts (< 2.5 cm) of the published count.
    within(calc.bodyTotal, d.body, 4, `${d.size} body sts after divide`);
    // Sleeve after pick-up: ±3 sts. (DROPS casts on more underarm sts and
    // compensates with fewer raglan rounds; totals must still agree.)
    within(calc.sleeveTotal, d.sleeve, 3, `${d.size} sleeve sts`);
    // Wrist before the cuff rib: ±4 sts (rib-multiple rounding).
    within(calc.wristSts, d.wristPreRib, 4, `${d.size} wrist sts`);
  }
});

test("yoke depth matches DROPS for sizes knit with plain every-other-round raglan", () => {
  // S and M are dominated by the simple every-2nd-round raglan phase, like ours.
  // (Bigger DROPS sizes switch to compound spacing and much larger underarm
  // cast-ons, which trades yoke depth differently — stitch counts still match.)
  for (const d of DROPS.slice(0, 2)) {
    const { calc } = computePattern(dropsInput(d));
    within(calc.actual.yokeDepth, d.yokeCm, 2, `${d.size} yoke depth (cm)`);
  }
  for (const d of DROPS) {
    const { calc } = computePattern(dropsInput(d));
    within(calc.actual.yokeDepth, d.yokeCm, d.yokeCm * 0.25, `${d.size} yoke depth (cm, loose)`);
  }
});

/* ------------------------------------------------------------------ */
/* Generic sanity checks across the whole input space                  */
/* ------------------------------------------------------------------ */

const BASE = {
  gs: 22, gw: 10, gr: 30, gh: 10,
  nk: 56, ch: 100, wa: 96, es: 0,
  fl: 38, bl: 40, yd: 0,
  ua: 36, wr: 20, sl: 45,
  nrt: "1x1", nrd: 3, hrt: "2x2", hrd: 5, crt: "2x2", crd: 5,
};

function sweep(fn) {
  for (let nk = 40; nk <= 70; nk += 5)
    for (let ch = 70; ch <= 150; ch += 16)
      for (let bl = 38; bl <= 46; bl += 4)
        fn({ ...BASE, nk, ch, wa: ch - 4, bl, ua: ch * 0.36, wr: ch * 0.2 });
}

test("stitch accounting is internally consistent everywhere", () => {
  sweep((input) => {
    const { calc: c } = computePattern(input);
    const where = JSON.stringify({ nk: input.nk, ch: input.ch, bl: input.bl });
    // Sections at separation sum to the body total.
    assert.strictEqual(c.frontSep + c.backSep + 2 * c.uaCO, c.bodyTotal, `body sum ${where}`);
    assert.strictEqual(c.sleeveSep + c.uaCO, c.sleeveTotal, `sleeve sum ${where}`);
    // Cast-on distribution covers the whole neck.
    assert.strictEqual(c.back0 + c.front0 + 2 * c.sleeve0, c.neckSts, `neck split ${where}`);
    // Raglan phases: common + one-sided extras reconstruct the totals.
    assert.strictEqual(c.rCommon + c.rBodyOnly, c.rBody, `body rounds ${where}`);
    assert.strictEqual(c.rCommon + c.rSleeveOnly, c.rSleeve, `sleeve rounds ${where}`);
    // Everything is a non-negative integer.
    for (const k of ["neckSts", "front0", "back0", "sleeve0", "uaCO", "rBody", "rSleeve",
                     "frontSep", "backSep", "sleeveSep", "bodyTotal", "sleeveTotal",
                     "srPairs", "hemSrPairs", "wristSts", "hemRibSts"]) {
      assert.ok(Number.isInteger(c[k]) && c[k] >= 0, `${k} is a non-negative integer ${where}: ${c[k]}`);
    }
  });
});

test("generated sizes hit the requested measurements", () => {
  sweep((input) => {
    const { calc: c } = computePattern(input);
    const where = JSON.stringify({ nk: input.nk, ch: input.ch, bl: input.bl });
    within(c.actual.neck, input.nk, 1.2, `neck cm ${where}`);
    within(c.actual.chest, input.ch, 2.5, `chest cm ${where}`);
    within(c.actual.hem, input.wa, 1.5, `hem cm ${where}`);
    within(c.actual.upperArm, input.ua, 2, `upper arm cm ${where}`);
    within(c.actual.wrist, input.wr, 1.5, `wrist cm ${where}`);
  });
});

test("a longer back means more short rows, and back == front at separation", () => {
  let prev = -1;
  for (let bl = 38; bl <= 50; bl += 1) {
    const { calc: c } = computePattern({ ...BASE, bl });
    const totalPairs = c.srPairs + c.hemSrPairs;
    assert.ok(totalPairs >= prev, `pairs non-decreasing at bl=${bl} (${totalPairs} < ${prev})`);
    prev = totalPairs;
    // Raise realized ≈ raise requested.
    within((totalPairs * 2) / c.rpc, bl - BASE.fl, 10 / c.rpc, `raise cm at bl=${bl}`);
    // The narrower back split absorbs the asymmetric short-row increases.
    assert.ok(Math.abs(c.backSep - c.frontSep) <= 1, `back ${c.backSep} == front ${c.frontSep} at bl=${bl}`);
    assert.strictEqual(c.back0 + c.srBackGain + 2 * c.rBody, c.backSep, `back accounting at bl=${bl}`);
  }
});

test("short-row turns always stay inside the sleeve sections", () => {
  sweep((input) => {
    const { calc: c } = computePattern({ ...input, bl: input.fl + 8 });
    if (c.srPairs > 0) {
      const deepestTurn = 3 + 2 * (c.srPairs - 1); // SR_INTO + SR_STEP*(pairs-1)
      const sleeveAtThatPoint = c.sleeve0 + c.srPairs;
      assert.ok(deepestTurn < sleeveAtThatPoint,
        `turn ${deepestTurn} inside sleeve ${sleeveAtThatPoint} (sleeve0=${c.sleeve0}, pairs=${c.srPairs})`);
    }
  });
});

test("ribbed edges land on full rib repeats", () => {
  for (const rib of ["1x1", "2x2", "3x1", "tw"]) {
    const { calc: c } = computePattern({ ...BASE, nrt: rib, hrt: rib, crt: rib });
    assert.strictEqual(c.neckSts % RIBS[rib].repeat, 0, `neck multiple of ${rib}`);
    assert.strictEqual(c.hemRibSts % RIBS[rib].repeat, 0, `hem multiple of ${rib}`);
    assert.strictEqual(c.wristSts % RIBS[rib].repeat, 0, `cuff multiple of ${rib}`);
  }
});

test("gauge changes leave the finished centimetres unchanged", () => {
  const gauges = [
    { gs: 10, gw: 10, gr: 14, gh: 10 },  // super bulky
    { gs: 17, gw: 10, gr: 22, gh: 10 },  // aran
    { gs: 22, gw: 9.2, gr: 30, gh: 10 }, // the swatch from the app's example
    { gs: 28, gw: 10, gr: 36, gh: 10 },  // fingering
  ];
  for (const g of gauges) {
    const { calc: c } = computePattern({ ...BASE, ...g });
    const spc = g.gs / g.gw;
    within(c.actual.chest, BASE.ch, Math.max(1.5, 2.5 / spc), `chest at gauge ${g.gs}/${g.gw}`);
    within(c.actual.neck, BASE.nk, Math.max(1, 2 / spc), `neck at gauge ${g.gs}/${g.gw}`);
    within(c.actual.upperArm, BASE.ua, Math.max(1, 2 / spc), `upper arm at gauge ${g.gs}/${g.gw}`);
  }
});

test("degenerate inputs warn instead of exploding", () => {
  const cases = [
    { ...BASE, nk: 40, ch: 42 },                 // chest barely over neck
    { ...BASE, bl: 60 },                          // huge back raise -> hem overflow
    { ...BASE, wr: 40, sl: 8 },                   // no room to taper
    { ...BASE, bl: 30 },                          // back shorter than front
    { ...BASE, nk: 20, ch: 200, bl: 58 },         // absurd combination
  ];
  for (const input of cases) {
    const { calc, warnings } = computePattern(input);
    assert.ok(warnings.length > 0, `warns for ${JSON.stringify(input)}`);
    assert.ok(calc.bodyTotal > 0 && calc.sleeveTotal > 0, "still produces counts");
    assert.ok(Number.isFinite(calc.yarnMeters), "yarn estimate is finite");
  }
});
