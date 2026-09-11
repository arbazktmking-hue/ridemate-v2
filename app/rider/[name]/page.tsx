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


/* =========================================================
   ADMIN INVESTIGATION MODE
========================================================= */

type AdminView = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
};


export default function RiderPage() {

  const params = useParams();
  const router = useRouter();

  const riderName =
    decodeURIComponent(
      params.name as string
    );


  /* =========================================================
     PROFILE DATA
  ========================================================= */

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


  /* =========================================================
     PROFILE IMAGE VIEWER
  ========================================================= */

  const [showProfileImage, setShowProfileImage] =
    useState(false);


  /* =========================================================
     ADMIN VIEW STATE
  ========================================================= */

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const isAdminView =
    adminView?.active === true;


  /* =========================================================
     PROFILE PHOTO UPLOAD STATE
  ========================================================= */

  const [uploadingProfileImage, setUploadingProfileImage] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const profileInputRef =
    useRef<HTMLInputElement | null>(null);


  /* =========================================================
     LOAD ADMIN VIEW
  ========================================================= */

  useEffect(() => {

    const loadAdminView = () => {

      try {

        const savedAdminView =
          localStorage.getItem(
            "ridemateAdminView"
          );


        if (savedAdminView) {

          const parsed =
            JSON.parse(
              savedAdminView
            );


          if (
            parsed?.active
          ) {

            setAdminView(
              parsed
            );

            return;

          }

        }


        setAdminView(null);

      } catch (error) {

        console.error(
          "Failed to load admin view:",
          error
        );

        setAdminView(null);

      }

    };


    loadAdminView();


    window.addEventListener(
      "storage",
      loadAdminView
    );


    window.addEventListener(
      "ridemateAdminViewChanged",
      loadAdminView
    );


    return () => {

      window.removeEventListener(
        "storage",
        loadAdminView
      );


      window.removeEventListener(
        "ridemateAdminViewChanged",
        loadAdminView
      );

    };

  }, []);


  /* =========================================================
     CLOSE PROFILE IMAGE WITH ESC
  ========================================================= */

  useEffect(() => {

    if (
      !showProfileImage
    ) {

      return;

    }


    const handleEscape = (
      event: KeyboardEvent
    ) => {

      if (
        event.key === "Escape"
      ) {

        setShowProfileImage(
          false
        );

      }

    };


    window.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {

      window.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, [
    showProfileImage,
  ]);


  /* =========================================================
     LOCK BODY SCROLL
  ========================================================= */

  useEffect(() => {

    if (
      showProfileImage
    ) {

      document.body.style.overflow =
        "hidden";

    } else {

      document.body.style.overflow =
        "";

    }


    return () => {

      document.body.style.overflow =
        "";

    };

  }, [
    showProfileImage,
  ]);


  /* =========================================================
     ADMIN ACTION BLOCKER
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
     LOGOUT
  ========================================================= */

  const logout = async () => {

    if (
      blockedAdminAction(
        "logout from the account"
      )
    ) {

      return;

    }


    try {

      await signOut(
        auth
      );


      localStorage.clear();


      router.replace(
        "/login"
      );

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


  /* =========================================================
     CHANGE PROFILE PICTURE
  ========================================================= */

  const changeProfilePicture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    if (
      blockedAdminAction(
        "change the profile picture"
      )
    ) {

      return;

    }


    const file =
      event.target.files?.[0];


    if (!file) {

      return;

    }


    try {

      /* =====================================================
         FILE TYPE
      ===================================================== */

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        alert(
          "Please select an image file."
        );

        return;

      }


      /* =====================================================
         FILE SIZE
      ===================================================== */

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


      /* =====================================================
         FIREBASE AUTH
      ===================================================== */

      const firebaseUser =
        auth.currentUser;


      if (!firebaseUser) {

        alert(
          "Your login session has expired. Please login again."
        );

        return;

      }


      /* =====================================================
         START
      ===================================================== */

      setUploadingProfileImage(
        true
      );

      setUploadProgress(
        5
      );


      console.log(
        "================================="
      );

      console.log(
        "PROFILE IMAGE UPLOAD STARTED"
      );

      console.log(
        "User:",
        firebaseUser.uid
      );

      console.log(
        "File:",
        file.name
      );

      console.log(
        "Size:",
        file.size
      );

      console.log(
        "Type:",
        file.type
      );

      console.log(
        "================================="
      );


      /* =====================================================
         SAFE FILE NAME
      ===================================================== */

      const safeFileName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );


      const fileName =
        `${Date.now()}_${safeFileName}`;


      /* =====================================================
         STORAGE
      ===================================================== */

      const storage =
        getStorage(
          app
        );


      const storagePath =
        `profilePictures/${firebaseUser.uid}/${fileName}`;


      const storageRef =
        ref(
          storage,
          storagePath
        );


      console.log(
        "Storage path:",
        storagePath
      );


      /* =====================================================
         UPLOAD

         IMPORTANT:
         Using uploadBytes instead of
         uploadBytesResumable.

         This avoids the 0% resumable-upload
         problem you were experiencing.
      ===================================================== */

      setUploadProgress(
        15
      );


      console.log(
        "Uploading image to Firebase Storage..."
      );


      await uploadBytes(
        storageRef,
        file,
        {
          contentType:
            file.type,

          cacheControl:
            "public,max-age=31536000",
        }
      );


      console.log(
        "Firebase Storage upload completed."
      );


      setUploadProgress(
        70
      );


      /* =====================================================
         DOWNLOAD URL
      ===================================================== */

      const downloadURL =
        await getDownloadURL(
          storageRef
        );


      console.log(
        "Download URL:",
        downloadURL
      );


      setUploadProgress(
        80
      );


      /* =====================================================
         SAVE TO FIRESTORE
      ===================================================== */

      await setDoc(
        doc(
          db,
          "users",
          firebaseUser.uid
        ),
        {

          image:
            downloadURL,

          profileImageUpdatedAt:
            Date.now(),

        },
        {
          merge: true,
        }
      );


      console.log(
        "Profile image saved to Firestore."
      );


      setUploadProgress(
        90
      );


      /* =====================================================
         UPDATE LOCAL STORAGE
      ===================================================== */

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

        email:
          savedUser.email ||
          firebaseUser.email ||
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


      /* =====================================================
         UPDATE PAGE
      ===================================================== */

      setCurrentUser(
        updatedUser
      );


      setRiderImage(
        downloadURL
      );


      setProfileImageVersion(
        Date.now()
      );


      setUploadProgress(
        100
      );


      /* =====================================================
         CLOSE VIEWER
      ===================================================== */

      setShowProfileImage(
        false
      );


      console.log(
        "PROFILE IMAGE UPDATE COMPLETE"
      );


      alert(
        "Profile picture updated successfully! 🔥"
      );

    } catch (error: any) {

      console.error(
        "================================="
      );

      console.error(
        "PROFILE PICTURE UPLOAD ERROR"
      );

      console.error(
        "Error:",
        error
      );

      console.error(
        "Error code:",
        error?.code
      );

      console.error(
        "Error message:",
        error?.message
      );

      console.error(
        "================================="
      );


      let errorMessage =
        "Failed to update profile picture.";


      if (
        error?.code ===
        "storage/unauthorized"
      ) {

        errorMessage =
          "Firebase Storage permission denied.\n\nPlease check your Firebase Storage Rules.";

      } else if (
        error?.code ===
        "storage/unauthenticated"
      ) {

        errorMessage =
          "Firebase authentication expired.\n\nPlease logout and login again.";

      } else if (
        error?.code ===
        "storage/quota-exceeded"
      ) {

        errorMessage =
          "Firebase Storage quota has been exceeded.";

      } else if (
        error?.code ===
        "storage/canceled"
      ) {

        errorMessage =
          "The upload was cancelled.";

      } else if (
        error?.code ===
        "storage/retry-limit-exceeded"
      ) {

        errorMessage =
          "Firebase could not complete the upload.\n\nPlease check your internet connection and try again.";

      } else if (
        error?.message
      ) {

        errorMessage =
          `Upload failed.\n\n${error.message}`;

      }


      alert(
        errorMessage
      );

    } finally {

      setUploadingProfileImage(
        false
      );


      setUploadProgress(
        0
      );


      if (
        profileInputRef.current
      ) {

        profileInputRef.current.value =
          "";

      }

    }

  };


  /* =========================================================
     OPEN POST
  ========================================================= */

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


  /* =========================================================
     ADD COMMENT
  ========================================================= */

  const addCommentToPost =
    async () => {

      if (
        blockedAdminAction(
          "comment on posts"
        )
      ) {

        return;

      }


      if (
        !newComment.trim()
      ) {

        return;

      }


      if (
        !currentUser?.name
      ) {

        return;

      }


      if (
        !selectedPost
      ) {

        return;

      }


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


  /* =========================================================
     ACHIEVEMENTS
  ========================================================= */

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


  /* =========================================================
     LOAD RIDER DATA
  ========================================================= */

  useEffect(() => {

    const loadRider =
      async () => {

        try {

          const savedUser =
            JSON.parse(
              localStorage.getItem(
                "ridemateUser"
              ) || "{}"
            );


          let profileImage =
            "";


          /* ==================================================
             OWN PROFILE
          ================================================== */

          if (
            savedUser?.uid &&
            savedUser?.name ===
              riderName
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


          /* ==================================================
             ADMIN VIEW SELECTED USER IMAGE
          ================================================== */

          if (
            isAdminView &&
            adminView?.userName ===
              riderName &&
            adminView?.userImage
          ) {

            profileImage =
              adminView.userImage;

          }


          /* ==================================================
             OTHER RIDER
          ================================================== */

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
                  riderName &&
                  user.image
                ) {

                  profileImage =
                    user.image;

                }

              }
            );

          }


          /* ==================================================
             COMPLETED TRIPS
          ================================================== */

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


          setRiderTrips(
            trips
          );


          setTotalLikes(
            likes
          );


          setTotalDistance(
            distance
          );


          if (
            image
          ) {

            setRiderImage(
              image
            );

          }


          /* ==================================================
             POSTS
          ================================================== */

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


          /* ==================================================
             REVIEWS
          ================================================== */

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


          /* ==================================================
             BADGE
          ================================================== */

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

        } catch (error) {

          console.error(
            "Failed to load rider:",
            error
          );

        }

      };


    loadRider();

  }, [
    riderName,
    isAdminView,
    adminView?.userImage,
  ]);


  /* =========================================================
     CURRENT USER + FOLLOW STATUS
  ========================================================= */

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
          ) {

            return;

          }


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

        } catch (error) {

          console.error(
            "Follow status error:",
            error
          );

        }

      };


    checkFollowStatus();

  }, [
    riderName,
    isAdminView,
  ]);


  /* =========================================================
     FOLLOW / UNFOLLOW
  ========================================================= */

  const toggleFollow =
    async () => {

      if (
        blockedAdminAction(
          "follow or unfollow riders"
        )
      ) {

        return;

      }


      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );


      if (
        !currentUser.name
      ) {

        return;

      }


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

      } catch (error) {

        console.error(
          "Follow error:",
          error
        );

      }

    };


  /* =========================================================
     PROFILE STATE
  ========================================================= */

  const isOwnProfile =
    currentUser?.name ===
    riderName;


  const displayedProfileImage =
    riderImage
      ? `${riderImage}${
          riderImage.includes("?")
            ? "&"
            : "?"
        }v=${profileImageVersion}`
      : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=90";


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <main
      className="
        min-h-screen
        bg-black
        text-white
        px-6
        pt-24
        pb-10
      "
    >

      <div
        className="
          max-w-4xl
          mx-auto
        "
      >

        {/* ==================================================
            ADMIN BANNER
        ================================================== */}

        {isAdminView && (

          <div
            className="
              mb-8
              bg-orange-600
              text-black
              rounded-2xl
              px-4
              py-3
              text-center
              font-black
              text-sm
              sm:text-base
              shadow-lg
              shadow-orange-500/20
            "
          >

            🛡️ INVESTIGATION MODE — Viewing{" "}
            {adminView?.userName ||
              riderName}'s Profile

            <span className="ml-2 opacity-70">
              (Read Only)
            </span>

          </div>

        )}


        <div
          className="
            text-center
          "
        >

          {/* ==================================================
              PROFILE PHOTO
          ================================================== */}

          <div
            className="
              flex
              justify-center
            "
          >

            <div
              className="
                relative
              "
            >

              <img
                src={
                  displayedProfileImage
                }
                alt={`${riderName}'s profile picture`}
                onClick={() => {

                  if (
                    riderImage
                  ) {

                    setShowProfileImage(
                      true
                    );

                  }

                }}
                className="
                  w-36
                  h-36
                  rounded-full
                  border-4
                  border-orange-500
                  shadow-2xl
                  object-cover
                  cursor-pointer
                  hover:scale-105
                  transition
                  duration-200
                "
              />


              {/* ==================================================
                  CHANGE PROFILE PHOTO
              ================================================== */}

              {isOwnProfile &&
                !isAdminView && (

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
            !isAdminView &&
            uploadingProfileImage && (

              <div
                className="
                  mt-3
                  max-w-xs
                  mx-auto
                "
              >

                <p
                  className="
                    text-orange-400
                    font-bold
                    text-sm
                    mb-2
                  "
                >

                  Uploading profile picture...{" "}
                  {uploadProgress}%

                </p>


                <div
                  className="
                    w-full
                    h-2
                    bg-zinc-800
                    rounded-full
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      h-full
                      bg-orange-500
                      rounded-full
                      transition-all
                      duration-300
                    "
                    style={{
                      width:
                        `${uploadProgress}%`,
                    }}
                  />

                </div>

              </div>

            )}


          {isOwnProfile &&
            !isAdminView &&
            !uploadingProfileImage && (

            <p
              className="
                text-zinc-500
                text-sm
                mt-2
              "
            >
              Tap the 📷 button to change your profile picture
            </p>

          )}


          {/* ==================================================
              NAME
          ================================================== */}

          <h1
            className="
              text-5xl
              font-black
              text-orange-500
              mt-6
            "
          >
            {riderName}
          </h1>


          <div
            className="
              mt-2
              mb-6
              text-lg
              font-bold
              text-yellow-400
            "
          >
            {badge}
          </div>


          {/* ==================================================
              FOLLOW + MESSAGE
          ================================================== */}

          {!isOwnProfile && (

            <div
              className="
                mt-10
                mb-10
                flex
                flex-col
                gap-3
                items-center
              "
            >

              <button
                onClick={
                  toggleFollow
                }
                disabled={
                  isAdminView
                }
                className={`
                  px-8
                  py-3
                  rounded-2xl
                  font-black
                  transition
                  ${
                    isAdminView
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : isFollowing
                      ? "bg-zinc-700"
                      : "bg-orange-500 text-black"
                  }
                `}
              >

                {isAdminView
                  ? "Follow 🔒"
                  : isFollowing
                  ? "Following ✅"
                  : "Follow 👥"}

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

          <div
            className="
              grid
              grid-cols-3
              gap-4
              mt-10
            "
          >

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

              <p
                className="
                  text-2xl
                  font-black
                  text-white
                "
              >
                {followers}
              </p>

              <p
                className="
                  text-sm
                  text-zinc-400
                  mt-1
                "
              >
                Followers
              </p>

            </Link>


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

              <p
                className="
                  text-2xl
                  font-black
                  text-white
                "
              >
                {following}
              </p>

              <p
                className="
                  text-sm
                  text-zinc-400
                  mt-1
                "
              >
                Following
              </p>

            </Link>


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

              <p
                className="
                  text-2xl
                  font-black
                  text-yellow-400
                "
              >
                {avgRating.toFixed(1)}
              </p>

              <p
                className="
                  text-sm
                  text-zinc-400
                  mt-1
                "
              >
                Rating
              </p>

            </Link>

          </div>


          {/* ==================================================
              RIDER BIO
          ================================================== */}

          <div
            className="
              mt-6
            "
          >

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

              <div
                className="
                  space-y-3
                  mt-4
                "
              >

                <div
                  className="
                    bg-zinc-900
                    p-4
                    rounded-2xl
                  "
                >
                  🏍 Trips Posted:{" "}
                  {riderTrips.length}
                </div>


                <div
                  className="
                    bg-zinc-900
                    p-4
                    rounded-2xl
                  "
                >
                  ❤️ Likes Received:{" "}
                  {totalLikes}
                </div>


                <div
                  className="
                    bg-zinc-900
                    p-4
                    rounded-2xl
                  "
                >
                  🛣️ Total Distance:{" "}
                  {totalDistance} KM
                </div>


                <div
                  className="
                    bg-zinc-900
                    p-4
                    rounded-2xl
                  "
                >

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


                <div
                  className="
                    bg-zinc-900
                    p-4
                    rounded-2xl
                  "
                >

                  <h3
                    className="
                      text-orange-500
                      font-black
                      mb-3
                    "
                  >
                    🏅 Achievements
                  </h3>


                  <div
                    className="
                      space-y-2
                    "
                  >

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

                      <p
                        className="
                          text-zinc-500
                        "
                      >
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

          <div
            className="
              mt-10
            "
          >

            <h2
              className="
                text-3xl
                font-black
                text-orange-500
                mt-8
                mb-6
              "
            >
              Posts
            </h2>


            {riderPosts.length ===
            0 ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-2xl
                  p-10
                  text-zinc-500
                "
              >
                No posts yet 🏍️
              </div>

            ) : (

              <div
                className="
                  grid
                  grid-cols-3
                  gap-1
                "
              >

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

          {isOwnProfile &&
            !isAdminView && (

            <div
              className="
                mt-12
              "
            >

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

        <div
          className="
            fixed
            inset-0
            bg-black/95
            z-[9999]
            overflow-y-auto
          "
        >

          <div
            className="
              max-w-3xl
              mx-auto
              p-6
            "
          >

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


            <div
              className="
                mt-6
              "
            >

              <h2
                className="
                  text-2xl
                  font-black
                "
              >
                ❤️{" "}
                {
                  selectedPost.likes ||
                  0
                }{" "}
                Likes
              </h2>


              <p
                className="
                  mt-3
                  text-zinc-300
                "
              >
                {
                  selectedPost.caption ||
                  "No caption"
                }
              </p>

            </div>


            <hr
              className="
                my-6
                border-zinc-800
              "
            />


            <h2
              className="
                text-xl
                font-black
                mb-4
              "
            >
              Comments
            </h2>


            <div
              className="
                space-y-3
              "
            >

              {postComments.length ===
              0 ? (

                <p
                  className="
                    text-zinc-500
                    text-center
                    py-6
                  "
                >
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

                      <p
                        className="
                          text-zinc-300
                          mt-1
                        "
                      >
                        {
                          comment.text
                        }
                      </p>

                    </div>

                  )

                )

              )}

            </div>


            {isAdminView ? (

              <div
                className="
                  mt-6
                  bg-orange-500/10
                  border
                  border-orange-500/20
                  rounded-xl
                  px-4
                  py-3
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
                  🔒 Investigation Mode — Comments are read-only
                </p>

              </div>

            ) : (

              <div
                className="
                  flex
                  gap-3
                  mt-6
                "
              >

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

            )}

          </div>

        </div>

      )}


      {/* ======================================================
          PROFILE IMAGE VIEWER

          This is an overlay on the SAME PAGE.

          It does NOT navigate anywhere.

          The background is blurred and darkened.

          The image is larger and uses object-contain
          so the complete image remains visible.
      ====================================================== */}

      {showProfileImage &&
        riderImage && (

        <div
          className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            bg-black/35
            backdrop-blur-xl
            p-4
            sm:p-8
          "
          onClick={() =>
            setShowProfileImage(
              false
            )
          }
        >

          {/* ==================================================
              CLOSE BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              setShowProfileImage(
                false
              )
            }
            className="
              absolute
              top-5
              right-5
              sm:top-7
              sm:right-7
              w-11
              h-11
              sm:w-12
              sm:h-12
              rounded-full
              bg-black/70
              backdrop-blur-md
              border
              border-white/20
              text-white
              text-xl
              sm:text-2xl
              flex
              items-center
              justify-center
              hover:bg-orange-500
              hover:text-black
              hover:border-orange-500
              transition
              z-20
            "
            aria-label="Close profile picture"
          >
            ✕
          </button>


          {/* ==================================================
              IMAGE CARD

              Larger than before.

              IMPORTANT:
              We are NOT using a small fixed width like
              max-w-[340px].

              The image can grow up to the available screen.
          ================================================== */}

          <div
            className="
              relative
              flex
              items-center
              justify-center
              w-full
              max-w-[900px]
              max-h-[90vh]
              cursor-default
            "
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <img
              src={
                riderImage
              }
              alt={`${riderName}'s profile picture`}
              className="
                block
                w-auto
                h-auto
                max-w-[92vw]
                max-h-[82vh]
                object-contain
                rounded-2xl
                border-2
                border-orange-500
                shadow-2xl
              "
            />

          </div>

        </div>

      )}

    </main>

  );

}