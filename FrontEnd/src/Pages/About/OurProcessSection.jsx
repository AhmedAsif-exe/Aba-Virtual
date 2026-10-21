import Card from "../../Utils/Card/Card";
import gsap from "gsap";
import { useEffect } from "react";
import session from "Assets/Icons/session-meeting.png";
import assessment from "Assets/Icons/assesment-phase.png";
import supervisor from "Assets/Icons/supervisor-review.png";
import rapport from "Assets/Icons/rapport-building.png";
import parentCommitments from "Assets/Icons/parent-commitment.png";
import therapyPlanning from "Assets/Icons/planning.png";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
const therapySteps = [
  {
    heading: "Initial Consultation",
    description:
      "The process begins with a holistic review of the client’s journey over the preceding years. This may include, but is not limited to, medical, school, and educational histories. This stage usually does not require the presence of the client and is instead a one-on-one intake process with the caregivers.",
    src: session,
  },
  {
    heading: "Signing Documents",
    description:
      "An exchange of documents takes place, mainly from the consultant to the caregivers. These documents typically include a contract and consent form. The caregivers review each document before signing and returning them to the consultant. The consultant may also request documents from the caregivers depending on the need.",
    src: assessment,
  },
  {
    heading: "Assessment Phase",
    description:
      "The assessment process begins with an indirect interview of the parents or caregivers. The student is assessed across various domains and skill levels, such as visual performance, social communication, academics, and motor imitation. At the same time, all relevant behaviors are observed and evaluated. The virtual assessment can last as little as 5 days or longer.",
    src: supervisor,
  },
  {
    heading: "Parent and Therapist Commitments",
    description:
      "Before starting therapy, parents must sign a consent form based on ABA ethics, a Telehealth contract, and submit any required documents. The therapist is responsible for providing all necessary information in advance and adhering to the consent and code of conduct. This includes clarifying session details such as format, facilitator, and caregiver requirements.",
    src: rapport,
  },
  {
    heading: "Assessment Report and Intervention Plans (IEPs or BIPs)",
    description:
      "A detailed report is provided that outlines the student’s current skill levels and mastery levels. The report includes the assessed domains and the criteria for the skills to be taught. An Individualized Education Plan (IEP) or a Behavior Intervention Plan (BIP) is included, which contains specific goals set with mastery criteria, along with the necessary resources.",
    src: parentCommitments,
  },
  {
    heading: "Therapy Planning",
    description:
      "A mutually convenient time and schedule (for both student and therapist) is arranged on a monthly basis. A consultant or supervisor initiates therapy by developing rapport and ensuring the foundational skills are mastered before working on specific goals. The goals outlined in the intervention plans are implemented with the guidance of the therapist. With consistent and collaborative effort, the instructor at the student’s end and the therapist conduct sessions in a structured and continuous manner.",
    src: therapyPlanning,
  },
];

export default function OurProcessSection() {
  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".our-process-section",
        start: "top top", // scroll starts when container hits top
        end: "+=1000", // how far to scroll (in pixels)
        scrub: 1, // ties timeline to scroll progress
        pin: true, // optional: pins container in place

        delay: 1, // delay before starting the animation
      },
    });

    tl.to(
      "#our-process-header",
      {
        opacity: 1,
        y: 0,
        duration: 1,
      },
      "-=0.5"
    ).to(
      "#our-process-sub-heading",
      {
        opacity: 1,
        y: 0,
        duration: 1,
      },
      "-=0.5"
    );
  }, []);

  return (
    <div className="ml:px-[50px] pt-[20px] my-0 flex flex-col rounded-tl-[35%]">
      <h2
        className="text-[30px] t:text-[40px] font-extrabold text-navy text-center m-0 mb-10"
        id="our-process-header"
      >
        {" "}
        Our Process
      </h2>
      <p
        className="t:text-[20px] text-[16px] font-normal mx-auto mt-[10px] w-[60%] translate-y-[20px] opacity-0 t:leading-[40px] text-center text-black"
        id="our-process-sub-heading"
      >
        The process of delivering therapy virtually is designed in a structured
        however, in a simple manner.
      </p>
      <div className="self-center ml:p-[10px] mt-[40px]" id="carousel">
        <VerticalTimeline lineColor="#265c7e">
          {therapySteps.map((step, stepNumber) => (
            <VerticalTimelineElement
              className="vertical-timeline-element--work"
              contentStyle={{
                background: "#265c7e",
                padding: "5px",
                color: "#fff",
              }}
              contentArrowStyle={{
                borderRight: "7px solid  #265c7e",
              }}
              date={step.heading}
              iconStyle={{ background: "#f97544", color: "#fff" }}
              dateClassName="text-[40px] text-white l:text-[#265c7e] font-[raleway] text-start leading-[130%] m-0 p-0"
              icon={
                <img
                  src={step.src}
                  alt="process icon"
                  className="l:h-[40px] l:w-[40px] h-[25px] w-[25px] m-[7.5px] l:m-[10px]"
                />
              }
            >
              <Card {...step} stepNumber={stepNumber + 1} />
            </VerticalTimelineElement>
          ))}
        </VerticalTimeline>
      </div>
    </div>
  );
}
