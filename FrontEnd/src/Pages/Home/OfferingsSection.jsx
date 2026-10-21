import { Link } from "react-router-dom";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";

const OFFERS = [
  {
    Icon: FamilyRestroomIcon,
    title: "Parent training & therapy",
    text: "Remote ABA sessions and coaching for parents and caregivers, starting with an initial consultation.",
    to: "/contact",
    cta: "Get in touch",
    tint: "from-coral/15 to-coral/5 text-coral",
  },
  {
    Icon: OndemandVideoIcon,
    title: "Video trainings",
    text: "Four ABA measurement trainings, from frequency and duration to rate and whole interval recording.",
    to: "/resources/training-bundle",
    cta: "See the trainings",
    tint: "from-teal/20 to-teal/5 text-[#2b7f7e]",
  },
  {
    Icon: MenuBookIcon,
    title: "FFC guide books & workbooks",
    text: "Printable guides and workbooks to teach the features, functions and classes of everyday items.",
    to: "/resources/ffc-bundle",
    cta: "See the FFC books",
    tint: "from-brand/15 to-brand/5 text-brand",
  },
  {
    Icon: SportsEsportsIcon,
    title: "Learning games",
    text: "Ten interactive Domain 1 games to practise skills at home. The first two are free to play.",
    to: "/games",
    cta: "Play the games",
    tint: "from-amber-300/25 to-amber-200/5 text-amber-700",
  },
];

export default function OfferingsSection() {
  return (
    <section aria-labelledby="offer-heading" className="py-20 t:py-24">
      <div className="section">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="eyebrow text-teal m-0">What we offer</p>
          <h2 id="offer-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
            Support for every step of the ABA journey
          </h2>
          <p className="mt-4 mb-0 text-[17px] text-slate-600">
            Learn at your own pace, practise with structured materials, or work
            with us directly, all online.
          </p>
        </div>

        <ul className="m-0 mt-12 grid list-none gap-5 p-0 ml:grid-cols-2 l:grid-cols-4">
          {OFFERS.map(({ Icon, title, text, to, cta, tint }) => (
            <li key={title} className="card card-hover flex flex-col p-6 text-left">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tint}`}>
                <Icon aria-hidden="true" />
              </span>
              <h3 className="mt-5 mb-0 text-[18px] font-bold text-navy">{title}</h3>
              <p className="mt-2 mb-0 flex-grow text-[15px] leading-relaxed text-slate-600">{text}</p>
              <Link to={to} className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-brand no-underline hover:gap-2 transition-all">
                {cta} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
