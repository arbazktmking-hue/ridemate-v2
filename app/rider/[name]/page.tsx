"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  limit,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
} from "firebase/storage";

import { db, auth, app } from "../../firebase";

import { signOut } from "firebase/auth";

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

/* =========================================================
   DEFAULT PROFILE IMAGE
========================================================= */

const DEFAULT_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=90";

/* =========================================================
   PROFILE IMAGE COMPRESSION
========================================================= */

const compressProfileImage = (
  file: File
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const maxSize = 600;

        let width = image.naturalWidth;
        let height = image.naturalHeight;

        if (
          width > maxSize ||
          height > maxSize
        ) {
          const scale = Math.min(
            maxSize / width,
            maxSize / height
          );

          width = Math.round(
            width * scale
          );

          height = Math.round(
            height * scale
          );
        }

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "Could not create image canvas."
            )
          );

          return;
        }

        context.imageSmoothingEnabled =
          true;

        context.imageSmoothingQuality =
          "high";

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(
              objectUrl
            );

            if (!blob) {
              reject(
                new Error(
                  "Could not compress image."
                )
              );

              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.82
        );
      } catch (error) {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(
        objectUrl
      );

      reject(
        new Error(
          "Could not read the selected image."
        )
      );
    };

    image.src = objectUrl;
  });
};

/* =========================================================
   RIDER PAGE
========================================================= */

export default function RiderPage() {
  const params = useParams();
  const router = useRouter();

  const riderName = decodeURIComponent(
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

  /*
   * IMPORTANT:
   *
   * DO NOT read localStorage here.
   *
   * The server cannot access localStorage.
   * We load it inside useEffect instead.
   */

  const [riderImage, setRiderImage] =
    useState("");

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

  /*
   * IMPORTANT:
   *
   * Start with null so server and client
   * render exactly the same HTML.
   *
   * The real user is loaded after hydration.
   */

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
     POST EDITING
  ========================================================= */

  const [editingPost, setEditingPost] =
    useState(false);

  const [editedCaption, setEditedCaption] =
    useState("");

  const [savingCaption, setSavingCaption] =
    useState(false);

  const [deletingPost, setDeletingPost] =
    useState(false);

  /* =========================================================
     PROFILE IMAGE VIEWER
  ========================================================= */

  const [
    showProfileImage,
    setShowProfileImage,
  ] = useState(false);

  /* =========================================================
     ADMIN VIEW
  ========================================================= */

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const isAdminView =
    adminView?.active === true;

  /* =========================================================
     PROFILE PHOTO UPLOAD
  ========================================================= */

  const [
    uploadingProfileImage,
    setUploadingProfileImage,
  ] = useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

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
            JSON.parse(savedAdminView);

          if (parsed?.active) {
            setAdminView(parsed);
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
     ESCAPE FOR PROFILE IMAGE
  ========================================================= */

  useEffect(() => {
    if (!showProfileImage) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setShowProfileImage(false);
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
  }, [showProfileImage]);

  /* =========================================================
     LOCK BODY SCROLL
  ========================================================= */

  useEffect(() => {
    if (
      showProfileImage ||
      selectedPost
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
    selectedPost,
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
      await signOut(auth);

      localStorage.clear();

      router.replace("/login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert("Logout failed");
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

      const maxSize =
        10 * 1024 * 1024;

      if (file.size > maxSize) {
        alert(
          "Profile picture must be smaller than 10 MB."
        );

        return;
      }

      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {
        alert(
          "Your login session has expired. Please login again."
        );

        return;
      }

      setUploadingProfileImage(
        true
      );

      setUploadProgress(5);

      const compressedBlob =
        await compressProfileImage(
          file
        );

      setUploadProgress(30);

      const fileName =
        `${Date.now()}_profile.jpg`;

      const storage =
        getStorage(app);

      const storagePath =
        `profilePictures/${firebaseUser.uid}/${fileName}`;

      const storageRef =
        ref(
          storage,
          storagePath
        );

      setUploadProgress(40);

      await uploadBytes(
        storageRef,
        compressedBlob,
        {
          contentType:
            "image/jpeg",

          cacheControl:
            "public,max-age=31536000,immutable",
        }
      );

      setUploadProgress(70);

      const downloadURL =
        await getDownloadURL(
          storageRef
        );

      setUploadProgress(80);

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

      setUploadProgress(90);

      let savedUser: any = {};

      try {
        savedUser =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );
      } catch {
        savedUser = {};
      }

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

      setCurrentUser(
        updatedUser
      );

      setRiderImage(
        downloadURL
      );

      setUploadProgress(100);

      setShowProfileImage(
        false
      );

      alert(
        "Profile picture updated successfully! 🔥"
      );
    } catch (error: any) {
      console.error(
        "PROFILE PICTURE UPLOAD ERROR:",
        error
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

      setUploadProgress(0);

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
    setSelectedPost(post);

    setEditingPost(false);

    setEditedCaption(
      post.caption || ""
    );

    setNewComment("");

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
        await getDocs(q);

      const comments =
        snapshot.docs.map(
          (commentDoc) => ({
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

      setPostComments([]);
    }
  };

  /* =========================================================
     EDIT POST
  ========================================================= */

  const startEditingPost = () => {
    if (
      blockedAdminAction(
        "edit posts"
      )
    ) {
      return;
    }

    if (!selectedPost) {
      return;
    }

    if (!isOwnProfile) {
      return;
    }

    setEditedCaption(
      selectedPost.caption || ""
    );

    setEditingPost(true);
  };

  /* =========================================================
     SAVE EDITED CAPTION
  ========================================================= */

  const saveEditedCaption =
    async () => {
      if (
        blockedAdminAction(
          "edit posts"
        )
      ) {
        return;
      }

      if (!selectedPost) {
        return;
      }

      if (!isOwnProfile) {
        alert(
          "You can only edit your own posts."
        );

        return;
      }

      try {
        setSavingCaption(true);

        const updatedCaption =
          editedCaption.trim();

        await updateDoc(
          doc(
            db,
            "feedPosts",
            selectedPost.id
          ),
          {
            caption:
              updatedCaption,
          }
        );

        const updatedPost = {
          ...selectedPost,

          caption:
            updatedCaption,
        };

        setSelectedPost(
          updatedPost
        );

        setRiderPosts(
          (prev) =>
            prev.map(
              (post) =>
                post.id ===
                selectedPost.id
                  ? {
                      ...post,
                      caption:
                        updatedCaption,
                    }
                  : post
            )
        );

        setEditingPost(false);

        alert(
          "Caption updated successfully! ✨"
        );
      } catch (error) {
        console.error(
          "Failed to update caption:",
          error
        );

        alert(
          "Failed to update caption. Please try again."
        );
      } finally {
        setSavingCaption(false);
      }
    };

  /* =========================================================
     DELETE POST
  ========================================================= */

  const removePost =
    async () => {
      if (
        blockedAdminAction(
          "remove posts"
        )
      ) {
        return;
      }

      if (!selectedPost) {
        return;
      }

      if (!isOwnProfile) {
        alert(
          "You can only remove your own posts."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to remove this post?\n\nThis action cannot be undone."
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingPost(true);

        await deleteDoc(
          doc(
            db,
            "feedPosts",
            selectedPost.id
          )
        );

        try {
          const commentsQuery =
            query(
              collection(
                db,
                "comments"
              ),
              where(
                "postId",
                "==",
                selectedPost.id
              )
            );

          const commentsSnapshot =
            await getDocs(
              commentsQuery
            );

          await Promise.all(
            commentsSnapshot.docs.map(
              (commentDoc) =>
                deleteDoc(
                  doc(
                    db,
                    "comments",
                    commentDoc.id
                  )
                )
            )
          );
        } catch (
          commentDeleteError
        ) {
          console.error(
            "Post deleted, but some comments could not be removed:",
            commentDeleteError
          );
        }

        setRiderPosts(
          (prev) =>
            prev.filter(
              (post) =>
                post.id !==
                selectedPost.id
            )
        );

        setSelectedPost(null);

        setPostComments([]);

        setNewComment("");

        setEditingPost(false);

        alert(
          "Post removed successfully. 🗑️"
        );
      } catch (error) {
        console.error(
          "Failed to remove post:",
          error
        );

        alert(
          "Failed to remove post. Please try again."
        );
      } finally {
        setDeletingPost(false);
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

      if (!newComment.trim()) {
        return;
      }

      if (!currentUser?.name) {
        return;
      }

      if (!selectedPost) {
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

        setNewComment("");

        await openPost(
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
     CURRENT USER + FOLLOW STATUS + COUNTS
     
     IMPORTANT:
     localStorage is read ONLY inside useEffect.
     
     This prevents hydration mismatch.
     
     Followers and following counts load for:
     - own profile
     - other rider profile
========================================================= */

  useEffect(() => {
    const checkFollowStatus =
      async () => {
        try {
          let savedUser: any = {};

          try {
            savedUser =
              JSON.parse(
                localStorage.getItem(
                  "ridemateUser"
                ) || "{}"
              );
          } catch {
            savedUser = {};
          }

          setCurrentUser(
            savedUser
          );

          /*
           * Load own profile image from localStorage
           * only AFTER hydration.
           */

          if (
            savedUser?.name ===
              riderName &&
            savedUser?.image
          ) {
            setRiderImage(
              savedUser.image
            );
          }

          if (!savedUser?.name) {
            return;
          }

          const viewingOwnProfile =
            savedUser.name ===
            riderName;

          if (viewingOwnProfile) {
            setIsFollowing(false);
          } else {
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
          }

          /*
           * FOLLOWERS + FOLLOWING
           */

          const [
            followersSnapshot,
            followingSnapshot,
          ] =
            await Promise.all([
              getDocs(
                query(
                  collection(
                    db,
                    "follows"
                  ),
                  where(
                    "following",
                    "==",
                    riderName
                  )
                )
              ),

              getDocs(
                query(
                  collection(
                    db,
                    "follows"
                  ),
                  where(
                    "follower",
                    "==",
                    riderName
                  )
                )
              ),
            ]);

          setFollowers(
            followersSnapshot.size
          );

          setFollowing(
            followingSnapshot.size
          );
        } catch (error) {
          console.error(
            "Follow status / count error:",
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
     LOAD RIDER DATA
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadRider =
      async () => {
        try {
          let savedUser: any = {};

          try {
            savedUser =
              JSON.parse(
                localStorage.getItem(
                  "ridemateUser"
                ) || "{}"
              );
          } catch {
            savedUser = {};
          }

          let profileImage = "";

          /*
           * OWN PROFILE IMAGE
           */

          if (
            savedUser?.name ===
              riderName &&
            savedUser?.image
          ) {
            profileImage =
              savedUser.image;

            if (!cancelled) {
              setRiderImage(
                profileImage
              );
            }
          }

          /*
           * ADMIN PROFILE IMAGE
           */

          if (
            isAdminView &&
            adminView?.userName ===
              riderName &&
            adminView?.userImage
          ) {
            profileImage =
              adminView.userImage;

            if (!cancelled) {
              setRiderImage(
                profileImage
              );
            }
          }

          /* ==================================================
             USER LOOKUP
          ================================================== */

          let userProfileData:
            any = null;

          /*
           * Own profile:
           * use UID directly.
           */

          if (
            savedUser?.uid &&
            savedUser?.name ===
              riderName
          ) {
            try {
              const ownUserDoc =
                await getDoc(
                  doc(
                    db,
                    "users",
                    savedUser.uid
                  )
                );

              if (
                ownUserDoc.exists()
              ) {
                userProfileData =
                  ownUserDoc.data();
              }
            } catch (error) {
              console.error(
                "Failed to load own user profile:",
                error
              );
            }
          }

          /*
           * Other rider:
           * username lookup.
           */

          if (
            !userProfileData &&
            !isAdminView
          ) {
            try {
              const usernameQuery =
                query(
                  collection(
                    db,
                    "users"
                  ),
                  where(
                    "username",
                    "==",
                    riderName
                  ),
                  limit(1)
                );

              const usernameSnapshot =
                await getDocs(
                  usernameQuery
                );

              if (
                !usernameSnapshot.empty
              ) {
                userProfileData =
                  usernameSnapshot
                    .docs[0]
                    .data();
              }
            } catch (error) {
              console.error(
                "Username profile lookup failed:",
                error
              );
            }
          }

          /*
           * Fallback:
           * name lookup.
           */

          if (
            !userProfileData &&
            !isAdminView
          ) {
            try {
              const nameQuery =
                query(
                  collection(
                    db,
                    "users"
                  ),
                  where(
                    "name",
                    "==",
                    riderName
                  ),
                  limit(1)
                );

              const nameSnapshot =
                await getDocs(
                  nameQuery
                );

              if (
                !nameSnapshot.empty
              ) {
                userProfileData =
                  nameSnapshot
                    .docs[0]
                    .data();
              }
            } catch (error) {
              console.error(
                "Name profile lookup failed:",
                error
              );
            }
          }

          /*
           * Update profile image from Firestore.
           */

          if (
            userProfileData?.image
          ) {
            profileImage =
              userProfileData.image;

            if (!cancelled) {
              setRiderImage(
                profileImage
              );
            }

            /*
             * Keep localStorage synchronized.
             */

            if (
              savedUser?.name ===
              riderName
            ) {
              const updatedLocalUser =
                {
                  ...savedUser,
                  image:
                    userProfileData.image,
                };

              localStorage.setItem(
                "ridemateUser",
                JSON.stringify(
                  updatedLocalUser
                )
              );
            }
          }

          /* ==================================================
             LOAD PROFILE DATA
          ================================================== */

          const [
            tripsSnapshot,
            postsSnapshot,
            reviewsSnapshot,
          ] =
            await Promise.all([
              getDocs(
                collection(
                  db,
                  "trips"
                )
              ),

              getDocs(
                collection(
                  db,
                  "feedPosts"
                )
              ),

              getDocs(
                collection(
                  db,
                  "rideReviews"
                )
              ),
            ]);

          if (cancelled) {
            return;
          }

          /* ==================================================
             COMPLETED TRIPS
          ================================================== */

          const trips: any[] = [];

          let likes = 0;

          let distance = 0;

          tripsSnapshot.forEach(
            (tripDoc) => {
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

                likes += Number(
                  trip.likes || 0
                );

                distance += Number(
                  trip.distance || 0
                );

                if (
                  !profileImage &&
                  trip.userImage
                ) {
                  profileImage =
                    trip.userImage;
                }
              }
            }
          );

          if (
            profileImage &&
            !riderImage
          ) {
            setRiderImage(
              profileImage
            );
          }

          setRiderTrips(
            trips
          );

          setTotalLikes(
            likes
          );

          setTotalDistance(
            distance
          );

          /* ==================================================
             POSTS
          ================================================== */

          const posts: any[] = [];

          postsSnapshot.forEach(
            (postDoc) => {
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
            (a, b) =>
              Number(
                b.createdAt || 0
              ) -
              Number(
                a.createdAt || 0
              )
          );

          setRiderPosts(
            posts
          );

          /* ==================================================
             REVIEWS
          ================================================== */

          const riderReviews:
            any[] = [];

          let totalRating = 0;

          reviewsSnapshot.forEach(
            (reviewDoc) => {
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
                    review.rating || 0
                  );
              }
            }
          );

          riderReviews.sort(
            (a, b) =>
              Number(
                b.createdAt || 0
              ) -
              Number(
                a.createdAt || 0
              )
          );

          setReviews(
            riderReviews
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

          if (trips.length >= 10) {
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
          } else {
            setBadge("");
          }
        } catch (error) {
          console.error(
            "Failed to load rider:",
            error
          );
        }
      };

    loadRider();

    return () => {
      cancelled = true;
    };
  }, [
    riderName,
    isAdminView,
    adminView?.userImage,
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

      if (!currentUser.name) {
        return;
      }

      if (
        currentUser.name ===
        riderName
      ) {
        return;
      }

      const followId =
        `${currentUser.name}_${riderName}`;

      try {
        if (isFollowing) {
          await deleteDoc(
            doc(
              db,
              "follows",
              followId
            )
          );

          setIsFollowing(false);

          setFollowers(
            (prev) =>
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

          setIsFollowing(true);

          setFollowers(
            (prev) =>
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
    riderImage ||
    DEFAULT_PROFILE_IMAGE;

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

        {/* ADMIN BANNER */}

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
                alt={`${riderName}'s profile picture`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onClick={() => {
                  if (riderImage) {
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

              {/* =================================================
                  CHANGE PROFILE PHOTO
              ================================================= */}

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
                      {uploadingProfileImage
                        ? "⏳"
                        : "📷"}
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

          {/* UPLOAD STATUS */}

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
                  Optimizing & uploading...{" "}
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

          {/* NAME */}

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

          {/* FOLLOW + MESSAGE */}

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
                className={`px-8 py-3 rounded-2xl font-black transition ${
                  isAdminView
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : isFollowing
                    ? "bg-zinc-700"
                    : "bg-orange-500 text-black"
                }`}
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

          {/* STATS */}

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

          {/* RIDER BIO */}

          <div className="mt-6">

            <button
              onClick={() =>
                setShowBio(!showBio)
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
              {showBio
                ? "▲ Hide Rider Bio"
                : "▼ Rider Bio"}
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
                  {totalDistance >= 10000
                    ? "🔴 RideMate Legend"
                    : totalDistance >= 5000
                    ? "🟠 Adventure Master"
                    : totalDistance >= 2000
                    ? "🟣 Road Warrior"
                    : totalDistance >= 500
                    ? "🔵 Explorer"
                    : "🟢 Beginner Rider"}
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
                          key={index}
                          className="
                            bg-black
                            p-3
                            rounded-xl
                          "
                        >
                          {achievement}
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

          {/* POSTS */}

          <div className="mt-10">

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

            {riderPosts.length === 0 ? (
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
                  (post) => (
                    <div
                      key={post.id}
                      onClick={() =>
                        openPost(post)
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
                            loading="lazy"
                            decoding="async"
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

          {/* LOGOUT */}

          {isOwnProfile &&
            !isAdminView && (
              <div className="mt-12">

                <button
                  onClick={logout}
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
              pb-12
            "
          >

            <button
              onClick={() => {
                setSelectedPost(null);
                setNewComment("");
                setPostComments([]);
                setEditingPost(false);
                setEditedCaption("");
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
                  max-h-[75vh]
                  object-contain
                  bg-black
                "
                loading="eager"
                decoding="async"
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
                  max-h-[75vh]
                  bg-black
                "
              />
            )}

            {/* OWNER POST CONTROLS */}

            {isOwnProfile &&
              !isAdminView && (
                <div
                  className="
                    mt-5
                    bg-zinc-900
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                  "
                >

                  {!editingPost ? (
                    <div
                      className="
                        flex
                        flex-col
                        sm:flex-row
                        gap-3
                      "
                    >

                      <button
                        type="button"
                        onClick={
                          startEditingPost
                        }
                        className="
                          flex-1
                          bg-orange-500
                          text-black
                          py-3
                          px-5
                          rounded-xl
                          font-black
                          hover:bg-orange-400
                          transition
                        "
                      >
                        ✏️ Edit Post
                      </button>

                      <button
                        type="button"
                        onClick={
                          removePost
                        }
                        disabled={
                          deletingPost
                        }
                        className="
                          flex-1
                          bg-red-600
                          text-white
                          py-3
                          px-5
                          rounded-xl
                          font-black
                          hover:bg-red-700
                          transition
                          disabled:opacity-50
                        "
                      >
                        {deletingPost
                          ? "Removing..."
                          : "🗑️ Remove Post"}
                      </button>

                    </div>
                  ) : (
                    <div>

                      <h3
                        className="
                          text-lg
                          font-black
                          text-orange-500
                          mb-3
                        "
                      >
                        ✏️ Edit Caption
                      </h3>

                      <textarea
                        value={
                          editedCaption
                        }
                        onChange={(event) =>
                          setEditedCaption(
                            event.target.value
                          )
                        }
                        rows={4}
                        maxLength={500}
                        placeholder="Write your caption..."
                        className="
                          w-full
                          bg-black
                          border
                          border-zinc-700
                          rounded-xl
                          p-4
                          text-white
                          outline-none
                          resize-none
                          focus:border-orange-500
                        "
                      />

                      <div
                        className="
                          flex
                          justify-between
                          items-center
                          mt-2
                        "
                      >
                        <span
                          className="
                            text-xs
                            text-zinc-500
                          "
                        >
                          {
                            editedCaption.length
                          }/500
                        </span>

                        <span
                          className="
                            text-xs
                            text-zinc-500
                          "
                        >
                          Caption only
                        </span>
                      </div>

                      <div
                        className="
                          flex
                          gap-3
                          mt-4
                        "
                      >

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(
                              false
                            );

                            setEditedCaption(
                              selectedPost.caption ||
                                ""
                            );
                          }}
                          disabled={
                            savingCaption
                          }
                          className="
                            flex-1
                            bg-zinc-700
                            py-3
                            rounded-xl
                            font-black
                            hover:bg-zinc-600
                            transition
                            disabled:opacity-50
                          "
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={
                            saveEditedCaption
                          }
                          disabled={
                            savingCaption
                          }
                          className="
                            flex-1
                            bg-orange-500
                            text-black
                            py-3
                            rounded-xl
                            font-black
                            hover:bg-orange-400
                            transition
                            disabled:opacity-50
                          "
                        >
                          {savingCaption
                            ? "Saving..."
                            : "💾 Save Changes"}
                        </button>

                      </div>

                    </div>
                  )}

                </div>
              )}

            {/* ADMIN NOTICE */}

            {isAdminView && (
              <div
                className="
                  mt-5
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
                  🔒 Investigation Mode — Post editing and removal are disabled
                </p>
              </div>
            )}

            {/* LIKES + CAPTION */}

            <div className="mt-6">

              <h2
                className="
                  text-2xl
                  font-black
                "
              >
                ❤️{" "}
                {selectedPost.likes || 0}{" "}
                Likes
              </h2>

              <p
                className="
                  mt-3
                  text-zinc-300
                  whitespace-pre-wrap
                "
              >
                {selectedPost.caption ||
                  "No caption"}
              </p>

            </div>

            <hr
              className="
                my-6
                border-zinc-800
              "
            />

            {/* COMMENTS */}

            <h2
              className="
                text-xl
                font-black
                mb-4
              "
            >
              Comments
            </h2>

            <div className="space-y-3">

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

            {/* COMMENT INPUT */}

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
                  value={newComment}
                  onChange={(e) =>
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
            bg-black/60
            backdrop-blur-xl
            p-4
            sm:p-8
          "
          onClick={() =>
            setShowProfileImage(false)
          }
        >

          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={() =>
              setShowProfileImage(false)
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

          {/* IMAGE CONTAINER */}

          <div
            className="
              relative
              flex
              items-center
              justify-center
              w-full
              max-w-[900px]
              max-h-[90vh]
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              className="
                relative
                w-[min(82vw,700px)]
                h-[min(82vw,700px)]
                max-h-[82vh]
                max-w-[82vw]
                flex
                items-center
                justify-center
              "
            >

              <img
                src={riderImage}
                alt={`${riderName}'s profile picture`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="
                  w-full
                  h-full
                  object-contain
                  rounded-2xl
                  border-2
                  border-orange-500
                  shadow-2xl
                "
              />

            </div>

          </div>

        </div>
      )}

    </main>
  );
}