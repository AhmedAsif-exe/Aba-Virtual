import * as React from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useProjectContext } from "Utils/Context";
import { formatDate } from "./portalApi";

// Plan banners and notices shared by the portal screens. What they show
// comes from /auth/me's plan summary (BackEnd/Services/entitlements.js);
// the server enforces the same rules whatever the screen shows.

const PLANS_PAGE = "/supervision-plans#plans";

// Brief §4.4 and §8a, word for word.
export const SUPERVISOR_PLAN_ENDED =
  "Your supervisor's plan has ended. You can view your records. Logging opens again when they renew.";
export const ARCHIVED_RECORD =
  "Your supervisor has archived your record. You can still view your records. Contact your supervisor if this is a mistake.";
export const NOT_IN_PLAN = "This feature isn't included in your plan. Upgrade to use it.";

/** §4.5 wording, with the plan name and number from the plan summary. */
export const limitMessage = (planKey, max) =>
  `${planName(planKey)} includes up to ${max} supervisees. Upgrade to Professional for unlimited supervisees.`;

/** The signed-in supervisor's plan, in the shape the screens need. */
export function usePlan() {
  const { user } = useProjectContext();
  const plan = user?.supervisionPlan || {};
  return {
    plan,
    canWrite: Boolean(plan.canWrite),
    can: (feature) => Boolean(plan.features?.[feature]),
    maxActiveSupervisees: plan.maxActiveSupervisees ?? null,
  };
}

const planName = (key) => (key ? key[0].toUpperCase() + key.slice(1) : "");

/** Ended (read-only) or ending within 7 days. Nothing for free accounts. */
export function SupervisorPlanBanner() {
  const navigate = useNavigate();
  const { plan, canWrite } = usePlan();
  if (plan.complimentary || !plan.planKey) return null;

  const renew = (
    <Button color="inherit" onClick={() => navigate(PLANS_PAGE)}>
      Renew
    </Button>
  );

  if (!canWrite) {
    return (
      <Alert severity="warning" action={renew}>
        Your {planName(plan.planKey)} plan ended
        {plan.expiresAt ? ` on ${formatDate(plan.expiresAt)}` : ""}. Your account is read-only: you
        can still view and export everything. Nothing is deleted. Renew to make changes again.
      </Alert>
    );
  }
  // Plans don't auto-renew, so this is the only nudge before the end date.
  if (plan.daysLeft != null && plan.daysLeft <= 7) {
    return (
      <Alert severity="warning" action={renew}>
        Your plan ends on {formatDate(plan.expiresAt)} ({plan.daysLeft}{" "}
        {plan.daysLeft === 1 ? "day" : "days"} left). Nothing renews automatically; renewing early
        adds to the time you have left.
      </Alert>
    );
  }
  return null;
}

/** "This feature isn't included in your plan…" with an Upgrade button. */
export function UpgradeNotice({ message = NOT_IN_PLAN, sx }) {
  const navigate = useNavigate();
  return (
    <Alert
      severity="info"
      sx={sx}
      action={
        <Button color="inherit" onClick={() => navigate(PLANS_PAGE)}>
          Upgrade
        </Button>
      }
    >
      {message}
    </Alert>
  );
}

/** The same notice in a dialog, for buttons a plan doesn't include. */
export function UpgradeDialog({ message = NOT_IN_PLAN, onClose }) {
  const navigate = useNavigate();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Upgrade your plan</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Not now</Button>
        <Button variant="contained" onClick={() => navigate(PLANS_PAGE)}>
          Upgrade
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Why a supervisee can't log right now, from their dashboard's `logging`. */
export function SuperviseeLoggingBanner({ logging }) {
  if (!logging || logging.open) return null;
  return (
    <Alert severity="warning">
      {logging.reason === "archived" ? ARCHIVED_RECORD : SUPERVISOR_PLAN_ENDED}
    </Alert>
  );
}
