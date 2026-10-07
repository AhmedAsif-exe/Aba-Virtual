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
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
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

import { apiError, formatDate, toDateInput } from "./portalApi";

const STATUSES = [
  { value: "not_started", label: "Not started", color: "default" },
  { value: "in_progress", label: "In progress", color: "info" },
  { value: "submitted", label: "Submitted", color: "warning" },
  { value: "completed", label: "Completed", color: "success" },
];
// "Completed" is the supervisor's sign-off; the server refuses it from a supervisee.
const SUPERVISEE_STATUSES = STATUSES.filter((s) => s.value !== "completed");

const statusOf = (value) => STATUSES.find((s) => s.value === value) || STATUSES[0];

/** Past its due date and not yet handed in. Dates are UTC midnight. */
function isOverdue(assignment) {
  if (!assignment.dueDate) return false;
  if (["submitted", "completed"].includes(assignment.status)) return false;
  return toDateInput(assignment.dueDate) < new Date().toISOString().slice(0, 10);
}

/** Open work first, soonest due first, undated after dated; completed last. */
function sortAssignments(list) {
  return [...list].sort((a, b) => {
    const doneA = a.status === "completed";
    const doneB = b.status === "completed";
    if (doneA !== doneB) return doneA ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate || b.dueDate) return a.dueDate ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/**
 * Assignments the supervisor sets. Optional: not every supervisor uses them,
 * so no field is required and the supervisee's dashboard hides the board
 * entirely (`hideWhenEmpty`) until there is at least one.
 *
 * `isSupervisor` picks the editor: she writes the whole assignment, while the
 * supervisee can only move its status up to "Submitted" and add a response.
 * The server enforces that split on its own.
 */
export default function AssignmentsSection({
  assignmentsApi,
  isSupervisor = false,
  hideWhenEmpty = false,
  onChanged,
}) {
  const [assignments, setAssignments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogAssignment, setDialogAssignment] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await assignmentsApi.list();
      setAssignments(res.data.assignments || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load assignments"));
    } finally {
      setLoading(false);
    }
  }, [assignmentsApi]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (assignment) => {
    const name = assignment.title || "this assignment";
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await assignmentsApi.remove(assignment._id);
      toast.success("Assignment deleted");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(apiError(err, "Could not delete assignment"));
    }
  };

  const rows = React.useMemo(() => sortAssignments(assignments), [assignments]);

  if (hideWhenEmpty && (loading || assignments.length === 0)) return null;

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
          <Typography variant="h6">Assignments</Typography>
          <Typography variant="body2" color="text.secondary">
            {isSupervisor
              ? "Optional. Work you've set, and where it stands."
              : "Work set by your supervisor. Update your progress as you go."}
          </Typography>
        </Box>
        {isSupervisor && (
          <Button variant="contained" onClick={() => setDialogAssignment({})}>
            Add assignment
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Assignment</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No assignments yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((assignment) => {
              const status = statusOf(assignment.status);
              const locked = !isSupervisor && assignment.status === "completed";
              return (
                <TableRow key={assignment._id} hover sx={{ verticalAlign: "top" }}>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <AssignmentDetails assignment={assignment} isSupervisor={isSupervisor} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {assignment.dueDate ? formatDate(assignment.dueDate) : "—"}
                    {isOverdue(assignment) && (
                      <Chip
                        size="small"
                        color="error"
                        variant="outlined"
                        label="Overdue"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={status.color} label={status.label} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {!locked && (
                      <IconButton
                        size="small"
                        title={isSupervisor ? "Edit" : "Update progress"}
                        onClick={() => setDialogAssignment(assignment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {isSupervisor && (
                      <IconButton
                        size="small"
                        title="Delete"
                        onClick={() => handleDelete(assignment)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {dialogAssignment &&
        (isSupervisor ? (
          <AssignmentDialog
            assignment={dialogAssignment}
            assignmentsApi={assignmentsApi}
            onClose={() => setDialogAssignment(null)}
            onSaved={() => {
              setDialogAssignment(null);
              load();
              onChanged?.();
            }}
          />
        ) : (
          <ResponseDialog
            assignment={dialogAssignment}
            assignmentsApi={assignmentsApi}
            onClose={() => setDialogAssignment(null)}
            onSaved={() => {
              setDialogAssignment(null);
              load();
            }}
          />
        ))}
    </Card>
  );
}

function AssignmentDetails({ assignment, isSupervisor }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {assignment.title || "Untitled assignment"}
      </Typography>
      {assignment.description && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {assignment.description}
        </Typography>
      )}
      {assignment.link && (
        <Link
          href={assignment.link}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          sx={{ wordBreak: "break-all" }}
        >
          Open link
        </Link>
      )}
      {assignment.response && (
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {isSupervisor ? "Their response: " : "Your response: "}
          </Box>
          {assignment.response}
        </Typography>
      )}
      {assignment.feedback && (
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            Feedback:{" "}
          </Box>
          {assignment.feedback}
        </Typography>
      )}
    </Stack>
  );
}

/** The supervisor's editor. Every field optional; the server refuses only a
 *  wholly blank assignment, and so does this form, before it sends. */
function AssignmentDialog({ assignment, assignmentsApi, onClose, onSaved }) {
  const isEdit = Boolean(assignment._id);
  const [form, setForm] = React.useState({
    title: assignment.title || "",
    description: assignment.description || "",
    dueDate: toDateInput(assignment.dueDate),
    link: assignment.link || "",
    status: assignment.status || "not_started",
    feedback: assignment.feedback || "",
  });
  const [saving, setSaving] = React.useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.description.trim() && !form.link.trim()) {
      toast.error("Add a title, a description or a link");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) await assignmentsApi.update(assignment._id, form);
      else await assignmentsApi.add(form);
      toast.success(isEdit ? "Assignment updated" : "Assignment added");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not save assignment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit assignment" : "Add assignment"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Fill in only what you need.
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={set("title")}
              inputProps={{ maxLength: 200 }}
              fullWidth
            />
            <TextField
              label="Description / instructions"
              value={form.description}
              onChange={set("description")}
              multiline
              minRows={3}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Due date"
                type="date"
                value={form.dueDate}
                onChange={set("dueDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField select label="Status" value={form.status} onChange={set("status")} fullWidth>
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Link"
              value={form.link}
              onChange={set("link")}
              placeholder="https://"
              helperText="A reading, a shared document or a form"
              fullWidth
            />
            <TextField
              label="Feedback"
              value={form.feedback}
              onChange={set("feedback")}
              helperText="Visible to the supervisee"
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

/** The supervisee's side: their progress and a response, nothing else. */
function ResponseDialog({ assignment, assignmentsApi, onClose, onSaved }) {
  const [status, setStatus] = React.useState(assignment.status || "not_started");
  const [response, setResponse] = React.useState(assignment.response || "");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await assignmentsApi.update(assignment._id, { status, response });
      toast.success("Progress updated");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not update assignment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{assignment.title || "Update assignment"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} fullWidth>
              {SUPERVISEE_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Your response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              helperText="What you did, or a link to your work"
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
