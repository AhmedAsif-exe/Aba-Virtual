import * as React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { LinkedIn } from "@mui/icons-material";
import InstagramIcon from "@mui/icons-material/Instagram";
import { toast } from "react-toastify";
import api from "axiosInstance";
import logo from "Assets/Images/logo-removebg-preview.png";

const PHONE = "+92 318 0580948"; // Pakistani mobile 0318 0580948
const EMAIL = "contact@abavirtual.net";

const navColumns = [
  {
    title: "Learn",
    links: [
      { href: "/resources", label: "Trainings & resources" },
      { href: "/resources/training-bundle", label: "Training Bundle" },
      { href: "/resources/ffc-bundle", label: "FFC Bundle" },
      { href: "/games", label: "Learning games" },
      { href: "/blogs", label: "Blog" },
    ],
  },
  {
    title: "Supervision",
    links: [
      { href: "/supervision-plans", label: "Supervision portal" },
      { href: "/supervision-plans#plans", label: "Plans & pricing" },
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create an account" },
    ],
  },
  {
    title: "ABA Virtual",
    links: [
      { href: "/about", label: "About" },
      { href: "/#testimonials", label: "Testimonials" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/terms-and-conditions", label: "Terms & Conditions" },
      { href: "/service-delivery-policy", label: "Service Delivery Policy" },
    ],
  },
];

const linkClass = "text-[14px] text-white/70 no-underline transition-colors hover:text-white";

export default function Footer() {
  const [email, setEmail] = useState("");
  const handleSubscribe = async (e) => {
    e?.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.info("Please enter a valid email address.");
      return;
    }

    try {
      const res = await api.post("newsletter/subscribe", { email });

      if (res.data.success) {
        setEmail("");
        toast.success(res.data.message || "You’ve successfully subscribed!");
      } else {
        toast.error(res.data.error || "Subscription failed. Please try again.");
      }
    } catch (err) {
      console.error("Subscription error:", err);

      if (err.response) {
        toast.error(err.response.data.error || "Server error, try again later.");
      } else if (err.request) {
        toast.error("No response from server. Check your connection.");
      } else {
        toast.error("Unexpected error occurred.");
      }
    }
  };

  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-0 h-80 w-80 rounded-full bg-teal/15 blur-3xl" />
      <div className="section relative py-16 t:py-20">
        <div className="grid gap-12 l:grid-cols-[1.1fr_2fr]">
          {/* Brand, contact and newsletter */}
          <div className="text-left">
            <Link to="/" className="inline-flex items-center gap-2 no-underline" aria-label="ABA Virtual home">
              <img src={logo} alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-white object-contain p-0.5" />
              <span className="font-display text-[19px] font-bold text-white">
                aba<span className="text-coral">.virtual</span>
              </span>
            </Link>
            <p className="mt-4 mb-0 max-w-[380px] text-[14px] leading-relaxed text-white/70">
              Remote ABA parent training, learning resources and a supervision
              portal for ABA supervisors and their supervisees.
            </p>
            <address className="mt-5 space-y-1 text-[14px] not-italic text-white/70">
              <div>Media Town, Islamabad 44000, Pakistan</div>
              <div>
                <a href={`tel:${PHONE.replace(/\s/g, "")}`} className={linkClass}>
                  {PHONE}
                </a>
              </div>
              <div>
                <a href={`mailto:${EMAIL}`} className={linkClass}>
                  {EMAIL}
                </a>
              </div>
            </address>

            <form onSubmit={handleSubscribe} className="mt-8 max-w-[420px]">
              <label htmlFor="email-newsletter" className="block text-[15px] font-semibold">
                Get new articles by email
              </label>
              <p className="mt-1 mb-3 text-[13px] text-white/60">
                We'll email you when a new blog post is published.
              </p>
              <div className="flex flex-col gap-2 ml:flex-row">
                <input
                  id="email-newsletter"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="Your email address"
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-[15px] text-white placeholder:text-white/40 focus:border-teal focus:outline-none"
                />
                <button type="submit" className="btn-primary">
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          {/* Links */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 t:grid-cols-4">
            {navColumns.map(({ title, links }) => (
              <div key={title} className="text-left">
                <h2 className="m-0 font-inter text-[13px] font-semibold uppercase tracking-[0.12em] text-teal">
                  {title}
                </h2>
                <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <Link to={href} className={linkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col-reverse items-center justify-between gap-4 border-t border-white/10 pt-6 ml:flex-row">
          <p className="m-0 text-[13px] text-white/55">
            © {new Date().getFullYear()} ABA Virtual. All rights reserved.
          </p>
          <div className="flex gap-2">
            <a
              href="https://www.linkedin.com/in/faiza-faizan-b-s-qasp-s-509b03206"
              aria-label="ABA Virtual founder on LinkedIn"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <LinkedIn fontSize="small" />
            </a>
            <a
              href="https://www.instagram.com/aba.virtual/"
              aria-label="ABA Virtual on Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <InstagramIcon fontSize="small" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
