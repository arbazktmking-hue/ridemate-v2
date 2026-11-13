
"use client";

import { useState } from "react";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/request-account-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          reason: reason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to submit your request."
        );
      }

      setSuccess(true);
      setMessage(
        result.message ||
          "A verification link has been sent to the email address provided. Please check your inbox."
      );

      setEmail("");
      setUsername("");
      setReason("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b12] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] p-6 sm:p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold">RideMate</h1>
          <p className="mt-2 text-sm text-gray-400">
            Account Deletion Request
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-3">
          Request to delete your account
        </h2>

        <p className="text-sm leading-6 text-gray-300 mb-6">
          If you no longer wish to use RideMate, you can request
          deletion of your account using this page. You do not
          need to log in to submit a request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-2">
              Registered email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">
              RideMate username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your RideMate username"
              className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="You can tell us why you want to leave RideMate"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <p className="text-xs leading-5 text-gray-400">
            Submitting this form starts an account deletion
            request. You must verify ownership through the
            verification email before your request can be
            processed. Your account will not be deleted merely
            by submitting this form.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-3 font-semibold transition"
          >
            {loading ? "Submitting..." : "Submit Deletion Request"}
          </button>

          {message && (
            <p
              role="status"
              className={`text-sm text-center ${
                success ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-8 border-t border-white/10 pt-5">
          <h3 className="font-semibold text-sm mb-2">
            What happens after you submit?
          </h3>

          <p className="text-xs leading-5 text-gray-400">
            After you verify your email and account ownership,
            RideMate will process your eligible account deletion
            request within 30 days. Your account and associated
            personal data will be deleted, except for information
            that must be retained for applicable legal,
            security, or fraud-prevention purposes.
          </p>

          <p className="text-xs leading-5 text-gray-400 mt-3">
            For questions or assistance, contact us at:
            {" "}
            <a
              href="mailto:arbazktmking@gmail.com"
              className="text-orange-400 hover:underline"
            >
              arbazktmking@gmail.com
            </a>
          </p>

          <p className="text-xs leading-5 mt-3">
            <a
              href="/privacy-policy"
              className="text-orange-400 hover:underline"
            >
              Read RideMate Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
