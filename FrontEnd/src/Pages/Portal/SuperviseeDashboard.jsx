import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";

import HoursSection from "./HoursSection";
import MeetingsSection from "./MeetingsSection";
import { PageHeading, PortalContainer, PortalLoading, SummaryCards } from "./PortalShared";
import { apiError, formatDate, formatHours, superviseeApi } from "./portalApi";

/**
 * A supervisee's own dashboard.
 *
 * Every call from this screen goes to `/supervision/me/...`, which takes no
 * id — there is no way from here to name another supervisee, and the server
 * resolves the record set from the session regardless of what is sent.
 */
export default function SuperviseeDashboard() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const loadDashboard = React.useCallback(async () => {
    try {
      const res = await superviseeApi.dashboard();
      setData(res.data);
    } catch (err) {
      toast.error(apiError(err, "Could not load your supervision record"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Stable adapters, or HoursSection's effect refires on every render.
  const hoursApi = React.useMemo(
    () => ({
      list: superviseeApi.listHours,
      add: superviseeApi.addHours,
      update: superviseeApi.updateHours,
      remove: superviseeApi.deleteHours,
    }),
    [],
  );

  const meetingsApi = React.useMemo(() => ({ list: superviseeApi.listMeetings }), []);

  if (loading) return <PortalLoading />;
  if (!data) return null;

  const { profile, summary } = data;

  return (
    <PortalContainer>
      <PageHeading
        title="My supervision"
        subtitle={`${profile.board?.name || "No board"} · started ${formatDate(
          profile.supervisionStartDate,
        )}`}
        action={
          profile.status !== "active" ? (
            <Chip
              label={profile.status === "paused" ? "Paused" : "Completed"}
              color={profile.status === "paused" ? "warning" : "success"}
            />
          ) : null
        }
      />

      <SummaryCards summary={summary} />

      <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          My details
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          }}
        >
          <Detail label="Certifying board" value={profile.board?.fullName || profile.board?.name} />
          <Detail label="Required total hours" value={formatHours(profile.requiredTotalHours)} />
          <Detail label="Supervision ratio" value={profile.supervisionRatio || "—"} />
          <Detail label="Supervision started" value={formatDate(profile.supervisionStartDate)} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Your board and required hours are set by your supervisor. Ask her if
          anything here looks wrong.
        </Typography>
      </Card>

      <HoursSection hoursApi={hoursApi} canEdit onChanged={loadDashboard} />
      <MeetingsSection meetingsApi={meetingsApi} canEdit={false} />
    </PortalContainer>
  );
}

function Detail({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}
