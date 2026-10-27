import * as React from "react";
import { Navigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
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
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";

import { useProjectContext } from "Utils/Context";
import { PageHeading, PortalContainer, PortalLoading } from "Pages/Portal/PortalShared";
import {
  adminApi,
  apiError,
  endOfDayUtc,
  formatDate,
  spelledDate,
  toDateInput,
} from "Pages/Portal/portalApi";

const isLive = (org) => Boolean(org.expiresAt && new Date(org.expiresAt) > new Date());

/**
 * Internal ABA Virtual screen for Custom plans (brief §7): create an
 * organisation, attach or detach its people, record an invoice or bank
 * transfer, and set or extend its expiry. Custom has no checkout.
 *
 * The guard here is cosmetic; /admin re-checks siteAdmin on every request.
 */
export default function OrganisationsAdmin() {
  const { user, loggedIn, loading: authLoading } = useProjectContext();
  const [organisations, setOrganisations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await adminApi.listOrganisations();
      setOrganisations(res.data.organisations || []);
    } catch (err) {
      toast.error(apiError(err, "Could not load organisations"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user?.siteAdmin) load();
  }, [user, load]);

  if (authLoading) return <PortalLoading />;
  if (!loggedIn) return <Navigate to="/login" state={{ from: "/admin/organisations" }} replace />;
  if (!user?.siteAdmin) return <Navigate to="/" replace />;
  if (loading) return <PortalLoading />;

  const replace = (org) =>
    setOrganisations((list) => list.map((o) => (o._id === org._id ? org : o)));
  const open = organisations.find((o) => o._id === openId);

  return (
    <PortalContainer>
      <PageHeading
        title="Custom plans"
        subtitle="Organisations on a Custom plan. Members share the organisation's plan and end date."
        action={
          <Button variant="contained" onClick={() => setCreating(true)}>
            New Custom organisation
          </Button>
        }
      />

      <Card variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Organisation</TableCell>
                <TableCell align="right">Seats</TableCell>
                <TableCell>Ends</TableCell>
                <TableCell align="right">Members</TableCell>
                <TableCell align="right">Payments</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {organisations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No Custom organisations yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {organisations.map((org) => (
                <TableRow key={org._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{org.name}</TableCell>
                  <TableCell align="right">
                    {org.seatsUsed} / {org.seatLimit}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{org.expiresAt ? formatDate(org.expiresAt) : "—"}</span>
                      <Chip
                        size="small"
                        color={isLive(org) ? "success" : "default"}
                        label={isLive(org) ? "Active" : "Ended"}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{org.members.length}</TableCell>
                  <TableCell align="right">{org.payments.length}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setOpenId(org._id)}>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {creating && (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={(org) => {
            setCreating(false);
            setOrganisations((list) => [org, ...list]);
            setOpenId(org._id);
          }}
        />
      )}
      {open && <ManageDialog org={open} onClose={() => setOpenId(null)} onChanged={replace} />}
    </PortalContainer>
  );
}

function CreateDialog({ onClose, onCreated }) {
  const [form, setForm] = React.useState({ name: "", seatLimit: "6", expiresOn: "" });
  const [saving, setSaving] = React.useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.createOrganisation({
        name: form.name,
        seatLimit: Number(form.seatLimit),
        expiresAt: endOfDayUtc(form.expiresOn),
      });
      toast.success("Organisation created");
      onCreated(res.data.organisation);
    } catch (err) {
      toast.error(apiError(err, "Could not create the organisation"));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>New Custom organisation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={set("name")} required autoFocus />
            <TextField
              label="Supervisor seats"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={form.seatLimit}
              onChange={set("seatLimit")}
              helperText="Supervisors who can log in. An admin who only manages takes no seat."
              required
            />
            <TextField
              label="Plan ends on"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.expiresOn}
              onChange={set("expiresOn")}
              helperText={form.expiresOn ? `${spelledDate(form.expiresOn)}, end of day (UTC)` : " "}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ManageDialog({ org, onClose, onChanged }) {
  const [busy, setBusy] = React.useState(false);

  const run = async (action, success) => {
    setBusy(true);
    try {
      const res = await action();
      onChanged(res.data.organisation);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(apiError(err, "That didn't work"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{org.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <PlanSection org={org} busy={busy} run={run} />
          <Divider />
          <MembersSection org={org} busy={busy} run={run} />
          <Divider />
          <PaymentsSection org={org} busy={busy} run={run} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

function PlanSection({ org, busy, run }) {
  const [extendDays, setExtendDays] = React.useState("365");
  const [expiresOn, setExpiresOn] = React.useState(toDateInput(org.expiresAt));
  const [seatLimit, setSeatLimit] = React.useState(String(org.seatLimit));

  // Follow what was saved (e.g. after "Extend"), not what the dialog opened with.
  React.useEffect(() => setExpiresOn(toDateInput(org.expiresAt)), [org.expiresAt]);
  React.useEffect(() => setSeatLimit(String(org.seatLimit)), [org.seatLimit]);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Plan</Typography>
      <Typography variant="body2" color="text.secondary">
        Ends {org.expiresAt ? formatDate(org.expiresAt) : "—"} ·{" "}
        {isLive(org) ? "active" : "ended (members are read-only)"} · {org.seatsUsed} of{" "}
        {org.seatLimit} seats used
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          label="Extend by (days)"
          type="number"
          inputProps={{ min: 1, step: 1 }}
          value={extendDays}
          onChange={(e) => setExtendDays(e.target.value)}
        />
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            run(
              () => adminApi.updateOrganisation(org._id, { extendDays: Number(extendDays) }),
              "Plan extended",
            )
          }
        >
          Extend
        </Button>
        <Typography variant="caption" color="text.secondary">
          Added to the time left, or from today if it has ended.
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          label="Or set the end date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
          helperText={expiresOn ? spelledDate(expiresOn) : " "}
        />
        <Button
          variant="outlined"
          disabled={busy || !expiresOn}
          onClick={() =>
            run(
              () => adminApi.updateOrganisation(org._id, { expiresAt: endOfDayUtc(expiresOn) }),
              "End date saved",
            )
          }
        >
          Save date
        </Button>
        <TextField
          size="small"
          label="Seats"
          type="number"
          inputProps={{ min: 1, step: 1 }}
          value={seatLimit}
          onChange={(e) => setSeatLimit(e.target.value)}
          sx={{ maxWidth: 110 }}
        />
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            run(
              () => adminApi.updateOrganisation(org._id, { seatLimit: Number(seatLimit) }),
              "Seats saved",
            )
          }
        >
          Save seats
        </Button>
      </Stack>
    </Stack>
  );
}

function MembersSection({ org, busy, run }) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("supervisor");

  const add = async (event) => {
    event.preventDefault();
    const ok = await run(() => adminApi.addMember(org._id, { email, role }), "Added to the organisation");
    if (ok) setEmail("");
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">People</Typography>
      <Alert severity="info">
        Adding someone moves their account onto this Custom plan; removing them moves it off. Their
        own records, and any pass of their own, are not changed.
      </Alert>
      {org.members.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No one yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableBody>
            {org.members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell>{m.name || "—"}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>{m.role === "admin" ? "Admin" : "Supervisor"}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    aria-label={`Remove ${m.email}`}
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Remove ${m.email} from ${org.name}?`)) return;
                      run(() => adminApi.removeMember(org._id, m.userId), "Removed");
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Stack
        component="form"
        onSubmit={add}
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
      >
        <TextField
          size="small"
          label="Account email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="supervisor">Supervisor</MenuItem>
          <MenuItem value="admin">Admin (manages only)</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined" disabled={busy}>
          Add
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        The person must already have an ABA Virtual account.
      </Typography>
    </Stack>
  );
}

function PaymentsSection({ org, busy, run }) {
  const empty = { method: "invoice", reference: "", amount: "", currency: "EUR" };
  const [form, setForm] = React.useState(empty);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const add = async (event) => {
    event.preventDefault();
    const ok = await run(
      () => adminApi.recordPayment(org._id, { ...form, amount: Number(form.amount) }),
      "Payment recorded",
    );
    if (ok) setForm(empty);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Payments</Typography>
      {org.payments.length > 0 && (
        <Table size="small">
          <TableBody>
            {org.payments.map((p) => (
              <TableRow key={p._id}>
                <TableCell>{formatDate(p.createdAt)}</TableCell>
                <TableCell>{p.method === "invoice" ? "Invoice" : "Bank transfer"}</TableCell>
                <TableCell>{p.reference}</TableCell>
                <TableCell align="right">
                  {p.currency} {Number(p.amount).toLocaleString("en-US")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Stack
        component="form"
        onSubmit={add}
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
      >
        <TextField size="small" select label="Paid by" value={form.method} onChange={set("method")} sx={{ minWidth: 150 }}>
          <MenuItem value="invoice">Invoice</MenuItem>
          <MenuItem value="bank_transfer">Bank transfer</MenuItem>
        </TextField>
        <TextField size="small" label="Reference" value={form.reference} onChange={set("reference")} required sx={{ flex: 1 }} />
        <TextField
          size="small"
          label="Amount"
          type="number"
          inputProps={{ min: 0, step: "0.01" }}
          value={form.amount}
          onChange={set("amount")}
          required
          sx={{ maxWidth: 130 }}
        />
        <TextField size="small" select label="Currency" value={form.currency} onChange={set("currency")} sx={{ minWidth: 100 }}>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="PKR">PKR</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined" disabled={busy}>
          Record
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Recording a payment doesn't change the end date; extend it above.
      </Typography>
    </Stack>
  );
}
