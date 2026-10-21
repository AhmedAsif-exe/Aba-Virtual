import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLenis } from "./LenisProvider";

/**
 * React Router keeps the window scroll offset across navigations, so a new page
 * opens wherever the previous one was scrolled to. Reset it on every route change.
 *
 * Lenis drives scrolling from its own RAF loop and rewrites the position each
 * frame, which silently undoes a plain window.scrollTo — so ask Lenis to jump
 * instead, and only fall back to the native call before it has mounted.
 *
 * A link with a hash from another page (e.g. the footer's "/#testimonials")
 * lands on that section instead, once the page has rendered it.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) {
      const t = setTimeout(() => {
        if (lenis) lenis.scrollTo(target, { offset: -110, immediate: true, force: true });
        else target.scrollIntoView();
      }, 50);
      return () => clearTimeout(t);
    }
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname, hash, lenis]);

  return null;
}
