# Supervision Portal: New Plans & Pricing, Phase 1 Plan

Status: **approved 2026-10-27** (decisions in section 12). Reminder email wording still awaits approval.
Source of truth: the approved spec (appendix of the task brief). Section numbers (§) refer to it.

---

## 0. What the codebase looks like today (Step 1 findings)

| Topic | Today |
| --- | --- |
| Stack | React 18 (Create React App) + Tailwind + MUI frontend in `FrontEnd/`; Express 5 + Mongoose 8 (MongoDB Atlas) backend in `BackEnd/`; Sanity CMS in `blog-cms/`. |
| Migrations | No migration tool. One-off scripts live in `BackEnd/scripts/` and are run by hand with `node` (`seedBoards.js`, `promoteSupervisor.js`). MongoDB has no schema migrations, so new fields need defaults or a backfill script. |
| Tests | None. `BackEnd/package.json` has the npm placeholder test script. The frontend has no test files. |
| Run locally | `cd BackEnd && node server.js` (port 5000) and `cd FrontEnd && npm start` (port 3000). The `.env` files point at localhost. **Warning: `BackEnd/.env` `MONGODB_URI` may be the live database.** |
| Plans and prices | `BackEnd/Services/supervisionPlans.js` → `SUPERVISION_PLANS` (`supervision-monthly` €30/30 days, `supervision-yearly` €350/365 days). Mirrored by hand in `FrontEnd/src/Pages/Portal/SupervisionPlans.jsx` (`PLANS`) and `Pages/Home/SupervisionShowcase.jsx` (hard-coded `price: 30`). |
| Expiry storage | `User.supervisionPlan = { plan, expiresAt }`. Only the last plan id bought is kept; there is no history on the user. `extendPlan()` already does `max(now, expiry) + days`. Complimentary accounts: hard-coded email list `COMPLIMENTARY_SUPERVISORS` (Faiza). |
| Checkout | `POST /payfast/initiate` takes item ids only. `Services/pricing.js resolveCart()` prices them and converts EUR→PKR with `pkrFromEur` (open.er-api.com rate, 1 h cache, rounded to Rs 50). An `Order` snapshots the items, EUR total, PKR amount and FX rate. The frontend posts a hidden form to PayFast. There is no `/checkout` page: the plans page goes straight to PayFast. |
| Callback | `handleCallback` (IPN and browser legs) verifies the hash, then `if (order.status !== "pending") return`. **Not race-safe:** it reads, then acts, then saves, so two legs arriving at the same moment can both run `extendPlan`, which would add the days twice. |
| Supervisor ↔ supervisee | `SuperviseeProfile.supervisorId` (one supervisor each). `status` enum is `active / paused / completed`. **There is no archive.** Delete removes all records. A paused or completed supervisee can still log hours (known gap). |
| Invites | `POST /supervision/supervisees` creates or links the user and sends `sendSuperviseeInvite` (`Services/mailer.js`, Hostinger SMTP via nodemailer). Sending never throws. |
| Scheduled jobs | `node-cron` is installed. The only job is in `Routes/gateway.js` (midnight, prunes `paidItems` older than a year). There are no reminder emails. |
| Export | **None.** There is no CSV or PDF export anywhere (a known gap; the format was never decided with the client). |
| Site admin | **There is no ABA Virtual admin login.** "Manage boards" is a supervisor screen. `ADMIN_SECRET_KEY` is only a body field on one games endpoint. |
| Boards | `SupervisionBoard` is **global**: any supervisor can create, rename or retire any board through `/boards`. Fine with one supervisor; a problem once many pay. |

### Every plan / expiry check today (each becomes an entitlement check)

| # | Where | What it does |
| --- | --- | --- |
| 1 | `BackEnd/Middleware/supervisionAuth.js` `ensureSupervisor` | Role check **plus** `planStatus().active` → 402 on **every** supervisor route, reads included. |
| 2 | `BackEnd/Routes/boards.js` (`router.use(ensureSupervisor)`) | Same as #1 for all board routes. |
| 3 | `BackEnd/Routes/supervision.js` `ensureViewer` (~l.896) | A shared viewer gets 402 if the sharer's plan has lapsed. |
| 4 | `BackEnd/Routes/supervision.js` `listSharedWithMe` (~l.866) | `available: planStatus(u).active`. |
| 5 | `BackEnd/Routes/auth.js` `/me` (~l.140) | Sends `supervisionPlan: planStatus(user)` to the browser. |
| 6 | `BackEnd/Routes/payfast.js` initiate (~l.56, 66) | `isPlanId`: supervisees can't buy; plans are exempt from the "already owned" rule. |
| 7 | `BackEnd/Routes/payfast.js` callback (~l.202) | `isPlanId` → `extendPlan`. |
| 8 | `BackEnd/Services/pricing.js` `priceStaticItem` | Prices plan ids from `SUPERVISION_PLANS`. |
| 9 | `FrontEnd/src/Pages/Portal/RequirePortalRole.jsx` (l.46) | An expired supervisor is redirected to `/supervision-plans` (the portal is fully locked). |
| 10 | `FrontEnd/src/Pages/Portal/SupervisorDashboard.jsx` (l.44-46) | "Renew soon" banner at 7 days or fewer. |
| 11 | `FrontEnd/src/Pages/Portal/SupervisionPlans.jsx` (l.15-19, 79-82, 242) | Hard-coded plans, lapsed or renew labels, savings. |
| 12 | `FrontEnd/src/Pages/Home/SupervisionShowcase.jsx` (l.53) | Hard-coded `supervision-monthly` €30. |
| — | Supervisee routes (`/me/*`) | **No check at all.** A supervisee can log hours whatever the supervisor's plan is. §4.4 needs a new check here. |
| — | Shares and payments routes | Gated only by #1. There is no per-feature gate yet (Starter will need one). |

### Pricing page, FAQ and design system

- The page and FAQ are in `FrontEnd/src/Pages/Portal/SupervisionPlans.jsx` (`FAQS` array, `PLANS`, cards around l.200-300). The route is in `App.js`, and the page is prerendered by `FrontEnd/scripts/prerender.js`.
- **Design system:** the claude.ai Design System artifact (`project/tokens.json`, synced 2026-10-02) plus the code: `FrontEnd/tailwind.config.js` (`navy`, `brand`, `teal`, `coral`, `ember`, `sea-*` scale, shadows, breakpoints) and the `@layer components` classes in `FrontEnd/src/index.css` (`.section`, `.eyebrow`, `.btn-*`, `.card`).
  - **There is no toggle or segmented-control component** in either. I'll build one from the tokens.
  - **The code has drifted from the artifact:**
    - The current plans page uses `rounded-3xl` cards (24px) instead of `radius-xl` (12px), and `.btn` uses `rounded-xl` (12px) instead of `radius-lg` (8px).
    - The `sea-*` palette (added in the October redesign) isn't in the artifact.
    - Tailwind's default `slate-500` (#64748b) is not the design-system `slate-500` (#627d8f).
    - The success ticks use #16a34a, not `green-500` #57c785.
    - The CTA uses `ember` (#ec5923, the token for orange-600 hover) instead of `orange-500`.
    - See open question 12.
- **`supervision-plans-pricing.html` is not in the repo or in Downloads. Please send it** (open question 11). Everything else in this plan can go ahead without it, because the spec already holds all the copy.

---

## 1. Schema changes

All changes are additive with defaults, so the current code keeps working until each step lands.

**`User.supervisionPlan`** (extended, not replaced):

```js
supervisionPlan: {
  plan:        String,   // legacy id, kept for history ("supervision-yearly")
  planKey:     { type: String, enum: ["starter","professional","clinic","custom", null] },
  expiresAt:   Date,     // UTC, exact timestamp (unchanged)
  rateEurPerDay: Number, // blended value of the time left (Q3)
  complimentary: { type: Boolean, default: false },   // replaces the email list (Q-note)
  migrationCreditApplied: { type: Boolean, default: false },
  migrationEmailSentAt: Date,
}
siteAdmin: { type: Boolean, default: false }        // ABA Virtual admin (Q9)
timezone:  { type: String, default: null }          // IANA name from the browser (Q6)
```

**`Order`**: add a snapshot block for plan purchases (Q2):

```js
plan: { planKey, period: "monthly"|"yearly", priceEur, periodDays,
        kind: "new"|"renewal"|"change", quotedExpiresAt, appliedExpiresAt }
```

Status gains `"processing"` for the atomic claim in the callback (§4).

**`SuperviseeProfile`**: add `archivedAt: { type: Date, default: null }` plus the index `{ supervisorId, archivedAt }`. "Active" means `archivedAt === null` (§4.5). `status` keeps its current meaning (active, paused or completed), and paused supervisees still count towards the limit, as the spec says.

**`PlanReminder`** (new): `{ userId, expiresAt, kind: "7d"|"1d"|"expired", sentAt }`, with a **unique** index on `(userId, expiresAt, kind)` (Q7).

**`Organisation`, `OrganisationMember`, `OrganisationPayment`** (new, minimal; Q1):
- `Organisation { name, planKey: "clinic"|"custom", seatLimit, expiresAt, createdAt }`
- `OrganisationMember { organisationId, userId, role: "admin"|"supervisor" }`, unique on `userId` (one org per user)
- `OrganisationPayment { organisationId, method: "invoice"|"bank_transfer", reference, amount, currency: "EUR"|"PKR"|"USD", recordedBy, recordedAt }`

**`SupervisionBoard`**: add `organisationId` and `ownerId` (both nullable; null and null = global). The unique index changes from `name` to `(organisationId, ownerId, name)` (Q10).

**Backfill:** none needed for the new fields (they all have defaults). The migration script (§7) fills `planKey`, `rateEurPerDay`, `complimentary` and the credit.

## 2. Config

`BackEnd/Config/plans.js`, the single source of truth:

```js
PLANS = {
  supervisee:   { checkout: "invite" },
  starter:      { monthly: { priceEur: 15, days: 30 }, yearly: { priceEur: 150, days: 365 } },
  professional: { monthly: { priceEur: 30, days: 30 }, yearly: { priceEur: 300, days: 365 } },
  clinic:       { monthly: { priceEur: 80, days: 30 }, yearly: { priceEur: 800, days: 365 } },
  custom:       { checkout: "manual" },
}
FEATURES = { starter: {...}, professional: {...}, clinic: {...}, custom: {...} }  // §3 table
SHOW_CLINIC_PLAN = process.env.SHOW_CLINIC_PLAN === "true"   // default false
```

- Prices can be overridden with an env var `SUPERVISION_PLAN_PRICES` (JSON). Changing a price then needs only a `pm2 restart`, not a deploy.
- The frontend reads prices, savings and the clinic flag from a new `GET /supervision/plans` endpoint and never has its own copy. So a price change needs no frontend rebuild, and the hard-coded prices in `SupervisionPlans.jsx` and `SupervisionShowcase.jsx` go away.
- Savings are computed as `monthly × 12 − yearly`. The "About €X a month" line is `yearly ÷ 12`, rounded to cents.
- Checkout item ids: `plan:<planKey>:<period>`. The legacy ids `supervision-monthly` and `supervision-yearly` stay recognised **only in the callback**, so an order started before the deploy still completes (as Professional at the price snapshotted on that order).

## 3. Entitlements module

`BackEnd/Services/entitlements.js`. Pure functions with no database access; the caller passes in what they need.

```js
effectivePlan(user, { organisation })   // → { planKey, expiresAt, active, complimentary, source: "user"|"org" }
can(user, feature, ctx)                  // feature ∈ FEATURES keys; false when the plan doesn't include it
canWrite(user, ctx)                      // has a plan AND it's active (or complimentary)
limit(user, "max_active_supervisees", ctx)  // 3 | Infinity
```

- **Feature keys:** `review_hours`, `meetings`, `progress`, `assignments`, `boards`, `custom_boards`, `view_only_sharing`, `payment_tracking`, `multi_supervisor` (Phase 2), `clinic_dashboard` (Phase 2), `move_supervisees` (Phase 2).
- **Expiry is not a feature.** `can()` answers "does the plan include it". `canWrite()` answers "is the pass live". Read endpoints check only `can()` (and, for read access, simply being a supervisor), so an expired supervisor can still view everything their plan included.

**Express middleware** (in `Middleware/supervisionAuth.js`; this replaces the scattered checks #1 to #4):

| Middleware | Use | Response |
| --- | --- | --- |
| `ensureSupervisor` | role only (no expiry) | 403 |
| `requireActivePass` | every supervisor **write** route | 402 `{ planExpired: true }` |
| `requireFeature(key)` | shares, payments, custom boards | 403 `{ upgradeRequired: key }` |
| `requireSupervisorActive` | supervisee **write** routes (hours) | 402 with the exact §4.4 message |
| `requireSlot` | add supervisee, restore supervisee | 403 with the exact §4.5 message and `upgradeRequired` |

Read routes keep `ensureSupervisor` only. Read routes for shared viewers check `can(sharer, "view_only_sharing")` (see Q5).

## 4. Billing maths (pure functions with unit tests)

`BackEnd/Services/billing.js`:

```js
renew({ expiresAt, rate }, { priceEur, days }, now)      // §4.1 → { expiresAt, rate }
change({ expiresAt, rate }, { priceEur, days }, now)     // §4.3 → { expiresAt, rate, creditedDays }
quote(user, planKey, period, now)                        // branches renewal/change/new (Q4)
migrationCreditDays(paidEur, newYearlyEur, days=365)     // ceil(50 / (300/365)) = 61
```

- `remaining_days` = remaining milliseconds ÷ 1 day (fractional). `credited_days = floor(...)` per §4.3. To avoid floating-point errors (7.4999999), the calculation is done in cents, with an epsilon before the floor.
- The **migration** credit uses **ceil** (60.8 → 61, as §5 says). The plan-change credit uses **floor** (§4.3). Both are kept exactly as the spec wrote them.
- **Callback** (rewrites `handleCallback`):
  1. Claim the order atomically: `Order.findOneAndUpdate({ basketId, status: "pending" }, { status: "processing" })`. If it returns null, the payment was already handled, so do nothing.
  2. Load the user and recompute with `quote()` at **callback time**. The checkout screen showed a quote from a few minutes earlier; the difference is less than a day.
  3. Write the user with a conditional update on the previous `expiresAt`.
  4. Mark the order `paid` and save `appliedExpiresAt`.
  5. If anything fails after the claim, the order stays `processing` and is logged loudly for manual fixing. It is never retried automatically, so days are never added twice.
- **PayFast:** `resolveCart` is unchanged except that `priceStaticItem` reads `plan:<key>:<period>` from config. The conversion code is not touched. Sandbox only during development.

## 5. Starter limit and archive

- `POST /supervision/supervisees/:id/archive` and `POST /supervision/supervisees/:id/restore` (supervisor, `requireActivePass`; restore also passes through `requireSlot`). Archive only sets `archivedAt`; nothing is deleted.
- An archived supervisee can still log in and view their records, but cannot log hours. Their roster entry moves to an "Archived" section.
- `requireSlot` counts `SuperviseeProfile.countDocuments({ supervisorId, archivedAt: null })` and compares it with `limit()`.
- Downgrade to Starter: `quote()` refuses when there are more than 3 active supervisees, using the exact §4.3 message with `{n}` and `{n−3}` filled in. The same check runs in `/payfast/initiate`. If someone adds a 4th supervisee between paying and the callback, the change still applies (they've paid), and the limit then blocks new adds and restores until they're back to 3 or fewer. Nothing is archived automatically.

## 6. Reminder emails

- An hourly `node-cron` job in a new `Services/planReminders.js`, started from `server.js` (not from a route file).
- For each supervisor (and, later, organisation) with a non-complimentary pass, it picks the **single most recent** due reminder:
  - `expired` if now ≥ expiresAt (only within 24 h after expiry)
  - else `1d` if now ≥ expiresAt − 1 day
  - else `7d` if now ≥ expiresAt − 7 days
- Before sending, it **inserts** the `PlanReminder` row; the unique index blocks a second send. If the send fails, it deletes the row so the next run retries.
- Each email links to `/supervision-plans`.
- The spec gives no wording for these three emails (§4.2 gives only the timing), so I will propose copy for your approval (open question 13).

## 7. Migration script

`BackEnd/scripts/migratePlans.js [--dry-run]`:

| Current state | Action |
| --- | --- |
| Complimentary email (Faiza) | `planKey: professional`, `complimentary: true` |
| `plan: supervision-monthly`, active | `planKey: professional`, same expiry, `rate = 30/30` |
| `plan: supervision-yearly`, active, `!migrationCreditApplied` | `planKey: professional`, expiry **+61 days**, `rate = 300/365`, `migrationCreditApplied: true`, then send the §5 email once (`migrationEmailSentAt`) |
| Any supervisor whose pass has expired | `planKey: professional`, expiry unchanged |
| Supervisee | unchanged |

- Each write is conditional (`migrationCreditApplied: false` in the filter), so a second run changes nothing.
- The email goes only when `migrationEmailSentAt` is unset, and is recorded straight after sending.
- `--dry-run` prints the counts per row of the table above and a per-user table (email, old plan, old expiry, new plan, new expiry, credit days, email to send), and writes nothing.
- It also flags for manual review any supervisor with **more than one** paid yearly order (stacked yearly passes, where 61 days may under-credit).
- **I will not run it against production.**

## 8. Custom plan admin screen (Phase 1, minimal)

- `siteAdmin` users only, set with a new `scripts/promoteAdmin.js <email>` (same pattern as `promoteSupervisor.js`).
- Route `/admin/organisations` (frontend) and `/admin/organisations` API, guarded by `ensureSiteAdmin`.
- Actions:
  - Create a Custom organisation (name, seat limit, expiry)
  - Attach existing accounts as admin or supervisor members by email
  - Record an invoice or bank-transfer payment (reference, amount, currency EUR/PKR/USD)
  - Extend the expiry
  - Create boards owned by that organisation
- Members get the organisation's plan and expiry through `effectivePlan`.

## 9. Frontend

- **`SupervisionPlans.jsx`** (rewritten pricing section and FAQ):
  - The cards come from `GET /supervision/plans`, in order Supervisee, Starter, Professional (featured, "Most popular" badge), Clinic (hidden while the flag is off), Custom.
  - A new segmented control `PlanPeriodToggle.jsx` (`aria-pressed`, real `<button>`s, arrow and Tab keys), with the "Yearly: 2 months free" tag next to it.
  - The chosen period is remembered in localStorage inside try/catch.
  - Grid: 1 column on phones, then 2 (≥ `ml` 426px), 3 (≥ `t` 769px) and 5 (≥ `l` 1025px). With the clinic card hidden the desktop grid is 4.
  - The note under the cards and the FAQ answers are copied word for word from §8.4 and §8.5.
- **New `/checkout` page** (`?plan=&period=`):
  - It is a guarded route; logged-out visitors go to login with `from` set to the full URL (Q8).
  - It calls `GET /supervision/plans/quote`, which returns the kind (new, renewal or change), credited days, the **new expiry date**, the EUR price and the PKR estimate.
  - It shows the Starter downgrade block message when that applies.
  - Then it starts the PayFast checkout.
- **Read-only portal:**
  - `RequirePortalRole` stops redirecting expired supervisors to the plans page.
  - The dashboards show an "ended" banner and disable write buttons. The server still enforces everything.
  - Supervisees see the exact §4.4 message and the hour form is disabled.
- **Supervisor dashboard:** Archive and Restore actions, the §4.5 limit message with an "Upgrade to Professional" button, and the share and payment controls hidden when `can()` is false (`/auth/me` sends `entitlements`).
- **`SupervisionShowcase.jsx`:** reads the "from" price from the API.
- **Admin screen** at `/admin/organisations`.
- **Restore the stashed login-redirect fix** (`stash@{0}`): Google sign-in currently drops `from`, which would break "the choice survives login".

## 10. Order of work (small commits; tests run after each)

1. Backend test harness: `node --test` (built into Node 24) plus a `mongodb-memory-server` dev dependency for route tests. `npm test` runs everything.
2. `Config/plans.js` + `Services/billing.js` + unit tests (renewal, stacking, change, migration credit).
3. `Services/entitlements.js` + unit tests.
4. Schema additions (User, Order, SuperviseeProfile, PlanReminder, Organisation*, Board ownership).
5. Middleware: split `ensureSupervisor`, add `requireActivePass` to every supervisor write route, and add `requireSupervisorActive` to supervisee writes. Route tests: an expired supervisor can read but gets 402 on each write.
6. Feature gates: shares and payments behind `requireFeature`. Tests.
7. Archive and restore + `requireSlot` on add and restore. Tests.
8. Boards ownership (global read-only for supervisors, own and org boards editable). Tests.
9. `GET /supervision/plans`, `GET /supervision/plans/quote`, `/payfast/initiate` plan ids + snapshot.
10. Atomic callback + `applyPurchase`. Tests: the same callback twice, and twice at once.
11. Reminder job + emails. Tests: runs twice → one email; renewal → no stale reminder.
12. `scripts/migratePlans.js` with `--dry-run`. Tests against an in-memory database (run twice → credit once, one email).
13. `siteAdmin` + `promoteAdmin.js` + admin organisation API. Tests.
14. Frontend: plans API client + `PlanPeriodToggle` + pricing cards + note + FAQ.
15. Frontend: `/checkout` page + login hand-off (and the restored login fix).
16. Frontend: read-only states, archive UI, limit and upgrade messages, entitlement-driven controls.
17. Frontend: admin organisations screen.
18. Clean-up: remove the legacy plan constants, `SupervisionShowcase` hard-coding, and `COMPLIMENTARY_SUPERVISORS` (once the migration has run; until then entitlements check both).

## 11. Test plan against §10 (Phase 1 items)

| §10 item | How it will be verified |
| --- | --- |
| Colours, fonts, spacing and components from the design system | Manual review: grep the new files for hex values and non-token classes (none allowed outside the token map). |
| Toggle switches the three paid prices, period labels and savings; Free and Custom don't change | Manual check in the browser + keyboard check (Tab, Space, arrows), with screenshots at both states. |
| Savings computed from config read €30 / €60 / €160 | Unit test on the savings function using config, plus a test that changing config changes the saving. |
| CTA passes plan and period; the choice survives login | Manual: logged out → Choose Professional (Yearly) → log in by email, then by Google → land on `/checkout?plan=professional&period=yearly`. |
| No horizontal scroll at 1280, 768 and 390px | Playwright (installed Edge) script: assert `scrollWidth ≤ innerWidth` at each width, plus screenshots. |
| Clinic card hidden while the flag is off | Route test on `GET /supervision/plans` (flag off and on) + manual check. |
| 30/365 days added; early renewal stacks | Unit tests on `renew()`. |
| Nothing charges automatically | Code review: no stored card or token, and the job only sends email. Stated in the hand-off. |
| Upgrade conversion (Starter → Professional halfway through a monthly pass) | Unit test: 15 days left on Starter monthly → €7.50 → Professional monthly credits 7 days → expiry now + 37 days. Professional yearly: floor(7.5 ÷ (300/365)) = 9 → now + 374 days. |
| Downgrade to Starter blocked above 3 active | Route test on quote and initiate with 4 active → exact message "…You have 4 active. Archive 1…". |
| PayFast charges the PKR equivalent of the EUR price | Unit test on `resolveCart` with a stubbed FX rate for each `plan:*:*` id + one sandbox payment by hand. |
| Starter blocks the 4th active supervisee with the upgrade message | Route test (exact text). |
| Archiving frees a slot; restore works when a slot is free | Route tests: archive → add succeeds; restore at 3 active → blocked; at 2 → succeeds. |
| Expired supervisor can view and export but not edit; supervisees can view, not log | Route tests across every write route (402) and every read route (200); supervisee hour POST → exact §4.4 message. Export: see open question 14. |
| Reminders at 7 days, 1 day and on expiry | Unit tests on the "which reminder is due" function + a route-level test that runs the job twice (one email) and after a renewal (none). The mailer is stubbed. |
| All Monthly and Yearly supervisors on Professional, nothing lost | Migration test on an in-memory database seeded with every case; dry-run output reviewed by you on real data. |
| Yearly +61 days exactly once, even if run twice | Migration test: run twice, assert expiry and email count. |
| Yearly customers get the credit email with the new date | Migration test with a stubbed mailer: assert the exact §5 text and date. |
| Custom: create org, any seat limit and expiry, mark paid by invoice | Route tests on the admin API (and a non-admin gets 403) + manual check of the screen. |

---

## 12. Decisions (approved 2026-10-27)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Phase conflict | Organisation tables move into Phase 1 as data model only. Only the internal admin screen uses them in Phase 1. |
| 2 | Price snapshot | Every plan order snapshots `planKey`, `period`, `priceEur`, `periodDays`. Migrated Yearly customers count as €300 (`rate = 300/365`). |
| 3 | Stacked passes | One blended `rateEurPerDay` on the user: `(remaining_days × old_rate + price) ÷ (remaining_days + period_days)`. |
| 4 | Renewal vs change | Same `planKey` = renewal with stacking (§4.1). Different `planKey` = change (§4.3). No or expired plan = new purchase. |
| 5 | Downgrade to Starter | Keep all data, switch sharing and payment tracking off, back on after upgrade. Never delete. |
| 6 | Timezones | Store UTC, expire at the exact timestamp, browser shows local time. Emails use the user's saved IANA timezone; if none is saved, the date is in UTC with "UTC" written next to it. |
| 7 | Reminder de-duplication | `PlanReminder` row (unique on user + expiresAt + kind) inserted before sending. |
| 8 | Logged-out checkout | The plan + period travel in the `/checkout?plan=&period=` URL through login (backup in sessionStorage). (a) The Google login fix from `stash@{0}` goes in first as its own commit, tested, with the diff shown. (b) Sign-up does **not** require email verification today (`POST /auth/register` creates the user and returns 201, no verification step), so sign-up will log the user in, using the same `req.logIn` as `/auth/login`. No auth check is removed or loosened. |
| 9 | Site admins | `User.siteAdmin`, set only by `node scripts/promoteAdmin.js <email>`, never from any route or UI. No emails in code. You run the script for both admin emails. |
| 10 | Boards | BACB, IBAO and QABA become global and read-only for everyone except site admins. Each supervisor owns the extra boards they create. Custom organisations can have their own boards (set by a site admin). |
| 11 | Pricing HTML | Not needed. All copy comes word for word from the spec. |
| 12 | Design system | The whole `/supervision-plans` page content is restyled to the design-system tokens. Styles are scoped to this page; the shared header, footer, nav, `index.css` component classes and global styles are not changed. The missing token names are added to `tailwind.config.js` only as new names (no existing name is changed, so nothing else on the site changes). |
| 13 | Reminder emails | Drafts below. They will not be wired in until you approve them. |
| 14 | Export | CSV export per supervisee: hours, meetings with notes, assignments with ratings, monthly progress. Available to the supervisor (also while read-only) and to the supervisee for their own records. Attachments stay downloadable as today. Supervisor private notes (`supervisorNotes`) are not in the supervisee's export. Meeting `notes` are in both, because supervisees already see them today. |
| 15 | Approve hours | No approval workflow is added. Every supervisor hour create, edit or delete is a write, blocked when read-only. |
| — | Shared viewers | Keep view-only access after the owner's plan ends (if the owner's plan includes sharing). |
| — | Rounding | Migration credit rounds up (61 days). Plan changes round down. Both exactly as written in the spec. |

### Board check (read-only query, 2026-10-27)

| Board | Full name | Default hours | Ratio | Active | Created = updated? | Profiles using it |
| --- | --- | --- | --- | --- | --- | --- |
| BACB | Behavior Analyst Certification Board | 2000 | 1:10 | yes | yes (never edited) | 0 |
| IBAO | International Behavior Analysis Organization | 1500 | 1:10 | yes | yes (never edited) | 2 |
| QABA | Qualified Applied Behavior Analysis Credentialing Board | 1500 | 1:30 | yes | yes (never edited) | 0 |

All three match `scripts/seedBoards.js` exactly. **There are no custom boards**, so no owners need assigning. There is one supervisor account in the database.

### Reminder email drafts (for approval)

`{date}` is the end date and time in the user's timezone, e.g. "4 November 2026, 14:30 (Asia/Karachi)", or "4 November 2026, 09:30 UTC" when no timezone is saved. `{plan}` is Starter, Professional or Custom. The button links to https://abavirtual.net/supervision-plans.

**7 days before**
- Subject: Your supervision portal plan ends in 7 days
- Body:
  > Hi {name},
  >
  > Your {plan} plan for the ABA Virtual supervision portal ends on {date}.
  >
  > If you renew before then, the new time is added to the time you have left. Nothing renews automatically.
  >
  > If your plan ends, your account becomes read-only. Nothing is deleted.
  >
  > [Renew your plan]

**1 day before**
- Subject: Your supervision portal plan ends tomorrow
- Body:
  > Hi {name},
  >
  > Your {plan} plan for the ABA Virtual supervision portal ends on {date}.
  >
  > Renew now to keep adding supervisees, hours and meetings. Any time you have left is added on.
  >
  > If your plan ends, your account becomes read-only. Nothing is deleted.
  >
  > [Renew your plan]

**On expiry**
- Subject: Your supervision portal plan has ended
- Body:
  > Hi {name},
  >
  > Your {plan} plan for the ABA Virtual supervision portal ended on {date}.
  >
  > Your account is now read-only. You and your supervisees can still log in, view and export your records. Nothing is deleted.
  >
  > Renew any time to pick up where you left off.
  >
  > [Renew your plan]
