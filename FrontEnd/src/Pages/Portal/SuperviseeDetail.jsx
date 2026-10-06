import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-toastify";

import HoursSection from "./HoursSection";
import MeetingsSection from "./MeetingsSection";
import { PageHeading, PortalContainer, PortalLoading, SummaryCards } from "./PortalShared";
import {
  apiError,
  boardsApi,
  formatDate,
  supervisorApi,
  toDateInput,
} from "./portalApi";

/**
 * The supervisor's view of one supervisee: totals on top, then the two logs.
 *
 * The id in the URL is only ever honoured alongside her own supervisorId in
 * the server's query, so another supervisor's trainee returns a 404 here
 * rather than a record.
 */
export default function SuperviseeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState(null);

  const loadDashboard = React.useCallback(async () => {
    try {
      const res = await supervisorApi.dashboard(id);
      setData(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error("Supervisee not found");
        navigate("/portal/supervisees", { replace: true });
        return;
      }
      toast.error(apiError(err, "Could not load supervisee"));
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const hoursApi = React.useMemo(
    () => ({
      list: () => supervisorApi.listHours(id),
      add: (body) => supervisorApi.addHours(id, body),
      update: (entryId, body) => supervisorApi.updateHours(id, entryId, body),
      remove: (entryId) => supervisorApi.deleteHours(id, entryId),
    }),
    [id],
  );

  const meetingsApi = React.useMemo(
    () => ({
      list: () => supervisorApi.listMeetings(id),
      add: (body) => supervisorApi.addMeeting(id, body),
      update: (meetingId, body) => supervisorApi.updateMeeting(id, meetingId, body),
      remove: (meetingId) => supervisorApi.deleteMeeting(id, meetingId),
    }),
    [id],
  );

  const handleResetPassword = async () => {
    if (!window.confirm("Issue a new temporary password? Their current one stops working.")) {
      return;
    }
    try {
      const res = await supervisorApi.resetPassword(id);
      setTempPassword(res.data.tempPassword);
    } catch (err) {
      toast.error(apiError(err, "Could not reset password"));
    }
  };

  if (loading) return <PortalLoading />;
  if (!data) return null;

  const { profile, summary } = data;

  return (
    <PortalContainer>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/portal/supervisees")}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        All supervisees
      </Button>

      <PageHeading
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar src={profile.pfp} />
            {profile.name}
          </Box>
        }
        subtitle={`${profile.email} · ${profile.board?.name || "No board"} · started ${formatDate(
          profile.supervisionStartDate,
        )}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleResetPassword}>
              Reset password
            </Button>
            <Button variant="contained" onClick={() => setEditOpen(true)}>
              Edit details
            </Button>
          </Stack>
        }
      />

      <SummaryCards summary={summary} />

      {profile.supervisorNotes && (
        <Alert severity="info" icon={false}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
            Your private notes — not visible to {profile.name.split(" ")[0]}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {profile.supervisorNotes}
          </Typography>
        </Alert>
      )}

      <HoursSection hoursApi={hoursApi} canEdit onChanged={loadDashboard} />
      <MeetingsSection meetingsApi={meetingsApi} canEdit onChanged={loadDashboard} />

      {editOpen && (
        <EditSuperviseeDialog
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            loadDashboard();
          }}
        />
      )}

      {tempPassword && (
        <Dialog open onClose={() => setTempPassword(null)} fullWidth maxWidth="xs">
          <DialogTitle>New temporary password</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Copy it now — it isn't stored and can't be shown again. They'll be
              asked to change it at their next sign-in.
            </Alert>
            <TextField
              value={tempPassword}
              InputProps={{ readOnly: true }}
              onFocus={(e) => e.target.select()}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => setTempPassword(null)}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </PortalContainer>
  );
}

function EditSuperviseeDialog({ profile, onClose, onSaved }) {
  const [boards, setBoards] = React.useState([]);
  const [form, setForm] = React.useState({
    boardId: profile.board?._id || "",
    requiredTotalHours: String(profile.requiredTotalHours ?? ""),
    supervisionRatio: profile.supervisionRatio || "",
    supervisionStartDate: toDateInput(profile.supervisionStartDate),
    contactPhone: profile.contactPhone || "",
    status: profile.status,
    supervisorNotes: profile.supervisorNotes || "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // Retired boards included, so a supervisee already on one doesn't have
    // their board silently blanked when this form is saved.
    boardsApi
      .list(true)
      .then((res) => setBoards(res.data.boards || []))
      .catch((err) => toast.error(apiError(err, "Could not load boards")));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await supervisorApi.updateSupervisee(profile._id, form);
      toast.success("Details updated");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not update details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit {profile.name}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Certifying board"
              value={form.boardId}
              onChange={set("boardId")}
              fullWidth
            >
              {boards.map((board) => (
                <MenuItem key={board._id} value={board._id}>
                  {board.name}
                  {board.active ? "" : " (retired)"}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Required total hours"
                type="number"
                value={form.requiredTotalHours}
                onChange={set("requiredTotalHours")}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                label="Supervision ratio"
                value={form.supervisionRatio}
                onChange={set("supervisionRatio")}
                placeholder="1:10"
                helperText="Reference only"
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Supervision start date"
                type="date"
                value={form.supervisionStartDate}
                onChange={set("supervisionStartDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={set("status")}
                fullWidth
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Phone"
              value={form.contactPhone}
              onChange={set("contactPhone")}
              fullWidth
            />

            <TextField
              label="Private notes"
              value={form.supervisorNotes}
              onChange={set("supervisorNotes")}
              helperText="Only you can see these"
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
