import { useProjectContext, formatAmount } from "Utils/Context";
import { initiateCheckoutSession } from "Utils/Queries/Checkout";
import { IconButton, Badge, Drawer, CircularProgress } from "@mui/material";
import { useState } from "react";
import { ShoppingCart, Delete, Close } from "@mui/icons-material";
import { toast } from "react-toastify";

export default function CartDrawer() {
  const {
    cart,
    dispatch,
    loggedIn,
    currency,
    priceOf,
    pkrPriceOf,
    cartOpen,
    setCartOpen,
  } = useProjectContext();
  const [busy, setBusy] = useState(false);

  const handleOpen = () => setCartOpen(true);
  const handleClose = () => setCartOpen(false);

  // Sum per-line amounts, the same way the server prices the order.
  const displayLines = cart.map(priceOf);
  const totalDisplay = displayLines.includes(null)
    ? null
    : displayLines.reduce((sum, n) => sum + n, 0);

  // PayFast settles in PKR, so that is what the card is actually billed.
  const pkrLines = cart.map(pkrPriceOf);
  const pkrTotal = pkrLines.includes(null)
    ? null
    : pkrLines.reduce((sum, n) => sum + n, 0);

  const handlePayClick = async () => {
    if (!loggedIn) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      await initiateCheckoutSession(cart, {
        currency,
        displayAmount: totalDisplay,
      });
      // On success the browser is navigating to PayFast; nothing follows.
    } catch (err) {
      setBusy(false);
      const message =
        err.response?.data?.error || "Could not start checkout. Please retry.";
      toast.error(message);
    }
  };

  if (cart.length === 0) {
    if (cartOpen) setCartOpen(false);
    return null;
  }

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <IconButton
          aria-label="cart"
          onClick={handleOpen}
          className="bg-white shadow-md hover:shadow-lg rounded-full transition-all duration-300"
        >
          <Badge badgeContent={cart.length} max={10} color="info">
            <ShoppingCart sx={{ color: "#f9644d" }} fontSize="large" />
          </Badge>
        </IconButton>
      </div>

      {/* Cart Sidebar */}
      <Drawer
        open={cartOpen && cart.length > 0}
        onClose={handleClose}
        anchor="right"
        PaperProps={{
          className:
            "w-1/3 min-w-[300px] max-w-full h-full flex flex-col bg-gradient-to-br from-white to-slate-50",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">🛒 Your Cart</h2>
          <IconButton
            size="small"
            aria-label="Close cart"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-gray-200 px-5">
          {cart.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center py-3 text-gray-700"
            >
              <div className="flex-1 mr-2">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {formatAmount(priceOf(item), currency)}
                </p>
              </div>
              <IconButton
                size="small"
                aria-label={`Remove ${item.title}`}
                onClick={() => dispatch({ type: "REMOVE", id: item.id })}
                className="hover:bg-red-100"
              >
                <Delete fontSize="small" sx={{ color: "#d33" }} />
              </IconButton>
            </li>
          ))}
        </ul>

        <div className="px-5 py-4 border-t border-gray-200 bg-white">
          <p className="text-right font-semibold text-gray-700">
            Total:{" "}
            <span className="text-gray-900">
              {formatAmount(totalDisplay, currency)}
            </span>
          </p>

          <div className="mt-3">
            <button
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-[#f9644d] text-white py-2.5 rounded-lg font-medium hover:bg-[#e25640] transition-all disabled:opacity-60"
              onClick={handlePayClick}
            >
              {busy ? (
                <>
                  <CircularProgress size={16} sx={{ color: "white" }} />
                  Redirecting…
                </>
              ) : (
                "Pay with PayFast"
              )}
            </button>

            <button
              className="w-full mt-2 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-all"
              onClick={handleClose}
            >
              Continue Shopping
            </button>

            {pkrTotal !== null && (
              <p className="mt-2 text-[11px] leading-snug text-gray-500 text-center">
                You will be charged{" "}
                <span className="font-semibold text-gray-700">
                  Rs {pkrTotal.toLocaleString()}
                </span>
                . Cards are billed in PKR by PayFast.
              </p>
            )}
            <p className="mt-1 text-[11px] text-gray-400 text-center">
              Secure payment via PayFast — cards, wallets &amp; bank accounts
            </p>
          </div>
        </div>
      </Drawer>
    </>
  );
}
