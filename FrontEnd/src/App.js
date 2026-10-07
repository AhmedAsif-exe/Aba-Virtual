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
import Expertise from "Pages/About/PerksSection";
import GamesHome from "Pages/Games/GamesHome";
import PolicyPage from "Pages/Policies/PolicyPage";
import ScrollToTop from "Utils/ScrollToTop";

// Supervision portal (supervisees + supervisor admin views).
import RequirePortalRole from "Pages/Portal/RequirePortalRole";
import SetPassword from "Pages/Portal/SetPassword";
import SuperviseeDashboard from "Pages/Portal/SuperviseeDashboard";
import SupervisorDashboard from "Pages/Portal/SupervisorDashboard";
import SuperviseeDetail from "Pages/Portal/SuperviseeDetail";
import BoardsAdmin from "Pages/Portal/BoardsAdmin";
import SupervisionPlans from "Pages/Portal/SupervisionPlans";

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
                  <BannerSection />
                  <Process />
                  <AboutMeSection />
                  <TestimonialSection />
                  <BlogPreview />
                  <div className="t:px-0 px-[25px]">
                    <Expertise />
                  </div>
                  <ResourcesPreview />
                  <Contact />
                  {/* <GamesHome /> */}
                </>
              }
            />
            {/* Add more routes here if needed */}
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:id" element={<BlogPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/about" element={<About />} />
            <Route path="/games" element={<GamesHome />} />
            {/* Domain listing route */}
            <Route path="/games/domain/:domainId" element={<GamesHome />} />
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
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:id" element={<ResourceDetail />} />
            <Route path="/resources/:id/watch" element={<VideoPlayer />} />
            <Route
              path="/contact"
              element={
                <div className="py-14">
                  <Contact />
                </div>
              }
            />
            {/* Supervision portal. These guards choose which screens to
                offer; the API enforces the same rules independently, so a
                hand-typed URL gets a 403, not someone else's data. */}
            <Route path="/portal/set-password" element={<SetPassword />} />
            {/* Public: the plans page sells to visitors as well as renewing
                supervisors, and handles signed-out buyers itself. */}
            <Route path="/supervision-plans" element={<SupervisionPlans />} />
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
            <Route path="/success" element={<SuccessPayment />} />
            <Route path="/error" element={<ErrorPayment />} />
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
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App;
