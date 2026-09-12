"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

type AdminView = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
};

type Ride = {
  id: string;
  [key: string]: any;
};

export default function MyRidesPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "upcoming" | "history"
  >("upcoming");

  const [upcomingRides, setUpcomingRides] =
    useState<Ride[]>([]);

  const [rideHistory, setRideHistory] =
    useState<Ride[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [expandedRide, setExpandedRide] =
    useState<string | null>(null);

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =========================================================
     LOAD ACTIVE USER / ADMIN VIEW
  ========================================================= */

  useEffect(() => {
    const loadViewUser = () => {
      try {
        const savedAdminView =
          localStorage.getItem(
            "ridemateAdminView"
          );

        if (savedAdminView) {
          const parsedAdminView =
            JSON.parse(savedAdminView);

          if (parsedAdminView?.active) {
            setAdminView(
              parsedAdminView
            );

            setCurrentUserName(
              parsedAdminView.userName ||
                ""
            );

            return;
          }
        }

        const savedUser =
          localStorage.getItem(
            "ridemateUser"
          );

        if (savedUser) {
          const user =
            JSON.parse(savedUser);

          setAdminView(null);

          setCurrentUserName(
            user.name ||
              user.username ||
              ""
          );
        }
      } catch (error) {
        console.error(
          "Failed to load active user:",
          error
        );
      }
    };

    loadViewUser();

    const handleAdminViewChange =
      () => {
        loadViewUser();
      };

    window.addEventListener(
      "ridemateAdminViewChanged",
      handleAdminViewChange
    );

    window.addEventListener(
      "storage",
      handleAdminViewChange
    );

    return () => {
      window.removeEventListener(
        "ridemateAdminViewChanged",
        handleAdminViewChange
      );

      window.removeEventListener(
        "storage",
        handleAdminViewChange
      );
    };
  }, []);

  const isAdminView =
    adminView?.active === true;

  /* =========================================================
     LOAD RIDES
  ========================================================= */

  useEffect(() => {
    const loadRides = async () => {
      try {
        setLoading(true);

        /* =====================================================
           DETERMINE ACTIVE USER
        ===================================================== */

        let activeUserName = "";

        const savedAdminView =
          localStorage.getItem(
            "ridemateAdminView"
          );

        if (savedAdminView) {
          const parsedAdminView =
            JSON.parse(
              savedAdminView
            );

          if (
            parsedAdminView?.active &&
            parsedAdminView.userName
          ) {
            activeUserName =
              parsedAdminView.userName;
          }
        }

        if (!activeUserName) {
          const currentUser =
            JSON.parse(
              localStorage.getItem(
                "ridemateUser"
              ) || "{}"
            );

          activeUserName =
            currentUser.name ||
            currentUser.username ||
            "";
        }

        setCurrentUserName(
          activeUserName
        );

        if (!activeUserName) {
          setUpcomingRides([]);
          setRideHistory([]);
          setLoading(false);
          return;
        }

        console.log(
          "My Rides active user:",
          activeUserName
        );

        /* =====================================================
           LOAD ALL TRIPS
        ===================================================== */

        const tripsSnapshot =
          await getDocs(
            collection(
              db,
              "trips"
            )
          );

        const tripsMap =
          new Map<string, Ride>();

        tripsSnapshot.forEach(
          (tripDoc) => {
            tripsMap.set(
              tripDoc.id,
              {
                id: tripDoc.id,
                ...tripDoc.data(),
              }
            );
          }
        );

        /* =====================================================
           LOAD ALL RIDE REQUESTS
        ===================================================== */

        const requestsSnapshot =
          await getDocs(
            collection(
              db,
              "rideRequests"
            )
          );

        /* =====================================================
           APPROVED MEMBER MAP
           tripId -> approved rider
        ===================================================== */

        const approvedMembersMap =
          new Map<
            string,
            {
              name: string;
              image: string;
            }
          >();

        requestsSnapshot.forEach(
          (requestDoc) => {
            const request =
              requestDoc.data();

            if (
              request.status ===
                "approved" &&
              request.tripId
            ) {
              approvedMembersMap.set(
                request.tripId,
                {
                  name:
                    request.requester ||
                    request.requesterName ||
                    request.userName ||
                    request.name ||
                    "",
                  image:
                    request.requesterImage ||
                    request.userImage ||
                    "",
                }
              );
            }
          }
        );

        /* =====================================================
           ONE MAP FOR ALL USER RIDES
           
           IMPORTANT:
           One trip ID = one My Rides entry.
        ===================================================== */

        const userRides =
          new Map<string, Ride>();

        /* =====================================================
           HOSTED TRIPS
        ===================================================== */

        tripsSnapshot.forEach(
          (tripDoc) => {
            const trip =
              tripDoc.data();

            if (
              trip.userName !==
              activeUserName
            ) {
              return;
            }

            const approvedMember =
              approvedMembersMap.get(
                tripDoc.id
              );

            const ride: Ride = {
              id: tripDoc.id,
              ...trip,

              role: "Host",

              canEdit:
                !isAdminView,

              acceptedMember:
                approvedMember?.name ||
                "",

              acceptedMemberImage:
                approvedMember?.image ||
                "",
            };

            /*
             * Store by actual Firestore trip ID.
             */

            userRides.set(
              tripDoc.id,
              ride
            );
          }
        );

        /* =====================================================
           JOINED / APPROVED RIDER TRIPS
        ===================================================== */

        requestsSnapshot.forEach(
          (requestDoc) => {
            const request =
              requestDoc.data();

            /*
             * Only approved requests
             * belonging to active user.
             */

            if (
              request.requester !==
                activeUserName ||
              request.status !==
                "approved"
            ) {
              return;
            }

            const tripId =
              request.tripId;

            if (!tripId) {
              return;
            }

            const actualTrip =
              tripsMap.get(
                tripId
              );

            /*
             * Actual trip exists.
             */

            if (actualTrip) {
              /*
               * If the user is already the host,
               * keep the host record.
               */
              if (
                actualTrip.userName ===
                activeUserName
              ) {
                return;
              }

              const joinedTrip: Ride = {
                ...actualTrip,

                id:
                  actualTrip.id,

                role:
                  "Rider",

                canEdit:
                  false,

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

                acceptedMember:
                  actualTrip.userName ||
                  request.tripOwner ||
                  "",

                acceptedMemberImage:
                  actualTrip.userImage ||
                  request.tripOwnerImage ||
                  "",
              };

              /*
               * IMPORTANT:
               * Only add if this trip ID has not
               * already been added.
               */

              if (
                !userRides.has(
                  tripId
                )
              ) {
                userRides.set(
                  tripId,
                  joinedTrip
                );
              }

              return;
            }

            /* =================================================
               FALLBACK WHEN TRIP DOCUMENT IS MISSING
            ================================================= */

            const fallbackRide: Ride = {
              id:
                tripId,

              destination:
                request.destination ||
                "RideMate Trip",

              userName:
                request.tripOwner ||
                "",

              role:
                "Rider",

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

              canEdit:
                false,

              tripOwner:
                request.tripOwner ||
                "",

              tripOwnerImage:
                request.tripOwnerImage ||
                "",

              acceptedMember:
                request.tripOwner ||
                "",

              acceptedMemberImage:
                request.tripOwnerImage ||
                "",
            };

            if (
              !userRides.has(
                tripId
              )
            ) {
              userRides.set(
                tripId,
                fallbackRide
              );
            }
          }
        );

        /* =====================================================
           CLASSIFY RIDES
           
           CRITICAL:
           ONLY status === "completed"
           means History.
           
           The trip date is NOT used to mark
           a trip as completed.
        ===================================================== */

        const upcoming: Ride[] = [];
        const history: Ride[] = [];

        userRides.forEach(
          (ride) => {
            if (
              ride.status ===
              "completed"
            ) {
              history.push(
                ride
              );
            } else {
              upcoming.push(
                ride
              );
            }
          }
        );

        /* =====================================================
           SORT
           
           Upcoming:
           earliest trip first.
           
           History:
           newest trip first.
        ===================================================== */

        const getTime =
          (value: any) => {
            if (!value) {
              return 0;
            }

            try {
              if (
                typeof value ===
                  "object" &&
                typeof value.toDate ===
                  "function"
              ) {
                return value
                  .toDate()
                  .getTime();
              }

              if (
                typeof value ===
                  "object" &&
                value.seconds !==
                  undefined
              ) {
                return (
                  Number(
                    value.seconds
                  ) * 1000
                );
              }

              const date =
                new Date(
                  value
                );

              return isNaN(
                date.getTime()
              )
                ? 0
                : date.getTime();
            } catch {
              return 0;
            }
          };

        upcoming.sort(
          (a, b) =>
            getTime(
              a.tripDate
            ) -
            getTime(
              b.tripDate
            )
        );

        history.sort(
          (a, b) =>
            getTime(
              b.completionVerifiedAt ||
                b.tripDate ||
                b.createdAt
            ) -
            getTime(
              a.completionVerifiedAt ||
                a.tripDate ||
                a.createdAt
            )
        );

        console.log(
          "Upcoming rides:",
          upcoming
        );

        console.log(
          "Ride history:",
          history
        );

        setUpcomingRides(
          upcoming
        );

        setRideHistory(
          history
        );
      } catch (error) {
        console.error(
          "Failed to load rides:",
          error
        );

        setUpcomingRides([]);
        setRideHistory([]);
      } finally {
        setLoading(false);
      }
    };

    void loadRides();
  }, [isAdminView]);

  /* =========================================================
     EDIT RIDE
  ========================================================= */

  const editRide = (
    tripId: string
  ) => {
    if (isAdminView) {
      alert(
        "Admin View Mode is read-only.\n\nYou cannot edit this ride while investigating a user account."
      );

      return;
    }

    router.push(
      `/create-trip?edit=${encodeURIComponent(
        tripId
      )}`
    );
  };

  /* =========================================================
     TOGGLE EXPANSION
  ========================================================= */

  const toggleRide = (
    rideKey: string
  ) => {
    setExpandedRide(
      (current) =>
        current === rideKey
          ? null
          : rideKey
    );
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatTripDate = (
    value: any
  ) => {
    if (!value) {
      return "Date not available";
    }

    try {
      let date: Date;

      if (
        typeof value ===
          "object" &&
        typeof value.toDate ===
          "function"
      ) {
        date =
          value.toDate();
      } else if (
        typeof value ===
          "object" &&
        value.seconds !==
          undefined
      ) {
        date = new Date(
          Number(
            value.seconds
          ) * 1000
        );
      } else {
        date =
          new Date(
            value
          );
      }

      if (
        isNaN(
          date.getTime()
        )
      ) {
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

  /* =========================================================
     GET OTHER PERSON
  ========================================================= */

  const getOtherMemberName = (
    trip: Ride
  ) => {
    if (
      trip.role ===
        "Rider" &&
      trip.tripOwner
    ) {
      return trip.tripOwner;
    }

    if (
      trip.acceptedMember
    ) {
      return trip.acceptedMember;
    }

    if (
      trip.memberName
    ) {
      return trip.memberName;
    }

    if (
      trip.joinedUser
    ) {
      return trip.joinedUser;
    }

    if (
      trip.riderName
    ) {
      return trip.riderName;
    }

    if (
      trip.acceptedRider
    ) {
      return trip.acceptedRider;
    }

    return null;
  };

  /* =========================================================
     GET OTHER PERSON IMAGE
  ========================================================= */

  const getOtherMemberImage = (
    trip: Ride
  ) => {
    if (
      trip.role ===
      "Rider"
    ) {
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

  /* =========================================================
     TRIP CARD
  ========================================================= */

  const TripCard = ({
    trip,
    history = false,
  }: {
    trip: Ride;
    history?: boolean;
  }) => {
    const rideKey =
      `${
        history
          ? "history"
          : "upcoming"
      }-${trip.id}`;

    const isExpanded =
      expandedRide ===
      rideKey;

    const otherMember =
      getOtherMemberName(
        trip
      );

    const otherMemberImage =
      getOtherMemberImage(
        trip
      );

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
        {/* COLLAPSED CARD */}

        <div
          onClick={() =>
            toggleRide(
              rideKey
            )
          }
          className="
            p-4
            sm:p-5
            cursor-pointer
          "
        >
          <div className="flex items-center gap-4">

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
                  {trip.role ===
                  "Host"
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
                    🏍️{" "}
                    {trip.bike}
                  </span>
                )}

              </div>

            </div>

          </div>
        </div>

        {/* EXPANDED */}

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

              {/* PERSON YOU RODE WITH */}

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
                      : trip.role ===
                        "Host"
                        ? "Accepted Rider"
                        : "Ride Hosted By"}
                  </p>

                  <div className="flex items-center gap-3 mt-2">

                    {otherMemberImage && (
                      <img
                        src={
                          otherMemberImage
                        }
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

              {/* TRIP DETAILS */}

              <div
                className="
                  grid
                  grid-cols-2
                  sm:grid-cols-3
                  gap-2
                "
              >

                {trip.startLocation && (
                  <div className="bg-black border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">
                      Starting From
                    </span>

                    <p className="font-bold text-sm mt-1">
                      📍{" "}
                      {trip.startLocation}
                    </p>
                  </div>
                )}

                {trip.distance && (
                  <div className="bg-black border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">
                      Distance
                    </span>

                    <p className="font-bold text-sm mt-1">
                      🛣️{" "}
                      {trip.distance}
                    </p>
                  </div>
                )}

                {trip.tripDate && (
                  <div className="bg-black border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">
                      Departure
                    </span>

                    <p className="font-bold text-xs mt-1">
                      🗓️{" "}
                      {formatTripDate(
                        trip.tripDate
                      )}
                    </p>
                  </div>
                )}

                {trip.bike && (
                  <div className="bg-black border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">
                      Bike
                    </span>

                    <p className="font-bold text-sm mt-1">
                      🏍️{" "}
                      {trip.bike}
                    </p>
                  </div>
                )}

                {trip.tripPrice !==
                  undefined &&
                  trip.tripPrice !==
                    "" && (
                    <div className="bg-black border border-zinc-800 rounded-xl p-3">
                      <span className="text-zinc-500 text-[10px] uppercase font-black">
                        Contribution
                      </span>

                      <p className="font-bold text-sm mt-1">
                        ₹
                        {
                          trip.tripPrice
                        }
                      </p>
                    </div>
                  )}

                {trip.rideType && (
                  <div className="bg-black border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">
                      Ride Type
                    </span>

                    <p className="font-bold text-sm mt-1">
                      {trip.rideType ===
                      "group"
                        ? "👥 Group Ride"
                        : "👤 Individual Ride"}
                    </p>
                  </div>
                )}

              </div>

              {/* RIDE STORY */}

              {(trip.story ||
                trip.rideStory ||
                trip.description) && (
                <div className="mt-3 bg-black border border-zinc-800 rounded-xl p-3">
                  <span className="text-zinc-500 text-[10px] uppercase font-black">
                    Ride Story
                  </span>

                  <p className="text-zinc-300 text-sm mt-1 leading-relaxed">
                    {trip.story ||
                      trip.rideStory ||
                      trip.description}
                  </p>
                </div>
              )}

              {/* HISTORY STATUS */}

              {history && (
                <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 font-black text-sm">
                    ✓ Completed Ride
                  </p>
                </div>
              )}

              {/* ADMIN NOTICE */}

              {isAdminView &&
                trip.role ===
                  "Host" &&
                !history && (
                  <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-orange-400 font-bold text-sm">
                      🔒 Investigation Mode —
                      Ride editing disabled
                    </p>
                  </div>
                )}

              {/* EDIT */}

              {trip.canEdit ===
                true &&
                !history &&
                !isAdminView && (
                  <button
                    onClick={(
                      event
                    ) => {
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

  /* =========================================================
     LOADING
  ========================================================= */

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

  /* =========================================================
     PAGE
  ========================================================= */

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

        {isAdminView && (
          <div
            className="
              mb-6
              bg-orange-600
              text-black
              rounded-2xl
              px-4
              py-3
              text-center
              font-black
              text-sm
              sm:text-base
            "
          >
            🛡️ INVESTIGATION MODE — Viewing{" "}
            {adminView?.userName ||
              currentUserName ||
              "User"}'s Rides

            <span className="ml-2 opacity-70">
              (Read Only)
            </span>
          </div>
        )}

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
              setActiveTab(
                "upcoming"
              );

              setExpandedRide(
                null
              );
            }}
            className={`
              px-5
              sm:px-6
              py-3
              rounded-2xl
              font-black
              transition
              ${
                activeTab ===
                "upcoming"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }
            `}
          >
            Upcoming
          </button>

          <button
            onClick={() => {
              setActiveTab(
                "history"
              );

              setExpandedRide(
                null
              );
            }}
            className={`
              px-5
              sm:px-6
              py-3
              rounded-2xl
              font-black
              transition
              ${
                activeTab ===
                "history"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }
            `}
          >
            History
          </button>

        </div>

        {/* UPCOMING */}

        {activeTab ===
          "upcoming" && (
          <div className="space-y-4">

            {upcomingRides.length ===
            0 ? (
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
                  {isAdminView
                    ? "This user has no upcoming rides."
                    : "Your upcoming rides will appear here."}
                </p>
              </div>
            ) : (
              upcomingRides.map(
                (trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    history={false}
                  />
                )
              )
            )}

          </div>
        )}

        {/* HISTORY */}

        {activeTab ===
          "history" && (
          <div className="space-y-4">

            {rideHistory.length ===
            0 ? (
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
                  {isAdminView
                    ? "This user has no completed rides."
                    : "Your completed rides will appear here."}
                </p>
              </div>
            ) : (
              rideHistory.map(
                (trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    history={true}
                  />
                )
              )
            )}

          </div>
        )}

      </div>
    </main>
  );
}