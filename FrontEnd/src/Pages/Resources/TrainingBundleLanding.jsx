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
  PlayCircle,
  Lock,
  DescriptionOutlined,
  AccessTime,
} from "@mui/icons-material";
import { useProjectContext, formatAmount } from "Utils/Context";
import { compareAtPrice } from "Utils/staticResources";
import rusFlag from "Assets/Images/Flag/rus.png";

// Real per-training detail — richer than the plain label list in
// staticResources.js's bundleContents, since there are only 4 of these and
// each is worth showing on its own. Kept in step with the live Sanity docs.
const TRAININGS = [
  {
    title: "Training #1: Measurement — Frequency",
    blurb:
      "An insight into frequency data — why it matters and how to collect it and plot it on a graph.",
    type: "Long Video",
  },
  {
    title: "Training #2: Duration and Latency",
    blurb:
      "An insight into duration and latency measurement, and how to collect and graph that data.",
    type: "Short Video",
  },
  {
    title: "Training #3: Rate Measurement",
    blurb:
      "An insight into rate measurement — its significance, and how to collect and graph it.",
    type: "Short Video",
  },
  {
    title: "Training #4: Whole Interval",
    blurb:
      "An insight into Whole Interval Recording, its significance, and how to collect and graph it.",
    type: "Short Video",
  },
];

const FAQS = [
  {
    q: "What happens right after I pay?",
    a: "You get instant access to all 4 trainings — watch them straight from the website, on your own schedule.",
  },
  {
    q: "Is a transcript included?",
    a: "Yes — every training in the bundle comes with a downloadable transcript, so you can read along or revisit key points without rewatching.",
  },
  {
    q: "Can I get a refund if it's not right for me?",
    a: "Because these are streamed digital trainings delivered instantly, the bundle is non-refundable once purchased.",
  },
  {
    q: "How long do I have access?",
    a: "One-time purchase, a full year of access to all 4 trainings — no subscription.",
  },
];

export default function TrainingBundleLanding({
  resource,
  isPaid,
  inCart,
  onBuy,
}) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const { currency, priceOf } = useProjectContext();

  const price = priceOf(resource);
  const compareAt = compareAtPrice(resource, priceOf);
  const savings = compareAt > price ? compareAt - price : 0;
  const savingsPct = savings ? Math.round((savings / compareAt) * 100) : 0;
  const barPct = compareAt ? Math.round((price / compareAt) * 100) : 100;

  const ctaLabel = isPaid
    ? "You own this bundle"
    : inCart
      ? "Added to cart ✔"
      : `Buy the Bundle for ${formatAmount(price, currency)}`;

  const handleCta = () => {
    if (!isPaid && !inCart) onBuy();
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
        <div className="grid t:grid-cols-2 gap-10 p-8 t:p-14 items-center">
          <div>
            <span
              className="inline-block text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(69,180,179,0.18)", color: "#7fd8d3" }}
            >
              For trainers, therapists &amp; caregivers
            </span>
            <h1 className="text-3xl ml:text-5xl font-extrabold text-white leading-tight">
              Master ABA Data Collection — All 4 Measurement Trainings
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
                disabled={inCart || isPaid}
                style={{
                  padding: "14px 28px",
                  borderRadius: 26,
                  border: "none",
                  background: isPaid ? "#2f6f6e" : "#45B4B3",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: inCart || isPaid ? "default" : "pointer",
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

            <div className="text-white/50 text-xs mt-4">
              Taught by Niha Khan, QBA
            </div>
          </div>

          {/* Video player mock — this bundle's own visual identity */}
          <div className="relative hidden t:flex justify-center">
            <div
              className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
              style={{ background: "#0d1f2c" }}
            >
              <div className="aspect-video flex items-center justify-center relative">
                <PlayCircle sx={{ fontSize: 84, color: "rgba(255,255,255,0.85)" }} />
              </div>
              <div className="px-4 pb-4">
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full" style={{ background: "#45B4B3" }} />
                </div>
              </div>
            </div>
            <div
              className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl px-5 py-3 text-center"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="text-[#265c7e] font-extrabold text-lg leading-none">
                4 trainings
              </div>
              <div className="text-xs text-gray-500 mt-1">~2 hours total</div>
            </div>
          </div>
        </div>
      </section>

      {/* STAT ROW */}
      <div className="grid grid-cols-3 gap-2 ml:gap-4 mt-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-2.5 ml:p-4 t:p-6 text-center">
          <PlayCircle sx={{ color: "#f97544", fontSize: { xs: 22, ml: 34 } }} />
          <div className="text-xl ml:text-2xl t:text-3xl font-extrabold text-[#14293A] mt-1">4</div>
          <div className="text-[11px] ml:text-xs t:text-sm text-gray-500 font-semibold">Trainings</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-2.5 ml:p-4 t:p-6 text-center">
          <AccessTime sx={{ color: "#45B4B3", fontSize: { xs: 22, ml: 34 } }} />
          <div className="text-xl ml:text-2xl t:text-3xl font-extrabold text-[#14293A] mt-1">~2 hrs</div>
          <div className="text-[11px] ml:text-xs t:text-sm text-gray-500 font-semibold">Total runtime</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-2.5 ml:p-4 t:p-6 text-center">
          <DescriptionOutlined sx={{ color: "#265c7e", fontSize: { xs: 22, ml: 34 } }} />
          <div className="text-xl ml:text-2xl t:text-3xl font-extrabold text-[#14293A] mt-1">4</div>
          <div className="text-[11px] ml:text-xs t:text-sm text-gray-500 font-semibold">Transcripts</div>
        </div>
      </div>

      {/* WHAT'S INSIDE */}
      <section id="whats-inside" className="mt-14 scroll-mt-28">
        <h2 className="text-2xl ml:text-3xl font-extrabold text-[#265c7e]">
          Every training in the bundle
        </h2>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Each one builds a specific ABA measurement skill — from collecting the
          data to plotting it on a graph.
        </p>

        <div className="grid grid-cols-1 t:grid-cols-2 gap-5 mt-6">
          {TRAININGS.map((t, i) => (
            <div
              key={t.title}
              className="rounded-xl bg-white shadow-md overflow-hidden border border-gray-100 flex"
            >
              <div
                className="flex items-center justify-center px-5"
                style={{ background: "#265c7e", minWidth: 64 }}
              >
                <PlayCircle sx={{ color: "white", fontSize: 30 }} />
              </div>
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[#14293A] text-sm">{t.title}</h3>
                </div>
                <p className="text-xs text-gray-600 mt-1.5">{t.blurb}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {t.type}
                  </span>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    ~30 min
                  </span>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Transcript included
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE COMPARISON */}
      <section className="mt-14 bg-[#f7fafc] rounded-2xl p-6 t:p-10">
        <h2 className="text-xl ml:text-2xl font-extrabold text-[#265c7e]">
          Buy it once, not four times over
        </h2>
        <div className="mt-6 space-y-4 max-w-2xl">
          <div>
            <div className="flex justify-between text-sm font-semibold text-gray-500 mb-1">
              <span>Buying all 4 trainings separately</span>
              <span>{formatAmount(compareAt, currency)}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 w-full" />
          </div>
          <div>
            <div className="flex justify-between text-sm font-bold text-[#14293A] mb-1">
              <span>The Training Bundle</span>
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

      {/* TESTIMONIAL */}
      <section className="mt-14 max-w-3xl">
        <div className="border-l-4 border-[#45B4B3] pl-6 py-2">
          <p className="text-lg t:text-xl text-[#14293A] italic leading-relaxed">
            "It has been a wonderful few months of therapy! Thank you for
            guiding me and training me on basic ABA techniques. Could not have
            happened without your help. Your work is very unique and
            efficient."
          </p>
          <div className="flex items-center gap-2 mt-4">
            <img src={rusFlag} alt="" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-sm font-semibold text-gray-500">
              Parent, Russia
            </span>
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
          Start learning the data collection skills that matter
        </h2>
        <p className="text-[#c7d6de] mt-2">
          4 trainings, one purchase, a year of access.
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
          disabled={inCart || isPaid}
          style={{
            marginTop: 20,
            padding: "14px 32px",
            borderRadius: 26,
            border: "none",
            background: "#45B4B3",
            color: "white",
            fontSize: 18,
            fontWeight: 900,
            cursor: inCart || isPaid ? "default" : "pointer",
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
