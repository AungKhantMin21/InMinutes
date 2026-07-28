import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Register() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password, jobTitle || undefined);
      window.location.href = "/";
    } catch (err) {
      const msg = err?.response?.data?.error;
      setError(msg || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-body font-semibold text-ink text-[20px]">InMinutes</h1>
          <p className="font-body font-light text-ink-3 text-[13px]">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[13px] text-ink-2">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your name"
              className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[13px] text-ink-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[13px] text-ink-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[13px] text-ink-2">
              Job title{" "}
              <span className="text-ink-4">(optional)</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              autoComplete="organization-title"
              placeholder="e.g. Systems Specialist"
              className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4"
            />
          </div>

          {error && (
            <p className="font-body text-[13px] text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-ink text-white font-body font-medium text-[13px] hover:bg-ink-2 transition-colors duration-150 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="font-body text-[13px] text-ink-3 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-signal underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
