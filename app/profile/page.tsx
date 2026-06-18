"use client";
import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase";

export default function ProfilePage() {

  const [user, setUser] = useState<any>(null);
  const [tripCount, setTripCount] = useState(0);
const [totalLikes, setTotalLikes] = useState(0);
const [myTrips, setMyTrips] = useState<any[]>([]);
const [editingTrip, setEditingTrip] = useState<any>(null);
const [newCaption, setNewCaption] = useState("");
  const router = useRouter();

  useEffect(() => {

    const savedUser = localStorage.getItem(
      "ridemateUser"
    );

    if (!savedUser) {

  router.replace("/login");

  return;

} else {

    const currentUser = JSON.parse(savedUser);

setUser(currentUser);

const loadStats = async () => {

  const snapshot = await getDocs(
    collection(db, "trips")
  );

  let trips = 0;
  let likes = 0;
const riderTrips: any[] = [];
  snapshot.forEach((doc) => {

    const trip = doc.data();

    if (
      trip.userName === currentUser.name
    ) {

      trips++;

      likes += trip.likes || 0;
riderTrips.push({
  id: doc.id,
  ...trip,
});
    }

  });

  setTripCount(trips);
  setTotalLikes(likes);
setMyTrips(riderTrips);
};

loadStats();

    }

  }, []);

  const logout = () => {

    localStorage.removeItem("ridemateUser");

    router.push("/login");

  };

  if (!user) {

    return null;

  }
  const editTrip = (trip: any) => {

  setEditingTrip(trip);

  setNewCaption(
    trip.caption || ""
  );

};
const saveTripEdit = async () => {

  if (!editingTrip) return;

  try {

    await updateDoc(
      doc(db, "trips", editingTrip.id),
      {
        caption: newCaption,
      }
    );

    setMyTrips((prevTrips) =>
      prevTrips.map((trip) =>
        trip.id === editingTrip.id
          ? {
              ...trip,
              caption: newCaption,
            }
          : trip
      )
    );

    setEditingTrip(null);

  } catch (error) {

    console.log(error);

  }

};
const deleteTrip = async (tripId: string) => {

  const confirmed = confirm(
    "Delete this trip?"
  );

  if (!confirmed) return;

  try {

    await deleteDoc(
      doc(db, "trips", tripId)
    );

    setMyTrips((prev) =>
      prev.filter(
        (trip) => trip.id !== tripId
      )
    );

    setTripCount((prev) => prev - 1);

  } catch (error) {

    console.log(error);

  }

};
const completeTrip = async (tripId: string) => {
  const confirmed = confirm(
    "Mark this trip as completed?"
  );

  if (!confirmed) return;

  try {
    // Mark the trip as completed
    await updateDoc(
      doc(db, "trips", tripId),
      {
        status: "completed",
      }
    );

    // ALSO mark the live chat as completed
    const chatRef = doc(db, "tripChats", tripId);

try {
  await updateDoc(chatRef, {
    completed: true,
  });
} catch {
  // Ignore if the chat document doesn't exist
}

    // Update local UI
    setMyTrips((prev) =>
      prev.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              status: "completed",
            }
          : trip
      )
    );

    alert("🏁 Trip completed!");
  } catch (error) {
    console.log(error);
  }
};
  return (
    <PageBackground>
{editingTrip && (

  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

    <div
  className="
    bg-white/10
    backdrop-blur-2xl
    border border-white/10
    p-6
    rounded-3xl
    w-[95%]
    max-w-[500px]
  "
>

      <h2 className="text-3xl font-black text-orange-500 mb-4">
        Edit Trip ✏️
      </h2>

      <textarea
        value={newCaption}
        onChange={(e) =>
          setNewCaption(e.target.value)
        }
        className="w-full h-40 p-4 rounded-2xl bg-black border border-zinc-700"
      />

      <div className="flex gap-3 mt-5">

        <button
          onClick={saveTripEdit}
          className="bg-orange-500 px-5 py-3 rounded-xl font-bold"
        >
          Save Changes
        </button>

        <button
          onClick={() =>
            setEditingTrip(null)
          }
          className="bg-zinc-700 px-5 py-3 rounded-xl font-bold"
        >
          Cancel
        </button>

      </div>

    </div>

  </div>

)}
      <div
  className="
    max-w-2xl
    mx-auto
    mt-8
    rounded-3xl
    bg-white/5
    backdrop-blur-2xl
    border border-white/10
    shadow-2xl
    p-10
    text-center
  "
>

        <img
          src={user.image}
          alt="Profile"
          className="w-32 h-32 rounded-full mx-auto border-4 border-orange-500"
        />

        <h1 className="text-4xl font-black mt-6">
          {user.name}
        </h1>

        <p className="text-zinc-400 mt-2">
          {user.email}
        </p>
<div className="mt-8 space-y-3">

  <div
  className="
    bg-white/5
    backdrop-blur-xl
    border border-white/10
    p-4
    rounded-2xl
  "
>
  🏍 Trips Posted: {tripCount}
</div>

<div
  className="
    bg-white/5
    backdrop-blur-xl
    border border-white/10
    p-4
    rounded-2xl
  "
>
  ❤️ Likes Received: {totalLikes}
</div>

</div>
        <div className="mt-10 text-left">

  <h2 className="text-2xl font-black text-orange-500 mb-4">
    My Trips 🏍️
  </h2>

  {myTrips.length === 0 ? (

    <p className="text-zinc-400">
      No trips posted yet
    </p>

  ) : (

    <div className="space-y-4">

      {myTrips.map((trip) => (

        <div
          key={trip.id}
          className="
bg-white/5
backdrop-blur-xl
border border-white/10
p-5
rounded-3xl
shadow-xl
"
        >

          <h3 className="font-bold text-xl">
            {trip.destination}
          </h3>

          <p className="text-orange-500">
            {trip.bike}
          </p>
<p className="text-zinc-400">
  📅 {trip.tripDate
    ? new Date(
        trip.tripDate
      ).toLocaleString()
    : "Date TBA"}
</p>

<p className="text-green-400">
  💰 ₹{trip.tripPrice || 0}
</p>
<div className="mt-2">
  <p className="text-zinc-300">
    {trip.caption}
  </p>

  {trip.itinerary && (
    <div className="mt-3 text-sm text-zinc-400 whitespace-pre-line">
      <span className="font-bold text-orange-400">
        🗺️ Itinerary:
      </span>

      <div className="mt-1">
        {trip.itinerary}
      </div>
    </div>
  )}
</div>

          <p className="text-zinc-400 mt-2">
            ❤️ {trip.likes || 0}
          </p>
<div className="mt-3 flex gap-3 flex-wrap">

  <button
    onClick={() => editTrip(trip)}
    className="bg-orange-500 px-4 py-2 rounded-xl font-bold"
  >
    ✏️ Edit
  </button>

  <button
    onClick={() => deleteTrip(trip.id)}
    className="bg-red-500 px-4 py-2 rounded-xl font-bold"
  >
    🗑 Delete
  </button>

  {trip.status !== "completed" && (
    <button
      onClick={() =>
        completeTrip(trip.id)
      }
      className="bg-green-600 px-4 py-2 rounded-xl font-bold"
    >
      🏁 Complete Trip
    </button>
  )}

  {trip.status === "completed" && (
    <span className="bg-green-900 px-4 py-2 rounded-xl font-bold text-green-300">
      ✅ Completed
    </span>
  )}

</div>
        </div>

      ))}

    </div>

  )}

</div>

<button
  onClick={logout}
  className="mt-10 bg-red-500 px-8 py-3 rounded-2xl font-black"
>
  Logout
</button>

      </div>

    </PageBackground>
  );
}