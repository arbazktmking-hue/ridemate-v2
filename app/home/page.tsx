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
  deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Rocket,
} from "lucide-react";
export default function FeedPage() {


  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [openComments, setOpenComments] =
    useState<string[]>([]);
  const [heartAnimation, setHeartAnimation] =
    useState<string | null>(null);
    const [commentPost, setCommentPost] = useState<any>(null);
  useEffect(() => {

    const fetchTrips = async () => {

      try {

        const q = query(
          collection(db, "feedPosts"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const loadedTrips: any[] = [];

        querySnapshot.forEach((doc) => {

          const trip = doc.data();

          loadedTrips.push({
            id: doc.id,
            ...trip,
          });

        });

        const uniqueTrips = loadedTrips.filter(
  (trip, index, self) =>
    index === self.findIndex((t) => t.id === trip.id)
);

setTrips(uniqueTrips);

console.log(
  "Trips loaded:",
  uniqueTrips.length,
  uniqueTrips
);
      } catch (error) {

        console.log(error);

      }

    };

    fetchTrips();

  }, []);
  useEffect(() => {

    const loadSavedTrips = async () => {

      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!user.name) return;

      const snapshot = await getDocs(
        collection(db, "savedTrips")
      );

      const saved: string[] = [];

      snapshot.forEach((doc) => {

        const data = doc.data();

        if (data.user === user.name) {
          saved.push(data.tripId);
        }

      });

      setSavedTrips(saved);

    };

    loadSavedTrips();

  }, []);
  const toggleSaveTrip = async (
    tripId: string
  ) => {

    const user = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    const saveId =
      `${user.name}_${tripId}`;

    if (
      savedTrips.includes(tripId)
    ) {

      await deleteDoc(
        doc(db, "savedTrips", saveId)
      );

      setSavedTrips((prev) =>
        prev.filter(
          (id) => id !== tripId
        )
      );

    } else {

      await setDoc(
        doc(db, "savedTrips", saveId),
        {
          user: user.name,
          tripId,
        }
      );

      setSavedTrips((prev) => [
        ...prev,
        tripId,
      ]);

    }

  };
  const likeTrip = async (
    id: string,
    currentLikes: number
  ) => {

    try {

      const tripRef = doc(db, "feedPosts", id);

      await updateDoc(tripRef, {
        likes: currentLikes + 1,
      });
      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      const trip = trips.find(
        (t) => t.id === id
      );

      if (
        trip &&
        trip.userName !== currentUser.name
      ) {

        await addDoc(
          collection(db, "notifications"),
          {
            user: trip.userName,
            text: `${currentUser.name} liked your trip ❤️`,
            createdAt: Date.now(),
            read: false,
          }
        );

      }
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === id
            ? {
              ...trip,
              likes: currentLikes + 1,
            }
            : trip
        )
      );

    } catch (error) {

      console.log(error);

    }

  };
  const addComment = async (
    tripId: string,
    commentText: string
  ) => {

    if (!commentText.trim()) return;

    try {

      const tripRef = doc(db, "feedPosts", tripId);

      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      await updateDoc(tripRef, {
        comments: arrayUnion({
          user: user.name,
          image: user.image,
          text: commentText,
        }),
      });
      const trip = trips.find(
        (t) => t.id === tripId
      );

      if (
        trip &&
        trip.userName !== user.name
      ) {

        await addDoc(
          collection(db, "notifications"),
          {
            user: trip.userName,
            text: `${user.name} commented on your trip 💬`,
            createdAt: Date.now(),
            read: false,
          }
        );

      }
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === tripId
            ? {
              ...trip,
              comments: [
                ...(trip.comments || []),
                {
                  user: user.name,
                  image: user.image,
                  text: commentText,
                },
              ],
            }
            : trip
        )
      );
    } catch (error) {

      console.log(error);

    }

  };
  const requestToJoin = async (trip: any) => {

    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    if (currentUser.name === trip.userName) {
      alert("You cannot join your own ride.");
      return;
    }
    const existingRequests = await getDocs(
      collection(db, "rideRequests")
    );

    let alreadyRequested = false;

    existingRequests.forEach((doc) => {
      const request = doc.data();

      if (
        request.tripId === trip.id &&
        request.requester === currentUser.name &&
        request.status === "pending"
      ) {
        alreadyRequested = true;
      }
    });

    if (alreadyRequested) {
      alert("Request already sent 🚀");
      return;
    }
    await addDoc(
      collection(db, "rideRequests"),
      {
        tripId: trip.id,
        tripOwner: trip.userName,
        requester: currentUser.name,
        requesterImage: currentUser.image || "",
        destination: trip.destination,
        createdAt: Date.now(),
        status: "pending",
      }
    );

    // 🔥 Send notification to ride owner
    await addDoc(
      collection(db, "notifications"),
      {
        user: trip.userName,
        text:
  trip.rideType === "group"
    ? `${currentUser.name} wants to join your group ride 🏍️`
    : `${currentUser.name} wants to join as your pillion 🪖`,
        createdAt: Date.now(),
        read: false,
      }
    );

    alert("Ride request sent 🚀");

  };
  console.log("Trips state:", trips);
  return (
    <main className="fixed inset-0 top-16 bg-black text-white overflow-hidden">
{/* Header */}
<div className="absolute top-4 left-0 right-0 z-50 flex justify-between items-center px-5">

  <h1 className="text-2xl font-black text-white">
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

          {trips.map((trip) => (
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
              <div
  className="relative h-full"
  onDoubleClick={() => {
    likeTrip(
      trip.id,
      trip.likes || 0
    );

    setHeartAnimation(trip.id);

    setTimeout(() => {
      setHeartAnimation(null);
    }, 800);
  }}
>

                {trip.mediaType?.startsWith("image") ? (
  <img
    src={trip.mediaUrl}
    alt="Post"
    className="w-full h-full object-cover"
  />
) : trip.mediaType?.startsWith("video") ? (
  <video
    src={trip.mediaUrl}
    className="w-full h-full object-cover"
    autoPlay
    muted
    loop
    playsInline
  />
) : (
  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
    <p className="text-zinc-400">
      📷 Media preview coming soon
    </p>
  </div>
)}

                {/* Rider Info */}
<Link
  href={`/rider/${encodeURIComponent(trip.userName)}`}
  onClick={(e) => e.stopPropagation()}
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
  <img
    src={trip.userImage}
    alt="Rider"
    className="w-10 h-10 rounded-full border border-orange-500"
  />

  <span className="font-bold text-white">
    {trip.userName}
  </span>
</Link>

               {/* Post Caption */}
<div
  className="
    absolute
    bottom-28
    left-4
    right-4
    text-white
    z-20
  "
>
  <p className="font-bold text-lg">
    {trip.userName}
  </p>

  <p className="mt-1 text-white/90 leading-relaxed">
    {trip.caption || "No caption yet."}
  </p>
</div>

               {/* Right Side Actions */}
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

  {/* Like */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      likeTrip(trip.id, trip.likes || 0);
    }}
    className="flex flex-col items-center"
  >
    <Heart className="w-8 h-8 text-white" />

    <span className="text-sm font-bold mt-1">
      {trip.likes || 0}
    </span>
  </button>

  {/* Comment */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setCommentPost(trip);
    }}
    className="flex flex-col items-center"
  >
    <MessageCircle className="w-8 h-8 text-white" />

    <span className="text-sm font-bold mt-1">
      {(trip.comments || []).length}
    </span>
  </button>

  {/* Save */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleSaveTrip(trip.id);
    }}
    className="flex flex-col items-center"
  >
    <Bookmark
      className={`w-8 h-8 ${
        savedTrips.includes(trip.id)
          ? "fill-white text-white"
          : "text-white"
      }`}
    />

    <span className="text-sm font-bold mt-1">
      Save
    </span>
  </button>

</div>
                {heartAnimation === trip.id && (
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

          ))}
        </div>
      </div>
{commentPost && (
  <div
    className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end"
    onClick={() => setCommentPost(null)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
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
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-zinc-800">
        <h2 className="text-xl font-bold">
          Comments
        </h2>

        <button
          onClick={() => setCommentPost(null)}
          className="text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {(commentPost.comments || []).length === 0 ? (
          <p className="text-zinc-500 text-center mt-10">
            No comments yet.
          </p>
        ) : (
          (commentPost.comments || []).map(
            (comment: any, index: number) => (
              <div
                key={index}
                className="flex gap-3"
              >
                <img
                  src={comment.image}
                  className="w-10 h-10 rounded-full"
                />

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

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">

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
          "
          onKeyDown={(e) => {

            if (e.key === "Enter") {

              addComment(
                commentPost.id,
                e.currentTarget.value
              );

              e.currentTarget.value = "";

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