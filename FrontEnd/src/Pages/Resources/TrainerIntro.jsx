import { useQuery, gql } from "@apollo/client";
import { sortResources } from "Utils/sortResources";

// The trainer of the first training (in title order) that has one. Used by
// pages that aren't a single Sanity training, like the Training Bundle.
const TRAINERS = gql`
  {
    allResource(where: { category: { eq: "Training" } }) {
      _id
      title
      authors {
        name
        description
        image {
          asset {
            url
          }
        }
      }
    }
  }
`;

export function useFirstTrainer() {
  const { data } = useQuery(TRAINERS);
  const withTrainer = sortResources(data?.allResource || []).find(
    (r) => r.authors?.length
  );
  return withTrainer?.authors[0] || null;
}

/**
 * "About the trainer": the trainer's name, photo and bio exactly as entered
 * in Sanity (resource → Authors). Renders nothing if there is no trainer.
 */
export default function TrainerIntro({ author, className = "" }) {
  if (!author) return null;
  const photo = author.image?.asset?.url;

  return (
    <section
      aria-labelledby="trainer-heading"
      className={`ambient rounded-3xl border border-slate-200/80 shadow-soft px-6 py-10 t:px-12 t:py-14 ${className}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col t:flex-row items-center gap-10 t:gap-14">
        <div className="flex flex-col items-center shrink-0">
          {photo && (
            <img
              src={`${photo}?w=480&h=480&fit=crop`}
              alt={author.name}
              width={224}
              height={224}
              loading="lazy"
              className="w-48 h-48 t:w-56 t:h-56 rounded-full object-cover shadow-lift ring-4 ring-white"
            />
          )}
          <p className="mt-4 text-lg font-bold text-brand font-display">{author.name}</p>
          <p className="text-sm text-slate-500">Trainer</p>
        </div>

        <div className="flex-1 text-center t:text-left">
          <p className="eyebrow text-teal">Meet your trainer</p>
          <h2 id="trainer-heading" className="mt-2 text-3xl t:text-4xl font-bold text-navy">
            About the Trainer
          </h2>
          <div className="mt-5 space-y-4 text-slate-700 leading-relaxed">
            {author.description?.map((d, i) => (
              <p key={i} className="m-0">
                {d.trim()}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
