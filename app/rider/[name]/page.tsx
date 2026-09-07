"use client";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
} from "firebase/storage";

import {
  db,
  auth,
  app,
} from "../../firebase";

import {
  signOut,
} from "firebase/auth";

export default function RiderPage() {

  const params = useParams();
  const router = useRouter();

  const riderName =
    decodeURIComponent(
      params.name as string
    );

  const [riderTrips, setRiderTrips] =
    useState<any[]>([]);

  const [riderPosts, setRiderPosts] =
    useState<any[]>([]);

  const [totalLikes, setTotalLikes] =
    useState(0);

  const [riderImage, setRiderImage] =
    useState("");

  const [profileImageVersion, setProfileImageVersion] =
    useState(Date.now());

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followers, setFollowers] =
    useState(0);

  const [totalDistance, setTotalDistance] =
    useState(0);

  const [badge, setBadge] =
    useState("");

  const [following, setFollowing] =
    useState(0);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [showBio, setShowBio] =
    useState(false);

  const [reviews, setReviews] =
    useState<any[]>([]);

  const [avgRating, setAvgRating] =
    useState(0);

  const [reviewCount, setReviewCount] =
    useState(0);

  const [selectedPost, setSelectedPost] =
    useState<any>(null);

  const [postComments, setPostComments] =
    useState<any[]>([]);

  const [newComment, setNewComment] =
    useState("");

  /*
  ============================================================
  PROFILE PHOTO UPLOAD STATE
  ============================================================
  */

  const [uploadingProfileImage, setUploadingProfileImage] =
    useState(false);

  const profileInputRef =
    useRef<HTMLInputElement | null>(null);

  /*
  ============================================================
  LOGOUT
  ============================================================
  */

  const logout = async () => {

    try {

      await signOut(auth);

      localStorage.clear();

      router.replace("/login");

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      alert(
        "Logout failed"
      );

    }

  };

  /*
  ============================================================
  CHANGE PROFILE PICTURE
  ============================================================
  */

  const changeProfilePicture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    try {

      /*
      ----------------------------------------------------------
      CHECK FIREBASE LOGIN
      ----------------------------------------------------------
      */

      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {

        alert(
          "Your login session has expired. Please login again."
        );

        return;

      }

      /*
      ----------------------------------------------------------
      CHECK FILE TYPE
      ----------------------------------------------------------
      */

      if (
        !file.type.startsWith("image/")
      ) {

        alert(
          "Please select an image file."
        );

        return;

      }

      /*
      ----------------------------------------------------------
      CHECK FILE SIZE
      ----------------------------------------------------------
      */

      const maxSize =
        10 * 1024 * 1024;

      if (
        file.size > maxSize
      ) {

        alert(
          "Profile picture must be smaller than 10 MB."
        );

        return;

      }

      setUploadingProfileImage(
        true
      );

      /*
      ----------------------------------------------------------
      UNIQUE FILE NAME
      ----------------------------------------------------------
      */

      const safeFileName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      const fileName =
        `${Date.now()}_${safeFileName}`;

      /*
      ----------------------------------------------------------
      FIREBASE STORAGE
      ----------------------------------------------------------
      */

      const storage =
        getStorage(app);

      const storageRef =
        ref(
          storage,
          `profilePictures/${firebaseUser.uid}/${fileName}`
        );

      console.log(
        "Uploading profile picture..."
      );

      /*
      ----------------------------------------------------------
      UPLOAD
      ----------------------------------------------------------
      */

      await uploadBytes(
        storageRef,
        file
      );

      /*
      ----------------------------------------------------------
      DOWNLOAD URL
      ----------------------------------------------------------
      */

      const downloadURL =
        await getDownloadURL(
          storageRef
        );

      console.log(
        "New profile picture URL:",
        downloadURL
      );

      /*
      ----------------------------------------------------------
      UPDATE FIRESTORE
      ----------------------------------------------------------
      */

      await updateDoc(
        doc(
          db,
          "users",
          firebaseUser.uid
        ),
        {
          image: downloadURL,
        }
      );

      /*
      ----------------------------------------------------------
      UPDATE LOCAL STORAGE
      ----------------------------------------------------------
      */

      const savedUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      const updatedUser = {

        ...savedUser,

        uid:
          savedUser.uid ||
          firebaseUser.uid,

        name:
          savedUser.name ||
          firebaseUser.displayName ||
          "",

        image:
          downloadURL,

      };

      localStorage.setItem(
        "ridemateUser",
        JSON.stringify(
          updatedUser
        )
      );

      /*
      ----------------------------------------------------------
      UPDATE REACT STATE IMMEDIATELY
      ----------------------------------------------------------
      */

      setCurrentUser(
        updatedUser
      );

      setRiderImage(
        downloadURL
      );

      /*
      Force browser to treat
      this as a fresh image.
      */

      setProfileImageVersion(
        Date.now()
      );

      alert(
        "Profile picture updated successfully! 🔥"
      );

    } catch (error) {

      console.error(
        "Profile picture upload error:",
        error
      );

      alert(
        "Failed to update profile picture. Please try again."
      );

    } finally {

      setUploadingProfileImage(
        false
      );

      if (
        profileInputRef.current
      ) {

        profileInputRef.current.value =
          "";

      }

    }

  };

  /*
  ============================================================
  OPEN POST
  ============================================================
  */

  const openPost = async (
    post: any
  ) => {

    setSelectedPost(
      post
    );

    try {

      const q =
        query(
          collection(
            db,
            "comments"
          ),
          where(
            "postId",
            "==",
            post.id
          ),
          orderBy(
            "createdAt",
            "asc"
          )
        );

      const snapshot =
        await getDocs(
          q
        );

      const comments =
        snapshot.docs.map(
          (
            commentDoc
          ) => ({
            id:
              commentDoc.id,
            ...commentDoc.data(),
          })
        );

      setPostComments(
        comments
      );

    } catch (error) {

      console.error(
        "Failed to load comments:",
        error
      );

    }

  };

  /*
  ============================================================
  ADD COMMENT
  ============================================================
  */

  const addCommentToPost =
    async () => {

      if (
        !newComment.trim()
      )
        return;

      if (
        !currentUser?.name
      )
        return;

      if (
        !selectedPost
      )
        return;

      try {

        await addDoc(
          collection(
            db,
            "comments"
          ),
          {

            postId:
              selectedPost.id,

            user:
              currentUser.name,

            text:
              newComment.trim(),

            image:
              currentUser.image ||
              "",

            createdAt:
              Date.now(),

          }
        );

        setNewComment(
          ""
        );

        openPost(
          selectedPost
        );

      } catch (error) {

        console.error(
          "Failed to add comment:",
          error
        );

      }

    };

  /*
  ============================================================
  ACHIEVEMENTS
  ============================================================
  */

  const achievements: string[] = [];

  if (
    riderTrips.length >= 1
  )
    achievements.push(
      "🏍 First Ride"
    );

  if (
    riderTrips.length >= 5
  )
    achievements.push(
      "🥈 Road Explorer"
    );

  if (
    riderTrips.length >= 10
  )
    achievements.push(
      "🥇 RideMate Legend"
    );

  if (
    totalDistance >= 500
  )
    achievements.push(
      "🔵 Explorer"
    );

  if (
    totalDistance >= 2000
  )
    achievements.push(
      "🟣 Road Warrior"
    );

  if (
    totalDistance >= 5000
  )
    achievements.push(
      "🟠 Adventure Master"
    );

  if (
    totalDistance >= 10000
  )
    achievements.push(
      "🔴 RideMate Legend"
    );

  if (
    totalLikes >= 50
  )
    achievements.push(
      "❤️ Popular Rider"
    );

  if (
    totalLikes >= 100
  )
    achievements.push(
      "🔥 Viral Rider"
    );

  if (
    followers >= 10
  )
    achievements.push(
      "👥 Community Star"
    );

  if (
    followers >= 50
  )
    achievements.push(
      "👑 RideMate Icon"
    );

  /*
  ============================================================
  LOAD RIDER DATA
  ============================================================
  */

  useEffect(() => {

    const loadRider =
      async () => {

        try {

          /*
          ======================================================
          LOAD SAVED USER
          ======================================================
          */

          const savedUser =
            JSON.parse(
              localStorage.getItem(
                "ridemateUser"
              ) || "{}"
            );

          /*
          ======================================================
          FIND PROFILE IMAGE
          ======================================================
          */

          let profileImage =
            "";

          /*
          ------------------------------------------------------
          OWN PROFILE
          ------------------------------------------------------
          */

          if (
            savedUser?.uid &&
            savedUser?.name === riderName
          ) {

            const userDoc =
              await getDoc(
                doc(
                  db,
                  "users",
                  savedUser.uid
                )
              );

            if (
              userDoc.exists()
            ) {

              const userData =
                userDoc.data();

              profileImage =
                userData.image ||
                "";

            }

          }

          /*
          ------------------------------------------------------
          OTHER RIDER PROFILE
          ------------------------------------------------------
          */

          if (
            !profileImage
          ) {

            const usersSnapshot =
              await getDocs(
                collection(
                  db,
                  "users"
                )
              );

            usersSnapshot.forEach(
              (
                userDoc
              ) => {

                const user =
                  userDoc.data();

                if (
                  user.username ===
                  riderName
                ) {

                  if (
                    user.image
                  ) {

                    profileImage =
                      user.image;

                  }

                }

              }
            );

          }

          /*
          ======================================================
          LOAD COMPLETED TRIPS
          ======================================================
          */

          const snapshot =
            await getDocs(
              collection(
                db,
                "trips"
              )
            );

          const trips: any[] =
            [];

          let likes =
            0;

          let distance =
            0;

          let image =
            profileImage;

          snapshot.forEach(
            (
              tripDoc
            ) => {

              const trip =
                tripDoc.data();

              if (
                trip.userName ===
                  riderName &&
                trip.status ===
                  "completed"
              ) {

                trips.push({

                  id:
                    tripDoc.id,

                  ...trip,

                });

                likes +=
                  Number(
                    trip.likes ||
                      0
                  );

                distance +=
                  Number(
                    trip.distance ||
                      0
                  );

                /*
                Trip image is ONLY
                fallback.
                */

                if (
                  !image &&
                  trip.userImage
                ) {

                  image =
                    trip.userImage;

                }

              }

            }
          );

          /*
          ======================================================
          SET PROFILE DATA
          ======================================================
          */

          setRiderTrips(
            trips
          );

          setTotalLikes(
            likes
          );

          setTotalDistance(
            distance
          );

          /*
          Only update rider image
          if we actually found one.
          */

          if (
            image
          ) {

            setRiderImage(
              image
            );

          }

          /*
          ======================================================
          LOAD POSTS
          ======================================================
          */

          const postSnapshot =
            await getDocs(
              collection(
                db,
                "feedPosts"
              )
            );

          const posts: any[] =
            [];

          postSnapshot.forEach(
            (
              postDoc
            ) => {

              const post =
                postDoc.data();

              if (
                post.userName ===
                  riderName &&
                post.mediaUrl
              ) {

                posts.push({

                  id:
                    postDoc.id,

                  ...post,

                });

              }

            }
          );

          /*
          Newest first
          */

          posts.sort(
            (
              a,
              b
            ) =>
              Number(
                b.createdAt ||
                  0
              ) -
              Number(
                a.createdAt ||
                  0
              )
          );

          setRiderPosts(
            posts
          );

          /*
          ======================================================
          LOAD REVIEWS
          ======================================================
          */

          const reviewSnapshot =
            await getDocs(
              collection(
                db,
                "rideReviews"
              )
            );

          const riderReviews:
            any[] =
            [];

          let totalRating =
            0;

          reviewSnapshot.forEach(
            (
              reviewDoc
            ) => {

              const review =
                reviewDoc.data();

              if (
                review.rider ===
                riderName
              ) {

                riderReviews.push(
                  review
                );

                totalRating +=
                  Number(
                    review.rating ||
                      0
                  );

              }

            }
          );

          setReviews(
            riderReviews.sort(
              (
                a,
                b
              ) =>
                Number(
                  b.createdAt ||
                    0
                ) -
                Number(
                  a.createdAt ||
                    0
                )
            )
          );

          setReviewCount(
            riderReviews.length
          );

          setAvgRating(
            riderReviews.length
              ? totalRating /
                  riderReviews.length
              : 0
          );

          /*
          ======================================================
          BADGE
          ======================================================
          */

          if (
            trips.length >= 10
          ) {

            setBadge(
              "🥇 RideMate Legend"
            );

          } else if (
            trips.length >= 5
          ) {

            setBadge(
              "🥈 Road Explorer"
            );

          } else if (
            trips.length >= 1
          ) {

            setBadge(
              "🥉 Rookie Rider"
            );

          }

        } catch (
          error
        ) {

          console.error(
            "Failed to load rider:",
            error
          );

        }

      };

    loadRider();

  }, [
    riderName
  ]);

  /*
  ============================================================
  LOAD CURRENT USER + FOLLOW STATUS
  ============================================================
  */

  useEffect(() => {

    const checkFollowStatus =
      async () => {

        try {

          const savedUser =
            JSON.parse(
              localStorage.getItem(
                "ridemateUser"
              ) || "{}"
            );

          setCurrentUser(
            savedUser
          );

          if (
            !savedUser.name
          )
            return;

          const followId =
            `${savedUser.name}_${riderName}`;

          const followDoc =
            await getDoc(
              doc(
                db,
                "follows",
                followId
              )
            );

          setIsFollowing(
            followDoc.exists()
          );

          /*
          ======================================================
          FOLLOW COUNTS
          ======================================================
          */

          const followsSnapshot =
            await getDocs(
              collection(
                db,
                "follows"
              )
            );

          let count =
            0;

          let followingCount =
            0;

          followsSnapshot.forEach(
            (
              followDoc
            ) => {

              const follow =
                followDoc.data();

              if (
                follow.following ===
                riderName
              ) {

                count++;

              }

              if (
                follow.follower ===
                riderName
              ) {

                followingCount++;

              }

            }
          );

          setFollowers(
            count
          );

          setFollowing(
            followingCount
          );

        } catch (
          error
        ) {

          console.error(
            "Follow status error:",
            error
          );

        }

      };

    checkFollowStatus();

  }, [
    riderName
  ]);

  /*
  ============================================================
  FOLLOW / UNFOLLOW
  ============================================================
  */

  const toggleFollow =
    async () => {

      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (
        !currentUser.name
      )
        return;

      const followId =
        `${currentUser.name}_${riderName}`;

      try {

        if (
          isFollowing
        ) {

          await deleteDoc(
            doc(
              db,
              "follows",
              followId
            )
          );

          setIsFollowing(
            false
          );

          setFollowers(
            (
              prev
            ) =>
              Math.max(
                0,
                prev - 1
              )
          );

        } else {

          await setDoc(
            doc(
              db,
              "follows",
              followId
            ),
            {

              follower:
                currentUser.name,

              following:
                riderName,

            }
          );

          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {

              user:
                riderName,

              text:
                `${currentUser.name} followed you 👥`,

              createdAt:
                Date.now(),

            }
          );

          setIsFollowing(
            true
          );

          setFollowers(
            (
              prev
            ) =>
              prev + 1
          );

        }

      } catch (
        error
      ) {

        console.error(
          "Follow error:",
          error
        );

      }

    };

  /*
  ============================================================
  RENDER
  ============================================================
  */

  const isOwnProfile =
    currentUser?.name ===
    riderName;

  /*
  ============================================================
  PROFILE IMAGE URL
  ============================================================
  */

  const displayedProfileImage =
    riderImage
      ? `${riderImage}${
          riderImage.includes("?")
            ? "&"
            : "?"
        }v=${profileImageVersion}`
      : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300";

  return (

    <main className="min-h-screen bg-black text-white px-6 pt-24 pb-10">

      <div className="max-w-4xl mx-auto">

        <div className="text-center">

          {/* ==================================================
              PROFILE PHOTO
          ================================================== */}

          <div className="flex justify-center">

            <div className="relative">

              <img
                src={
                  displayedProfileImage
                }
                alt="Rider"
                className="
                  w-36
                  h-36
                  rounded-full
                  border-4
                  border-orange-500
                  shadow-2xl
                  object-cover
                "
              />

              {/* ==================================================
                  CHANGE PROFILE PHOTO
              ================================================== */}

              {isOwnProfile && (

                <>

                  <button
                    type="button"
                    onClick={() =>
                      profileInputRef.current?.click()
                    }
                    disabled={
                      uploadingProfileImage
                    }
                    className="
                      absolute
                      bottom-0
                      right-0
                      w-11
                      h-11
                      rounded-full
                      bg-orange-500
                      text-black
                      border-4
                      border-black
                      flex
                      items-center
                      justify-center
                      font-black
                      text-xl
                      hover:bg-orange-400
                      hover:scale-105
                      transition
                      disabled:opacity-50
                    "
                    title="Change profile picture"
                  >

                    {
                      uploadingProfileImage
                        ? "⏳"
                        : "📷"
                    }

                  </button>

                  <input
                    ref={
                      profileInputRef
                    }
                    type="file"
                    accept="image/*"
                    onChange={
                      changeProfilePicture
                    }
                    className="hidden"
                  />

                </>

              )}

            </div>

          </div>

          {/* ==================================================
              UPLOAD STATUS
          ================================================== */}

          {isOwnProfile &&
            uploadingProfileImage && (

              <p className="
                text-orange-400
                font-bold
                mt-3
              ">
                Uploading profile picture... ⏳
              </p>

            )}

          {isOwnProfile && (

            <p className="
              text-zinc-500
              text-sm
              mt-2
            ">
              Tap the 📷 button to change your profile picture
            </p>

          )}

          {/* ==================================================
              NAME
          ================================================== */}

          <h1 className="
            text-5xl
            font-black
            text-orange-500
            mt-6
          ">
            {riderName}
          </h1>

          <div className="
            mt-2
            mb-6
            text-lg
            font-bold
            text-yellow-400
          ">
            {badge}
          </div>

          {/* ==================================================
              FOLLOW + MESSAGE
          ================================================== */}

          {!isOwnProfile && (

            <div className="
              mt-10
              mb-10
              flex
              flex-col
              gap-3
              items-center
            ">

              <button
                onClick={
                  toggleFollow
                }
                className={`
                  px-8
                  py-3
                  rounded-2xl
                  font-black
                  ${
                    isFollowing
                      ? "bg-zinc-700"
                      : "bg-orange-500 text-black"
                  }
                `}
              >

                {
                  isFollowing
                    ? "Following ✅"
                    : "Follow 👥"
                }

              </button>

              <Link
                href={`/chat/${encodeURIComponent(
                  riderName
                )}`}
                className="
                  bg-blue-600
                  px-8
                  py-3
                  rounded-2xl
                  font-black
                "
              >
                Message Rider 💬
              </Link>

            </div>

          )}

          {/* ==================================================
              STATS
          ================================================== */}

          <div className="
            grid
            grid-cols-3
            gap-4
            mt-10
          ">

            {/* FOLLOWERS */}

            <Link
              href={`/rider/${encodeURIComponent(
                riderName
              )}/followers`}
              className="
                bg-zinc-900
                p-4
                rounded-2xl
                border
                border-zinc-800
                hover:border-orange-500
                text-center
                transition
              "
            >

              <p className="
                text-2xl
                font-black
                text-white
              ">
                {followers}
              </p>

              <p className="
                text-sm
                text-zinc-400
                mt-1
              ">
                Followers
              </p>

            </Link>

            {/* FOLLOWING */}

            <Link
              href={`/rider/${encodeURIComponent(
                riderName
              )}/following`}
              className="
                bg-zinc-900
                p-4
                rounded-2xl
                border
                border-zinc-800
                hover:border-orange-500
                text-center
                transition
              "
            >

              <p className="
                text-2xl
                font-black
                text-white
              ">
                {following}
              </p>

              <p className="
                text-sm
                text-zinc-400
                mt-1
              ">
                Following
              </p>

            </Link>

            {/* RATING */}

            <Link
              href={`/rider/${encodeURIComponent(
                riderName
              )}/reviews`}
              className="
                bg-zinc-900
                p-4
                rounded-2xl
                border
                border-zinc-800
                hover:border-orange-500
                text-center
                transition
              "
            >

              <p className="
                text-2xl
                font-black
                text-yellow-400
              ">
                {avgRating.toFixed(1)}
              </p>

              <p className="
                text-sm
                text-zinc-400
                mt-1
              ">
                Rating
              </p>

            </Link>

          </div>

          {/* ==================================================
              RIDER BIO
          ================================================== */}

          <div className="
            mt-6
          ">

            <button
              onClick={() =>
                setShowBio(
                  !showBio
                )
              }
              className="
                w-full
                bg-zinc-900
                p-4
                rounded-2xl
                border
                border-zinc-800
                text-orange-500
                font-black
              "
            >

              {
                showBio
                  ? "▲ Hide Rider Bio"
                  : "▼ Rider Bio"
              }

            </button>

            {showBio && (

              <div className="
                space-y-3
                mt-4
              ">

                {/* TRIPS */}

                <div className="
                  bg-zinc-900
                  p-4
                  rounded-2xl
                ">
                  🏍 Trips Posted:{" "}
                  {riderTrips.length}
                </div>

                {/* LIKES */}

                <div className="
                  bg-zinc-900
                  p-4
                  rounded-2xl
                ">
                  ❤️ Likes Received:{" "}
                  {totalLikes}
                </div>

                {/* DISTANCE */}

                <div className="
                  bg-zinc-900
                  p-4
                  rounded-2xl
                ">
                  🛣️ Total Distance:{" "}
                  {totalDistance} KM
                </div>

                {/* RIDER LEVEL */}

                <div className="
                  bg-zinc-900
                  p-4
                  rounded-2xl
                ">

                  {
                    totalDistance >= 10000
                      ? "🔴 RideMate Legend"
                      : totalDistance >= 5000
                      ? "🟠 Adventure Master"
                      : totalDistance >= 2000
                      ? "🟣 Road Warrior"
                      : totalDistance >= 500
                      ? "🔵 Explorer"
                      : "🟢 Beginner Rider"
                  }

                </div>

                {/* ACHIEVEMENTS */}

                <div className="
                  bg-zinc-900
                  p-4
                  rounded-2xl
                ">

                  <h3 className="
                    text-orange-500
                    font-black
                    mb-3
                  ">
                    🏅 Achievements
                  </h3>

                  <div className="
                    space-y-2
                  ">

                    {achievements.map(
                      (
                        achievement,
                        index
                      ) => (

                        <div
                          key={
                            index
                          }
                          className="
                            bg-black
                            p-3
                            rounded-xl
                          "
                        >
                          {
                            achievement
                          }
                        </div>

                      )
                    )}

                    {achievements.length ===
                      0 && (

                      <p className="
                        text-zinc-500
                      ">
                        Keep riding to unlock achievements 🏍️
                      </p>

                    )}

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* ==================================================
              POSTS
          ================================================== */}

          <div className="
            mt-10
          ">

            <h2 className="
              text-3xl
              font-black
              text-orange-500
              mt-8
              mb-6
            ">
              Posts
            </h2>

            {riderPosts.length ===
            0 ? (

              <div className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-10
                text-zinc-500
              ">
                No posts yet 🏍️
              </div>

            ) : (

              <div className="
                grid
                grid-cols-3
                gap-1
              ">

                {riderPosts.map(
                  (
                    post
                  ) => (

                    <div
                      key={
                        post.id
                      }
                      onClick={() =>
                        openPost(
                          post
                        )
                      }
                      className="
                        aspect-square
                        overflow-hidden
                        bg-zinc-900
                        cursor-pointer
                        hover:opacity-90
                        transition
                      "
                    >

                      {post.mediaUrl ? (

                        post.mediaType?.startsWith(
                          "image"
                        ) ? (

                          <img
                            src={
                              post.mediaUrl
                            }
                            className="
                              w-full
                              h-full
                              object-cover
                            "
                            alt=""
                          />

                        ) : (

                          <video
                            src={
                              post.mediaUrl
                            }
                            className="
                              w-full
                              h-full
                              object-cover
                            "
                            muted
                            playsInline
                            preload="metadata"
                          />

                        )

                      ) : (

                        <div className="
                          w-full
                          h-full
                          flex
                          items-center
                          justify-center
                          text-zinc-500
                        ">
                          No Media
                        </div>

                      )}

                    </div>

                  )
                )}

              </div>

            )}

          </div>

          {/* ==================================================
              LOGOUT
          ================================================== */}

          {isOwnProfile && (

            <div className="
              mt-12
            ">

              <button
                onClick={
                  logout
                }
                className="
                  w-full
                  bg-red-600
                  hover:bg-red-700
                  py-4
                  rounded-2xl
                  text-xl
                  font-black
                  transition
                "
              >
                🚪 Logout
              </button>

            </div>

          )}

        </div>

      </div>

      {/* ======================================================
          POST MODAL
      ====================================================== */}

      {selectedPost && (

        <div className="
          fixed
          inset-0
          bg-black/95
          z-[9999]
          overflow-y-auto
        ">

          <div className="
            max-w-3xl
            mx-auto
            p-6
          ">

            <button
              onClick={() => {

                setSelectedPost(
                  null
                );

                setNewComment(
                  ""
                );

                setPostComments(
                  []
                );

              }}
              className="
                text-3xl
                mb-5
              "
            >
              ❌
            </button>

            {/* MEDIA */}

            {selectedPost.mediaType?.startsWith(
              "image"
            ) ? (

              <img
                src={
                  selectedPost.mediaUrl
                }
                className="
                  w-full
                  rounded-2xl
                "
                alt=""
              />

            ) : (

              <video
                src={
                  selectedPost.mediaUrl
                }
                controls
                playsInline
                className="
                  w-full
                  rounded-2xl
                "
              />

            )}

            {/* POST INFO */}

            <div className="
              mt-6
            ">

              <h2 className="
                text-2xl
                font-black
              ">
                ❤️{" "}
                {
                  selectedPost.likes ||
                  0
                }{" "}
                Likes
              </h2>

              <p className="
                mt-3
                text-zinc-300
              ">
                {
                  selectedPost.caption ||
                  "No caption"
                }
              </p>

            </div>

            <hr className="
              my-6
              border-zinc-800
            " />

            {/* COMMENTS */}

            <h2 className="
              text-xl
              font-black
              mb-4
            ">
              Comments
            </h2>

            <div className="
              space-y-3
            ">

              {postComments.length ===
              0 ? (

                <p className="
                  text-zinc-500
                  text-center
                  py-6
                ">
                  No comments yet.
                </p>

              ) : (

                postComments.map(
                  (
                    comment,
                    index
                  ) => (

                    <div
                      key={
                        comment.id ||
                        index
                      }
                      className="
                        bg-zinc-900
                        p-3
                        rounded-xl
                      "
                    >

                      <b>
                        {
                          comment.user
                        }
                      </b>

                      <p className="
                        text-zinc-300
                        mt-1
                      ">
                        {
                          comment.text
                        }
                      </p>

                    </div>

                  )
                )

              )}

            </div>

            {/* COMMENT INPUT */}

            <div className="
              flex
              gap-3
              mt-6
            ">

              <input
                value={
                  newComment
                }
                onChange={(
                  e
                ) =>
                  setNewComment(
                    e.target.value
                  )
                }
                onKeyDown={async (
                  e
                ) => {

                  if (
                    e.key ===
                    "Enter"
                  ) {

                    e.preventDefault();

                    await addCommentToPost();

                  }

                }}
                placeholder="Write a comment..."
                className="
                  flex-1
                  p-3
                  rounded-xl
                  bg-zinc-900
                  border
                  border-zinc-800
                  outline-none
                  focus:border-orange-500
                "
              />

              <button
                onClick={
                  addCommentToPost
                }
                disabled={
                  !newComment.trim()
                }
                className="
                  bg-orange-500
                  text-black
                  px-6
                  rounded-xl
                  font-bold
                  disabled:opacity-40
                "
              >
                Send
              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}