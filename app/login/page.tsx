"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  // =========================================================
  // ONBOARDING
  // =========================================================

  const [showOnboarding, setShowOnboarding] =
    useState(true);

  const [currentSlide, setCurrentSlide] =
    useState(0);

  // =========================================================
  // LOGIN FORM
  // =========================================================

  const [username, setUsername] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // =========================================================
  // ONBOARDING SLIDES
  // =========================================================

  const slides = [
    "/onboarding/new-slide1.png",
    "/onboarding/new-slide2.png",
    "/onboarding/new-slide3.png",
    "/onboarding/slide6.png.png",
  ];

  // =========================================================
  // CHECK WHETHER ONBOARDING WAS ALREADY COMPLETED
  // =========================================================

  useEffect(() => {
    const onboardingCompleted =
      localStorage.getItem(
        "ridemateOnboardingCompleted"
      );

    if (
      onboardingCompleted ===
      "true"
    ) {
      setShowOnboarding(false);
    }
  }, []);

  // =========================================================
  // NEXT SLIDE
  // =========================================================

  const nextSlide = () => {
    if (
      currentSlide <
      slides.length - 1
    ) {
      setCurrentSlide(
        currentSlide + 1
      );
    } else {
      finishOnboarding();
    }
  };

  // =========================================================
  // PREVIOUS SLIDE
  // =========================================================

  const previousSlide = () => {
    if (
      currentSlide >
      0
    ) {
      setCurrentSlide(
        currentSlide - 1
      );
    }
  };

  // =========================================================
  // FINISH ONBOARDING
  // =========================================================

  const finishOnboarding = () => {
    localStorage.setItem(
      "ridemateOnboardingCompleted",
      "true"
    );

    setShowOnboarding(false);
  };

  // =========================================================
  // SWIPE SUPPORT
  // =========================================================

  const [touchStart, setTouchStart] =
    useState<number | null>(null);

  const [touchEnd, setTouchEnd] =
    useState<number | null>(null);

  const handleTouchStart = (
    e: React.TouchEvent
  ) => {
    setTouchStart(
      e.targetTouches[0].clientX
    );
  };

  const handleTouchMove = (
    e: React.TouchEvent
  ) => {
    setTouchEnd(
      e.targetTouches[0].clientX
    );
  };

  const handleTouchEnd = () => {
    if (
      touchStart === null ||
      touchEnd === null
    ) {
      return;
    }

    const distance =
      touchStart -
      touchEnd;

    const minimumSwipe = 50;

    if (
      distance >
      minimumSwipe
    ) {
      nextSlide();
    }

    if (
      distance <
      -minimumSwipe
    ) {
      previousSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // =========================================================
  // GOOGLE LOGIN
  // =========================================================

  const loginWithGoogle =
    async () => {
      try {
        // ---------------------------------------------------
        // VALIDATE NAME
        // ---------------------------------------------------

        const cleanUsername =
          username.trim();

        if (!cleanUsername) {
          alert(
            "Please enter your name."
          );
          return;
        }

        if (
          cleanUsername.length < 3
        ) {
          alert(
            "Your name must be at least 3 characters."
          );
          return;
        }

        // ---------------------------------------------------
        // VALIDATE GENDER
        // ---------------------------------------------------

        if (!gender) {
          alert(
            "Please select your gender."
          );
          return;
        }

        setLoading(true);

        // ---------------------------------------------------
        // GOOGLE AUTH
        // ---------------------------------------------------

        const provider =
          new GoogleAuthProvider();

        const result =
          await signInWithPopup(
            auth,
            provider
          );

        const firebaseUser =
          result.user;

        const uid =
          firebaseUser.uid;

        // ---------------------------------------------------
        // USER DOCUMENT
        // ---------------------------------------------------

        const userRef =
          doc(
            db,
            "users",
            uid
          );

        const userDoc =
          await getDoc(
            userRef
          );

        // ===================================================
        // EXISTING USER
        // ===================================================

        if (
          userDoc.exists()
        ) {
          const user =
            userDoc.data();

          // -----------------------------------------------
          // Keep existing username
          // -----------------------------------------------

          const existingUsername =
            user.username ||
            user.name ||
            cleanUsername;

          const existingImage =
            user.image ||
            firebaseUser.photoURL ||
            "";

          const existingEmail =
            user.email ||
            firebaseUser.email ||
            "";

          // -----------------------------------------------
          // Update gender only if needed
          // -----------------------------------------------

          await updateDoc(
            userRef,
            {
              gender:
                gender,

              genderUpdatedAt:
                Date.now(),
            }
          );

          // -----------------------------------------------
          // REPAIR USERNAME DOCUMENT IF MISSING
          // -----------------------------------------------

          const usernameKey =
            existingUsername
              .trim()
              .toLowerCase();

          if (usernameKey) {
            const usernameRef =
              doc(
                db,
                "usernames",
                usernameKey
              );

            const usernameDoc =
              await getDoc(
                usernameRef
              );

            if (
              !usernameDoc.exists()
            ) {
              await setDoc(
                usernameRef,
                {
                  uid,
                  username:
                    existingUsername,
                  createdAt:
                    Date.now(),
                }
              );
            }
          }

          // -----------------------------------------------
          // LOCAL STORAGE
          // -----------------------------------------------

          localStorage.setItem(
            "ridemateUser",
            JSON.stringify({
              uid,

              email:
                existingEmail,

              image:
                existingImage,

              name:
                existingUsername,

              gender:
                gender,
            })
          );

          // -----------------------------------------------
          // CHECK TERMS
          // -----------------------------------------------

          const userTermsAccepted =
            user.termsAccepted ===
            true;

          const localTermsAccepted =
            localStorage.getItem(
              `termsAccepted_${uid}`
            ) === "true";

          if (
            userTermsAccepted ||
            localTermsAccepted
          ) {
            localStorage.setItem(
              `termsAccepted_${uid}`,
              "true"
            );

            router.replace(
              "/profile"
            );
          } else {
            router.replace(
              "/terms"
            );
          }

          return;
        }

        // ===================================================
        // NEW USER
        // ===================================================

        const finalUsername =
          cleanUsername;

        const finalEmail =
          firebaseUser.email ||
          "";

        const finalImage =
          firebaseUser.photoURL ||
          "";

        const usernameKey =
          finalUsername
            .toLowerCase();

        const usernameRef =
          doc(
            db,
            "usernames",
            usernameKey
          );

        // ---------------------------------------------------
        // ATOMIC USER + USERNAME CREATION
        // ---------------------------------------------------

        await runTransaction(
          db,
          async (transaction) => {

            // Check username
            const usernameDoc =
              await transaction.get(
                usernameRef
              );

            if (
              usernameDoc.exists()
            ) {
              throw new Error(
                "USERNAME_ALREADY_EXISTS"
              );
            }

            // ---------------------------------------------
            // CREATE USERNAME DOCUMENT
            // ---------------------------------------------

            transaction.set(
              usernameRef,
              {
                uid,

                username:
                  finalUsername,

                createdAt:
                  Date.now(),
              }
            );

            // ---------------------------------------------
            // CREATE USER DOCUMENT
            // ---------------------------------------------

            transaction.set(
              userRef,
              {
                uid,

                username:
                  finalUsername,

                email:
                  finalEmail,

                image:
                  finalImage,

                gender:
                  gender,

                termsAccepted:
                  false,

                createdAt:
                  Date.now(),
              }
            );
          }
        );

        // ---------------------------------------------------
        // SAVE PENDING USER
        // ---------------------------------------------------

        localStorage.setItem(
          "pendingUser",
          JSON.stringify({
            uid,

            email:
              finalEmail,

            image:
              finalImage,

            username:
              finalUsername,

            gender:
              gender,
          })
        );

        // ---------------------------------------------------
        // SAVE CURRENT USER
        // ---------------------------------------------------

        localStorage.setItem(
          "ridemateUser",
          JSON.stringify({
            uid,

            email:
              finalEmail,

            image:
              finalImage,

            name:
              finalUsername,

            gender:
              gender,
          })
        );

        // ---------------------------------------------------
        // REMOVE OLD TERMS FLAG
        // ---------------------------------------------------

        localStorage.removeItem(
          "termsAccepted"
        );

        localStorage.removeItem(
          `termsAccepted_${uid}`
        );

        // ---------------------------------------------------
        // GO TO TERMS
        // ---------------------------------------------------

        router.replace(
          "/terms"
        );

      } catch (error: any) {
        console.error(
          "Google login failed:",
          error
        );

        // ---------------------------------------------------
        // DUPLICATE USERNAME
        // ---------------------------------------------------

        if (
          error?.message ===
          "USERNAME_ALREADY_EXISTS"
        ) {
          alert(
            "Username already exists. Please choose another one."
          );
          return;
        }

        // ---------------------------------------------------
        // FIREBASE PERMISSION ERROR
        // ---------------------------------------------------

        if (
          error?.code ===
          "permission-denied"
        ) {
          alert(
            "Firebase permission denied. Please check your Firestore rules."
          );
          return;
        }

        // ---------------------------------------------------
        // OTHER ERROR
        // ---------------------------------------------------

        alert(
          error?.message ||
            "Login failed. Please try again."
        );

      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // ONBOARDING SCREEN
  // =========================================================

  if (showOnboarding) {
    return (
      <main
        className="
          fixed
          inset-0
          bg-black
          text-white
          overflow-hidden
        "
      >

        <div
          className="
            relative
            w-full
            h-full
            flex
            items-center
            justify-center
          "
          onTouchStart={
            handleTouchStart
          }
          onTouchMove={
            handleTouchMove
          }
          onTouchEnd={
            handleTouchEnd
          }
        >

          <img
            src={
              slides[
                currentSlide
              ]
            }
            alt={`RideMate onboarding slide ${
              currentSlide + 1
            }`}
            className="
              w-full
              h-full
              object-cover
              select-none
              pointer-events-none
            "
          />

          {/* =================================================
              SLIDE INDICATORS
          ================================================= */}

          <div
            className="
              absolute
              bottom-6
              left-0
              right-0
              flex
              items-center
              justify-center
              gap-2
              px-6
              z-20
            "
          >

            {slides.map(
              (_, index) => (
                <button
                  key={index}
                  onClick={() =>
                    setCurrentSlide(
                      index
                    )
                  }
                  className={`
                    transition-all
                    duration-300
                    rounded-full
                    ${
                      currentSlide ===
                      index
                        ? "w-8 h-2 bg-orange-500"
                        : "w-2 h-2 bg-white/40"
                    }
                  `}
                  aria-label={`Go to slide ${
                    index + 1
                  }`}
                />
              )
            )}

          </div>

          {/* =================================================
              PREVIOUS BUTTON
          ================================================= */}

          {currentSlide > 0 && (
            <button
              onClick={
                previousSlide
              }
              className="
                absolute
                left-4
                md:left-8
                top-1/2
                -translate-y-1/2
                z-20
                w-11
                h-11
                rounded-full
                bg-black/50
                backdrop-blur-md
                border
                border-white/20
                text-white
                text-xl
                flex
                items-center
                justify-center
                hover:bg-black/70
                transition
              "
              aria-label="Previous slide"
            >
              ←
            </button>
          )}

          {/* =================================================
              NEXT BUTTON
          ================================================= */}

          <button
            onClick={
              nextSlide
            }
            className="
              absolute
              right-5
              md:right-10
              bottom-16
              md:bottom-12
              z-20
              bg-orange-500
              hover:bg-orange-600
              text-black
              font-black
              px-6
              md:px-8
              py-3
              md:py-4
              rounded-2xl
              shadow-xl
              shadow-orange-500/20
              transition
              hover:scale-105
            "
          >
            {currentSlide ===
            slides.length - 1
              ? "Get Started →"
              : "Next →"}
          </button>

          {/* =================================================
              SKIP
          ================================================= */}

          <button
            onClick={
              finishOnboarding
            }
            className="
              absolute
              top-6
              right-6
              md:top-8
              md:right-10
              z-20
              text-white
              font-bold
              text-sm
              md:text-base
              bg-black/30
              backdrop-blur-md
              px-4
              py-2
              rounded-full
              hover:bg-black/60
              transition
            "
          >
            Skip
          </button>

        </div>

      </main>
    );
  }

  // =========================================================
  // LOGIN SCREEN
  // =========================================================

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        flex
        items-center
        justify-center
        px-5
        py-10
      "
    >

      <div
        className="
          bg-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-7
          md:p-10
          max-w-md
          w-full
          text-center
          shadow-2xl
          shadow-black/50
        "
      >

        {/* =================================================
            LOGO
        ================================================= */}

        <div
          className="
            flex
            justify-center
            mb-5
          "
        >

          <img
            src="/icon-192.png"
            alt="RideMate"
            className="
              w-28
              h-28
              object-cover
              rounded-full
            "
          />

        </div>

        <h1
          className="
            text-4xl
            md:text-5xl
            font-black
            text-orange-500
          "
        >
          RideMate 🏍️
        </h1>

        <p
          className="
            text-zinc-400
            mt-3
          "
        >
          Ride together. Explore more.
        </p>

        {/* =================================================
            NAME
        ================================================= */}

        <div
          className="
            text-left
            mt-8
          "
        >

          <label
            className="
              block
              text-sm
              font-bold
              text-zinc-300
              mb-2
            "
          >
            Your Name
          </label>

          <input
            type="text"
            value={
              username
            }
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            placeholder="Enter your name"
            maxLength={50}
            className="
              w-full
              bg-black
              border
              border-zinc-800
              focus:border-orange-500
              outline-none
              rounded-2xl
              px-5
              py-4
              text-white
              placeholder:text-zinc-600
              transition
            "
          />

        </div>

        {/* =================================================
            GENDER
        ================================================= */}

        <div
          className="
            text-left
            mt-5
          "
        >

          <label
            className="
              block
              text-sm
              font-bold
              text-zinc-300
              mb-2
            "
          >
            Gender
          </label>

          <select
            value={
              gender
            }
            onChange={(e) =>
              setGender(
                e.target.value
              )
            }
            className="
              w-full
              bg-black
              border
              border-zinc-800
              focus:border-orange-500
              outline-none
              rounded-2xl
              px-5
              py-4
              text-white
              transition
            "
          >

            <option
              value=""
              disabled
            >
              Select your gender
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>

            <option value="Other">
              Other
            </option>

            <option value="Prefer not to say">
              Prefer not to say
            </option>

          </select>

        </div>

        {/* =================================================
            GOOGLE LOGIN
        ================================================= */}

        <button
          onClick={
            loginWithGoogle
          }
          disabled={
            loading
          }
          className="
            w-full
            bg-orange-500
            hover:bg-orange-600
            disabled:opacity-50
            disabled:cursor-not-allowed
            py-4
            rounded-2xl
            text-lg
            font-black
            mt-7
            transition
            hover:scale-[1.02]
            active:scale-[0.98]
          "
        >

          {loading
            ? "Signing in..."
            : "Continue with Google"}

        </button>

        <p
          className="
            text-xs
            text-zinc-600
            mt-5
            leading-relaxed
          "
        >
          By continuing, you agree to RideMate's
          terms and community guidelines.
        </p>

        {/* =================================================
            VIEW ONBOARDING AGAIN
        ================================================= */}

        <button
          onClick={() => {
            setCurrentSlide(
              0
            );

            setShowOnboarding(
              true
            );
          }}
          className="
            text-orange-500
            text-sm
            font-bold
            mt-5
            hover:text-orange-400
            transition
          "
        >
          ↻ View RideMate introduction
        </button>

      </div>

    </main>
  );
}