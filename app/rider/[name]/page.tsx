"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc
} from "firebase/firestore";

import { db } from "../../firebase";

export default function RiderPage() {

  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );
const [riderTrips, setRiderTrips] = useState<any[]>([]);
const [totalLikes, setTotalLikes] = useState(0);
const [riderImage, setRiderImage] = useState("");
const [isFollowing, setIsFollowing] = useState(false);
const [followers, setFollowers] = useState(0);
const [totalDistance, setTotalDistance] = useState(0);
const [badge, setBadge] = useState("");
const [following, setFollowing] = useState(0);
const [currentUser, setCurrentUser] = useState<any>(null);
const [reviews, setReviews] = useState<any[]>([]);
const [avgRating, setAvgRating] = useState(0);
const [reviewCount, setReviewCount] = useState(0);
const achievements = [];

if (riderTrips.length >= 1)
  achievements.push("🏍 First Ride");

if (riderTrips.length >= 5)
  achievements.push("🥈 Road Explorer");

if (riderTrips.length >= 10)
  achievements.push("🥇 RideMate Legend");

if (totalDistance >= 500)
  achievements.push("🔵 Explorer");

if (totalDistance >= 2000)
  achievements.push("🟣 Road Warrior");

if (totalDistance >= 5000)
  achievements.push("🟠 Adventure Master");

if (totalDistance >= 10000)
  achievements.push("🔴 RideMate Legend");

if (totalLikes >= 50)
  achievements.push("❤️ Popular Rider");

if (totalLikes >= 100)
  achievements.push("🔥 Viral Rider");

if (followers >= 10)
  achievements.push("👥 Community Star");

if (followers >= 50)
  achievements.push("👑 RideMate Icon");
useEffect(() => {

  const loadRider = async () => {

    const snapshot = await getDocs(
      collection(db, "trips")
    );

    const trips: any[] = [];

    let likes = 0;
    let image = "";
    let distance = 0;

    snapshot.forEach((doc) => {

      const trip = doc.data();
console.log(
  "Firestore user:",
  trip.userName
);

console.log(
  "URL rider:",
  riderName
);
      if (
        trip.userName === riderName
      ) {

        trips.push({
          id: doc.id,
          ...trip,
        });

        likes += trip.likes || 0;
distance += Number(
  trip.distance || 0
);
        image = trip.userImage || "";

      }

    });

   setRiderTrips(trips);
setTotalLikes(likes);
setTotalDistance(distance);
setRiderImage(image);
const reviewSnapshot = await getDocs(
  collection(db, "rideReviews")
);

const riderReviews: any[] = [];

let totalRating = 0;

reviewSnapshot.forEach((reviewDoc) => {
  const review = reviewDoc.data();

  if (review.rider === riderName) {
    riderReviews.push(review);

    totalRating += review.rating || 0;
  }
});

setReviews(
  riderReviews.sort(
    (a, b) => b.createdAt - a.createdAt
  )
);

setReviewCount(riderReviews.length);

setAvgRating(
  riderReviews.length
    ? totalRating / riderReviews.length
    : 0
);
if (trips.length >= 10) {

  setBadge("🥇 RideMate Legend");

} else if (trips.length >= 5) {

  setBadge("🥈 Road Explorer");

} else if (trips.length >= 1) {

  setBadge("🥉 Rookie Rider");

}

  };

  loadRider();

}, [riderName]);
useEffect(() => {

  const checkFollowStatus = async () => {

    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );
setCurrentUser(currentUser);
    if (!currentUser.name) return;

    const followId =
      `${currentUser.name}_${riderName}`;

    const followDoc = await getDoc(
      doc(db, "follows", followId)
    );

    setIsFollowing(
      followDoc.exists()
    );
const followsSnapshot = await getDocs(
  collection(db, "follows")
);

let count = 0;
let followingCount = 0;

followsSnapshot.forEach((doc) => {

  const follow = doc.data();

  if (
    follow.following === riderName
  ) {
    count++;
  }
if (
  follow.follower === riderName
) {
  followingCount++;
}
});

console.log("riderName =", riderName);
console.log("FINAL FOLLOWER COUNT =", count);
setFollowers(count);
setFollowing(followingCount);
  };

  checkFollowStatus();

}, [riderName]);
const toggleFollow = async () => {

  const currentUser = JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  );

  const followId =
    `${currentUser.name}_${riderName}`;

  if (isFollowing) {

    await deleteDoc(
      doc(db, "follows", followId)
    );

    setIsFollowing(false);
    setFollowers((prev) => prev - 1);

  } else {

    await setDoc(
      doc(db, "follows", followId),
      {
        follower: currentUser.name,
        following: riderName,
      }
    );
await addDoc(
  collection(db, "notifications"),
  {
    user: riderName,
    text: `${currentUser.name} followed you 👥`,
    createdAt: Date.now(),
  }
);
    setIsFollowing(true);
    setFollowers((prev) => prev + 1);

  }

};
  return (

  <main className="min-h-screen bg-black text-white px-6 py-10">

    <div className="max-w-4xl mx-auto">

  <div className="text-center">

    <img
  src={
    riderImage ||
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300"
  }
  alt="Rider"
  className="w-32 h-32 rounded-full mx-auto border-4 border-orange-500"
/>

    <h1 className="text-5xl font-black text-orange-500 mt-6">
      {riderName}
    </h1>
   <div className="mt-3 mb-10 text-xl font-bold text-yellow-400">
  {badge}
</div>
{currentUser?.name !== riderName && (

  <div className="mt-10 mb-10 flex flex-col gap-3 items-center">

    <button
      onClick={toggleFollow}
      className={`px-8 py-3 rounded-2xl font-black ${
        isFollowing
          ? "bg-zinc-700"
          : "bg-orange-500"
      }`}
    >
      {isFollowing
        ? "Following ✅"
        : "Follow 👥"}
    </button>

    <Link
      href={`/chat/${encodeURIComponent(riderName)}`}
      className="bg-blue-600 px-8 py-3 rounded-2xl font-black"
    >
      Message Rider 💬
    </Link>

  </div>

)}
<div className="grid grid-cols-2 gap-4 mt-16">

  <Link
    href={`/rider/${encodeURIComponent(riderName)}/followers`}
    className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500 text-center"
  >
    👥 Followers: {followers}
  </Link>

  <Link
    href={`/rider/${encodeURIComponent(riderName)}/following`}
    className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500 text-center"
  >
    ➡️ Following: {following}
  </Link>

</div>

    <div className="mt-6 space-y-3">

      <div className="bg-zinc-900 p-4 rounded-2xl">
        🏍 Trips Posted: {riderTrips.length}
      </div>

      <div className="bg-zinc-900 p-4 rounded-2xl">
        ❤️ Likes Received: {totalLikes}
      </div>
<div className="bg-zinc-900 p-4 rounded-2xl">
  ⭐ Rating: {avgRating.toFixed(1)} / 5
</div>

<div className="bg-zinc-900 p-4 rounded-2xl">
  📝 Reviews: {reviewCount}
</div>
      <div className="bg-zinc-900 p-4 rounded-2xl">
  🛣️ Total Distance: {totalDistance} KM
</div>

<div className="bg-zinc-900 p-4 rounded-2xl">
  {totalDistance >= 10000
    ? "🔴 RideMate Legend"
    : totalDistance >= 5000
    ? "🟠 Adventure Master"
    : totalDistance >= 2000
    ? "🟣 Road Warrior"
    : totalDistance >= 500
    ? "🔵 Explorer"
    : "🟢 Beginner Rider"}
</div>
<div className="bg-zinc-900 p-4 rounded-2xl">

  <h3 className="text-orange-500 font-black mb-3">
    🏅 Achievements
  </h3>

  <div className="space-y-2">

    {achievements.map(
      (achievement, index) => (

        <div
          key={index}
          className="bg-black p-3 rounded-xl"
        >
          {achievement}
        </div>

      )
    )}

  </div>

</div>
    </div>

  </div>

  <div className="mt-10">

    <h2 className="text-3xl font-black text-orange-500 mb-6">
      Rider Trips 🏍️
    </h2>

    <div className="space-y-4">

      {riderTrips.map((trip) => (

        <div
          key={trip.id}
          className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800"
        >

          <h3 className="text-xl font-bold">
            {trip.destination}
          </h3>
<p className="text-zinc-400">
  📍 {trip.startLocation} → {trip.endLocation}
</p>
<p className="text-orange-400 font-bold">
  🛣️ {trip.distance || 0} KM
</p>
          <p className="text-orange-500">
            {trip.bike}
          </p>

          <p className="text-zinc-300 mt-2">
            {trip.caption}
          </p>
{trip.itinerary && (
  <div className="mt-3 text-sm text-zinc-400 whitespace-pre-line">
    <span className="font-bold text-orange-400">
      🗺️ Itinerary:
    </span>

    {"\n"}
    {trip.itinerary}
  </div>
)}
          <p className="text-zinc-400 mt-2">
            ❤️ {trip.likes || 0}
          </p>

        </div>

      ))}

    </div>
<div className="mt-12">

  <h2 className="text-3xl font-black text-orange-500 mb-6">
    Rider Reviews ⭐
  </h2>

  {reviews.length === 0 ? (

    <div className="bg-zinc-900 p-5 rounded-2xl">
      No reviews yet
    </div>

  ) : (

    <div className="space-y-4">

      {reviews.map((review, index) => (

        <div
          key={index}
          className="
          bg-zinc-900
          p-5
          rounded-2xl
          border border-zinc-800
          "
        >

          <div className="text-yellow-400 font-bold text-lg">
            {"⭐".repeat(review.rating)}
          </div>

          <p className="mt-3 text-zinc-300">
            {review.review}
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            — {review.reviewer}
          </p>

        </div>

      ))}

    </div>

  )}

</div>
  </div>

</div>
    </main>

  );

}