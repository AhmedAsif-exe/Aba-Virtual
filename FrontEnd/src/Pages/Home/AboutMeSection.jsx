import { Link } from "react-router-dom";
import faiza from "Assets/Images/faiza-pic.jpeg";

export default function AboutMeSection() {
  return (
    <section id="about-section" aria-labelledby="about-heading" className="py-20 t:py-24">
      <div className="section">
        <div className="card grid items-center gap-10 overflow-hidden p-6 t:grid-cols-[auto_1fr] t:gap-14 t:p-12">
          <div className="relative mx-auto">
            <div aria-hidden="true" className="absolute -inset-3 rounded-full bg-gradient-to-br from-teal/40 to-coral/30 blur-xl" />
            <img
              src={faiza}
              alt="Faiza Faizan, founder of ABA Virtual"
              width={260}
              height={260}
              loading="lazy"
              className="relative h-[220px] w-[220px] t:h-[260px] t:w-[260px] rounded-full object-cover ring-4 ring-white shadow-lift"
            />
          </div>
          <div className="text-left">
            <p className="eyebrow text-teal m-0">Meet the founder</p>
            <h2 id="about-heading" className="mt-3 mb-0 text-[30px] t:text-[38px] font-extrabold text-navy">
              Faiza Faizan
            </h2>
            <p className="mt-4 mb-0 text-[17px] leading-relaxed text-slate-600">
              ABA Virtual was founded by Faiza Faizan, a Qualified Autism
              Services Practitioner–Supervisor (QASP-S) from Pakistan. ABA
              Virtual is built on experience and learning: here, we give
              caregivers and professionals who support neurodivergent learners
              personalised guidance that brings clarity and structure to
              everyday challenges. As a former resource teacher, Faiza has always
              enjoyed creating resources, and we hope you enjoy them too!
            </p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1 font-semibold text-brand no-underline hover:gap-2 transition-all">
              More about ABA Virtual <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
