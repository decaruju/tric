/* Tric — pattern calculation engine.
   Pure functions: computePattern(input) -> { calc, warnings, sections } */

"use strict";

const RIBS = {
  "1x1": { name: "1×1 rib", repeat: 2, text: "*K1, p1; repeat from * to end of round" },
  "2x2": { name: "2×2 rib", repeat: 4, text: "*K2, p2; repeat from * to end of round" },
  "3x1": { name: "3×1 rib", repeat: 4, text: "*K3, p1; repeat from * to end of round" },
  "tw":  { name: "twisted 1×1 rib", repeat: 2, text: "*K1 through the back loop, p1; repeat from * to end of round" },
  "none": { name: "rolled edge", repeat: 1, text: "Knit every round (the edge will roll naturally)" },
};

// Short-row geometry: first turn 3 sts past the raglan marker, each pair 2 sts farther.
const SR_INTO = 3;
const SR_STEP = 2;

function roundToMultiple(n, mult) {
  if (mult <= 1) return Math.round(n);
  return Math.max(mult, Math.round(n / mult) * mult);
}

function fmt(n, digits = 1) {
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r);
}

function computePattern(input) {
  const warnings = [];
  const spc = input.gs / input.gw;   // stitches per cm
  const rpc = input.gr / input.gh;   // rows per cm

  const ease = input.es || 0;
  const chest = input.ch + ease;
  const hem = input.wa + ease;
  const upperArm = input.ua + ease;

  // ---- Neck & yoke distribution -------------------------------------------
  const neckRib = RIBS[input.nrt];
  const neckMult = Math.max(2, neckRib.repeat); // even for symmetric distribution
  const neckSts = roundToMultiple(input.nk * spc, neckMult);

  const sleeve0 = Math.max(4, Math.round(neckSts / 6));

  // ---- Back shaping: short rows at the back neck ----------------------------
  // The back/front length difference is worked as German short rows in the yoke,
  // with raglan increases integrated whenever a short row crosses a raglan marker.
  const backRaise = input.bl - input.fl;
  if (backRaise < -0.4) {
    warnings.push("Back length is shorter than front length; this generator only supports a back that is the same length or longer. Back shaping is skipped.");
  }
  let srPairs = Math.max(0, Math.round((Math.max(0, backRaise) * rpc) / 2));
  // Turns must stay inside the sleeve sections: turn p reaches SR_INTO + SR_STEP*(p-1)
  // sts into a sleeve that has sleeve0 + p sts on that side by then.
  const maxPairs = Math.max(0, sleeve0 - SR_INTO);
  let hemSrPairs = 0, hemSrStep = 0, hemOverflowRaise = 0;
  if (srPairs > maxPairs) {
    hemSrPairs = srPairs - maxPairs;
    hemOverflowRaise = (hemSrPairs * 2) / rpc;
    srPairs = maxPairs;
    warnings.push(`A back raise of ${fmt(backRaise)} cm needs ${srPairs + hemSrPairs} short-row pairs, but the neck short rows run out of sleeve room after ${maxPairs}. The remaining ${fmt(hemOverflowRaise)} cm is worked as short rows above the hem ribbing instead.`);
  }
  const srBackGain = srPairs > 0 ? 2 * srPairs : 0;   // back sts gained during short rows (incl. equalizing round)
  const srSleeveGain = srPairs > 0 ? srPairs : 0;     // per sleeve

  // The short-row increases land asymmetrically (the back gains srBackGain sts, the
  // front none), so the neck split starts the back srBackGain sts narrower — back
  // and front then hold equal counts from the end of the short rows to separation.
  const bodyShare = neckSts - 2 * sleeve0;
  let front0 = Math.floor((bodyShare + srBackGain) / 2);
  let back0 = bodyShare - front0;
  if (back0 < 6) {
    warnings.push("The back raise leaves almost no back-neck stitches at cast-on; the back starts with 6 sts and will end slightly wider than the front. Consider a smaller back/front difference or a wider neck.");
    back0 = 6;
    front0 = bodyShare - 6;
  }

  // ---- Target stitch counts ------------------------------------------------
  let chestSts = Math.round(chest * spc);
  if (chestSts % 2) chestSts += 1;
  const uaCO = Math.max(4, 2 * Math.round(chestSts * 0.04 / 2)); // underarm cast-on, each side
  const upperArmSts = Math.round(upperArm * spc);

  // ---- Raglan increase rounds (after the short rows) ------------------------
  let rBody = Math.ceil((chestSts - 2 * uaCO - front0 - back0 - srBackGain) / 4);
  let rSleeve = Math.ceil((upperArmSts - uaCO - sleeve0 - srSleeveGain) / 2);
  if (rBody < 1) { warnings.push("Chest is barely larger than the neck opening — check your measurements."); rBody = Math.max(rBody, 0); }
  if (rSleeve < 1) { warnings.push("Upper arm is very close to the initial sleeve stitch count — check upper-arm circumference."); rSleeve = Math.max(rSleeve, 0); }

  const rCommon = Math.min(rBody, rSleeve);
  const rBodyOnly = Math.max(0, rBody - rSleeve);
  const rSleeveOnly = Math.max(0, rSleeve - rBody);

  const frontSep = front0 + 2 * rBody;
  const backSep = back0 + srBackGain + 2 * rBody;
  const sleeveSep = sleeve0 + srSleeveGain + 2 * rSleeve;
  const bodyTotal = frontSep + backSep + 2 * uaCO;      // actual body sts at separation
  const sleeveTotal = sleeveSep + uaCO;                  // actual sleeve sts after pick-up

  // ---- Yoke depth ------------------------------------------------------------
  const incRounds = 2 * Math.max(rBody, rSleeve) + (srPairs > 0 ? 2 : 0); // + resume/plain rounds
  const autoYokeDepth = incRounds / rpc;
  let yokeDepth = input.yd > 0 ? input.yd : Math.round(autoYokeDepth * 2) / 2;
  let evenRounds = 0;
  if (input.yd > 0) {
    evenRounds = Math.round(input.yd * rpc) - incRounds;
    if (evenRounds < 0) {
      warnings.push(`The raglan increases alone need a yoke depth of ${fmt(autoYokeDepth)} cm — deeper than your requested ${fmt(input.yd)} cm. The yoke will measure ${fmt(autoYokeDepth)} cm.`);
      evenRounds = 0;
      yokeDepth = autoYokeDepth;
    }
  }
  const yokeRounds = incRounds + evenRounds;

  // ---- Body ------------------------------------------------------------------
  const hemRib = RIBS[input.hrt];
  const hemRibSts = roundToMultiple(hem * spc, Math.max(2, hemRib.repeat));
  const bodyDelta = bodyTotal - hemRibSts; // >0: decrease toward hem
  const shapeRounds = Math.floor(Math.abs(bodyDelta) / 4);
  const shapeRemainder = Math.abs(bodyDelta) - 4 * shapeRounds;
  const bodyPlainLen = Math.max(0, input.fl - input.hrd);
  const bodyPlainRounds = Math.round(bodyPlainLen * rpc);
  let shapeEvery = 0;
  if (shapeRounds > 0) {
    shapeEvery = Math.floor((bodyPlainRounds * 0.75) / shapeRounds);
    if (shapeEvery < 2) {
      warnings.push("Body shaping between chest and hem is very steep (a shaping round every " + Math.max(1, shapeEvery) + " round(s)). Consider a longer body or a hem circumference closer to the chest.");
      shapeEvery = Math.max(2, shapeEvery);
    }
  }
  if (hemSrPairs > 0) {
    const backHalf = Math.floor(hemRibSts / 2);
    hemSrStep = Math.max(2, Math.floor((backHalf * 0.7) / hemSrPairs));
    if (hemSrPairs * hemSrStep > backHalf) {
      warnings.push("The overflow hem short rows are steep for the stitch count; consider a smaller back/front difference.");
    }
  }

  // ---- Sleeves ----------------------------------------------------------------
  const cuffRib = RIBS[input.crt];
  const wristSts = roundToMultiple(input.wr * spc, Math.max(2, cuffRib.repeat));
  const sleeveDelta = sleeveTotal - wristSts;
  const sleeveDecRounds = Math.max(0, Math.floor(sleeveDelta / 2));
  const sleeveDecRemainder = Math.max(0, sleeveDelta - 2 * sleeveDecRounds);
  const sleevePlainLen = Math.max(0, input.sl - input.crd);
  const sleevePlainRounds = Math.round(sleevePlainLen * rpc);
  let sleeveDecEvery = 0;
  if (sleeveDecRounds > 0) {
    sleeveDecEvery = Math.floor((sleevePlainRounds - 4) / sleeveDecRounds);
    if (sleeveDecEvery < 2) {
      warnings.push("Sleeve tapering is very steep (a decrease round every " + Math.max(1, sleeveDecEvery) + " round(s)). Consider longer sleeves or a wider wrist.");
      sleeveDecEvery = Math.max(2, sleeveDecEvery);
    }
  }
  if (sleeveDelta < 0) {
    warnings.push("Wrist circumference is larger than the upper arm at your gauge — sleeves will be worked straight with increases omitted.");
  }

  // ---- Sanity warnings -----------------------------------------------------
  if (input.nk < 50) warnings.push(`A finished neck circumference of ${fmt(input.nk)} cm may be tight to pull over an adult head (most heads need ≈ 53–58 cm of very stretchy opening). Ribbing stretches, but swatch and check.`);
  if (chest <= input.nk) warnings.push("Chest (plus ease) should be clearly larger than the neck circumference.");

  // ---- Yarn estimate (very rough) ---------------------------------------------
  const stsYoke = (yokeRounds + 2 * srPairs) * ((neckSts + bodyTotal + 2 * sleeveSep) / 2);
  const stsBody = (input.fl * rpc) * ((bodyTotal + hemRibSts) / 2);
  const stsSleeves = 2 * (input.sl * rpc) * ((sleeveTotal + wristSts) / 2);
  const totalSts = stsYoke + stsBody + stsSleeves;
  const yarnMeters = Math.round((totalSts * (4.7 / spc)) / 100 * 1.1); // +10 % for ribbing & seaming

  const calc = {
    spc, rpc, ease, chest, hem, upperArm,
    neckSts, front0, back0, sleeve0,
    chestSts, uaCO, upperArmSts,
    rBody, rSleeve, rCommon, rBodyOnly, rSleeveOnly,
    frontSep, backSep, sleeveSep, bodyTotal, sleeveTotal,
    backRaise: Math.max(0, backRaise), srPairs, srBackGain, srSleeveGain,
    yokeDepth, yokeRounds, incRounds, evenRounds, autoYokeDepth,
    hemRibSts, bodyDelta, shapeRounds, shapeEvery, shapeRemainder,
    hemSrPairs, hemSrStep, hemOverflowRaise,
    wristSts, sleeveDelta, sleeveDecRounds, sleeveDecEvery, sleeveDecRemainder,
    yarnMeters,
    actual: {
      neck: neckSts / spc,
      chest: bodyTotal / spc,
      hem: hemRibSts / spc,
      upperArm: sleeveTotal / spc,
      wrist: wristSts / spc,
      yokeDepth: yokeRounds / rpc,
      backRaise: (srPairs * 2) / rpc,
    },
  };

  const sections = buildInstructions(input, calc);
  return { calc, warnings, sections };
}

/* ---------------------------------------------------------------------------- */

function buildInstructions(input, c) {
  const neckRib = RIBS[input.nrt];
  const hemRib = RIBS[input.hrt];
  const cuffRib = RIBS[input.crt];
  const s = [];
  const li = (arr) => "<ol>" + arr.map((x) => `<li>${x}</li>`).join("") + "</ol>";
  const note = (t) => `<p class="note">${t}</p>`;

  // -- Overview
  s.push({
    title: "Overview & finished measurements",
    html: `
      <p>Top-down seamless raglan pullover, worked in the round in stockinette. The neckband is knit first,
      then the back is raised with German short rows — with the raglan increases worked right inside the
      short rows whenever they cross a raglan line. Body and sleeves are separated at the underarms and
      worked down to ribbed edges.</p>
      <table class="meas">
        <tr><th>Gauge</th><td>${fmt(c.spc * 10)} sts and ${fmt(c.rpc * 10)} rounds = 10 cm in stockinette</td></tr>
        <tr><th>Neck</th><td>${fmt(c.actual.neck)} cm — ${c.neckSts} sts</td></tr>
        <tr><th>Chest</th><td>${fmt(c.actual.chest)} cm — ${c.bodyTotal} sts</td></tr>
        <tr><th>Hem</th><td>${fmt(c.actual.hem)} cm — ${c.hemRibSts} sts</td></tr>
        <tr><th>Upper arm</th><td>${fmt(c.actual.upperArm)} cm — ${c.sleeveTotal} sts</td></tr>
        <tr><th>Wrist</th><td>${fmt(c.actual.wrist)} cm — ${c.wristSts} sts</td></tr>
        <tr><th>Yoke depth</th><td>≈ ${fmt(c.actual.yokeDepth)} cm at the front (${c.yokeRounds} rounds); the back is ${fmt(c.actual.backRaise)} cm deeper</td></tr>
        <tr><th>Body length</th><td>${fmt(input.fl)} cm front / ${fmt(input.bl)} cm back</td></tr>
        <tr><th>Sleeve length</th><td>${fmt(input.sl)} cm, underarm to cuff</td></tr>
        <tr><th>Yarn estimate</th><td>≈ ${c.yarnMeters} m <em>(very rough — buy at least 15&nbsp;% extra)</em></td></tr>
      </table>
      ${note("Techniques used: knitting in the round, M1L / M1R increases, German short rows (double stitches), picking up stitches. Use a stretchy bind-off (e.g. Jeny's surprisingly stretchy bind-off) on all edges.")}
    `,
  });

  // -- Neckband
  const neckSteps = [];
  neckSteps.push(`Cast on <b>${c.neckSts} sts</b> using a stretchy cast-on (long-tail or German twisted). Join in the round, being careful not to twist. Place the beginning-of-round (BOR) marker.`);
  if (input.nrt === "none") {
    neckSteps.push(`Knit every round for ${fmt(input.nrd)} cm — the edge will roll on itself.`);
  } else {
    neckSteps.push(`Work ${neckRib.name}: ${neckRib.text}. Continue until the neckband measures ${fmt(input.nrd)} cm.${input.nrd >= 4 ? " (For a folded neckband, work double the depth and sew the cast-on edge down on the inside at the end.)" : ""}`);
  }
  s.push({ title: `1 · Neckband — ${neckRib.name}`, html: li(neckSteps) });

  // -- Setup
  s.push({
    title: "2 · Yoke set-up",
    html: li([
      `Set-up round (switch to your main needles if you ribbed on smaller ones): knit <b>${c.back0}</b> back sts, place marker&nbsp;1, knit <b>${c.sleeve0}</b> left-sleeve sts, place marker&nbsp;2, knit <b>${c.front0}</b> front sts, place marker&nbsp;3, knit <b>${c.sleeve0}</b> right-sleeve sts. The BOR marker sits between the right sleeve and the back.`,
      `Section check: back ${c.back0} · sleeve ${c.sleeve0} · front ${c.front0} · sleeve ${c.sleeve0} = <b>${c.neckSts} sts</b>.`,
    ]) + (c.srBackGain > 0 ? `<p class="note">The back starts ${c.srBackGain} sts narrower than the front on purpose: the back-shaping short rows will add ${c.srBackGain} sts to the back only, so back and front meet at equal counts.</p>` : ""),
  });

  // -- Back shaping: short rows with integrated raglan increases
  if (c.srPairs > 0) {
    const sr = [];
    sr.push(`Short row 1 (RS): knit to 1 st before marker&nbsp;1, M1R, k1, slip marker, k1, M1L, k1, <b>turn</b>.`);
    sr.push(`Short row 2 (WS): make a double stitch (DS), purl back across the back (slipping markers), slip the BOR marker, p${SR_INTO} into the right sleeve, <b>turn</b>. <em>No increases on WS rows.</em>`);
    if (c.srPairs > 1) {
      sr.push(`Short row 3 and all following RS rows: make a DS, knit forward — <b>each time you reach a raglan marker, work the increase</b> (knit to 1 st before marker, M1R, k1, slip marker, k1, M1L) — continue to the DS of the previous row on this side, knit both its legs together as one st, k${SR_STEP}, <b>turn</b>.`);
      sr.push(`Short row 4 and all following WS rows: make a DS, purl to the DS of the previous row on this side, purl it as one st, p${SR_STEP}, <b>turn</b>.`);
      sr.push(`Repeat the last two rows until you have worked <b>${c.srPairs} turns on each side</b> (${c.srPairs} double stitches per sleeve).`);
    }
    sr.push(`After the last WS turn: make a DS, then knit to the BOR marker <em>without increasing</em>.`);
    sr.push(`Equalizing round: k1, M1L, knit to the last st of the round, M1R, k1 — knitting each remaining DS as one st along the way. This works the increase pair at the BOR raglan that short row&nbsp;1 skipped.`);
    sr.push(`Knit 1 round plain. Stitch check: back <b>${c.back0 + c.srBackGain}</b> · left sleeve <b>${c.sleeve0 + c.srSleeveGain}</b> · front <b>${c.front0}</b> · right sleeve <b>${c.sleeve0 + c.srSleeveGain}</b>.`);
    s.push({
      title: `3 · Back shaping — ${c.srPairs} pairs of German short rows (back raised ≈ ${fmt(c.actual.backRaise)} cm)`,
      html: li(sr) + note(`The short rows come from your back/front length difference (${fmt(input.bl)} − ${fmt(input.fl)} cm). Because every RS short row crosses the back raglan lines, the increases keep their every-other-round rhythm right through the shaping. The back gains ${c.srBackGain} sts and ${2 * c.srPairs} rows here — the narrower back cast-on split absorbs the stitches, so back and front are equal again from this point on.`),
    });
  } else {
    s.push({ title: "3 · Back shaping", html: "<p>Skipped — back and front lengths are equal, so no short rows are needed. To raise the back neck, make the back length a little longer than the front (2–4 cm is typical).</p>" });
  }

  // -- Raglan increases
  const rag = [];
  rag.push(`Increase round: *k1, M1L, knit to 1 st before marker, M1R, k1, slip marker; repeat from * three more times — <b>8 sts increased</b> (2 per section).`);
  rag.push(`Next round: knit all sts.`);
  rag.push(`Repeat these two rounds until you have worked <b>${c.rCommon} increase rounds</b> in total.`);
  if (c.rBodyOnly > 0) {
    rag.push(`Body-only increases: continue increasing every other round in the <em>front and back sections only</em> (k1, M1L, knit to 1 st before marker, M1R, k1 across back and front; knit the sleeve sections plain) — <b>${c.rBodyOnly} more increase rounds</b> (4 sts each).`);
  }
  if (c.rSleeveOnly > 0) {
    rag.push(`Sleeve-only increases: continue increasing every other round in the <em>sleeve sections only</em> — <b>${c.rSleeveOnly} more increase rounds</b> (4 sts each).`);
  }
  rag.push(`Stitch check: back <b>${c.backSep}</b> · left sleeve <b>${c.sleeveSep}</b> · front <b>${c.frontSep}</b> · right sleeve <b>${c.sleeveSep}</b> = ${c.backSep + c.frontSep + 2 * c.sleeveSep} sts.`);
  if (c.evenRounds > 0) {
    rag.push(`Work <b>${c.evenRounds} plain rounds</b> (no increases) until the yoke measures ≈ ${fmt(c.yokeDepth)} cm from the neckband, measured along a front raglan line.`);
  } else {
    rag.push(`The yoke should now measure ≈ ${fmt(c.actual.yokeDepth)} cm from the neckband, measured at the front. Try it on: the raglan lines should reach your underarms.`);
  }
  s.push({ title: `4 · Raglan yoke — increase every other round`, html: li(rag) });

  // -- Separation
  s.push({
    title: "5 · Separate body and sleeves",
    html: li([
      `Knit <b>${c.backSep}</b> back sts. Slip the next <b>${c.sleeveSep}</b> left-sleeve sts to waste yarn or a holder. Cast on <b>${c.uaCO}</b> underarm sts with the backward-loop method, placing a side marker after ${c.uaCO / 2} sts.`,
      `Knit <b>${c.frontSep}</b> front sts. Slip the next <b>${c.sleeveSep}</b> right-sleeve sts to a holder. Cast on <b>${c.uaCO}</b> underarm sts, placing a side marker after ${c.uaCO / 2} sts.`,
      `Body: <b>${c.bodyTotal} sts</b> (≈ ${fmt(c.actual.chest)} cm). The two side markers sit at the centre of each underarm; the BOR marker stays where it was.`,
    ]),
  });

  // -- Body
  const body = [];
  if (c.shapeRounds > 0) {
    const verb = c.bodyDelta > 0 ? "Decrease" : "Increase";
    const how = c.bodyDelta > 0
      ? "*knit to 3 sts before side marker, k2tog, k1, slip marker, k1, ssk; repeat from * once — 4 sts decreased"
      : "*knit to 1 st before side marker, M1R, k1, slip marker, k1, M1L; repeat from * once — 4 sts increased";
    body.push(`Work ${Math.max(2, Math.round(c.shapeEvery / 2))} plain rounds.`);
    body.push(`${verb} round: ${how}.`);
    body.push(`Repeat the ${verb.toLowerCase()} round every <b>${c.shapeEvery} rounds</b>, <b>${c.shapeRounds} times total</b>${c.shapeRemainder ? ` , then ${c.bodyDelta > 0 ? "decrease" : "increase"} the remaining ${c.shapeRemainder} st(s) evenly on the last plain round` : ""} — <b>${c.hemRibSts} sts</b>.`);
    body.push(`Continue in plain stockinette until the front measures <b>${fmt(input.fl - input.hrd)} cm</b> from the underarm cast-on.`);
  } else {
    if (c.shapeRemainder || c.bodyDelta !== 0) {
      const adj = Math.abs(c.bodyDelta);
      body.push(`Work plain stockinette until the front measures <b>${fmt(input.fl - input.hrd)} cm</b> from the underarm cast-on, ${c.bodyDelta > 0 ? "decreasing" : "increasing"} ${adj} st(s) evenly on the last round — <b>${c.hemRibSts} sts</b>.`);
    } else {
      body.push(`Work plain stockinette until the front measures <b>${fmt(input.fl - input.hrd)} cm</b> from the underarm cast-on.`);
    }
  }
  if (c.hemSrPairs > 0) {
    body.push(`<b>Back hem short rows</b> (overflow from the back raise — the back hem hangs ${fmt(c.hemOverflowRaise)} cm lower): Short row 1 (RS): knit across the back to 2 sts before the left side marker, turn. Short row 2 (WS): make a DS, purl across the back to 2 sts before the right side marker, turn.`);
    body.push(`Short rows 3–${2 * c.hemSrPairs}: make a DS, work to <b>${c.hemSrStep} sts before</b> the previous DS on that side, turn — until ${c.hemSrPairs} turns are worked on each side. After the last turn, make a DS and knit to the BOR marker. Knit one full round, knitting each DS as one stitch.`);
  }
  if (input.hrt === "none") {
    body.push(`Knit ${fmt(input.hrd)} cm plain for a rolled hem, then bind off loosely.`);
  } else {
    body.push(`Work ${hemRib.name} (${hemRib.text}) for <b>${fmt(input.hrd)} cm</b>. Bind off in pattern with a stretchy bind-off. Total front length ≈ ${fmt(input.fl)} cm.`);
  }
  s.push({ title: `6 · Body — ${hemRib.name} hem`, html: li(body) });

  // -- Sleeves
  const sl = [];
  sl.push(`Return the <b>${c.sleeveSep}</b> held sts of one sleeve to your needles. Starting at the centre of the underarm, pick up and knit ${c.uaCO / 2} sts from the underarm cast-on, knit the ${c.sleeveSep} sleeve sts, pick up and knit ${c.uaCO / 2} sts from the rest of the underarm — <b>${c.sleeveTotal} sts</b>. Place the BOR marker at the centre of the underarm. (Pick up 1–2 extra sts at the corners to close any holes and decrease them on the next round.)`);
  if (c.sleeveDecRounds > 0) {
    sl.push(`Work ${Math.max(2, Math.min(8, c.sleeveDecEvery))} plain rounds.`);
    sl.push(`Decrease round: k1, k2tog, knit to the last 3 sts of the round, ssk, k1 — 2 sts decreased.`);
    sl.push(`Repeat the decrease round every <b>${c.sleeveDecEvery} rounds</b>, <b>${c.sleeveDecRounds} times total</b>${c.sleeveDecRemainder ? `, then decrease ${c.sleeveDecRemainder} st on the last plain round` : ""} — <b>${c.wristSts} sts</b>.`);
    sl.push(`Continue plain until the sleeve measures <b>${fmt(input.sl - input.crd)} cm</b> from the underarm.`);
  } else {
    sl.push(`Work plain stockinette until the sleeve measures <b>${fmt(input.sl - input.crd)} cm</b> from the underarm${c.sleeveDelta !== 0 ? `, adjusting ${Math.abs(c.sleeveDelta)} st(s) evenly on the last round to reach <b>${c.wristSts} sts</b>` : ""}.`);
  }
  if (input.crt === "none") {
    sl.push(`Knit ${fmt(input.crd)} cm plain for a rolled cuff, then bind off loosely.`);
  } else {
    sl.push(`Work ${cuffRib.name} (${cuffRib.text}) for <b>${fmt(input.crd)} cm</b>. Bind off in pattern with a stretchy bind-off.`);
  }
  sl.push(`Repeat for the second sleeve.`);
  s.push({ title: `7 · Sleeves — ${cuffRib.name} cuffs`, html: li(sl) });

  // -- Finishing
  s.push({
    title: "8 · Finishing",
    html: li([
      "Close any small holes at the underarm corners with the yarn tails.",
      "Weave in all ends on the wrong side.",
      "Soak in lukewarm water for 20 minutes, press the water out in a towel, and lay flat to the schematic measurements to block. Let dry completely.",
    ]),
  });

  return s;
}
