"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";

import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  const [accepted, setAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // VERIFY AUTHENTICATION
  // =========================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (!firebaseUser) {
            router.replace("/login");
            return;
          }

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [router]);

  // =========================================================
  // ACCEPT TERMS
  // =========================================================

  const continueToApp =
    async () => {
      if (!accepted) {
        return;
      }

      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {
        alert(
          "Your login session has expired. Please login again."
        );

        router.replace(
          "/login"
        );

        return;
      }

      try {
        setSaving(true);

        const uid =
          firebaseUser.uid;

        // ---------------------------------------------------
        // SAVE ACCEPTANCE TO FIRESTORE
        // ---------------------------------------------------

        await updateDoc(
          doc(
            db,
            "users",
            uid
          ),
          {
            termsAccepted:
              true,

            termsAcceptedAt:
              Date.now(),
          }
        );

        // ---------------------------------------------------
        // SAVE USER-SPECIFIC LOCAL FLAG
        // ---------------------------------------------------

        localStorage.setItem(
          `termsAccepted_${uid}`,
          "true"
        );

        // Remove old global flag
        localStorage.removeItem(
          "termsAccepted"
        );

        // ---------------------------------------------------
        // ENTER APP
        // ---------------------------------------------------

        router.replace(
          "/profile"
        );
      } catch (error) {
        console.error(
          "Failed to save terms acceptance:",
          error
        );

        alert(
          "Unable to save your acceptance. Please try again."
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main
        className="
          min-h-screen
          bg-black
          text-white
          flex
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <div
            className="
              text-3xl
              font-black
              text-orange-500
            "
          >
            RideMate 🏍️
          </div>

          <p
            className="
              text-zinc-500
              mt-3
            "
          >
            Checking your login...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // TERMS PAGE
  // =========================================================

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        px-6
        py-10
      "
    >
      <div
        className="
          max-w-4xl
          mx-auto
          pt-4
          pb-12
        "
      >
        {/* HEADER */}

        <div
          className="
            mb-10
          "
        >
          <h1
            className="
              text-3xl
              md:text-4xl
              font-black
              text-orange-500
              mb-3
            "
          >
            RideMate Terms & Conditions
          </h1>

          <p
            className="
              text-zinc-400
              text-lg
            "
          >
            Please read and accept these terms
            before using RideMate.
          </p>
        </div>

        {/* TERMS */}

        <div
          className="
            bg-zinc-900
            border
            border-zinc-800
            rounded-3xl
            p-8
            space-y-5
          "
        >
          <p>
            <strong>
              1. RideMate is a connecting platform.
            </strong>
          </p>

          <p>
            <strong>
              2. Users are responsible for their own safety.
            </strong>
          </p>

          <p>
            <strong>
              3. RideMate is not liable for accidents,
              injuries, theft, disputes, or any mishappening.
            </strong>
          </p>

          <p>
            <strong>
              4. Users must verify the identity and
              documents of fellow riders before any trip.
            </strong>
          </p>

          <p>
            <strong>
              5. Users must comply with all traffic laws
              and carry valid documents.
            </strong>
          </p>

          <p>
            <strong>
              6. RideMate is not responsible for personal belongings.
            </strong>
          </p>

          <p>
            <strong>
              7. Expense sharing is a private arrangement
              between users.
            </strong>
          </p>

          <p>
            <strong>
              8. Harassment, fraud, abuse, or illegal
              activity may lead to account suspension.
            </strong>
          </p>

          <p>
            <strong>
              9. RideMate is currently in beta and service
              availability is not guaranteed.
            </strong>
          </p>

          <p>
            <strong>
              10. By using RideMate, you voluntarily accept
              all risks associated with motorcycle travel
              and agree that RideMate acts only as a mediator
              connecting users.
            </strong>
          </p>
        </div>

        {/* ACCEPTANCE */}

        <div
          className="
            mt-8
            flex
            items-start
            gap-3
          "
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) =>
              setAccepted(
                e.target.checked
              )
            }
            className="
              w-5
              h-5
              mt-1
              accent-orange-500
            "
          />

          <label
            className="
              text-lg
            "
          >
            I have read and agree to the
            RideMate Terms & Conditions.
          </label>
        </div>

        {/* CONTINUE */}

        <button
          onClick={
            continueToApp
          }
          disabled={
            !accepted ||
            saving
          }
          className={`
            mt-8
            w-full
            py-4
            rounded-2xl
            text-xl
            font-black
            transition
            ${
              accepted && !saving
                ? "bg-orange-500 text-black hover:scale-[1.02]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }
          `}
        >
          {saving
            ? "Saving..."
            : "I Agree & Continue"}
        </button>

        <p
          className="
            text-center
            text-zinc-500
            mt-4
          "
        >
          Your safety is your responsibility.
          RideMate only helps riders connect.
        </p>
      </div>
    </main>
  );
}