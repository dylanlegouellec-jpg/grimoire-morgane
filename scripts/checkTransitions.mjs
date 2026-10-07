/* ------------------------------------------------------------------ */
/*  Garde-fou des transitions entre onglets (npm run test:transitions)  */
/*                                                                      */
/*  Lance l'app construite dans un vrai navigateur (mode invité, taille  */
/*  de téléphone) et mesure ce qu'un œil voit : à chaque changement      */
/*  d'onglet, rien ne doit bouger pendant la phase de sortie (pas de     */
/*  saut de mise en page, pas de glissement sur le côté), la page ne      */
/*  doit jamais déborder en largeur, et un aller-retour très rapide       */
/*  doit retomber sur l'onglet de départ. Ce sont exactement les défauts  */
/*  corrigés à la main dans les PR « onglets » : ce test évite qu'ils      */
/*  reviennent sans que personne ne le remarque.                          */
/*                                                                      */
/*  Navigateur : celui de Playwright, ou un Chromium précis via la         */
/*  variable CHROMIUM_PATH.                                                */
/* ------------------------------------------------------------------ */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = Number(process.env.TRANSITIONS_PORT || 5197);
const URL = `http://127.0.0.1:${PORT}/?atelier=1`;
// Phase de sortie : TAB_EXIT_MS (src/constants/motion.ts) moins une marge.
const EXIT_WINDOW_MS = 140;
// Au-delà, le saut de mise en page cumulé devient visible (mesuré : ≤ 0,13 aujourd'hui).
const MAX_TOTAL_SHIFT = 0.2;

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "✔" : "✘"} ${message}`);
  if (!ok) failures.push(message);
};

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Le serveur de prévisualisation ne répond pas");
}

try {
  await waitForServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 408, height: 760 }, deviceScaleFactor: 2, serviceWorkers: "block", hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.addInitScript(() => {
    try { localStorage.setItem("grimoire_onboarding_completed", "1"); } catch { /* stockage bloqué */ }
  });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".recipe-card");
  await page.waitForTimeout(3500); // fin de l'animation d'ouverture

  await page.evaluate(() => {
    window.__shifts = [];
    window.__xs = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__shifts.push({ t: e.startTime, v: e.value }))).observe({ type: "layout-shift" });
    const tick = () => {
      const el = document.querySelector(".tab-transition");
      window.__xs.push([performance.now(), el ? el.getBoundingClientRect().left : null]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const clickNav = (name) => page.evaluate((n) => {
    window.__click = performance.now();
    [...document.querySelectorAll(".nav-btn")].find((b) => new RegExp(n, "i").test(b.textContent)).click();
  }, name);

  async function measure(name) {
    const baseX = await page.evaluate(() => document.querySelector(".tab-transition")?.getBoundingClientRect().left ?? 0);
    await page.evaluate(() => { window.__shifts.length = 0; window.__xs.length = 0; });
    await page.waitForTimeout(150);
    await clickNav(name);
    await page.waitForTimeout(1100);
    const r = await page.evaluate((x0) => {
      const click = window.__click;
      const inExit = (t) => t >= click && t <= click + 140;
      return {
        earlyShift: window.__shifts.filter((s) => inExit(s.t)).reduce((n, s) => n + s.v, 0),
        totalShift: window.__shifts.filter((s) => s.t >= click).reduce((n, s) => n + s.v, 0),
        sideways: Math.max(0, ...window.__xs.filter(([t, x]) => inExit(t) && x != null).map(([, x]) => Math.abs(x - x0))),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        stuckExit: !!document.querySelector(".tab-transition.tab-exit"),
      };
    }, baseX);
    check(r.earlyShift === 0, `→ ${name} : aucun saut de mise en page pendant la sortie (${r.earlyShift.toFixed(4)})`);
    check(r.sideways < 0.5, `→ ${name} : aucun glissement latéral pendant la sortie (${r.sideways.toFixed(1)} px)`);
    check(r.totalShift <= MAX_TOTAL_SHIFT, `→ ${name} : décalage de mise en page total ≤ ${MAX_TOTAL_SHIFT} (${r.totalShift.toFixed(3)})`);
    check(r.overflow <= 0, `→ ${name} : la page ne déborde pas en largeur (${r.overflow} px)`);
    check(!r.stuckExit, `→ ${name} : la sortie est bien terminée`);
  }

  for (const name of ["Plan", "Courses", "Frigo", "Recettes"]) await measure(name);

  // Aller-retour très rapide : doit retomber sur Recettes, pas rester bloqué.
  await page.evaluate(() => new Promise((resolve) => {
    const click = (t) => [...document.querySelectorAll(".nav-btn")].find((b) => new RegExp(t, "i").test(b.textContent)).click();
    click("Plan");
    setTimeout(() => { click("Recettes"); resolve(); }, 60);
  }));
  await page.waitForTimeout(1100);
  check(await page.evaluate(() => !!document.querySelector(".recipes-grid") && !document.querySelector(".tab-exit")), "aller-retour rapide Plan → Recettes : on retombe sur Recettes");

  check(pageErrors.length === 0, `aucune erreur JavaScript pendant le parcours${pageErrors.length ? ` (${pageErrors[0]})` : ""}`);
  await browser.close();
} catch (err) {
  failures.push(String(err));
  console.error(err);
} finally {
  stop();
}

if (failures.length) {
  console.error(`\n${failures.length} vérification(s) en échec.`);
  process.exit(1);
}
console.log("\nTransitions OK.");
