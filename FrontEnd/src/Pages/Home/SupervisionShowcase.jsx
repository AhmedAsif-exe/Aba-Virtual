import { Link } from "react-router-dom";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import VerifiedIcon from "@mui/icons-material/Verified";
import ShareIcon from "@mui/icons-material/Share";
import { useProjectContext, formatAmount } from "Utils/Context";
import PortalPreview from "Pages/Portal/PortalPreview";

// Every feature here exists in the portal today (see BackEnd/Routes/supervision.js).
export const PORTAL_FEATURES = [
  {
    Icon: GroupsIcon,
    title: "A login for every supervisee",
    text: "Add supervisees and they get a welcome email with their login. They set their own password on first sign-in.",
  },
  {
    Icon: AccessTimeIcon,
    title: "Weekly fieldwork hours",
    text: "Supervisees log their hours each week; you can review and edit every entry.",
  },
  {
    Icon: InsightsIcon,
    title: "Meetings & monthly progress",
    text: "Record supervision meetings with notes and see monthly progress graphs and supervision percentage.",
  },
  {
    Icon: AssignmentTurnedInIcon,
    title: "Assignments board",
    text: "Set assignments, attach files such as articles or worksheets, and rate the work out of 10.",
  },
  {
    Icon: VerifiedIcon,
    title: "Built around your board",
    text: "Track requirements for BACB, IBAO or QABA, or set up your own certifying board.",
  },
  {
    Icon: ShareIcon,
    title: "View-only sharing & payments",
    text: "Share read-only access with another supervisor, and note which supervision payments are paid.",
  },
];

const STEPS = [
  { n: "1", title: "Choose a plan", text: "Supervisors pick monthly or yearly access." },
  { n: "2", title: "Add your supervisees", text: "Each one gets their own login by email, free of charge." },
  { n: "3", title: "Track everything in one place", text: "Hours, meetings, progress and assignments, always up to date." },
];

export default function SupervisionShowcase() {
  const { user, currency, priceOf } = useProjectContext();
  const monthly = priceOf({ id: "supervision-monthly", price: 30 });
  const role = user?.portalRole;

  return (
    <section
      id="supervision"
      aria-labelledby="supervision-heading"
      className="relative overflow-hidden bg-[#12082e] py-20 t:py-28 text-white"
    >
      {/* Layered ambient light and a faint grid, for depth. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[560px] w-[560px] rounded-full bg-violet-600/40 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[480px] w-[480px] rounded-full bg-teal/25 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="section relative">
        <div className="grid items-center gap-14 l:grid-cols-[1fr_1fr]">
          <div className="text-left">
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-[13px] font-semibold text-violet-100">
              <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_12px_3px_rgba(196,181,253,0.8)]" aria-hidden="true" />
              ABA Virtual Supervision Portal
            </p>
            <h2
              id="supervision-heading"
              className="mt-5 mb-0 text-[32px] t:text-[46px] font-extrabold leading-[1.1]"
            >
              Fieldwork supervision,{" "}
              <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-teal bg-clip-text text-transparent">
                organised in one place
              </span>
            </h2>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-violet-100/80">
              For ABA supervisors and the trainees they supervise. Your
              supervisees log their hours; you keep meetings, progress and
              assignments together, ready for their certification board.
            </p>

            <div className="mt-8 flex flex-col gap-3 ml:flex-row ml:flex-wrap">
              {role === "supervisor" ? (
                <Link to="/portal/supervisees" className="btn-violet">
                  Open your portal
                </Link>
              ) : role === "supervisee" ? (
                <Link to="/portal" className="btn-violet">
                  Open my supervision
                </Link>
              ) : (
                <>
                  <Link to="/supervision-plans" className="btn-violet">
                    Explore Supervision
                  </Link>
                  {!user && (
                    <Link
                      to="/signup"
                      state={{ from: "/supervision-plans" }}
                      className="btn bg-white text-[#2e1065] shadow-lift hover:-translate-y-0.5"
                    >
                      Create Your Account
                    </Link>
                  )}
                </>
              )}
              {!user && (
                <Link to="/login" state={{ from: "/supervision-plans" }} className="btn-on-dark">
                  Log In
                </Link>
              )}
            </div>
            <p className="mt-5 mb-0 text-sm text-violet-100/60">
              {monthly != null ? `From ${formatAmount(monthly, currency)} a month for supervisors` : "Monthly or yearly plans for supervisors"}
              {" · "}supervisees join free.
            </p>
          </div>

          <PortalPreview className="mx-auto w-full max-w-[540px]" />
        </div>

        {/* Features */}
        <ul className="m-0 mt-20 grid list-none gap-4 p-0 ml:grid-cols-2 l:grid-cols-3">
          {PORTAL_FEATURES.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-violet-300/40 hover:bg-white/[0.07]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 shadow-glow">
                <Icon sx={{ fontSize: 22, color: "white" }} aria-hidden="true" />
              </span>
              <h3 className="mt-4 mb-0 text-[17px] font-bold text-white">{title}</h3>
              <p className="mt-2 mb-0 text-[14px] leading-relaxed text-violet-100/70">{text}</p>
            </li>
          ))}
        </ul>

        {/* How it works */}
        <ol className="m-0 mt-14 grid list-none gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-500/10 to-teal/10 p-6 t:grid-cols-3 t:p-8">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#2e1065]">
                {s.n}
              </span>
              <div>
                <p className="m-0 font-semibold text-white">{s.title}</p>
                <p className="m-0 mt-1 text-[14px] text-violet-100/70">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
