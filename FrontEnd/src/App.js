import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BannerSection from "./Pages/Home/BannerSection";
import AboutMeSection from "./Pages/Home/AboutMeSection";
import TestimonialSection from "Pages/Home/TestimonialSection/TestimonialSection";
// import "react-responsive-3d-carousel/dist/styles.css";
import Layout from "Layout/Layout";
import Blogs from "Pages/Blogs/Blogs";
import BlogPage from "Pages/BlogPage/BlogPage";
import Login from "Pages/Login/Login";
import Account from "Pages/Account/Account";
import About from "Pages/About/About";
import Resources from "Pages/Resources/Resources";
import ResourceDetail from "Pages/Resources/ResourceDetail";
import SuccessPayment from "Utils/SuccessPayment";
import ErrorPayment from "Utils/ErrorPayment";
import VideoPlayer from "Pages/VideoPlayer/VideoPlayer";
import Process from "Pages/Home/Process/Process";
import BlogPreview from "Pages/Home/BlogPreview";
import Contact from "Pages/Contact/Contact";
import ResourcesPreview from "Pages/Home/ResourcesPreview";
import SupervisionShowcase from "Pages/Home/SupervisionShowcase";
import OfferingsSection from "Pages/Home/OfferingsSection";
import AccountBenefits from "Pages/Home/AccountBenefits";
import GamesHome from "Pages/Games/GamesHome";
import PolicyPage from "Pages/Policies/PolicyPage";
import ScrollToTop from "Utils/ScrollToTop";
import Seo from "Utils/Seo";

// Supervision portal (supervisees + supervisor admin views).
import RequirePortalRole from "Pages/Portal/RequirePortalRole";
import SetPassword from "Pages/Portal/SetPassword";
import SuperviseeDashboard from "Pages/Portal/SuperviseeDashboard";
import SupervisorDashboard from "Pages/Portal/SupervisorDashboard";
import SuperviseeDetail from "Pages/Portal/SuperviseeDetail";
import BoardsAdmin from "Pages/Portal/BoardsAdmin";
import SupervisionPlans from "Pages/Portal/SupervisionPlans";
import { SharedRoster, SharedSupervisee } from "Pages/Portal/SharedWithMe";
import OrganisationsAdmin from "Pages/Admin/OrganisationsAdmin";

// Domain-based game imports (Domain 1 moved)
import { ReceptiveFunctionGame } from "Pages/Games/Domain/1/Game1";
import { Game2 } from "Pages/Games/Domain/1/Game2";
import { Game3 } from "Pages/Games/Domain/1/Game3";
import { Game4 } from "Pages/Games/Domain/1/Game4";
import { Game5 } from "Pages/Games/Domain/1/Game5";
import { Game6 } from "Pages/Games/Domain/1/Game6";
import { Game7 } from "Pages/Games/Domain/1/Game7";
import { Game8 } from "Pages/Games/Domain/1/Game8";
import { Game9 } from "Pages/Games/Domain/1/Game9";
import { Game10 } from "Pages/Games/Domain/1/Game10";

function App() {
  return (
    <div className="App">
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Seo />
                  <BannerSection />
                  {/* The supervision portal sits right under the hero: it's
                      the offering the business most wants people to find. */}
                  <SupervisionShowcase />
                  <OfferingsSection />
                  <ResourcesPreview />
                  <AccountBenefits />
                  <AboutMeSection />
                  <TestimonialSection />
                  <Process />
                  <BlogPreview />
                  <Contact />
                  {/* <GamesHome /> */}
                </>
              }
            />
            {/* Add more routes here if needed */}
            <Route
              path="/blogs"
              element={
                <>
                  <Seo
                    title="Blog"
                    description="Articles on Applied Behavior Analysis, autism, parenting and skill-building from the ABA Virtual team."
                  />
                  <Blogs />
                </>
              }
            />
            <Route path="/blogs/:id" element={<BlogPage />} />
            <Route path="/login" element={<><Seo title="Log in" noindex /><Login /></>} />
            <Route path="/signup" element={<><Seo title="Sign up" noindex /><Login /></>} />
            <Route path="/account" element={<><Seo title="My account" noindex /><Account /></>} />
            <Route
              path="/about"
              element={
                <>
                  <Seo
                    title="About"
                    description="Meet the team behind ABA Virtual: Applied Behavior Analysis training, resources and supervision delivered online."
                  />
                  <About />
                </>
              }
            />
            <Route
              path="/games"
              element={
                <>
                  <Seo
                    title="Learning games"
                    description="Interactive ABA learning games that build receptive language, matching and everyday skills."
                  />
                  <GamesHome />
                </>
              }
            />
            {/* Domain listing route */}
            <Route
              path="/games/domain/:domainId"
              element={
                <>
                  <Seo title="Learning games" />
                  <GamesHome />
                </>
              }
            />
            {/* Domain 1 specific game routes (canonical) */}
            <Route
              path="/games/domain/1/1"
              element={<ReceptiveFunctionGame />}
            />
            <Route path="/games/domain/1/2" element={<Game2 />} />
            <Route path="/games/domain/1/3" element={<Game3 />} />
            <Route path="/games/domain/1/4" element={<Game4 />} />
            <Route path="/games/domain/1/5" element={<Game5 />} />
            <Route path="/games/domain/1/6" element={<Game6 />} />
            <Route path="/games/domain/1/7" element={<Game7 />} />
            <Route path="/games/domain/1/8" element={<Game8 />} />
            <Route path="/games/domain/1/9" element={<Game9 />} />
            <Route path="/games/domain/1/10" element={<Game10 />} />
            {/* Removed legacy top-level /games/:id routes to enforce /games/domain/1/:gameId pattern */}
            <Route
              path="/resources"
              element={
                <>
                  <Seo
                    title="Resources"
                    description="ABA guide books, workbooks, video trainings and bundles for parents, caretakers and behavior technicians."
                  />
                  <Resources />
                </>
              }
            />
            <Route path="/resources/:id" element={<ResourceDetail />} />
            <Route path="/resources/:id/watch" element={<><Seo title="Watch" noindex /><VideoPlayer /></>} />
            <Route
              path="/contact"
              element={
                <div className="py-14">
                  <Seo
                    title="Contact"
                    description="Get in touch with ABA Virtual about parent training, trainings, resources or the supervision portal."
                  />
                  <Contact />
                </div>
              }
            />
            {/* Supervision portal. These guards choose which screens to
                offer; the API enforces the same rules independently, so a
                hand-typed URL gets a 403, not someone else's data. */}
            <Route path="/portal/set-password" element={<><Seo title="Set password" noindex /><SetPassword /></>} />
            {/* Internal ABA Virtual screen; /admin checks siteAdmin server-side. */}
            <Route
              path="/admin/organisations"
              element={<><Seo title="Custom plans" noindex /><OrganisationsAdmin /></>}
            />
            {/* Public: the plans page sells to visitors as well as renewing
                supervisors, and handles signed-out buyers itself. */}
            <Route
              path="/supervision-plans"
              element={
                <>
                  <Seo
                    title="Supervision portal & pricing"
                    description="The ABA Virtual supervision portal: supervisees log fieldwork hours, supervisors track meetings, progress and assignments. Monthly or yearly plans for supervisors; supervisees join free."
                  />
                  <SupervisionPlans />
                </>
              }
            />
            {/* View-only access someone shared with this account. Any signed-
                in user may open these; the API decides what, if anything,
                they can see. */}
            <Route path="/portal/shared" element={<SharedRoster />} />
            <Route path="/portal/shared/:supervisorId/:id" element={<SharedSupervisee />} />
            <Route
              path="/portal"
              element={
                <RequirePortalRole role="supervisee">
                  <SuperviseeDashboard />
                </RequirePortalRole>
              }
            />
            <Route
              path="/portal/supervisees"
              element={
                <RequirePortalRole role="supervisor">
                  <SupervisorDashboard />
                </RequirePortalRole>
              }
            />
            <Route
              path="/portal/supervisees/:id"
              element={
                <RequirePortalRole role="supervisor">
                  <SuperviseeDetail />
                </RequirePortalRole>
              }
            />
            <Route
              path="/portal/boards"
              element={
                <RequirePortalRole role="supervisor">
                  <BoardsAdmin />
                </RequirePortalRole>
              }
            />
            <Route path="/success" element={<><Seo title="Payment successful" noindex /><SuccessPayment /></>} />
            <Route path="/error" element={<><Seo title="Payment failed" noindex /><ErrorPayment /></>} />
            <Route
              path="/privacy-policy"
              element={<PolicyPage slug="privacy-policy" />}
            />
            <Route
              path="/refund-policy"
              element={<PolicyPage slug="refund-policy" />}
            />
            <Route
              path="/terms-and-conditions"
              element={<PolicyPage slug="terms-and-conditions" />}
            />
            <Route
              path="/service-delivery-policy"
              element={<PolicyPage slug="service-delivery-policy" />}
            />
            {/* Unknown URLs: a real "not found" page (noindex) instead of an
                empty layout, so search engines don't index broken links. */}
            <Route
              path="*"
              element={
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-16">
                  <Seo title="Page not found" noindex />
                  <h1 className="text-[40px] font-semibold text-[#265c7e] mb-3">
                    Page not found
                  </h1>
                  <p className="text-gray-600 mb-6">
                    The page you're looking for doesn't exist or has moved.
                  </p>
                  <a
                    href="/"
                    className="bg-[#265c7e] text-white font-semibold px-6 py-3 rounded-lg no-underline"
                  >
                    Back to home
                  </a>
                </div>
              }
            />
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App;
