import { duration, List, ListItem, ListItemAvatar } from "@mui/material";
import { CheckCircleOutline } from "@mui/icons-material";
import { useEffect } from "react";
import { gsap } from "gsap";
import expertise from "Assets/Images/expertise.jpg";
const faizaExpertise = [
  "Tracking skill development and behavioral changes for better interventions",
  "Developing IEPs, BIPs & ICPs",
  "Our expertise excels in catering Autistic individuals up to 10 years of age",
  "Coaching therapists, remedial teachers, parents and other caregivers on the principles of Applied Behavior Analysis since onset of COVID-19 across various settings (e.g., schools, therapy institutes and home)",
  "Supervising under level therapists (i.e., ABATs, shadow or remedial therapists) towards better implementation of provided planners",
  "Designing our own resources based on research to cater individual needs",
  "Taking and analyzing data to track progress or regress in skills and behaviors",
];

const PerksSection = () => {
  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#expertise",
        start: "top center",
        once: true,
      },
    });

    for (let idx = 0; idx < faizaExpertise.length; idx++) {
      tl.fromTo(
        `#expertise-${idx}`,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 }
      );
    }
    tl.fromTo(
      "#expertise-img",
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 1.5 },
      "0"
    );
  }, []);
  return (
    <div
      className="l:px-[5%] flex flex-col l:my-[60px] my-[40px]"
      id="expertise"
    >
      <h2
        className="text-[30px] t:text-[40px] font-extrabold text-navy text-center m-0 mb-10"
        id="expertise-heading"
      >
        Expertise
      </h2>
      <div className="flex t:flex-row flex-col items-center gap-6 justify-around max-w-[1440px] mx-auto">
        <img
          src={expertise}
          alt="expertise"
          className="h-full l:w-[25%] ml:w-[40%] w-full mt-10"
        />

        <List className="flex flex-col justify-around l:w-[60%] t:w-[90%] w-full">
          {faizaExpertise.map((item, index) => (
            <ListItem
              key={index}
              className="flex items-start"
              id={`expertise-${index}`}
            >
              <CheckCircleOutline
                sx={{ color: "#28a5a8", marginRight: "10px", marginTop: "3px" }}
              />
              {item}
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  );
};

export default PerksSection;
