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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";

import { apiError, formatDate, formatFileSize, spelledDate, toDateInput } from "./portalApi";

const STATUSES = [
  { value: "not_started", label: "Not started", color: "default" },
  { value: "in_progress", label: "In progress", color: "info" },
  { value: "submitted", label: "Submitted", color: "warning" },
  { value: "completed", label: "Completed", color: "success" },
];
// "Completed" is the supervisor's sign-off; the server refuses it from a supervisee.
const SUPERVISEE_STATUSES = STATUSES.filter((s) => s.value !== "completed");

const KINDS = [
  { value: "assignment", label: "Assignment" },
  { value: "presentation", label: "Presentation" },
];

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Mirrors the server's allow-list (Routes/supervision.js).
const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.webp,.heic";
const MAX_FILE_MB = 25;

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
 * Assignments and presentations the supervisor sets. Optional: not every
 * supervisor uses them, so no field is required and the supervisee's
 * dashboard hides the board entirely (`hideWhenEmpty`) until there is one.
 *
 * `mode` decides what can be done, and the server enforces the same split:
 *   - "supervisor": writes the whole thing — brief, rating, feedback, files
 *   - "supervisee": moves the status up to "Submitted" and adds a response
 *   - "viewer":     reads only (someone the supervisor shared the portal with)
 *
 * `assignmentsApi` adapts the calls for each mode; `fileUrl` is the only
 * member every mode needs besides `list`.
 */
export default function AssignmentsSection({
  assignmentsApi,
  mode = "supervisee",
  hideWhenEmpty = false,
  onChanged,
}) {
  const isSupervisor = mode === "supervisor";
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

  const afterChange = () => {
    load();
    onChanged?.();
  };

  const handleDelete = async (assignment) => {
    const name = assignment.title || "this assignment";
    if (!window.confirm(`Delete ${name}? Its attached files are deleted too.`)) return;
    try {
      await assignmentsApi.remove(assignment._id);
      toast.success("Assignment deleted");
      afterChange();
    } catch (err) {
      toast.error(apiError(err, "Could not delete assignment"));
    }
  };

  const rows = React.useMemo(() => sortAssignments(assignments), [assignments]);

  if (hideWhenEmpty && (loading || assignments.length === 0)) return null;

  const subtitle = {
    supervisor: "Optional. Work and presentations you've set, with files, ratings and feedback.",
    supervisee: "Work set by your supervisor. Update your progress as you go.",
    viewer: "Work and presentations set by the supervisor.",
  }[mode];
  const showActions = mode !== "viewer";
  const columns = showActions ? 4 : 3;

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
            {subtitle}
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
              {showActions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns} align="center" sx={{ py: 3 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No assignments yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((assignment) => {
              const status = statusOf(assignment.status);
              const locked = mode === "supervisee" && assignment.status === "completed";
              return (
                <TableRow key={assignment._id} hover sx={{ verticalAlign: "top" }}>
                  <TableCell sx={{ maxWidth: 440 }}>
                    <AssignmentDetails
                      assignment={assignment}
                      mode={mode}
                      fileUrl={assignmentsApi.fileUrl}
                    />
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
                  {showActions && (
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
                  )}
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
              afterChange();
            }}
          />
        ) : (
          <ResponseDialog
            assignment={dialogAssignment}
            assignmentsApi={assignmentsApi}
            onClose={() => setDialogAssignment(null)}
            onSaved={() => {
              setDialogAssignment(null);
              afterChange();
            }}
          />
        ))}
    </Card>
  );
}

function AssignmentDetails({ assignment, mode, fileUrl }) {
  const responseLabel = mode === "supervisee" ? "Your response: " : "Supervisee's response: ";
  return (
    <Stack spacing={0.75}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {assignment.title || "Untitled assignment"}
        </Typography>
        {assignment.kind === "presentation" && (
          <Chip size="small" variant="outlined" label="Presentation" />
        )}
        {assignment.rating != null && (
          <Chip size="small" color="primary" label={`Rated ${assignment.rating}/10`} />
        )}
      </Box>
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
      {assignment.attachments?.length > 0 && (
        <Stack spacing={0.25}>
          {assignment.attachments.map((file) => (
            <Link
              key={file._id}
              href={fileUrl(assignment._id, file._id)}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, wordBreak: "break-all" }}
            >
              <AttachFileIcon sx={{ fontSize: 16 }} />
              {file.originalName}
              <Box component="span" sx={{ color: "text.secondary", ml: 0.5 }}>
                ({formatFileSize(file.size)})
              </Box>
            </Link>
          ))}
        </Stack>
      )}
      {assignment.response && (
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {responseLabel}
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

/**
 * The supervisor's editor. Every field optional; the server refuses only a
 * wholly blank assignment, and so does this form, before it sends. Files
 * picked here upload once the assignment itself is saved, so a new
 * assignment can be created with its articles in one go.
 */
function AssignmentDialog({ assignment, assignmentsApi, onClose, onSaved }) {
  const isEdit = Boolean(assignment._id);
  const [form, setForm] = React.useState({
    kind: assignment.kind || "assignment",
    title: assignment.title || "",
    description: assignment.description || "",
    dueDate: toDateInput(assignment.dueDate),
    link: assignment.link || "",
    status: assignment.status || "not_started",
    rating: assignment.rating ?? "",
    feedback: assignment.feedback || "",
  });
  const [existingFiles, setExistingFiles] = React.useState(assignment.attachments || []);
  const [newFiles, setNewFiles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const fileInput = React.useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = ""; // so the same file can be picked again
    const tooBig = picked.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) toast.error(`Files must be under ${MAX_FILE_MB} MB: ${tooBig.map((f) => f.name).join(", ")}`);
    setNewFiles((current) => [...current, ...picked.filter((f) => !tooBig.includes(f))]);
  };

  const removeExisting = async (file) => {
    if (!window.confirm(`Remove ${file.originalName}?`)) return;
    try {
      await assignmentsApi.removeAttachment(assignment._id, file._id);
      setExistingFiles((files) => files.filter((f) => f._id !== file._id));
      toast.success("File removed");
    } catch (err) {
      toast.error(apiError(err, "Could not remove file"));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const hasContent =
      form.title.trim() || form.description.trim() || form.link.trim() || newFiles.length;
    if (!hasContent && !existingFiles.length) {
      toast.error("Add a title, a description, a link or a file");
      return;
    }

    setSaving(true);
    try {
      // A files-only assignment still needs something to show as its name.
      const body = {
        ...form,
        title: form.title.trim() || (!isEdit && newFiles.length ? newFiles[0].name : form.title),
      };
      const res = isEdit
        ? await assignmentsApi.update(assignment._id, body)
        : await assignmentsApi.add(body);
      const savedId = res.data.assignment._id;

      if (newFiles.length) {
        try {
          await assignmentsApi.upload(savedId, newFiles);
        } catch (err) {
          toast.error(apiError(err, "Saved, but the files could not be uploaded"));
          onSaved();
          return;
        }
      }
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="Type" value={form.kind} onChange={set("kind")} sx={{ minWidth: 170 }}>
                {KINDS.map((k) => (
                  <MenuItem key={k.value} value={k.value}>
                    {k.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Title"
                value={form.title}
                onChange={set("title")}
                inputProps={{ maxLength: 200 }}
                fullWidth
              />
            </Stack>
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
                helperText={spelledDate(form.dueDate) || "Optional"}
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

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Attachments
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                PDFs, Word, PowerPoint, Excel or pictures, up to {MAX_FILE_MB} MB each. The
                supervisee can open them.
              </Typography>
              <Stack spacing={0.5} sx={{ mb: 1 }}>
                {existingFiles.map((file) => (
                  <FileRow
                    key={file._id}
                    name={file.originalName}
                    size={file.size}
                    onRemove={() => removeExisting(file)}
                  />
                ))}
                {newFiles.map((file, i) => (
                  <FileRow
                    key={`${file.name}-${i}`}
                    name={file.name}
                    size={file.size}
                    pending
                    onRemove={() => setNewFiles((files) => files.filter((_, j) => j !== i))}
                  />
                ))}
              </Stack>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPTED_FILES}
                onChange={pickFiles}
                style={{ display: "none" }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInput.current?.click()}
              >
                Add files
              </Button>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Rating"
                value={form.rating}
                onChange={set("rating")}
                helperText="Out of 10, visible to the supervisee"
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">Not rated</MenuItem>
                {RATINGS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} / 10
                  </MenuItem>
                ))}
              </TextField>
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

function FileRow({ name, size, pending, onRemove }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 1,
        py: 0.5,
      }}
    >
      <AttachFileIcon sx={{ fontSize: 16, color: "text.secondary" }} />
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
        {name}{" "}
        <Box component="span" sx={{ color: "text.secondary" }}>
          ({formatFileSize(size)}){pending ? " · uploads when you save" : ""}
        </Box>
      </Typography>
      <IconButton size="small" title="Remove" onClick={onRemove}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
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
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              fullWidth
            >
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
