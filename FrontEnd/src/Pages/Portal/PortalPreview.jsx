// A drawn preview of the supervision portal for public pages. It mirrors the
// real screens (hours, meetings, monthly progress, assignments) but uses
// made-up sample data: no real supervisee or account is ever shown publicly.
const MONTHS = [
  { m: "Jun", pct: 6.1 },
  { m: "Jul", pct: 5.4 },
  { m: "Aug", pct: 7.2 },
  { m: "Sep", pct: 5.8 },
  { m: "Oct", pct: 6.6 },
];
const HOURS = [
  { week: "Week of 6 Oct", hours: "18.5 h", status: "Logged" },
  { week: "Week of 29 Sep", hours: "21.0 h", status: "Logged" },
];

export default function PortalPreview({ className = "" }) {
  return (
    <figure className={`relative m-0 ${className}`} aria-label="Illustrative preview of the supervision portal with sample data">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-sea-500/40 via-aqua/20 to-teal/30 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-navy/80 shadow-glow backdrop-blur-xl" aria-hidden="true">
        {/* Window bar */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="ml-3 text-[11px] font-medium text-white/50">Supervision portal · Sample supervisee</span>
        </div>

        <div className="grid gap-3 p-4 ml:grid-cols-2">
          {/* Progress */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 ml:col-span-2">
            <div className="flex items-baseline justify-between">
              <p className="m-0 text-[12px] font-semibold text-white/70">Monthly progress</p>
              <p className="m-0 text-[11px] text-white/45">Supervision % of hours</p>
            </div>
            <div className="mt-3 flex h-24 items-end gap-3">
              {MONTHS.map(({ m, pct }) => (
                <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-sea-600 to-sea-300"
                    style={{ height: `${(pct / 8) * 100}%` }}
                  />
                  <span className="text-[10px] text-white/50">{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hours */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="m-0 text-[12px] font-semibold text-white/70">Hours worked</p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {HOURS.map((h) => (
                <li key={h.week} className="flex items-center justify-between text-[12px]">
                  <span className="text-white/60">{h.week}</span>
                  <span className="font-semibold text-white">{h.hours}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[62%] rounded-full bg-teal" />
            </div>
            <p className="m-0 mt-1.5 text-[10px] text-white/45">62% of required fieldwork hours</p>
          </div>

          {/* Meetings + assignment */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="m-0 text-[12px] font-semibold text-white/70">Supervision meetings</p>
              <p className="m-0 mt-2 text-[12px] text-white">Individual · 1 h</p>
              <p className="m-0 text-[11px] text-white/50">Notes shared with supervisee</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="m-0 text-[12px] font-semibold text-white/70">Assignment</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-white">Article review</span>
                <span className="rounded-full bg-sea-400/25 px-2 py-0.5 text-[10px] font-semibold text-sea-100">8/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="relative mt-3 text-center text-[12px] text-white/55">
        Illustrative preview with sample data
      </figcaption>
    </figure>
  );
}
