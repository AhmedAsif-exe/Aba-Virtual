import { PortableText } from "@portabletext/react";

const Block = {
  normal: ({ children }) => (
    <p className="mt-0 mb-5 text-[17px] t:text-[18px] leading-[1.75] text-slate-700">{children}</p>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 mb-3 text-[22px] font-bold text-navy">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 mb-2 text-[19px] font-bold text-navy">{children}</h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-teal pl-5 text-[18px] italic text-slate-600">
      {children}
    </blockquote>
  ),
};

// Bullets/numbers inside a customList item: the item text without a <p>'s
// bottom margin.
const ListBlock = {
  normal: ({ children }) => <span>{children}</span>,
};

const ALERT_STYLES = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

const components = {
  types: {
    image: ({ value }) => {
      const ref = value.asset._ref
        .replace("image-", "")
        .replace(/-(jpg|png|webp|jpeg)$/, ".$1");
      const url = `https://cdn.sanity.io/images/${process.env.REACT_APP_SANITY_PROJECT_ID}/${process.env.REACT_APP_SANITY_DATASET}/${ref}`;
      return (
        <figure className="my-8">
          <img
            src={`${url}?w=1400&fit=max`}
            alt={value.alt || ""}
            loading="lazy"
            className="mx-auto w-full rounded-2xl shadow-soft"
          />
        </figure>
      );
    },
    customList: ({ value }) => {
      const Tag = value.style === "number" ? "ol" : "ul";
      return (
        <Tag
          className={`mt-0 mb-6 space-y-2 pl-6 text-[17px] t:text-[18px] leading-[1.7] text-slate-700 marker:text-teal ${
            value.style === "number" ? "list-decimal" : "list-disc"
          }`}
        >
          {value.items.map((item, index) => (
            <li key={index}>
              <PortableText value={[item]} components={{ block: ListBlock }} />
            </li>
          ))}
        </Tag>
      );
    },
    alert: ({ value }) => (
      <div
        role="note"
        className={`my-6 rounded-xl border px-5 py-4 text-[16px] ${
          ALERT_STYLES[value.severity] || ALERT_STYLES.info
        }`}
      >
        {value.message}
      </div>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    link: ({ value, children }) => (
      <a
        href={value?.href}
        className="font-medium text-brand underline decoration-teal/50 underline-offset-2 hover:text-navy"
        {...(/^https?:\/\//.test(value?.href || "") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    ),
  },
  block: Block,
};

export default function PortableBlockRenderer({ value }) {
  return <PortableText value={value} components={components} />;
}
