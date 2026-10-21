import { Link } from "react-router-dom";

export function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Newest first; posts without a date go last. */
export const sortByDate = (posts) =>
  [...(posts || [])].sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

// One blog post teaser, shared by the home page preview and the /blogs list.
export default function BlogCard({ post }) {
  return (
    <li className="card card-hover group flex flex-col overflow-hidden text-left">
      {post.mainImage?.asset?.url && (
        <div className="overflow-hidden">
          <img
            src={`${post.mainImage.asset.url}?w=720&h=420&fit=crop`}
            alt=""
            loading="lazy"
            className="aspect-[12/7] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-grow flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs">
          {post.categories && (
            <span className="rounded-full bg-teal/10 px-2.5 py-0.5 font-semibold text-[#2b7f7e]">
              {String(post.categories).trim()}
            </span>
          )}
          <span className="text-slate-500">{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className="mt-3 mb-0 text-[18px] font-bold leading-snug text-navy line-clamp-2">
          <Link to={`/blogs/${post._id}`} className="text-inherit no-underline hover:text-brand">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 mb-0 flex-grow text-[15px] text-slate-600 line-clamp-3">{post.description}</p>
        <p className="mt-4 mb-0 text-sm text-slate-500">{post.authors?.[0]?.name}</p>
      </div>
    </li>
  );
}
