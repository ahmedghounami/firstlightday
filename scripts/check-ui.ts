/* Browser QA against a running production server: `npm run start`, then `npm run check:ui`. */
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const DATE = process.argv[2] ?? "2002-08-17";
const REEL_DATE = "2022-12-10";
const OUT = "qa-shots";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
};

const overflow = (page: Page) =>
  page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const scrolls = document.documentElement.scrollWidth > w;
    const offenders = [...document.querySelectorAll("main *, header *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= w + 1) return false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o !== "visible") return false;
        }
        return true;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName}.${String((el as HTMLElement).className).slice(0, 40)}`);
    return { scrolls, offenders };
  });

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 90_000 });
}

async function main() {
  const browser = await chromium.launch();

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const [name, path] of [["home", "/"], ["reel", `/day/${REEL_DATE}`], ["archive", `/day/${DATE}/archive`], ["method", "/method"]] as const) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90_000 });
      if (name === "archive") await settle(page);
      if (name === "reel") await page.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
      const { scrolls, offenders } = await overflow(page);
      check(`no sideways scroll ${name} @${width}`, !scrolls && offenders.length === 0, offenders.join(", "));
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: name !== "home" });
    }
    await page.close();
  }

  const a11y = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" })).newPage();
  const story = await (async () => {
    await a11y.goto(`${BASE}/day/${DATE}/archive`);
    await settle(a11y);
    return a11y.locator('a[href*="/story/"]').first().getAttribute("href");
  })();
  for (const path of ["/", `/day/${REEL_DATE}`, `/day/${DATE}/archive`, "/method", story!]) {
    await a11y.goto(BASE + path);
    if (path.includes("archive")) await settle(a11y);
    if (path === `/day/${REEL_DATE}`) {
      await a11y.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
      await a11y.getByRole("button", { name: "Next moment" }).click();
      await a11y.waitForTimeout(500);
    }
    const { violations } = await new AxeBuilder({ page: a11y }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    check(`axe ${path.slice(0, 40)}`, violations.length === 0, violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`).join("; "));
  }
  // The story player.
  const rp2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await rp2.goto(`${BASE}/day/${REEL_DATE}`);
  await rp2.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
  const announced = () => rp2.locator('[aria-live="polite"]').first().textContent();
  await rp2.keyboard.press("ArrowRight");
  await rp2.waitForTimeout(400);
  check("arrow key moves forward", (await announced())!.startsWith("Moment 1"));
  const arabic = rp2.locator('p[lang="ar"][dir="rtl"]').first();
  check("Moroccan moment shows Arabic, marked right-to-left", /[\u0600-\u06FF]/.test((await arabic.textContent()) ?? ""));
  await rp2.keyboard.press("Space");
  await rp2.waitForTimeout(8500);
  check("pause holds the slide", (await announced())!.startsWith("Moment 1"));
  await rp2.keyboard.press("Space");
  await rp2.waitForTimeout(8500);
  check("auto-advances when playing", (await announced())!.startsWith("Moment 2"), (await announced())!.slice(0, 40));
  await rp2.mouse.click(1100, 400);
  await rp2.waitForTimeout(400);
  check("tap moves forward to the end", ((await announced()) ?? "").includes("End of the story"));
  check("end slide offers the full record", await rp2.getByRole("link", { name: "Full record" }).isVisible());
  await rp2.getByRole("button", { name: "Watch again" }).click();
  await rp2.waitForTimeout(300);
  check("watch again returns to the start", await rp2.locator("h1").isVisible());
  const srList = await rp2.locator('section[aria-label^="All moments"] li').count();
  check("moments are in the page for search and screen readers", srList > 0, `${srList}`);

  const mom = await (await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } })).newPage();
  await mom.goto(`${BASE}/day/${REEL_DATE}`);
  await mom.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
  await mom.waitForTimeout(6000);
  check("reduced motion never auto-advances", await mom.locator("h1").isVisible());

  await a11y.goto(BASE + story!);
  await a11y.screenshot({ path: `${OUT}/story-1280.png`, fullPage: true });

  // The form, keyboard only, with the reveal.
  const kb = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await kb.goto(BASE);
  await kb.getByLabel("Day").focus();
  await kb.keyboard.type("29");
  check("day auto-advances to month", await kb.getByLabel("Month").evaluate((el) => el === document.activeElement));
  await kb.getByLabel("Month").selectOption("2");
  await kb.keyboard.type("2001");
  await kb.keyboard.press("Enter");
  await kb.waitForSelector('[role="alert"]:not(:empty)');
  check("rejects 29 Feb 2001", (await kb.getByRole("alert").first().textContent())!.includes("leap year"));
  await kb.getByLabel("Year").fill("2996");
  await kb.keyboard.press("Enter");
  await kb.waitForTimeout(100);
  check("rejects a future date", (await kb.getByRole("alert").first().textContent())!.includes("hasn't happened"));
  await kb.getByLabel("Year").fill("2000");
  await kb.getByRole("button", { name: /Open that day/ }).press("Enter");
  await kb.waitForSelector("text=Going back");
  await kb.screenshot({ path: `${OUT}/reveal-1.png` });
  const started = Date.now();
  await kb.waitForURL("**/day/2000-02-29");
  await kb.waitForSelector('[role="status"][aria-label^="Opening"]', { state: "detached", timeout: 5000 });
  check("reveal ends within 3s", Date.now() - started < 3000, `${Date.now() - started}ms`);
  await kb.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
  check("weekday shown", (await kb.textContent("h1"))!.includes("2000") && (await kb.textContent("body"))!.includes("Tuesday"));

  // Reduced motion: no overlay.
  const rm = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const rp = await rm.newPage();
  await rp.goto(BASE);
  await rp.getByLabel("Day").fill("17");
  await rp.getByLabel("Month").selectOption("8");
  await rp.getByLabel("Year").fill("2002");
  await rp.getByRole("button", { name: /Open that day/ }).click();
  await rp.waitForURL("**/day/2002-08-17");
  await rp.waitForSelector('[aria-label="Next moment"]', { timeout: 90_000 });
  check("reduced motion skips the reveal", (await rp.locator('[aria-label^="Opening"]').count()) === 0);
  const animated = await rp.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSAnimation && a.playState === "running").length);
  check("reduced motion stops CSS animation", animated === 0, `${animated} running`);

  // Image failures fall back.
  const img = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await img.route(/upload\.wikimedia\.org/, (r) => r.abort());
  await img.goto(`${BASE}/day/1985-07-13/archive`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await settle(img);
  await img.waitForTimeout(800);
  const broken = await img.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && !i.loading.includes("lazy")).length);
  check("failed images are removed", broken === 0, `${broken} broken`);

  // Filters and disclosure.
  const f = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await f.goto(`${BASE}/day/2010-01-01/archive`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await settle(f);
  const total = () => f.locator("#index p[aria-live]").textContent();
  const all = await total();
  // Wait for this streamed island to hydrate: React attaches its handler key to the button.
  await f.waitForFunction(() => {
    const b = [...document.querySelectorAll("#index button")].find((x) => x.textContent?.startsWith("Television"));
    return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
  }, undefined, { timeout: 30_000 });
  await f.getByRole("button", { name: /^Television/ }).click();
  await f.waitForFunction((before) => document.querySelector("#index p[aria-live]")?.textContent !== before, all, { timeout: 5000 });
  const tv = await total();
  check("category filter narrows the list", parseInt(tv!) < parseInt(all!) && parseInt(tv!) > 0, `${all} -> ${tv}`);
  const labels = await f.locator("#index ul li > span:first-child").allTextContents();
  check("filtered rows are all television", labels.length > 0 && labels.every((l) => l.trim().toLowerCase() === "television"));
  await f.getByRole("button", { name: /^All stories/ }).click();
  await f.locator('select:has(option[value="all"])').selectOption({ index: 1 });
  await f.waitForTimeout(200);
  const regional = parseInt((await total())!);
  check("region filter narrows the list", regional > 0 && regional < parseInt(all!), `${all} -> ${regional}`);
  for (const bad of ["2999-01-01", "1899-12-31", "2001-02-29", "nonsense"]) {
    const res = await f.goto(`${BASE}/day/${bad}`);
    check(`bad date 404: ${bad}`, res?.status() === 404);
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
}
main();
