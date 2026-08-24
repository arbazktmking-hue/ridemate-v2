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

  const [expandedRide, setExpandedRide] = useState<string | null>(
    null
  );

  // =========================================================
  // LOAD RIDES
  // =========================================================

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
        // LOAD ALL TRIPS
        // =====================================================

        const tripsSnapshot = await getDocs(
          collection(db, "trips")
        );

        const tripsMap: Record<string, any> = {};

        tripsSnapshot.forEach((tripDoc) => {
          tripsMap[tripDoc.id] = {
            id: tripDoc.id,
            ...tripDoc.data(),
          };
        });

        // =====================================================
        // LOAD ALL REQUESTS
        // =====================================================

        const requestsSnapshot = await getDocs(
          collection(db, "rideRequests")
        );

        // =====================================================
        // CREATE APPROVED MEMBERS MAP
        //
        // tripId -> approved rider
        // =====================================================

        const approvedMembersMap: Record<string, any> = {};

        requestsSnapshot.forEach((requestDoc) => {
          const request = requestDoc.data();

          if (
            request.status === "approved" &&
            request.tripId
          ) {
            approvedMembersMap[request.tripId] = {
              name: request.requester || "",
              image: request.requesterImage || "",
            };
          }
        });

        const upcoming: any[] = [];
        const history: any[] = [];

        const now = new Date();

        // =====================================================
        // HELPER
        // =====================================================

        const isTripCompletedOrPast = (trip: any) => {
          // Explicitly completed
          if (trip.status === "completed") {
            return true;
          }

          // Past trip date
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

          if (trip.userName !== currentUser.name) {
            return;
          }

          // ---------------------------------------------------
          // FIND APPROVED RIDER FOR THIS HOST'S TRIP
          // ---------------------------------------------------

          const approvedMember =
            approvedMembersMap[tripDoc.id] || null;

          const tripData = {
            id: tripDoc.id,
            ...trip,

            role: "Host",

            // Host can edit only upcoming rides
            canEdit: true,

            // Approved rider
            acceptedMember:
              approvedMember?.name || "",

            acceptedMemberImage:
              approvedMember?.image || "",
          };

          // ---------------------------------------------------
          // COMPLETED / PAST
          // ---------------------------------------------------

          if (isTripCompletedOrPast(trip)) {
            history.push(tripData);
            return;
          }

          // ---------------------------------------------------
          // UPCOMING
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

          // ===================================================
          // FIND REAL TRIP
          // ===================================================

          const actualTrip =
            tripsMap[request.tripId];

          // ===================================================
          // ACTUAL TRIP EXISTS
          // ===================================================

          if (actualTrip) {
            const joinedTrip = {
              ...actualTrip,

              id: actualTrip.id,

              role: "Rider",

              // Rider cannot edit
              canEdit: false,

              // Host information
              tripOwner:
                actualTrip.userName ||
                request.tripOwner ||
                "",

              tripOwnerImage:
                actualTrip.userImage ||
                request.tripOwnerImage ||
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

              // The rider is the current user,
              // but the important "other person"
              // is the host.
              acceptedMember:
                actualTrip.userName ||
                request.tripOwner ||
                "",

              acceptedMemberImage:
                actualTrip.userImage ||
                request.tripOwnerImage ||
                "",
            };

            // -------------------------------------------------
            // ACTUAL TRIP STATUS
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

            tripOwner:
              request.tripOwner ||
              "",

            tripOwnerImage:
              request.tripOwnerImage ||
              "",

            // Other person = host
            acceptedMember:
              request.tripOwner ||
              "",

            acceptedMemberImage:
              request.tripOwnerImage ||
              "",
          };

          // ---------------------------------------------------
          // PAST DATE
          // ---------------------------------------------------

          if (fallbackRide.tripDate) {
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
    router.push(
      `/create-trip?edit=${encodeURIComponent(
        tripId
      )}`
    );
  };

  // =========================================================
  // TOGGLE EXPANSION
  // =========================================================

  const toggleRide = (rideId: string) => {
    setExpandedRide((current) =>
      current === rideId
        ? null
        : rideId
    );
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatTripDate = (value: any) => {
    if (!value) {
      return "Date not available";
    }

    try {
      let date: Date;

      if (
        typeof value === "object" &&
        typeof value.toDate === "function"
      ) {
        date = value.toDate();
      } else if (
        typeof value === "object" &&
        value.seconds !== undefined
      ) {
        date = new Date(
          value.seconds * 1000
        );
      } else {
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return "Date not available";
      }

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );
    } catch {
      return "Date not available";
    }
  };

  // =========================================================
  // GET OTHER PERSON
  // =========================================================

  const getOtherMemberName = (trip: any) => {
    // Rider → show host
    if (
      trip.role === "Rider" &&
      trip.tripOwner
    ) {
      return trip.tripOwner;
    }

    // Host → show accepted rider
    if (trip.acceptedMember) {
      return trip.acceptedMember;
    }

    // Fallbacks
    if (trip.memberName) {
      return trip.memberName;
    }

    if (trip.joinedUser) {
      return trip.joinedUser;
    }

    if (trip.riderName) {
      return trip.riderName;
    }

    if (trip.acceptedRider) {
      return trip.acceptedRider;
    }

    return null;
  };

  // =========================================================
  // GET OTHER PERSON IMAGE
  // =========================================================

  const getOtherMemberImage = (trip: any) => {
    if (trip.role === "Rider") {
      return (
        trip.tripOwnerImage ||
        trip.userImage ||
        ""
      );
    }

    return (
      trip.acceptedMemberImage ||
      ""
    );
  };

  // =========================================================
  // TRIP CARD
  // =========================================================

  const TripCard = ({
    trip,
    history = false,
  }: {
    trip: any;
    history?: boolean;
  }) => {

    const rideKey =
      `${history ? "history" : "upcoming"}-${trip.id}`;

    const isExpanded =
      expandedRide === rideKey;

    const otherMember =
      getOtherMemberName(trip);

    const otherMemberImage =
      getOtherMemberImage(trip);

    return (
      <div
        className={`
          bg-zinc-900
          border
          rounded-3xl
          overflow-hidden
          transition-all
          duration-300
          ${
            isExpanded
              ? "border-orange-500/70 shadow-lg shadow-orange-500/10"
              : "border-zinc-800 hover:border-orange-500/40"
          }
        `}
      >

        {/* =================================================
            COLLAPSED CARD
        ================================================= */}

        <div
          onClick={() =>
            toggleRide(rideKey)
          }
          className="
            p-4
            sm:p-5
            cursor-pointer
          "
        >

          <div className="flex items-center gap-4">

            {/* TRIP ICON */}

            <div
              className="
                w-14
                h-14
                sm:w-16
                sm:h-16
                rounded-2xl
                bg-black
                border
                border-zinc-800
                flex
                items-center
                justify-center
                text-2xl
                shrink-0
              "
            >
              🏔️
            </div>

            {/* BASIC INFO */}

            <div className="flex-1 min-w-0">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <h2
                    className="
                      text-xl
                      sm:text-2xl
                      font-black
                      truncate
                    "
                  >
                    {trip.destination}
                  </h2>

                  <p className="text-zinc-400 text-sm mt-1">
                    {trip.tripDate
                      ? formatTripDate(
                          trip.tripDate
                        )
                      : "📅 Date not available"}
                  </p>

                </div>

                {/* EXPAND ARROW */}

                <div
                  className={`
                    text-zinc-500
                    text-xl
                    transition-transform
                    duration-300
                    ${
                      isExpanded
                        ? "rotate-180 text-orange-500"
                        : ""
                    }
                  `}
                >
                  ↓
                </div>

              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">

                <span
                  className="
                    px-3
                    py-1
                    rounded-full
                    bg-orange-500/10
                    border
                    border-orange-500/20
                    text-orange-400
                    text-xs
                    font-black
                  "
                >
                  {trip.role === "Host"
                    ? "Host 🏍️"
                    : "Rider"}
                </span>

                {trip.bike && (
                  <span
                    className="
                      text-zinc-400
                      text-xs
                      truncate
                    "
                  >
                    🏍️ {trip.bike}
                  </span>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            EXPANDED SECTION
        ================================================= */}

        <div
          className={`
            grid
            transition-all
            duration-300
            ease-in-out
            ${
              isExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }
          `}
        >

          <div className="overflow-hidden">

            <div
              className="
                border-t
                border-zinc-800
                px-4
                sm:px-5
                pb-5
                pt-4
              "
            >

              {/* =================================================
                  PERSON YOU RODE WITH
              ================================================= */}

              {otherMember && (

                <div
                  className="
                    mb-4
                    bg-black
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                  "
                >

                  <p
                    className="
                      text-zinc-500
                      text-xs
                      uppercase
                      tracking-wide
                      font-black
                    "
                  >
                    {history
                      ? "Trip Completed With"
                      : trip.role === "Host"
                        ? "Accepted Rider"
                        : "Ride Hosted By"}
                  </p>

                  <div className="flex items-center gap-3 mt-2">

                    {otherMemberImage && (

                      <img
                        src={otherMemberImage}
                        alt=""
                        className="
                          w-10
                          h-10
                          rounded-full
                          object-cover
                        "
                      />

                    )}

                    <p
                      className="
                        font-black
                        text-orange-400
                      "
                    >
                      {otherMember}
                    </p>

                  </div>

                </div>

              )}

              {/* =================================================
                  TRIP DETAILS
              ================================================= */}

              <div
                className="
                  grid
                  grid-cols-2
                  sm:grid-cols-3
                  gap-2
                "
              >

                {/* START */}

                {trip.startLocation && (

                  <div
                    className="
                      bg-black
                      border
                      border-zinc-800
                      rounded-xl
                      p-3
                    "
                  >

                    <span
                      className="
                        text-zinc-500
                        text-[10px]
                        uppercase
                        font-black
                      "
                    >
                      Starting From
                    </span>

                    <p
                      className="
                        font-bold
                        text-sm
                        mt-1
                      "
                    >
                      📍 {trip.startLocation}
                    </p>

                  </div>

                )}

                {/* DISTANCE */}

                {trip.distance && (

                  <div
                    className="
                      bg-black
                      border
                      border-zinc-800
                      rounded-xl
                      p-3
                    "
                  >

                    <span
                      className="
                        text-zinc-500
                        text-[10px]
                        uppercase
                        font-black
                      "
                    >
                      Distance
                    </span>

                    <p
                      className="
                        font-bold
                        text-sm
                        mt-1
                      "
                    >
                      🛣️ {trip.distance} KM
                    </p>

                  </div>

                )}

                {/* DEPARTURE */}

                {trip.tripDate && (

                  <div
                    className="
                      bg-black
                      border
                      border-zinc-800
                      rounded-xl
                      p-3
                    "
                  >

                    <span
                      className="
                        text-zinc-500
                        text-[10px]
                        uppercase
                        font-black
                      "
                    >
                      Departure
                    </span>

                    <p
                      className="
                        font-bold
                        text-xs
                        mt-1
                      "
                    >
                      🗓️{" "}
                      {formatTripDate(
                        trip.tripDate
                      )}
                    </p>

                  </div>

                )}

                {/* BIKE */}

                {trip.bike && (

                  <div
                    className="
                      bg-black
                      border
                      border-zinc-800
                      rounded-xl
                      p-3
                    "
                  >

                    <span
                      className="
                        text-zinc-500
                        text-[10px]
                        uppercase
                        font-black
                      "
                    >
                      Bike
                    </span>

                    <p
                      className="
                        font-bold
                        text-sm
                        mt-1
                      "
                    >
                      🏍️ {trip.bike}
                    </p>

                  </div>

                )}

                {/* CONTRIBUTION */}

                {trip.tripPrice !== undefined &&
                  trip.tripPrice !== "" && (

                    <div
                      className="
                        bg-black
                        border
                        border-zinc-800
                        rounded-xl
                        p-3
                      "
                    >

                      <span
                        className="
                          text-zinc-500
                          text-[10px]
                          uppercase
                          font-black
                        "
                      >
                        Contribution
                      </span>

                      <p
                        className="
                          font-bold
                          text-sm
                          mt-1
                        "
                      >
                        ₹{trip.tripPrice}
                      </p>

                    </div>

                  )}

                {/* RIDE TYPE */}

                {trip.rideType && (

                  <div
                    className="
                      bg-black
                      border
                      border-zinc-800
                      rounded-xl
                      p-3
                    "
                  >

                    <span
                      className="
                        text-zinc-500
                        text-[10px]
                        uppercase
                        font-black
                      "
                    >
                      Ride Type
                    </span>

                    <p
                      className="
                        font-bold
                        text-sm
                        mt-1
                      "
                    >
                      {trip.rideType ===
                      "group"
                        ? "👥 Group Ride"
                        : "👤 Individual Ride"}
                    </p>

                  </div>

                )}

              </div>

              {/* =================================================
                  RIDE STORY
              ================================================= */}

              {(trip.story ||
                trip.rideStory ||
                trip.description) && (

                <div
                  className="
                    mt-3
                    bg-black
                    border
                    border-zinc-800
                    rounded-xl
                    p-3
                  "
                >

                  <span
                    className="
                      text-zinc-500
                      text-[10px]
                      uppercase
                      font-black
                    "
                  >
                    Ride Story
                  </span>

                  <p
                    className="
                      text-zinc-300
                      text-sm
                      mt-1
                      leading-relaxed
                    "
                  >
                    {trip.story ||
                      trip.rideStory ||
                      trip.description}
                  </p>

                </div>

              )}

              {/* =================================================
                  HISTORY STATUS
              ================================================= */}

              {history && (

                <div
                  className="
                    mt-3
                    bg-green-500/10
                    border
                    border-green-500/20
                    rounded-xl
                    px-4
                    py-3
                    text-center
                  "
                >

                  <p
                    className="
                      text-green-400
                      font-black
                      text-sm
                    "
                  >
                    ✓ Completed / Past Ride
                  </p>

                </div>

              )}

              {/* =================================================
                  EDIT BUTTON
                  ONLY FOR UPCOMING HOST RIDES
                  NEVER FOR HISTORY
              ================================================= */}

              {trip.canEdit === true &&
                !history && (

                <button
                  onClick={(event) => {
                    event.stopPropagation();

                    editRide(
                      trip.id
                    );
                  }}
                  className="
                    mt-3
                    w-full
                    bg-orange-500
                    hover:bg-orange-400
                    text-black
                    px-4
                    py-3
                    rounded-xl
                    font-black
                    transition
                  "
                >
                  ✏️ Edit Ride
                </button>

              )}

            </div>

          </div>

        </div>

      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main
        className="
          min-h-screen
          bg-black
          text-white
          p-4
          sm:p-6
        "
      >

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
    <main
      className="
        min-h-screen
        bg-black
        text-white
        p-4
        sm:p-6
      "
    >

      <div className="max-w-5xl mx-auto">

        {/* PAGE TITLE */}

        <h1
          className="
            text-4xl
            sm:text-5xl
            font-black
            text-orange-500
            mb-8
          "
        >
          My Rides
        </h1>

        {/* TABS */}

        <div className="flex gap-3 mb-8">

          <button
            onClick={() => {
              setActiveTab("upcoming");
              setExpandedRide(null);
            }}
            className={`
              px-5
              sm:px-6
              py-3
              rounded-2xl
              font-black
              transition
              ${
                activeTab === "upcoming"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }
            `}
          >
            Upcoming
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              setExpandedRide(null);
            }}
            className={`
              px-5
              sm:px-6
              py-3
              rounded-2xl
              font-black
              transition
              ${
                activeTab === "history"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }
            `}
          >
            History
          </button>

        </div>

        {/* =================================================
            UPCOMING RIDES
        ================================================= */}

        {activeTab === "upcoming" && (

          <div className="space-y-4">

            {upcomingRides.length === 0 ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-8
                  text-center
                "
              >

                <h2 className="text-2xl font-black mb-2">
                  No upcoming rides
                </h2>

                <p className="text-zinc-400">
                  Your upcoming rides will appear here.
                </p>

              </div>

            ) : (

              upcomingRides.map((trip) => (

                <TripCard
                  key={trip.id}
                  trip={trip}
                  history={false}
                />

              ))

            )}

          </div>

        )}

        {/* =================================================
            HISTORY
        ================================================= */}

        {activeTab === "history" && (

          <div className="space-y-4">

            {rideHistory.length === 0 ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-8
                  text-center
                "
              >

                <h2 className="text-2xl font-black mb-2">
                  No ride history
                </h2>

                <p className="text-zinc-400">
                  Your completed rides will appear here.
                </p>

              </div>

            ) : (

              rideHistory.map((trip) => (

                <TripCard
                  key={trip.id}
                  trip={trip}
                  history={true}
                />

              ))

            )}

          </div>

        )}

      </div>

    </main>
  );
}