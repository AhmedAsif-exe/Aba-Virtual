import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import PageTemplate from "Utils/PageTemplate";
import style from "Utils/Card/Card.module.css";
import { useProjectContext, formatAmount } from "Utils/Context";
import DomainProgress from "./Domain/1/DomainProgress";
import BackToGames from "./BackToGames";

const gamesList = [
  {
    id: 1,
    title: "Pick the Purpose",
    description: "Click on the correct function in an array of 3",
    img: "/Games/icons/hammer.png",
  },
  {
    id: 2,
    title: "Function Hunt",
    description: "Identifying all items of a function",
    img: "/Games/icons/screwdriver.png",
  },
  {
    id: 3,
    title: "Find the Feature",
    description: "Click on the correct feature in an array of 3",
    img: "/Games/icons/eye.png",
  },
  {
    id: 4,
    title: "Feature Quest",
    description: " Identifying all items given a single feature",
    img: "/Games/icons/paintbrush.png",
  },
  {
    id: 5,
    title: "Class Match",
    description: "Click on the correct class in an array of 3",
    img: "/Games/icons/blocks.png",
  },
  {
    id: 6,
    title: "Class Catch",
    description: "Identifying all items given a single class",
    img: "/Games/icons/library.png",
  },
  {
    id: 7,
    title: "Sort It Out",
    description: "Sorting items in function, feature and class",
    img: "/Games/icons/box.png",
  },
  {
    id: 8,
    title: "Category Guess",
    description: "Pick the correct category",
    img: "/Games/icons/lightbulb.png",
  },
  {
    id: 9,
    title: "Odd One Out",
    description: "Find the item that doesn't belong",
    img: "/Games/icons/puzzle.png",
  },
  {
    id: 10,
    title: "Random Rotation",
    description: "Answering questions in 90 second",
    img: "/Games/icons/stopwatch.png",
  },
];

// Friendly, high-contrast color per game for chips and charts
const gameColors = {
  1: "#FF7A59", // orange
  2: "#4CAF50", // green
  3: "#3F8EFC", // blue
  4: "#9C27B0", // purple
  5: "#FFB300", // amber
  6: "#00B8D9", // teal
  7: "#EC407A", // pink
  8: "#8BC34A", // light green
  9: "#FF7043", // deep orange
  10: "#6D4C41", // brown
};

// New: Domains configuration for the Games menu
export const domains = [
  {
    id: 1,
    title: "Function, Feature & Class Games",
    description: "10 games focused on function, feature and class",
    img: "/Games/icons/blocks.png",
    available: true,
  },
  {
    id: 2,
    title: "More Domains",
    description: "Coming soon",
    img: "/Games/loading.png",
    available: false,
  },
];

// Lock all games from 3 onward (only games 1 & 2 are free)
const lockedLevels = [3, 4, 5, 6, 7, 8, 9, 10];
//const lockedLevels = [];

const GAMES_BUNDLE_ID = "domain1-bundle-levels-3-10";
const GAMES_BUNDLE_TITLE = "Domain 1 Bundle (Levels 3-10)";
const GAMES_BUNDLE_PRICE = 25.0;
const INDIVIDUAL_GAME_PRICE = 3.5;
const gameItem = (n) => ({
  id: `domain1-game-${n}`,
  price: INDIVIDUAL_GAME_PRICE,
});
const GAMES_BUNDLE_ITEM = { id: GAMES_BUNDLE_ID, price: GAMES_BUNDLE_PRICE };

// Mini chart component to avoid heavy dependencies
function MiniProgressChart({ history = [], max = 20, color = "#57c785" }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const height = 38;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    // Animate on scroll into view
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const bars = history.map((v, i) => {
    const pct = max ? Math.max(0, Math.min(1, v / max)) : 0;
    return { v, i, pct };
  });

  const gap = 6;
  const barW = bars.length
    ? Math.max(6, (width - gap * (bars.length - 1)) / bars.length)
    : 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        display: "flex",
        alignItems: "flex-end",
        gap,
      }}
    >
      {bars.map(({ v, i, pct }) => (
        <div
          key={i}
          style={{
            flex: `0 0 ${barW}px`,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              height: visible ? `${Math.round(pct * 100)}%` : 0,
              background: color,
              borderRadius: 6,
              boxShadow: "0 2px 6px rgba(4,37,57,0.12)",
              transition: "height 300ms cubic-bezier(.2,.8,.2,1)",
            }}
            aria-label={`Session ${i + 1}: ${v}/${max}`}
            title={`Session ${i + 1}: ${v}/${max}`}
          />
        </div>
      ))}
      {!bars.length && (
        <div style={{ color: "#8AA3B5", fontSize: 14 }}>No sessions yet</div>
      )}
    </div>
  );
}

export default function GamesHome() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { cart, dispatch, loggedIn, user, currency, priceOf } =
    useProjectContext();
  const bundleSavings =
    lockedLevels.reduce((sum, n) => sum + priceOf(gameItem(n)), 0) -
    priceOf(GAMES_BUNDLE_ITEM);
  const bundleBenefits = [
    "Unlocks all 8 games (Levels 3-10)",
    "One-time purchase, a year of access",
    bundleSavings > 0
      ? `Best value - save ${formatAmount(bundleSavings, currency)} compared to buying individually`
      : "Best value compared to buying individually",
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLockedGame, setModalLockedGame] = useState(null);

  // View toggle: 'games' or 'progress'
  const [view, setView] = useState("games");
  // Reveal animations when switching views
  const [gamesReveal, setGamesReveal] = useState(true);

  // Keep a local state for selectedDomain but make it route-driven when a domainId param is present
  const [selectedDomain, setSelectedDomain] = useState(null);

  // Handle access denied notification from game access guard
  useEffect(() => {
    if (location.state?.accessDenied) {
      toast.warning("You need to purchase this game to access it!", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      // Clear the state to prevent showing the notification again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    // If route contains a domainId param, reflect it in local state
    const id = params?.domainId ? Number(params?.domainId) : null;
    setSelectedDomain(id);
  }, [params?.domainId]);

  // Ensure progress view is only available for a selected domain
  useEffect(() => {
    if (selectedDomain === null && view === "progress") {
      setView("games");
    }
  }, [selectedDomain, view]);

  // Pull summaries from localStorage and refresh when we return to page
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const bundleInCart = cart.some((item) => item.id === GAMES_BUNDLE_ID);
  // Derive ownership from server-provided paidItems
  const hasBundleOwnership =
    Array.isArray(user?.paidItems) &&
    user.paidItems.some((item) => item?.id === GAMES_BUNDLE_ID);

  // Check if user owns an individual game
  const hasIndividualGame = (gameId) => {
    const gameItemId = `domain1-game-${gameId}`;
    return (
      Array.isArray(user?.paidItems) &&
      user.paidItems.some((item) => item?.id === gameItemId)
    );
  };

  // Check if user has access to a game (either through bundle or individual purchase)
  const hasGameAccess = (gameId) => {
    return hasBundleOwnership || hasIndividualGame(gameId);
  };

  const handlePurchaseClick = (game) => {
    // Require login to purchase games
    if (!loggedIn) {
      navigate("/signup");
      return;
    }
    setModalLockedGame(game);
    setModalOpen(true);
  };

  const handleAddBundleToCart = () => {
    if (!bundleInCart) {
      // Remove all individual games from cart before adding bundle
      gamesList.forEach((game) => {
        const gameItemId = `domain1-game-${game.id}`;
        dispatch({
          type: "REMOVE",
          id: gameItemId,
        });
      });

      // Add bundle to cart
      dispatch({
        type: "ADD",
        item: {
          id: GAMES_BUNDLE_ID,
          title: GAMES_BUNDLE_TITLE,
          price: GAMES_BUNDLE_PRICE,
        },
      });
    }
    setModalOpen(false);
  };

  const handleAddIndividualGameToCart = () => {
    if (!modalLockedGame) return;

    // Prevent adding individual game if bundle is in cart
    if (bundleInCart) {
      toast.info("Bundle is already in cart!");
      setModalOpen(false);
      return;
    }

    const gameItemId = `domain1-game-${modalLockedGame.id}`;
    const gameInCart = cart.some((item) => item.id === gameItemId);

    if (!gameInCart) {
      dispatch({
        type: "ADD",
        item: {
          id: gameItemId,
          title: `${modalLockedGame.title} (Game ${modalLockedGame.id})`,
          price: INDIVIDUAL_GAME_PRICE,
        },
      });
    }
    setModalOpen(false);
  };

  const handleCloseModal = () => setModalOpen(false);
  const handleGoToCart = () => {
    navigate("/cart");
    setModalOpen(false);
  };

  // Re-add ESC key + scroll lock for modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen]);

  return (
    <PageTemplate
      title="Games"
      subtitle="Choose a game to play!"
      src={require("Assets/Images/banner.jpeg")}
    >
      {/* Sign-in prompt banner when viewing games in a domain */}
      {selectedDomain !== null && !loggedIn && (
        <div
          style={{
            width: "100%",
            maxWidth: 700,
            margin: "12px auto 20px",
            padding: "20px 28px",
            background: "linear-gradient(135deg, #fff8f5 0%, #ffece6 100%)",
            border: "2.5px solid #f97544",
            borderRadius: 18,
            boxShadow: "0 6px 20px rgba(249,117,68,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                color: "#265c7e",
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 6,
                fontFamily: "Fredoka One, sans-serif",
              }}
            >
              Sign In to Save Your Scores!
            </div>
            <div
              style={{
                color: "#627d8f",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              Track your progress and compete with others
            </div>
          </div>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "12px 28px",
              background: "#f97544",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(249,117,68,0.3)",
              transition: "transform 150ms ease, box-shadow 150ms ease",
              fontFamily: "Fredoka One, sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 18px rgba(249,117,68,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(249,117,68,0.3)";
            }}
          >
            Sign In
          </button>
        </div>
      )}

      {/* Toggle pill with animated slider - only show when a domain is selected */}
      {selectedDomain !== null && (
        // Keep equal spacing between the toggle, the "All Domains" button and the domain title
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            margin: "12px 0 20px",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "#e6edf2",
              borderRadius: 999,
              padding: 6,
              display: "inline-flex",
              gap: 6,
              minWidth: 260,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 6,
                bottom: 6,
                left: 6,
                width: "calc(50% - 6px)",
                borderRadius: 999,
                background: "#f97544",
                boxShadow: "0 4px 14px rgba(249,117,68,0.35)",
                transform:
                  view === "games" ? "translateX(0%)" : "translateX(100%)",
                transition: "transform 360ms cubic-bezier(.2,.8,.2,1)",
              }}
            />
            <button
              onClick={() => setView("games")}
              style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                border: "none",
                cursor: "pointer",
                padding: "10px 18px",
                borderRadius: 999,
                background: "transparent",
                color: view === "games" ? "#fff" : "#265c7e",
                fontWeight: 800,
                letterSpacing: 0.2,
                transition: "color 200ms",
              }}
            >
              Games
            </button>
            <button
              onClick={() => setView("progress")}
              style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                border: "none",
                cursor: "pointer",
                padding: "10px 18px",
                borderRadius: 999,
                background: "transparent",
                color: view === "progress" ? "#fff" : "#265c7e",
                fontWeight: 800,
                letterSpacing: 0.2,
                transition: "color 200ms",
              }}
            >
              Progress
            </button>
          </div>
        </div>
      )}

      {selectedDomain !== null &&
        view === "progress" &&
        (loggedIn ? (
          <DomainProgress domainId={selectedDomain} />
        ) : (
          <div
            style={{
              width: "100%",
              background: "#f7f9fb",
              padding: "60px 24px",
              borderTop: "1px solid #e6edf2",
              borderBottom: "1px solid #e6edf2",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                maxWidth: 500,
                textAlign: "center",
                padding: "40px 32px",
                background: "linear-gradient(135deg, #fff8f5 0%, #ffece6 100%)",
                border: "2.5px solid #f97544",
                borderRadius: 20,
                boxShadow: "0 8px 24px rgba(249,117,68,0.15)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 280,
                  margin: "0 auto 16px",
                  padding: "12px",
                  background: "transparent",
                }}
              >
                <MiniProgressChart
                  history={[8, 12, 10, 15, 14, 18, 16, 19, 17, 20]}
                  max={20}
                  color="#f97544"
                />
              </div>
              <div
                style={{
                  color: "#265c7e",
                  fontSize: 24,
                  fontWeight: 800,
                  marginBottom: 12,
                  fontFamily: "Fredoka One, sans-serif",
                }}
              >
                Sign In to Track Progress!
              </div>
              <div
                style={{
                  color: "#627d8f",
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  marginBottom: 24,
                }}
              >
                Create an account to save your scores, view detailed progress
                charts, and track your improvement over time.
              </div>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "14px 32px",
                  background: "#f97544",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(249,117,68,0.35)",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  fontFamily: "Fredoka One, sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(249,117,68,0.45)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(249,117,68,0.35)";
                }}
              >
                Sign In Now
              </button>
            </div>
          </div>
        ))}

      {view === "games" && (
        <React.Fragment>
          {/* If no domain selected yet, show the Domain cards */}
          {selectedDomain === null && (
            <React.Fragment>
              {/* Sign-in prompt banner for anonymous users */}
              {!loggedIn && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: 700,
                    margin: "0 auto 20px",
                    padding: "20px 28px",
                    background:
                      "linear-gradient(135deg, #fff8f5 0%, #ffece6 100%)",
                    border: "2.5px solid #f97544",
                    borderRadius: 18,
                    boxShadow: "0 6px 20px rgba(249,117,68,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div
                      style={{
                        color: "#265c7e",
                        fontSize: 18,
                        fontWeight: 800,
                        marginBottom: 6,
                        fontFamily: "Fredoka One, sans-serif",
                      }}
                    >
                      Sign In to Save Your Scores!
                    </div>
                    <div
                      style={{
                        color: "#627d8f",
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      Track your progress and compete with others
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      padding: "12px 28px",
                      background: "#f97544",
                      color: "#fff",
                      border: "none",
                      borderRadius: 999,
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(249,117,68,0.3)",
                      transition: "transform 150ms ease, box-shadow 150ms ease",
                      fontFamily: "Fredoka One, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 18px rgba(249,117,68,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(249,117,68,0.3)";
                    }}
                  >
                    Sign In
                  </button>
                </div>
              )}
              <div
                className="w-full flex flex-wrap justify-center gap-8 py-8"
                style={{
                  background: "#fff",
                  opacity: gamesReveal ? 1 : 0,
                  transform: `translateY(${gamesReveal ? 0 : 8}px)`,
                  transition: "opacity 320ms ease, transform 360ms ease",
                }}
              >
                {domains.map((d) => {
                  const isAvailable = !!d.available;
                  return (
                    <div
                      key={d.id}
                      className={`${style.card} domain-card-custom relative group`}
                      onClick={() =>
                        isAvailable && navigate(`/games/domain/${d.id}`)
                      }
                      style={{
                        width: 300,
                        height: 220,
                        border: isAvailable
                          ? "2.5px solid #f97544"
                          : "2.5px dashed #cdd9e1",
                        borderRadius: 22,
                        boxShadow: isAvailable
                          ? "0 6px 24px rgba(4,37,57,0.08), 0 1.5px 6px rgba(4,37,57,0.07)"
                          : "0 2px 8px rgba(4,37,57,0.06)",
                        padding: 24,
                        background: isAvailable
                          ? "linear-gradient(135deg, #fff 60%, #f9f6f3 100%)"
                          : "linear-gradient(135deg, #f7f9fb 60%, #eff3f6 100%)",
                        margin: 8,
                        opacity: isAvailable ? 1 : 0.7,
                        cursor: isAvailable ? "pointer" : "default",
                        position: "relative",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "120px 1fr",
                        alignItems: "stretch",
                        justifyItems: "center",
                        transition:
                          "transform 200ms ease, box-shadow 200ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable)
                          e.currentTarget.style.transform = "translateY(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable)
                          e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        className={style["icon-title"]}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={d.img}
                          alt={d.title}
                          style={{
                            maxHeight: 72,
                            marginBottom: 6,
                            borderRadius: 12,
                            display: "block",
                          }}
                        />
                        <h3
                          style={{
                            color: isAvailable ? "#f97544" : "#8AA3B5",
                            fontWeight: 800,
                            fontSize: 20,
                            margin: 0,
                            textAlign: "center",
                            fontFamily: "Raleway, sans-serif",
                            letterSpacing: 0.5,
                          }}
                        >
                          {d.title}
                        </h3>
                      </div>
                      <p
                        className={style["card-body"]}
                        style={{
                          paddingTop: 12,
                          color: isAvailable ? "#265c7e" : "#8AA3B5",
                          fontSize: 15,
                          textAlign: "center",
                          fontWeight: 500,
                        }}
                      >
                        {isAvailable ? d.description : "Coming soon"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          )}

          {/* If Domain 1 selected, show its 10 games and a header */}
          {selectedDomain === 1 && (
            <div style={{ width: "100%" }}>
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {/* All Domains button row (styled) placed below the Games/Progress toggle
                     Use matching vertical spacing so the toggle, button and title are evenly spaced */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 0 40px ",
                  }}
                >
                  <BackToGames to="/games" label="All Domains" />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color: "#265c7e",
                      fontWeight: 800,
                      fontSize: 22,
                      textAlign: "center",
                      fontFamily: "Raleway, sans-serif",
                    }}
                  >
                    Function, Feature & Class games
                  </h2>
                </div>
              </div>

              <div
                className="w-full flex flex-wrap justify-center gap-8 py-6"
                style={{
                  background: "#fff",
                  opacity: gamesReveal ? 1 : 0,
                  transform: `translateY(${gamesReveal ? 0 : 8}px)`,
                  transition: "opacity 320ms ease, transform 360ms ease",
                }}
              >
                {gamesList.map((game) => {
                  // Locked now depends on ownership (bundle OR individual game)
                  const isLocked =
                    lockedLevels.includes(game.id) && !hasGameAccess(game.id);
                  return (
                    <div
                      key={game.id}
                      className={`${style.card} game-card-custom relative group`}
                      onClick={() =>
                        !isLocked &&
                        navigate(`/games/domain/1/${game.id}`, {
                          state: {
                            backTo: selectedDomain
                              ? `/games/domain/${selectedDomain}`
                              : "/games",
                          },
                        })
                      }
                      style={{
                        width: 260,
                        height: 340,
                        border: isLocked
                          ? "2.5px solid #bbb"
                          : `2.5px solid ${gameColors[game.id] || "#f97544"}`,
                        borderRadius: 22,
                        boxShadow: isLocked
                          ? "0 2px 8px rgba(180,180,180,0.08)"
                          : "0 6px 24px rgba(4,37,57,0.08), 0 1.5px 6px rgba(4,37,57,0.07)",
                        padding: 20,
                        background: isLocked
                          ? "linear-gradient(135deg, #f7f7f7 60%, #ededed 100%)"
                          : "linear-gradient(135deg, #fff 60%, #f9f6f3 100%)",
                        margin: 8,
                        opacity: isLocked ? 0.7 : 1,
                        pointerEvents: "auto",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition:
                          "transform 200ms ease, box-shadow 200ms ease",
                        cursor: isLocked ? "default" : "pointer",
                        transform: isLocked ? "none" : "translateZ(0)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isLocked)
                          e.currentTarget.style.transform = "translateY(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isLocked)
                          e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Lock indicator at the top */}
                      {isLocked && (
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(255,255,255,0.9)",
                            padding: "4px 8px",
                            borderRadius: 12,
                            backdropFilter: "blur(4px)",
                            zIndex: 3,
                          }}
                        >
                          <img
                            src="/Games/icons/lock.png"
                            alt="Locked"
                            style={{
                              width: 16,
                              height: 16,
                              opacity: 0.8,
                            }}
                          />
                          <span
                            style={{
                              color: "#888",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            Locked
                          </span>
                        </div>
                      )}

                      {/* Main content area */}
                      <div
                        style={{
                          flex: "1 1 auto",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: isLocked ? "10px 0 16px 0" : "32px 0 20px 0",
                          minHeight: isLocked ? "auto" : "240px",
                        }}
                      >
                        <div
                          className={style["icon-title"]}
                          style={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: isLocked ? 12 : 20,
                          }}
                        >
                          <img
                            src={game.img}
                            alt={game.title}
                            style={{
                              maxHeight: isLocked ? 70 : 85,
                              marginBottom: isLocked ? 12 : 16,
                              borderRadius: 12,
                              display: "block",
                              marginLeft: "auto",
                              marginRight: "auto",
                            }}
                          />
                          <h3
                            style={{
                              color: isLocked
                                ? "#bbb"
                                : gameColors[game.id] || "#f97544",
                              fontWeight: 800,
                              fontSize: isLocked ? 18 : 20,
                              margin: 0,
                              textAlign: "center",
                              fontFamily: "Raleway, sans-serif",
                              letterSpacing: 0.5,
                            }}
                          >
                            {game.title}
                          </h3>
                        </div>
                        <p
                          className={style["card-body"]}
                          style={{
                            color: isLocked ? "#bbb" : "#265c7e",
                            fontSize: isLocked ? 13 : 14,
                            textAlign: "center",
                            fontWeight: 500,
                            display: "-webkit-box",
                            WebkitLineClamp: isLocked ? 3 : 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.4,
                            margin: 0,
                            maxWidth: "100%",
                            padding: "0 8px",
                          }}
                        >
                          {game.description}
                        </p>
                      </div>

                      {/* Purchase button at the bottom for locked games */}
                      {isLocked && (
                        <div style={{ marginTop: 16, width: "100%" }}>
                          <button
                            className="w-full py-3 rounded-lg font-semibold transition-all duration-200"
                            style={{
                              fontSize: 14,
                              cursor: "pointer",
                              border: "none",
                              background: "rgba(249, 117, 68, 0.8)",
                              color: "white",
                              opacity: 0.85,
                              transform: "translateY(0)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.opacity = "1";
                              e.target.style.background = "#f97544";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.opacity = "0.85";
                              e.target.style.background =
                                "rgba(249, 117, 68, 0.8)";
                              e.target.style.transform = "translateY(0)";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchaseClick(game);
                            }}
                          >
                            Purchase to Unlock
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </React.Fragment>
      )}

      {/* Purchase Modal (restyled) */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-modal-title"
          aria-describedby="purchase-modal-desc"
          onClick={handleCloseModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,30,44,0.65)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            overflowY: "auto",
            padding: "32px 18px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 600,
              borderRadius: 24,
              position: "relative",
              fontFamily: "Fredoka One, sans-serif", // unified game font
              background:
                "linear-gradient(135deg,#ffffff 0%,#fff8f5 50%,#ffece6 100%)", // soft light gradient
              boxShadow:
                "0 20px 50px -12px rgba(4,37,57,0.32), 0 4px 16px rgba(4,37,57,0.16)",
              padding: "42px 46px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 34,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: "none",
              }}
            />

            <header style={{ textAlign: "center", padding: "0 6px" }}>
              <h3
                id="purchase-modal-title"
                style={{
                  margin: 0,
                  fontSize: 25,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  color: "#f9644d",
                  textShadow: "0 1px 4px rgba(4,37,57,0.10)",
                }}
              >
                Purchase to Unlock
              </h3>
              <p
                id="purchase-modal-desc"
                style={{
                  margin: "10px auto 0",
                  maxWidth: 520,
                  fontSize: 20,
                  lineHeight: 1.4,
                  fontWeight: 600,
                  color: "#265c7e",
                }}
              >
                {modalLockedGame &&
                  `Unlock ${modalLockedGame.title} or get all games with the bundle!`}
              </p>
            </header>

            <section style={{ display: "grid", gap: 12 }}>
              {/* Individual Game Purchase Option */}
              {modalLockedGame &&
                !hasIndividualGame(modalLockedGame.id) &&
                !hasBundleOwnership &&
                !bundleInCart && (
                  <div
                    style={{
                      background: "#fff",
                      border: "2px solid #57c785",
                      borderRadius: 12,
                      padding: "16px 20px",
                      boxShadow: "0 2px 8px rgba(87,199,133,0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#265c7e",
                        }}
                      >
                        Single Game
                      </h4>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: "#57c785",
                        }}
                      >
                        {formatAmount(
                          priceOf(gameItem(modalLockedGame.id)),
                          currency,
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: 16,
                        color: "#265c7e",
                        lineHeight: 1.4,
                      }}
                    >
                      Unlock just {modalLockedGame.title} (Game{" "}
                      {modalLockedGame.id})
                    </p>
                    {!cart.some(
                      (item) =>
                        item.id === `domain1-game-${modalLockedGame.id}`,
                    ) ? (
                      <button
                        onClick={handleAddIndividualGameToCart}
                        style={{
                          width: "100%",
                          padding: "10px 18px",
                          borderRadius: 10,
                          border: "none",
                          background: "#57c785",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(87,199,133,0.25)",
                          transition: "all 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 10px rgba(87,199,133,0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 2px 6px rgba(87,199,133,0.25)";
                        }}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#57c785",
                          textAlign: "center",
                        }}
                      >
                        ✓ Added to cart
                      </div>
                    )}
                  </div>
                )}

              {/* Bundle Purchase Option */}
              {!hasBundleOwnership && (
                <div
                  style={{
                    background: "#fff",
                    border: "2px solid #f97544",
                    borderRadius: 12,
                    padding: "16px 20px",
                    boxShadow: "0 2px 8px rgba(249,117,68,0.15)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 16,
                      background: "#f97544",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                    }}
                  >
                    BEST VALUE
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#265c7e",
                      }}
                    >
                      Full Bundle
                    </h4>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#f97544",
                      }}
                    >
                      {formatAmount(priceOf(GAMES_BUNDLE_ITEM), currency)}
                    </div>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "0 0 12px",
                      padding: 0,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    {bundleBenefits.map((b, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 16,
                          color: "#265c7e",
                          lineHeight: 1.3,
                        }}
                      >
                        <span
                          style={{
                            color: "#f97544",
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          ✓
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  {!bundleInCart ? (
                    <button
                      onClick={handleAddBundleToCart}
                      style={{
                        width: "100%",
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: "none",
                        background: "#f97544",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(249,117,68,0.25)",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 10px rgba(249,117,68,0.35)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 6px rgba(249,117,68,0.25)";
                      }}
                    >
                      Add Bundle to Cart
                    </button>
                  ) : (
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f97544",
                        textAlign: "center",
                      }}
                    >
                      ✓ Bundle added to cart
                    </div>
                  )}
                </div>
              )}

              {/* Already owned messages */}
              {modalLockedGame &&
                hasIndividualGame(modalLockedGame.id) &&
                !hasBundleOwnership && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#57c785",
                      textAlign: "center",
                      padding: "14px",
                      background: "#f0fdf4",
                      borderRadius: 10,
                      border: "2px solid #57c785",
                    }}
                  >
                    ✔ You own this game! Redirecting to play...
                  </div>
                )}
              {hasBundleOwnership && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#57c785",
                    textAlign: "center",
                    padding: "14px",
                    background: "#f0fdf4",
                    borderRadius: 10,
                    border: "2px solid #57c785",
                  }}
                >
                  ✔ Bundle owned! All games unlocked
                </div>
              )}
            </section>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleCloseModal}
                style={{
                  margin: "0 auto",
                  background: "transparent",
                  border: "none",
                  color: "#265c7e",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = 1;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = 0.85;
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
