import api from "axiosInstance";

/**
 * Start a PayFast checkout.
 *
 * The server prices the cart itself from the item IDs, so nothing money-related
 * is sent from here — a tampered price in localStorage can't change the charge.
 * PayFast's hosted page needs a real browser form POST, so the returned fields
 * are submitted as a hidden form rather than fetched.
 */
export const initiateCheckoutSession = async (
  cart,
  { currency = "EUR", displayAmount } = {},
) => {
  const { data } = await api.post("/payfast/initiate", {
    itemIds: cart.map((item) => item.id),
    displayCurrency: currency,
    displayAmount,
  });

  if (!data?.postUrl || !data?.fields) {
    throw new Error("Checkout could not be started");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = data.postUrl;
  form.style.display = "none";

  Object.entries(data.fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

/** Fetch a completed order so the success page can show what was bought. */
export async function fetchOrder(basketId) {
  try {
    const { data } = await api.get(`/payfast/order/${basketId}`);
    return data;
  } catch (err) {
    console.error("Could not load order:", err.response?.data || err.message);
    return null;
  }
}
