"use client";

import {
  Suspense,
  useEffect,
  useState,
  useRef,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Rocket,
  Share2,
} from "lucide-react";
function FeedContent() {
const router = useRouter();
const searchParams = useSearchParams();
const sharedTripId = searchParams.get("trip");
  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [openComments, setOpenComments] =
    useState<string[]>([]);
  const [heartAnimation, setHeartAnimation] =
    useState<string | null>(null);
    const tripRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  useEffect(() => {

    const fetchTrips = async () => {

      try {

        const q = query(
          collection(db, "trips"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const loadedTrips: any[] = [];

        querySnapshot.forEach((doc) => {

          const trip = doc.data();

          loadedTrips.push({
            id: doc.id,
            ...trip,
          });

        });

        const uniqueTrips = loadedTrips.filter(
  (trip, index, self) =>
    index === self.findIndex((t) => t.id === trip.id)
);

setTrips(uniqueTrips);

console.log(
  "Trips loaded:",
  uniqueTrips.length,
  uniqueTrips
);
      } catch (error) {

        console.log(error);

      }

    };

    fetchTrips();

  }, []);
  useEffect(() => {
  if (!sharedTripId) return;

  console.log("Shared Trip:", sharedTripId);
  console.log("Trips:", trips.map(t => t.id));

  const timer = setTimeout(() => {
    console.log("Refs:", Object.keys(tripRefs.current));

    const element = tripRefs.current[sharedTripId];

    console.log("Found element:", element);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, 1500);

  return () => clearTimeout(timer);
}, [sharedTripId, trips]);
  useEffect(() => {

    const loadSavedTrips = async () => {

      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!user.name) return;

      const snapshot = await getDocs(
        collection(db, "savedTrips")
      );

      const saved: string[] = [];

      snapshot.forEach((doc) => {

        const data = doc.data();

        if (data.user === user.name) {
          saved.push(data.tripId);
        }

      });

      setSavedTrips(saved);

    };

    loadSavedTrips();

  }, []);
  const toggleSaveTrip = async (
    tripId: string
  ) => {

    const user = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    const saveId =
      `${user.name}_${tripId}`;

    if (
      savedTrips.includes(tripId)
    ) {

      await deleteDoc(
        doc(db, "savedTrips", saveId)
      );

      setSavedTrips((prev) =>
        prev.filter(
          (id) => id !== tripId
        )
      );

    } else {

      await setDoc(
        doc(db, "savedTrips", saveId),
        {
          user: user.name,
          tripId,
        }
      );

      setSavedTrips((prev) => [
        ...prev,
        tripId,
      ]);

    }

  };
  const likeTrip = async (
    id: string,
    currentLikes: number
  ) => {

    try {

      const tripRef = doc(db, "trips", id);

      await updateDoc(tripRef, {
        likes: currentLikes + 1,
      });
      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      const trip = trips.find(
        (t) => t.id === id
      );

      if (
        trip &&
        trip.userName !== currentUser.name
      ) {

        await addDoc(
          collection(db, "notifications"),
          {
            user: trip.userName,
            text: `${currentUser.name} liked your trip ❤️`,
            createdAt: Date.now(),
            read: false,
          }
        );

      }
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === id
            ? {
              ...trip,
              likes: currentLikes + 1,
            }
            : trip
        )
      );

    } catch (error) {

      console.log(error);

    }

  };
  const addComment = async (
    tripId: string,
    commentText: string
  ) => {

    if (!commentText.trim()) return;

    try {

      const tripRef = doc(db, "trips", tripId);

      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      await updateDoc(tripRef, {
        comments: arrayUnion({
          user: user.name,
          image: user.image,
          text: commentText,
        }),
      });
      const trip = trips.find(
        (t) => t.id === tripId
      );

      if (
        trip &&
        trip.userName !== user.name
      ) {

        await addDoc(
          collection(db, "notifications"),
          {
            user: trip.userName,
            text: `${user.name} commented on your trip 💬`,
            createdAt: Date.now(),
            read: false,
          }
        );

      }
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === tripId
            ? {
              ...trip,
              comments: [
                ...(trip.comments || []),
                {
                  user: user.name,
                  image: user.image,
                  text: commentText,
                },
              ],
            }
            : trip
        )
      );
    } catch (error) {

      console.log(error);

    }

  };
  const requestToJoin = async (trip: any) => {

    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    if (currentUser.name === trip.userName) {
      alert("You cannot join your own ride.");
      return;
    }
    const existingRequests = await getDocs(
      collection(db, "rideRequests")
    );

    let alreadyRequested = false;

    existingRequests.forEach((doc) => {
      const request = doc.data();

      if (
        request.tripId === trip.id &&
        request.requester === currentUser.name &&
        request.status === "pending"
      ) {
        alreadyRequested = true;
      }
    });

    if (alreadyRequested) {
      alert("Request already sent 🚀");
      return;
    }
    await addDoc(
      collection(db, "rideRequests"),
      {
        tripId: trip.id,
        tripOwner: trip.userName,
        requester: currentUser.name,
        requesterImage: currentUser.image || "",
        destination: trip.destination,
        createdAt: Date.now(),
        status: "pending",
      }
    );

    // 🔥 Send notification to ride owner
    await addDoc(
      collection(db, "notifications"),
      {
        user: trip.userName,
        text:
  trip.rideType === "group"
    ? `${currentUser.name} wants to join your group ride 🏍️`
    : `${currentUser.name} wants to join as your pillion 🪖`,
        createdAt: Date.now(),
        read: false,
      }
    );

    alert("Ride request sent 🚀");

  };
  console.log("Trips state:", trips);
  return (
    <main className="fixed inset-0 top-16 bg-black text-white overflow-hidden">

      <div
  className="
  h-full
  w-full
  overflow-y-auto
  overflow-x-hidden
  snap-y
  snap-mandatory
  overscroll-none
  [scrollbar-width:none]
  [-ms-overflow-style:none]
  [&::-webkit-scrollbar]:hidden
"
>
        <div>

          {trips.map((trip) => (
            <div
  key={trip.id}
  ref={(el) => {
    tripRefs.current[trip.id] = el;
  }}
  className="
snap-start
h-[calc(100dvh-64px)]
w-full
relative
overflow-hidden
"
>
              <div
  className="relative h-full"
  onClick={() => setSelectedTrip(trip)}
  onDoubleClick={() => {
    likeTrip(
      trip.id,
      trip.likes || 0
    );

    setHeartAnimation(trip.id);

    setTimeout(() => {
      setHeartAnimation(null);
    }, 800);
  }}
>

                <img
                  src={trip.image}
                  alt="Trip"
                  className="
      w-full
      h-full
      object-cover
    "
                />

                {/* Rider Info */}
<Link
  href={`/rider/${encodeURIComponent(trip.userName)}`}
  onClick={(e) => e.stopPropagation()}
  className="
    absolute
    top-4
    left-4
    flex
    items-center
    gap-3
    bg-black/50
    backdrop-blur-sm
    px-3
    py-2
    rounded-full
    hover:bg-black/70
    transition
    z-50
  "
>
  <img
    src={trip.userImage}
    alt="Rider"
    className="w-10 h-10 rounded-full border border-orange-500"
  />

  <span className="font-bold text-white">
    {trip.userName}
  </span>
</Link>

                {/* Trip Details */}
                <div
  className="
      absolute
      bottom-28
      left-4
      right-4
      rounded-3xl
      bg-black/35
      backdrop-blur-xl
      border
      border-white/10
      p-5
      text-white
      shadow-2xl
    "
>
                  <h2 className="text-4xl font-black tracking-tight drop-shadow-lg">
  🏔 {trip.destination}
</h2>
<div className="mt-2">
  {trip.rideType === "group" ? (
    <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
      👥 Group Ride • Bring Your Own Bike
    </span>
  ) : (
    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-bold">
      👤 Individual Ride • Looking for Pillion
    </span>
  )}
</div>
<p className="mt-3 text-lg text-white/90 font-semibold">
  📍 {trip.startLocation}
</p>

<p className="inline-flex items-center gap-2 mt-3 bg-orange-500/20 border border-orange-500/40 px-4 py-2 rounded-full text-orange-300 font-bold text-sm backdrop-blur-md">
  🏍 {trip.bike}
</p>
                </div>

              {/* Bottom Action Bar */}
<div
  className="
    absolute
    bottom-4
    left-4
    right-4
    grid
    grid-cols-5
    items-center
    bg-black/40
    backdrop-blur-xl
    border
    border-white/10
    rounded-3xl
    py-3
    z-20
    shadow-2xl
  "
>

  {/* Like */}
  <div className="flex flex-col items-center">
    <button
      onClick={(e) => {
        e.stopPropagation();
        likeTrip(trip.id, trip.likes || 0);
      }}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500/20 transition">
        <Heart className="w-6 h-6 text-red-400" />
      </div>
    </button>

    <span className="text-xs mt-1">
      {trip.likes || 0}
    </span>
  </div>

  {/* Comment */}
  <div className="flex flex-col items-center">
    <button
      onClick={(e) => {
        e.stopPropagation();

        if (openComments.includes(trip.id)) {
          setOpenComments(prev =>
            prev.filter(id => id !== trip.id)
          );
        } else {
          setOpenComments(prev => [
            ...prev,
            trip.id,
          ]);
        }
      }}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-500/20 transition">
        <MessageCircle className="w-6 h-6 text-sky-400" />
      </div>
    </button>

    <span className="text-xs mt-1">
      {(trip.comments || []).length}
    </span>
  </div>

  {/* Share */}
  <div className="flex flex-col items-center">
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/share/${trip.id}`);
      }}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-500/20 transition">
        <Share2 className="w-6 h-6 text-green-400" />
      </div>
    </button>

    <span className="text-xs mt-1">
      Share
    </span>
  </div>

  {/* Save */}
  <div className="flex flex-col items-center">
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleSaveTrip(trip.id);
      }}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 transition">
        <Bookmark
          className={`w-6 h-6 ${
            savedTrips.includes(trip.id)
              ? "fill-yellow-400 text-yellow-400"
              : "text-white"
          }`}
        />
      </div>
    </button>

    <span className="text-xs mt-1">
      {savedTrips.includes(trip.id)
        ? "Saved"
        : "Save"}
    </span>
  </div>

  {/* Join */}
  <div className="flex flex-col items-center">
    <button
      onClick={(e) => {
        e.stopPropagation();

        const currentUser = JSON.parse(
          localStorage.getItem("ridemateUser") || "{}"
        );

        if (currentUser.name === trip.userName) {
          alert("This is your ride");
          return;
        }

        requestToJoin(trip);
      }}
    >
      <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center hover:scale-110 transition">
        <Rocket className="w-6 h-6 text-white" />
      </div>
    </button>

    <span className="text-xs mt-1">
      {trip.rideType === "group"
        ? "Join Ride"
        : "Ride Along"}
    </span>
  </div>

</div>
                {heartAnimation === trip.id && (
                  <div
                    className="
        absolute
        inset-0
        flex
        items-center
        justify-center
        pointer-events-none
        animate-bounce
      "
                  >
                    <span className="text-8xl">
                      ❤️
                    </span>
                  </div>
                )}

              <div
  onClick={(e) => e.stopPropagation()}
  className={`
    absolute
    bottom-24
    left-0
    right-0
    bg-black/90
    backdrop-blur-md
    z-50
    overflow-y-auto
    transition-all
    duration-300
    ${
      openComments.includes(trip.id)
        ? "max-h-[300px] opacity-100"
        : "max-h-0 opacity-0"
    }
  `}
>

                <div className="mt-6">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-base"
                    onKeyDown={(e) => {

                      if (e.key === "Enter") {

                        addComment(
                          trip.id,
                          e.currentTarget.value
                        );

                        e.currentTarget.value = "";

                      }

                    }}
                  />

                  <div className="mt-4 space-y-2">

                    {(trip.comments || []).map(
                      (comment: any, index: number) => (

                        <div
                          key={index}
                          className="
bg-black
p-4
rounded-2xl
border
border-zinc-800
hover:border-orange-500
transition
"
                        >

                          <div className="flex items-center gap-3 mb-2">

                            <img
                              src={comment.image}
                              alt="User"
                              className="w-8 h-8 rounded-full"
                            />

                            <p className="font-bold text-orange-500">
                              {comment.user}
                            </p>

                          </div>

                          <p className="text-zinc-300">
                            {comment.text}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>

              </div>

</div>

</div>

          ))}
        </div>
      </div>
      {selectedTrip && (
  <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end">
    <div className="w-full bg-zinc-950 rounded-t-3xl p-6 border-t border-orange-500 max-h-[85vh] overflow-y-auto">

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-3xl font-black text-orange-400">
          🏔 {selectedTrip.destination}
        </h2>

        <button
          onClick={() => setSelectedTrip(null)}
          className="text-3xl"
        >
          ✕
        </button>
      </div>

      <img
        src={selectedTrip.image}
        alt="Trip"
        className="w-full h-56 object-cover rounded-2xl mb-5"
      />

      <div className="space-y-3 text-zinc-200">
  <p>
    🏍 <strong>Bike:</strong> {selectedTrip.bike}
  </p>

  <p>
    📍 <strong>Route:</strong>{" "}
    {selectedTrip.startLocation} → {selectedTrip.endLocation}
  </p>

  <p>
    🛣️ <strong>Distance:</strong> {selectedTrip.distance} KM
  </p>

  <p>
    📅 <strong>Departure:</strong>{" "}
    {selectedTrip.tripDate
      ? new Date(selectedTrip.tripDate).toLocaleString()
      : "TBA"}
  </p>

  <p>
    💰 <strong>Contribution:</strong> ₹
    {selectedTrip.tripPrice || 0}
  </p>

  <p>
    👤 <strong>Host:</strong> {selectedTrip.userName}
  </p>

  <p>
    🚩 <strong>Ride Type:</strong>{" "}
    {selectedTrip.rideType === "group"
      ? "👥 Group Ride (Bring Your Own Bike)"
      : "👤 Individual Ride (Looking for Pillion Rider)"}
  </p>

  <div className="mt-4 bg-black/40 rounded-2xl p-4 border border-zinc-800">
  <h3 className="font-bold mb-2 text-orange-300">
    📝 About this Ride
  </h3>

  <p className="italic text-zinc-200">
    {selectedTrip.caption || "No description provided."}
  </p>

  {selectedTrip.itinerary && (
    <div className="mt-6 border-t border-zinc-700 pt-4">
      <h3 className="font-bold mb-4 text-orange-300">
        🗺️ Itinerary
      </h3>

      <div className="space-y-3">
        {selectedTrip.itinerary
          .split("\n")
          .filter((line: string) => line.trim() !== "")
          .map((line: string, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3"
            >
              <div className="mt-1 w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
              <p className="text-zinc-300">{line}</p>
            </div>
          ))}
      </div>
    </div>
  )}
</div>

</div>

<button
  onClick={() => {
    requestToJoin(selectedTrip);
    setSelectedTrip(null);
  }}
  className="mt-6 w-full bg-orange-500 text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition"
>
  {selectedTrip.rideType === "group"
    ? "🏍️ Request to Join Group Ride"
    : "🪖 Request Pillion Seat"}
</button>

    </div>
  </div>
)}

    </main>
  );
}
export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <main className="fixed inset-0 top-16 bg-black text-white flex items-center justify-center">
          Loading...
        </main>
      }
    >
      <FeedContent />
    </Suspense>
  );
}