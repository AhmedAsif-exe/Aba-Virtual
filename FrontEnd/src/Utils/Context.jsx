// src/context/ProjectContext.js
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useReducer,
} from "react";
import api, { checkAuthStatus } from "axiosInstance";

const ProjectContext = createContext();
const reducer = (state, action) => {
  let newState;
  switch (action.type) {
    case "ADD":
      if (state.some((i) => i.id === action.item.id)) {
        newState = state; // no change
      } else {
        newState = [...state, action.item];
      }
      break;
    case "REMOVE":
      newState = state.filter((i) => i.id !== action.id);
      break;
    case "CLEAR":
      newState = [];
      break;
    default:
      return state;
  }

  localStorage.setItem("cart", JSON.stringify(newState));
  return newState;
};
const getInitialCart = () => {
  const localData = localStorage.getItem("cart");
  return localData ? JSON.parse(localData) : [];
};

const SYMBOLS = { EUR: "€", USD: "$", PKR: "Rs " };

// EUR/USD amounts are display-only (PayFast always charges PKR), kept to the
// cent so a converted price isn't shown less precisely than it is.
const round2 = (n) => Math.round(n * 100) / 100;

// EUR-priced items become whole rupees rounded to the nearest 50 — the same
// rule the backend charges with (BackEnd/Services/pricing.js).
const pkrFromEur = (eur, eurToPkr) => Math.round((eur * eurToPkr) / 50) * 50;

/**
 * An item's price in `currency`. The backend's `fixedEur` (whole euros)
 * overrides `item.price`; PKR viewers get `fixedPkr` where listed, otherwise
 * the euro price converted. `rate` is EUR->currency.
 */
export function itemPrice(item, { currency, rate, fixedPkr, fixedEur }) {
  const eur = fixedEur?.[item.id] ?? (Number(item.price) || 0);
  if (currency === "PKR") return fixedPkr?.[item.id] ?? pkrFromEur(eur, rate);
  return round2(eur * (currency === "EUR" ? 1 : rate));
}

/** Format an amount that is already in `currency` (null = not loaded yet). */
export function formatAmount(amount, currency = "EUR") {
  if (amount == null) return "…";
  const symbol = SYMBOLS[currency] || `${currency} `;
  const n = Number(amount) || 0;
  if (currency === "PKR") return `${symbol}${Math.round(n).toLocaleString("en-US")}`;
  // Standard currency style: €30, €54.73 — never €30.0 or €54.7.
  const value = round2(n);
  const whole = Number.isInteger(value);
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, dispatch] = useReducer(reducer, [], getInitialCart);
  const [currency, setCurrency] = useState("EUR");
  const [rate, setRate] = useState(1);
  const [pkrRate, setPkrRate] = useState(null);
  const [fixedPkr, setFixedPkr] = useState({});
  const [fixedEur, setFixedEur] = useState({});
  const [pricesReady, setPricesReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let isMounted = true; // ✅ prevent state update on unmounted component

    checkAuthStatus()
      .then((res) => {
        if (isMounted) {
          setUser(res);
          setLoggedIn(!!res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoggedIn(false);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      let countryHint = "";
      try {
        // Browser's public IP country (not the VPS) — fixes PK users hitting NL-hosted API
        const geo = await fetch("https://api.country.is/", {
          signal: AbortSignal.timeout(2500),
        });
        if (geo.ok) {
          const data = await geo.json();
          countryHint = data.country || "";
        }
      } catch (_) {
        /* ignore — backend may still resolve from request IP */
      }
      try {
        const res = await api.get("/paypal/currency", {
          params: countryHint ? { country: countryHint } : undefined,
        });
        if (!isMounted) return;
        const data = res.data || {};
        const ok = Number(data.rate) > 0 && Number(data.pkrRate) > 0;
        // Without both rates nothing can be converted, so fall back to EUR.
        setCurrency(ok ? data.currency : "EUR");
        setRate(ok ? Number(data.rate) : 1);
        setPkrRate(ok ? Number(data.pkrRate) : null);
        setFixedPkr(ok ? data.fixedPkr || {} : {});
        setFixedEur(ok ? data.fixedEur || {} : {});
      } catch {
        if (!isMounted) return;
        setCurrency("EUR");
        setRate(1);
      }
      if (isMounted) setPricesReady(true);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    const res = await checkAuthStatus();
    setUser(res);
    setLoggedIn(!!res);
    return res;
  };

  const fx = { currency, rate, fixedPkr, fixedEur };
  // null until the visitor's currency is known, so no stale price flashes.
  const priceOf = (item) => (pricesReady ? itemPrice(item, fx) : null);
  // PayFast always bills in PKR, whatever currency is on screen. Only
  // Pakistani visitors get the fixed PKR list; everyone else pays the euro
  // price converted (same as BackEnd/Services/pricing.js).
  const pkrPriceOf = (item) =>
    pkrRate
      ? itemPrice(item, {
          ...fx,
          currency: "PKR",
          rate: pkrRate,
          fixedPkr: currency === "PKR" ? fixedPkr : {},
        })
      : null;

  return (
    <ProjectContext.Provider
      value={{
        user,
        loggedIn,
        loading,
        cart,
        dispatch,
        currency,
        priceOf,
        pkrPriceOf,
        refreshUser,
        cartOpen,
        setCartOpen,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  return useContext(ProjectContext);
}
