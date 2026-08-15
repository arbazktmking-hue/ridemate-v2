"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export default function MyRidesPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  useEffect(() => {
  const loadUpcomingRides = async () => {
    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    if (!currentUser.name) return;

    const tripsSnapshot = await getDocs(collection(db, "trips"));
    const requestsSnapshot = await getDocs(collection(db, "rideRequests"));

    const rides: any[] = [];
    const history: any[] = [];
    const now = new Date();

    // Trips posted by the user
    tripsSnapshot.forEach((doc) => {
  const trip = doc.data();

  if (trip.userName === currentUser.name) {
    const tripData = {
      id: doc.id,
      ...trip,
      role: "Host",
    };

    if (trip.status === "completed") {
      history.push(tripData);
    } else if (trip.tripDate && new Date(trip.tripDate) >= now) {
      rides.push(tripData);
    } else {
      history.push(tripData);
    }
  }
});

    // Trips joined by the user
    requestsSnapshot.forEach((doc) => {
      const request = doc.data();

      if (
        request.requester === currentUser.name &&
        request.status === "approved"
      ) {
        rides.push({
          id: request.tripId,
          destination: request.destination,
          userName: request.tripOwner,
          role: "Rider",
          tripDate: request.tripDate || null,
          bike: request.bike || "RideMate Trip",
        });
      }
    });

    const uniqueRides = rides.filter(
  (ride, index, self) =>
    index === self.findIndex((r) => r.id === ride.id)
);

const uniqueHistory = history.filter(
  (ride, index, self) =>
    index === self.findIndex((r) => r.id === ride.id)
);

setUpcomingRides(uniqueRides);
setRideHistory(uniqueHistory);
  };

  loadUpcomingRides();
}, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-black text-orange-500 mb-8">
          My Rides
        </h1>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-3 rounded-2xl font-black ${
              activeTab === "upcoming"
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 border border-zinc-800"
            }`}
          >
            Upcoming
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 rounded-2xl font-black ${
              activeTab === "history"
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 border border-zinc-800"
            }`}
          >
            History
          </button>
        </div>

        {activeTab === "upcoming" ? (
  <div className="space-y-5">
    {upcomingRides.length === 0 ? (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
        <h2 className="text-2xl font-black mb-2">
          No upcoming rides
        </h2>
        <p className="text-zinc-400">
          Your upcoming trips will appear here.
        </p>
      </div>
    ) : (
      upcomingRides.map((trip) => (
        <div
          key={trip.id}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black">
                🏔 {trip.destination}
              </h2>
              <p className="text-zinc-400 mt-2">
                {trip.tripDate
                  ? new Date(trip.tripDate).toLocaleString()
                  : "Date not available"}
              </p>
              <p className="text-orange-400 mt-2 font-bold">
                {trip.role}
              </p>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
) : (
  <div className="space-y-5">
    {rideHistory.length === 0 ? (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
        <h2 className="text-2xl font-black mb-2">
          No ride history
        </h2>
        <p className="text-zinc-400">
          Your completed trips will appear here.
        </p>
      </div>
    ) : (
      rideHistory.map((trip) => (
        <div
          key={trip.id}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-3xl font-black">
            🏔 {trip.destination}
          </h2>

          <p className="text-zinc-400 mt-2">
            {trip.tripDate
              ? new Date(trip.tripDate).toLocaleDateString()
              : "Date not available"}
          </p>

          <p className="text-orange-400 mt-2 font-bold">
            {trip.role}
          </p>

          <p className="text-green-400 mt-3 font-bold">
            ✓ Completed
          </p>
        </div>
      ))
    )}
  </div>
)}
      </div>
    </main>
  );
}