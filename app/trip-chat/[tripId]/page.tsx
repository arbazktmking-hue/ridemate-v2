"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  ShieldCheck,
  Send,
} from "lucide-react";


/* =========================================================
   TYPES
========================================================= */

type AdminView = {
  active: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  startedAt?: number;
};


export default function TripChatPage() {

  const params = useParams();

  const tripId =
    params.tripId as string;


  /* =========================================================
     STATE
  ========================================================= */

  const [chat, setChat] =
    useState<any>(null);

  const [messages, setMessages] =
    useState<any[]>([]);

  const [message, setMessage] =
    useState("");

  const [rating, setRating] =
    useState(5);

  const [review, setReview] =
    useState("");

  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const [loading, setLoading] =
    useState(true);


  /* =========================================================
     ADMIN INVESTIGATION MODE
  ========================================================= */

  const isAdminView =
    Boolean(
      adminView?.active &&
      adminView?.userName
    );


  /* =========================================================
     LOAD USER / ADMIN VIEW
  ========================================================= */

  useEffect(() => {

    try {

      /* =====================================================
         CHECK ADMIN INVESTIGATION MODE FIRST
      ===================================================== */

      const savedAdminView =
        localStorage.getItem(
          "ridemateAdminView"
        );


      if (savedAdminView) {

        const parsedAdminView =
          JSON.parse(
            savedAdminView
          );


        if (
          parsedAdminView?.active &&
          parsedAdminView?.userName
        ) {

          setAdminView(
            parsedAdminView
          );


          /*
           * IMPORTANT:
           *
           * This does NOT change Firebase Auth.
           *
           * It only tells this page whose
           * trip-chat information should be read.
           */

          setCurrentUser({

            uid:
              parsedAdminView.userId ||
              "",

            name:
              parsedAdminView.userName,

            email:
              parsedAdminView.userEmail ||
              "",

            image:
              parsedAdminView.userImage ||
              "",

          });


          return;

        }

      }


      /* =====================================================
         NORMAL USER
      ===================================================== */

      const savedUser =
        localStorage.getItem(
          "ridemateUser"
        );


      if (savedUser) {

        setCurrentUser(
          JSON.parse(
            savedUser
          )
        );

      }

    } catch (error) {

      console.error(
        "Failed to load user:",
        error
      );

    }

  }, []);


  /* =========================================================
     LOAD CHAT
  ========================================================= */

  useEffect(() => {

    if (!tripId) {
      return;
    }


    loadChat();

  }, [tripId]);


  async function loadChat() {

    try {

      console.log(
        "Route tripId:",
        tripId
      );


      if (!tripId) {

        console.log(
          "tripId is undefined"
        );

        return;

      }


      const chatRef =
        doc(
          db,
          "tripChats",
          tripId
        );


      const snap =
        await getDoc(
          chatRef
        );


      console.log(
        "Document exists:",
        snap.exists()
      );


      if (snap.exists()) {

        console.log(
          "Chat Data:",
          snap.data()
        );


        setChat(
          snap.data()
        );

      } else {

        console.log(
          "No tripChat document found with ID:",
          tripId
        );

      }

    } catch (error) {

      console.error(
        "Failed to load trip chat:",
        error
      );

    }

  }


  /* =========================================================
     LOAD MESSAGES
  ========================================================= */

  useEffect(() => {

    if (!tripId) {
      return;
    }


    loadMessages();


    const interval =
      setInterval(
        loadMessages,
        1000
      );


    return () =>
      clearInterval(
        interval
      );

  }, [tripId]);


  async function loadMessages() {

    try {

      if (!tripId) {
        return;
      }


      const snapshot =
        await getDocs(
          collection(
            db,
            "tripChatMessages"
          )
        );


      const msgs: any[] =
        [];


      snapshot.forEach(
        (messageDoc) => {

          const data =
            messageDoc.data();


          if (
            data.tripId ===
            tripId
          ) {

            msgs.push(
              data
            );

          }

        }
      );


      msgs.sort(
        (a, b) =>
          (a.createdAt || 0) -
          (b.createdAt || 0)
      );


      setMessages(
        msgs
      );

      setLoading(false);

    } catch (error) {

      console.error(
        "Failed to load trip chat messages:",
        error
      );

      setLoading(false);

    }

  }


  /* =========================================================
     CHECK EXISTING REVIEW
  ========================================================= */

  useEffect(() => {

    if (
      chat &&
      currentUser?.name
    ) {

      checkExistingReview();

    }

  }, [
    chat,
    currentUser,
  ]);


  async function checkExistingReview() {

    if (!tripId) {
      return;
    }


    if (!currentUser?.name) {
      return;
    }


    try {

      const snapshot =
        await getDocs(
          collection(
            db,
            "rideReviews"
          )
        );


      let found = false;


      snapshot.forEach(
        (reviewDoc) => {

          const data =
            reviewDoc.data();


          if (
            data.tripId ===
              tripId &&

            data.reviewer ===
              currentUser.name
          ) {

            found = true;

          }

        }
      );


      setAlreadyReviewed(
        found
      );

    } catch (error) {

      console.error(
        "Failed to check review:",
        error
      );

    }

  }


  /* =========================================================
     COMPLETE TRIP
  ========================================================= */

  async function completeTrip() {

    /*
     * ADMIN INVESTIGATION MODE
     * IS READ ONLY.
     */

    if (isAdminView) {

      alert(
        "Trip completion is disabled while using Admin Investigation Mode."
      );

      return;

    }


    if (!tripId) {
      return;
    }


    const confirmed =
      confirm(
        "Are you sure you want to mark this trip as completed?"
      );


    if (!confirmed) {
      return;
    }


    try {

      /* =====================================================
         MARK CHAT AS COMPLETED
      ===================================================== */

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          completed: true,
          reviewedUsers: [],
        }
      );


      /* =====================================================
         MARK TRIP AS COMPLETED
      ===================================================== */

      if (chat?.tripId) {

        await updateDoc(
          doc(
            db,
            "trips",
            chat.tripId
          ),
          {
            status: "completed",
          }
        );

      }


      await loadChat();


      alert(
        "🏁 Trip marked as completed!"
      );

    } catch (error) {

      console.error(
        "Failed to complete trip:",
        error
      );

      alert(
        "Failed to complete the trip. Please try again."
      );

    }

  }


  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  async function sendMessage() {

    /*
     * ADMIN INVESTIGATION MODE
     * IS READ ONLY.
     */

    if (isAdminView) {

      alert(
        "Messaging is disabled while using Admin Investigation Mode."
      );

      return;

    }


    if (!currentUser?.name) {
      return;
    }


    if (!message.trim()) {
      return;
    }


    try {

      await addDoc(
        collection(
          db,
          "tripChatMessages"
        ),
        {

          tripId,

          sender:
            currentUser.name,

          text:
            message.trim(),

          createdAt:
            Date.now(),

        }
      );


      setMessage("");


      await loadMessages();

    } catch (error) {

      console.error(
        "Failed to send message:",
        error
      );

      alert(
        "Failed to send message. Please try again."
      );

    }

  }


  /* =========================================================
     SUBMIT REVIEW
  ========================================================= */

  async function submitReview() {

    /*
     * ADMIN INVESTIGATION MODE
     * IS READ ONLY.
     */

    if (isAdminView) {

      alert(
        "Review submission is disabled while using Admin Investigation Mode."
      );

      return;

    }


    if (alreadyReviewed) {

      alert(
        "You have already reviewed this ride."
      );

      return;

    }


    if (!chat || !tripId) {
      return;
    }


    if (!currentUser?.name) {
      return;
    }


    try {

      /* =====================================================
         ADD REVIEW
      ===================================================== */

      await addDoc(
        collection(
          db,
          "rideReviews"
        ),
        {

          tripId,

          rider:
            chat.owner,

          reviewer:
            currentUser.name,

          rating,

          review:
            review.trim(),

          createdAt:
            Date.now(),

        }
      );


      /* =====================================================
         MARK USER AS REVIEWED
      ===================================================== */

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          reviewedUsers:
            arrayUnion(
              currentUser.name
            ),
        }
      );


      setAlreadyReviewed(
        true
      );


      alert(
        "⭐ Review submitted successfully!"
      );

    } catch (error) {

      console.error(
        "Failed to submit review:",
        error
      );

      alert(
        "Failed to submit review. Please try again."
      );

    }

  }


  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (
    !chat ||
    !currentUser?.name
  ) {

    return (

      <main
        className="
          min-h-screen
          bg-black
          text-white
          flex
          items-center
          justify-center
          p-6
        "
      >

        Loading...

      </main>

    );

  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <main
      className="
        min-h-screen
        bg-black
        text-white
        p-4
        sm:p-6
      "
    >

      <div
        className="
          max-w-4xl
          mx-auto
          pt-16
          sm:pt-20
        "
      >

        {/* =================================================
            ADMIN INVESTIGATION NOTICE
        ================================================= */}

        {isAdminView && (

          <div
            className="
              mb-6
              rounded-2xl
              border
              border-orange-500/30
              bg-orange-500/10
              px-4
              py-4
              flex
              items-start
              gap-3
            "
          >

            <ShieldCheck
              size={22}
              className="
                text-orange-500
                flex-shrink-0
                mt-0.5
              "
            />


            <div>

              <p
                className="
                  text-orange-400
                  font-black
                  text-sm
                "
              >
                🛡️ INVESTIGATION MODE
              </p>


              <p
                className="
                  text-zinc-300
                  text-sm
                  mt-1
                "
              >
                Viewing{" "}
                <span
                  className="
                    text-white
                    font-bold
                  "
                >
                  {adminView?.userName}
                </span>
                's Live Trip Chat.
              </p>


              <p
                className="
                  text-zinc-500
                  text-xs
                  mt-1
                "
              >
                Read-only investigation mode. Messages,
                trip completion, and reviews cannot be changed.
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            TRIP HEADER
        ================================================= */}

        <h1
          className="
            text-4xl
            sm:text-5xl
            font-black
            text-orange-500
          "
        >
          🏍 {chat.destination}
        </h1>


        <p
          className="
            text-zinc-400
            mt-2
          "
        >
          Live Trip Chat
        </p>


        {/* =================================================
            CHAT CONTAINER
        ================================================= */}

        <div
          className="
            mt-6
            bg-zinc-900
            rounded-3xl
            p-4
            sm:p-5
            h-[70vh]
            flex
            flex-col
            border
            border-zinc-800
          "
        >

          {/* =================================================
              MESSAGES
          ================================================= */}

          <div
            className="
              flex-1
              overflow-y-auto
              space-y-3
              pr-1
            "
          >

            {loading && (

              <div
                className="
                  h-full
                  flex
                  items-center
                  justify-center
                  text-zinc-500
                "
              >
                Loading messages...
              </div>

            )}


            {!loading &&
              messages.length === 0 && (

                <div
                  className="
                    h-full
                    flex
                    items-center
                    justify-center
                    text-zinc-500
                    text-sm
                    text-center
                  "
                >
                  No messages in this trip chat yet.
                </div>

              )}


            {!loading &&
              messages.map(
                (msg, index) => (

                  <div
                    key={index}
                    className={`
                      max-w-[75%]
                      p-3
                      rounded-2xl
                      ${
                        msg.sender ===
                        currentUser.name
                          ? "ml-auto bg-orange-500 text-black"
                          : "bg-zinc-800"
                      }
                    `}
                  >

                    <div
                      className="
                        text-xs
                        font-bold
                        mb-1
                      "
                    >
                      {msg.sender}
                    </div>


                    <div>
                      {msg.text}
                    </div>

                  </div>

                )
              )}

          </div>


          {/* =================================================
              BOTTOM ACTION AREA
          ================================================= */}

          <div
            className="
              mt-4
              space-y-3
            "
          >

            {/* =================================================
                COMPLETED TRIP
            ================================================= */}

            {chat.completed ? (

              <div
                className="
                  bg-green-900
                  text-green-300
                  p-4
                  rounded-xl
                  text-center
                  font-bold
                "
              >

                🏁 This trip has been completed.


                {/* =========================================
                    ADMIN MODE — REVIEW READ ONLY
                ========================================= */}

                {isAdminView && (

                  <div
                    className="
                      mt-4
                      bg-black/20
                      border
                      border-orange-500/20
                      p-3
                      rounded-xl
                      text-orange-400
                      text-sm
                    "
                  >

                    🛡️ Review submission is disabled in
                    Investigation Mode.

                  </div>

                )}


                {/* =========================================
                    NORMAL PASSENGER REVIEW
                ========================================= */}

                {!isAdminView &&
                  currentUser.name !==
                    chat.owner &&
                  !alreadyReviewed && (

                    <div
                      className="
                        mt-4
                        bg-zinc-800
                        p-4
                        rounded-xl
                        space-y-3
                        text-left
                      "
                    >

                      <h2
                        className="
                          font-bold
                          text-orange-400
                        "
                      >
                        ⭐ Rate Your Rider
                      </h2>


                      <select
                        value={rating}
                        onChange={(e) =>
                          setRating(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="
                          w-full
                          p-3
                          rounded-lg
                          bg-black
                        "
                      >

                        <option value={5}>
                          ⭐⭐⭐⭐⭐
                        </option>

                        <option value={4}>
                          ⭐⭐⭐⭐
                        </option>

                        <option value={3}>
                          ⭐⭐⭐
                        </option>

                        <option value={2}>
                          ⭐⭐
                        </option>

                        <option value={1}>
                          ⭐
                        </option>

                      </select>


                      <textarea
                        value={review}
                        onChange={(e) =>
                          setReview(
                            e.target.value
                          )
                        }
                        placeholder="Share your experience..."
                        className="
                          w-full
                          p-3
                          rounded-lg
                          bg-black
                        "
                      />


                      <button
                        onClick={
                          submitReview
                        }
                        className="
                          w-full
                          bg-orange-500
                          text-black
                          font-bold
                          py-3
                          rounded-xl
                          hover:bg-orange-400
                          transition
                        "
                      >
                        Submit Review
                      </button>

                    </div>

                  )}


                {/* =========================================
                    ALREADY REVIEWED
                ========================================= */}

                {!isAdminView &&
                  currentUser.name !==
                    chat.owner &&
                  alreadyReviewed && (

                    <div
                      className="
                        mt-4
                        bg-zinc-800
                        p-3
                        rounded-xl
                        text-zinc-400
                        text-sm
                      "
                    >
                      ⭐ You have already reviewed this ride.
                    </div>

                  )}

              </div>

            ) : (

              /* =================================================
                 ACTIVE TRIP
              ================================================= */

              <>

                {/* =============================================
                    ADMIN MODE — NO MESSAGE INPUT
                ============================================= */}

                {isAdminView ? (

                  <div
                    className="
                      bg-orange-500/5
                      border
                      border-orange-500/20
                      rounded-xl
                      p-4
                      text-center
                    "
                  >

                    <p
                      className="
                        text-orange-400
                        font-bold
                        text-sm
                      "
                    >
                      🛡️ Read-only investigation
                    </p>


                    <p
                      className="
                        text-zinc-500
                        text-xs
                        mt-1
                      "
                    >
                      Sending messages is disabled while
                      investigating this trip chat.
                    </p>

                  </div>

                ) : (

                  /* =========================================
                     NORMAL MESSAGE INPUT
                  ========================================= */

                  <div
                    className="
                      flex
                      gap-3
                    "
                  >

                    <input
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {

                        if (
                          e.key ===
                          "Enter"
                        ) {

                          sendMessage();

                        }

                      }}
                      placeholder="Type message..."
                      className="
                        flex-1
                        p-3
                        rounded-xl
                        bg-zinc-800
                        border
                        border-zinc-700
                        outline-none
                        focus:border-orange-500
                      "
                    />


                    <button
                      onClick={
                        sendMessage
                      }
                      className="
                        bg-orange-500
                        px-5
                        sm:px-6
                        rounded-xl
                        font-bold
                        text-black
                        flex
                        items-center
                        gap-2
                        hover:bg-orange-400
                        transition
                      "
                    >

                      <Send
                        size={18}
                      />

                      <span>
                        Send
                      </span>

                    </button>

                  </div>

                )}


                {/* =============================================
                    COMPLETE TRIP BUTTON
                ============================================= */}

                {!isAdminView &&
                  currentUser.name ===
                    chat.owner && (

                    <button
                      onClick={
                        completeTrip
                      }
                      className="
                        w-full
                        bg-green-600
                        hover:bg-green-500
                        py-3
                        rounded-xl
                        font-bold
                        transition
                      "
                    >
                      🏁 Trip Completed
                    </button>

                  )}

              </>

            )}

          </div>

        </div>

      </div>

    </main>

  );

}