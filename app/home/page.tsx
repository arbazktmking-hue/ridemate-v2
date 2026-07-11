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

      const tripRef = doc(db, "trips", id);

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

      const tripRef = doc(db, "trips", tripId);

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

               {/* Bottom Action Bar */}
<div
  className="
    absolute
    bottom-4
    left-4
    right-4
    flex
    justify-around
    items-center
    bg-black/40
    backdrop-blur-xl
    border
    border-white/10
    rounded-3xl
    py-3
    z-20
    shadow-2xl
  "
>
  {/* Like */}
  <button
  onClick={(e) => {
    e.stopPropagation();
    likeTrip(trip.id, trip.likes || 0);
  }}
  className=""
>
    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500/20 transition">
      <Heart className="w-6 h-6 text-red-400" />
    </div>

    <span className="text-xs">
      {trip.likes || 0}
    </span>
  </button>

  {/* Comments */}
  <button
  onClick={(e) => {
    e.stopPropagation();

    if (openComments.includes(trip.id)) {
      setOpenComments(prev =>
        prev.filter(id => id !== trip.id)
      );
    } else {
      setOpenComments(prev => [
        ...prev,
        trip.id,
      ]);
    }
  }}
>
    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-500/20 transition">
      <MessageCircle className="w-6 h-6 text-sky-400" />
    </div>

    <span className="text-xs">
      {(trip.comments || []).length}
    </span>
  </button>

  {/* Save */}
  <button
  onClick={(e) => {
    e.stopPropagation();
    toggleSaveTrip(trip.id);
  }}
>
    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 transition">
      <Bookmark
        className={`w-6 h-6 ${
          savedTrips.includes(trip.id)
            ? "fill-yellow-400 text-yellow-400"
            : "text-white"
        }`}
      />
    </div>

    <span className="text-xs">
      {savedTrips.includes(trip.id)
        ? "Saved"
        : "Save"}
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

              <div
  onClick={(e) => e.stopPropagation()}
  className={`
    absolute
    bottom-24
    left-0
    right-0
    bg-black/90
    backdrop-blur-md
    z-50
    overflow-y-auto
    transition-all
    duration-300
    ${
      openComments.includes(trip.id)
        ? "max-h-[300px] opacity-100"
        : "max-h-0 opacity-0"
    }
  `}
>

                <div className="mt-6">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-base"
                    onKeyDown={(e) => {

                      if (e.key === "Enter") {

                        addComment(
                          trip.id,
                          e.currentTarget.value
                        );

                        e.currentTarget.value = "";

                      }

                    }}
                  />

                  <div className="mt-4 space-y-2">

                    {(trip.comments || []).map(
                      (comment: any, index: number) => (

                        <div
                          key={index}
                          className="
bg-black
p-4
rounded-2xl
border
border-zinc-800
hover:border-orange-500
transition
"
                        >

                          <div className="flex items-center gap-3 mb-2">

                            <img
                              src={comment.image}
                              alt="User"
                              className="w-8 h-8 rounded-full"
                            />

                            <p className="font-bold text-orange-500">
                              {comment.user}
                            </p>

                          </div>

                          <p className="text-zinc-300">
                            {comment.text}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>

              </div>

</div>

</div>

          ))}
        </div>
      </div>

    </main>
  );
}