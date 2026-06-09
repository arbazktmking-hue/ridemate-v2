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
  deleteDoc,
  getDoc
} from "firebase/firestore";

import { db } from "../firebase";

export default function FeedPage() {
  

  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);

  useEffect(() => {

    const fetchTrips = async () => {

      try {

        const q = query(
  collection(db, "trips")
);
const currentUser = JSON.parse(
  localStorage.getItem("ridemateUser") || "{}"
);

const followsSnapshot = await getDocs(
  collection(db, "follows")
);

const following: string[] = [];

followsSnapshot.forEach((doc) => {

  const follow = doc.data();

  if (
    follow.follower === currentUser.name
  ) {
    following.push(
      follow.following
    );
  }

});
        const querySnapshot = await getDocs(q);

        const loadedTrips: any[] = [];

        querySnapshot.forEach((doc) => {

         const trip = doc.data();

loadedTrips.push({
  id: doc.id,
  ...trip,
});

        });

      setTrips(
  loadedTrips.reverse()
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

  alert("Ride request sent 🚀");

};
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
          Ride Feed 🔥
        </h1>

        <div className="space-y-10">

          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800"
            >

              <img
                src={trip.image}
                alt="Trip"
                className="w-full h-[400px] object-cover"
              />

              <div className="p-6">

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

                <div className="mt-6 flex items-center justify-between">

                  <div className="flex items-center gap-3">

  <img
    src={trip.userImage}
    alt="Rider"
    className="w-12 h-12 rounded-full"
  />

  <p className="font-bold">
    {trip.userName}
  </p>

  {JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  ).name !== trip.userName && (

    <button
      onClick={() => requestToJoin(trip)}
      className="bg-green-600 px-4 py-2 rounded-xl font-bold hover:scale-105 transition"
    >
      Join Ride 🚀
    </button>

  )}

</div>

  <div className="flex gap-3">

  <button
    onClick={() =>
      toggleSaveTrip(trip.id)
    }
    className="bg-zinc-700 px-5 py-2 rounded-xl font-bold hover:scale-105 transition"
  >
    {savedTrips.includes(trip.id)
      ? "⭐ Saved"
      : "⭐ Save"}
  </button>

  <button
    onClick={() =>
      likeTrip(
        trip.id,
        trip.likes || 0
      )
    }
    className="bg-orange-500 px-5 py-2 rounded-xl font-bold hover:scale-105 transition"
  >
    ❤️ {trip.likes || 0}
  </button>

</div>
<div className="mt-6">
  <input
    type="text"
    placeholder="Write a comment..."
    className="w-full p-3 rounded-xl bg-black border border-zinc-700"
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
          className="bg-black p-3 rounded-xl border border-zinc-800"
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