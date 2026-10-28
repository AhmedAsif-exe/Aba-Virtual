# Supervision Portal: Phase 2 (Clinic) Plan

Status: **draft, waiting for approval.** No Phase 2 code has been written.
Source of truth: [supervision-plans-brief.md](supervision-plans-brief.md) §6 (Clinic) and the Phase 2 lines of §10. Phase 1 decisions in [supervision-plans-plan.md](supervision-plans-plan.md) still apply.

---

## 0. Where Phase 1 leaves us

| Already built (Phase 1) | Used by Phase 2 for |
| --- | --- |
| `Organisation` (name, planKey clinic/custom, seatLimit, expiresAt) and `OrganisationMember` (organisationId, userId, role admin/supervisor, one org per user) | The clinic itself and its people |
| Entitlements read the organisation: members get its plan, features and expiry; a member's own live pass still counts once the org's has ended | Every Clinic member, unchanged |
| `clinic` plan in config: €80 / €800, seat_limit 5, features `multi_supervisor`, `clinic_dashboard`, `move_supervisees` | Prices, seats, gates |
| Checkout + atomic PayFast callback, order snapshot, renewal stacking maths | Clinic checkout |
| Supervisee invite flow (create or link account, temp password, invite email) | Inviting supervisors |
| Shared-viewer screens (read-only supervisee views) | "Click a supervisor → read-only view" |
| `GET /plans` hides Clinic unless `SHOW_CLINIC_PLAN=true` | Turned on last |

**Phase 1 still open, and Phase 2 depends on it:**
- **Reminder emails** (Phase 1 step 6): Clinic reminders go to the organisation's admins only (brief §4.2). Built once, used by both.
- **Board requirements** (Phase 1 step 7, waiting for ABA Virtual): the dashboard's "count of supervisees **below their board's required supervision %**" (§6.4) needs a required % per board/track, which doesn't exist until that step. See question 1.

**Facts that shape the design:**
- Hours, meetings and assignments already store `createdBy`; moving a supervisee never touches it, so original authors are kept automatically. The portal doesn't **show** authors today, so §6.5 ("past entries keep the name of the supervisor who recorded them") needs a "Recorded by" display.
- Payments belong to the supervisee and move with them. Shares belong to the supervisor, so after a move the old supervisor's viewers stop seeing that supervisee and the new supervisor's viewers start.
- The month rule exists: a week counts in its Monday's month (`Services/supervision.js`).

## 1. Schema changes

All additive.

- **`OrganisationMember.supervises: Boolean`** (default true for role supervisor, false for admin). An admin who also supervises takes a seat; a manager-only admin doesn't (§6.2, decision 7d). Seats used = members with `supervises: true`.
- **`SuperviseeTransfer`** (the audit log, §6.5): `organisationId, superviseeId, fromSupervisorId, toSupervisorId, movedBy, movedAt`. Never edited or deleted.
- **`Order.plan.organisationId`**: set when a Clinic purchase renews an existing organisation, so the callback knows which one.
- No change to supervisee records beyond `supervisorId` being rewritten on a move.

## 2. Roles and access

| Who | Can |
| --- | --- |
| Clinic **admin** | Buy and renew the Clinic pass, invite and remove supervisors, see the clinic dashboard, move supervisees, open any supervisor's supervisees read-only. If `supervises`, also everything a supervisor can. |
| Clinic **supervisor** | Same tools as Professional, for their own supervisees only (plus anything shared with them). |

- New middleware `ensureOrgAdmin` (member with role admin of an organisation with `clinic_dashboard`). Admin routes live under `/organisation/*` (the customer's own organisation; the internal `/admin/*` stays for ABA Virtual staff).
- A manager-only admin has no `portalRole`; the portal header shows "Clinic" for org admins. The clinic routes check membership server-side, not the role.
- Read-only on expiry (§6.6): every write in this section goes through `requireActivePass`, which already uses the organisation's expiry.

## 3. Seats: inviting and removing supervisors (§6.3)

- `POST /organisation/supervisors` (admin): email + name. Same invite flow as supervisees: a new account gets a temporary password in the invite email; an existing account is linked and keeps its password and any individual pass of its own (never refunded or merged). It gets `portalRole: supervisor` and membership `role: supervisor, supervises: true`.
- Refused when seats used ≥ seat limit, with **"Your Clinic plan includes 5 supervisors. Contact us for a Custom plan."** The 5 comes from config. Refused if the account is a supervisee or already in another organisation.
- `PATCH /organisation/members/:userId` (admin): turn `supervises` on or off for an admin (seat-checked when turning on).
- `DELETE /organisation/supervisors/:userId` (admin): refused while they still have supervisees (archived ones included). Message: "Move this supervisor's supervisees to another supervisor first." Their own pass and records are untouched; they keep the supervisor portal on their own pass if they have one, otherwise read-only.

## 4. Clinic dashboard (§6.4)

`GET /organisation/dashboard?month=YYYY-MM` (admin), one row per supervising member:

| Column | How it's computed |
| --- | --- |
| Supervisor name | member's user |
| Active supervisees | profiles with that `supervisorId`, `archivedAt: null` |
| Fieldwork hours this month | sum of their supervisees' `WorkHoursEntry.hours` whose week's Monday falls in the month |
| Average supervision % this month | mean, over their active supervisees **with fieldwork hours that month**, of each supervisee's `supervisionPct` for that month (the same figure the progress chart shows). See question 2. |
| Below required % | count of their active supervisees whose month `supervisionPct` < their board/track's required %; highlighted when > 0. **Needs board requirements**, question 1. |

- Month filter: a month picker, default the current month.
- Clicking a supervisor opens a read-only view of their supervisees, reusing the shared-viewer screens with org-admin access instead of a share.
- A test checks every figure against the individual supervisors' own data for the chosen month (§10).

## 5. Moving supervisees (§6.5)

`POST /organisation/supervisees/:id/move` (admin) with `toSupervisorId`:

- Both supervisors must be supervising members of the same organisation; the supervisee must belong to the "from" supervisor.
- One write: `supervisorId` changes. Hours, meetings, notes, assignments, attachments, payments and progress all follow automatically (they hang off the supervisee, not the supervisor).
- `createdBy` on every past entry is untouched; the portal adds **"Recorded by {name}"** to hours, meetings and assignments so the original authors stay visible.
- Writes a `SuperviseeTransfer` row (who, supervisee, from, to, when).
- Emails the supervisee and both supervisors (wording drafted by me, plain and short, per the brief's style for reminders; see question 5).
- The Starter limit doesn't apply (Clinic is unlimited). Moving an archived supervisee is allowed and keeps them archived.

## 6. Clinic checkout and billing (§6.6, §8.3)

- `clinic` becomes purchasable: `plan:clinic:monthly|yearly`, priced from config (€80 / €800), PKR converted as today.
- **Quote rules:**
  - Buyer is **admin of a Clinic organisation** → renewal of that organisation: `max(now, org expiry) + days` (§4.1 stacking on the organisation's date).
  - Buyer is **not in any organisation** → new organisation, buyer becomes its admin (`supervises: true` if they're a supervisor), expiry `now + days`.
  - Buyer is a supervisor in someone else's organisation, a non-admin member, or in a Custom organisation → refused (message in question 6).
  - A buyer's individual pass is never converted or merged (brief §4.3 decision); it stays on their own account.
- The callback (already atomic) creates or renews the organisation in the same claimed order. Name: "{buyer's name}'s clinic", renameable by the admin.
- Checkout page shows "A new Clinic pass for your team" or "Renewal for {organisation}" and the organisation's new end date.
- One payment sets the expiry for every member (§10); members' own passes are untouched.

## 7. Frontend

- **Clinic area** `/portal/clinic` (org admins): dashboard with month filter, supervisors list with seats "n of 5", Invite supervisor, Remove (blocked with the message above), "I also supervise" toggle for admins, Move supervisee dialog, organisation name, plan status and Renew.
- **Header:** "Clinic" entry for org admins.
- **Read-only view of a supervisor's supervisees** for admins (reuses SharedWithMe screens).
- **"Recorded by"** on hours, meetings and assignments.
- **Pricing page:** Clinic card's "Choose Clinic" goes to checkout (already wired). `SHOW_CLINIC_PLAN=true` is switched on **only at the very end, after all Phase 2 tests pass** (§9).
- Design: the portal screens keep the existing portal (MUI) look like the Phase 1 portal screens; anything on the public pricing/checkout pages uses design-system tokens.

## 8. Order of work (small commits, tests with each)

1. Schema: `supervises`, `SuperviseeTransfer`, `Order.plan.organisationId`.
2. `ensureOrgAdmin` + seat counting + invite/remove supervisors (+ tests: 5 allowed, 6th blocked with the message; remove blocked with supervisees).
3. Move supervisee + audit row + emails (+ tests: all history moves, `createdBy` unchanged, audit row written, 3 emails, cross-organisation move refused).
4. Clinic dashboard API (+ test: figures equal the supervisors' own data for the month).
5. Clinic checkout: quote, initiate, callback creating or renewing the organisation (+ tests: one payment sets every member's expiry; renewal stacks; buyer's own pass untouched; refusals).
6. Frontend: clinic area, move dialog, invite/remove, "Recorded by", header entry, checkout wording.
7. Browser checks (local copy only) at 1280 / 768 / 390px.
8. Turn on `SHOW_CLINIC_PLAN=true` in the local test setup and run every test; you switch it on live.

## 9. Tests mapped to §10 (Clinic)

| §10 item | Test |
| --- | --- |
| Admin can invite up to 5 supervisors; the 6th is blocked with the Custom message | Route test: 5 invites 201, 6th 403 with exact message; manager-only admin takes no seat; admin who supervises takes one |
| Dashboard figures match the individual supervisors' data for the chosen month | Route test seeding two supervisors with known hours and meetings across two months; each column compared with figures computed from their own progress data |
| Moving a supervisee keeps all history, keeps original author names, writes an audit row and sends emails | Route test: counts of hours/meetings/assignments/payments before and after, every `createdBy` unchanged, one `SuperviseeTransfer` row, mailer stub called for supervisee and both supervisors |
| One admin payment sets the expiry for every member | Callback test: Clinic payment → organisation expiry set; `canWrite` true for every member; members' own passes unchanged |

## 10. Open questions (my recommendation for each)

1. **"Below required %" needs board requirements, which are blocked on ABA Virtual.** Recommendation: build everything else now; the column shows "—" until requirements exist, and fills in automatically once Phase 1 step 7 lands. The rest of the dashboard doesn't depend on it.
2. **"Average supervision % this month"**: mean of each supervisee's % (each supervisee counts equally), or total supervision hours ÷ total fieldwork hours across the supervisor's supervisees (busy supervisees count more)? Recommendation: **mean of each supervisee's %**, counting only supervisees who logged fieldwork that month, because it reads as "how is a typical supervisee doing".
3. **Custom organisations**: brief §7 says Custom "works exactly like Clinic". Recommendation: Custom admins get the same clinic area, with their seat limit; the seat-limit message for Custom is "Your plan includes {n} supervisors. Contact us to add more." (needs your wording approval, the spec only gives Clinic's).
4. **Removing a supervisor**: confirm "move their supervisees first" applies to archived supervisees too (recommendation: yes, every supervisee must belong to someone).
5. **Move emails**: the spec says to email the supervisee and both supervisors but gives no wording. Recommendation: I write short plain ones (as you approved for reminders), no review needed unless you want to see them.
6. **Who can buy Clinic**: refuse a supervisor who is already in another organisation, with "Your account belongs to an organisation. Ask its admin to renew." (wording needs approval).
7. **Order with Phase 1**: recommendation: build **Phase 1 reminders first** (small, and Clinic reminders depend on it), then Phase 2 steps 1–8, leaving the "below required %" column and Phase 1 boards for when ABA Virtual confirms.
