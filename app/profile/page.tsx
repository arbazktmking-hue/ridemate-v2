"use client";

import { useState } from "react";

export default function ProfilePage() {

  const [profileImage, setProfileImage] = useState(
    "https://i.pravatar.cc/300"
  );

  const [bikeImage, setBikeImage] = useState(
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200&auto=format&fit=crop"
  );

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-4xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-8">

        <div className="flex flex-col items-center">

          <img
            src={profileImage}
            alt="Profile"
            className="w-40 h-40 rounded-full border-4 border-orange-500 object-cover"
          />

          <label className="mt-5 bg-orange-500 px-5 py-3 rounded-2xl font-bold cursor-pointer hover:scale-105 transition">

            Upload Profile Photo

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  setProfileImage(
                    URL.createObjectURL(file)
                  );
                }
              }}
            />

          </label>

          <h1 className="text-5xl font-black mt-8">
            Arbhaz Pasha
          </h1>

          <p className="text-zinc-400 mt-3">
            Adventure Rider • Mountain Explorer • KTM Lover
          </p>

        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-14">

          <div className="bg-black rounded-3xl p-6">

            <img
              src={bikeImage}
              alt="Bike"
              className="w-full h-64 object-cover rounded-2xl mb-5"
            />

            <label className="bg-orange-500 px-5 py-3 rounded-2xl font-bold cursor-pointer inline-block hover:scale-105 transition">

              Upload Bike Photo

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    setBikeImage(
                      URL.createObjectURL(file)
                    );
                  }
                }}
              />

            </label>

            <h2 className="text-3xl font-black text-orange-500 mt-6 mb-4">
              Bike Details
            </h2>

            <p>🏍 KTM Duke 390</p>
            <p>⚡ Top Speed: 170 km/h</p>
            <p>⛽ Mileage: 28 km/l</p>
            <p>🛣 Favorite Route: Tawang</p>

          </div>

          <div className="bg-black rounded-3xl p-6">

            <h2 className="text-3xl font-black text-orange-500 mb-6">
              Ride Stats
            </h2>

            <div className="space-y-4 text-lg">

              <p>📍 Trips Completed: 24</p>
              <p>🌍 States Covered: 8</p>
              <p>🛣 Total Distance: 18,400 km</p>
              <p>🔥 Longest Ride: Bangalore → Tawang</p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}