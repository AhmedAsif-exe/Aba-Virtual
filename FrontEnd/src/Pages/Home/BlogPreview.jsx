import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { ALL_BLOGS } from "Utils/Queries/Blog";
import BlogCard, { sortByDate } from "Pages/Blogs/BlogCard";

// The three newest posts, straight from Sanity, so a new post shows here as
// soon as it's published.
const BlogPreview = () => {
  const { data } = useQuery(ALL_BLOGS);
  const posts = sortByDate(data?.allBlog).slice(0, 3);

  return (
    <section aria-labelledby="blog-heading" className="py-20 t:py-24">
      <div className="section">
        <div className="flex flex-col items-start justify-between gap-6 t:flex-row t:items-end">
          <div className="max-w-[620px] text-left">
            <p className="eyebrow text-teal m-0">From the blog</p>
            <h2 id="blog-heading" className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
              ABA insights and research
            </h2>
            <p className="mt-4 mb-0 text-[17px] text-slate-600">
              Practical articles and research reviews on ABA, autism and teaching
              new skills.
            </p>
          </div>
          <Link to="/blogs" className="btn-ghost shrink-0">
            Read all articles
          </Link>
        </div>

        <ul className="m-0 mt-10 grid list-none gap-6 p-0 t:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post._id} post={post} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default BlogPreview;
