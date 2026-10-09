import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";

import { apiError, formatHours } from "./portalApi";

// Categorical slots 1–2 of the reference palette (validated as an adjacent
// pair for colour-blind readers); chrome stays neutral so the data leads.
const COLORS = {
  primary: "#2a78d6",
  secondary: "#eb6834",
  grid: "#e6e6e3",
  axis: "#52514e",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08" → "Aug 26" on the axis, "August 2026" in tooltips and tiles. */
const shortMonth = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;
const longMonth = (key) => `${FULL_MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

const pct = (v) => (v === null || v === undefined ? "—" : `${formatHours(v)}%`);
const hrs = (v) => `${formatHours(v)} hr`;

const RANGES = [
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 0, label: "All" },
];

/**
 * Month-by-month progress, drawn from what is already logged — the week
 * entries, the meetings and the completed assignments. Nothing is typed in
 * twice: log an hour or a meeting and the charts follow.
 *
 * One measure per chart, never two y-axes: fieldwork runs in the tens of
 * hours a month and supervision in single figures, so sharing an axis would
 * flatten supervision to nothing. Each tab is its own chart instead.
 *
 * `refreshKey` changes whenever the dashboard reloads after an edit, which is
 * what makes the charts update without a page refresh.
 */
export default function ProgressSection({ progressApi, refreshKey }) {
  const [months, setMonths] = React.useState(null);
  const [range, setRange] = React.useState(12);
  const [tab, setTab] = React.useState("fieldwork");

  React.useEffect(() => {
    let cancelled = false;
    progressApi
      .load()
      .then((res) => !cancelled && setMonths(res.data.months || []))
      .catch((err) => toast.error(apiError(err, "Could not load progress")));
    return () => {
      cancelled = true;
    };
  }, [progressApi, refreshKey]);

  const rows = React.useMemo(() => {
    if (!months) return [];
    return range ? months.slice(-range) : months;
  }, [months, range]);

  if (!months) return null;

  const hasAnyData = months.some(
    (m) => m.fieldworkHours || m.supervisionHours || m.assignmentsCompleted,
  );
  // Only for supervisors who use assignments — the rest never see the tab.
  const usesAssignments = months.some((m) => m.assignmentsCompleted > 0);
  // Ratings are optional too: the tab and tile appear once one is given.
  const usesRatings = months.some((m) => m.averageRating != null);
  const hiddenTab =
    (tab === "assignments" && !usesAssignments) || (tab === "rating" && !usesRatings);
  const activeTab = hiddenTab ? "fieldwork" : tab;

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
          <Typography variant="h6">Monthly progress</Typography>
          <Typography variant="body2" color="text.secondary">
            Built automatically from the hours, meetings and assignments logged below.
          </Typography>
        </Box>
        {hasAnyData && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={range}
            onChange={(_, v) => v !== null && setRange(v)}
          >
            {RANGES.map((r) => (
              <ToggleButton key={r.value} value={r.value} sx={{ textTransform: "none", px: 1.5 }}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {!hasAnyData ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          The charts appear once hours or supervision meetings are logged.
        </Typography>
      ) : (
        <>
          <MonthComparison
            months={months}
            usesAssignments={usesAssignments}
            usesRatings={usesRatings}
          />

          <Tabs
            value={activeTab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider", mt: 3, mb: 2 }}
          >
            <Tab value="fieldwork" label="Fieldwork hours" sx={{ textTransform: "none" }} />
            <Tab value="supervision" label="Supervision hours" sx={{ textTransform: "none" }} />
            <Tab value="percentage" label="Supervision %" sx={{ textTransform: "none" }} />
            <Tab value="cumulative" label="Cumulative supervision" sx={{ textTransform: "none" }} />
            {usesAssignments && (
              <Tab value="assignments" label="Assignments completed" sx={{ textTransform: "none" }} />
            )}
            {usesRatings && (
              <Tab value="rating" label="Average rating" sx={{ textTransform: "none" }} />
            )}
            <Tab value="table" label="Table" sx={{ textTransform: "none" }} />
          </Tabs>

          {activeTab === "fieldwork" && (
            <SingleBarChart rows={rows} dataKey="fieldworkHours" name="Fieldwork hours" format={hrs} />
          )}
          {activeTab === "supervision" && <SupervisionChart rows={rows} />}
          {activeTab === "percentage" && (
            <SingleLineChart
              rows={rows}
              dataKey="supervisionPct"
              name="Supervision %"
              format={pct}
              tickFormat={(v) => `${v}%`}
              note="Supervision hours ÷ fieldwork hours × 100, per month. Months with no fieldwork are left blank."
            />
          )}
          {activeTab === "cumulative" && (
            <SingleLineChart
              rows={rows}
              dataKey="cumulativeSupervisionHours"
              name="Cumulative supervision hours"
              format={hrs}
              note="Running total of supervision hours since supervision began."
            />
          )}
          {activeTab === "assignments" && (
            <SingleBarChart
              rows={rows}
              dataKey="assignmentsCompleted"
              name="Assignments completed"
              format={(v) => String(v)}
              integer
            />
          )}
          {activeTab === "rating" && (
            <SingleLineChart
              rows={rows}
              dataKey="averageRating"
              name="Average rating"
              format={(v) => (v == null ? "—" : `${formatHours(v)} / 10`)}
              domain={[0, 10]}
              connectNulls
              note="Average of the 1–10 scores given in each month. Months without a score are skipped."
            />
          )}
          {activeTab === "table" && (
            <ProgressTable rows={rows} usesAssignments={usesAssignments} usesRatings={usesRatings} />
          )}
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- *
 * This month against last month
 * ---------------------------------------------------------------- */

function MonthComparison({ months, usesAssignments, usesRatings }) {
  const current = months.at(-1);
  const previous = months.length > 1 ? months.at(-2) : null;

  const tiles = [
    { label: "Fieldwork hours", key: "fieldworkHours", format: formatHours, unit: " hr" },
    { label: "Supervision hours", key: "supervisionHours", format: formatHours, unit: " hr" },
    { label: "Supervision %", key: "supervisionPct", format: pct, unit: " pts" },
  ];
  if (usesAssignments) {
    tiles.push({
      label: "Assignments completed",
      key: "assignmentsCompleted",
      format: String,
      unit: "",
    });
  }
  if (usesRatings) {
    tiles.push({
      label: "Average rating",
      key: "averageRating",
      format: (v) => (v == null ? "—" : `${formatHours(v)}/10`),
      unit: "",
    });
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {longMonth(current.month)}
        {previous ? ` compared with ${longMonth(previous.month)}` : ""}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
        {tiles.map((t) => (
          <Box
            key={t.key}
            sx={{
              flex: "1 1 150px",
              minWidth: 0,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {t.format(current[t.key])}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {describeChange(t, current, previous)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Neutral wording on purpose: fewer hours in a month isn't automatically
 *  bad news, so the change is stated, not coloured as a win or a loss. */
function describeChange(tile, current, previous) {
  if (!previous) return "first month";
  const now = current[tile.key];
  const before = previous[tile.key];
  const prevLabel = shortMonth(previous.month);
  // A percentage with no fieldwork behind it can't be compared, only shown.
  if (now === null || before === null) return `${prevLabel}: ${tile.format(before)}`;
  const diff = Math.round((now - before) * 100) / 100;
  if (diff === 0) return `same as ${prevLabel}`;
  return `${diff > 0 ? "+" : "−"}${formatHours(Math.abs(diff))}${tile.unit} vs ${prevLabel}`;
}

/* ---------------------------------------------------------------- *
 * Charts — one measure each, one y-axis each
 * ---------------------------------------------------------------- */

const CHART_HEIGHT = 280;

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: COLORS.axis, fontSize: 12 },
};

function ChartTooltip({ active, payload, label, format, showTotal }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 2,
        px: 1.5,
        py: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
        {longMonth(label)}
      </Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: p.color }} />
          <Typography variant="caption">
            {p.name}: {format(p.value)}
          </Typography>
        </Box>
      ))}
      {showTotal && (
        <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mt: 0.5 }}>
          Total: {format(total)}
        </Typography>
      )}
    </Box>
  );
}

function ChartNote({ children }) {
  if (!children) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
      {children}
    </Typography>
  );
}

function SingleBarChart({ rows, dataKey, name, format, integer = false }) {
  return (
    <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} />
          <YAxis allowDecimals={!integer} {...axisProps} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={<ChartTooltip format={format} />}
          />
          <Bar dataKey={dataKey} name={name} fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

/** Individual + group stacked: together they are the month's supervision. */
function SupervisionChart({ rows }) {
  return (
    <>
      <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={<ChartTooltip format={hrs} showTotal />}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              wrapperStyle={{ fontSize: 12, color: COLORS.axis, paddingBottom: 8 }}
            />
            {/* White stroke = the 2px gap between stacked segments. */}
            <Bar
              dataKey="individualHours"
              name="Individual"
              stackId="supervision"
              fill={COLORS.primary}
              stroke="#fff"
              strokeWidth={1}
              maxBarSize={36}
            />
            <Bar
              dataKey="groupHours"
              name="Group"
              stackId="supervision"
              fill={COLORS.secondary}
              stroke="#fff"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <ChartNote>Individual and group supervision stack to the month's total.</ChartNote>
    </>
  );
}

function SingleLineChart({ rows, dataKey, name, format, tickFormat, note, domain, connectNulls = false }) {
  return (
    <>
      <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} />
            <YAxis tickFormatter={tickFormat} domain={domain} {...axisProps} />
            <Tooltip
              cursor={{ stroke: COLORS.axis, strokeDasharray: "3 3" }}
              content={<ChartTooltip format={format} />}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              connectNulls={connectNulls}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <ChartNote>{note}</ChartNote>
    </>
  );
}

/* ---------------------------------------------------------------- *
 * Every variable, month by month — for comparing exact figures
 * ---------------------------------------------------------------- */

function ProgressTable({ rows, usesAssignments, usesRatings }) {
  const newestFirst = [...rows].reverse();
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Month</TableCell>
            <TableCell align="right">Fieldwork hrs</TableCell>
            <TableCell align="right">Supervision hrs</TableCell>
            <TableCell align="right">Supervision %</TableCell>
            <TableCell align="right">Individual hrs</TableCell>
            <TableCell align="right">Group hrs</TableCell>
            <TableCell align="right">Cumulative supervision hrs</TableCell>
            {usesAssignments && <TableCell align="right">Assignments completed</TableCell>}
            {usesRatings && <TableCell align="right">Average rating</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {newestFirst.map((m) => (
            <TableRow key={m.month} hover>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{longMonth(m.month)}</TableCell>
              <TableCell align="right">{formatHours(m.fieldworkHours)}</TableCell>
              <TableCell align="right">{formatHours(m.supervisionHours)}</TableCell>
              <TableCell align="right">{pct(m.supervisionPct)}</TableCell>
              <TableCell align="right">{formatHours(m.individualHours)}</TableCell>
              <TableCell align="right">{formatHours(m.groupHours)}</TableCell>
              <TableCell align="right">{formatHours(m.cumulativeSupervisionHours)}</TableCell>
              {usesAssignments && <TableCell align="right">{m.assignmentsCompleted}</TableCell>}
              {usesRatings && (
                <TableCell align="right">
                  {m.averageRating == null ? "—" : formatHours(m.averageRating)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
