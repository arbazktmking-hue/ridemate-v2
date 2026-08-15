"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  const continueToApp = () => {
  if (!accepted) return;

  // Save that the user accepted the terms
  localStorage.setItem("termsAccepted", "true");

  // Check if this is a new user
  const pendingUser = localStorage.getItem("pendingUser");

  if (pendingUser) {
    // New user → create username
    router.push("/create-username");
  } else {
    // Existing user → go to profile
    router.push("/profile");
  }
};

  return (
  <main className="min-h-screen bg-black text-white px-6 pt-28 pb-12">
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-orange-500 mb-3 whitespace-nowrap">
  RideMate Terms & Conditions
</h1>
        <p className="text-zinc-400 text-lg">
          Please read and accept these terms before using RideMate.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-5">
          <p><strong>1. RideMate is a connecting platform.</strong></p>
          <p><strong>2. Users are responsible for their own safety.</strong></p>
          <p><strong>3. RideMate is not liable for accidents, injuries, theft, disputes, or any mishappening.</strong></p>
          <p><strong>4. Users must verify the identity and documents of fellow riders before any trip.</strong></p>
          <p><strong>5. Users must comply with all traffic laws and carry valid documents.</strong></p>
          <p><strong>6. RideMate is not responsible for personal belongings.</strong></p>
          <p><strong>7. Expense sharing is a private arrangement between users.</strong></p>
          <p><strong>8. Harassment, fraud, abuse, or illegal activity may lead to account suspension.</strong></p>
          <p><strong>9. RideMate is currently in beta and service availability is not guaranteed.</strong></p>
          <p><strong>10. By using RideMate, you voluntarily accept all risks associated with motorcycle travel and agree that RideMate acts only as a mediator connecting users.</strong></p>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-5 h-5"
          />
          <label className="text-lg">
            I have read and agree to the RideMate Terms & Conditions.
          </label>
        </div>

        <button
          onClick={continueToApp}
          disabled={!accepted}
          className={`mt-8 w-full py-4 rounded-2xl text-xl font-black transition ${
            accepted
              ? "bg-orange-500 text-black hover:scale-[1.02]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          Continue
        </button>

        <p className="text-center text-zinc-500 mt-4">
          Your safety is your responsibility. RideMate only helps riders connect.
        </p>
      </div>
      </div>
    </main>
  );
}