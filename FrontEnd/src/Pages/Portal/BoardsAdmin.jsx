import * as React from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";

import { PageHeading, PortalContainer, PortalLoading } from "./PortalShared";
import { apiError, boardsApi } from "./portalApi";

/**
 * Manage the certifying board list.
 *
 * The whole point of this screen: boards are data, not an enum in the code,
 * so a new certification can be added without a deploy.
 */
export default function BoardsAdmin() {
  const navigate = useNavigate();
  const [boards, setBoards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogBoard, setDialogBoard] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await boardsApi.list(true);
      setBoards(res.data.boards || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load boards"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (board) => {
    try {
      await boardsApi.update(board._id, { active: !board.active });
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not update board"));
    }
  };

  const handleDelete = async (board) => {
    if (!window.confirm(`Remove ${board.name}?`)) return;
    try {
      const res = await boardsApi.remove(board._id);
      // A board in use is retired rather than deleted; the server says which
      // happened, so tell her plainly instead of claiming it's gone.
      toast.success(res.data.message || "Board deleted");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not remove board"));
    }
  };

  if (loading) return <PortalLoading />;

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
        title="Certifying boards"
        subtitle="Add a board here and it appears in the supervisee form straight away."
        action={
          <Button variant="contained" onClick={() => setDialogBoard({})}>
            Add board
          </Button>
        }
      />

      <Alert severity="info">
        The default hours and ratio are only prefills for the add-supervisee
        form. The figures that count are set per supervisee, because
        requirements vary from person to person even within one board.
      </Alert>

      <Card variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Board</TableCell>
                <TableCell>Full name</TableCell>
                <TableCell align="right">Default hours</TableCell>
                <TableCell>Default ratio</TableCell>
                <TableCell align="center">In list</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {boards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No boards yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {boards.map((board) => (
                <TableRow key={board._id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {board.name}
                      </Typography>
                      {!board.active && <Chip size="small" label="Retired" />}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {board.fullName || "—"}
                  </TableCell>
                  <TableCell align="right">{board.defaultRequiredHours ?? "—"}</TableCell>
                  <TableCell>{board.defaultRatio || "—"}</TableCell>
                  <TableCell align="center">
                    <Switch
                      size="small"
                      checked={board.active}
                      onChange={() => toggleActive(board)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setDialogBoard(board)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(board)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {dialogBoard && (
        <BoardDialog
          board={dialogBoard}
          onClose={() => setDialogBoard(null)}
          onSaved={() => {
            setDialogBoard(null);
            load();
          }}
        />
      )}
    </PortalContainer>
  );
}

function BoardDialog({ board, onClose, onSaved }) {
  const isEdit = Boolean(board._id);
  const [form, setForm] = React.useState({
    name: board.name || "",
    fullName: board.fullName || "",
    defaultRequiredHours:
      board.defaultRequiredHours == null ? "" : String(board.defaultRequiredHours),
    defaultRatio: board.defaultRatio || "",
    sortOrder: String(board.sortOrder ?? 0),
  });
  const [saving, setSaving] = React.useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        // Empty means "no default", which is a null, not a zero — a zero
        // would prefill every new supervisee's requirement with 0 hours.
        defaultRequiredHours:
          form.defaultRequiredHours === "" ? null : Number(form.defaultRequiredHours),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (isEdit) await boardsApi.update(board._id, body);
      else await boardsApi.create(body);
      toast.success(isEdit ? "Board updated" : "Board added");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not save board"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? `Edit ${board.name}` : "Add board"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Abbreviation"
              value={form.name}
              onChange={set("name")}
              placeholder="BACB"
              required
              fullWidth
            />
            <TextField
              label="Full name (optional)"
              value={form.fullName}
              onChange={set("fullName")}
              placeholder="Behavior Analyst Certification Board"
              fullWidth
            />
            <TextField
              label="Default required hours (optional)"
              type="number"
              value={form.defaultRequiredHours}
              onChange={set("defaultRequiredHours")}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Default ratio (optional)"
              value={form.defaultRatio}
              onChange={set("defaultRatio")}
              placeholder="1:10"
              fullWidth
            />
            <TextField
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={set("sortOrder")}
              helperText="Lower numbers appear first"
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
