import { Link } from "react-router-dom";
import ResourceCard from "Pages/Resources/ResourceCard";
import { STATIC_RESOURCES } from "Utils/staticResources";

// The two bundles, from the same catalogue the resources page uses, so their
// titles, images and (live, currency-aware) prices never drift from it.
const ResourcesPreview = () => {
  return (
    <section aria-labelledby="resources-heading" className="bg-[#f4f8fa] py-20 t:py-24">
      <div className="section">
        <div className="flex flex-col items-start justify-between gap-6 t:flex-row t:items-end">
          <div className="max-w-[620px] text-left">
            <p className="eyebrow text-teal m-0">Resources</p>
            <h2 id="resources-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
              Start with a bundle
            </h2>
            <p className="mt-4 mb-0 text-[17px] text-slate-600">
              Everything in a series for less than buying each item on its own,
              with a year of access from your account.
            </p>
          </div>
          <Link to="/resources" className="btn-ghost shrink-0">
            Browse all resources
          </Link>
        </div>

        <div className="mt-10 grid gap-6 t:grid-cols-2">
          {STATIC_RESOURCES.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResourcesPreview;
