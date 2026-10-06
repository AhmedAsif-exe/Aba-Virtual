import * as React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { toast } from "react-toastify";

import api from "axiosInstance";
import { useProjectContext } from "Utils/Context";
import { PortalContainer, PortalLoading } from "./PortalShared";
import { apiError } from "./portalApi";

/**
 * First login for an account the supervisor created: swap the temporary
 * password for one of their own. Until they do, the portal returns 403 for
 * everything, so a generated password read out over the phone has a short
 * useful life.
 */
export default function SetPassword() {
  const { user, loggedIn, loading, refreshUser } = useProjectContext();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  if (loading) return <PortalLoading />;
  if (!loggedIn) return <Navigate to="/login" replace />;

  const destination = user?.portalRole === "supervisor" ? "/portal/supervisees" : "/portal";

  // Nothing to do here if they've already chosen a password.
  if (!user?.mustChangePassword) return <Navigate to={destination} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The two passwords don't match");
      return;
    }

    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      // Pull the cleared mustChangePassword flag before navigating, or the
      // guard bounces us straight back to this screen.
      await refreshUser();
      toast.success("Password updated");
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error(apiError(err, "Could not update password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalContainer sx={{ maxWidth: "480px" }}>
      <Card variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Choose a password
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Your account was set up with a temporary password. Pick your own to
          carry on to the portal.
        </Alert>

        <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 3 }}>
          <TextField
            label="Temporary password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            helperText="At least 6 characters"
            required
            fullWidth
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save and continue"}
          </Button>
        </Stack>
      </Card>
    </PortalContainer>
  );
}
