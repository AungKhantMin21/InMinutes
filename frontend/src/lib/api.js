import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function register({ name, email, password, jobTitle }) {
  const res = await api.post("/api/auth/register", { name, email, password, jobTitle });
  return res.data.data;
}

export async function login({ email, password }) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data.data;
}

export async function getMe() {
  const res = await api.get("/api/auth/me");
  return res.data.data;
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export async function presignUpload({ filename, contentType, title }) {
  const res = await api.post("/api/upload/presign", { filename, contentType, title });
  return res.data.data;
}

export async function confirmUpload(meetingId) {
  const res = await api.post(`/api/upload/confirm/${meetingId}`);
  return res.data.data;
}

export async function getMeetings() {
  const res = await api.get("/api/meetings");
  return res.data.data;
}

export async function getMeeting(id) {
  const res = await api.get(`/api/meetings/${id}`);
  return res.data.data;
}

export async function getMeetingTranscript(id) {
  const res = await api.get(`/api/meetings/${id}/transcript`);
  return res.data.data;
}

export async function getMeetingOutput(id) {
  const res = await api.get(`/api/meetings/${id}/output`);
  return res.data.data;
}

export async function getAudioUrl(id) {
  const res = await api.get(`/api/meetings/${id}/audio-url`);
  return res.data.data;
}

export async function confirmTranscript(id, { speakerMap, diarizedSegments }) {
  const res = await api.post(`/api/meetings/${id}/review/confirm-transcript`, { speakerMap, diarizedSegments });
  return res.data.data;
}

export async function confirmReview(id, { speakerMap, meetingMinutes, actionItems, attendees, minutesPreparedBy, datePrepared }) {
  const res = await api.post(`/api/meetings/${id}/review/confirm`, {
    speakerMap,
    meetingMinutes,
    actionItems,
    attendees,
    minutesPreparedBy,
    datePrepared,
  });
  return res.data.data;
}

export async function discardReview(id) {
  const res = await api.post(`/api/meetings/${id}/review/discard`);
  return res.data.data;
}

export async function searchEmployees(q) {
  const res = await api.get("/api/people/employees", { params: { q } });
  return res.data.data;
}

export async function searchPersons(q) {
  const res = await api.get("/api/people/persons", { params: { q } });
  return res.data.data;
}
