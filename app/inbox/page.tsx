"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PageBackground from "../components/PageBackground";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  MessageCircle,
  UserRound,
  Loader2,
} from "lucide-react";


export default function InboxPage() {

  /* =========================================================
     STATE
  ========================================================= */

  const [chats, setChats] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);


  /* =========================================================
     LOAD CHATS
  ========================================================= */

  useEffect(() => {

    let mounted = true;


    const loadChats = async () => {

      try {

        const currentUser =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        if (!currentUser.name) {

          if (mounted) {

            setChats([]);
            setLoading(false);

          }

          return;

        }


        /* =====================================================
           LOAD ALL MESSAGES
        ===================================================== */

        const messageSnapshot =
          await getDocs(
            collection(
              db,
              "messages"
            )
          );


        const riderNames: string[] =
          [];


        messageSnapshot.forEach(
          (messageDoc) => {

            const message =
              messageDoc.data();


            /*
             * If current user sent the message,
             * add the receiver.
             */

            if (
              message.sender ===
              currentUser.name
            ) {

              if (
                message.receiver &&
                message.receiver !==
                  currentUser.name
              ) {

                riderNames.push(
                  message.receiver
                );

              }

            }


            /*
             * If current user received the message,
             * add the sender.
             */

            if (
              message.receiver ===
              currentUser.name
            ) {

              if (
                message.sender &&
                message.sender !==
                  currentUser.name
              ) {

                riderNames.push(
                  message.sender
                );

              }

            }

          }
        );


        /*
         * Remove duplicate riders.
         */

        const uniqueNames =
          Array.from(
            new Set(
              riderNames
            )
          );


        /* =====================================================
           LOAD USER PROFILES
        ===================================================== */

        const usersSnapshot =
          await getDocs(
            collection(
              db,
              "users"
            )
          );


        const userMap: {
          [key: string]: any;
        } = {};


        usersSnapshot.forEach(
          (userDoc) => {

            const user =
              userDoc.data();


            if (
              user.username &&
              typeof user.username ===
                "string"
            ) {

              const key =
                user.username
                  .trim()
                  .toLowerCase();


              userMap[key] = {

                name:
                  user.username.trim(),

                image:
                  user.image || "",

              };

            }

          }
        );


        /* =====================================================
           BUILD CHAT LIST
        ===================================================== */

        const loadedChats =
          uniqueNames.map(
            (name) => {

              const profile =
                userMap[
                  name
                    .trim()
                    .toLowerCase()
                ];


              return {

                name,

                image:
                  profile?.image ||
                  "",

              };

            }
          );


        /*
         * Sort alphabetically.
         */

        loadedChats.sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );


        if (mounted) {

          setChats(
            loadedChats
          );

        }

      } catch (error) {

        console.error(
          "Failed to load chats:",
          error
        );

      } finally {

        if (mounted) {

          setLoading(false);

        }

      }

    };


    /* Initial load */

    loadChats();


    /*
     * Refresh every second,
     * just like your existing page.
     */

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

    <PageBackground>

      <main
        className="
          w-full
          min-h-screen
          text-white
          px-4
          sm:px-6
          py-6
          sm:py-10
        "
      >

        <div
          className="
            max-w-4xl
            mx-auto
            pt-20
          "
        >

          {/* =================================================
              HEADING
          ================================================= */}

          <div
            className="
              mb-6
              sm:mb-8
            "
          >

            <h1
              className="
                text-4xl
                sm:text-5xl
                font-black
                text-orange-500
                mb-2
              "
            >
              Crew Chat 💬
            </h1>


            <p
              className="
                mt-2
                text-sm
                sm:text-base
                text-zinc-500
              "
            >
              Your conversations with other RideMate riders.
            </p>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                py-16
                text-center
              "
            >

              <Loader2
                size={32}
                className="
                  text-orange-500
                  animate-spin
                  mb-4
                "
              />


              <p
                className="
                  text-zinc-500
                  text-sm
                "
              >
                Loading your conversations...
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
                  space-y-3
                "
              >

                {chats.map(
                  (rider) => (

                    <Link
                      key={
                        rider.name
                      }
                      href={`/chat/${encodeURIComponent(
                        rider.name
                      )}`}

                      className="
                        group
                        flex
                        items-center
                        gap-4
                        p-4
                        rounded-2xl
                        bg-zinc-900
                        border
                        border-zinc-800
                        hover:border-orange-500
                        hover:bg-zinc-900/80
                        transition-all
                        duration-200
                      "
                    >

                      {/* =================================================
                          PROFILE IMAGE
                      ================================================= */}

                      <div
                        className="
                          flex-shrink-0
                          w-14
                          h-14
                          sm:w-16
                          sm:h-16
                          rounded-full
                          overflow-hidden
                          bg-zinc-800
                          border
                          border-zinc-700
                          group-hover:border-orange-500
                          transition
                        "
                      >

                        {rider.image ? (

                          <img
                            src={
                              rider.image
                            }
                            alt={
                              rider.name
                            }
                            className="
                              w-full
                              h-full
                              object-cover
                            "
                          />

                        ) : (

                          <div
                            className="
                              w-full
                              h-full
                              flex
                              items-center
                              justify-center
                              text-zinc-500
                            "
                          >

                            <UserRound
                              size={27}
                            />

                          </div>

                        )}

                      </div>


                      {/* =================================================
                          RIDER INFORMATION
                      ================================================= */}

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >

                        <h3
                          className="
                            text-base
                            sm:text-lg
                            font-black
                            text-white
                            truncate
                            group-hover:text-orange-400
                            transition
                          "
                        >
                          {rider.name}
                        </h3>


                        <p
                          className="
                            text-xs
                            sm:text-sm
                            text-zinc-600
                            mt-0.5
                          "
                        >
                          RideMate rider
                        </p>

                      </div>


                      {/* =================================================
                          CHAT ICON / ARROW
                      ================================================= */}

                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          flex-shrink-0
                          text-zinc-600
                          group-hover:text-orange-500
                          transition
                        "
                      >

                        <MessageCircle
                          size={19}
                        />

                        <span
                          className="
                            text-xl
                          "
                        >
                          →
                        </span>

                      </div>

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
                  py-16
                  px-6
                  text-center
                  bg-zinc-900/50
                  border
                  border-zinc-800
                  rounded-2xl
                "
              >

                <div
                  className="
                    w-16
                    h-16
                    mx-auto
                    rounded-full
                    bg-zinc-900
                    border
                    border-zinc-800
                    flex
                    items-center
                    justify-center
                    mb-5
                  "
                >

                  <MessageCircle
                    size={30}
                    className="
                      text-zinc-600
                    "
                  />

                </div>


                <h3
                  className="
                    text-lg
                    sm:text-xl
                    font-black
                    text-white
                  "
                >
                  No conversations yet
                </h3>


                <p
                  className="
                    mt-2
                    text-sm
                    text-zinc-500
                  "
                >
                  Start a conversation with another RideMate rider.
                </p>

              </div>

            )}

        </div>

      </main>

    </PageBackground>

  );

}