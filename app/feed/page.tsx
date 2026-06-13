"use client";

import { useEffect, useState } from "react";

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

export default function FeedPage() {
  

  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
const [openComments, setOpenComments] =
  useState<string[]>([]);
  const [heartAnimation, setHeartAnimation] =
  useState<string | null>(null);
  useEffect(() => {

    const fetchTrips = async () => {

      try {

        const q = query(
  collection(db, "trips"),
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

      setTrips(loadedTrips);
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
    text: `${currentUser.name} wants to join your ride 🚀`,
    createdAt: Date.now(),
  }
);

alert("Ride request sent 🚀");

};
  return (
    <main className="h-screen bg-black text-white overflow-hidden">

      <div
  className="
  w-full
  h-full
  overflow-y-scroll
  snap-y
  snap-mandatory
  "
>
  <div>

          {trips.map((trip) => (
            <div
  key={trip.id}
  className="
snap-start
h-screen
w-full
bg-zinc-900
overflow-hidden
flex
flex-col
"
>

              <div className="p-4 flex items-center gap-3 border-b border-zinc-800">

  <img
    src={trip.userImage}
    alt="Rider"
    className="w-12 h-12 rounded-full"
  />

  <a
    href={`/rider/${trip.userName}`}
    className="font-bold text-orange-500 text-lg hover:underline"
  >
    {trip.userName}
  </a>

</div>

<div
  className="relative"
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
  <img
    src={trip.image}
    alt="Trip"
    className="
w-full
h-[75vh]
object-cover
"
  />

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

<div className="p-4 flex-1">

                <h2 className="text-3xl font-black">
                  {trip.destination}
                </h2>

                <p className="text-orange-500 mt-2 font-bold">
                  {trip.bike}
                </p>
<p className="text-zinc-400">
  📍 {trip.startLocation} → {trip.endLocation}
</p>
<p className="text-orange-400 font-bold">
  🛣️ {trip.distance || 0} KM
</p>
                <p className="text-zinc-300 mt-4">
                  {trip.caption}
                </p>

                <div className="mt-6 space-y-4">

<div className="flex justify-around items-center border-t border-zinc-800 pt-5 mt-5">

  <button
    onClick={() =>
      likeTrip(trip.id, trip.likes || 0)
    }
    className="flex flex-col items-center gap-1"
  >
    <span className="text-2xl">❤️</span>
    <span className="text-xs text-zinc-400">
      {trip.likes || 0} Likes
    </span>
  </button>

  <button
    onClick={() => {

      if (
        openComments.includes(trip.id)
      ) {

        setOpenComments(prev =>
          prev.filter(
            id => id !== trip.id
          )
        );

      } else {

        setOpenComments(prev => [
          ...prev,
          trip.id
        ]);

      }

    }}
    className="flex flex-col items-center gap-1"
  >
    <span className="text-2xl">💬</span>
    <span className="text-xs text-zinc-400">
      {(trip.comments || []).length} Comments
    </span>
  </button>

  <button
    onClick={() =>
      toggleSaveTrip(trip.id)
    }
    className="flex flex-col items-center gap-1"
  >
    <span className="text-2xl">
      {savedTrips.includes(trip.id)
        ? "⭐"
        : "📌"}
    </span>
    <span className="text-xs text-zinc-400">
      Save
    </span>
  </button>

  {JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  ).name !== trip.userName && (

    <button
      onClick={() =>
        requestToJoin(trip)
      }
      className="flex flex-col items-center gap-1 hover:scale-110 transition duration-200"
    >
      <span className="text-2xl">🚀</span>
      <span className="text-xs text-zinc-400">
        Join
      </span>
    </button>

  )}

</div>

<div
  className={`
    overflow-hidden transition-all duration-500 ease-in-out
    ${
      openComments.includes(trip.id)
        ? "max-h-[1000px] opacity-100 mt-6"
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

</div>

          ))}
        </div>
      </div>
    </main>
  );
}