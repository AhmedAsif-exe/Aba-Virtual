import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProjectContext, formatAmount } from "Utils/Context";

export default function ResourceCard({ resource, category, preview = false }) {
  const { user, currency, priceOf } = useProjectContext();
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (user)
      setIsPaid(user.paidItems.some((item) => item?.id === resource.id));
  }, [user, resource.id]);

  // On the home-page preview strip, cards send visitors to the full catalogue;
  // on the catalogue itself they open the resource's own page. These are real
  // links (not onClick navigation) so search engines can discover each page.
  const target = preview ? `/resources` : `/resources/${resource.id}`;

  if (category === "My-Learning" && !isPaid) return null;

  const trainer = resource.authors?.[0]?.name;

  return (
    <article className="card card-hover group flex flex-col overflow-hidden text-left h-full">
      <Link to={target} className="block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <img
          src={resource?.image?.asset?.url}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-[#2b7f7e]">
            {resource.category}
          </span>
          {resource.type && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {resource.type}
            </span>
          )}
          {isPaid && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Owned
            </span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-bold text-navy line-clamp-2 m-0">
          <Link to={target} className="no-underline text-inherit hover:text-brand">
            {resource.title}
          </Link>
        </h3>
        {trainer && <p className="text-xs text-slate-500 mt-1 mb-0">Trainer: {trainer}</p>}
        <p className="text-slate-600 text-sm mt-2 line-clamp-2">{resource.description}</p>

        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <p className="text-xl font-bold text-navy m-0">
            {formatAmount(priceOf(resource), currency)}
          </p>
          <Link to={target} className="btn-dark !py-2 !px-4 !text-sm">
            See more
            <span className="sr-only"> about {resource.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
