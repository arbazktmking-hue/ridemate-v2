"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
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


export default function ChatPage() {

  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );


  /* =========================================================
     STATE
  ========================================================= */

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<any[]>([]);

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


  /*
   * In normal mode:
   * currentUser.name = actual logged-in user
   *
   * In admin investigation mode:
   * currentUser is replaced only for READ purposes
   * with the selected user's identity.
   *
   * Firebase authentication is NOT changed.
   */


  /* =========================================================
     LOAD USER / ADMIN VIEW
  ========================================================= */

  useEffect(() => {

    try {

      /* =====================================================
         CHECK ADMIN INVESTIGATION SESSION
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
           * Use the investigated user's identity
           * for reading the conversation.
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

        const user =
          JSON.parse(
            savedUser
          );


        setCurrentUser(
          user
        );

      }

    } catch (error) {

      console.error(
        "Failed to load chat user:",
        error
      );

    }

  }, []);


  /* =========================================================
     LOAD CHAT MESSAGES
  ========================================================= */

  useEffect(() => {

    if (!currentUser?.name) {
      return;
    }


    let mounted = true;


    const loadMessages = async () => {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              "messages"
            )
          );


        const allMessages: any[] =
          [];


        snapshot.forEach(
          (messageDoc) => {

            const msg =
              messageDoc.data();


            /*
             * Messages between the selected
             * user and this rider.
             */

            if (

              (
                msg.sender ===
                  currentUser.name &&

                msg.receiver ===
                  riderName
              )

              ||

              (
                msg.sender ===
                  riderName &&

                msg.receiver ===
                  currentUser.name
              )

            ) {

              allMessages.push(
                msg
              );

            }

          }
        );


        /* ===================================================
           SORT OLDEST → NEWEST
        =================================================== */

        allMessages.sort(
          (a, b) =>
            (a.createdAt || 0) -
            (b.createdAt || 0)
        );


        if (mounted) {

          setMessages(
            allMessages
          );

          setLoading(false);

        }

      } catch (error) {

        console.error(
          "Failed to load messages:",
          error
        );


        if (mounted) {

          setLoading(false);

        }

      }

    };


    loadMessages();


    /* =====================================================
       REFRESH EVERY SECOND
    ===================================================== */

    const interval =
      setInterval(
        loadMessages,
        1000
      );


    return () => {

      mounted = false;

      clearInterval(
        interval
      );

    };

  }, [
    currentUser,
    riderName,
  ]);


  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const sendMessage = async () => {

    /*
     * IMPORTANT:
     *
     * Admin investigation mode is READ ONLY.
     *
     * Never allow an admin to send a message
     * from the investigated user's chat.
     */

    if (isAdminView) {

      alert(
        "Messaging is disabled while using Admin Investigation Mode."
      );

      return;

    }


    if (!currentUser) {
      return;
    }


    if (!message.trim()) {
      return;
    }


    try {

      await addDoc(
        collection(
          db,
          "messages"
        ),
        {

          sender:
            currentUser.name,

          receiver:
            riderName,

          text:
            message.trim(),

          createdAt:
            Date.now(),

        }
      );


      setMessage("");


      /* =====================================================
         RELOAD MESSAGES
      ===================================================== */

      const snapshot =
        await getDocs(
          collection(
            db,
            "messages"
          )
        );


      const allMessages: any[] =
        [];


      snapshot.forEach(
        (messageDoc) => {

          const msg =
            messageDoc.data();


          if (

            (
              msg.sender ===
                currentUser.name &&

              msg.receiver ===
                riderName
            )

            ||

            (
              msg.sender ===
                riderName &&

              msg.receiver ===
                currentUser.name
            )

          ) {

            allMessages.push(
              msg
            );

          }

        }
      );


      allMessages.sort(
        (a, b) =>
          (a.createdAt || 0) -
          (b.createdAt || 0)
      );


      setMessages(
        allMessages
      );

    } catch (error) {

      console.error(
        "Failed to send message:",
        error
      );

      alert(
        "Failed to send message. Please try again."
      );

    }

  };


  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (!currentUser) {

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

        Loading chat...

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
              mb-5
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
                Viewing the conversation between{" "}
                <span
                  className="
                    text-white
                    font-bold
                  "
                >
                  {adminView?.userName}
                </span>{" "}
                and{" "}
                <span
                  className="
                    text-white
                    font-bold
                  "
                >
                  {riderName}
                </span>
                .
              </p>


              <p
                className="
                  text-zinc-500
                  text-xs
                  mt-1
                "
              >
                Read-only investigation mode. Sending messages is disabled.
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            mb-6
          "
        >

          <h1
            className="
              text-3xl
              sm:text-4xl
              font-black
              text-orange-500
            "
          >
            Chat with {riderName} 💬
          </h1>


          {isAdminView && (

            <p
              className="
                text-zinc-500
                text-sm
                mt-2
              "
            >
              Investigating{" "}
              <span
                className="
                  text-zinc-300
                  font-semibold
                "
              >
                {adminView?.userName}
              </span>
              's conversation
            </p>

          )}

        </div>


        {/* =================================================
            CHAT BOX
        ================================================= */}

        <div
          className="
            bg-zinc-900
            rounded-2xl
            p-4
            sm:p-6
            h-[600px]
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
                  text-sm
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
                    flex-col
                    items-center
                    justify-center
                    text-center
                    text-zinc-500
                  "
                >

                  <MessageCircleIcon />

                  <p
                    className="
                      mt-3
                      text-sm
                    "
                  >
                    No messages in this conversation yet.
                  </p>

                </div>

              )}


            {!loading &&
              messages.map(
                (msg, index) => (

                  <div
                    key={index}
                    className={`
                      p-3
                      rounded-xl
                      w-fit
                      max-w-[75%]
                      ${
                        msg.sender ===
                        currentUser.name
                          ? "bg-orange-500 ml-auto"
                          : "bg-zinc-800"
                      }
                    `}
                  >

                    {/* =====================================
                        SHARED TRIP MESSAGE
                    ===================================== */}

                    {msg.type ===
                    "sharedTrip" ? (

                      <Link
                        href={`/feed?trip=${msg.tripId}`}
                        scroll={false}
                        className="block"
                      >

                        <div
                          className="
                            bg-black/30
                            rounded-xl
                            p-3
                            border
                            border-orange-400
                            hover:border-orange-500
                            transition
                          "
                        >

                          {msg.image && (

                            <img
                              src={
                                msg.image
                              }
                              alt={
                                msg.destination ||
                                "Shared ride"
                              }
                              className="
                                w-full
                                h-40
                                object-cover
                                rounded-lg
                                mb-3
                              "
                            />

                          )}


                          <p
                            className="
                              text-orange-300
                              font-bold
                            "
                          >
                            🏍 Shared a Ride
                          </p>


                          <p
                            className="
                              text-xl
                              font-bold
                              mt-2
                            "
                          >
                            {msg.destination}
                          </p>


                          <p
                            className="
                              text-sm
                              text-zinc-300
                            "
                          >
                            Rider: {msg.rider}
                          </p>


                          <p
                            className="
                              text-sm
                              text-zinc-300
                            "
                          >
                            Bike: {msg.bike}
                          </p>


                          <p
                            className="
                              text-orange-400
                              mt-3
                              font-semibold
                            "
                          >
                            Tap to view ride →
                          </p>

                        </div>

                      </Link>

                    ) : (

                      <p>
                        {msg.text}
                      </p>

                    )}

                  </div>

                )
              )}

          </div>


          {/* =================================================
              MESSAGE INPUT
          ================================================= */}

          {isAdminView ? (

            <div
              className="
                mt-4
                rounded-xl
                border
                border-orange-500/20
                bg-orange-500/5
                px-4
                py-4
                text-center
              "
            >

              <p
                className="
                  text-orange-400
                  text-sm
                  font-bold
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
                Message sending is disabled while viewing this
                conversation as an administrator.
              </p>

            </div>

          ) : (

            <div
              className="
                flex
                gap-3
                mt-4
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
                  hover:bg-orange-400
                  px-5
                  sm:px-6
                  rounded-xl
                  font-bold
                  flex
                  items-center
                  gap-2
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

        </div>

      </div>

    </main>

  );

}


/* =========================================================
   EMPTY CHAT ICON
========================================================= */

function MessageCircleIcon() {

  return (

    <div
      className="
        w-14
        h-14
        rounded-full
        bg-zinc-800
        flex
        items-center
        justify-center
        text-zinc-600
      "
    >

      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >

        <path
          d="
            M21 11.5
            a8.38 8.38 0 0 1
            -.9 3.8
            8.5 8.5 0 0 1
            -7.6 4.7
            8.38 8.38 0 0 1
            -3.8-.9
            L3 21l1.9-5.7
            a8.38 8.38 0 0 1
            -.9-3.8
            8.5 8.5 0 0 1
            4.7-7.6
            8.38 8.38 0 0 1
            3.8-.9h.5
            a8.48 8.48 0 0 1
            8 8v.5z
          "
        />

      </svg>

    </div>

  );

}