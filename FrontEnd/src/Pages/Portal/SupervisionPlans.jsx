import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import { toast } from "react-toastify";

import { formatAmount, useProjectContext } from "Utils/Context";
import { initiateCheckoutSession } from "Utils/Queries/Checkout";
import { PageHeading, PortalContainer } from "./PortalShared";
import { formatDate } from "./portalApi";

// Mirrors BackEnd/Services/supervisionPlans.js. The server prices checkout
// from the id alone; `price` (EUR) here is only for display.
const PLANS = [
  { id: "supervision-monthly", name: "Monthly", price: 30, period: "month", days: 30 },
  { id: "supervision-yearly", name: "Yearly", price: 350, period: "year", days: 365 },
];

const FEATURES = [
  "Unlimited supervisees, each with their own login",
  "Weekly fieldwork hours and supervision meeting logs",
  "Monthly progress graphs and supervision %",
  "Optional assignments board",
  "BACB, IBAO, QABA and your own certifying boards",
];

/**
 * The supervision portal's plans: buy, renew, or see that you don't need to.
 *
 * Also where an expired supervisor lands (RequirePortalRole sends them here),
 * so the page speaks to that case first. Paying is a one-off PayFast checkout
 * that adds 30 or 365 days; renewing early stacks on top.
 */
export default function SupervisionPlans() {
  const { user, loggedIn, currency, priceOf } = useProjectContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = React.useState(null);

  const plan = user?.supervisionPlan;
  const isSupervisee = user?.portalRole === "supervisee";
  const lapsed = user?.portalRole === "supervisor" && plan && !plan.active;

  const handleBuy = async (item) => {
    if (!loggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setBuying(item.id);
    try {
      await initiateCheckoutSession([item], {
        currency,
        displayAmount: priceOf(item),
      });
      // The browser is now leaving for PayFast; nothing else to do here.
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not start checkout");
      setBuying(null);
    }
  };

  // Twelve months on Monthly against one Yearly, in the visitor's currency.
  const monthly = priceOf(PLANS[0]);
  const yearly = priceOf(PLANS[1]);
  const saving = monthly != null && yearly != null ? monthly * 12 - yearly : null;

  return (
    <PortalContainer>
      <PageHeading
        title="Supervision Portal"
        subtitle="Track your supervisees' fieldwork hours, supervision and progress in one place."
      />

      {plan?.complimentary && (
        <Alert
          severity="success"
          action={
            <Button color="inherit" onClick={() => navigate("/portal/supervisees")}>
              Open portal
            </Button>
          }
        >
          Your account has free access to the Supervision Portal. No plan needed.
        </Alert>
      )}

      {lapsed && (
        <Alert severity="warning">
          Your plan ended{plan.expiresAt ? ` on ${formatDate(plan.expiresAt)}` : ""}. Renew to
          open the portal again — all your supervisees, hours and meetings are kept.
        </Alert>
      )}

      {plan?.active && !plan.complimentary && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" onClick={() => navigate("/portal/supervisees")}>
              Open portal
            </Button>
          }
        >
          Your plan is active until {formatDate(plan.expiresAt)} ({plan.daysLeft}{" "}
          {plan.daysLeft === 1 ? "day" : "days"} left). Renewing now adds time on top.
        </Alert>
      )}

      {isSupervisee && (
        <Alert severity="info">
          This is a supervisee account, so it's already covered by your supervisor. Plans are
          for supervisors.
        </Alert>
      )}

      {!plan?.complimentary && (
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          }}
        >
          {PLANS.map((item) => {
            const best = item.id === "supervision-yearly";
            return (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  display: "flex",
                  flexDirection: "column",
                  borderColor: best ? "primary.main" : undefined,
                  borderWidth: best ? 2 : 1,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">{item.name}</Typography>
                  {best && saving > 0 && (
                    <Chip
                      size="small"
                      color="primary"
                      label={`Save ${formatAmount(saving, currency)}`}
                    />
                  )}
                </Stack>

                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 1 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {formatAmount(priceOf(item), currency)}
                  </Typography>
                  <Typography color="text.secondary">/ {item.period}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {item.days} days of access per payment
                  {currency !== "EUR" ? ` · €${item.price} in euros` : ""}
                </Typography>

                <Stack spacing={1} sx={{ my: 3, flexGrow: 1 }}>
                  {FEATURES.map((feature) => (
                    <Box key={feature} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <CheckIcon fontSize="small" color="primary" sx={{ mt: "2px" }} />
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  ))}
                </Stack>

                <Button
                  variant={best ? "contained" : "outlined"}
                  size="large"
                  disabled={isSupervisee || buying !== null || priceOf(item) == null}
                  onClick={() => handleBuy(item)}
                >
                  {buying === item.id
                    ? "Opening checkout…"
                    : plan?.active || lapsed
                      ? `Renew ${item.name.toLowerCase()}`
                      : `Choose ${item.name.toLowerCase()}`}
                </Button>
              </Card>
            );
          })}
        </Box>
      )}

      {!plan?.complimentary && (
        <Typography variant="caption" color="text.secondary">
          Paid securely through PayFast and charged in Pakistani rupees at today's rate. Plans
          don't renew automatically — we'll remind you on your dashboard before yours ends.
          Supervisees use the portal free under their supervisor.
        </Typography>
      )}
    </PortalContainer>
  );
}
