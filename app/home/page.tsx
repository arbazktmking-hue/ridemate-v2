"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  Heart,
  MessageCircle,
  Bookmark,
} from "lucide-react";


export default function FeedPage() {

  /* =========================================================
     STATE
  ========================================================= */

  const [trips, setTrips] =
    useState<any[]>([]);

  const [savedTrips, setSavedTrips] =
    useState<string[]>([]);

  const [heartAnimation, setHeartAnimation] =
    useState<string | null>(null);

  const [commentPost, setCommentPost] =
    useState<any>(null);


  /* =========================================================
     LOAD FOLLOWER-ONLY POSTS
     
     SHOW:
     1. Posts from people current user follows
     2. Current user's own posts
     
     HIDE:
     Posts from everyone else
  ========================================================= */

  useEffect(() => {

    const fetchTrips = async () => {

      try {

        /* =====================================================
           GET CURRENT USER
        ===================================================== */

        const currentUser =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        const currentUserName =
          currentUser.name ||
          currentUser.username ||
          "";


        /*
         * If there is no logged-in user,
         * don't load a personalized feed.
         */

        if (!currentUserName) {

          console.log(
            "No logged-in user found."
          );

          setTrips([]);

          return;

        }


        /* =====================================================
           GET PEOPLE CURRENT USER FOLLOWS
        ===================================================== */

        const followsSnapshot =
          await getDocs(
            collection(
              db,
              "follows"
            )
          );


        const followingUsers =
          new Set<string>();


        followsSnapshot.forEach(
          (followDoc) => {

            const follow =
              followDoc.data();


            /*
             * Existing RideMate structure:
             *
             * follower
             * following
             */

            if (
              follow.follower ===
              currentUserName
            ) {

              if (
                follow.following
              ) {

                followingUsers.add(
                  follow.following
                );

              }

            }

          }
        );


        /*
         * Always include the current user.
         *
         * This means users can see their
         * own posts even if they follow nobody.
         */

        followingUsers.add(
          currentUserName
        );


        console.log(
          "Current user:",
          currentUserName
        );

        console.log(
          "Following:",
          Array.from(
            followingUsers
          )
        );


        /* =====================================================
           LOAD ALL POSTS
        ===================================================== */

        const postsQuery =
          query(
            collection(
              db,
              "feedPosts"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          );


        const querySnapshot =
          await getDocs(
            postsQuery
          );


        const loadedTrips: any[] =
          [];


        /* =====================================================
           FILTER POSTS
        ===================================================== */

        querySnapshot.forEach(
          (postDoc) => {

            const post =
              postDoc.data();


            /*
             * Only include:
             *
             * - posts made by someone the
             *   current user follows
             *
             * OR
             *
             * - posts made by the current user
             */

            if (
              post.userName &&
              followingUsers.has(
                post.userName
              )
            ) {

              loadedTrips.push({

                id:
                  postDoc.id,

                ...post,

              });

            }

          }
        );


        /* =====================================================
           REMOVE DUPLICATES
        ===================================================== */

        const uniqueTrips =
          loadedTrips.filter(
            (
              trip,
              index,
              self
            ) =>
              index ===
              self.findIndex(
                (t) =>
                  t.id ===
                  trip.id
              )
          );


        setTrips(
          uniqueTrips
        );


        console.log(
          "Follower-only posts loaded:",
          uniqueTrips.length
        );


      } catch (error) {

        console.error(
          "Failed to load Home feed:",
          error
        );

      }

    };


    fetchTrips();

  }, []);


  /* =========================================================
     LOAD SAVED POSTS
  ========================================================= */

  useEffect(() => {

    const loadSavedTrips =
      async () => {

        try {

          const user =
            JSON.parse(
              localStorage.getItem(
                "ridemateUser"
              ) || "{}"
            );


          if (!user.name)
            return;


          const snapshot =
            await getDocs(
              collection(
                db,
                "savedTrips"
              )
            );


          const saved: string[] =
            [];


          snapshot.forEach(
            (savedDoc) => {

              const data =
                savedDoc.data();


              if (
                data.user ===
                user.name
              ) {

                saved.push(
                  data.tripId
                );

              }

            }
          );


          setSavedTrips(
            saved
          );


        } catch (error) {

          console.error(
            "Failed to load saved posts:",
            error
          );

        }

      };


    loadSavedTrips();

  }, []);


  /* =========================================================
     SAVE / UNSAVE
  ========================================================= */

  const toggleSaveTrip =
    async (
      tripId: string
    ) => {

      try {

        const user =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        if (!user.name) {

          alert(
            "Please login first."
          );

          return;

        }


        const saveId =
          `${user.name}_${tripId}`;


        if (
          savedTrips.includes(
            tripId
          )
        ) {

          await deleteDoc(
            doc(
              db,
              "savedTrips",
              saveId
            )
          );


          setSavedTrips(
            (prev) =>
              prev.filter(
                (id) =>
                  id !== tripId
              )
          );


        } else {

          await setDoc(
            doc(
              db,
              "savedTrips",
              saveId
            ),
            {
              user:
                user.name,

              tripId,
            }
          );


          setSavedTrips(
            (prev) => [
              ...prev,
              tripId,
            ]
          );

        }

      } catch (error) {

        console.error(
          "Save error:",
          error
        );

      }

    };


  /* =========================================================
     LIKE POST
  ========================================================= */

  const likeTrip =
    async (
      id: string,
      currentLikes: number
    ) => {

      try {

        const tripRef =
          doc(
            db,
            "feedPosts",
            id
          );


        await updateDoc(
          tripRef,
          {
            likes:
              currentLikes + 1,
          }
        );


        const currentUser =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        const trip =
          trips.find(
            (t) =>
              t.id === id
          );


        /*
         * Send notification to post owner.
         */

        if (
          trip &&
          trip.userName &&
          trip.userName !==
            currentUser.name
        ) {

          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {

              user:
                trip.userName,

              text:
                `${currentUser.name} liked your post ❤️`,

              createdAt:
                Date.now(),

              read:
                false,

            }
          );

        }


        /*
         * Update UI immediately.
         */

        setTrips(
          (prevTrips) =>
            prevTrips.map(
              (trip) =>
                trip.id === id
                  ? {
                      ...trip,

                      likes:
                        currentLikes +
                        1,
                    }
                  : trip
            )
        );


        /*
         * Also update the currently
         * open comments post if needed.
         */

        setCommentPost(
          (current) => {

            if (
              current &&
              current.id === id
            ) {

              return {
                ...current,
                likes:
                  currentLikes +
                  1,
              };

            }

            return current;

          }
        );


      } catch (error) {

        console.error(
          "Like error:",
          error
        );

      }

    };


  /* =========================================================
     ADD COMMENT
  ========================================================= */

  const addComment =
    async (
      tripId: string,
      commentText: string
    ) => {

      if (
        !commentText.trim()
      )
        return;


      try {

        const user =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        if (!user.name) {

          alert(
            "Please login first."
          );

          return;

        }


        const newComment = {

          user:
            user.name,

          image:
            user.image || "",

          text:
            commentText.trim(),

        };


        const tripRef =
          doc(
            db,
            "feedPosts",
            tripId
          );


        await updateDoc(
          tripRef,
          {
            comments:
              arrayUnion(
                newComment
              ),
          }
        );


        const trip =
          trips.find(
            (t) =>
              t.id ===
              tripId
          );


        /*
         * Notify post owner.
         */

        if (
          trip &&
          trip.userName &&
          trip.userName !==
            user.name
        ) {

          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {

              user:
                trip.userName,

              text:
                `${user.name} commented on your post 💬`,

              createdAt:
                Date.now(),

              read:
                false,

            }
          );

        }


        /*
         * Update Home feed immediately.
         */

        setTrips(
          (prevTrips) =>
            prevTrips.map(
              (trip) =>
                trip.id ===
                tripId
                  ? {

                      ...trip,

                      comments: [
                        ...(trip.comments ||
                          []),

                        newComment,

                      ],

                    }
                  : trip
            )
        );


        /*
         * Update comments popup
         * immediately as well.
         */

        setCommentPost(
          (current) => {

            if (
              current &&
              current.id ===
                tripId
            ) {

              return {

                ...current,

                comments: [
                  ...(current.comments ||
                    []),

                  newComment,

                ],

              };

            }

            return current;

          }
        );


      } catch (error) {

        console.error(
          "Comment error:",
          error
        );

      }

    };


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <main
      className="
        fixed
        inset-0
        top-16
        bg-black
        text-white
        overflow-hidden
      "
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          absolute
          top-4
          left-0
          right-0
          z-50
          flex
          justify-between
          items-center
          px-5
        "
      >

        <h1
          className="
            text-2xl
            font-black
            text-white
          "
        >
          RideMate
        </h1>


        <Link
          href="/create-post"
          className="
            bg-orange-500
            text-black
            px-4
            py-2
            rounded-full
            font-bold
            hover:scale-105
            transition
          "
        >
          + Create Post
        </Link>

      </div>


      {/* =====================================================
          FEED
      ===================================================== */}

      <div
        className="
          h-full
          w-full
          overflow-y-auto
          overflow-x-hidden
          snap-y
          snap-mandatory
          overscroll-none
          [scrollbar-width:none]
          [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >

        <div>

          {trips.map(
            (trip) => (

              <div
                key={trip.id}
                className="
                  snap-start
                  h-[calc(100dvh-64px)]
                  w-full
                  relative
                  overflow-hidden
                "
              >

                {/* =================================================
                    MEDIA
                ================================================= */}

                <div
                  className="
                    relative
                    h-full
                  "
                  onDoubleClick={() => {

                    likeTrip(
                      trip.id,
                      trip.likes || 0
                    );


                    setHeartAnimation(
                      trip.id
                    );


                    setTimeout(() => {

                      setHeartAnimation(
                        null
                      );

                    }, 800);

                  }}
                >

                  {trip.mediaUrl ? (

                    trip.mediaType?.startsWith(
                      "image"
                    ) ? (

                      <img
                        src={
                          trip.mediaUrl
                        }
                        alt="Post"
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                      />

                    ) : trip.mediaType?.startsWith(
                        "video"
                      ) ? (

                      <video
                        src={
                          trip.mediaUrl
                        }
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                        autoPlay
                        muted
                        loop
                        playsInline
                      />

                    ) : (

                      <div
                        className="
                          w-full
                          h-full
                          flex
                          items-center
                          justify-center
                          bg-zinc-900
                        "
                      >

                        <p
                          className="
                            text-zinc-400
                          "
                        >
                          📷 Media preview
                          coming soon
                        </p>

                      </div>

                    )

                  ) : (

                    <div
                      className="
                        w-full
                        h-full
                        flex
                        items-center
                        justify-center
                        bg-zinc-900
                      "
                    >

                      <p
                        className="
                          text-zinc-400
                        "
                      >
                        📷 No media available
                      </p>

                    </div>

                  )}


                  {/* =================================================
                      RIDER INFO
                  ================================================= */}

                  <Link
                    href={`/rider/${encodeURIComponent(
                      trip.userName
                    )}`}
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                    className="
                      absolute
                      top-4
                      left-4
                      flex
                      items-center
                      gap-3
                      bg-black/50
                      backdrop-blur-sm
                      px-3
                      py-2
                      rounded-full
                      hover:bg-black/70
                      transition
                      z-50
                    "
                  >

                    {trip.userImage ? (

                      <img
                        src={
                          trip.userImage
                        }
                        alt="Rider"
                        className="
                          w-10
                          h-10
                          rounded-full
                          border
                          border-orange-500
                          object-cover
                        "
                      />

                    ) : (

                      <div
                        className="
                          w-10
                          h-10
                          rounded-full
                          border
                          border-orange-500
                          bg-zinc-800
                          flex
                          items-center
                          justify-center
                        "
                      >
                        👤
                      </div>

                    )}


                    <span
                      className="
                        font-bold
                        text-white
                      "
                    >
                      {trip.userName}
                    </span>

                  </Link>


                  {/* =================================================
                      POST CAPTION
                  ================================================= */}

                  <div
                    className="
                      absolute
                      bottom-5
                      left-4
                      right-24
                      z-20
                    "
                  >

                    <p
                      className="
                        text-white
                        text-base
                        leading-6
                      "
                    >
                      {trip.caption?.length >
                      120

                        ? trip.caption.substring(
                            0,
                            120
                          ) + "..."

                        : trip.caption ||
                          "No caption yet."}

                    </p>


                    {trip.caption?.length >
                      120 && (

                      <button
                        className="
                          text-orange-400
                          text-sm
                          mt-1
                          font-semibold
                        "
                        onClick={() =>
                          alert(
                            trip.caption
                          )
                        }
                      >
                        Read more
                      </button>

                    )}

                  </div>


                  {/* =================================================
                      RIGHT SIDE ACTIONS
                  ================================================= */}

                  <div
                    className="
                      absolute
                      right-4
                      bottom-32
                      flex
                      flex-col
                      items-center
                      gap-6
                      z-30
                    "
                  >

                    {/* LIKE */}

                    <button
                      onClick={(e) => {

                        e.stopPropagation();

                        likeTrip(
                          trip.id,
                          trip.likes || 0
                        );

                      }}
                      className="
                        flex
                        flex-col
                        items-center
                      "
                    >

                      <Heart
                        className="
                          w-8
                          h-8
                          text-white
                        "
                      />

                      <span
                        className="
                          text-sm
                          font-bold
                          mt-1
                        "
                      >
                        {trip.likes || 0}
                      </span>

                    </button>


                    {/* COMMENT */}

                    <button
                      onClick={(e) => {

                        e.stopPropagation();

                        setCommentPost(
                          trip
                        );

                      }}
                      className="
                        flex
                        flex-col
                        items-center
                      "
                    >

                      <MessageCircle
                        className="
                          w-8
                          h-8
                          text-white
                        "
                      />

                      <span
                        className="
                          text-sm
                          font-bold
                          mt-1
                        "
                      >
                        {(
                          trip.comments ||
                          []
                        ).length}

                      </span>

                    </button>


                    {/* SAVE */}

                    <button
                      onClick={(e) => {

                        e.stopPropagation();

                        toggleSaveTrip(
                          trip.id
                        );

                      }}
                      className="
                        flex
                        flex-col
                        items-center
                      "
                    >

                      <Bookmark
                        className={`w-8 h-8 ${
                          savedTrips.includes(
                            trip.id
                          )
                            ? "fill-white text-white"
                            : "text-white"
                        }`}
                      />

                      <span
                        className="
                          text-sm
                          font-bold
                          mt-1
                        "
                      >
                        Save
                      </span>

                    </button>

                  </div>


                  {/* =================================================
                      DOUBLE TAP HEART
                  ================================================= */}

                  {heartAnimation ===
                    trip.id && (

                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        pointer-events-none
                        animate-bounce
                      "
                    >

                      <span
                        className="
                          text-8xl
                        "
                      >
                        ❤️
                      </span>

                    </div>

                  )}

                </div>

              </div>

            )
          )}


          {/* =====================================================
              EMPTY FEED
          ===================================================== */}

          {trips.length === 0 && (

            <div
              className="
                h-[calc(100dvh-64px)]
                flex
                items-center
                justify-center
                text-center
                px-8
              "
            >

              <div>

                <div
                  className="
                    text-6xl
                    mb-5
                  "
                >
                  🏍️
                </div>


                <h2
                  className="
                    text-2xl
                    sm:text-3xl
                    font-black
                  "
                >
                  Your RideMate feed is quiet
                </h2>


                <p
                  className="
                    text-zinc-400
                    mt-3
                    max-w-md
                  "
                >
                  Follow riders to see their
                  posts here, or create your
                  own post.
                </p>


                <Link
                  href="/search"
                  className="
                    inline-block
                    mt-5
                    bg-orange-500
                    text-black
                    px-5
                    py-2.5
                    rounded-full
                    font-black
                    hover:bg-orange-400
                    transition
                  "
                >
                  Find Riders
                </Link>

              </div>

            </div>

          )}

        </div>

      </div>


      {/* =======================================================
          COMMENTS POPUP
      ======================================================= */}

      {commentPost && (

        <div
          className="
            fixed
            inset-0
            z-[2000]
            bg-black/60
            backdrop-blur-sm
            flex
            items-end
          "
          onClick={() =>
            setCommentPost(null)
          }
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="
              w-full
              h-[75vh]
              bg-zinc-950
              rounded-t-3xl
              border-t
              border-zinc-800
              flex
              flex-col
            "
          >

            {/* =================================================
                COMMENT HEADER
            ================================================= */}

            <div
              className="
                flex
                justify-between
                items-center
                p-5
                border-b
                border-zinc-800
              "
            >

              <h2
                className="
                  text-xl
                  font-bold
                "
              >
                Comments
              </h2>


              <button
                onClick={() =>
                  setCommentPost(
                    null
                  )
                }
                className="
                  text-2xl
                "
              >
                ✕
              </button>

            </div>


            {/* =================================================
                COMMENTS LIST
            ================================================= */}

            <div
              className="
                flex-1
                overflow-y-auto
                p-5
                space-y-4
              "
            >

              {(
                commentPost.comments ||
                []
              ).length === 0 ? (

                <p
                  className="
                    text-zinc-500
                    text-center
                    mt-10
                  "
                >
                  No comments yet.
                </p>

              ) : (

                (
                  commentPost.comments ||
                  []
                ).map(
                  (
                    comment: any,
                    index: number
                  ) => (

                    <div
                      key={index}
                      className="
                        flex
                        gap-3
                      "
                    >

                      {comment.image ? (

                        <img
                          src={
                            comment.image
                          }
                          alt="User"
                          className="
                            w-10
                            h-10
                            rounded-full
                            object-cover
                          "
                        />

                      ) : (

                        <div
                          className="
                            w-10
                            h-10
                            rounded-full
                            bg-zinc-800
                            flex
                            items-center
                            justify-center
                          "
                        >
                          👤
                        </div>

                      )}


                      <div>

                        <p
                          className="
                            font-bold
                          "
                        >
                          {comment.user}
                        </p>


                        <p
                          className="
                            text-zinc-300
                          "
                        >
                          {comment.text}
                        </p>

                      </div>

                    </div>

                  )
                )

              )}

            </div>


            {/* =================================================
                COMMENT INPUT
            ================================================= */}

            <div
              className="
                border-t
                border-zinc-800
                p-4
              "
            >

              <input
                type="text"
                placeholder="Add a comment..."
                className="
                  w-full
                  p-4
                  rounded-full
                  bg-black
                  border
                  border-zinc-700
                  outline-none
                  focus:border-orange-500
                "
                onKeyDown={(e) => {

                  if (
                    e.key ===
                    "Enter"
                  ) {

                    addComment(
                      commentPost.id,
                      e.currentTarget
                        .value
                    );


                    e.currentTarget
                      .value = "";

                  }

                }}
              />

            </div>

          </div>

        </div>

      )}

    </main>

  );

}