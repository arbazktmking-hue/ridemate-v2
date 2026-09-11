"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  addDoc,
  deleteDoc,
  setDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
} from "lucide-react";

type Comment = {
  user: string;
  image?: string;
  text: string;
};

type FeedPost = {
  id: string;
  userName?: string;
  userImage?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  likes?: number;
  likedBy?: string[];
  comments?: Comment[];
  createdAt?: number;
};

type AdminView = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
};

const POSTS_PER_PAGE = 15;

export default function FeedPage() {
  /* =========================================================
     STATE
  ========================================================= */

  const [trips, setTrips] = useState<FeedPost[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);

  const [heartAnimation, setHeartAnimation] =
    useState<string | null>(null);

  const [commentPost, setCommentPost] =
    useState<FeedPost | null>(null);

  const [currentUserName, setCurrentUserName] =
    useState<string>("");

  const [commentText, setCommentText] =
    useState<string>("");

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const [loadingFeed, setLoadingFeed] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [hasMorePosts, setHasMorePosts] =
    useState(true);

  const [feedError, setFeedError] =
    useState(false);

  const lastPostDocRef =
    useRef<QueryDocumentSnapshot<DocumentData> | null>(
      null
    );

  const loadingMoreRef =
    useRef(false);

  const feedInitializedRef =
    useRef(false);

  /* =========================================================
     GET ACTIVE VIEW USER
  ========================================================= */

  useEffect(() => {
    const loadViewUser = () => {
      try {
        const savedAdminView =
          localStorage.getItem(
            "ridemateAdminView"
          );

        if (savedAdminView) {
          const parsedAdminView =
            JSON.parse(savedAdminView);

          if (parsedAdminView?.active) {
            setAdminView(parsedAdminView);

            setCurrentUserName(
              parsedAdminView.userName || ""
            );

            return;
          }
        }

        const savedUser =
          localStorage.getItem("ridemateUser");

        if (savedUser) {
          const user = JSON.parse(savedUser);

          setAdminView(null);

          setCurrentUserName(
            user.name ||
              user.username ||
              ""
          );
        }
      } catch (error) {
        console.error(
          "Failed to load active user:",
          error
        );
      }
    };

    loadViewUser();

    const handleAdminViewChange = () => {
      loadViewUser();
    };

    window.addEventListener(
      "ridemateAdminViewChanged",
      handleAdminViewChange
    );

    window.addEventListener(
      "storage",
      handleAdminViewChange
    );

    return () => {
      window.removeEventListener(
        "ridemateAdminViewChanged",
        handleAdminViewChange
      );

      window.removeEventListener(
        "storage",
        handleAdminViewChange
      );
    };
  }, []);

  const isAdminView =
    adminView?.active === true;

  /* =========================================================
     GET ACTIVE USER NAME
  ========================================================= */

  const getActiveUserName = () => {
    try {
      const savedAdminView =
        localStorage.getItem(
          "ridemateAdminView"
        );

      if (savedAdminView) {
        const parsedAdminView =
          JSON.parse(savedAdminView);

        if (parsedAdminView?.active) {
          return (
            parsedAdminView.userName || ""
          );
        }
      }

      const savedUser =
        localStorage.getItem(
          "ridemateUser"
        );

      if (savedUser) {
        const user =
          JSON.parse(savedUser);

        return (
          user.name ||
          user.username ||
          ""
        );
      }
    } catch (error) {
      console.error(
        "Failed to get active user:",
        error
      );
    }

    return "";
  };

  /* =========================================================
     LOAD FOLLOWING USERS
  ========================================================= */

  const getFollowingUsers =
    async (
      userName: string
    ): Promise<Set<string>> => {
      const followingUsers =
        new Set<string>();

      try {
        /*
         * We still use the existing follows structure.
         *
         * This is better than loading the entire feed first,
         * but the follows collection itself can be optimized
         * further later if it becomes very large.
         */

        const followsQuery =
          query(
            collection(
              db,
              "follows"
            ),
            where(
              "follower",
              "==",
              userName
            )
          );

        const followsSnapshot =
          await getDocs(
            followsQuery
          );

        followsSnapshot.forEach(
          (followDoc) => {
            const follow =
              followDoc.data();

            if (
              follow.following
            ) {
              followingUsers.add(
                follow.following
              );
            }
          }
        );
      } catch (error) {
        console.error(
          "Failed to load following users:",
          error
        );
      }

      /*
       * Always include own posts.
       */

      followingUsers.add(
        userName
      );

      return followingUsers;
    };

  /* =========================================================
     LOAD FEED POSTS
  ========================================================= */

  const loadFeedPosts =
    async (
      userName: string,
      loadNextPage = false
    ) => {
      if (
        !userName ||
        loadingMoreRef.current
      ) {
        return;
      }

      if (
        loadNextPage &&
        !hasMorePosts
      ) {
        return;
      }

      try {
        if (loadNextPage) {
          loadingMoreRef.current =
            true;

          setLoadingMore(true);
        } else {
          setLoadingFeed(true);
          setFeedError(false);
        }

        /*
         * Get people this user follows.
         */

        const followingUsers =
          await getFollowingUsers(
            userName
          );

        /*
         * Build paginated feed query.
         *
         * Only the latest 15 posts are
         * downloaded per request.
         */

        let postsQuery;

        if (
          loadNextPage &&
          lastPostDocRef.current
        ) {
          postsQuery =
            query(
              collection(
                db,
                "feedPosts"
              ),
              orderBy(
                "createdAt",
                "desc"
              ),
              startAfter(
                lastPostDocRef.current
              ),
              limit(
                POSTS_PER_PAGE
              )
            );
        } else {
          postsQuery =
            query(
              collection(
                db,
                "feedPosts"
              ),
              orderBy(
                "createdAt",
                "desc"
              ),
              limit(
                POSTS_PER_PAGE
              )
            );
        }

        const querySnapshot =
          await getDocs(
            postsQuery
          );

        /*
         * Remember last document
         * for pagination.
         */

        if (
          querySnapshot.docs.length >
          0
        ) {
          lastPostDocRef.current =
            querySnapshot.docs[
              querySnapshot.docs.length - 1
            ];
        }

        /*
         * If fewer than 15 came back,
         * there are no more pages.
         */

        if (
          querySnapshot.docs.length <
          POSTS_PER_PAGE
        ) {
          setHasMorePosts(false);
        }

        /*
         * Filter only followed users.
         */

        const loadedTrips: FeedPost[] =
          [];

        querySnapshot.forEach(
          (postDoc) => {
            const post =
              postDoc.data();

            if (
              post.userName &&
              followingUsers.has(
                post.userName
              )
            ) {
              loadedTrips.push({
                id: postDoc.id,

                userName:
                  post.userName || "",

                userImage:
                  post.userImage || "",

                mediaUrl:
                  post.mediaUrl || "",

                mediaType:
                  post.mediaType || "",

                caption:
                  post.caption || "",

                likes:
                  typeof post.likes ===
                  "number"
                    ? post.likes
                    : 0,

                likedBy:
                  Array.isArray(
                    post.likedBy
                  )
                    ? post.likedBy
                    : [],

                comments:
                  Array.isArray(
                    post.comments
                  )
                    ? post.comments
                    : [],

                createdAt:
                  post.createdAt || 0,
              });
            }
          }
        );

        if (loadNextPage) {
          setTrips(
            (previous) => [
              ...previous,
              ...loadedTrips,
            ]
          );
        } else {
          setTrips(
            loadedTrips
          );
        }

        setFeedError(false);
      } catch (error) {
        console.error(
          "Failed to load Home feed:",
          error
        );

        setFeedError(true);
      } finally {
        setLoadingFeed(false);
        setLoadingMore(false);

        loadingMoreRef.current =
          false;
      }
    };

  /* =========================================================
     INITIAL FEED LOAD
  ========================================================= */

  useEffect(() => {
    const startFeed =
      async () => {
        const userName =
          getActiveUserName();

        setCurrentUserName(
          userName
        );

        if (!userName) {
          setTrips([]);
          setLoadingFeed(false);
          return;
        }

        /*
         * Reset pagination when
         * changing user/view mode.
         */

        lastPostDocRef.current =
          null;

        setHasMorePosts(true);

        feedInitializedRef.current =
          false;

        await loadFeedPosts(
          userName,
          false
        );

        feedInitializedRef.current =
          true;
      };

    startFeed();

    /*
     * We intentionally depend on admin mode only.
     * This prevents unnecessary Firebase reloads
     * on ordinary state changes.
     */
  }, [isAdminView]);

  /* =========================================================
     LOAD SAVED POSTS
  ========================================================= */

  useEffect(() => {
    const loadSavedTrips =
      async () => {
        try {
          const userName =
            getActiveUserName();

          if (!userName) {
            setSavedTrips([]);
            return;
          }

          /*
           * IMPORTANT:
           *
           * Old code downloaded the entire
           * savedTrips collection.
           *
           * Now Firestore only returns documents
           * belonging to this user.
           */

          const savedQuery =
            query(
              collection(
                db,
                "savedTrips"
              ),
              where(
                "user",
                "==",
                userName
              )
            );

          const snapshot =
            await getDocs(
              savedQuery
            );

          const saved: string[] =
            [];

          snapshot.forEach(
            (savedDoc) => {
              const data =
                savedDoc.data();

              if (
                data.tripId
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
  }, [isAdminView]);

  /* =========================================================
     INFINITE SCROLL
  ========================================================= */

  const handleFeedScroll =
    (
      event: React.UIEvent<HTMLDivElement>
    ) => {
      const element =
        event.currentTarget;

      const distanceFromBottom =
        element.scrollHeight -
        element.scrollTop -
        element.clientHeight;

      /*
       * Start loading before the user
       * reaches the absolute bottom.
       */

      if (
        distanceFromBottom <
          element.clientHeight * 1.5 &&
        hasMorePosts &&
        !loadingMoreRef.current &&
        feedInitializedRef.current
      ) {
        loadFeedPosts(
          getActiveUserName(),
          true
        );
      }
    };

  /* =========================================================
     ADMIN VIEW
     READ ONLY
  ========================================================= */

  const blockedAdminAction = (
    action: string
  ) => {
    if (!isAdminView) {
      return false;
    }

    alert(
      `Admin View Mode is read-only.\n\nYou cannot ${action} while investigating a user account.`
    );

    return true;
  };

  /* =========================================================
     SAVE / UNSAVE
  ========================================================= */

  const toggleSaveTrip =
    async (
      tripId: string
    ) => {
      if (
        blockedAdminAction(
          "save or unsave posts"
        )
      ) {
        return;
      }

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

        const isCurrentlySaved =
          savedTrips.includes(
            tripId
          );

        /*
         * Optimistic UI:
         * change the button immediately.
         */

        if (
          isCurrentlySaved
        ) {
          setSavedTrips(
            (prev) =>
              prev.filter(
                (id) =>
                  id !== tripId
              )
          );
        } else {
          setSavedTrips(
            (prev) => [
              ...prev,
              tripId,
            ]
          );
        }

        try {
          if (
            isCurrentlySaved
          ) {
            await deleteDoc(
              doc(
                db,
                "savedTrips",
                saveId
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
                user: user.name,
                tripId,
              }
            );
          }
        } catch (firebaseError) {
          /*
           * Roll back optimistic UI
           * if Firebase fails.
           */

          if (
            isCurrentlySaved
          ) {
            setSavedTrips(
              (prev) => [
                ...prev,
                tripId,
              ]
            );
          } else {
            setSavedTrips(
              (prev) =>
                prev.filter(
                  (id) =>
                    id !== tripId
                )
            );
          }

          throw firebaseError;
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
      id: string
    ): Promise<boolean> => {
      if (
        blockedAdminAction(
          "like posts"
        )
      ) {
        return false;
      }

      try {
        const savedUser =
          localStorage.getItem(
            "ridemateUser"
          );

        if (!savedUser) {
          alert(
            "Please login first."
          );

          return false;
        }

        const user =
          JSON.parse(savedUser);

        const userName =
          user.name ||
          user.username ||
          "";

        if (!userName) {
          alert(
            "Please login first."
          );

          return false;
        }

        const trip =
          trips.find(
            (item) =>
              item.id === id
          );

        const localLiked =
          Array.isArray(
            trip?.likedBy
          ) &&
          trip!.likedBy!.includes(
            userName
          );

        /*
         * OPTIMISTIC UI
         *
         * Update the screen immediately
         * instead of waiting for Firebase.
         */

        setTrips(
          (prevTrips) =>
            prevTrips.map(
              (post) => {
                if (
                  post.id !== id
                ) {
                  return post;
                }

                const currentLikedBy =
                  Array.isArray(
                    post.likedBy
                  )
                    ? post.likedBy
                    : [];

                if (
                  localLiked
                ) {
                  return {
                    ...post,

                    likes:
                      Math.max(
                        0,
                        (post.likes ||
                          0) - 1
                      ),

                    likedBy:
                      currentLikedBy.filter(
                        (name) =>
                          name !==
                          userName
                      ),
                  };
                }

                return {
                  ...post,

                  likes:
                    (post.likes ||
                      0) + 1,

                  likedBy: [
                    ...currentLikedBy,
                    userName,
                  ],
                };
              }
            )
        );

        const tripRef =
          doc(
            db,
            "feedPosts",
            id
          );

        let didLike =
          !localLiked;

        try {
          await runTransaction(
            db,
            async (
              transaction
            ) => {
              const tripDoc =
                await transaction.get(
                  tripRef
                );

              if (
                !tripDoc.exists()
              ) {
                throw new Error(
                  "Post no longer exists."
                );
              }

              const data =
                tripDoc.data();

              const likedBy =
                Array.isArray(
                  data.likedBy
                )
                  ? data.likedBy
                  : [];

              const currentLikes =
                typeof data.likes ===
                "number"
                  ? data.likes
                  : 0;

              const alreadyLiked =
                likedBy.includes(
                  userName
                );

              if (
                alreadyLiked
              ) {
                didLike = false;

                transaction.update(
                  tripRef,
                  {
                    likes:
                      Math.max(
                        0,
                        currentLikes -
                          1
                      ),

                    likedBy:
                      arrayRemove(
                        userName
                      ),
                  }
                );
              } else {
                didLike = true;

                transaction.update(
                  tripRef,
                  {
                    likes:
                      currentLikes +
                      1,

                    likedBy:
                      arrayUnion(
                        userName
                      ),
                  }
                );
              }
            }
          );
        } catch (firebaseError) {
          /*
           * Roll back optimistic UI.
           */

          setTrips(
            (prevTrips) =>
              prevTrips.map(
                (post) => {
                  if (
                    post.id !== id
                  ) {
                    return post;
                  }

                  const likedBy =
                    Array.isArray(
                      post.likedBy
                    )
                      ? post.likedBy
                      : [];

                  if (
                    localLiked
                  ) {
                    return {
                      ...post,

                      likes:
                        (post.likes ||
                          0) + 1,

                      likedBy: [
                        ...likedBy,
                        userName,
                      ],
                    };
                  }

                  return {
                    ...post,

                    likes:
                      Math.max(
                        0,
                        (post.likes ||
                          0) - 1
                      ),

                    likedBy:
                      likedBy.filter(
                        (name) =>
                          name !==
                          userName
                      ),
                  };
                }
              )
          );

          throw firebaseError;
        }

        /*
         * Notify post owner.
         */

        if (
          didLike &&
          trip &&
          trip.userName &&
          trip.userName !==
            userName
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
                `${userName} liked your post ❤️`,

              createdAt:
                Date.now(),

              read: false,
            }
          );
        }

        return didLike;
      } catch (error) {
        console.error(
          "Like error:",
          error
        );

        return false;
      }
    };

  /* =========================================================
     ADD COMMENT
  ========================================================= */

  const addComment =
    async (
      tripId: string,
      commentTextValue: string
    ) => {
      if (
        blockedAdminAction(
          "comment on posts"
        )
      ) {
        return false;
      }

      if (
        !commentTextValue.trim()
      ) {
        return false;
      }

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

          return false;
        }

        const newComment: Comment =
          {
            user: user.name,

            image:
              user.image || "",

            text:
              commentTextValue.trim(),
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

              read: false,
            }
          );
        }

        /*
         * Update feed immediately.
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
         * Update comment popup.
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

        return true;
      } catch (error) {
        console.error(
          "Comment error:",
          error
        );

        return false;
      }
    };

  /* =========================================================
     SEND COMMENT
  ========================================================= */

  const sendComment =
    async () => {
      if (
        !commentPost ||
        !commentText.trim()
      ) {
        return;
      }

      if (isAdminView) {
        blockedAdminAction(
          "comment on posts"
        );

        return;
      }

      const textToSend =
        commentText.trim();

      const success =
        await addComment(
          commentPost.id,
          textToSend
        );

      if (success) {
        setCommentText("");
      }
    };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (
    loadingFeed &&
    trips.length === 0
  ) {
    return (
      <main
        className="
          fixed
          inset-0
          top-16
          bg-black
          text-white
          flex
          items-center
          justify-center
        "
      >
        <div className="text-center">
          <div
            className="
              w-10
              h-10
              border-4
              border-zinc-700
              border-t-orange-500
              rounded-full
              animate-spin
              mx-auto
              mb-4
            "
          />

          <p className="text-zinc-400">
            Loading your rides...
          </p>
        </div>
      </main>
    );
  }

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
          ADMIN READ-ONLY NOTICE
      ===================================================== */}

      {isAdminView && (
        <div
          className="
            absolute
            top-0
            left-0
            right-0
            z-[100]
            bg-orange-600
            text-black
            text-center
            py-2
            px-4
            text-xs
            sm:text-sm
            font-black
          "
        >
          🛡️ INVESTIGATION MODE — Viewing{" "}
          {adminView?.userName ||
            "User"}'s Home Feed

          <span className="ml-2 opacity-70">
            (Read Only)
          </span>
        </div>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className={`
          absolute
          left-0
          right-0
          z-50
          flex
          justify-between
          items-center
          px-5
          ${
            isAdminView
              ? "top-12"
              : "top-4"
          }
        `}
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

        {isAdminView ? (
          <div
            className="
              bg-zinc-800
              text-zinc-400
              px-4
              py-2
              rounded-full
              font-bold
              text-sm
            "
          >
            🔒 Read Only
          </div>
        ) : (
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
        )}
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
        onScroll={handleFeedScroll}
      >
        <div>
          {trips.map(
            (trip, index) => (
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
                  onDoubleClick={async () => {
                    if (isAdminView) {
                      blockedAdminAction(
                        "like posts"
                      );

                      return;
                    }

                    const liked =
                      await likeTrip(
                        trip.id
                      );

                    if (liked) {
                      setHeartAnimation(
                        trip.id
                      );

                      setTimeout(() => {
                        setHeartAnimation(
                          null
                        );
                      }, 800);
                    }
                  }}
                >
                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  {trip.mediaUrl ? (
                    trip.mediaType?.startsWith(
                      "image"
                    ) ? (
                      <img
                        src={
                          trip.mediaUrl
                        }
                        alt={
                          trip.caption ||
                          "RideMate post"
                        }
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                        loading={
                          index < 2
                            ? "eager"
                            : "lazy"
                        }
                        decoding="async"
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
                        autoPlay={
                          index < 2
                        }
                        muted
                        loop
                        playsInline
                        preload={
                          index < 2
                            ? "metadata"
                            : "none"
                        }
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
                        <p className="text-zinc-400">
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
                      <p className="text-zinc-400">
                        📷 No media available
                      </p>
                    </div>
                  )}

                  {/* =================================================
                      RIDER INFO
                  ================================================= */}

                  <Link
                    href={`/rider/${encodeURIComponent(
                      trip.userName || ""
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
                        loading="lazy"
                        decoding="async"
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

                    <span className="font-bold text-white">
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
                      {trip.caption
                        ? trip.caption.length >
                          120
                          ? trip.caption.substring(
                              0,
                              120
                            ) + "..."
                          : trip.caption
                        : "No caption yet."}
                    </p>

                    {trip.caption &&
                      trip.caption.length >
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
                      onClick={async (e) => {
                        e.stopPropagation();

                        if (isAdminView) {
                          blockedAdminAction(
                            "like posts"
                          );

                          return;
                        }

                        await likeTrip(
                          trip.id
                        );
                      }}
                      className="
                        flex
                        flex-col
                        items-center
                      "
                    >
                      <Heart
                        className={`
                          w-8
                          h-8
                          transition-all
                          duration-200
                          ${
                            Array.isArray(
                              trip.likedBy
                            ) &&
                            trip.likedBy.includes(
                              currentUserName
                            )
                              ? "fill-red-500 text-red-500"
                              : "text-white"
                          }
                        `}
                      />

                      <span className="text-sm font-bold mt-1">
                        {trip.likes || 0}
                      </span>
                    </button>

                    {/* COMMENT */}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        setCommentText("");

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

                      <span className="text-sm font-bold mt-1">
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

                        if (isAdminView) {
                          blockedAdminAction(
                            "save or unsave posts"
                          );

                          return;
                        }

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
                        className={`
                          w-8
                          h-8
                          ${
                            savedTrips.includes(
                              trip.id
                            )
                              ? "fill-white text-white"
                              : "text-white"
                          }
                        `}
                      />

                      <span className="text-sm font-bold mt-1">
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
                      <span className="text-8xl">
                        ❤️
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* =====================================================
              LOAD MORE INDICATOR
          ===================================================== */}

          {loadingMore && (
            <div
              className="
                h-20
                flex
                items-center
                justify-center
                bg-black
              "
            >
              <div
                className="
                  w-6
                  h-6
                  border-2
                  border-zinc-700
                  border-t-orange-500
                  rounded-full
                  animate-spin
                "
              />
            </div>
          )}

          {/* =====================================================
              EMPTY / ERROR FEED
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
                {feedError ? (
                  <>
                    <div className="text-6xl mb-5">
                      ⚠️
                    </div>

                    <h2
                      className="
                        text-2xl
                        sm:text-3xl
                        font-black
                      "
                    >
                      Unable to load feed
                    </h2>

                    <p
                      className="
                        text-zinc-400
                        mt-3
                        max-w-md
                      "
                    >
                      Something went wrong while
                      loading your RideMate feed.
                    </p>

                    <button
                      onClick={() => {
                        lastPostDocRef.current =
                          null;

                        setHasMorePosts(
                          true
                        );

                        loadFeedPosts(
                          getActiveUserName(),
                          false
                        );
                      }}
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
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-5">
                      🏍️
                    </div>

                    <h2
                      className="
                        text-2xl
                        sm:text-3xl
                        font-black
                      "
                    >
                      {isAdminView
                        ? "No posts found for this user"
                        : "Your RideMate feed is quiet"}
                    </h2>

                    <p
                      className="
                        text-zinc-400
                        mt-3
                        max-w-md
                      "
                    >
                      {isAdminView
                        ? "This user has no posts from riders they follow."
                        : "Follow riders to see their posts here, or create your own post."}
                    </p>

                    {!isAdminView && (
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
                    )}
                  </>
                )}
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
          onClick={() => {
            setCommentPost(null);
            setCommentText("");
          }}
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
            {/* COMMENT HEADER */}

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
              <h2 className="text-xl font-bold">
                Comments
              </h2>

              <button
                onClick={() => {
                  setCommentPost(null);
                  setCommentText("");
                }}
                className="
                  text-2xl
                  hover:text-orange-500
                  transition
                "
              >
                ✕
              </button>
            </div>

            {/* COMMENTS LIST */}

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
                    comment,
                    index
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
                          loading="lazy"
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
                            flex-shrink-0
                          "
                        >
                          👤
                        </div>
                      )}

                      <div>
                        <p className="font-bold">
                          {comment.user}
                        </p>

                        <p className="text-zinc-300">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* COMMENT INPUT */}

            {isAdminView ? (
              <div
                className="
                  border-t
                  border-zinc-800
                  p-4
                  text-center
                  text-sm
                  text-zinc-500
                "
              >
                🔒 Admin Investigation Mode —
                comments are read-only.
              </div>
            ) : (
              <div
                className="
                  border-t
                  border-zinc-800
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    bg-black
                    border
                    border-zinc-700
                    rounded-full
                    p-1.5
                    focus-within:border-orange-500
                    transition
                  "
                >
                  <input
                    type="text"
                    value={
                      commentText
                    }
                    onChange={(e) =>
                      setCommentText(
                        e.target.value
                      )
                    }
                    placeholder="Add a comment..."
                    className="
                      flex-1
                      bg-transparent
                      px-4
                      py-2.5
                      text-white
                      outline-none
                      placeholder:text-zinc-500
                    "
                    onKeyDown={async (
                      e
                    ) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        e.preventDefault();

                        await sendComment();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={
                      sendComment
                    }
                    disabled={
                      !commentText.trim()
                    }
                    className="
                      w-10
                      h-10
                      rounded-full
                      flex
                      items-center
                      justify-center
                      bg-orange-500
                      text-black
                      flex-shrink-0
                      transition-all
                      duration-200
                      hover:bg-orange-400
                      hover:scale-105
                      active:scale-95
                      disabled:opacity-30
                      disabled:cursor-not-allowed
                    "
                    aria-label="Send comment"
                  >
                    <Send
                      className="
                        w-5
                        h-5
                        -rotate-12
                      "
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}