import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { presignUpload, confirmUpload } from "@/lib/api";

const ACCEPTED_TYPES = ["audio/mp4", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3", "audio/m4a", "audio/x-m4a"];
const ACCEPTED_EXTS = [".mp4", ".webm", ".mp3", ".wav", ".m4a"];
const MAX_SIZE = 500 * 1024 * 1024;

function validateFile(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ACCEPTED_EXTS.includes(ext)) {
    return "Unsupported format. Use MP4, WebM, MP3, WAV, or M4A.";
  }
  if (file.size > MAX_SIZE) {
    return "File too large. Maximum size is 500MB.";
  }
  return null;
}

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const err = validateFile(dropped);
    if (err) { setError(err); return; }
    setError("");
    setFile(dropped);
    if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ""));
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    const err = validateFile(selected);
    if (err) { setError(err); return; }
    setError("");
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setError("");
    setUploading(true);
    setProgress(0);

    try {
      const { meetingId, uploadUrl } = await presignUpload({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        title: title.trim(),
      });

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload to storage failed"));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      await confirmUpload(meetingId);
      navigate(`/meetings/${meetingId}`);
    } catch (err) {
      setError("Upload failed. Check your connection and try again.");
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-none p-10 text-center cursor-pointer transition-colors duration-150 ${
          isDragging ? "border-signal bg-signal-light" : "border-rule hover:border-rule-hi"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <p className="font-body font-medium text-ink">{file.name}</p>
            <p className="font-mono text-xs text-ink-4">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="font-body font-medium text-ink">
              Drop your recording here
            </p>
            <p className="font-body font-light text-ink-3 text-xs">
              or click to pick a file — MP4, WebM, MP3, WAV, M4A up to 500MB
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4 disabled:opacity-60"
          />

          {uploading && (
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full bg-ground overflow-hidden">
                <div
                  className="h-full bg-signal transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-mono text-xs text-ink-4">{progress}% uploaded</p>
            </div>
          )}

          {error && (
            <p className="font-body text-sm text-danger">{error}</p>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="w-full bg-ink text-white hover:bg-ink-2 font-body font-medium"
          >
            {uploading ? "Uploading..." : "Upload Recording"}
          </Button>
        </div>
      )}

      {error && !file && (
        <p className="font-body text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
