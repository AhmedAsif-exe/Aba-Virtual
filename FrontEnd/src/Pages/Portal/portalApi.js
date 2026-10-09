// Supervision portal API surface and the formatters its screens share.
//
// Note the two route families: supervisee screens call `/supervision/me/...`,
// which carries no id at all, while supervisor screens pass one. That split
// is the access-control boundary, not a convenience — see
// BackEnd/Middleware/supervisionAuth.js.

import api from "axiosInstance";

export const superviseeApi = {
  dashboard: () => api.get("/supervision/me"),
  progress: () => api.get("/supervision/me/progress"),
  listHours: () => api.get("/supervision/me/hours"),
  addHours: (body) => api.post("/supervision/me/hours", body),
  updateHours: (entryId, body) => api.patch(`/supervision/me/hours/${entryId}`, body),
  deleteHours: (entryId) => api.delete(`/supervision/me/hours/${entryId}`),
  listMeetings: () => api.get("/supervision/me/meetings"),
  listAssignments: () => api.get("/supervision/me/assignments"),
  respondToAssignment: (assignmentId, body) =>
    api.patch(`/supervision/me/assignments/${assignmentId}`, body),
  attachmentUrl: (assignmentId, attachmentId) =>
    apiUrl(`/supervision/me/assignments/${assignmentId}/attachments/${attachmentId}`),
  listPayments: () => api.get("/supervision/me/payments"),
};

export const supervisorApi = {
  listSupervisees: () => api.get("/supervision/supervisees"),
  createSupervisee: (body) => api.post("/supervision/supervisees", body),
  dashboard: (id) => api.get(`/supervision/supervisees/${id}`),
  progress: (id) => api.get(`/supervision/supervisees/${id}/progress`),
  updateSupervisee: (id, body) => api.patch(`/supervision/supervisees/${id}`, body),
  resetPassword: (id) => api.post(`/supervision/supervisees/${id}/reset-password`),

  listHours: (id) => api.get(`/supervision/supervisees/${id}/hours`),
  addHours: (id, body) => api.post(`/supervision/supervisees/${id}/hours`, body),
  updateHours: (id, entryId, body) =>
    api.patch(`/supervision/supervisees/${id}/hours/${entryId}`, body),
  deleteHours: (id, entryId) => api.delete(`/supervision/supervisees/${id}/hours/${entryId}`),

  listMeetings: (id, sort = "desc") =>
    api.get(`/supervision/supervisees/${id}/meetings`, { params: { sort } }),
  addMeeting: (id, body) => api.post(`/supervision/supervisees/${id}/meetings`, body),
  updateMeeting: (id, meetingId, body) =>
    api.patch(`/supervision/supervisees/${id}/meetings/${meetingId}`, body),
  deleteMeeting: (id, meetingId) =>
    api.delete(`/supervision/supervisees/${id}/meetings/${meetingId}`),

  listAssignments: (id) => api.get(`/supervision/supervisees/${id}/assignments`),
  addAssignment: (id, body) => api.post(`/supervision/supervisees/${id}/assignments`, body),
  updateAssignment: (id, assignmentId, body) =>
    api.patch(`/supervision/supervisees/${id}/assignments/${assignmentId}`, body),
  deleteAssignment: (id, assignmentId) =>
    api.delete(`/supervision/supervisees/${id}/assignments/${assignmentId}`),
  uploadAttachments: (id, assignmentId, files) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    return api.post(`/supervision/supervisees/${id}/assignments/${assignmentId}/attachments`, form);
  },
  deleteAttachment: (id, assignmentId, attachmentId) =>
    api.delete(
      `/supervision/supervisees/${id}/assignments/${assignmentId}/attachments/${attachmentId}`,
    ),
  attachmentUrl: (id, assignmentId, attachmentId) =>
    apiUrl(`/supervision/supervisees/${id}/assignments/${assignmentId}/attachments/${attachmentId}`),

  listPayments: (id) => api.get(`/supervision/supervisees/${id}/payments`),
  setPayment: (id, month, body) => api.put(`/supervision/supervisees/${id}/payments/${month}`, body),
  remindPayment: (id, month) => api.post(`/supervision/supervisees/${id}/payments/${month}/remind`),
  clearPayment: (id, month) => api.delete(`/supervision/supervisees/${id}/payments/${month}`),

  listShares: () => api.get("/supervision/shares"),
  addShare: (email) => api.post("/supervision/shares", { email }),
  removeShare: (shareId) => api.delete(`/supervision/shares/${shareId}`),
};

/** Read-only access to another supervisor's portal (they shared it with you). */
export const sharedApi = {
  supervisors: () => api.get("/supervision/shared"),
  roster: (supervisorId) => api.get(`/supervision/shared/${supervisorId}/supervisees`),
  dashboard: (supervisorId, id) => api.get(`/supervision/shared/${supervisorId}/supervisees/${id}`),
  progress: (supervisorId, id) =>
    api.get(`/supervision/shared/${supervisorId}/supervisees/${id}/progress`),
  listHours: (supervisorId, id) =>
    api.get(`/supervision/shared/${supervisorId}/supervisees/${id}/hours`),
  listMeetings: (supervisorId, id) =>
    api.get(`/supervision/shared/${supervisorId}/supervisees/${id}/meetings`),
  listAssignments: (supervisorId, id) =>
    api.get(`/supervision/shared/${supervisorId}/supervisees/${id}/assignments`),
  attachmentUrl: (supervisorId, id, assignmentId, attachmentId) =>
    apiUrl(
      `/supervision/shared/${supervisorId}/supervisees/${id}/assignments/${assignmentId}/attachments/${attachmentId}`,
    ),
};

/** Absolute URL for a plain link (file downloads open in a new tab, where
 *  the session cookie authenticates them like any API call). */
function apiUrl(pathname) {
  const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
  return `${base}${pathname}`;
}

export const boardsApi = {
  list: (includeRetired = false) =>
    api.get("/boards", { params: includeRetired ? { all: "1" } : {} }),
  create: (body) => api.post("/boards", body),
  update: (id, body) => api.patch(`/boards/${id}`, body),
  remove: (id) => api.delete(`/boards/${id}`),
};

/* ---------------------------------------------------------------- *
 * Formatters
 * ---------------------------------------------------------------- */

/** Dates are stored at UTC midnight, so they're read back in UTC too — a
 *  local-timezone render would show the previous day west of Greenwich. */
export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "30 min", "1 hr", "1 hr 30 min" — how she describes sessions out loud. */
export function formatDuration(minutes) {
  if (!minutes) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hrs) return `${mins} min`;
  if (!mins) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export function formatHours(hours) {
  const n = Number(hours) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/** `<input type="date">` wants YYYY-MM-DD, and wants it in UTC to match. */
export function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/** "Mon 14 Sep – Sun 20 Sep 2026" for the week a picked date is filed under. */
export function weekRangeLabel(dateInput) {
  if (!dateInput) return "";
  const start = new Date(`${mondayOf(new Date(`${dateInput}T12:00:00`))}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  // Built by hand: locale formatting adds commas inconsistently across browsers.
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (d) =>
    `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return `${fmt(start)} – ${fmt(end)} ${end.getUTCFullYear()}`;
}

/**
 * "Wednesday 16 September 2026" for a date box's value. Date boxes follow the
 * computer's region (day/month or month/day), and a date typed in the other
 * order is silently turned into a different one — spelling it out under the
 * box makes that visible before saving.
 */
export function spelledDate(dateInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput || "")) return "";
  const d = new Date(`${dateInput}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "October 2026" from "2026-10". */
export function formatMonthKey(key) {
  if (!key) return "—";
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Monday of the week containing `date`, mirroring the server's bucketing. */
export function mondayOf(date = new Date()) {
  const d = new Date(date);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (new Date(utc).getUTCDay() + 6) % 7;
  return new Date(utc - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const apiError = (err, fallback) =>
  err?.response?.data?.message || fallback || "Something went wrong";
