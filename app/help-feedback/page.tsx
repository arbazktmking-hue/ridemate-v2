"use client";

import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";
import PageBackground from "../components/PageBackground";

export default function HelpFeedbackPage() {
  const router = useRouter();

  const [feedbackType, setFeedbackType] = useState("Share Feedback");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async () => {
    if (!message.trim()) {
      alert("Please enter your feedback.");
      return;
    }

    try {
      setSubmitting(true);

      const savedUser = localStorage.getItem("ridemateUser");

      if (!savedUser) {
        alert("Please login before submitting feedback.");
        router.push("/login");
        return;
      }

      const user = JSON.parse(savedUser);

      await addDoc(collection(db, "feedback"), {
        userId: user.uid || "",
        userName: user.name || "Unknown User",
        userEmail: user.email || "",
        type: feedbackType,
        message: message.trim(),
        createdAt: Date.now(),
        status: "new",
      });

      setMessage("");
      setSubmitted(true);
    } catch (error) {
      console.error("Feedback submission failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageBackground>
      <main className="min-h-screen text-white px-4 pt-24 pb-10">
        <div className="max-w-2xl mx-auto">

          {/* Header */}

          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-zinc-400 hover:text-white transition mb-5"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-black text-orange-500">
              Help & Feedback
            </h1>

            <p className="text-zinc-400 mt-2">
              We’re building RideMate for riders like you.
              Tell us how we can make it better.
            </p>
          </div>

          {/* Success Message */}

          {submitted ? (
            <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 text-center">

              <div className="text-5xl mb-4">
                ✅
              </div>

              <h2 className="text-2xl font-black">
                Thank you!
              </h2>

              <p className="text-zinc-400 mt-2">
                Your feedback has been successfully submitted.
                It helps us improve RideMate.
              </p>

              <button
                onClick={() => setSubmitted(false)}
                className="
                  mt-6
                  bg-orange-500
                  hover:bg-orange-600
                  text-black
                  font-black
                  px-6
                  py-3
                  rounded-xl
                  transition
                "
              >
                Send More Feedback
              </button>
            </div>
          ) : (

            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-6 shadow-xl">

              {/* Feedback Type */}

              <label className="block text-sm font-bold text-zinc-300 mb-3">
                What would you like to tell us?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">

                {[
                  "Report a Problem",
                  "Suggest a Feature",
                  "Share Feedback",
                  "Ask a Question",
                  "Report a Rider / Trip",
                ].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFeedbackType(type)}
                    className={`
                      text-left
                      px-4
                      py-3
                      rounded-xl
                      border
                      transition
                      ${
                        feedbackType === type
                          ? "bg-orange-500/15 border-orange-500 text-orange-500"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                      }
                    `}
                  >
                    {type}
                  </button>
                ))}

              </div>

              {/* Message */}

              <label className="block text-sm font-bold text-zinc-300 mb-3">
                Your message
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what happened, what you would like to see, or how we can improve RideMate..."
                rows={7}
                maxLength={2000}
                className="
                  w-full
                  bg-zinc-900
                  border
                  border-zinc-800
                  focus:border-orange-500
                  outline-none
                  rounded-xl
                  p-4
                  text-white
                  placeholder:text-zinc-600
                  resize-none
                  transition
                "
              />

              <div className="text-right text-xs text-zinc-600 mt-2">
                {message.length}/2000
              </div>

              {/* Submit */}

              <button
                onClick={submitFeedback}
                disabled={submitting}
                className="
                  w-full
                  mt-5
                  bg-orange-500
                  hover:bg-orange-600
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  text-black
                  font-black
                  py-4
                  rounded-xl
                  transition
                "
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Feedback"}
              </button>

            </div>
          )}

          {/* Footer */}

          <div className="text-center mt-8 text-sm text-zinc-600">
            Every suggestion helps us make RideMate better. 🏍️
          </div>

        </div>
      </main>
    </PageBackground>
  );
}