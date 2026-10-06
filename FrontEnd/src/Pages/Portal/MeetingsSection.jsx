import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";

import { apiError, formatDate, formatDuration, toDateInput } from "./portalApi";

const FORMATS = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
];

/**
 * Supervision meetings — the supervisor's record of contact time.
 *
 * `canEdit` is false on the supervisee's own dashboard: they read these but
 * never write them, since the hours are the supervisor's attestation. The
 * server enforces that independently (there is no POST on /me/meetings).
 */
export default function MeetingsSection({ meetingsApi, canEdit = false, onChanged }) {
  const [meetings, setMeetings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sortAsc, setSortAsc] = React.useState(false);
  const [dialogMeeting, setDialogMeeting] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await meetingsApi.list();
      setMeetings(res.data.meetings || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load meetings"));
    } finally {
      setLoading(false);
    }
  }, [meetingsApi]);

  React.useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    await load();
    onChanged?.();
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm(`Delete the meeting on ${formatDate(meeting.date)}?`)) return;
    try {
      await meetingsApi.remove(meeting._id);
      toast.success("Meeting deleted");
      afterChange();
    } catch (err) {
      toast.error(apiError(err, "Could not delete meeting"));
    }
  };

  // Sorted client-side: the list is small, and it keeps the toggle instant.
  const rows = React.useMemo(() => {
    const copy = [...meetings];
    copy.sort((a, b) =>
      sortAsc ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date),
    );
    return copy;
  }, [meetings, sortAsc]);

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6">Supervision meetings</Typography>
          <Typography variant="body2" color="text.secondary">
            {canEdit
              ? "Supervision time you've provided."
              : "Supervision time provided by your supervisor."}
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" onClick={() => setDialogMeeting({})}>
            Log a meeting
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active
                  direction={sortAsc ? "asc" : "desc"}
                  onClick={() => setSortAsc((v) => !v)}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Format</TableCell>
              <TableCell>Notes / topics</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} align="center" sx={{ py: 3 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No supervision meetings logged yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((meeting) => (
              <TableRow key={meeting._id} hover>
                <TableCell>{formatDate(meeting.date)}</TableCell>
                <TableCell>{formatDuration(meeting.durationMinutes)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={meeting.format === "group" ? "Group" : "Individual"}
                  />
                </TableCell>
                <TableCell
                  sx={{ color: "text.secondary", whiteSpace: "pre-wrap", maxWidth: 320 }}
                >
                  {meeting.notes || "—"}
                </TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setDialogMeeting(meeting)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(meeting)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {dialogMeeting && (
        <MeetingDialog
          meeting={dialogMeeting}
          meetingsApi={meetingsApi}
          onClose={() => setDialogMeeting(null)}
          onSaved={() => {
            setDialogMeeting(null);
            afterChange();
          }}
        />
      )}
    </Card>
  );
}

// Offered as buttons because these are the durations she actually books;
// the minutes field stays editable for anything else.
const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

function MeetingDialog({ meeting, meetingsApi, onClose, onSaved }) {
  const isEdit = Boolean(meeting._id);
  const [date, setDate] = React.useState(
    isEdit ? toDateInput(meeting.date) : new Date().toISOString().slice(0, 10),
  );
  const [durationMinutes, setDurationMinutes] = React.useState(
    isEdit ? String(meeting.durationMinutes) : "60",
  );
  const [format, setFormat] = React.useState(meeting.format || "individual");
  const [notes, setNotes] = React.useState(meeting.notes || "");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Number(durationMinutes);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
      toast.error("Duration must be between 1 and 1440 minutes");
      return;
    }

    setSaving(true);
    try {
      const body = { date, durationMinutes: parsed, format, notes };
      if (isEdit) await meetingsApi.update(meeting._id, body);
      else await meetingsApi.add(body);
      toast.success(isEdit ? "Meeting updated" : "Meeting logged");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not save meeting"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit meeting" : "Log a meeting"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />

            <Box>
              <TextField
                label="Duration (minutes)"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                inputProps={{ min: 1, max: 1440 }}
                required
                fullWidth
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                {QUICK_DURATIONS.map((mins) => (
                  <Chip
                    key={mins}
                    label={formatDuration(mins)}
                    size="small"
                    variant={Number(durationMinutes) === mins ? "filled" : "outlined"}
                    onClick={() => setDurationMinutes(String(mins))}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              select
              label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              fullWidth
            >
              {FORMATS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Notes / topics discussed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
