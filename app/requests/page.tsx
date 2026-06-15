"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
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

  await updateDoc(
  doc(db, "rideRequests", requestId),
  {
    status,
    tripCompleted: false,
    tripId,
  }
);

  setRequests((prev) =>
    prev.filter(
      (request) =>
        request.id !== requestId
    )
  );

};

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

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

    </main>
  );
}