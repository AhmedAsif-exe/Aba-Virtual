// Shared page header (Resources, Blog, Games): the page photo under a navy
// gradient so the title is always readable, then the page content.
const PageTemplate = ({ children, title, subtitle, src }) => {
  return (
    <main className="pt-[100px] t:pt-[120px] pb-16">
      <div className="section">
        <header
          className="relative overflow-hidden rounded-3xl bg-navy bg-cover bg-center px-6 py-14 t:px-12 t:py-24 text-center shadow-lift"
          style={{ backgroundImage: `url(${src})` }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-[#042539]/90 via-[#042539]/70 to-[#265c7e]/50"
          />
          <div className="relative">
            <h1 className="m-0 text-[34px] t:text-[56px] font-extrabold text-white">{title}</h1>
            {subtitle && (
              <p className="mx-auto mt-4 mb-0 max-w-[640px] text-[16px] t:text-[19px] text-white/80">
                {subtitle}
              </p>
            )}
          </div>
        </header>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
};

export default PageTemplate;
