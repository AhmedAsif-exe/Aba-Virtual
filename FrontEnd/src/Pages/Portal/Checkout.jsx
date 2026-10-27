import * as React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import api from "axiosInstance";
import { formatAmount, useProjectContext } from "Utils/Context";
import { initiateCheckoutSession } from "Utils/Queries/Checkout";

// Design-system tokens only (ds-* in tailwind.config.js), like the plans page.

const SELECTION_KEY = "aba.checkoutSelection";
const PLAN_KEYS = ["starter", "professional", "clinic"];
const PERIODS = ["monthly", "yearly"];

const eur = (amount) => formatAmount(amount, "EUR");

/** The pass's new end date in the visitor's own timezone, spelled out. */
const longDate = (value) =>
  new Date(value).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The plan and period from the URL, or — if a login or sign-up lost the
 * query — the copy saved before leaving. Storage can be unavailable (private
 * mode), so every read and write is wrapped.
 */
function useSelection(search) {
  return React.useMemo(() => {
    const params = new URLSearchParams(search);
    let plan = params.get("plan");
    let period = params.get("period");
    if (!PLAN_KEYS.includes(plan) || !PERIODS.includes(period)) {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(SELECTION_KEY) || "null");
        plan = saved?.plan;
        period = saved?.period;
      } catch {
        plan = null;
      }
    }
    if (!PLAN_KEYS.includes(plan) || !PERIODS.includes(period)) return null;
    return { plan, period };
  }, [search]);
}

/**
 * /checkout?plan=…&period=… — what the purchase will do (renewal, change or
 * new pass, days carried over, the new end date) before paying (brief §4.3),
 * then PayFast. The server re-checks everything when payment starts.
 */
export default function Checkout() {
  const { user, loggedIn, loading, pkrPriceOf } = useProjectContext();
  const location = useLocation();
  const selection = useSelection(location.search);
  const [quote, setQuote] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [paying, setPaying] = React.useState(false);

  React.useEffect(() => {
    if (!selection) return;
    try {
      window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    } catch {
      /* not remembered; the URL still carries it */
    }
  }, [selection]);

  React.useEffect(() => {
    if (!selection || !loggedIn) return;
    let alive = true;
    setQuote(null);
    setError(null);
    api
      .get("/supervision/plans/quote", { params: selection })
      .then((res) => alive && setQuote(res.data))
      .catch((err) => alive && setError(err?.response?.data?.message || "Checkout couldn't be prepared. Please try again."));
    return () => {
      alive = false;
    };
  }, [selection, loggedIn]);

  if (loading) return <Shell><p className="m-0 text-ds-slate-500">Loading…</p></Shell>;

  if (!selection) {
    return (
      <Shell>
        <h1 className={h1}>Choose a plan first</h1>
        <p className="mt-4 mb-0 text-[16px] text-ds-slate-500">Pick a plan and a period on the plans page.</p>
        <Link to="/supervision-plans#plans" className={`${primaryButton} mt-8`}>
          See plans &amp; pricing
        </Link>
      </Shell>
    );
  }

  const here = `/checkout?plan=${selection.plan}&period=${selection.period}`;
  if (!loggedIn) return <Navigate to="/login" state={{ from: here }} replace />;

  const pay = async () => {
    setPaying(true);
    try {
      await initiateCheckoutSession([{ id: quote.itemId }], {
        currency: "EUR",
        displayAmount: quote.priceEur,
      });
      try {
        window.sessionStorage.removeItem(SELECTION_KEY);
      } catch {
        /* nothing to clear */
      }
      // The browser is now leaving for PayFast.
    } catch (err) {
      setError(err?.response?.data?.error || "Checkout couldn't be started. Please try again.");
      setPaying(false);
    }
  };

  const pkr = quote ? pkrPriceOf({ id: quote.itemId, price: quote.priceEur }) : null;

  return (
    <Shell>
      <p className="m-0 text-[14px] font-semibold uppercase tracking-wide text-ds-teal-600">Checkout</p>
      <h1 className={`${h1} mt-2`}>
        {quote ? `${quote.planName}, ${quote.days}-day pass` : "Your plan"}
      </h1>

      {error && (
        <div role="alert" className="mt-6 rounded-xl border-l-4 border-ds-orange-500 bg-ds-cream-50 px-5 py-4 text-[16px] leading-relaxed text-ds-ink">
          <p className="m-0">{error}</p>
          {user?.portalRole === "supervisor" && /Archive/.test(error) && (
            <Link to="/portal/supervisees" className="mt-3 inline-block font-semibold text-ds-blue-700">
              Go to your supervisees
            </Link>
          )}
        </div>
      )}

      {!quote && !error && <p className="mt-6 mb-0 text-ds-slate-500">Working out your new end date…</p>}

      {quote && (
        <>
          <dl className="mt-8 grid gap-4 rounded-xl border border-ds-mist-200 bg-white p-6 shadow-md">
            <Row label="Price">
              <span className="text-[25px] font-bold text-ds-navy-900">{eur(quote.priceEur)}</span>
              <span className="text-ds-slate-500"> / {quote.days} days</span>
              {pkr != null && (
                <span className="mt-1 block text-[14px] text-ds-slate-500">
                  Billed in PKR by PayFast: about {formatAmount(pkr, "PKR")} at today's rate
                </span>
              )}
            </Row>
            <Row label="What happens">{whatHappens(quote)}</Row>
            <Row label="Your plan will end on">
              <span className="text-[20px] font-semibold text-ds-navy-900">{longDate(quote.expiresAt)}</span>
            </Row>
          </dl>
          <p className="mt-4 mb-0 text-[14px] leading-relaxed text-ds-slate-500">
            One payment. Not a subscription. Nothing renews automatically.
          </p>
          <div className="mt-8 flex flex-col gap-3 ml:flex-row">
            <button type="button" onClick={pay} disabled={paying} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>
              {paying ? "Opening PayFast…" : `Pay ${eur(quote.priceEur)}`}
            </button>
            <Link to="/supervision-plans#plans" className={outlineButton}>
              Change plan
            </Link>
          </div>
        </>
      )}
      {!quote && error && (
        <Link to="/supervision-plans#plans" className={`${outlineButton} mt-8`}>
          Back to plans
        </Link>
      )}
    </Shell>
  );
}

function whatHappens(quote) {
  if (quote.kind === "renewal") {
    return `Renewal: ${quote.days} days are added to the time you have left.`;
  }
  if (quote.kind === "change") {
    return quote.creditedDays > 0
      ? `Plan change: the time left on your current pass becomes ${quote.creditedDays} ${
          quote.creditedDays === 1 ? "day" : "days"
        } on ${quote.planName}, added on top of the ${quote.days} days you're buying.`
      : `Plan change: you're buying ${quote.days} days on ${quote.planName}.`;
  }
  return `A new ${quote.days}-day pass starting today.`;
}

function Row({ label, children }) {
  return (
    <div className="grid gap-1 min-[600px]:grid-cols-[200px_1fr] min-[600px]:gap-4">
      <dt className="text-[14px] font-semibold text-ds-slate-500">{label}</dt>
      <dd className="m-0 text-[16px] leading-relaxed text-ds-ink">{children}</dd>
    </div>
  );
}

function Shell({ children }) {
  return (
    <main className="min-h-[70vh] bg-ds-cloud-50 font-raleway text-ds-ink lining-nums">
      <div className="mx-auto max-w-[720px] px-4 pt-[130px] pb-20 text-left">{children}</div>
    </main>
  );
}

const h1 = "m-0 text-[25px] t:text-[40px] font-bold leading-[1.2] text-ds-navy-900";
const buttonBase =
  "inline-flex min-h-[48px] items-center justify-center rounded-lg px-5 py-2 text-center text-[18px] font-bold leading-tight lining-nums no-underline transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-teal-600 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-ds-orange-500 text-white shadow-md hover:bg-ds-orange-600 hover:shadow-lg`;
const outlineButton = `${buttonBase} border-2 border-ds-blue-700 bg-white text-ds-blue-700 hover:bg-ds-mist-100`;
