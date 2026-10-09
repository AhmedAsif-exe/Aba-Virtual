import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";

import {
  apiError,
  formatDate,
  formatHours,
  mondayOf,
  toDateInput,
  weekRangeLabel,
} from "./portalApi";

/**
 * Weekly fieldwork hours.
 *
 * One component for both sides of the portal: the supervisee self-reports
 * here and the supervisor corrects here, driven by the `hoursApi` adapter
 * they pass in. Sharing it means a correction goes through exactly the same
 * validation as a self-report, and the server enforces the same one-entry-
 * per-week rule for both.
 */
export default function HoursSection({ hoursApi, canEdit = true, onChanged }) {
  const [entries, setEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogEntry, setDialogEntry] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await hoursApi.list();
      setEntries(res.data.entries || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load hours"));
    } finally {
      setLoading(false);
    }
  }, [hoursApi]);

  React.useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    await load();
    onChanged?.();
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete the week of ${formatDate(entry.weekStartDate)}?`)) return;
    try {
      await hoursApi.remove(entry._id);
      toast.success("Entry deleted");
      afterChange();
    } catch (err) {
      toast.error(apiError(err, "Could not delete entry"));
    }
  };

  const total = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

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
          <Typography variant="h6">Hours worked</Typography>
          <Typography variant="body2" color="text.secondary">
            Logged one week at a time. These are fieldwork hours, not supervision.
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" onClick={() => setDialogEntry({})}>
            Log a week
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Week</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell>Note</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} align="center" sx={{ py: 3 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}

            {!loading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hours logged yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {entries.map((entry) => (
              <TableRow key={entry._id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {weekRangeLabel(toDateInput(entry.weekStartDate))}
                </TableCell>
                <TableCell align="right">{formatHours(entry.hours)}</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{entry.note || "—"}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setDialogEntry(entry)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(entry)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {entries.length > 0 && (
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatHours(total)}
                </TableCell>
                <TableCell colSpan={canEdit ? 2 : 1} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {dialogEntry && (
        <HoursDialog
          entry={dialogEntry}
          hoursApi={hoursApi}
          onClose={() => setDialogEntry(null)}
          onSaved={() => {
            setDialogEntry(null);
            afterChange();
          }}
        />
      )}
    </Card>
  );
}

function HoursDialog({ entry, hoursApi, onClose, onSaved }) {
  const isEdit = Boolean(entry._id);
  const [weekStartDate, setWeekStartDate] = React.useState(
    isEdit ? toDateInput(entry.weekStartDate) : mondayOf(),
  );
  const [hours, setHours] = React.useState(isEdit ? String(entry.hours) : "");
  const [note, setNote] = React.useState(entry.note || "");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 168) {
      toast.error("Hours must be between 0 and 168");
      return;
    }

    setSaving(true);
    try {
      const body = { weekStartDate, hours: parsed, note };
      if (isEdit) await hoursApi.update(entry._id, body);
      else await hoursApi.add(body);
      toast.success(isEdit ? "Entry updated" : "Week logged");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not save entry"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? "Edit week" : "Log a week"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Week starting"
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              // Any day in the week is accepted; the server snaps it to the
              // Monday, so picking Wednesday logs that same week. Showing the
              // resulting range live stops that looking like an ignored edit.
              helperText={
                weekStartDate
                  ? `Saved as the week ${weekRangeLabel(weekStartDate)}`
                  : "Pick any day in the week"
              }
              required
              fullWidth
            />
            <TextField
              label="Hours worked"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputProps={{ min: 0, max: 168, step: 0.25 }}
              required
              fullWidth
            />
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
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
