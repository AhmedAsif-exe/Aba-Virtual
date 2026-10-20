import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useLenis } from "Utils/LenisProvider";
import {
  ArticleOutlined,
  CookieOutlined,
  EmailOutlined,
  GavelOutlined,
  LocalShippingOutlined,
  ReplayOutlined,
  SecurityOutlined,
  ShieldOutlined,
  StorageOutlined,
  TuneOutlined,
  UpdateOutlined,
  VerifiedUserOutlined,
  CheckCircleOutline,
} from "@mui/icons-material";
import { policies } from "./policyData";
import Seo from "Utils/Seo";

const heroIcons = {
  "privacy-policy": ShieldOutlined,
  "refund-policy": ReplayOutlined,
  "terms-and-conditions": GavelOutlined,
  "service-delivery-policy": LocalShippingOutlined,
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const iconForSection = (heading) => {
  const h = heading.toLowerCase();
  if (h.includes("contact")) return EmailOutlined;
  if (h.includes("cookie")) return CookieOutlined;
  if (h.includes("security") || h.includes("confidential")) return SecurityOutlined;
  if (h.includes("third-party") || h.includes("collect")) return StorageOutlined;
  if (h.includes("rights") || h.includes("eligibility")) return VerifiedUserOutlined;
  if (h.includes("update") || h.includes("change")) return UpdateOutlined;
  if (h.includes("payment") || h.includes("refund") || h.includes("digital"))
    return TuneOutlined;
  return ArticleOutlined;
};

const PolicyList = ({ items }) => (
  <ul className="flex flex-col gap-4 mb-3 text-left">
    {items.map((item) => (
      <li key={item} className="flex items-start text-[#265c7e] leading-relaxed">
        <CheckCircleOutline
          sx={{
            color: "#28a5a8",
            marginRight: "10px",
            marginTop: "3px",
            flexShrink: 0,
          }}
        />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const PolicySection = ({ id, heading, paragraphs, list, afterList, showDivider }) => {
  const Icon = iconForSection(heading);

  return (
    <>
      <section id={id} className="scroll-mt-28">
        <div className="flex items-center gap-3 mb-4">
          <Icon sx={{ color: "#EC5923", fontSize: 28 }} />
          <h2 className="text-xl l:text-2xl font-semibold text-[#042539] font-[raleway]">
            {heading}
          </h2>
        </div>
        {paragraphs?.map((p) => (
          <p key={p} className="text-[#265c7e] text-left leading-relaxed mb-3">
            {p}
          </p>
        ))}
        {list && <PolicyList items={list} />}
        {afterList && (
          <p className="text-[#265c7e] text-left leading-relaxed mb-3">{afterList}</p>
        )}
      </section>
      {showDivider && <hr className="border-gray-200 my-8" />}
    </>
  );
};

const PolicyPage = ({ slug }) => {
  const policy = policies[slug];
  const [activeId, setActiveId] = useState("introduction");
  const lenis = useLenis();

  const sectionNav = useMemo(() => {
    if (!policy) return [];
    return [
      { id: "introduction", label: "Introduction", Icon: ArticleOutlined },
      ...policy.sections.map((section) => ({
        id: slugify(section.heading),
        label: section.heading,
        Icon: iconForSection(section.heading),
      })),
      { id: "contact", label: "Contact", Icon: EmailOutlined },
    ];
  }, [policy]);

  useEffect(() => {
    const ids = sectionNav.map(({ id }) => id);
    const offset = 120;

    const updateActive = () => {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 20;

      if (atBottom) {
        setActiveId(ids[ids.length - 1]);
        return;
      }

      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = id;
        }
      }
      setActiveId(current);
    };

    updateActive();

    if (lenis) {
      lenis.on("scroll", updateActive);
      return () => lenis.off("scroll", updateActive);
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, [sectionNav, lenis]);

  if (!policy) return <Navigate to="/" replace />;

  const HeroIcon = heroIcons[slug] || ShieldOutlined;

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Seo title={policy.title} description={policy.intro} />
      <section className="bg-[#042539] text-white text-center px-[25px] l:px-[100px] pb-10 l:pb-14 pt-[100px] t:pt-[120px]">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#265c7e]/40 mb-4">
            <HeroIcon sx={{ fontSize: 32 }} />
          </div>
          <h1 className="text-3xl l:text-5xl font-[raleway] font-semibold mb-4">
            {policy.title}
          </h1>
          <p className="text-white/90 leading-relaxed mb-4 ml:text-lg text-sm">
            {policy.intro}
          </p>
          <p className="text-white/70 text-sm">
            Effective date: {policy.effectiveDate}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-[25px] l:px-[100px] py-8 l:py-10">
        <div className="flex flex-col l:flex-row gap-6 l:items-start">
          <aside className="hidden l:block l:w-64 shrink-0 l:sticky l:top-24">
            <div className="bg-white rounded-xl shadow-md p-4">
              <p className="text-sm font-semibold text-[#042539] mb-3 px-2">
                Quick Navigation
              </p>
              <nav className="flex flex-col gap-1">
                {sectionNav.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollTo(id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      activeId === id
                        ? "bg-[#EC5923] text-white"
                        : "text-[#265c7e] hover:bg-gray-100"
                    }`}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-1 bg-white rounded-xl shadow-md p-6 l:p-10 min-w-0 text-left">
            <PolicySection
              id="introduction"
              heading="Introduction"
              paragraphs={[policy.intro]}
              showDivider
            />

            {policy.sections.map((section, i) => (
              <PolicySection
                key={section.heading}
                id={slugify(section.heading)}
                heading={section.heading}
                paragraphs={section.paragraphs}
                list={section.list}
                afterList={section.afterList}
                showDivider={i < policy.sections.length - 1}
              />
            ))}

            <section id="contact" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <EmailOutlined sx={{ color: "#EC5923", fontSize: 28 }} />
                <h2 className="text-xl l:text-2xl font-semibold text-[#042539] font-[raleway]">
                  Contact
                </h2>
              </div>
              <p className="text-[#265c7e] text-left leading-relaxed">
                For questions regarding this policy, please contact:{" "}
                <a
                  href={`mailto:${policy.contactEmail}`}
                  className="text-[#EC5923] underline hover:text-[#f97544]"
                >
                  {policy.contactEmail}
                </a>
              </p>
              {policy.contactNote && (
                <p className="text-[#265c7e] text-left leading-relaxed mt-3">
                  {policy.contactNote}
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
