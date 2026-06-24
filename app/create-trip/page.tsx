"use client";
import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useRouter } from "next/navigation";
function CreateTripContent() {

  
const router = useRouter();
const [editId, setEditId] = useState<string | null>(null);
const [rideType, setRideType] = useState<"individual" | "group">("individual");

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setEditId(params.get("edit"));
}, []);
const isEditing = !!editId;
const [destination, setDestination] = useState("");
const [bike, setBike] = useState("");
const [caption, setCaption] = useState("");
const [startLocation, setStartLocation] = useState("");
const [endLocation, setEndLocation] = useState("");
const [distance, setDistance] = useState("");
const [tripDate, setTripDate] = useState("");
const [itinerary, setItinerary] = useState("");
const [tripPrice, setTripPrice] = useState("");
const [tripImage, setTripImage] = useState(
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop"
);
useEffect(() => {
  const loadTrip = async () => {
    if (!editId) return;

    const snap = await getDoc(doc(db, "trips", editId));

    if (!snap.exists()) return;

    const trip = snap.data();

    setDestination(trip.destination || "");
    setBike(trip.bike || "");
    setCaption(trip.caption || "");
    setStartLocation(trip.startLocation || "");
    setEndLocation(trip.endLocation || "");
    setDistance(trip.distance || "");
    setTripDate(trip.tripDate || "");
    setItinerary(trip.itinerary || "");
    setTripPrice(trip.tripPrice || "");
    setTripImage(trip.image || "");
    setRideType(trip.rideType || "individual");
  };

  loadTrip();
}, [editId]);
const postTrip = async () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    let tripData;

if (isEditing && editId) {
  const existingTrip = (
    await getDoc(doc(db, "trips", editId))
  ).data();

  tripData = {
    ...existingTrip,
    status: "upcoming",
    rideType,
    destination,
    startLocation,
    endLocation,
    distance,
    bike,
    tripDate,
    itinerary: itinerary.trim(),
    tripPrice,
    caption,
    image: tripImage,
    userName: user.name,
    userImage: user.image,
  };
} else {
  tripData = {
  status: "upcoming",
  rideType,
  destination,
  startLocation,
  endLocation,
  distance,
  bike,
  tripDate,
  itinerary: itinerary.trim(),
  tripPrice,
  caption,
  image: tripImage,
  userName: user.name,
  userImage: user.image,
};
}

    // EDIT EXISTING TRIP
    if (isEditing && editId) {
      await updateDoc(
        doc(db, "trips", editId),
        tripData
      );

      alert("✅ Trip updated successfully!");

      router.push("/profile");
      return;
    }

    // CREATE NEW TRIP
    await addDoc(
      collection(db, "trips"),
      {
        ...tripData,
        createdAt: new Date(),
        likes: 0,
        comments: [],
      }
    );

    alert("🔥 Trip Posted Successfully!");

    setDestination("");
    setStartLocation("");
    setEndLocation("");
    setDistance("");
    setBike("");
    setCaption("");
    setTripDate("");
    setTripPrice("");
    setItinerary("");
    setTripImage(
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop"
    );

  } catch (error) {
    console.error(error);
    alert("Failed to save trip");
  }
};

  return (
    <PageBackground>

      <div className="max-w-3xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-8">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
  {isEditing ? "Edit Trip ✏️" : "Create Trip 🔥"}
</h1>
        <img
          src={tripImage}
          alt="Trip"
          className="w-full h-72 object-cover rounded-2xl mb-6"
        />

        <label className="bg-orange-500 px-6 py-3 rounded-2xl font-bold cursor-pointer inline-block hover:scale-105 transition">

          Upload Trip Photo

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                setTripImage(
                  URL.createObjectURL(file)
                );
              }
            }}
          />

        </label>
        <div className="space-y-6 mt-8">
<div className="space-y-2">
  <label className="font-bold text-orange-400">
    Ride Type
  </label>

  <select
    value={rideType}
    onChange={(e) =>
      setRideType(e.target.value as "individual" | "group")
    }
    className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
  >
    <option value="individual">
      👤 Individual Ride (Need Pillion)
    </option>

    <option value="group">
      👥 Group Ride (Bring Your Own Bike)
    </option>
  </select>
</div>
          <input
            type="text"
            placeholder="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
          />
<input
  type="text"
  placeholder="Start Location"
  value={startLocation}
  onChange={(e) => setStartLocation(e.target.value)}
  className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
/>

<input
  type="text"
  placeholder="End Location"
  value={endLocation}
  onChange={(e) => setEndLocation(e.target.value)}
  className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
/>
<input
  type="number"
  placeholder="Distance (KM)"
  value={distance}
  onChange={(e) => setDistance(e.target.value)}
  className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
/>
<input
  type="datetime-local"
  value={tripDate}
  onChange={(e) =>
    setTripDate(e.target.value)
  }
  className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
/>

<input
  type="number"
  placeholder="Trip Price (₹)"
  value={tripPrice}
  onChange={(e) =>
    setTripPrice(e.target.value)
  }
  className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
/>
          <input
            type="text"
            placeholder="Bike Name"
            value={bike}
            onChange={(e) => setBike(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black border border-zinc-700"
          />

          <div className="bg-black border border-zinc-700 rounded-2xl p-4 space-y-4">

  <div>
    <label className="block text-orange-400 font-bold mb-2">
      📝 Ride Story
    </label>

    <textarea
      placeholder="Tell riders about your trip..."
      value={caption}
      onChange={(e) => setCaption(e.target.value)}
      className="w-full h-40 bg-transparent outline-none resize-none"
    />
  </div>

  <div className="border-t border-zinc-700 pt-4">
    <label className="block text-orange-400 font-bold mb-2">
      🗺️ Itinerary (Optional)
    </label>

    <textarea
      value={itinerary}
      onChange={(e) => setItinerary(e.target.value)}
      placeholder={`Example:
• Bangalore → Chitradurga
• Breakfast stop
• Lunch at Davangere
• Sunset viewpoint`}
      className="w-full h-28 bg-transparent outline-none resize-none"
    />
  </div>

</div>
          <button
            onClick={postTrip}
            className="w-full bg-orange-500 py-4 rounded-2xl text-xl font-black hover:scale-105 transition"
          >
            {isEditing ? "Save Changes" : "Post Trip"}
          </button>

        </div>

      </div>

    </PageBackground>
  );
}
export default CreateTripContent;