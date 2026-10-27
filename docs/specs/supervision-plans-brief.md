# Supervision Portal: Plans & Pricing — Complete Brief for Claude Code

This brief replaces all my earlier messages. It contains the **entire approved spec** plus **every decision we've made since**, merged into the right sections. Lines marked **[Decision]** are things decided after the spec was written; they override the original spec text.

## How to use this brief

1. Save this message as `docs/specs/supervision-plans-brief.md` and commit it.
2. From now on this brief is the single source of truth. It overrides `docs/specs/supervision-plans-spec.md` and anything said earlier in chat.
3. Re-read this brief and `docs/specs/supervision-plans-plan.md` at the start of every new session.
4. Update the plan file so it references this brief.

---

## STEP 0 — SAFETY (do this before anything else)

- **Do not restart the local server.** First tell me which database it's connected to.
- If it's the live database, set up a local copy and point the server at that before any restart.
- Nothing new touches live data until I approve the migration.
- Never run the migration against a real database. I run it myself.

---

## Current state

Branch `phase1-plans-pricing` has these commits: the plan, the login fix (`c0acde5`, not yet approved), the test setup, the plan config and billing maths, and entitlements. You've also reported that backend rules for limits, archiving and read-only are in progress. Step 2 asks you to confirm the exact status.

---

## THE SPEC (with decisions merged)

**Page:** https://abavirtual.net/supervision-plans
**Design reference:** the ABA Virtual design system you've already located. Use it for all visual styling: colours, type, spacing, radius, buttons, cards and the toggle.
**Content reference:** `supervision-plans-pricing.html`. Use it only for copy, card order and toggle behaviour. Never use its colours, fonts or styling.
**Status:** Approved. Build in two phases (section 9).

### 1. Summary of changes

- Replace the current two supervisor plans (Monthly €30, Yearly €350) with five plans: **Supervisee, Starter, Professional, Clinic, Custom**.
- Add a **Monthly / Yearly toggle** at the top of the pricing section.
- Lower the Professional yearly price from **€350 to €300**.
- Add a **3-supervisee limit** to the new Starter plan.
- Build new **Clinic** features: multiple supervisor logins under one organisation, a clinic dashboard, moving supervisees between supervisors, and one admin with one payment.
- Add a **Custom** plan with no checkout (contact form / email), set up manually by the ABA Virtual admin.
- Move existing customers onto the new plans without losing access or data.
- Fill in the FAQ answers that are currently empty on the page.

The payment model does not change: **every plan is a one-time pass, not a subscription.** Nothing renews automatically.

### 2. Plans and prices

Prices are stored and shown in **EUR**. Cards are charged in **PKR via PayFast**, converted at the day's rate (same as today).

| Plan key | Name | 30-day pass | 365-day pass | Supervisor logins | Supervisees | Checkout |
| --- | --- | --- | --- | --- | --- | --- |
| supervisee | Supervisee | Free | Free | — | — | Invite only |
| starter | Starter | €15 | €150 | 1 | Up to 3 active | PayFast |
| professional | Professional | €30 | €300 | 1 | Unlimited | PayFast |
| clinic | Clinic | €80 | €800 | Up to 5 | Unlimited | PayFast |
| custom | Custom | Quote | Quote | Set per customer (6+) | Unlimited | Manual / invoice |

Keep prices in config, not hard-coded in templates, so they can change without a deploy.

**Yearly savings shown on the page**

| Plan | Yearly | Monthly equivalent shown | Saving shown |
| --- | --- | --- | --- |
| Starter | €150 | About €12.50 a month | Save €30 |
| Professional | €300 | About €25 a month | Save €60 |
| Clinic | €800 | About €66.67 a month | Save €160 |

Saving = (monthly price × 12) − yearly price. Calculate it from config so it stays correct if prices change.

**[Decision] Rounding:**
- Monthly equivalents are rounded to the cent ("About €66.67 a month").
- PKR keeps the current rule: today's rate, rounded to the nearest Rs 50 via `pkrFromEur`. Unchanged.
- Migration credit rounds **up** (61 days). Plan-change day conversion rounds **down**.

### 3. Features by plan (entitlements)

| Feature | Supervisee | Starter | Professional | Clinic | Custom |
| --- | --- | --- | --- | --- | --- |
| Own login (invite email, set password on first sign-in) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weekly fieldwork hour logging | ✓ (logs own) | ✓ | ✓ | ✓ | ✓ |
| Supervisor reviews and edits hour entries | — | ✓ | ✓ | ✓ | ✓ |
| Supervision meetings with notes | View | ✓ | ✓ | ✓ | ✓ |
| Monthly progress graphs and supervision % | View | ✓ | ✓ | ✓ | ✓ |
| Assignments board with files and ratings (out of 10) | View | ✓ | ✓ | ✓ | ✓ |
| BACB / IBAO / QABA / custom board requirements | — | ✓ | ✓ | ✓ | ✓ (set up by ABA Virtual) |
| Max active supervisees per supervisor | — | **3** | Unlimited | Unlimited | Unlimited |
| View-only sharing with another supervisor | — | — | ✓ | ✓ | ✓ |
| Mark supervision payments as paid | — | — | ✓ | ✓ | ✓ |
| Multiple supervisor logins under one organisation | — | — | — | **Up to 5** | **Custom limit** |
| Clinic dashboard | — | — | — | ✓ | ✓ |
| Move supervisees between supervisors | — | — | — | ✓ | ✓ |
| One admin, one payment for the team | — | — | — | ✓ | ✓ |
| Onboarding call, invoice billing, priority support | — | — | — | — | ✓ (handled outside the app) |

Implement entitlements as a feature-flag lookup by plan key (e.g. `can(user, 'view_only_sharing')`), not scattered `if plan == ...` checks. Enforce every limit **server-side**; hiding things in the UI is cosmetic only.

### 3a. [Decision] Board requirements

- Store board requirements as **editable data** (board, track, total hours, required supervision %), never hard-coded, so they can change without a deploy.
- Draft values, **pending confirmation from ABA Virtual**:
  - BACB Supervised Fieldwork: 2000 hours, 5%
  - BACB Concentrated Supervised Fieldwork: 1500 hours, 10% (7.5% under the BACB 2027 rules, effective 1 January 2027)
  - IBAO IBA: 1500 hours, 5% (75 supervision hours)
  - QABA QBA: 2000 hours, 5%
- Your earlier values (BACB 2000 / 1:10, IBAO 1500 / 1:10, QABA 1500 / 1:30) were **wrong**. Replace them everywhere.
- Don't build the boards step until I confirm the values (see Step 2).

### 4. Billing logic (pass-based, no subscriptions)

#### 4.1 Buying and renewing

- Each payment adds **30 days** (monthly) or **365 days** (yearly).
- `new_expiry = max(now, current_expiry) + period_days`
- Renewing early adds the new time to the remaining time (existing behaviour, keep it).
- No stored cards, no auto-charge, no auto-renew.
- **[Decision]** Each payment stores plan, period, price paid (EUR) and days added.

#### 4.2 Reminder emails

- Send an email **7 days** and **1 day** before expiry, and on the day it expires. Each email links to the pricing page. No other automatic action.
- **[Decision]** You write the final copy; no review needed. Every reminder links to the pricing page and says nothing renews automatically. The expiry-day email also says the account is now read-only and no data is deleted.
- **[Decision]** For organisations (Custom now, Clinic in Phase 2), reminders go to the organisation's admin(s) only. Other members get no reminder emails but see the read-only banner after expiry.

#### 4.3 Changing plan while a pass is active

Convert the remaining value into days on the new plan:

```
remaining_value = remaining_days × (old_price ÷ old_period_days)
credited_days   = floor(remaining_value ÷ (new_price ÷ new_period_days))
new_expiry      = now + credited_days + purchased_period_days
```

- **Upgrade** (e.g. Starter → Professional): the customer pays for the new pass and the converted days are added on top.
- **Downgrade to Starter:** allowed only if the supervisor has **3 or fewer active supervisees**. Otherwise show: *"Starter includes up to 3 supervisees. You have {n} active. Archive {n−3} to switch to Starter."*
- Show the new expiry date on the checkout screen before payment.
- **[Decision]** `old_price` is the price **actually paid**, never today's config. When passes are stacked, keep one blended per-day value so each stacked pass counts at what was paid for it.
- **[Decision]** Migrated €350 yearly customers count at €300 for conversion, because they've already received the 61-day credit.
- **[Decision]** Monthly ↔ yearly on the **same plan** is a renewal, not a plan change: time stacks. Example: 10 days left on Professional monthly + a Professional yearly pass = 375 days.
- **[Decision]** Professional → Clinic and Clinic → Professional are Phase 2. An individual pass stays separate from a clinic and is never converted or merged; a person leaving a clinic simply buys Professional.
- **[Decision]** Anything ↔ Custom is set by hand on the internal admin screen.

#### 4.4 When a pass ends

- Supervisor account switches to **read-only**: they can log in and view or export all data, but cannot add supervisees, approve hours, add meetings or create assignments.
- Supervisees linked to that supervisor can still log in and **view** their data. Hour logging is paused until the supervisor renews. Show: *"Your supervisor's plan has ended. You can view your records. Logging opens again when they renew."*
- **No data is deleted** on expiry.
- **[Decision] Allowed while read-only:** resetting a supervisee's password, removing a share, and **archiving** a supervisee (but **not restoring**). Archiving is allowed so an expired supervisor can get down to 3 supervisees and come back on Starter.
- **[Decision]** While the supervisor's plan has ended, supervisees also **cannot reply to assignments**. Keep the banner above word for word; add a short note on the assignments page explaining replies are paused.
- **[Decision]** Export means CSV export of the supervisor's data (build this; see section 9).

#### 4.5 Starter supervisee limit

- "Active supervisee" = not archived.
- Block the 4th invite with: *"Starter includes up to 3 supervisees. Upgrade to Professional for unlimited supervisees."* plus an upgrade button.
- Archiving a supervisee frees a slot. Archived supervisees keep all records and can be restored if a slot is free.
- **[Decision]** Archived supervisees **cannot log hours** (otherwise archiving would get around the limit). They can still view their records.

### 5. Migration of existing customers

| Current state | New state |
| --- | --- |
| Active Monthly (€30) supervisor | professional, same expiry date |
| Active Yearly (€350) supervisor | professional, same expiry date **+ 61 days** one-time credit (the €50 difference at the new €300 yearly rate) |
| Expired supervisor | professional plan key, expired (read-only, per 4.4) |
| Supervisee | supervisee, no change |

- Run the migration as a single script that can be run again without doing anything twice. Record a `migration_credit_applied` flag so the 61 days is added only once.
- Send a one-time email to Yearly customers: *"We've lowered the yearly Professional price to €300. As you paid €350, we've added 61 days to your access. Your new end date is {date}."*
- No existing supervisor loses unlimited supervisees, view-only sharing or payment tracking.
- **[Decision]** The script supports `--dry-run`, which prints counts plus sample rows of what would change.
- **[Decision]** Emails are sent **only** with an extra `--send-emails` option. A dry run never sends anything, whatever options are given.
- **[Decision]** Accounts with free access that never expires stay exactly as they are.

### 6. Clinic plan (Phase 2 — do not build yet)

#### 6.1 Data model

- `organisation` table: id, name, plan_key (clinic | custom), seat_limit, expiry, created_at.
- `organisation_member`: organisation_id, user_id, role (admin | supervisor).
- Supervisees stay linked to one supervisor (`supervisor_id`) and, through them, to the organisation.
- `seat_limit` = 5 for Clinic and is set manually for Custom.
- **[Decision]** These two tables are built in **Phase 1**, used only by the Custom admin screen. Phase 2 builds the Clinic features on top of them.

#### 6.2 Roles

- **Admin:** buys and renews the pass, invites and removes supervisors, sees the clinic dashboard, moves supervisees. An admin who also supervises takes up a seat; an admin who only manages does not.
- **Supervisor:** same tools as Professional, limited to their own supervisees (plus read-only for anything shared with them).

#### 6.3 Seats

- Admin invites supervisors by email (same invite flow as supervisees).
- Block the invite once `seat_limit` is reached: *"Your Clinic plan includes 5 supervisors. Contact us for a Custom plan."*
- Removing a supervisor requires their supervisees to be moved to another supervisor first (6.5).
- A supervisor who already has their own individual pass keeps it separately. Joining a clinic does not refund or merge it.

#### 6.4 Clinic dashboard (admin only)

One page with a row per supervisor:
- Supervisor name
- Number of active supervisees
- Fieldwork hours logged this month (all their supervisees)
- Average supervision % this month
- Count of supervisees below their board's required supervision % (highlighted)

Filter by month. Clicking a supervisor opens a read-only view of their supervisees.

#### 6.5 Moving supervisees between supervisors

- Admin picks a supervisee and a new supervisor in the same organisation.
- **All history moves with the supervisee** (hours, meetings, notes, assignments, progress).
- Past entries keep the name of the supervisor who recorded or approved them.
- Write an audit log row: who, supervisee, from_supervisor, to_supervisor, timestamp.
- Email the supervisee and both supervisors.

#### 6.6 Billing

- One payment by the admin covers the whole organisation. All members share the organisation's expiry date.
- On expiry, every member follows the read-only rules in 4.4.

### 7. Custom plan (Phase 1)

- No checkout. The card button is `mailto:contact@abavirtual.net?subject=Custom%20supervision%20portal%20plan` (or the site contact form with "Custom plan" pre-selected, if preferred).
- Add an internal **ABA Virtual admin screen** to:
  - Create an organisation with `plan_key = custom`, any `seat_limit`, and any expiry date
  - Mark it paid by invoice / bank transfer (payment reference field and amount, currency EUR / PKR / USD)
  - Extend the expiry
  - Set up custom board requirements for that organisation
  - **[Decision]** Move an account onto or off Custom by hand
- Everything else works exactly like Clinic (the Clinic-specific features arrive in Phase 2).

### 8. Pricing page

#### 8.1 Layout

- Build all visuals from the **ABA Virtual design system**: its tokens (colours, type scale, spacing, radius) and components (buttons, cards, badges, toggle / segmented control). If it has no matching component, build one from its tokens. Never add new colours or fonts.
- Use `supervision-plans-pricing.html` for copy, card order and toggle behaviour only, not styling.
- Card order: Supervisee, Starter, **Professional (featured, "Most popular" badge)**, Clinic, Custom.
- Responsive: 5 columns on desktop, 3 on tablet, 2 on small tablets, 1 on phones. No horizontal scroll at 390px.

#### 8.2 Toggle

- Two-option toggle at the top: **Monthly | Yearly**. Default: **Monthly**.
- Next to it, a tag: **"Yearly: 2 months free"**.
- Switching updates, without reloading the page:
  - Price (€15 → €150, €30 → €300, €80 → €800)
  - Period label ("/ 30 days" → "/ 365 days")
  - Sub-line ("One payment. Not a subscription." → "About €X a month. Save €Y")
- Supervisee (Free) and Custom ("Let's talk") stay the same in both modes.
- Each CTA sends the selected plan and period to checkout, e.g. `/checkout?plan=professional&period=yearly`. Logged-out users go to log in / sign up first, then on to checkout with the selection kept.
- Accessibility: buttons use `aria-pressed`; works with the keyboard.
- Optional: remember the last choice in localStorage (wrapped in try/catch).

#### 8.3 CTA labels

| Card | Button | Goes to |
| --- | --- | --- |
| Supervisee | Log in with your invite | Login |
| Starter | Choose Starter | Checkout (plan + period) |
| Professional | Choose Professional | Checkout (plan + period) |
| Clinic | Choose Clinic | Checkout (plan + period), creates organisation after payment |
| Custom | Contact us | mailto / contact form |

#### 8.4 Notes under the cards

> No plan renews automatically. Each payment adds 30 or 365 days, and renewing early adds to the time you have left. Prices are in euros. Cards are billed in PKR by PayFast, converted at today's rate.

#### 8.5 FAQ answers (currently empty on the live page — use word for word)

**Is this a subscription?** No. Each payment adds 30 days or 365 days of access. Nothing renews automatically, and renewing early adds the new time to what you have left.

**What happens when my plan ends?** Your account becomes read-only. You can still log in, view and export everything, and your supervisees can view their records. Nothing is deleted. Renew any time to pick up where you left off.

**Do my supervisees need to pay?** No. Supervisees always join free. You invite them from your account and they set their own password.

**Which currency am I charged in?** Prices are shown in euros. Cards are billed in PKR by PayFast, converted at the day's rate. Custom plans can be invoiced in EUR, PKR or USD.

**Which certification boards does it support?** BACB, IBAO and QABA, or you can set up your own board's requirements. On the Custom plan, we set them up for you.

**Can I change plans?** Yes. When you switch, the time left on your current pass is converted into days on the new plan. You can move to Starter if you have 3 or fewer active supervisees.

**How many supervisees can I have?** Starter includes up to 3. Professional, Clinic and Custom include unlimited supervisees.

### 8a. [Decision] Extra messages (not in the original spec — use word for word)

| Situation | Message |
| --- | --- |
| A plan tries to use a feature it doesn't include (e.g. Starter sharing) | "This feature isn't included in your plan. Upgrade to use it." + upgrade button |
| An archived supervisee logs in | "Your supervisor has archived your record. You can still view your records. Contact your supervisor if this is a mistake." |
| A supervision plan is in a cart with other items | "A supervision plan has to be bought on its own. Please check out other items separately." |
| An account with free access tries to buy a plan | "This account already has free access to the portal, so there's nothing to buy." |

### 9. Release plan

#### Phase 1 — build now

- New plan config and entitlements (Supervisee, Starter, Professional, Custom; Clinic defined in config but hidden)
- Starter 3-supervisee limit and archive / restore
- Plan change with day conversion
- Read-only state on expiry, plus reminder emails
- Migration script and customer email
- Pricing page with toggle, **Clinic card hidden** behind a feature flag (`SHOW_CLINIC_PLAN=false`)
- FAQ answers
- Custom plan mailto and internal admin screen
- **[Decision]** Organisation tables (for Custom only)
- **[Decision]** CSV export for read-only accounts
- **[Decision]** Checkout page showing the new expiry before payment; read-only screens and banners; archive / restore buttons; sign-up flow that keeps the plan selection and logs the user in
- **[Decision]** Board requirements as editable data (after I confirm values)

#### Phase 2 — Clinic (do not start until I ask)

- Organisation members, roles and seats (on top of the Phase 1 tables)
- Clinic dashboard
- Moving supervisees between supervisors, with audit log
- Clinic checkout
- Turn on `SHOW_CLINIC_PLAN=true` only at the very end, after all Phase 2 tests pass

### 10. Acceptance checklist

**Pricing page**
- All colours, fonts, spacing and components come from the ABA Virtual design system
- Toggle switches all three paid prices, period labels and savings lines; Free and Custom don't change
- Savings are calculated from config and read €30 / €60 / €160
- CTA passes the right plan and period to checkout, and the choice survives login
- Layout works at 1280px, 768px and 390px with no horizontal scroll
- Clinic card is hidden while the flag is off

**Billing**
- 30-day and 365-day passes add the right number of days; early renewal stacks
- Nothing charges automatically
- Upgrade converts the remaining days correctly (test Starter → Professional halfway through a monthly pass)
- Downgrade to Starter is blocked with more than 3 active supervisees
- PayFast charges the PKR equivalent of the EUR price
- **[Decision]** Conversion uses price actually paid, including stacked passes and migrated €350 yearly users counted at €300
- **[Decision]** Monthly → yearly on the same plan stacks (10 days left + yearly = 375 days)

**Limits and expiry**
- Starter blocks the 4th active supervisee and shows the upgrade message
- Archiving frees a slot; restoring works when a slot is free
- Expired supervisor can view and export but not edit; supervisees can view but not log hours
- Reminder emails go out at 7 days, 1 day and on expiry
- **[Decision]** While read-only: password reset, removing a share and archiving work; restoring does not
- **[Decision]** Archived supervisees can't log hours
- **[Decision]** Supervisees of an expired supervisor can't reply to assignments
- **[Decision]** Organisation reminders go to admins only

**Migration**
- All current Monthly and Yearly supervisors are on Professional with no lost features
- Yearly €350 customers get +61 days exactly once, even if the script runs twice
- Yearly customers receive the credit email with their new end date
- **[Decision]** `--dry-run` changes nothing and sends nothing, whatever other options are given
- **[Decision]** Emails are only sent with `--send-emails`
- **[Decision]** Free never-expiring accounts are unchanged

**Custom**
- Internal admin can create a Custom organisation with any seat limit and expiry, and mark it paid by invoice

**Clinic (Phase 2)**
- Admin can invite up to 5 supervisors; the 6th is blocked with the Custom message
- Dashboard figures match the individual supervisors' data for the chosen month
- Moving a supervisee keeps all history, keeps original author names, writes an audit row and sends emails
- One admin payment sets the expiry for every member

---

## Other decisions

- Backend linter: not added in this branch. `npm test` plus the frontend lint is enough. Log ESLint as a follow-up task in the plan.
- Plan file is `docs/specs/supervision-plans-plan.md` (renamed from `phase1-plan.md`, history kept).

---

## STEP 2 — REPORT BACK, THEN STOP

Don't decide these yourself. Answer them, then wait for my reply.

1. **Database:** which one the local server uses (Step 0).
2. **Login fix `c0acde5`:** explain in plain words what was broken, what you changed, and what else it affects.
3. **Board tracks:** how does the current data model handle standard vs concentrated tracks, and the BACB 2027 change? Propose an approach.
4. **Existing commits:** check everything on `phase1-plans-pricing` against this brief. List anything that needs changing.
5. **Status table:** every Phase 1 item in section 9 and every Phase 1 line in section 10, marked done / in progress / not started, with the test that covers each.

---

## STEP 3 — BUILD ORDER (after I reply)

1. Fixes from Step 2, item 4
2. Migration script + customer email
3. Organisation tables + Custom internal admin screen
4. CSV export
5. Frontend: pricing page with toggle and Clinic hidden, FAQ, notes under cards, checkout page, read-only screens and banners, archive / restore buttons, sign-up flow
6. Reminder emails
7. Board requirements (only after I confirm values)

Report after each numbered step with what changed and which tests cover it.

---

## RULES (always)

- Prices, periods and limits come from config; savings and monthly equivalents are calculated, never typed.
- One central entitlements helper; no scattered plan checks; limits enforced server-side.
- Design system tokens and components only, for every visual.
- Copy from sections 4, 5, 6, 8 and 8a is used word for word.
- Small commits, one concern each, with tests for every acceptance item.
- Run the full test suite and frontend lint before calling a step done.
- Never run the migration against a real database.
- Don't touch unrelated features or refactor beyond what this work needs.
- If anything contradicts this brief, stop and ask.
- Do not start Phase 2 until I ask.
