import * as React from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-toastify";

import { useProjectContext } from "Utils/Context";
import AssignmentsSection from "./AssignmentsSection";
import HoursSection from "./HoursSection";
import MeetingsSection from "./MeetingsSection";
import ProgressSection from "./ProgressSection";
import { PageHeading, PortalContainer, PortalLoading, SummaryCards } from "./PortalShared";
import { SuperviseeCard } from "./SupervisorDashboard";
import { apiError, formatDate, sharedApi } from "./portalApi";

/**
 * View-only access to another supervisor's portal, for whoever they shared it
 * with. Every call here goes to /supervision/shared/..., which has GET routes
 * only — this screen offers no edits, and the server has none to offer.
 */

function useRequireLogin() {
  const { loggedIn, loading } = useProjectContext();
  const location = useLocation();
  if (loading) return <PortalLoading />;
  if (!loggedIn) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return null;
}

/** /portal/shared — who has shared with me, and their supervisees. */
export function SharedRoster() {
  const gate = useRequireLogin();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [roster, setRoster] = React.useState(null);

  React.useEffect(() => {
    if (gate) return;
    sharedApi
      .supervisors()
      .then((res) => {
        const list = res.data.supervisors || [];
        setSupervisors(list);
        setSelected((current) => current || list.find((s) => s.available)?._id || null);
      })
      .catch((err) => {
        toast.error(apiError(err, "Could not load shared portals"));
        setSupervisors([]);
      });
  }, [gate]);

  React.useEffect(() => {
    if (!selected) return;
    setRoster(null);
    sharedApi
      .roster(selected)
      .then((res) => setRoster(res.data.supervisees || []))
      .catch((err) => {
        toast.error(apiError(err, "Could not load supervisees"));
        setRoster([]);
      });
  }, [selected]);

  if (gate) return gate;
  if (!supervisors) return <PortalLoading />;

  const current = supervisors.find((s) => s._id === selected);

  return (
    <PortalContainer>
      <PageHeading
        title="Shared with me"
        subtitle="View-only access other supervisors have given you. You can't make changes here."
      />

      {supervisors.length === 0 && (
        <Alert severity="info">Nobody has shared their supervision portal with you yet.</Alert>
      )}

      {supervisors.length > 1 && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selected}
          onChange={(_, v) => v && setSelected(v)}
          sx={{ flexWrap: "wrap" }}
        >
          {supervisors.map((s) => (
            <ToggleButton key={s._id} value={s._id} disabled={!s.available} sx={{ textTransform: "none" }}>
              {s.name || s.email}
              {!s.available ? " (unavailable)" : ""}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {supervisors.length > 0 && !supervisors.some((s) => s.available) && (
        <Alert severity="warning">
          The shared portal isn't available right now. Please check with the supervisor.
        </Alert>
      )}

      {current && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar src={current.pfp} />
          <Box>
            <strong>{current.name}</strong>
            <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
              {current.email}
            </Box>
          </Box>
          <Chip size="small" variant="outlined" label="View only" sx={{ ml: "auto" }} />
        </Box>
      )}

      {selected && roster === null && <PortalLoading />}
      {roster && roster.length === 0 && (
        <Alert severity="info">{current?.name || "This supervisor"} has no supervisees yet.</Alert>
      )}
      <Box sx={{ display: "grid", gap: 2 }}>
        {(roster || []).map((row) => (
          <SuperviseeCard
            key={row._id}
            row={row}
            onOpen={() => navigate(`/portal/shared/${selected}/${row._id}`)}
          />
        ))}
      </Box>
    </PortalContainer>
  );
}

/** /portal/shared/:supervisorId/:id — one supervisee, read-only. */
export function SharedSupervisee() {
  const gate = useRequireLogin();
  const { supervisorId, id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    if (gate) return;
    sharedApi
      .dashboard(supervisorId, id)
      .then((res) => setData(res.data))
      .catch((err) => {
        toast.error(apiError(err, "Could not load supervisee"));
        navigate("/portal/shared", { replace: true });
      });
  }, [gate, supervisorId, id, navigate]);

  const progressApi = React.useMemo(
    () => ({ load: () => sharedApi.progress(supervisorId, id) }),
    [supervisorId, id],
  );
  const hoursApi = React.useMemo(
    () => ({ list: () => sharedApi.listHours(supervisorId, id) }),
    [supervisorId, id],
  );
  const meetingsApi = React.useMemo(
    () => ({ list: () => sharedApi.listMeetings(supervisorId, id) }),
    [supervisorId, id],
  );
  const assignmentsApi = React.useMemo(
    () => ({
      list: () => sharedApi.listAssignments(supervisorId, id),
      fileUrl: (assignmentId, attachmentId) =>
        sharedApi.attachmentUrl(supervisorId, id, assignmentId, attachmentId),
    }),
    [supervisorId, id],
  );

  if (gate) return gate;
  if (!data) return <PortalLoading />;
  const { profile, summary } = data;

  return (
    <PortalContainer>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/portal/shared")}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        All shared supervisees
      </Button>

      <PageHeading
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar src={profile.pfp} />
            {profile.name}
          </Box>
        }
        subtitle={`${profile.board?.name || "No board"} · started ${formatDate(
          profile.supervisionStartDate,
        )}`}
        action={<Chip variant="outlined" label="View only" />}
      />

      <SummaryCards summary={summary} />
      <ProgressSection progressApi={progressApi} refreshKey={data} />
      <HoursSection hoursApi={hoursApi} canEdit={false} />
      <MeetingsSection
        meetingsApi={meetingsApi}
        canEdit={false}
        subtitle="Supervision time provided by the supervisor."
      />
      <AssignmentsSection assignmentsApi={assignmentsApi} mode="viewer" hideWhenEmpty />
    </PortalContainer>
  );
}
