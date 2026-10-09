import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { toast } from "react-toastify";

import { apiError, formatDate, formatMonthKey, toDateInput } from "./portalApi";

// Status is never colour alone: each state also has its own icon and word.
const STATES = {
  paid: { label: "Paid", color: "success.main", bg: "rgba(46,125,50,0.08)", Icon: CheckCircleIcon },
  unpaid: { label: "Unpaid", color: "error.main", bg: "rgba(211,47,47,0.08)", Icon: ErrorIcon },
  none: { label: "Not recorded", color: "text.secondary", bg: "transparent", Icon: RemoveCircleOutlineIcon },
};

const MAX_MONTHS_SHOWN = 24;

const monthKeyOf = (date) => toDateInput(date).slice(0, 7);

/** Newest first: this month back to the start of supervision (or the oldest record). */
function monthsToShow(startDate, payments, currentMonth) {
  const keys = payments.map((p) => p.month);
  if (startDate) keys.push(monthKeyOf(startDate));
  const oldest = keys.length ? keys.sort()[0] : currentMonth;
  const months = [];
  let [y, m] = currentMonth.split("-").map(Number);
  while (months.length < MAX_MONTHS_SHOWN) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    months.push(key);
    if (key <= oldest) break;
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return months;
}

/**
 * Supervision fee, month by month: green = paid, red = unpaid, grey = not
 * recorded. The supervisor's own record of money paid outside the site.
 *
 * mode "supervisor": click a month to set it; marking it unpaid emails the
 * supervisee a reminder (on by default), and a reminder can be resent.
 * mode "supervisee": read-only, and hidden until the supervisor records one.
 */
export default function PaymentsSection({ paymentsApi, mode = "supervisee", startDate, onChanged }) {
  const isSupervisor = mode === "supervisor";
  const [payments, setPayments] = React.useState(null);
  const [currentMonth, setCurrentMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [editing, setEditing] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const res = await paymentsApi.list();
      setPayments(res.data.payments || []);
      if (res.data.currentMonth) setCurrentMonth(res.data.currentMonth);
    } catch (err) {
      toast.error(apiError(err, "Could not load payments"));
      setPayments([]);
    }
  }, [paymentsApi]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!payments) return null;
  if (!isSupervisor && payments.length === 0) return null;

  const byMonth = new Map(payments.map((p) => [p.month, p]));
  const months = monthsToShow(startDate, payments, currentMonth);
  const unpaid = payments.filter((p) => p.status === "unpaid").map((p) => p.month).sort();

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6">Payments</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isSupervisor
          ? "Supervision fee by month. Click a month to mark it paid or unpaid — unpaid emails them a reminder."
          : "Your supervision fee by month, as recorded by your supervisor."}
      </Typography>

      {unpaid.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unpaid: {unpaid.map(formatMonthKey).join(", ")}
          {!isSupervisor && ". Please contact your supervisor if you've already paid."}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
        }}
      >
        {months.map((month) => {
          const record = byMonth.get(month);
          const state = STATES[record?.status || "none"];
          const tile = (
            <Box
              sx={{
                width: "100%",
                textAlign: "left",
                border: 1,
                borderColor: record ? state.color : "divider",
                bgcolor: state.bg,
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatMonthKey(month)}
                {month === currentMonth ? " · this month" : ""}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: state.color }}>
                <state.Icon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {state.label}
                </Typography>
                {record?.amount && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {record.amount}
                  </Typography>
                )}
              </Box>
            </Box>
          );
          return isSupervisor ? (
            <ButtonBase
              key={month}
              onClick={() => setEditing({ month, record })}
              sx={{ borderRadius: 1, display: "block" }}
            >
              {tile}
            </ButtonBase>
          ) : (
            <Box key={month}>{tile}</Box>
          );
        })}
      </Box>

      {editing && (
        <PaymentDialog
          month={editing.month}
          record={editing.record}
          paymentsApi={paymentsApi}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
}

function PaymentDialog({ month, record, paymentsApi, onClose, onSaved }) {
  const [status, setStatus] = React.useState(record?.status || "paid");
  const [amount, setAmount] = React.useState(record?.amount || "");
  const [note, setNote] = React.useState(record?.note || "");
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const becomingUnpaid = status === "unpaid" && record?.status !== "unpaid";

  const save = async () => {
    setBusy(true);
    try {
      if (status === "none") {
        if (record) await paymentsApi.clear(month);
        toast.success(`${formatMonthKey(month)} cleared`);
      } else {
        const res = await paymentsApi.set(month, { status, amount, note, notify });
        const { emailSent } = res.data;
        if (emailSent === true) toast.success("Marked unpaid — reminder emailed");
        else if (emailSent === false) toast.warning("Marked unpaid, but the reminder email failed to send");
        else toast.success(`${formatMonthKey(month)} marked ${status}`);
      }
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not save payment"));
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    setBusy(true);
    try {
      await paymentsApi.remind(month);
      toast.success("Reminder emailed");
      onSaved();
    } catch (err) {
      toast.error(apiError(err, "Could not send reminder"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{formatMonthKey(month)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={status}
            onChange={(_, v) => v && setStatus(v)}
            size="small"
          >
            <ToggleButton value="paid" color="success" sx={{ textTransform: "none" }}>
              Paid
            </ToggleButton>
            <ToggleButton value="unpaid" color="error" sx={{ textTransform: "none" }}>
              Unpaid
            </ToggleButton>
            <ToggleButton value="none" sx={{ textTransform: "none" }}>
              Not recorded
            </ToggleButton>
          </ToggleButtonGroup>

          {status !== "none" && (
            <>
              <TextField
                label="Amount (optional)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. Rs 15,000"
                inputProps={{ maxLength: 50 }}
                fullWidth
              />
              <TextField
                label="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                inputProps={{ maxLength: 500 }}
                fullWidth
              />
            </>
          )}

          {becomingUnpaid && (
            <FormControlLabel
              control={<Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
              label="Email the supervisee a payment reminder"
            />
          )}

          {record?.status === "unpaid" && status === "unpaid" && (
            <Box>
              <Button variant="outlined" color="error" onClick={remind} disabled={busy}>
                Send reminder again
              </Button>
              {record.reminderSentAt && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Last reminder sent {formatDate(record.reminderSentAt)}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
