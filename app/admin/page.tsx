"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [users, setUsers] = useState(0);
  const [trips, setTrips] = useState(0);
  const [requests, setRequests] = useState(0);
  const [completedRides, setCompletedRides] = useState(0);
  const router = useRouter();
useEffect(() => {
  const user = JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  );

  // Replace this with your own Gmail
  if (user.email !== "arbazktmking@gmail.com") {
    router.replace("/home");
  }
}, [router]);
  useEffect(() => {
    const loadStats = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      setUsers(usersSnapshot.size);

      const tripsSnapshot = await getDocs(collection(db, "trips"));
      setTrips(tripsSnapshot.size);

      const requestsSnapshot = await getDocs(collection(db, "rideRequests"));
      setRequests(requestsSnapshot.size);

      const completedQuery = query(
        collection(db, "trips"),
        where("status", "==", "completed")
      );

      const completedSnapshot = await getDocs(completedQuery);
      setCompletedRides(completedSnapshot.size);
    };

    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-black text-orange-500 mb-10">
          RideMate Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">Registered users</p>
            <h2 className="text-5xl font-black mt-2">{users}</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">Total trips posted</p>
            <h2 className="text-5xl font-black mt-2">{trips}</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">Ride requests sent</p>
            <h2 className="text-5xl font-black mt-2">{requests}</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">Completed rides</p>
            <h2 className="text-5xl font-black mt-2">{completedRides}</h2>
          </div>
        </div>
      </div>
    </main>
  );
}