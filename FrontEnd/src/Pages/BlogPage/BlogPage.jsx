import { useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { BLOGS } from "Utils/Queries/Blog";
import Comments from "Utils/Comments";
import Seo from "Utils/Seo";
import { formatDate } from "Pages/Blogs/BlogCard";
import PortableBlockRenderer from "./PortableBlockRenderer";

// This post ends with a pointer to the shop (it used to link to a page id
// that doesn't exist on the site).
const SHOP_LINK_POST = "7ae86701-6bec-402b-a89a-b84106983a1a";

const Shell = ({ children }) => (
  <main className="pt-[100px] t:pt-[120px] pb-20">{children}</main>
);

export default function BlogPage() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(BLOGS, { variables: { id } });
  const blog = data?.Blog;

  if (loading) {
    return (
      <Shell>
        <p className="section text-center text-slate-500">Loading article…</p>
      </Shell>
    );
  }

  if (error || !blog) {
    return (
      <Shell>
        <Seo title="Article not found" noindex />
        <div className="section text-center">
          <h1 className="text-[32px] font-extrabold text-navy">
            {error ? "This article couldn't be loaded" : "Article not found"}
          </h1>
          <p className="mt-3 text-slate-600">
            {error
              ? "Please try again in a moment."
              : "It may have been moved or removed."}
          </p>
          <Link to="/blogs" className="btn-dark mt-6">
            Back to the blog
          </Link>
        </div>
      </Shell>
    );
  }

  const author = blog.authors?.[0];
  const image = blog.mainImage?.asset;

  return (
    <Shell>
      <Seo title={blog.title} description={blog.description} image={image?.url} />

      <article>
        <header className="section max-w-[880px] text-left">
          <Link
            to="/blogs"
            className="text-sm font-semibold text-brand no-underline hover:text-navy"
          >
            <span aria-hidden="true">←</span> All articles
          </Link>
          {blog.categories && (
            <p className="mt-6 mb-0">
              <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-[#2b7f7e]">
                {String(blog.categories).trim()}
              </span>
            </p>
          )}
          <h1 className="mt-4 mb-0 text-[30px] leading-tight t:text-[46px] font-extrabold text-navy">
            {blog.title}
          </h1>
          {blog.description && (
            <p className="mt-4 mb-0 text-[18px] t:text-[20px] leading-relaxed text-slate-600">
              {blog.description}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
            {author?.image?.asset?.url && (
              <img
                src={`${author.image.asset.url}?w=80&h=80&fit=crop`}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <span>
              {author?.name && <span className="font-semibold text-slate-700">{author.name}</span>}
              {author?.name && blog.publishedAt && <span aria-hidden="true"> · </span>}
              {blog.publishedAt && <time dateTime={blog.publishedAt}>{formatDate(blog.publishedAt)}</time>}
            </span>
          </div>
        </header>

        {image?.url && (
          <div className="section mt-10 max-w-[1040px]">
            <img
              src={`${image.url}?w=1600&fit=max`}
              alt={image.altText || ""}
              className="aspect-[16/8] w-full rounded-3xl object-cover shadow-lift"
            />
          </div>
        )}

        <div className="section mt-12 max-w-[760px] text-left">
          {blog.sections?.map((section, idx) => (
            <section key={idx} className="mb-10">
              {section.subheading && (
                <h2 className="mt-0 mb-4 text-[24px] t:text-[28px] font-bold text-navy">
                  {section.subheading}
                </h2>
              )}
              <PortableBlockRenderer value={section.contentRaw} />
            </section>
          ))}

          {blog._id === SHOP_LINK_POST && (
            <p className="text-[18px] leading-relaxed text-slate-700">
              Head over to our{" "}
              <Link to="/resources" className="font-semibold text-coral">
                trainings and resources
              </Link>{" "}
              to explore our products.
            </p>
          )}
        </div>
      </article>

      <div className="section mt-6 max-w-[760px] border-t border-slate-200 pt-10 text-left">
        <h2 className="mt-0 mb-6 text-[22px] font-bold text-navy">Comments</h2>
        <Comments blogId={blog._id} />
      </div>
    </Shell>
  );
}
