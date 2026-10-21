import about from "Assets/Images/about-banner.jpg";
import faiza from "Assets/Images/faiza-pic.jpeg";
import location from "Assets/Images/location.jpg";
import WhatIDoSection from "./WhatIDoSection";
import OurProcessSection from "./OurProcessSection";
import PerksSection from "./PerksSection";
import { useEffect } from "react";
import gsap from "gsap";
import Faq from "./Faq";
const meta = [
  {
    heading: "Our vision",
    src: faiza,
    remark: "Focused work, real progress",
    content: (
      <>
        ABA Virtual was founded by Faiza Faizan, a QASP-S who has thrived as a
        coach and remote ABA trainer. Her journey in the field of ABA began in
        2018 as a <i>Registered Behavior Technician (RBT)</i>, and she has since
        worked as a home therapist, a remedial therapist and a clinician. At the
        onset of COVID-19, she trained to coach parents and other caregivers in
        the principles of <i>Applied Behavior Analysis (ABA)</i>. Strongly
        reinforced by the outcomes, this work became our passion. We keep
        building our skills so that caregivers and professionals can overcome
        challenges, grow faster and keep learning. ABA Virtual is designed for
        caregivers, learners and therapists: it promotes independent learning,
        access to remote therapy, and learning through engagement. Our vision
        is to apply ABA across different areas of life, empowering individuals
        to reach their potential and improving their independence and quality
        of life.
      </>
    ),
    reverse: false,
  },
  {
    heading: "Why ABA Virtual?",
    src: location,
    remark: "A structure with flexibility and ease",
    content: (
      <>
        Our vision goes beyond providing therapy. ABA Virtual is dedicated to
        making support easier to reach for learners, caregivers, students and
        therapists, using evidence-based strategies. We aim to be an
        accessible platform for places where therapeutic services are
        unavailable or resources are scarce. All of our services are delivered
        remotely, so you can take part from wherever is convenient for you.
      </>
    ),
    reverse: true,
  },
];

const About = ({ children }) => {
  useEffect(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      "#about-line1",
      {
        text: {
          value: "",
          delimiter: "",
        },
      },
      {
        text: {
          value: "Know us better",
          delimiter: "",
        },
        duration: 1.5,
        ease: "none",
      }
    );

    tl.fromTo(
      "#about-line2",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.5 },
      "<" // Start at same time as previous animation
    );
    tl.fromTo(
      "#about-line3",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.5 },
      "<" // Start at same time as previous animation
    );
    tl.fromTo(
      "#about-image",
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5 },
      "<" // Start at same time as previous animation
    );
  }, []);
  return (
    <>
      <section className="ambient pt-[130px] t:pt-[150px] pb-10">
        <div id="about-section" className="section text-center">
          <h3
            id="about-line1"
            className="eyebrow justify-center text-teal m-0"
          >
            Know us better
          </h3>

          <h1 id="about-line2" className="mt-3 mb-0 text-[34px] t:text-[52px] font-extrabold text-navy">
            About
            <span className="ml-3 text-brand">
              aba<span className="text-coral">.virtual</span>
            </span>
          </h1>

          <p id="about-line3" className="mt-3 mb-0 text-[17px] text-slate-600">
            Making lives a bit simpler and easier at each step
          </p>

          <img
            id="about-image"
            src={about}
            alt="Colourful glass discs"
            className="mt-10 h-[220px] t:h-[340px] w-full rounded-3xl object-cover shadow-lift"
          />
        </div>
      </section>
      <div className="l:px-[100px] px-[25px]">
        {meta.map((m, idx) => (
          <WhatIDoSection {...m} key={idx} idx={idx} />
        ))}
        <PerksSection />
        <OurProcessSection />
      </div>
      <Faq />
    </>
  );
};
export default About;
