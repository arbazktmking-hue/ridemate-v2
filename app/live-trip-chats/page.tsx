"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import {
  ShieldCheck,
  Loader2,
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


export default function LiveTripChatsPage() {

  /* =========================================================
     STATE
  ========================================================= */

  const [chats, setChats] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);


  /* =========================================================
     ADMIN VIEW
  ========================================================= */

  const isAdminView =
    Boolean(
      adminView?.active &&
      adminView?.userName
    );


  /* =========================================================
     LOAD CHATS
  ========================================================= */

  useEffect(() => {

    let mounted = true;


    const loadChats = async () => {

      try {

        /* =====================================================
           CHECK ADMIN INVESTIGATION MODE
        ===================================================== */

        let activeAdminView: AdminView | null = null;

        try {

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

              activeAdminView =
                parsedAdminView;

            }

          }

        } catch (error) {

          console.error(
            "Failed to read admin view:",
            error
          );

        }


        if (mounted) {

          setAdminView(
            activeAdminView
          );

        }


        /* =====================================================
           DETERMINE USER TO INVESTIGATE
        ===================================================== */

        let currentUserName = "";


        if (
          activeAdminView?.active &&
          activeAdminView.userName
        ) {

          /*
           * ADMIN INVESTIGATION MODE
           *
           * Inspect the selected user's
           * Live Trip Chats.
           */

          currentUserName =
            activeAdminView.userName;

        } else {

          /*
           * NORMAL USER MODE
           */

          try {

            const savedUser =
              localStorage.getItem(
                "ridemateUser"
              );


            if (savedUser) {

              const currentUser =
                JSON.parse(
                  savedUser
                );


              currentUserName =
                currentUser.name ||
                currentUser.username ||
                "";

            }

          } catch (error) {

            console.error(
              "Failed to read current user:",
              error
            );

          }

        }


        /* =====================================================
           USER NOT AVAILABLE
        ===================================================== */

        if (!currentUserName) {

          if (mounted) {

            setChats([]);
            setLoading(false);

          }

          return;

        }


        /* =====================================================
           LOAD TRIP CHATS
        ===================================================== */

        const snapshot =
          await getDocs(
            collection(
              db,
              "tripChats"
            )
          );


        const loaded: any[] =
          [];


        snapshot.forEach(
          (docSnap) => {

            const chat =
              docSnap.data();


            /* =================================================
               CHECK WHETHER USER HAS REVIEWED
            ================================================= */

            const hasReviewed =
              Array.isArray(
                chat.reviewedUsers
              ) &&
              chat.reviewedUsers.includes(
                currentUserName
              );


            /* =================================================
               CHECK MEMBERSHIP
            ================================================= */

            const isMember =
              Array.isArray(
                chat.members
              ) &&
              chat.members.includes(
                currentUserName
              );


            /* =================================================
               DETERMINE WHETHER CHAT SHOULD SHOW
            ================================================= */

            const shouldShow =
              isMember &&
              (

                /* Active trip */

                chat.completed === false ||

                /* Completed trip but passenger
                   still needs to review */

                (
                  chat.completed === true &&
                  currentUserName !==
                    chat.owner &&
                  !hasReviewed
                )

              );


            if (shouldShow) {

              loaded.push({

                id:
                  docSnap.id,

                ...chat,

              });

            }

          }
        );


        if (mounted) {

          setChats(
            loaded
          );

        }

      } catch (error) {

        console.error(
          "Failed to load live trip chats:",
          error
        );


        if (mounted) {

          setChats([]);

        }

      } finally {

        if (mounted) {

          setLoading(false);

        }

      }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    loadChats();


    /* =====================================================
       REFRESH EVERY SECOND
    ===================================================== */

    const interval =
      setInterval(
        loadChats,
        1000
      );


    return () => {

      mounted = false;

      clearInterval(
        interval
      );

    };

  }, []);


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
                's Live Trip Chats.
              </p>


              <p
                className="
                  text-zinc-500
                  text-xs
                  mt-1
                "
              >
                Read-only investigation mode. Chat actions
                are disabled.
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            HEADING
        ================================================= */}

        <h1
          className="
            text-4xl
            sm:text-5xl
            font-black
            text-orange-500
            mb-6
          "
        >
          💬 Live Trip Chats
        </h1>


        {/* =================================================
            DESCRIPTION
        ================================================= */}

        {isAdminView ? (

          <p
            className="
              text-zinc-500
              text-sm
              mb-6
            "
          >
            Active and pending trip conversations belonging to{" "}
            <span
              className="
                text-zinc-300
                font-semibold
              "
            >
              {adminView?.userName}
            </span>
            .
          </p>

        ) : (

          <p
            className="
              text-zinc-500
              text-sm
              mb-6
            "
          >
            Your active trip conversations and trips that
            still require your review.
          </p>

        )}


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (

          <div
            className="
              bg-zinc-900
              rounded-2xl
              p-10
              border
              border-zinc-800
              flex
              flex-col
              items-center
              justify-center
              text-center
            "
          >

            <Loader2
              size={30}
              className="
                text-orange-500
                animate-spin
                mb-4
              "
            />


            <p
              className="
                text-zinc-400
                text-sm
              "
            >
              {isAdminView
                ? "Loading user's trip chats..."
                : "Loading your trip chats..."}
            </p>

          </div>

        )}


        {/* =================================================
            CHAT LIST
        ================================================= */}

        {!loading &&
          chats.length > 0 && (

            <div
              className="
                space-y-4
              "
            >

              {chats.map(
                (chat) => (

                  <Link
                    key={
                      chat.id
                    }
                    href={`/trip-chat/${chat.id}`}
                    className="
                      block
                      bg-zinc-900
                      border
                      border-zinc-800
                      rounded-2xl
                      p-5
                      hover:border-orange-500
                      transition
                    "
                  >

                    {/* =====================================
                        DESTINATION
                    ===================================== */}

                    <h2
                      className="
                        text-2xl
                        font-bold
                        text-orange-400
                      "
                    >
                      🏍 {chat.destination}
                    </h2>


                    {/* =====================================
                        MEMBERS
                    ===================================== */}

                    <p
                      className="
                        mt-2
                        text-zinc-400
                      "
                    >
                      {chat.members?.length || 0} rider(s) in chat
                    </p>


                    {/* =====================================
                        STATUS
                    ===================================== */}

                    {chat.completed ? (

                      <p
                        className="
                          mt-2
                          text-yellow-400
                          font-bold
                        "
                      >
                        ⭐ Please rate your rider
                      </p>

                    ) : (

                      <p
                        className="
                          mt-2
                          text-green-400
                          font-bold
                        "
                      >
                        🟢 Active Trip
                      </p>

                    )}


                    {/* =====================================
                        ADMIN READ-ONLY LABEL
                    ===================================== */}

                    {isAdminView && (

                      <div
                        className="
                          mt-4
                          pt-3
                          border-t
                          border-zinc-800
                        "
                      >

                        <p
                          className="
                            text-xs
                            text-orange-400
                            font-semibold
                          "
                        >
                          🛡️ Read-only investigation
                        </p>

                      </div>

                    )}

                  </Link>

                )
              )}

            </div>

          )}


        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!loading &&
          chats.length === 0 && (

            <div
              className="
                bg-zinc-900
                rounded-2xl
                p-8
                border
                border-zinc-800
                text-center
              "
            >

              <div
                className="
                  text-4xl
                  mb-4
                "
              >
                💬
              </div>


              <h2
                className="
                  text-xl
                  font-black
                  text-white
                "
              >
                {isAdminView
                  ? "No live trip chats found"
                  : "No active trip chats"}
              </h2>


              <p
                className="
                  mt-2
                  text-zinc-500
                  text-sm
                "
              >
                {isAdminView
                  ? `No active or pending trip chats were found for ${
                      adminView?.userName || "this rider"
                    }.`
                  : "You don't have any active trip chats right now."}
              </p>

            </div>

          )}

      </div>

    </main>

  );

}