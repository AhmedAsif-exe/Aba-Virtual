import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from "@mui/material";
import {
  ArrowBack,
  ExpandMore,
  MenuBook,
  Assignment,
  SportsEsports,
  Lock,
} from "@mui/icons-material";
import { useProjectContext, formatAmount } from "Utils/Context";
import { compareAtPrice } from "Utils/staticResources";

const CATEGORY_ICON = {
  "Guide Books": MenuBook,
  Workbooks: Assignment,
  Games: SportsEsports,
};

const CATEGORY_ACCENT = {
  "Guide Books": "#f97544",
  Workbooks: "#45B4B3",
  Games: "#265c7e",
};

const FAQS = [
  {
    q: "What happens right after I pay?",
    a: "You get instant access to everything in the bundle — through the website, by email, or a secure download link, depending on the item.",
  },
  {
    q: "Can I get a refund if it's not right for us?",
    a: "Because these are downloadable digital resources delivered instantly, the bundle is non-refundable once purchased. If a file arrives corrupted or won't open, we'll send a fresh copy right away.",
  },
  {
    q: "How long do I have access?",
    a: "One-time purchase, a full year of access to every guide book, workbook, and game in the bundle — no subscription.",
  },
];

export default function BundleLanding({
  resource,
  isPaid,
  inCart,
  onBuy,
  onOpen,
}) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const { currency, priceOf } = useProjectContext();

  const price = priceOf(resource);
  const compareAt = compareAtPrice(resource, priceOf);
  const savings = compareAt > price ? compareAt - price : 0;
  const savingsPct = savings ? Math.round((savings / compareAt) * 100) : 0;
  const barPct = compareAt ? Math.round((price / compareAt) * 100) : 100;

  const totalItems =
    resource.bundleContents?.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

  const ctaLabel = isPaid
    ? "Download the Bundle"
    : inCart
      ? "Added to cart ✔"
      : `Buy the Bundle for ${formatAmount(price, currency)}`;

  const handleCta = () => {
    if (isPaid) onOpen();
    else if (!inCart) onBuy();
  };

  return (
    <Container maxWidth="lg" component="main" sx={{ pt: { xs: "110px", sm: "130px" }, pb: 10 }}>
      <button
        onClick={() => navigate("/resources")}
        className="flex items-center gap-1 text-[#f9644d] font-semibold hover:underline mb-6"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <ArrowBack fontSize="small" />
        Back to Resources
      </button>

      {/* HERO */}
      <section
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #0b2a3d 0%, #163f57 100%)" }}
      >
        <div className="grid grid-cols-1 t:grid-cols-2 gap-10 p-8 t:p-14 items-center">
          <div>
            <span
              className="inline-block text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(69,180,179,0.18)", color: "#7fd8d3" }}
            >
              For parents &amp; caretakers who want it all
            </span>
            <h1 className="text-3xl ml:text-5xl font-extrabold text-white leading-tight">
              The Complete FFC Teaching System
            </h1>
            <p className="mt-4 text-base t:text-lg text-[#c7d6de] max-w-xl">
              {resource.description}
            </p>

            <div className="flex items-center gap-3 flex-wrap mt-6">
              {!!compareAt && (
                <span className="text-lg text-white/40 line-through">
                  {formatAmount(compareAt, currency)}
                </span>
              )}
              <span className="text-3xl font-extrabold text-[#f97544]">
                {formatAmount(price, currency)}
              </span>
              {!!savings && (
                <span className="text-xs font-bold bg-emerald-400/90 text-emerald-950 px-2.5 py-1 rounded-full">
                  Save {formatAmount(savings, currency)} ({savingsPct}%)
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-7">
              <button
                onClick={handleCta}
                disabled={inCart && !isPaid}
                style={{
                  padding: "14px 28px",
                  borderRadius: 26,
                  border: "none",
                  background: isPaid || !inCart ? "#45B4B3" : "#2f6f6e",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: inCart && !isPaid ? "default" : "pointer",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                }}
              >
                {ctaLabel}
              </button>
              <a
                href="#whats-inside"
                className="flex items-center text-white/80 font-semibold hover:text-white text-sm"
              >
                See what's included ↓
              </a>
            </div>
          </div>

          <div className="relative hidden t:flex justify-center">
            <img
              src={resource.image?.asset?.url}
              alt={resource.title}
              className="w-full max-w-md rounded-xl shadow-2xl"
              style={{ transform: "rotate(-2deg)" }}
            />
            <div
              className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl px-5 py-3 text-center"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="text-[#265c7e] font-extrabold text-lg leading-none">
                {totalItems} resources
              </div>
              <div className="text-xs text-gray-500 mt-1">in one purchase</div>
            </div>
          </div>
        </div>
      </section>

      {/* STAT ROW */}
      <div className="grid grid-cols-3 gap-2 ml:gap-4 mt-8">
        {resource.bundleContents?.map((group) => {
          const Icon = CATEGORY_ICON[group.label] || MenuBook;
          const accent = CATEGORY_ACCENT[group.label] || "#265c7e";
          return (
            <div
              key={group.label}
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-2.5 ml:p-4 t:p-6 text-center min-w-0"
            >
              <Icon sx={{ color: accent, fontSize: { xs: 22, ml: 34 } }} />
              <div className="text-xl ml:text-2xl t:text-3xl font-extrabold text-[#14293A] mt-1">
                {group.items.length}
              </div>
              <div className="text-[11px] ml:text-xs t:text-sm text-gray-500 font-semibold">
                {group.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* WHAT'S INSIDE */}
      <section id="whats-inside" className="mt-14 scroll-mt-28 text-center">
        <h2 className="text-2xl ml:text-3xl font-extrabold text-[#265c7e]">
          Everything that's inside
        </h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          One purchase unlocks the full FFC teaching system — guide books to teach
          with, workbooks to test what's been learned, and games to reinforce it.
        </p>

        <div className="grid grid-cols-1 t:grid-cols-3 gap-5 mt-6">
          {resource.bundleContents?.map((group) => {
            const Icon = CATEGORY_ICON[group.label] || MenuBook;
            const accent = CATEGORY_ACCENT[group.label] || "#265c7e";
            return (
              <div
                key={group.label}
                className="rounded-xl bg-white shadow-md overflow-hidden border border-gray-100"
              >
                <div
                  className="flex items-center gap-2 px-5 py-3"
                  style={{ background: accent }}
                >
                  <Icon sx={{ color: "white", fontSize: 22 }} />
                  <span className="text-white font-bold">
                    {group.label} ({group.items.length})
                  </span>
                </div>
                <ul className="px-5 py-4 space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="text-sm text-gray-700 flex items-start gap-2"
                    >
                      <span style={{ color: accent }} className="mt-0.5">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* VALUE COMPARISON */}
      <section className="mt-14 bg-[#f7fafc] rounded-2xl p-6 t:p-10">
        <h2 className="text-xl ml:text-2xl font-extrabold text-[#265c7e]">
          Buy it once, not five times over
        </h2>
        <div className="mt-6 space-y-4 max-w-2xl">
          <div>
            <div className="flex justify-between text-sm font-semibold text-gray-500 mb-1">
              <span>Buying everything separately</span>
              <span>{formatAmount(compareAt, currency)}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 w-full" />
          </div>
          <div>
            <div className="flex justify-between text-sm font-bold text-[#14293A] mb-1">
              <span>The FFC Bundle</span>
              <span>{formatAmount(price, currency)}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 w-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${barPct}%`, background: "#45B4B3" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14 max-w-2xl">
        <h2 className="text-xl ml:text-2xl font-extrabold text-[#265c7e] mb-4">
          Before you buy
        </h2>
        {FAQS.map((item, i) => (
          <Accordion
            key={item.q}
            expanded={openFaq === i}
            onChange={() => setOpenFaq(openFaq === i ? null : i)}
            disableGutters
            elevation={0}
            sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 1.5, "&:before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <span className="font-semibold text-[#14293A]">{item.q}</span>
            </AccordionSummary>
            <AccordionDetails>
              <span className="text-gray-600 text-sm">{item.a}</span>
            </AccordionDetails>
          </Accordion>
        ))}
      </section>

      {/* FINAL CTA */}
      <section
        className="mt-14 rounded-2xl p-8 t:p-12 text-center"
        style={{ background: "#0b2a3d" }}
      >
        <h2 className="text-2xl ml:text-3xl font-extrabold text-white">
          Get the whole FFC system today
        </h2>
        <p className="text-[#c7d6de] mt-2">
          {totalItems} resources, one purchase, a year of access.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
          <span className="text-lg text-white/40 line-through">
            {formatAmount(compareAt, currency)}
          </span>
          <span className="text-2xl font-extrabold text-[#f97544]">
            {formatAmount(price, currency)}
          </span>
        </div>
        <button
          onClick={handleCta}
          disabled={inCart && !isPaid}
          style={{
            marginTop: 20,
            padding: "14px 32px",
            borderRadius: 26,
            border: "none",
            background: "#45B4B3",
            color: "white",
            fontSize: 18,
            fontWeight: 900,
            cursor: inCart && !isPaid ? "default" : "pointer",
          }}
        >
          {ctaLabel}
        </button>
        {!isPaid && (
          <div className="flex items-center justify-center gap-1.5 text-white/50 text-xs mt-4">
            <Lock sx={{ fontSize: 14 }} />
            Secure checkout · instant access after payment
          </div>
        )}
      </section>
    </Container>
  );
}
