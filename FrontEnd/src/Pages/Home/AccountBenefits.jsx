import { Link } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useProjectContext } from "Utils/Context";

// What an account actually gives you today (see the handover doc, "Features
// & modules" and "Admin access & user roles").
export const ACCOUNT_BENEFITS = [
  "Buy trainings, FFC books and games, and open them from your account for a year",
  "See everything you've bought in one place",
  "Join the conversation in the comments on our blog",
  "Supervisors: start a supervision portal plan and add supervisees",
  "Sign up in seconds with your email or Google",
];

/** The benefit list on its own, for the sign-up page. */
export function BenefitList({ dark = false }) {
  return (
    <ul className="m-0 list-none space-y-3 p-0 text-left">
      {ACCOUNT_BENEFITS.map((b) => (
        <li key={b} className="flex gap-3">
          <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 22, mt: "1px" }} aria-hidden="true" />
          <span className={dark ? "text-white/85" : "text-slate-700"}>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AccountBenefits() {
  // A sign-up pitch to someone already signed in reads as "your login failed".
  const { loggedIn } = useProjectContext();
  if (loggedIn) return null;

  return (
    <section aria-labelledby="account-heading" className="py-20 t:py-24">
      <div className="section">
        <div className="relative overflow-hidden rounded-[28px] bg-navy px-6 py-12 t:px-14 t:py-16 text-white shadow-lift">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal/30 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
          <div className="relative grid items-center gap-10 l:grid-cols-2">
            <div className="text-left">
              <p className="eyebrow text-teal m-0">Free account</p>
              <h2 id="account-heading" className="mt-3 mb-0 text-[30px] t:text-[38px] font-extrabold">
                What you get when you join
              </h2>
              <p className="mt-4 mb-0 text-[17px] text-white/75">
                Creating an account is free. You only pay for the resources or
                plan you choose.
              </p>
              <div className="mt-8 flex flex-col gap-3 ml:flex-row">
                <Link to="/signup" className="btn-primary">
                  Create your free account
                </Link>
                <Link to="/login" className="btn-on-dark">
                  I already have an account
                </Link>
              </div>
            </div>
            <BenefitList dark />
          </div>
        </div>
      </div>
    </section>
  );
}
