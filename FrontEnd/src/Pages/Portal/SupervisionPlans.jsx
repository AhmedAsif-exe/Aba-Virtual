import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast } from "react-toastify";

import { formatAmount, useProjectContext } from "Utils/Context";
import { initiateCheckoutSession } from "Utils/Queries/Checkout";
import { formatDate } from "./portalApi";
import PortalPreview from "./PortalPreview";
import { PORTAL_FEATURES } from "Pages/Home/SupervisionShowcase";

// Mirrors BackEnd/Services/supervisionPlans.js. The server prices checkout
// from the id alone; `price` (EUR) here is only for display.
const PLANS = [
  { id: "supervision-monthly", name: "Monthly", price: 30, period: "month", days: 30 },
  { id: "supervision-yearly", name: "Yearly", price: 350, period: "year", days: 365 },
];

// Every paid plan includes the whole portal; they differ only in length.
const FEATURES = [
  "Unlimited supervisees, each with their own login",
  "Weekly fieldwork hours and supervision meeting logs",
  "Monthly progress graphs and supervision %",
  "Assignments board with file attachments and ratings",
  "View-only sharing with other supervisors",
  "BACB, IBAO, QABA and your own certifying boards",
];

// What a supervisee sees in their own login (the /me routes).
const SUPERVISEE_FEATURES = [
  "Your own login, set up by your supervisor",
  "Log your fieldwork hours each week",
  "See your supervision meetings and notes",
  "Track your monthly progress",
  "Open assignments and their attached files",
];

const FAQS = [
  {
    q: "Is this a subscription?",
    a: "No. Each payment is a one-off that adds 30 days (Monthly) or 365 days (Yearly) of access. Nothing renews automatically. If you renew early, the new time is added on top of what you have left.",
  },
  {
    q: "What happens when my plan ends?",
    a: "The portal locks until you renew. Nothing is deleted: your supervisees, their hours, meetings and assignments are all kept.",
  },
  {
    q: "Do my supervisees need to pay?",
    a: "No. Only supervisors choose a plan. You add your supervisees and each one gets a welcome email with their login.",
  },
  {
    q: "Which currency am I charged in?",
    a: "Prices are shown in your local currency where we can, but cards are billed in Pakistani rupees (PKR) through PayFast, our payment provider.",
  },
  {
    q: "Which certification boards does it support?",
    a: "BACB, IBAO and QABA are set up already, and you can add your own board with its own requirements.",
  },
];

/**
 * The supervision portal's public page: what it is, the plans (buy, renew,
 * or see that you don't need to), and how it works.
 *
 * Also where an expired supervisor lands (RequirePortalRole sends them here),
 * so the page speaks to that case first. Paying is a one-off PayFast checkout
 * that adds 30 or 365 days; renewing early stacks on top.
 */
export default function SupervisionPlans() {
  const { user, loggedIn, currency, priceOf } = useProjectContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = React.useState(null);
  const [openFaq, setOpenFaq] = React.useState(0);

  const plan = user?.supervisionPlan;
  const isSupervisee = user?.portalRole === "supervisee";
  const isSupervisor = user?.portalRole === "supervisor";
  const lapsed = isSupervisor && plan && !plan.active;

  const handleBuy = async (item) => {
    if (!loggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setBuying(item.id);
    try {
      await initiateCheckoutSession([item], {
        currency,
        displayAmount: priceOf(item),
      });
      // The browser is now leaving for PayFast; nothing else to do here.
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not start checkout");
      setBuying(null);
    }
  };

  // Twelve months on Monthly against one Yearly, in the visitor's currency.
  const monthly = priceOf(PLANS[0]);
  const yearly = priceOf(PLANS[1]);
  const saving = monthly != null && yearly != null ? monthly * 12 - yearly : null;

  const openPortal = (
    <Button color="inherit" onClick={() => navigate("/portal/supervisees")}>
      Open portal
    </Button>
  );

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy pt-[130px] t:pt-[160px] pb-20 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-[480px] w-[480px] rounded-full bg-sea-600/40 blur-[120px]" />
          <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-teal/25 blur-[120px]" />
        </div>
        <div className="section relative grid items-center gap-14 l:grid-cols-2">
          <div className="text-left">
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-sea-300/30 bg-sea-400/10 px-3 py-1 text-[13px] font-semibold text-sea-100">
              <span className="h-2 w-2 rounded-full bg-sea-300 shadow-[0_0_12px_3px_rgba(75,183,186,0.8)]" aria-hidden="true" />
              For ABA supervisors and supervisees
            </p>
            <h1 className="mt-5 mb-0 text-[34px] t:text-[50px] font-extrabold leading-[1.08]">
              The ABA Virtual{" "}
              <span className="bg-gradient-to-r from-sea-200 via-sea-100 to-teal bg-clip-text text-transparent">
                Supervision Portal
              </span>
            </h1>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-sea-100/80">
              Track your supervisees' fieldwork hours, supervision meetings,
              progress and assignments in one place. Supervisees log their own
              hours; you review everything.
            </p>
            <div className="mt-8 flex flex-col gap-3 ml:flex-row ml:flex-wrap">
              {isSupervisor && plan?.active ? (
                <Link to="/portal/supervisees" className="btn-portal">
                  Open your portal
                </Link>
              ) : isSupervisee ? (
                <Link to="/portal" className="btn-portal">
                  Open my supervision
                </Link>
              ) : (
                <a href="#plans" className="btn-portal">
                  See plans &amp; pricing
                </a>
              )}
              {!loggedIn && (
                <>
                  <Link
                    to="/signup"
                    state={{ from: "/supervision-plans" }}
                    className="btn bg-white text-navy shadow-lift hover:-translate-y-0.5"
                  >
                    Sign Up
                  </Link>
                  <Link to="/login" state={{ from: "/supervision-plans" }} className="btn-on-dark">
                    Log In
                  </Link>
                </>
              )}
            </div>
          </div>
          <PortalPreview className="mx-auto w-full max-w-[540px]" />
        </div>
      </section>

      {/* ACCOUNT STATUS */}
      {(plan?.complimentary || lapsed || (plan?.active && !plan.complimentary) || isSupervisee) && (
        <div className="section mt-10 space-y-3">
          {plan?.complimentary && (
            <Alert severity="success" action={openPortal}>
              Your account has free access to the Supervision Portal. No plan needed.
            </Alert>
          )}
          {lapsed && (
            <Alert severity="warning">
              Your plan ended{plan.expiresAt ? ` on ${formatDate(plan.expiresAt)}` : ""}. Renew to
              open the portal again. All your supervisees, hours and meetings are kept.
            </Alert>
          )}
          {plan?.active && !plan.complimentary && (
            <Alert severity="info" action={openPortal}>
              Your plan is active until {formatDate(plan.expiresAt)} ({plan.daysLeft}{" "}
              {plan.daysLeft === 1 ? "day" : "days"} left). Renewing now adds time on top.
            </Alert>
          )}
          {isSupervisee && (
            <Alert severity="info">
              This is a supervisee account, so it's already covered by your supervisor. Plans are
              for supervisors.
            </Alert>
          )}
        </div>
      )}

      {/* PLANS */}
      {!plan?.complimentary && (
        <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-28 py-20 t:py-24">
          <div className="section">
            <div className="mx-auto max-w-[640px] text-center">
              <p className="eyebrow text-sea-600 m-0">Plans &amp; pricing</p>
              <h2 id="plans-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
                One portal, two ways to pay
              </h2>
              <p className="mt-4 mb-0 text-[17px] text-slate-600">
                Supervisors choose monthly or yearly access. Every plan includes
                the whole portal, and supervisees always join free.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 l:grid-cols-3">
              {/* Supervisee: free */}
              <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-soft">
                <h3 className="m-0 text-[20px] font-bold text-navy">Supervisee</h3>
                <p className="mt-1 mb-0 text-[14px] text-slate-500">For trainees whose supervisor uses ABA Virtual</p>
                <p className="mt-6 mb-0 flex items-baseline gap-2">
                  <span className="text-[44px] font-extrabold leading-none text-navy">Free</span>
                </p>
                <p className="mt-2 mb-0 text-[13px] text-slate-500">Your supervisor creates your account</p>
                <ul className="m-0 mt-6 flex-grow list-none space-y-3 p-0">
                  {SUPERVISEE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[14px] text-slate-700">
                      <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 20 }} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={isSupervisee ? "/portal" : "/login"}
                  className="btn mt-8 border border-sea-200 bg-sea-50 text-sea-700 hover:-translate-y-0.5 hover:bg-sea-100"
                >
                  {isSupervisee ? "Open my supervision" : "Log in with your invite"}
                </Link>
              </article>

              {PLANS.map((item) => {
                const isYearly = item.id === "supervision-yearly";
                const price = priceOf(item);
                const disabled = isSupervisee || buying !== null || price == null;
                return (
                  <article
                    key={item.id}
                    className="relative flex flex-col rounded-3xl border-2 border-sea-200 bg-white p-7 text-left shadow-[0_20px_50px_-20px_rgba(38,92,126,0.35)] transition duration-300 hover:-translate-y-1 hover:border-sea-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="m-0 text-[20px] font-bold text-navy">{item.name}</h3>
                      {isYearly && saving > 0 && (
                        <span className="rounded-full bg-gradient-to-r from-sea-500 to-sea-700 px-3 py-1 text-[12px] font-semibold text-white">
                          Save {formatAmount(saving, currency)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 mb-0 text-[14px] text-slate-500">For supervisors</p>
                    <p className="mt-6 mb-0 flex items-baseline gap-2">
                      <span className="text-[44px] font-extrabold leading-none text-navy">
                        {formatAmount(price, currency)}
                      </span>
                      <span className="text-[15px] text-slate-500">/ {item.period}</span>
                    </p>
                    <p className="mt-2 mb-0 text-[13px] text-slate-500">
                      One payment, {item.days} days of access. Not a subscription.
                      {currency !== "EUR" ? ` €${item.price} in euros.` : ""}
                    </p>
                    <ul className="m-0 mt-6 flex-grow list-none space-y-3 p-0">
                      {FEATURES.map((f) => (
                        <li key={f} className="flex gap-2.5 text-[14px] text-slate-700">
                          <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 20 }} aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleBuy(item)}
                      className="btn-portal mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {buying === item.id
                        ? "Opening checkout…"
                        : plan?.active || lapsed
                          ? `Renew ${item.name.toLowerCase()}`
                          : loggedIn
                            ? `Choose ${item.name.toLowerCase()}`
                            : `Log in to choose ${item.name.toLowerCase()}`}
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 mb-0 text-center text-[13px] text-slate-500">
              Cards are billed in PKR by PayFast. Prices in other currencies are converted at today's rate.
            </p>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section aria-labelledby="features-heading" className="bg-sea-50/60 py-20 t:py-24">
        <div className="section">
          <div className="mx-auto max-w-[640px] text-center">
            <p className="eyebrow text-sea-600 m-0">Inside the portal</p>
            <h2 id="features-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
              Everything a supervision relationship needs
            </h2>
          </div>
          <ul className="m-0 mt-12 grid list-none gap-5 p-0 ml:grid-cols-2 l:grid-cols-3">
            {PORTAL_FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="card card-hover p-6 text-left">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sea-400 to-sea-700 shadow-glow">
                  <Icon sx={{ fontSize: 22, color: "white" }} aria-hidden="true" />
                </span>
                <h3 className="mt-4 mb-0 text-[17px] font-bold text-navy">{title}</h3>
                <p className="mt-2 mb-0 text-[14px] leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="py-20 t:py-24">
        <div className="section max-w-[820px]">
          <h2 id="faq-heading" className="m-0 text-center text-[30px] t:text-[36px] font-extrabold text-navy">
            Questions about the portal
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="card overflow-hidden text-left">
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 bg-transparent px-6 py-5 text-left text-[16px] font-semibold text-navy"
                    >
                      {f.q}
                      <ExpandMoreIcon
                        aria-hidden="true"
                        sx={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", color: "#265C7E" }}
                      />
                    </button>
                  </h3>
                  <div id={`faq-${i}`} hidden={!open} className="px-6 pb-5 text-[15px] leading-relaxed text-slate-600">
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
