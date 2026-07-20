import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

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
