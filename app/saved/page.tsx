"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function SavedPage() {

  const [savedTrips, setSavedTrips] =
    useState<any[]>([]);

  useEffect(() => {

    const loadSavedTrips = async () => {

      const user = JSON.parse(
        localStorage.getItem(
          "ridemateUser"
        ) || "{}"
      );

      const savedSnapshot =
        await getDocs(
          collection(db, "savedTrips")
        );

      const savedIds: string[] = [];

      savedSnapshot.forEach((doc) => {

        const data = doc.data();

        if (
          data.user === user.name
        ) {
          savedIds.push(
            data.tripId
          );
        }

      });

      const tripsSnapshot =
        await getDocs(
          collection(db, "trips")
        );

      const trips: any[] = [];

      tripsSnapshot.forEach((doc) => {

        if (
          savedIds.includes(
            doc.id
          )
        ) {

          trips.push({
            id: doc.id,
            ...doc.data(),
          });

        }

      });

      setSavedTrips(trips);

    };

    loadSavedTrips();

  }, []);

  return (

    <PageBackground>

      <div className="max-w-5xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
          Saved Trips ⭐
        </h1>

        <div className="space-y-8">

          {savedTrips.map((trip) => (

            <div
              key={trip.id}
              className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800"
            >

              <img
                src={trip.image}
                alt="Trip"
                className="w-full h-72 object-cover"
              />

              <div className="p-6">

                <h2 className="text-3xl font-black">
                  {trip.destination}
                </h2>

                <p className="text-zinc-400">
                  📍 {trip.startLocation} → {trip.endLocation}
                </p>

                <p className="text-orange-500 font-bold mt-2">
                  {trip.bike}
                </p>

                <p className="mt-4">
                  {trip.caption}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </PageBackground>

  );

}