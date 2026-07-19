"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function SharePage() {
  const { id } = useParams();

  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<any[]>([]);
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    // Load trip
    const tripSnapshot = await getDocs(
      collection(db, "trips")
    );

    tripSnapshot.forEach((doc) => {
      if (doc.id === id) {
        setTrip({
          id: doc.id,
          ...doc.data(),
        });
      }
    });

    // Load followings
    const followSnapshot = await getDocs(
      collection(db, "follows")
    );

    const users: any[] = [];

    followSnapshot.forEach((doc) => {
      const follow = doc.data();

      if (follow.follower === currentUser.name) {
        users.push(follow.following);
      }
    });

    // Load rider images
    const tripUsers = await getDocs(
      collection(db, "trips")
    );

    const riderList: any[] = [];

    tripUsers.forEach((doc) => {
      const rider = doc.data();

      if (
        users.includes(rider.userName) &&
        !riderList.find(
          (u) => u.userName === rider.userName
        )
      ) {
        riderList.push({
          userName: rider.userName,
          userImage: rider.userImage,
        });
      }
    });

    setFollowing(riderList);
  };

  const sendToUser = async (userName: string) => {
    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    await addDoc(
  collection(db, "messages"),
  {
    sender: currentUser.name,
    receiver: userName,

    type: "sharedTrip",

    tripId: trip.id,
    destination: trip.destination,
    image: trip.image,
    bike: trip.bike,
    rider: trip.userName,

    createdAt: Date.now(),
  }
);

    alert("Trip shared successfully 🚀");
  };

  const filteredUsers = following.filter((user) =>
    user.userName
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white">

      {/* Header */}

      <div className="sticky top-0 bg-black border-b border-zinc-800 p-5 z-20">

        <h1 className="text-3xl font-black text-orange-500">
          Share Trip
        </h1>

        <input
          placeholder="Search followers..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="mt-5 w-full bg-zinc-900 rounded-xl p-4 border border-zinc-700"
        />

      </div>

      {/* Following List */}

      <div className="p-5 space-y-4">

        {filteredUsers.map((user) => (

          <div
            key={user.userName}
            className="bg-zinc-900 rounded-2xl p-4 flex justify-between items-center"
          >

            <div className="flex items-center gap-4">

              <img
                src={user.userImage}
                className="w-14 h-14 rounded-full"
              />

              <div>

                <h2 className="font-bold">
                  {user.userName}
                </h2>

              </div>

            </div>

            <button
              onClick={() =>
                sendToUser(user.userName)
              }
              className="bg-orange-500 px-5 py-2 rounded-xl font-bold"
            >
              Send
            </button>

          </div>

        ))}

      </div>

      {/* Floating WhatsApp */}

      <a
        href={
          trip
            ? `https://wa.me/?text=${encodeURIComponent(
                `Check out this RideMate trip to ${trip.destination}!`
              )}`
            : "#"
        }
        target="_blank"
        className="
          fixed
          bottom-8
          right-8
          w-16
          h-16
          rounded-full
          bg-green-500
          flex
          items-center
          justify-center
          text-3xl
          shadow-2xl
        "
      >
        💬
      </a>

    </main>
  );
}