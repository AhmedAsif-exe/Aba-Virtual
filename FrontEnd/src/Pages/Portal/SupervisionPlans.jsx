import * as React from "react";
import { Link } from "react-router-dom";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import api from "axiosInstance";
import { formatAmount, useProjectContext } from "Utils/Context";
import { formatDate } from "./portalApi";
import PortalPreview from "./PortalPreview";
import PlanPeriodToggle from "./PlanPeriodToggle";
import { PORTAL_FEATURES } from "Pages/Home/SupervisionShowcase";

// Styled from the ABA Virtual design system only (the ds-* tokens in
// tailwind.config.js, Raleway, radius-lg buttons / radius-xl cards, Tailwind
// shadow-md → lg). Scoped to this page: no shared classes are changed.

const contactMailto = (planName) =>
  `mailto:contact@abavirtual.net?subject=${encodeURIComponent(`${planName} supervision portal plan`)}`;
const PERIOD_KEY = "aba.supervisionPlanPeriod";

// What each card lists, in the wording of the brief's features table (§3).
// Prices, logins and supervisee limits come from the server's plan config.
const CORE_FEATURES = [
  "Weekly fieldwork hour logging",
  "Supervisor reviews and edits hour entries",
  "Supervision meetings with notes",
  "Monthly progress graphs and supervision %",
  "Assignments board with files and ratings (out of 10)",
  "BACB / IBAO / QABA / custom board requirements",
];
const CARD_FEATURES = {
  supervisee: [
    "Own login (invite email, set password on first sign-in)",
    "Weekly fieldwork hour logging",
    "View supervision meetings with notes",
    "View monthly progress graphs and supervision %",
    "View assignments board with files and ratings (out of 10)",
  ],
  starter: CORE_FEATURES,
  professional: [
    "Everything in Starter",
    "View-only sharing with another supervisor",
    "Mark supervision payments as paid",
  ],
  clinic: [
    "Everything in Professional",
    "Multiple supervisor logins under one organisation",
    "Clinic dashboard",
    "Move supervisees between supervisors",
    "One admin, one payment for the team",
  ],
  custom: [
    "Everything in Clinic",
    "Board requirements set up by ABA Virtual",
    "Onboarding call, invoice billing, priority support",
  ],
};

// §8.5, word for word.
const FAQS = [
  {
    q: "Is this a subscription?",
    a: "No. Each payment adds 30 days or 365 days of access. Nothing renews automatically, and renewing early adds the new time to what you have left.",
  },
  {
    q: "What happens when my plan ends?",
    a: "Your account becomes read-only. You can still log in, view and export everything, and your supervisees can view their records. Nothing is deleted. Renew any time to pick up where you left off.",
  },
  {
    q: "Do my supervisees need to pay?",
    a: "No. Supervisees always join free. You invite them from your account and they set their own password.",
  },
  {
    q: "Which currency am I charged in?",
    a: "Prices are shown in euros. Cards are billed in PKR by PayFast, converted at the day's rate. Custom plans can be invoiced in EUR, PKR or USD.",
  },
  {
    q: "Which certification boards does it support?",
    a: "BACB, IBAO and QABA, or you can set up your own board's requirements. On the Custom plan, we set them up for you.",
  },
  {
    q: "Can I change plans?",
    a: "Yes. When you switch, the time left on your current pass is converted into days on the new plan. You can move to Starter if you have 3 or fewer active supervisees.",
  },
  {
    q: "How many supervisees can I have?",
    a: "Starter includes up to 3. Professional, Clinic and Custom include unlimited supervisees.",
  },
];

const eur = (amount) => formatAmount(amount, "EUR");

function readSavedPeriod() {
  try {
    return window.localStorage.getItem(PERIOD_KEY) === "yearly" ? "yearly" : "monthly";
  } catch {
    return "monthly";
  }
}

/** "1 supervisor login · Up to 3 active supervisees", from the plan config. */
function limitsLine(plan) {
  if (plan.key === "supervisee") return "For trainees invited by their supervisor";
  const logins =
    plan.seatLimit == null
      ? "Supervisor logins set per customer (6+)"
      : `${plan.seatLimit === 1 ? "1 supervisor login" : `Up to ${plan.seatLimit} supervisor logins`}`;
  const supervisees =
    plan.maxActiveSupervisees == null
      ? "Unlimited supervisees"
      : `Up to ${plan.maxActiveSupervisees} active supervisees`;
  return `${logins} · ${supervisees}`;
}

/**
 * The supervision portal's public page: what it is, the plans with a
 * Monthly / Yearly toggle, and the FAQ. Also where a supervisor comes to
 * renew, so it says first where their plan stands.
 */
export default function SupervisionPlans() {
  const { user, loggedIn } = useProjectContext();
  const [plans, setPlans] = React.useState(null);
  const [failed, setFailed] = React.useState(false);
  const [period, setPeriod] = React.useState(readSavedPeriod);
  const [openFaq, setOpenFaq] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    api
      .get("/supervision/plans")
      .then((res) => alive && setPlans(res.data.plans))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const choosePeriod = (next) => {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_KEY, next);
    } catch {
      /* private mode or blocked storage: the choice just isn't remembered */
    }
  };

  const plan = user?.supervisionPlan;
  const isSupervisee = user?.portalRole === "supervisee";
  const isSupervisor = user?.portalRole === "supervisor";

  return (
    <main className="bg-white font-raleway text-ds-ink lining-nums">
      {/* HERO */}
      <section className="relative overflow-hidden bg-ds-navy-900 pt-[130px] t:pt-[160px] pb-20 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-[480px] w-[480px] rounded-full bg-ds-blue-700/50 blur-[120px]" />
          <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-ds-teal-500/20 blur-[120px]" />
        </div>
        <div className="section relative grid items-center gap-12 l:grid-cols-2">
          <div className="text-left">
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-ds-teal-500/40 px-3 py-1 text-[14px] font-semibold text-ds-mist-200">
              <span className="h-2 w-2 rounded-full bg-ds-teal-500" aria-hidden="true" />
              For ABA supervisors and supervisees
            </p>
            <h1 className="mt-5 mb-0 text-[40px] t:text-[50px] font-bold leading-[1.15]">
              The ABA Virtual Supervision Portal
            </h1>
            <p className="mt-5 max-w-[540px] text-[20px] leading-relaxed text-ds-mist-200">
              Track your supervisees' fieldwork hours, supervision meetings,
              progress and assignments in one place. Supervisees log their own
              hours; you review everything.
            </p>
            <div className="mt-8 flex flex-col gap-3 ml:flex-row ml:flex-wrap">
              {isSupervisor && plan?.planKey ? (
                <Link to="/portal/supervisees" className={primaryButton}>
                  Open your portal
                </Link>
              ) : isSupervisee ? (
                <Link to="/portal" className={primaryButton}>
                  Open my supervision
                </Link>
              ) : (
                <a href="#plans" className={primaryButton}>
                  See plans &amp; pricing
                </a>
              )}
              {!loggedIn && (
                <>
                  <Link
                    to="/signup"
                    state={{ from: "/supervision-plans" }}
                    className={`${buttonBase} bg-white text-ds-navy-900 hover:bg-ds-mist-100`}
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/login"
                    state={{ from: "/supervision-plans" }}
                    className={`${buttonBase} border border-white/40 text-white hover:bg-white/10`}
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
          <PortalPreview className="mx-auto w-full max-w-[540px]" />
        </div>
      </section>

      <AccountStatus user={user} />

      {/* PLANS */}
      {!plan?.complimentary && (
        <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-28 bg-ds-cloud-50 py-20">
          <div className="section">
            <div className="mx-auto max-w-[680px] text-center">
              <h2 id="plans-heading" className="m-0 text-[25px] t:text-[40px] font-bold leading-[1.2] text-ds-navy-900">
                Plans &amp; pricing
              </h2>
              <p className="mt-4 mb-0 text-[16px] leading-relaxed text-ds-slate-500">
                One-time passes, not subscriptions. Supervisees always join free.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <PlanPeriodToggle value={period} onChange={choosePeriod} />
                <span className="rounded-full bg-ds-peach-100 px-3 py-1 text-[14px] font-semibold text-ds-ink">
                  Yearly: 2 months free
                </span>
              </div>
            </div>

            {failed && (
              <p role="alert" className="mt-10 mb-0 text-center text-[16px] text-ds-ink">
                The plans couldn't be loaded. Please refresh the page.
              </p>
            )}

            <div
              className={`mt-12 grid items-stretch gap-6 min-[600px]:grid-cols-2 min-[768px]:grid-cols-3 ${
                plans?.length === 5 ? "l:grid-cols-5" : "l:grid-cols-4"
              }`}
            >
              {plans
                ? plans.map((p) => (
                    <PlanCard
                      key={p.key}
                      plan={p}
                      period={period}
                      isSupervisee={isSupervisee}
                    />
                  ))
                : !failed &&
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} aria-hidden="true" className="h-[520px] animate-pulse rounded-xl bg-ds-mist-100" />
                  ))}
            </div>

            {/* §8.4, word for word. */}
            <p className="mx-auto mt-8 mb-0 max-w-[760px] text-center text-[14px] leading-relaxed text-ds-slate-500">
              No plan renews automatically. Each payment adds 30 or 365 days, and renewing early
              adds to the time you have left.
            </p>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section aria-labelledby="features-heading" className="py-20">
        <div className="section">
          <div className="mx-auto max-w-[640px] text-center">
            <h2 id="features-heading" className="m-0 text-[25px] t:text-[40px] font-bold leading-[1.2] text-ds-navy-900">
              Inside the portal
            </h2>
          </div>
          <ul className="m-0 mt-12 grid list-none gap-6 p-0 min-[600px]:grid-cols-2 l:grid-cols-3">
            {PORTAL_FEATURES.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="rounded-xl border border-ds-mist-200 bg-white p-6 text-left shadow-md transition duration-200 hover:shadow-lg"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-ds-blue-700">
                  <Icon sx={{ fontSize: 22, color: "white" }} aria-hidden="true" />
                </span>
                <h3 className="mt-4 mb-0 text-[20px] font-semibold text-ds-navy-900">{title}</h3>
                <p className="mt-2 mb-0 text-[16px] leading-relaxed text-ds-slate-500">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="bg-ds-mist-100 py-20">
        <div className="section max-w-[820px]">
          <h2 id="faq-heading" className="m-0 text-center text-[25px] t:text-[40px] font-bold leading-[1.2] text-ds-navy-900">
            Questions about the portal
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="overflow-hidden rounded-xl bg-white text-left shadow-md">
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 bg-transparent px-6 py-5 text-left text-[16px] font-semibold text-ds-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-teal-600"
                    >
                      {f.q}
                      <ExpandMoreIcon
                        aria-hidden="true"
                        className="shrink-0 text-ds-teal-600 transition-transform duration-200"
                        sx={{ transform: open ? "rotate(180deg)" : "none" }}
                      />
                    </button>
                  </h3>
                  <div id={`faq-${i}`} hidden={!open} className="px-6 pb-5 text-[16px] leading-relaxed text-ds-slate-500">
                    {f.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

const buttonBase =
  "inline-flex min-h-[48px] items-center justify-center rounded-lg px-4 py-2 text-center text-[18px] font-bold leading-tight lining-nums no-underline transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-teal-600 focus-visible:ring-offset-2";
// The one primary call to action: orange-500 with white 18px bold text.
const primaryButton = `${buttonBase} bg-ds-orange-500 text-white shadow-md hover:bg-ds-orange-600 hover:shadow-lg`;
const secondaryButton = `${buttonBase} bg-ds-blue-700 text-white hover:bg-ds-blue-600`;
const outlineButton = `${buttonBase} border-2 border-ds-blue-700 bg-white text-ds-blue-700 hover:bg-ds-mist-100`;

function PlanCard({ plan, period, isSupervisee }) {
  const featured = plan.featured;
  // Priced plans show their price whether or not checkout sells them yet
  // (Clinic checkout arrives in Phase 2).
  const price = plan.prices ? plan.prices[period] : null;

  let amount;
  let periodLabel = null;
  let subLine;
  if (plan.key === "supervisee") {
    amount = "Free";
    subLine = "Invite only";
  } else if (!price) {
    // Custom: quoted, no list price.
    amount = "Let's talk";
    subLine = "Quote, invoiced by ABA Virtual";
  } else {
    amount = eur(price.priceEur);
    periodLabel = `/ ${price.days} days`;
    subLine =
      period === "yearly"
        ? `About ${eur(plan.yearly.monthlyEquivalentEur)} a month. Save ${eur(plan.yearly.savingEur)}`
        : "One payment. Not a subscription.";
  }

  let cta;
  if (plan.key === "supervisee") {
    cta = isSupervisee ? (
      <Link to="/portal" className={outlineButton}>
        Open my supervision
      </Link>
    ) : (
      <Link to="/login" state={{ from: "/portal" }} className={outlineButton}>
        Log in with your invite
      </Link>
    );
  } else if (plan.checkout !== "payfast") {
    // Custom always, and Clinic until its checkout ships in Phase 2.
    cta = (
      <a href={contactMailto(plan.name)} className={outlineButton}>
        Contact us
      </a>
    );
  } else {
    cta = (
      <Link
        to={`/checkout?plan=${plan.key}&period=${period}`}
        className={featured ? primaryButton : secondaryButton}
      >
        Choose {plan.name}
      </Link>
    );
  }

  return (
    <article
      aria-labelledby={`plan-${plan.key}`}
      className={`relative flex flex-col rounded-xl bg-white p-5 text-left transition duration-200 ${
        featured ? "border-2 border-ds-teal-600 shadow-xl" : "border border-ds-mist-200 shadow-md hover:shadow-lg"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-ds-navy-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <h3 id={`plan-${plan.key}`} className="m-0 text-[25px] font-semibold leading-[1.3] text-ds-navy-900">
        {plan.name}
      </h3>
      <p className="mt-1 mb-0 min-h-[42px] text-[14px] leading-snug text-ds-slate-500">{limitsLine(plan)}</p>
      <p className="mt-5 mb-0 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
        <span className="text-[40px] font-bold leading-none text-ds-navy-900">{amount}</span>
        {periodLabel && <span className="text-[16px] text-ds-slate-500">{periodLabel}</span>}
      </p>
      <p className="mt-2 mb-0 min-h-[42px] text-[14px] leading-snug text-ds-slate-500">{subLine}</p>
      <ul className="m-0 mt-5 flex-grow list-none space-y-3 p-0">
        {CARD_FEATURES[plan.key].map((f) => (
          <li key={f} className="flex gap-2 text-[14px] leading-snug text-ds-ink">
            <CheckIcon className="shrink-0 text-ds-teal-600" sx={{ fontSize: 20 }} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col">{cta}</div>
    </article>
  );
}

/** Where the signed-in account stands, before the plans. */
function AccountStatus({ user }) {
  const plan = user?.supervisionPlan;
  const isSupervisee = user?.portalRole === "supervisee";
  const name = plan?.planKey ? plan.planKey[0].toUpperCase() + plan.planKey.slice(1) : null;

  let message = null;
  let warm = false;
  if (plan?.complimentary) {
    message = "Your account has free access to the Supervision Portal. No plan needed.";
  } else if (isSupervisee) {
    message =
      "This is a supervisee account, so it's already covered by your supervisor. Plans are for supervisors.";
  } else if (plan?.planKey && plan.active) {
    message = `Your ${name} plan is active until ${formatDate(plan.expiresAt)} (${plan.daysLeft} ${
      plan.daysLeft === 1 ? "day" : "days"
    } left). Renewing early adds the new time to what you have left.`;
  } else if (plan?.planKey && user?.portalRole === "supervisor") {
    warm = true;
    message = `Your ${name} plan ended${
      plan.expiresAt ? ` on ${formatDate(plan.expiresAt)}` : ""
    }. Your account is read-only: you can still log in, view and export everything. Nothing is deleted. Renew any time to pick up where you left off.`;
  }
  if (!message) return null;

  return (
    <div className="section mt-10">
      <p
        role="status"
        className={`m-0 rounded-xl border-l-4 px-5 py-4 text-left text-[16px] leading-relaxed text-ds-ink ${
          warm ? "border-ds-orange-500 bg-ds-cream-50" : "border-ds-teal-600 bg-ds-mist-100"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
