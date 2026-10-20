import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Sets the page's <title>, description, canonical URL and the Open Graph /
// Twitter tags link previews read. The prerender step (scripts/prerender.js)
// snapshots these into each page's static HTML, so search engines and
// WhatsApp/Facebook/LinkedIn previews see them without running JavaScript.
const SITE_URL = "https://abavirtual.net";
const SITE_NAME = "ABA Virtual";
const DEFAULT_DESCRIPTION =
  "Online ABA training, guide books, workbooks and learning games for parents, caretakers and behavior technicians, plus BCBA supervision for RBTs.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo({ title, description, image, noindex = false }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESCRIPTION;
    // Bundled images come through as "/static/media/…"; previews need a full URL.
    const img = image ? new URL(image, SITE_URL).href : DEFAULT_IMAGE;
    const url = SITE_URL + (pathname === "/" ? "/" : pathname.replace(/\/$/, ""));

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:image", img);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
    setCanonical(url);
  }, [title, description, image, noindex, pathname]);

  return null;
}
