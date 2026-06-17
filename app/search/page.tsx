"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function SearchPage() {

  const [search, setSearch] = useState("");
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => {

    const loadRiders = async () => {

      const snapshot = await getDocs(
        collection(db, "trips")
      );

      const riderMap: any = {};

      snapshot.forEach((doc) => {

        const trip = doc.data();

        if (!riderMap[trip.userName]) {

          riderMap[trip.userName] = {
            name: trip.userName,
            image: trip.userImage,
          };

        }

      });

      setRiders(
        Object.values(riderMap)
      );

    };

    loadRiders();

  }, []);

  const filteredRiders =
    riders.filter((rider) =>
      rider.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  return (

    <PageBackground>

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Search Riders 🔍
        </h1>

        <input
          type="text"
          placeholder="Search rider..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 mb-8"
        />

        <div className="space-y-4">

          {filteredRiders.map(
            (rider, index) => (

              <Link
                key={index}
                href={`/rider/${encodeURIComponent(rider.name)}`}
                className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 hover:border-orange-500"
              >

                <img
                  src={rider.image}
                  alt="Rider"
                  className="w-14 h-14 rounded-full"
                />

                <h2 className="text-xl font-bold">
                  {rider.name}
                </h2>

              </Link>

            )
          )}

        </div>

      </div>

    </PageBackground>

  );

}