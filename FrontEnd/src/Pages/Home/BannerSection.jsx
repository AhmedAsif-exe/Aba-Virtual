import { Link } from "react-router-dom";
import bannerImage from "Assets/Images/between_worlds.jpg";

const AUDIENCES = ["Parents & caregivers", "Behavior technicians", "ABA supervisors"];

const OFFERS = [
  { label: "Video trainings", to: "/resources" },
  { label: "FFC guide books & workbooks", to: "/resources" },
  { label: "Learning games", to: "/games" },
  { label: "Supervision portal", to: "/supervision-plans" },
];

export default function BannerSection() {
  return (
    <section className="ambient relative overflow-hidden pt-[120px] t:pt-[150px] pb-16 t:pb-24">
      {/* Soft decorative light; purely visual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal/20 blur-3xl"
      />
      <div className="section relative grid items-center gap-12 l:grid-cols-[1.1fr_0.9fr]">
        <div className="fade-up text-left">
          <p className="eyebrow text-coral m-0">
            <span className="h-1.5 w-6 rounded-full bg-coral" aria-hidden="true" />
            Online ABA, wherever you are
          </p>
          <h1 className="mt-4 mb-0 text-[34px] mm:text-[40px] t:text-[54px] l:text-[58px] font-extrabold leading-[1.08] text-navy">
            Remote ABA Parent Training, Supervision &amp;{" "}
            <span className="bg-gradient-to-r from-brand to-teal bg-clip-text text-transparent">
              Learning Resources
            </span>
          </h1>
          <p className="mt-5 max-w-[560px] text-[17px] t:text-[19px] leading-relaxed text-slate-600">
            Practical ABA trainings, guide books and learning games for parents,
            caregivers and behavior technicians, plus a supervision portal that
            keeps fieldwork hours, meetings and progress in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 ml:flex-row ml:flex-wrap">
            <Link to="/resources" className="btn-dark">
              Explore Training
            </Link>
            <Link to="/signup" className="btn-primary">
              Join ABA Virtual
            </Link>
            <a href="#supervision" className="btn-ghost">
              Explore the Supervision Portal
            </a>
          </div>

          <p className="mt-8 mb-0 text-sm text-slate-500">
            For{" "}
            {AUDIENCES.map((a, i) => (
              <span key={a}>
                <strong className="font-semibold text-slate-700">{a}</strong>
                {i < AUDIENCES.length - 2 ? ", " : i === AUDIENCES.length - 2 ? " and " : ""}
              </span>
            ))}
            .
          </p>
        </div>

        <div className="fade-up relative mx-auto w-full max-w-[460px] [animation-delay:150ms]">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-coral/30 via-teal/20 to-brand/30 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-[28px] border border-white/60 shadow-lift">
            <img
              src={bannerImage}
              alt="A child's feet in sandals on the grass beside a pencil case"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          {/* What's on offer, as real links. */}
          <div className="relative -mt-14 mx-4 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-lift backdrop-blur-md">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              On ABA Virtual
            </p>
            <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
              {OFFERS.map((o) => (
                <li key={o.label}>
                  <Link
                    to={o.to}
                    className="flex items-center gap-2 text-[13px] font-medium text-navy no-underline hover:text-brand"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
