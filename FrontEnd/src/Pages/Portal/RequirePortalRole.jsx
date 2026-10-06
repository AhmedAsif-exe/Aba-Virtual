import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useProjectContext } from "Utils/Context";
import { PortalLoading } from "./PortalShared";

/**
 * Route guard for the supervision portal.
 *
 * This is presentation only — it decides which screens to offer, not what
 * data anyone can reach. Every supervision endpoint re-checks portalRole and
 * re-derives the caller's scope server-side, so bypassing this component
 * gets you an empty screen and a 403, not someone else's hour log.
 */
export default function RequirePortalRole({ role, children }) {
  const { user, loggedIn, loading } = useProjectContext();
  const location = useLocation();

  if (loading) return <PortalLoading />;

  if (!loggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // An account created by the supervisor starts on a generated password. The
  // server refuses portal data until it is replaced, so send them there
  // first rather than letting them hit a wall of 403s.
  if (user?.mustChangePassword && location.pathname !== "/portal/set-password") {
    return <Navigate to="/portal/set-password" replace />;
  }

  if (user?.portalRole !== role) {
    // Send a supervisor who landed on a supervisee URL (or vice versa) to
    // their own home rather than showing a dead end.
    const home =
      user?.portalRole === "supervisor"
        ? "/portal/supervisees"
        : user?.portalRole === "supervisee"
          ? "/portal"
          : "/account";
    return <Navigate to={home} replace />;
  }

  return children;
}
