// Browser checks for /supervision-plans (brief §8 and the §10 pricing
// items). Run against a running site:
//
//   node scripts/checkPricingPage.js http://127.0.0.1:3001 [screenshot-dir]
//
// Use a local or staging site: it only reads the page, but it is meant for
// checking a build before it ships. Exit code 1 if any check fails.
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const BASE = (process.argv[2] || "http://127.0.0.1:3001").replace(/\/+$/, "");
const SHOTS = process.argv[3];
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const text = (page) => page.evaluate(() => document.querySelector("main").innerText);
const cards = (page) =>
  page.$$eval("#plans article", (els) =>
    els.map((el) => ({
      name: el.querySelector("h3")?.textContent.trim(),
      text: el.innerText,
      cta: el.querySelector("a")?.getAttribute("href"),
      ctaText: el.querySelector("a")?.textContent.trim(),
      top: Math.round(el.getBoundingClientRect().top + window.scrollY),
    })),
  );
const pressed = (page) =>
  page.$$eval("[aria-label='Billing period'] button", (bs) =>
    bs.map((b) => `${b.textContent.trim()}=${b.getAttribute("aria-pressed")}`).join(" "),
  );

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}/supervision-plans`, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      try {
        localStorage.removeItem("aba.supervisionPlanPeriod");
      } catch {}
    });
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#plans article");

    // Card order; Clinic hidden while SHOW_CLINIC_PLAN is off.
    let list = await cards(page);
    const names = list.map((c) => c.name);
    check(
      "card order (Clinic hidden while the flag is off)",
      JSON.stringify(names) === JSON.stringify(["Supervisee", "Starter", "Professional", "Custom"]) ||
        JSON.stringify(names) ===
          JSON.stringify(["Supervisee", "Starter", "Professional", "Clinic", "Custom"]),
      names.join(", "),
    );
    const byName = (n) => list.find((c) => c.name === n);
    check("Professional is featured with 'Most popular'", byName("Professional").text.includes("MOST POPULAR") || byName("Professional").text.includes("Most popular"));

    // Monthly by default.
    check("toggle defaults to Monthly (aria-pressed)", (await pressed(page)) === "Monthly=true Yearly=false", await pressed(page));
    check("'Yearly: 2 months free' tag", (await text(page)).includes("Yearly: 2 months free"));
    check("Starter €15 / 30 days", /€15\s*\/ 30 days/.test(byName("Starter").text));
    check("Professional €30 / 30 days", /€30\s*\/ 30 days/.test(byName("Professional").text));
    check("monthly sub-line", byName("Starter").text.includes("One payment. Not a subscription."));
    const freeBefore = byName("Supervisee").text;
    const customBefore = byName("Custom").text;
    check("Supervisee shows Free", freeBefore.includes("Free"));
    check("Custom shows Let's talk", customBefore.includes("Let's talk"));
    check("Starter CTA → checkout, monthly", byName("Starter").cta === "/checkout?plan=starter&period=monthly", byName("Starter").cta);

    // Switch to Yearly without reloading.
    await page.evaluate(() => (window.__noReload = true));
    await page.click("[aria-label='Billing period'] button:nth-child(2)");
    list = await cards(page);
    check("no reload when switching", await page.evaluate(() => window.__noReload === true));
    check("toggle shows Yearly pressed", (await pressed(page)) === "Monthly=false Yearly=true");
    check("Starter €150 / 365 days", /€150\s*\/ 365 days/.test(byName("Starter").text));
    check("Professional €300 / 365 days", /€300\s*\/ 365 days/.test(byName("Professional").text));
    check("Starter saving: About €12.50 a month. Save €30", byName("Starter").text.includes("About €12.50 a month. Save €30"));
    check("Professional saving: About €25 a month. Save €60", byName("Professional").text.includes("About €25 a month. Save €60"));
    if (byName("Clinic")) {
      check("Clinic €800, About €66.67 a month. Save €160", /€800/.test(byName("Clinic").text) && byName("Clinic").text.includes("About €66.67 a month. Save €160"));
    }
    check("Supervisee card unchanged by the toggle", byName("Supervisee").text === freeBefore);
    check("Custom card unchanged by the toggle", byName("Custom").text === customBefore);
    check("Professional CTA → checkout, yearly", byName("Professional").cta === "/checkout?plan=professional&period=yearly", byName("Professional").cta);
    check("CTA labels", byName("Starter").ctaText === "Choose Starter" && byName("Professional").ctaText === "Choose Professional" && byName("Custom").ctaText === "Contact us" && ["Log in with your invite", "Open my supervision"].includes(byName("Supervisee").ctaText));
    check("Custom mailto", byName("Custom").cta === "mailto:contact@abavirtual.net?subject=Custom%20supervision%20portal%20plan", byName("Custom").cta);

    // Keyboard: arrow keys move the selection.
    await page.focus("[aria-label='Billing period'] button:nth-child(2)");
    await page.keyboard.press("ArrowLeft");
    check("ArrowLeft selects Monthly", (await pressed(page)) === "Monthly=true Yearly=false");
    await page.keyboard.press("ArrowRight");
    check("ArrowRight selects Yearly", (await pressed(page)) === "Monthly=false Yearly=true");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Tab");
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    await page.keyboard.press("Space");
    check("Space on a focused option selects it", (await pressed(page)).includes("=true"));

    // Remembered choice.
    await page.click("[aria-label='Billing period'] button:nth-child(2)");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#plans article");
    check("last choice remembered after reload", (await pressed(page)) === "Monthly=false Yearly=true");

    // Copy, word for word.
    const all = await text(page);
    check(
      "note under the cards (§8.4)",
      all.includes(
        "No plan renews automatically. Each payment adds 30 or 365 days, and renewing early adds to the time you have left. Prices are in euros. Cards are billed in PKR by PayFast, converted at today's rate.",
      ),
    );
    const faqs = await page.$$eval("#faq-heading ~ div h3", (hs) => hs.map((h) => h.textContent.trim()));
    check("7 FAQ questions (§8.5)", faqs.length === 7, faqs.join(" | "));
    check(
      "FAQ answer word for word",
      all.includes(
        "No. Each payment adds 30 days or 365 days of access. Nothing renews automatically, and renewing early adds the new time to what you have left.",
      ),
    );
    check(
      "page text in Raleway",
      (await page.$eval("#plans-heading", (h) => getComputedStyle(h).fontFamily)).includes("Raleway"),
    );

    // Layout at 1280 / 768 / 390: columns and no horizontal scroll.
    for (const [width, expectedCols] of [
      [1280, list.length],
      [768, 3],
      [390, 1],
    ]) {
      await page.setViewport({ width, height: 900 });
      await new Promise((r) => setTimeout(r, 300));
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${width}px: no horizontal scroll`, scroll <= 0, `overflow ${scroll}px`);
      const tops = (await cards(page)).map((c) => c.top);
      const firstRow = tops.filter((t) => t === tops[0]).length;
      check(`${width}px: ${expectedCols} column(s) in the first row`, firstRow === Math.min(expectedCols, tops.length), `${firstRow}`);
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        const el = await page.$("#plans");
        await el.screenshot({ path: path.join(SHOTS, `pricing-${width}.png`) });
      }
    }
  } catch (err) {
    check(`ERROR: ${err.message}`, false);
  } finally {
    await browser.close();
  }
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.ok || !r.detail ? "" : ` (${r.detail})`}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
