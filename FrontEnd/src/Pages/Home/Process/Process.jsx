import StepperScrollSection from "./StepperScrollSection";

const Process = () => {
  return (
    <div
      className="px-[5%] flex flex-col py-20 t:py-24 max-w-[1440px] mx-auto scroll-mt-28"
      id="process-section"
    >
      <div className="mx-auto mb-10 max-w-[680px] text-center">
        <p className="eyebrow text-teal m-0">Parent training &amp; therapy</p>
        <h2 className="mt-3 mb-0 text-[30px] t:text-[40px] font-extrabold text-navy">
          Our process
        </h2>
        <p className="mt-4 mb-0 text-[17px] text-slate-600">
          How working with us one-to-one begins, from the first consultation to therapy.
        </p>
      </div>
      <div className="flex items-stretch gap-6 justify-around">
        <StepperScrollSection />
      </div>
    </div>
  );
};
export default Process;
