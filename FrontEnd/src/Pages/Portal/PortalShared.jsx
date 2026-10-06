import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";

import { formatHours } from "./portalApi";

// 100px clears the fixed header, matching Account.jsx and Login.jsx.
export const PortalContainer = styled(Stack)(({ theme }) => ({
  marginTop: "100px",
  minHeight: "70vh",
  padding: theme.spacing(2),
  gap: theme.spacing(3),
  maxWidth: "1100px",
  width: "100%",
  margin: "100px auto 0",
  // CRA's own `.App { text-align: center }` (App.css) cascades in and centres
  // every heading and label while the tables stay left-aligned. Overridden
  // here rather than in App.css so the rest of the site is left alone.
  textAlign: "left",
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
}));

export function PortalLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export function PageHeading({ title, subtitle, action }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

function StatCard({ label, value, caption, emphasis }) {
  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        flex: "1 1 200px",
        minWidth: 0,
        borderColor: emphasis ? "primary.main" : undefined,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.5, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Card>
  );
}

/**
 * The totals at the top of a supervisee dashboard.
 *
 * Hours worked and supervision hours provided are shown as two separate
 * figures and never combined — the certifying boards count them separately,
 * and a single blended number would be meaningless to every one of them.
 * The ratio is displayed verbatim as a reference, with no compliance
 * judgement attached to it.
 */
export function SummaryCards({ summary }) {
  if (!summary) return null;

  const { totalHoursWorked, requiredTotalHours, totalSupervisionHours } = summary;
  const pct = requiredTotalHours
    ? Math.min((totalHoursWorked / requiredTotalHours) * 100, 100)
    : 0;

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        <StatCard
          label="Total hours worked"
          value={formatHours(totalHoursWorked)}
          caption={
            requiredTotalHours
              ? `of ${formatHours(requiredTotalHours)} required`
              : "no requirement set"
          }
          emphasis
        />
        <StatCard
          label="Supervision hours provided"
          value={formatHours(totalSupervisionHours)}
          caption={`across ${summary.meetingCount} meeting${
            summary.meetingCount === 1 ? "" : "s"
          }`}
        />
        <StatCard
          label="Hours remaining"
          value={requiredTotalHours ? formatHours(summary.remainingHours) : "—"}
          caption={`${summary.weeksLogged} week${
            summary.weeksLogged === 1 ? "" : "s"
          } logged`}
        />
      </Box>

      {requiredTotalHours > 0 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {pct.toFixed(1)}% of required fieldwork hours
            </Typography>
            {summary.supervisionRatio && (
              <Chip
                size="small"
                variant="outlined"
                label={`Board ratio ${summary.supervisionRatio}`}
                title="Recorded for reference — the portal does not check compliance against it."
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
