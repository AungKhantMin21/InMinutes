import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds) {
  if (!isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const AudioPlayer = forwardRef(function AudioPlayer(
  { audioUrl, contentType, onTimeUpdate },
  ref
) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
      }
    },
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handleTimeUpdate() {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    }
    function handleDurationChange() {
      setDuration(audio.duration);
    }
    function handlePlay() { setPlaying(true); }
    function handlePause() { setPlaying(false); }
    function handleEnded() { setPlaying(false); }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  function handleProgressClick(e) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function selectSpeed(s) {
    setSpeed(s);
    setSpeedOpen(false);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-rule">
      <audio ref={audioRef} preload="metadata">
        <source src={audioUrl} type={contentType} />
      </audio>

      <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="font-mono text-[13px] text-ink-2 w-6 text-center shrink-0 hover:text-ink transition-colors duration-150"
        >
          {playing ? "⏸" : "▶"}
        </button>

        <span className="font-mono text-[11px] text-ink-4 shrink-0 w-10 text-right">
          {formatTime(currentTime)}
        </span>

        <div
          className="flex-1 h-1 bg-ground cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full bg-ink-3 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="font-mono text-[11px] text-ink-4 shrink-0 w-10">
          {formatTime(duration)}
        </span>

        <div className="relative shrink-0">
          <button
            onClick={() => setSpeedOpen((o) => !o)}
            className="font-mono text-[11px] text-ink-4 hover:text-ink-3 transition-colors duration-150 w-10 text-right"
          >
            {speed}×
          </button>
          {speedOpen && (
            <div className="absolute right-0 bottom-full mb-1 bg-white border border-rule shadow-sm z-30">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => selectSpeed(s)}
                  className={`block w-full text-right px-3 py-1.5 font-mono text-[11px] hover:bg-ground transition-colors duration-100 ${
                    s === speed ? "text-ink" : "text-ink-3"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
