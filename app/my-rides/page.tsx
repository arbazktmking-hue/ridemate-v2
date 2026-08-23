"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

export default function MyRidesPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "upcoming" | "history"
  >("upcoming");

  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRides = async () => {
      try {
        setLoading(true);

        const currentUser = JSON.parse(
          localStorage.getItem("ridemateUser") || "{}"
        );

        if (!currentUser.name) {
          setLoading(false);
          return;
        }

        // =====================================================
        // LOAD TRIPS
        // =====================================================

        const tripsSnapshot = await getDocs(
          collection(db, "trips")
        );

        // Create an easy lookup:
        // tripId -> trip data
        const tripsMap: Record<string, any> = {};

        tripsSnapshot.forEach((tripDoc) => {
          tripsMap[tripDoc.id] = {
            id: tripDoc.id,
            ...tripDoc.data(),
          };
        });

        // =====================================================
        // LOAD RIDE REQUESTS
        // =====================================================

        const requestsSnapshot = await getDocs(
          collection(db, "rideRequests")
        );

        const upcoming: any[] = [];
        const history: any[] = [];

        const now = new Date();

        // =====================================================
        // HELPER
        // =====================================================

        const isTripCompletedOrPast = (trip: any) => {
          // ---------------------------------------------------
          // EXPLICITLY COMPLETED
          // ---------------------------------------------------

          if (trip.status === "completed") {
            return true;
          }

          // ---------------------------------------------------
          // PAST TRIP DATE
          // ---------------------------------------------------

          if (trip.tripDate) {
            const tripDate = new Date(trip.tripDate);

            if (
              !isNaN(tripDate.getTime()) &&
              tripDate < now
            ) {
              return true;
            }
          }

          return false;
        };

        // =====================================================
        // TRIPS POSTED BY CURRENT USER
        // =====================================================

        tripsSnapshot.forEach((tripDoc) => {
          const trip = tripDoc.data();

          console.log(
            "TRIP:",
            tripDoc.id,
            "OWNER:",
            trip.userName,
            "CURRENT USER:",
            currentUser.name,
            "STATUS:",
            trip.status
          );

          // Only process trips owned by current user
          if (trip.userName !== currentUser.name) {
            return;
          }

          const tripData = {
            id: tripDoc.id,
            ...trip,
            role: "Host",
            canEdit: true,
          };

          // ---------------------------------------------------
          // COMPLETED / PAST → HISTORY
          // ---------------------------------------------------

          if (isTripCompletedOrPast(trip)) {
            history.push(tripData);
            return;
          }

          // ---------------------------------------------------
          // OTHERWISE → UPCOMING
          // ---------------------------------------------------

          upcoming.push(tripData);
        });

        // =====================================================
        // TRIPS JOINED BY CURRENT USER
        // =====================================================

        requestsSnapshot.forEach((requestDoc) => {
          const request = requestDoc.data();

          // Only approved requests belonging to current user
          if (
            request.requester !== currentUser.name ||
            request.status !== "approved"
          ) {
            return;
          }

          // ---------------------------------------------------
          // FIND THE REAL TRIP
          // ---------------------------------------------------

          const actualTrip =
            tripsMap[request.tripId];

          // ---------------------------------------------------
          // IMPORTANT:
          //
          // If the trip still exists, ALWAYS use the actual
          // trip's current status/date.
          //
          // This is what makes completion sync between
          // host and rider.
          // ---------------------------------------------------

          if (actualTrip) {
            const joinedTrip = {
              ...actualTrip,

              id: actualTrip.id,

              role: "Rider",

              canEdit: false,

              // Keep the requester's relevant information
              // where needed.
              tripOwner:
                actualTrip.userName ||
                request.tripOwner ||
                "",

              destination:
                actualTrip.destination ||
                request.destination ||
                "RideMate Trip",

              tripDate:
                actualTrip.tripDate ||
                request.tripDate ||
                null,

              bike:
                actualTrip.bike ||
                request.bike ||
                "RideMate Trip",

              startLocation:
                actualTrip.startLocation ||
                request.startLocation ||
                "",

              distance:
                actualTrip.distance ||
                request.distance ||
                "",

              tripPrice:
                actualTrip.tripPrice ??
                request.tripPrice ??
                "",

              rideType:
                actualTrip.rideType ||
                request.rideType ||
                "",
            };

            // -------------------------------------------------
            // CHECK ACTUAL TRIP STATUS
            // -------------------------------------------------

            if (
              isTripCompletedOrPast(actualTrip)
            ) {
              history.push(joinedTrip);
            } else {
              upcoming.push(joinedTrip);
            }

            return;
          }

          // ===================================================
          // FALLBACK
          //
          // If the original trip somehow cannot be found,
          // use the information stored inside rideRequests.
          // ===================================================

          const fallbackRide = {
            id: request.tripId,

            destination:
              request.destination ||
              "RideMate Trip",

            userName:
              request.tripOwner ||
              "",

            role: "Rider",

            tripDate:
              request.tripDate ||
              null,

            bike:
              request.bike ||
              "RideMate Trip",

            startLocation:
              request.startLocation ||
              "",

            distance:
              request.distance ||
              "",

            tripPrice:
              request.tripPrice ||
              "",

            rideType:
              request.rideType ||
              "",

            canEdit: false,
          };

          // If the request has a past date,
          // put it into history.
          if (
            fallbackRide.tripDate
          ) {
            const fallbackDate =
              new Date(
                fallbackRide.tripDate
              );

            if (
              !isNaN(
                fallbackDate.getTime()
              ) &&
              fallbackDate < now
            ) {
              history.push(
                fallbackRide
              );
              return;
            }
          }

          upcoming.push(
            fallbackRide
          );
        });

        // =====================================================
        // REMOVE DUPLICATE UPCOMING RIDES
        // =====================================================

        const uniqueUpcoming =
          upcoming.filter(
            (ride, index, self) =>
              index ===
              self.findIndex(
                (r) => r.id === ride.id
              )
          );

        // =====================================================
        // REMOVE DUPLICATE HISTORY
        // =====================================================

        const uniqueHistory =
          history.filter(
            (ride, index, self) =>
              index ===
              self.findIndex(
                (r) => r.id === ride.id
              )
          );

        console.log(
          "UPCOMING RIDES:",
          uniqueUpcoming
        );

        console.log(
          "RIDE HISTORY:",
          uniqueHistory
        );

        setUpcomingRides(
          uniqueUpcoming
        );

        setRideHistory(
          uniqueHistory
        );
      } catch (error) {
        console.error(
          "Failed to load rides:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadRides();
  }, []);

  // =========================================================
  // EDIT RIDE
  // =========================================================

  const editRide = (tripId: string) => {
    console.log(
      "Editing trip:",
      tripId
    );

    router.push(
      `/create-trip?edit=${encodeURIComponent(
        tripId
      )}`
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-20 text-zinc-400">
            Loading your rides...
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-5xl mx-auto">

        {/* =================================================
            PAGE TITLE
        ================================================= */}

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          My Rides
        </h1>

        {/* =================================================
            TABS
        ================================================= */}

        <div className="flex gap-3 mb-8">

          <button
            onClick={() =>
              setActiveTab("upcoming")
            }
            className={`px-6 py-3 rounded-2xl font-black ${
              activeTab === "upcoming"
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 border border-zinc-800"
            }`}
          >
            Upcoming
          </button>

          <button
            onClick={() =>
              setActiveTab("history")
            }
            className={`px-6 py-3 rounded-2xl font-black ${
              activeTab === "history"
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 border border-zinc-800"
            }`}
          >
            History
          </button>

        </div>

        {/* =================================================
            UPCOMING RIDES
        ================================================= */}

        {activeTab === "upcoming" && (

          <div className="space-y-5">

            {upcomingRides.length === 0 ? (

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">

                <h2 className="text-2xl font-black mb-2">
                  No upcoming rides
                </h2>

                <p className="text-zinc-400">
                  Your upcoming rides will appear here.
                </p>

              </div>

            ) : (

              upcomingRides.map((trip) => (

                <div
                  key={trip.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
                >

                  {/* HEADER */}

                  <div className="flex justify-between items-start gap-4">

                    <div className="flex-1">

                      <h2 className="text-3xl font-black">
                        🏔 {trip.destination}
                      </h2>

                      <p className="text-zinc-400 mt-2">

                        {trip.tripDate
                          ? new Date(
                              trip.tripDate
                            ).toLocaleString()
                          : "📅 Date not available"}

                      </p>

                      <p className="text-orange-400 mt-2 font-bold">

                        {trip.role === "Host"
                          ? "Host 🏍️"
                          : "Rider"}

                      </p>

                      {trip.bike && (
                        <p className="text-zinc-400 mt-2">
                          🏍 {trip.bike}
                        </p>
                      )}

                    </div>

                    {/* EDIT */}

                    {trip.canEdit === true && (

                      <button
                        onClick={() =>
                          editRide(trip.id)
                        }
                        className="
                          shrink-0
                          bg-orange-500
                          hover:bg-orange-400
                          text-black
                          px-5
                          py-3
                          rounded-2xl
                          font-black
                          transition
                          hover:scale-105
                          shadow-lg
                        "
                      >
                        ✏️ Edit
                      </button>

                    )}

                  </div>

                  {/* EXTRA INFORMATION */}

                  {(trip.startLocation ||
                    trip.distance ||
                    trip.tripPrice !== undefined ||
                    trip.rideType) && (

                    <div className="
                      mt-5
                      pt-5
                      border-t
                      border-zinc-800
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                    ">

                      {trip.startLocation && (
                        <div className="bg-black rounded-xl p-3">
                          <span className="text-zinc-500 text-sm">
                            Start
                          </span>

                          <p className="font-bold">
                            📍 {trip.startLocation}
                          </p>
                        </div>
                      )}

                      {trip.distance && (
                        <div className="bg-black rounded-xl p-3">
                          <span className="text-zinc-500 text-sm">
                            Distance
                          </span>

                          <p className="font-bold">
                            🛣️ {trip.distance} KM
                          </p>
                        </div>
                      )}

                      {trip.tripPrice !== undefined &&
                        trip.tripPrice !== "" && (

                        <div className="bg-black rounded-xl p-3">
                          <span className="text-zinc-500 text-sm">
                            Contribution
                          </span>

                          <p className="font-bold">
                            ₹{trip.tripPrice}
                          </p>
                        </div>
                      )}

                      {trip.rideType && (
                        <div className="bg-black rounded-xl p-3">
                          <span className="text-zinc-500 text-sm">
                            Ride Type
                          </span>

                          <p className="font-bold">
                            {trip.rideType === "group"
                              ? "👥 Group Ride"
                              : "👤 Individual Ride"}
                          </p>
                        </div>
                      )}

                    </div>
                  )}

                </div>

              ))

            )}

          </div>
        )}

        {/* =================================================
            HISTORY
        ================================================= */}

        {activeTab === "history" && (

          <div className="space-y-5">

            {rideHistory.length === 0 ? (

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">

                <h2 className="text-2xl font-black mb-2">
                  No ride history
                </h2>

                <p className="text-zinc-400">
                  Your completed rides will appear here.
                </p>

              </div>

            ) : (

              rideHistory.map((trip) => (

                <div
                  key={trip.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
                >

                  <div className="flex justify-between items-start gap-4">

                    <div>

                      <h2 className="text-3xl font-black">
                        🏔 {trip.destination}
                      </h2>

                      <p className="text-zinc-400 mt-2">

                        {trip.tripDate
                          ? new Date(
                              trip.tripDate
                            ).toLocaleDateString()
                          : "Date not available"}

                      </p>

                      <p className="text-orange-400 mt-2 font-bold">
                        {trip.role}
                      </p>

                      {trip.bike && (
                        <p className="text-zinc-400 mt-2">
                          🏍 {trip.bike}
                        </p>
                      )}

                    </div>

                  </div>

                  <p className="text-green-400 mt-3 font-bold">
                    ✓ Completed / Past Ride
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