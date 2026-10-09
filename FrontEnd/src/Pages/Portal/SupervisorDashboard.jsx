import * as React from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { toast } from "react-toastify";

import { useProjectContext } from "Utils/Context";

import { PageHeading, PortalContainer, PortalLoading } from "./PortalShared";
import {
  apiError,
  boardsApi,
  formatDate,
  formatHours,
  spelledDate,
  supervisorApi,
} from "./portalApi";

const STATUS_COLOR = { active: "success", paused: "warning", completed: "default" };

/** The supervisor's roster. Only her own supervisees are ever returned. */
export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const { user } = useProjectContext();
  const plan = user?.supervisionPlan;
  // Plans don't auto-renew, so the reminder is the only nudge they get.
  const renewSoon = plan?.active && !plan.complimentary && plan.daysLeft <= 7;

  const load = React.useCallback(async () => {
    try {
      const res = await supervisorApi.listSupervisees();
      setRows(res.data.supervisees || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load supervisees"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PortalLoading />;

  return (
    <PortalContainer>
      <PageHeading
        title="Supervisees"
        subtitle={`${rows.length} ${rows.length === 1 ? "person" : "people"} under supervision`}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setShareOpen(true)}>
              Share access
            </Button>
            <Button variant="outlined" onClick={() => navigate("/portal/boards")}>
              Manage boards
            </Button>
            <Button variant="contained" onClick={() => setAddOpen(true)}>
              Add supervisee
            </Button>
          </Stack>
        }
      />

      {renewSoon && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" onClick={() => navigate("/supervision-plans")}>
              Renew
            </Button>
          }
        >
          Your plan ends on {formatDate(plan.expiresAt)} ({plan.daysLeft}{" "}
          {plan.daysLeft === 1 ? "day" : "days"} left). Renew to keep access — any time left is
          added on.
        </Alert>
      )}

      {rows.length === 0 && (
        <Alert severity="info">
          No supervisees yet. Use <strong>Add supervisee</strong> to create an
          account — they can't sign themselves up.
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2 }}>
        {rows.map((row) => (
          <SuperviseeCard
            key={row._id}
            row={row}
            onOpen={() => navigate(`/portal/supervisees/${row._id}`)}
          />
        ))}
      </Box>

      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}

      {addOpen && (
        <AddSuperviseeDialog
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}
    </PortalContainer>
  );
}

/** One roster row. Shared with the read-only view (SharedWithMe.jsx), which
 *  gets no `payment` on its rows and so shows no payment marker. */
export function SuperviseeCard({ row, onOpen }) {
  const { summary } = row;
  const pct = summary.requiredTotalHours
    ? Math.min((summary.totalHoursWorked / summary.requiredTotalHours) * 100, 100)
    : 0;

  return (
    <Card
      variant="outlined"
      onClick={onOpen}
      sx={{ p: 2.5, cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar src={row.pfp} />
        <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {row.email}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          {row.board && <Chip size="small" label={row.board.name} />}
          <Chip
            size="small"
            variant="outlined"
            color={STATUS_COLOR[row.status]}
            label={row.status}
          />
          <PaymentMarker payment={row.payment} />
        </Stack>

        <Box sx={{ display: "flex", gap: 3, ml: { md: "auto" } }}>
          <Metric label="Worked" value={formatHours(summary.totalHoursWorked)} />
          <Metric label="Supervision" value={formatHours(summary.totalSupervisionHours)} />
          <Metric
            label="Last meeting"
            value={summary.lastMeetingDate ? formatDate(summary.lastMeetingDate) : "—"}
          />
        </Box>
      </Box>

      {summary.requiredTotalHours > 0 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary">
            {formatHours(summary.totalHoursWorked)} of{" "}
            {formatHours(summary.requiredTotalHours)} hours ({pct.toFixed(1)}%)
          </Typography>
        </Box>
      )}
    </Card>
  );
}

/** Green/red for this month's fee; red too if any earlier month is unpaid.
 *  Icon and words as well as colour, so it reads without colour vision. */
function PaymentMarker({ payment }) {
  if (!payment) return null;
  const owing = payment.unpaidMonths?.length || 0;
  if (owing > 0) {
    return (
      <Chip
        size="small"
        color="error"
        icon={<ErrorIcon />}
        label={owing === 1 ? "Unpaid" : `${owing} months unpaid`}
      />
    );
  }
  if (payment.thisMonth === "paid") {
    return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Paid" />;
  }
  return null;
}

function Metric({ label, value }) {
  return (
    <Box sx={{ textAlign: "right" }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Creating a supervisee is the only way portal access is granted. If the
 * email already has a site account (a training customer, say) the server
 * links it instead of creating a second one, and no temporary password is
 * issued because they already have their own.
 */
function AddSuperviseeDialog({ onClose, onCreated }) {
  const [boards, setBoards] = React.useState([]);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    boardId: "",
    requiredTotalHours: "",
    supervisionRatio: "",
    supervisionStartDate: new Date().toISOString().slice(0, 10),
    contactPhone: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [result, setResult] = React.useState(null);

  React.useEffect(() => {
    boardsApi
      .list()
      .then((res) => setBoards(res.data.boards || []))
      .catch((err) => toast.error(apiError(err, "Could not load boards")));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Picking a board prefills its defaults, but only into empty fields — it
  // must never overwrite figures already typed for this person.
  const handleBoardChange = (e) => {
    const boardId = e.target.value;
    const board = boards.find((b) => b._id === boardId);
    setForm((f) => ({
      ...f,
      boardId,
      requiredTotalHours:
        f.requiredTotalHours || (board?.defaultRequiredHours ?? "").toString(),
      supervisionRatio: f.supervisionRatio || board?.defaultRatio || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await supervisorApi.createSupervisee(form);
      setResult(res.data);
      toast.success("Supervisee added");
    } catch (err) {
      toast.error(apiError(err, "Could not add supervisee"));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Dialog open onClose={onCreated} fullWidth maxWidth="xs">
        <DialogTitle>{form.name} added</DialogTitle>
        <DialogContent>
          {result.inviteEmailSent ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              A welcome email with their sign-in details was sent to {form.email}.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              The welcome email couldn't be sent. Please share the details below with them
              yourself.
            </Alert>
          )}
          {result.linkedExistingAccount ? (
            <Alert severity="info">
              {form.email} already had an account on the site, so it's been
              linked. They sign in with their existing password.
            </Alert>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {result.inviteEmailSent
                  ? "It's in their email too. Keep a copy if you like — it can't be shown again here."
                  : "Copy this temporary password now — it isn't stored and can't be shown again."}{" "}
                They'll be asked to change it when they first sign in.
              </Alert>
              <TextField
                label="Temporary password"
                value={result.tempPassword}
                InputProps={{ readOnly: true }}
                onFocus={(e) => e.target.select()}
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onCreated}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add supervisee</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full name" value={form.name} onChange={set("name")} required fullWidth />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              helperText="They sign in with this address"
              required
              fullWidth
            />
            <TextField
              select
              label="Certifying board"
              value={form.boardId}
              onChange={handleBoardChange}
              required
              fullWidth
            >
              {boards.map((board) => (
                <MenuItem key={board._id} value={board._id}>
                  {board.name}
                  {board.fullName ? ` — ${board.fullName}` : ""}
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
                required
                fullWidth
              />
              <TextField
                label="Supervision ratio (optional)"
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
                helperText={spelledDate(form.supervisionStartDate)}
                required
                fullWidth
              />
              <TextField
                label="Phone (optional)"
                value={form.contactPhone}
                onChange={set("contactPhone")}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Adding…" : "Add supervisee"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/**
 * Read-only access for people outside the portal — the supervisor's own
 * supervisor, say. They see every supervisee's dashboard, hours, meetings,
 * progress and assignments, but no private notes or payments, and cannot
 * change anything. Removing an email ends their access immediately.
 */
function ShareDialog({ onClose }) {
  const [shares, setShares] = React.useState(null);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await supervisorApi.listShares();
      setShares(res.data.shares || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load shared access"));
      setShares([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const add = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await supervisorApi.addShare(email.trim());
      if (res.data.emailSent) toast.success("Access shared — invitation emailed");
      else toast.warning("Access shared, but the invitation email failed. Let them know yourself.");
      setEmail("");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not share access"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (share) => {
    if (!window.confirm(`Remove ${share.email}'s access?`)) return;
    try {
      await supervisorApi.removeShare(share._id);
      toast.success("Access removed");
      load();
    } catch (err) {
      toast.error(apiError(err, "Could not remove access"));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share view-only access</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Anyone you add can view all your supervisees' progress, hours, meetings and
          assignments. They can't make changes, and they don't see your private notes or
          payments. They sign in with the email you add here.
        </Typography>

        <Box component="form" onSubmit={add} sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            label="Email address"
            type="email"
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={busy || !email.trim()}>
            {busy ? "Sharing…" : "Share"}
          </Button>
        </Box>

        {shares === null ? (
          <LinearProgress />
        ) : shares.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Not shared with anyone yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {shares.map((share) => (
              <Box
                key={share._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-all" }}>
                    {share.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shared {formatDate(share.createdAt)}
                  </Typography>
                </Box>
                <Button size="small" color="error" onClick={() => remove(share)}>
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
