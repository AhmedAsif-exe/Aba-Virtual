import data from "./helper/data";

// Families' words as they wrote them, credited by country only.
export default function TestimonialSection() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="bg-[#f4f8fa] py-20 t:py-24">
      <div className="section">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="eyebrow text-teal m-0">Testimonials</p>
          <h2 id="testimonials-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
            What families say
          </h2>
          <p className="mt-4 mb-0 text-[17px] text-slate-600">
            Parents and caregivers from around the world on working with ABA Virtual.
          </p>
        </div>

        <ul className="m-0 mt-12 list-none columns-1 gap-5 p-0 t:columns-2 l:columns-3">
          {data.map((t, i) => (
            <li key={i} className="card mb-5 break-inside-avoid p-6 text-left">
              <span aria-hidden="true" className="block font-display text-5xl leading-none text-teal/50">
                “
              </span>
              <blockquote className="m-0 mt-1 text-[15px] leading-relaxed text-slate-700">
                {t.message}
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <img src={t.flag} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-soft" />
                <span className="text-sm font-semibold text-slate-600">{t.name}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
