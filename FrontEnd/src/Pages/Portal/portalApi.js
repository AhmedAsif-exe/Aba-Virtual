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
};

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

/** Monday of the week containing `date`, mirroring the server's bucketing. */
export function mondayOf(date = new Date()) {
  const d = new Date(date);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (new Date(utc).getUTCDay() + 6) % 7;
  return new Date(utc - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const apiError = (err, fallback) =>
  err?.response?.data?.message || fallback || "Something went wrong";
