import { useState } from "react";
import { useQuery } from "@apollo/client";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import blogBanner from "Assets/Images/blog_banner.jpg";
import { ALL_BLOGS } from "Utils/Queries/Blog";
import PageTemplate from "Utils/PageTemplate";
import BlogCard, { sortByDate } from "./BlogCard";

export default function Blogs() {
  const { data, loading, error } = useQuery(ALL_BLOGS);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const posts = sortByDate(data?.allBlog).filter(
    (blog) =>
      !query ||
      blog.title?.toLowerCase().includes(query) ||
      blog.description?.toLowerCase().includes(query)
  );

  return (
    <PageTemplate
      title="Blog"
      subtitle="Articles, research reviews and updates on ABA, autism and learning."
      src={blogBanner}
    >
      <div className="relative mx-auto max-w-[560px]">
        <label htmlFor="blog-search" className="sr-only">
          Search articles
        </label>
        <SearchRoundedIcon
          aria-hidden="true"
          fontSize="small"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id="blog-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[15px] shadow-soft focus:border-teal focus:outline-none"
        />
      </div>

      {loading && <p className="mt-10 text-center text-slate-500">Loading articles…</p>}
      {error && (
        <p className="mt-10 text-center text-slate-600">
          Articles couldn't be loaded right now. Please try again later.
        </p>
      )}
      {!loading && !error && posts.length === 0 && (
        <p className="mt-10 text-center text-slate-600">
          {query ? `No articles match "${search.trim()}".` : "No articles yet."}
        </p>
      )}

      <ul className="m-0 mt-10 grid list-none gap-6 p-0 ml:grid-cols-2 l:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post._id} post={post} />
        ))}
      </ul>
    </PageTemplate>
  );
}
