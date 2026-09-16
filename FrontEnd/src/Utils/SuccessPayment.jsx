import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock } from "lucide-react";
import { useProjectContext, formatAmount } from "./Context";
import { useEffect, useState } from "react";
import { fetchOrder } from "./Queries/Checkout";
import { checkAuthStatus } from "axiosInstance";

const SuccessPayment = () => {
  const { dispatch } = useProjectContext();
  const [params] = useSearchParams();
  const basketId = params.get("basket");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Entitlements are granted server-side once PayFast's verified callback
    // arrives — this page only reports what already happened. It must never
    // grant anything itself.
    dispatch({ type: "CLEAR" });
    checkAuthStatus();

    if (basketId) fetchOrder(basketId).then(setOrder);
  }, [basketId, dispatch]);

  const stillPending = order && order.status !== "paid";

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          {stillPending ? (
            <Clock className="w-16 h-16 text-amber-500" />
          ) : (
            <CheckCircle className="w-16 h-16 text-green-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {stillPending ? "Payment Processing" : "Payment Successful!"}
        </h1>

        <p className="text-gray-600 mb-6">
          {stillPending
            ? "We're confirming your payment with PayFast. Your purchase will appear shortly."
            : "Thank you for your purchase."}
        </p>

        {order?.items?.length > 0 && (
          <ul className="text-left text-sm text-gray-700 mb-6 divide-y divide-gray-100">
            {order.items.map((item) => (
              <li key={item.id} className="py-2 flex justify-between gap-3">
                <span className="truncate">{item.title}</span>
                <span className="text-gray-500 shrink-0">
                  {item.pricePkr != null
                    ? formatAmount(item.pricePkr, "PKR")
                    : `€${Number(item.priceEur).toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {basketId && (
          <p className="text-xs text-gray-400 mb-4">Order {basketId}</p>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition duration-300"
            to="/resources"
          >
            My Resources
          </Link>
          <Link
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition duration-300"
            to="/"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuccessPayment;
