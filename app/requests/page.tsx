"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../firebase";

export default function RequestsPage() {

  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {

    const loadRequests = async () => {

      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      const snapshot = await getDocs(
        collection(db, "rideRequests")
      );

      const loaded: any[] = [];

      snapshot.forEach((docSnap) => {

        const request = docSnap.data();

        if (
          request.tripOwner === currentUser.name &&
          request.status === "pending"
        ) {
          loaded.push({
            id: docSnap.id,
            ...request,
          });
        }

      });

      setRequests(loaded);

    };

    loadRequests();

  }, []);

 const updateRequest = async (
  requestId: string,
  status: string,
  tripId: string
) => {
  const request = requests.find((r) => r.id === requestId);

  if (!request) return;

  // Update the request
  await updateDoc(
    doc(db, "rideRequests", requestId),
    {
      status,
      tripCompleted: false,
      tripId,
    }
  );
// Create or update the trip chat when approved
if (status === "approved") {
  const chatRef = doc(db, "tripChats", tripId);

  const existingChat = await getDoc(chatRef);

  if (!existingChat.exists()) {
    await setDoc(chatRef, {
  tripId,
  destination: request.destination,
  owner: request.tripOwner,
  members: [
    request.tripOwner,
    request.requester,
  ],
  createdAt: Date.now(),

  // NEW: keeps track of whether the ride is still active
  completed: false,
});
  } else {
    await updateDoc(chatRef, {
      members: arrayUnion(request.requester),
    });
  }
}
  // Notify the requester
  await addDoc(
    collection(db, "notifications"),
    {
      user: request.requester,
      text:
        status === "approved"
          ? `🎉 ${request.tripOwner} approved your ride request to ${request.destination}`
          : `❌ ${request.tripOwner} rejected your ride request to ${request.destination}`,
      createdAt: Date.now(),
      read: false,
    }
  );

  // Remove from local list
  setRequests((prev) =>
    prev.filter((r) => r.id !== requestId)
  );
};

  return (
    <PageBackground>

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
          Ride Requests 🚀
        </h1>

        {requests.length === 0 ? (

          <p className="text-zinc-400">
            No pending requests
          </p>

        ) : (

          <div className="space-y-5">

            {requests.map((request) => (

              <div
                key={request.id}
                className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800"
              >

                <div className="flex items-center gap-4">

                  <img
                    src={request.requesterImage}
                    alt=""
                    className="w-14 h-14 rounded-full"
                  />

                  <div>

                    <h2 className="font-black text-xl">
                      {request.requester}
                    </h2>

                    <p className="text-zinc-400">
                      Wants to join ride to {request.destination}
                    </p>

                  </div>

                </div>

                <div className="flex gap-3 mt-5">

                  <button
                    onClick={() =>
  updateRequest(
    request.id,
    "approved",
    request.tripId
  )
}
                    className="bg-green-600 px-5 py-2 rounded-xl font-bold"
                  >
                    Approve ✅
                  </button>

                  <button
                    onClick={() =>
  updateRequest(
    request.id,
    "rejected",
    request.tripId
  )
}
                    className="bg-red-600 px-5 py-2 rounded-xl font-bold"
                  >
                    Reject ❌
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </PageBackground>
  );
}