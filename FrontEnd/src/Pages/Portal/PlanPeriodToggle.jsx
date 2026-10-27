import * as React from "react";

const OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * Monthly | Yearly segmented control (brief §8.2), built from design-system
 * tokens: a mist track, the selected option on white with ink text, teal
 * focus ring. Real buttons with aria-pressed; Tab reaches it, Space/Enter
 * pick, and the arrow keys move between the two options.
 */
export default function PlanPeriodToggle({ value, onChange }) {
  const refs = React.useRef({});

  const onKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = OPTIONS.findIndex((o) => o.value === value);
    let next = index;
    if (event.key === "ArrowRight") next = Math.min(OPTIONS.length - 1, index + 1);
    if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = OPTIONS.length - 1;
    onChange(OPTIONS[next].value);
    refs.current[OPTIONS[next].value]?.focus();
  };

  return (
    <div
      role="group"
      aria-label="Billing period"
      onKeyDown={onKeyDown}
      className="inline-flex rounded-full bg-ds-mist-100 p-1"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => (refs.current[option.value] = el)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] rounded-full px-6 text-[16px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-teal-600 focus-visible:ring-offset-2 ${
              selected
                ? "bg-white text-ds-ink shadow-md"
                : "bg-transparent text-ds-slate-500 hover:text-ds-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
