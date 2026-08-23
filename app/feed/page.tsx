"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Rocket,
  MapPin,
  Bike,
  CalendarDays,
  Route,
  IndianRupee,
  Users,
  UserRound,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
} from "lucide-react";

function FeedContent() {
  const searchParams = useSearchParams();

  /* =========================================================
     URL PARAMETERS
  ========================================================= */

  const sharedTripId = searchParams.get("trip");

  const requestedStartLocation = (
    searchParams.get("startLocation") ||
    searchParams.get("start") ||
    searchParams.get("from") ||
    ""
  ).trim();

  const requestedCity = (
    searchParams.get("city") ||
    searchParams.get("startCity") ||
    ""
  ).trim();

  const requestedDestination = (
    searchParams.get("destination") ||
    searchParams.get("to") ||
    ""
  ).trim();

  const hasUrlSearchFilter = Boolean(
    requestedStartLocation ||
      requestedCity ||
      requestedDestination
  );

  /* =========================================================
     STATE
  ========================================================= */

  const [allTrips, setAllTrips] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  /* =========================================================
     FILTER STATE
  ========================================================= */

  const [showFilters, setShowFilters] = useState(false);

  const [startFilter, setStartFilter] = useState(
    requestedStartLocation
  );

  const [destinationFilter, setDestinationFilter] =
    useState(requestedDestination);

  const [dateFilter, setDateFilter] = useState("");

  const [filterFallbackNotice, setFilterFallbackNotice] =
    useState(false);

  /* =========================================================
     NORMALIZE LOCATION
  ========================================================= */

  const normalizeLocation = (value: any) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  /* =========================================================
     LOAD TRIPS
  ========================================================= */

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);

        const q = query(
          collection(db, "trips"),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        const loadedTrips: any[] = [];

        querySnapshot.forEach((tripDoc) => {
          loadedTrips.push({
            id: tripDoc.id,
            ...tripDoc.data(),
          });
        });

        /* =====================================================
           REMOVE DUPLICATES
        ===================================================== */

        const uniqueTrips = loadedTrips.filter(
          (trip, index, self) =>
            index ===
            self.findIndex((t) => t.id === trip.id)
        );

        setAllTrips(uniqueTrips);

        /* =====================================================
           APPLY INITIAL URL FILTER
        ===================================================== */

        const normalizedRequestedStart =
          normalizeLocation(requestedStartLocation);

        const normalizedRequestedCity =
          normalizeLocation(requestedCity);

        const normalizedRequestedDestination =
          normalizeLocation(requestedDestination);

        let filteredTrips = uniqueTrips;

        if (
          normalizedRequestedStart ||
          normalizedRequestedCity ||
          normalizedRequestedDestination
        ) {
          /* ===================================================
             CITY + DESTINATION MATCHING
          =================================================== */

          const cityDestinationTrips =
            uniqueTrips.filter((trip) => {
              const tripCity = normalizeLocation(
                trip.startCity || trip.city || ""
              );

              const tripDestination =
                normalizeLocation(
                  trip.destination
                );

              const destinationMatches =
                normalizedRequestedDestination
                  ? tripDestination.includes(
                      normalizedRequestedDestination
                    )
                  : true;

              const cityMatches =
                normalizedRequestedCity
                  ? tripCity.includes(
                      normalizedRequestedCity
                    )
                  : true;

              return (
                cityMatches &&
                destinationMatches
              );
            });

          /* ===================================================
             EXACT START LOCATION FIRST
          =================================================== */

          if (normalizedRequestedStart) {
            const exactStartTrips =
              cityDestinationTrips.filter(
                (trip) => {
                  const tripStart =
                    normalizeLocation(
                      trip.startLocation
                    );

                  return (
                    tripStart ===
                    normalizedRequestedStart
                  );
                }
              );

            if (exactStartTrips.length > 0) {
              const exactStartIds =
                new Set(
                  exactStartTrips.map(
                    (trip) => trip.id
                  )
                );

              const fallbackCityTrips =
                cityDestinationTrips.filter(
                  (trip) =>
                    !exactStartIds.has(
                      trip.id
                    )
                );

              filteredTrips = [
                ...exactStartTrips,
                ...fallbackCityTrips,
              ];

              setFilterFallbackNotice(false);
            } else {
              /*
               * Exact starting location does not exist.
               * Fall back to city + destination rides.
               */
              filteredTrips =
                cityDestinationTrips;

              setFilterFallbackNotice(
                Boolean(
                  normalizedRequestedCity &&
                    normalizedRequestedDestination
                )
              );
            }
          } else {
            filteredTrips =
              cityDestinationTrips;

            setFilterFallbackNotice(false);
          }
        }

        /* =====================================================
           SHARED TRIP
        ===================================================== */

        if (sharedTripId) {
          const sharedTrip =
            uniqueTrips.find(
              (trip) =>
                trip.id === sharedTripId
            );

          if (sharedTrip) {
            const otherTrips =
              filteredTrips.filter(
                (trip) =>
                  trip.id !== sharedTripId
              );

            const finalTrips = [
              sharedTrip,
              ...otherTrips,
            ];

            setTrips(finalTrips);
            setExpandedTrip(sharedTrip.id);
          } else {
            setTrips(filteredTrips);
          }
        } else {
          setTrips(filteredTrips);
        }
      } catch (error) {
        console.error(
          "Failed to load trips:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [
    sharedTripId,
    requestedStartLocation,
    requestedCity,
    requestedDestination,
  ]);

  /* =========================================================
     SYNCHRONIZE URL FILTER VALUES
  ========================================================= */

  useEffect(() => {
    setStartFilter(
      requestedStartLocation
    );

    setDestinationFilter(
      requestedDestination
    );
  }, [
    requestedStartLocation,
    requestedDestination,
  ]);

  /* =========================================================
     APPLY VISIBLE FILTERS
  ========================================================= */

  useEffect(() => {
    if (loading) return;

    let filtered = [...allTrips];

    const normalizedStart =
      normalizeLocation(startFilter);

    const normalizedDestination =
      normalizeLocation(
        destinationFilter
      );

    /* =======================================================
       START LOCATION FILTER
    ======================================================= */

    if (normalizedStart) {
      const exactStartTrips =
        filtered.filter((trip) => {
          const tripStart =
            normalizeLocation(
              trip.startLocation
            );

          return (
            tripStart === normalizedStart
          );
        });

      if (exactStartTrips.length > 0) {
        filtered = exactStartTrips;
        setFilterFallbackNotice(false);
      } else {
        /*
         * If exact location doesn't exist,
         * try partial start/city matching.
         */

        const partialStartTrips =
          filtered.filter((trip) => {
            const tripStart =
              normalizeLocation(
                trip.startLocation
              );

            const tripCity =
              normalizeLocation(
                trip.startCity ||
                  trip.city ||
                  ""
              );

            return (
              tripStart.includes(
                normalizedStart
              ) ||
              tripCity.includes(
                normalizedStart
              )
            );
          });

        filtered = partialStartTrips;

        setFilterFallbackNotice(
          partialStartTrips.length > 0
        );
      }
    }

    /* =======================================================
       DESTINATION FILTER
    ======================================================= */

    if (normalizedDestination) {
      filtered = filtered.filter(
        (trip) => {
          const tripDestination =
            normalizeLocation(
              trip.destination
            );

          return tripDestination.includes(
            normalizedDestination
          );
        }
      );
    }

    /* =======================================================
       DEPARTURE DATE FILTER
    ======================================================= */

    if (dateFilter) {
      filtered = filtered.filter(
        (trip) => {
          if (!trip.tripDate) {
            return false;
          }

          const tripDate =
            new Date(trip.tripDate);

          if (isNaN(tripDate.getTime())) {
            return false;
          }

          const year =
            tripDate.getFullYear();

          const month = String(
            tripDate.getMonth() + 1
          ).padStart(2, "0");

          const day = String(
            tripDate.getDate()
          ).padStart(2, "0");

          const formattedDate =
            `${year}-${month}-${day}`;

          return (
            formattedDate ===
            dateFilter
          );
        }
      );
    }

    /* =======================================================
       SHARED TRIP
    ======================================================= */

    if (sharedTripId) {
      const sharedTrip =
        allTrips.find(
          (trip) =>
            trip.id === sharedTripId
        );

      if (sharedTrip) {
        const otherTrips =
          filtered.filter(
            (trip) =>
              trip.id !== sharedTripId
          );

        setTrips([
          sharedTrip,
          ...otherTrips,
        ]);

        return;
      }
    }

    setTrips(filtered);
  }, [
    allTrips,
    startFilter,
    destinationFilter,
    dateFilter,
    sharedTripId,
    loading,
  ]);

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setStartFilter("");
    setDestinationFilter("");
    setDateFilter("");
    setFilterFallbackNotice(false);
  };

  const hasActiveFilters =
    Boolean(
      startFilter ||
        destinationFilter ||
        dateFilter
    );

  /* =========================================================
     FILTERED RESULT COUNT
  ========================================================= */

  const resultText = useMemo(() => {
    if (!hasActiveFilters) {
      return `${trips.length} ${
        trips.length === 1
          ? "ride"
          : "rides"
      } available`;
    }

    return `${trips.length} matching ${
      trips.length === 1
        ? "ride"
        : "rides"
    }`;
  }, [
    trips.length,
    hasActiveFilters,
  ]);

  /* =========================================================
     LOAD SAVED TRIPS
  ========================================================= */

  useEffect(() => {
    const loadSavedTrips = async () => {
      try {
        const user = JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

        if (!user.name) return;

        const snapshot = await getDocs(
          collection(db, "savedTrips")
        );

        const saved: string[] = [];

        snapshot.forEach((docSnap) => {
          const data =
            docSnap.data();

          if (
            data.user === user.name
          ) {
            saved.push(data.tripId);
          }
        });

        setSavedTrips(saved);
      } catch (error) {
        console.error(
          "Failed to load saved trips:",
          error
        );
      }
    };

    loadSavedTrips();
  }, []);

  /* =========================================================
     EXPAND / COLLAPSE
  ========================================================= */

  const toggleExpanded = (
    tripId: string
  ) => {
    setExpandedTrip((current) =>
      current === tripId
        ? null
        : tripId
    );
  };

  /* =========================================================
     SAVE / UNSAVE
  ========================================================= */

  const toggleSaveTrip = async (
    tripId: string
  ) => {
    try {
      const user = JSON.parse(
        localStorage.getItem(
          "ridemateUser"
        ) || "{}"
      );

      if (!user.name) {
        alert("Please login first.");
        return;
      }

      const saveId = `${user.name}_${tripId}`;

      if (
        savedTrips.includes(tripId)
      ) {
        await deleteDoc(
          doc(
            db,
            "savedTrips",
            saveId
          )
        );

        setSavedTrips((prev) =>
          prev.filter(
            (id) => id !== tripId
          )
        );
      } else {
        await setDoc(
          doc(
            db,
            "savedTrips",
            saveId
          ),
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
    } catch (error) {
      console.error(
        "Save error:",
        error
      );
    }
  };

  /* =========================================================
     LIKE
  ========================================================= */

  const likeTrip = async (
    id: string,
    currentLikes: number
  ) => {
    try {
      const tripRef = doc(
        db,
        "trips",
        id
      );

      const newLikeCount =
        currentLikes + 1;

      await updateDoc(tripRef, {
        likes: newLikeCount,
      });

      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      const trip = trips.find(
        (t) => t.id === id
      );

      if (
        trip &&
        trip.userName &&
        trip.userName !==
          currentUser.name &&
        currentUser.name
      ) {
        await addDoc(
          collection(
            db,
            "notifications"
          ),
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
                likes:
                  newLikeCount,
              }
            : trip
        )
      );

      setAllTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === id
            ? {
                ...trip,
                likes:
                  newLikeCount,
              }
            : trip
        )
      );
    } catch (error) {
      console.error(
        "Like error:",
        error
      );
    }
  };

  /* =========================================================
     ADD COMMENT
  ========================================================= */

  const addComment = async (
    tripId: string,
    commentText: string
  ) => {
    if (!commentText.trim()) return;

    try {
      const tripRef = doc(
        db,
        "trips",
        tripId
      );

      const user = JSON.parse(
        localStorage.getItem(
          "ridemateUser"
        ) || "{}"
      );

      if (!user.name) {
        alert("Please login first.");
        return;
      }

      const newComment = {
        user: user.name,
        image: user.image || "",
        text: commentText.trim(),
      };

      await updateDoc(tripRef, {
        comments: arrayUnion(
          newComment
        ),
      });

      const trip = trips.find(
        (t) => t.id === tripId
      );

      if (
        trip &&
        trip.userName &&
        trip.userName !== user.name
      ) {
        await addDoc(
          collection(
            db,
            "notifications"
          ),
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
                  ...(trip.comments ||
                    []),
                  newComment,
                ],
              }
            : trip
        )
      );

      setAllTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                comments: [
                  ...(trip.comments ||
                    []),
                  newComment,
                ],
              }
            : trip
        )
      );
    } catch (error) {
      console.error(
        "Comment error:",
        error
      );
    }
  };

  /* =========================================================
     REQUEST TO JOIN
  ========================================================= */

  const requestToJoin = async (
    trip: any
  ) => {
    try {
      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (!currentUser.name) {
        alert("Please login first.");
        return;
      }

      if (
        currentUser.name ===
        trip.userName
      ) {
        alert(
          "You cannot join your own ride."
        );
        return;
      }

      /* =====================================================
         CHECK EXISTING REQUEST
      ===================================================== */

      const existingRequests =
        await getDocs(
          collection(
            db,
            "rideRequests"
          )
        );

      let alreadyRequested = false;

      existingRequests.forEach(
        (requestDoc) => {
          const request =
            requestDoc.data();

          if (
            request.tripId ===
              trip.id &&
            request.requester ===
              currentUser.name &&
            request.status ===
              "pending"
          ) {
            alreadyRequested = true;
          }
        }
      );

      if (alreadyRequested) {
        alert(
          "Request already sent 🚀"
        );
        return;
      }

      /* =====================================================
         CREATE RIDE REQUEST
      ===================================================== */

      await addDoc(
        collection(
          db,
          "rideRequests"
        ),
        {
          tripId: trip.id,

          tripOwner:
            trip.userName,

          requester:
            currentUser.name,

          requesterImage:
            currentUser.image || "",

          destination:
            trip.destination || "",

          startLocation:
            trip.startLocation || "",

          startCity:
            trip.startCity ||
            trip.city ||
            "",

          distance:
            trip.distance || "",

          bike:
            trip.bike || "",

          tripDate:
            trip.tripDate || "",

          tripPrice:
            trip.tripPrice || "",

          rideType:
            trip.rideType ||
            "individual",

          createdAt:
            Date.now(),

          status:
            "pending",
        }
      );

      /* =====================================================
         NOTIFICATION
      ===================================================== */

      await addDoc(
        collection(
          db,
          "notifications"
        ),
        {
          user: trip.userName,

          text:
            trip.rideType === "group"
              ? `${currentUser.name} wants to join your group ride 🏍️`
              : `${currentUser.name} wants to join as your pillion 🪖`,

          createdAt:
            Date.now(),

          read: false,
        }
      );

      alert(
        "Ride request sent 🚀"
      );
    } catch (error) {
      console.error(
        "Join ride error:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    }
  };

  /* =========================================================
     COMMENTS TOGGLE
  ========================================================= */

  const toggleComments = (
    tripId: string
  ) => {
    setOpenComments((prev) =>
      prev.includes(tripId)
        ? prev.filter(
            (id) => id !== tripId
          )
        : [
            ...prev,
            tripId,
          ]
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main
        className="
          fixed
          inset-0
          top-16
          bg-black
          text-white
          flex
          items-center
          justify-center
        "
      >
        <div className="text-center">
          <div className="text-5xl mb-4">
            🏍️
          </div>

          <p className="text-zinc-400">
            Loading rides...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main
      className="
        fixed
        inset-0
        top-16
        bg-black
        text-white
        overflow-y-auto
        overflow-x-hidden
      "
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="
          fixed
          inset-0
          pointer-events-none
          bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,0.10),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.04),transparent_30%)]
        "
      />

      <div
        className="
          relative
          z-10
          w-full
          min-h-full
          pt-2
          md:pt-4
          pb-10
        "
      >
        {/* =================================================
            FILTER HEADER
        ================================================= */}

        <div
          className="
            px-3
            sm:px-4
            md:px-6
            mb-4
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-orange-500/30
              bg-white/[0.035]
              backdrop-blur-xl
              overflow-hidden
            "
          >
            {/* FILTER TITLE */}

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (prev) => !prev
                )
              }
              className="
                w-full
                flex
                items-center
                justify-between
                px-4
                py-3
                text-left
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    w-8
                    h-8
                    rounded-lg
                    bg-orange-500/10
                    border
                    border-orange-500/20
                    flex
                    items-center
                    justify-center
                  "
                >
                  <SlidersHorizontal
                    size={16}
                    className="text-orange-400"
                  />
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.15em]
                      text-white
                    "
                  >
                    Filter Trips
                  </p>

                  <p
                    className="
                      text-[10px]
                      text-zinc-500
                      mt-0.5
                    "
                  >
                    Find a ride that matches
                    your route
                  </p>
                </div>
              </div>

              {showFilters ? (
                <ChevronUp
                  size={18}
                  className="text-zinc-400"
                />
              ) : (
                <ChevronDown
                  size={18}
                  className="text-zinc-400"
                />
              )}
            </button>

            {/* FILTER BODY */}

            {showFilters && (
              <div
                className="
                  border-t
                  border-white/10
                  p-3
                  sm:p-4
                "
              >
                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-3
                    gap-3
                  "
                >
                  {/* START LOCATION */}

                  <div>
                    <label
                      className="
                        block
                        text-[10px]
                        uppercase
                        tracking-wider
                        text-zinc-500
                        font-bold
                        mb-1.5
                      "
                    >
                      Starting Location
                    </label>

                    <div
                      className="
                        relative
                      "
                    >
                      <MapPin
                        size={16}
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-orange-400
                        "
                      />

                      <input
                        type="text"
                        value={startFilter}
                        onChange={(e) =>
                          setStartFilter(
                            e.target.value
                          )
                        }
                        placeholder="e.g. HSR Layout"
                        className="
                          w-full
                          h-11
                          pl-10
                          pr-3
                          rounded-xl
                          bg-black/60
                          border
                          border-white/10
                          text-white
                          text-sm
                          outline-none
                          placeholder:text-zinc-700
                          focus:border-orange-500
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* DESTINATION */}

                  <div>
                    <label
                      className="
                        block
                        text-[10px]
                        uppercase
                        tracking-wider
                        text-zinc-500
                        font-bold
                        mb-1.5
                      "
                    >
                      Destination
                    </label>

                    <div
                      className="
                        relative
                      "
                    >
                      <Route
                        size={16}
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-orange-400
                        "
                      />

                      <input
                        type="text"
                        value={
                          destinationFilter
                        }
                        onChange={(e) =>
                          setDestinationFilter(
                            e.target.value
                          )
                        }
                        placeholder="e.g. Kolli Hills"
                        className="
                          w-full
                          h-11
                          pl-10
                          pr-3
                          rounded-xl
                          bg-black/60
                          border
                          border-white/10
                          text-white
                          text-sm
                          outline-none
                          placeholder:text-zinc-700
                          focus:border-orange-500
                          transition
                        "
                      />
                    </div>
                  </div>

                  {/* DATE */}

                  <div>
                    <label
                      className="
                        block
                        text-[10px]
                        uppercase
                        tracking-wider
                        text-zinc-500
                        font-bold
                        mb-1.5
                      "
                    >
                      Departure Date
                    </label>

                    <div
                      className="
                        relative
                      "
                    >
                      <CalendarDays
                        size={16}
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-orange-400
                          pointer-events-none
                        "
                      />

                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) =>
                          setDateFilter(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          h-11
                          pl-10
                          pr-3
                          rounded-xl
                          bg-black/60
                          border
                          border-white/10
                          text-white
                          text-sm
                          outline-none
                          focus:border-orange-500
                          transition
                        "
                      />
                    </div>
                  </div>
                </div>

                {/* FILTER FOOTER */}

                <div
                  className="
                    mt-3
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    justify-between
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-zinc-400
                      "
                    >
                      {resultText}
                    </span>

                    {startFilter && (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          bg-orange-500/10
                          border
                          border-orange-500/20
                          text-orange-300
                          text-[10px]
                          font-bold
                        "
                      >
                        From:{" "}
                        {startFilter}
                      </span>
                    )}

                    {destinationFilter && (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          bg-orange-500/10
                          border
                          border-orange-500/20
                          text-orange-300
                          text-[10px]
                          font-bold
                        "
                      >
                        To:{" "}
                        {destinationFilter}
                      </span>
                    )}

                    {dateFilter && (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          bg-orange-500/10
                          border
                          border-orange-500/20
                          text-orange-300
                          text-[10px]
                          font-bold
                        "
                      >
                        Date:{" "}
                        {new Date(
                          `${dateFilter}T00:00:00`
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={
                        clearFilters
                      }
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        h-10
                        px-4
                        rounded-xl
                        border
                        border-red-500/30
                        bg-red-500/10
                        text-red-300
                        text-xs
                        font-bold
                        hover:bg-red-500/20
                        transition
                      "
                    >
                      <X size={15} />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* FALLBACK NOTICE */}

                {filterFallbackNotice && (
                  <div
                    className="
                      mt-3
                      rounded-xl
                      border
                      border-yellow-500/20
                      bg-yellow-500/5
                      px-3
                      py-2.5
                      text-xs
                      text-yellow-300
                    "
                  >
                    Exact starting location
                    unavailable — showing
                    other rides from the
                    matching city to this
                    destination.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            URL SEARCH RESULT INFO
        ================================================= */}

        {hasUrlSearchFilter && (
          <div
            className="
              px-3
              sm:px-4
              md:px-6
              mb-3
              text-xs
              text-zinc-500
            "
          >
            {requestedStartLocation &&
            requestedCity &&
            requestedDestination ? (
              <>
                Showing rides from{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedStartLocation}
                </span>{" "}
                in{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedCity}
                </span>{" "}
                to{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedDestination}
                </span>
              </>
            ) : requestedCity &&
              requestedDestination ? (
              <>
                Showing{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedCity}
                </span>{" "}
                rides to{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedDestination}
                </span>
              </>
            ) : requestedDestination ? (
              <>
                Showing rides to{" "}
                <span className="text-orange-400 font-semibold">
                  {requestedDestination}
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* =================================================
            TRIP LIST
        ================================================= */}

        <div
          className="
            w-full
            space-y-2
            md:space-y-3
          "
        >
          {trips.map((trip) => {
            const isExpanded =
              expandedTrip === trip.id;

            const startCity =
              trip.startCity ||
              trip.city ||
              "";

            const startDisplay =
              trip.startLocation
                ? startCity
                  ? `${trip.startLocation}, ${startCity}`
                  : trip.startLocation
                : "Not specified";

            return (
              <div
                key={trip.id}
                className={`
                  group
                  relative
                  w-full
                  overflow-hidden
                  rounded-2xl
                  border-2
                  border-orange-500/80
                  transition-all
                  duration-500
                  shadow-[0_0_18px_rgba(249,115,22,0.10)]

                  ${
                    isExpanded
                      ? "bg-white/[0.07] shadow-[0_0_28px_rgba(249,115,22,0.18)]"
                      : "bg-white/[0.035] hover:bg-white/[0.055] hover:border-orange-400"
                  }
                `}
              >
                {/* =================================================
                    CINEMATIC LIGHT
                ================================================= */}

                <div
                  className="
                    absolute
                    inset-0
                    pointer-events-none
                    bg-gradient-to-r
                    from-orange-500/[0.08]
                    via-transparent
                    to-white/[0.03]
                    opacity-70
                  "
                />

                {/* =================================================
                    COLLAPSED HEADER
                ================================================= */}

                <button
                  type="button"
                  onClick={() =>
                    toggleExpanded(
                      trip.id
                    )
                  }
                  className="
                    relative
                    z-10
                    w-full
                    min-h-[120px]
                    md:min-h-[150px]
                    text-left
                    flex
                    items-stretch
                  "
                >
                  {/* =================================================
                      LEFT — PROFILE IMAGE
                  ================================================= */}

                  <div
                    className="
                      relative
                      w-[25%]
                      sm:w-[22%]
                      md:w-[20%]
                      lg:w-[18%]
                      flex-shrink-0
                      overflow-hidden
                      bg-zinc-950
                    "
                  >
                    {trip.userImage ? (
                      <img
                        src={
                          trip.userImage
                        }
                        alt={
                          trip.userName ||
                          "Rider"
                        }
                        className="
                          absolute
                          inset-0
                          w-full
                          h-full
                          object-cover
                          object-center
                          select-none
                          transition-transform
                          duration-700
                          group-hover:scale-105
                        "
                      />
                    ) : (
                      <div
                        className="
                          absolute
                          inset-0
                          flex
                          items-center
                          justify-center
                          bg-zinc-900
                          text-4xl
                          md:text-5xl
                        "
                      >
                        👤
                      </div>
                    )}

                    <div
                      className="
                        absolute
                        inset-0
                        border-r
                        border-orange-500/50
                        pointer-events-none
                        z-20
                      "
                    />
                  </div>

                  {/* =================================================
                      CENTER — RIDER + BIKE + DATE
                  ================================================= */}

                  <div
                    className="
                      absolute
                      left-[25%]
                      sm:left-[24%]
                      md:left-[23%]
                      lg:left-[21%]
                      top-1/2
                      -translate-y-1/2
                      w-[38%]
                      sm:w-[38%]
                      md:w-[37%]
                      lg:w-[35%]
                      flex
                      flex-col
                      items-center
                      justify-center
                      text-center
                      gap-1
                      pointer-events-none
                    "
                  >
                    <div
                      className="
                        max-w-full
                        text-[9px]
                        sm:text-[10px]
                        md:text-xs
                        lg:text-sm
                        font-bold
                        uppercase
                        tracking-[0.12em]
                        text-zinc-500
                        truncate
                      "
                    >
                      {trip.userName ||
                        "Rider"}
                    </div>

                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-1.5
                        md:gap-2
                        max-w-full
                        text-orange-400
                      "
                    >
                      <Bike
                        size={15}
                        className="
                          flex-shrink-0
                          md:w-[17px]
                          md:h-[17px]
                        "
                      />

                      <span
                        className="
                          font-black
                          text-xs
                          sm:text-sm
                          md:text-base
                          lg:text-lg
                          truncate
                          max-w-full
                        "
                      >
                        {trip.bike ||
                          "Bike not specified"}
                      </span>
                    </div>

                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-1.5
                        md:gap-2
                        text-zinc-400
                      "
                    >
                      <CalendarDays
                        size={14}
                        className="flex-shrink-0"
                      />

                      <span
                        className="
                          text-[10px]
                          sm:text-xs
                          md:text-sm
                          whitespace-nowrap
                        "
                      >
                        {trip.tripDate
                          ? new Date(
                              trip.tripDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Departure TBA"}
                      </span>
                    </div>
                  </div>

                  {/* =================================================
                      RIGHT — DESTINATION + ARROW
                  ================================================= */}

                  <div
                    className="
                      absolute
                      right-0
                      top-0
                      h-full
                      w-[35%]
                      sm:w-[35%]
                      md:w-[35%]
                      lg:w-[36%]
                      flex
                      flex-col
                      items-center
                      justify-center
                      px-2
                      sm:px-4
                      md:px-6
                    "
                  >
                    <p
                      className="
                        text-[8px]
                        sm:text-[9px]
                        md:text-xs
                        uppercase
                        tracking-[0.25em]
                        text-orange-500
                        mb-1
                      "
                    >
                      Destination
                    </p>

                    <h2
                      className="
                        w-full
                        text-center
                        font-black
                        leading-[0.9]
                        tracking-tight
                        text-white
                        text-base
                        sm:text-xl
                        md:text-3xl
                        lg:text-4xl
                        xl:text-5xl
                        break-words
                        whitespace-normal
                        overflow-wrap-anywhere
                      "
                    >
                      {trip.destination ||
                        "Destination TBA"}
                    </h2>

                    <div
                      className="
                        mt-2
                        w-7
                        h-7
                        sm:w-8
                        sm:h-8
                        rounded-full
                        bg-black/60
                        border
                        border-orange-500/50
                        flex
                        items-center
                        justify-center
                        transition-all
                        duration-300
                        group-hover:border-orange-500
                        group-hover:bg-orange-500/10
                      "
                    >
                      {isExpanded ? (
                        <ChevronUp
                          size={14}
                          className="text-orange-500"
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          className="text-zinc-400"
                        />
                      )}
                    </div>
                  </div>
                </button>

                {/* =================================================
                    EXPANDED CONTENT
                ================================================= */}

                <div
                  className={`
                    relative
                    overflow-hidden
                    transition-all
                    duration-500

                    ${
                      isExpanded
                        ? "max-h-[1600px] opacity-100"
                        : "max-h-0 opacity-0"
                    }
                  `}
                >
                  <div
                    className="
                      border-t
                      border-white/10
                      px-3
                      sm:px-4
                      md:px-6
                      py-5
                    "
                  >
                    {/* =================================================
                        RIDER + RIDE TYPE
                    ================================================= */}

                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-3
                        mb-5
                      "
                    >
                      <Link
                        href={`/rider/${encodeURIComponent(
                          trip.userName ||
                            "Rider"
                        )}`}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className="
                          flex
                          items-center
                          gap-3
                          hover:opacity-80
                          transition
                        "
                      >
                        {trip.userImage ? (
                          <img
                            src={
                              trip.userImage
                            }
                            alt="Rider"
                            className="
                              w-10
                              h-10
                              rounded-full
                              object-cover
                              border
                              border-orange-500
                            "
                          />
                        ) : (
                          <div
                            className="
                              w-10
                              h-10
                              rounded-full
                              bg-zinc-900
                              border
                              border-orange-500
                              flex
                              items-center
                              justify-center
                            "
                          >
                            👤
                          </div>
                        )}

                        <div>
                          <p
                            className="
                              text-[9px]
                              text-zinc-500
                              uppercase
                              tracking-widest
                            "
                          >
                            Ride hosted by
                          </p>

                          <p
                            className="
                              font-bold
                              text-orange-400
                            "
                          >
                            {trip.userName ||
                              "Rider"}
                          </p>
                        </div>
                      </Link>

                      {trip.rideType ===
                      "group" ? (
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-2
                            bg-blue-500/10
                            border
                            border-blue-400/20
                            text-blue-300
                            px-3
                            py-2
                            rounded-full
                            text-xs
                            font-bold
                          "
                        >
                          <Users size={14} />
                          Group Ride
                        </span>
                      ) : (
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-2
                            bg-green-500/10
                            border
                            border-green-400/20
                            text-green-300
                            px-3
                            py-2
                            rounded-full
                            text-xs
                            font-bold
                          "
                        >
                          <UserRound
                            size={14}
                          />
                          Individual Ride
                        </span>
                      )}
                    </div>

                    {/* =================================================
                        DETAILS GRID
                    ================================================= */}

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-4
                        gap-3
                      "
                    >
                      {/* STARTING LOCATION */}

                      <div
                        className="
                          bg-black/40
                          backdrop-blur-xl
                          border
                          border-white/10
                          rounded-xl
                          p-3
                          min-w-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                            text-orange-400
                            mb-1.5
                          "
                        >
                          <MapPin size={14} />

                          <span
                            className="
                              text-[9px]
                              uppercase
                              tracking-wider
                            "
                          >
                            Starting From
                          </span>
                        </div>

                        <p
                          className="
                            font-bold
                            text-xs
                            md:text-sm
                            break-words
                          "
                        >
                          {startDisplay}
                        </p>
                      </div>

                      {/* DISTANCE */}

                      <div
                        className="
                          bg-black/40
                          backdrop-blur-xl
                          border
                          border-white/10
                          rounded-xl
                          p-3
                          min-w-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                            text-orange-400
                            mb-1.5
                          "
                        >
                          <Route size={14} />

                          <span
                            className="
                              text-[9px]
                              uppercase
                              tracking-wider
                            "
                          >
                            Distance
                          </span>
                        </div>

                        <p
                          className="
                            font-bold
                            text-xs
                            md:text-sm
                          "
                        >
                          {trip.distance
                            ? `${trip.distance} KM`
                            : "Not specified"}
                        </p>
                      </div>

                      {/* DEPARTURE */}

                      <div
                        className="
                          bg-black/40
                          backdrop-blur-xl
                          border
                          border-white/10
                          rounded-xl
                          p-3
                          min-w-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                            text-orange-400
                            mb-1.5
                          "
                        >
                          <CalendarDays
                            size={14}
                          />

                          <span
                            className="
                              text-[9px]
                              uppercase
                              tracking-wider
                            "
                          >
                            Departure
                          </span>
                        </div>

                        <p
                          className="
                            font-bold
                            text-xs
                            md:text-sm
                            break-words
                          "
                        >
                          {trip.tripDate
                            ? new Date(
                                trip.tripDate
                              ).toLocaleString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )
                            : "TBA"}
                        </p>
                      </div>

                      {/* PRICE */}

                      <div
                        className="
                          bg-orange-500
                          text-black
                          rounded-xl
                          p-3
                          min-w-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-1.5
                            mb-1.5
                          "
                        >
                          <IndianRupee
                            size={14}
                          />

                          <span
                            className="
                              text-[9px]
                              uppercase
                              tracking-wider
                              font-bold
                            "
                          >
                            Contribution
                          </span>
                        </div>

                        <p
                          className="
                            font-black
                            text-sm
                            md:text-base
                          "
                        >
                          {trip.tripPrice
                            ? `₹${trip.tripPrice}`
                            : "₹0"}
                        </p>
                      </div>
                    </div>

                    {/* =================================================
                        BIKE
                    ================================================= */}

                    <div
                      className="
                        mt-3
                        bg-black/40
                        border
                        border-white/10
                        rounded-xl
                        p-3
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          text-orange-400
                          mb-1
                        "
                      >
                        <Bike size={15} />

                        <span
                          className="
                            text-[9px]
                            uppercase
                            tracking-wider
                          "
                        >
                          Bike
                        </span>
                      </div>

                      <p
                        className="
                          font-bold
                          text-sm
                        "
                      >
                        {trip.bike ||
                          "Bike not specified"}
                      </p>
                    </div>

                    {/* =================================================
                        RIDE STORY
                    ================================================= */}

                    {trip.caption && (
                      <div
                        className="
                          mt-3
                          bg-black/40
                          border
                          border-white/10
                          rounded-xl
                          p-4
                        "
                      >
                        <p
                          className="
                            text-orange-400
                            text-xs
                            font-bold
                            mb-2
                            uppercase
                            tracking-wider
                          "
                        >
                          Ride Story
                        </p>

                        <p
                          className="
                            text-zinc-300
                            text-sm
                            leading-6
                            whitespace-pre-wrap
                          "
                        >
                          {trip.caption}
                        </p>
                      </div>
                    )}

                    {/* =================================================
                        ITINERARY
                    ================================================= */}

                    {trip.itinerary && (
                      <div
                        className="
                          mt-3
                          bg-black/40
                          border
                          border-white/10
                          rounded-xl
                          p-4
                        "
                      >
                        <p
                          className="
                            text-orange-400
                            text-xs
                            font-bold
                            mb-2
                            uppercase
                            tracking-wider
                          "
                        >
                          🗺️ Itinerary
                        </p>

                        <p
                          className="
                            text-zinc-300
                            text-sm
                            leading-6
                            whitespace-pre-wrap
                          "
                        >
                          {trip.itinerary}
                        </p>
                      </div>
                    )}

                    {/* =================================================
                        ACTION BAR
                    ================================================= */}

                    <div
                      className="
                        mt-5
                        flex
                        flex-wrap
                        items-center
                        gap-3
                      "
                    >
                      {/* LIKE */}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          likeTrip(
                            trip.id,
                            trip.likes || 0
                          );
                        }}
                        className="
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          hover:border-red-500/50
                          transition
                        "
                      >
                        <Heart
                          size={18}
                          className="text-white"
                        />

                        <span
                          className="
                            text-sm
                            font-bold
                          "
                        >
                          {trip.likes || 0}
                        </span>
                      </button>

                      {/* COMMENTS */}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          toggleComments(
                            trip.id
                          );
                        }}
                        className="
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          hover:border-orange-500/50
                          transition
                        "
                      >
                        <MessageCircle
                          size={18}
                        />

                        <span
                          className="
                            text-sm
                            font-bold
                          "
                        >
                          {(
                            trip.comments ||
                            []
                          ).length}
                        </span>
                      </button>

                      {/* SAVE */}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          toggleSaveTrip(
                            trip.id
                          );
                        }}
                        className="
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          hover:border-yellow-500/50
                          transition
                        "
                      >
                        <Bookmark
                          size={18}
                          className={
                            savedTrips.includes(
                              trip.id
                            )
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-white"
                          }
                        />

                        <span
                          className="
                            hidden
                            sm:inline
                            text-sm
                            font-bold
                          "
                        >
                          {savedTrips.includes(
                            trip.id
                          )
                            ? "Saved"
                            : "Save"}
                        </span>
                      </button>

                      {/* JOIN */}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          requestToJoin(
                            trip
                          );
                        }}
                        className="
                          ml-auto
                          flex
                          items-center
                          gap-2
                          bg-orange-500
                          hover:bg-orange-400
                          text-black
                          px-5
                          py-3
                          rounded-full
                          font-black
                          shadow-lg
                          shadow-orange-500/20
                          hover:scale-105
                          transition
                        "
                      >
                        <Rocket size={18} />

                        {trip.rideType ===
                        "group"
                          ? "Join Ride"
                          : "Ride Along"}
                      </button>
                    </div>

                    {/* =================================================
                        COMMENTS
                    ================================================= */}

                    {openComments.includes(
                      trip.id
                    ) && (
                      <div
                        className="
                          mt-5
                          bg-black/40
                          border
                          border-white/10
                          rounded-2xl
                          p-4
                        "
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <input
                          type="text"
                          placeholder="Write a comment and press Enter..."
                          className="
                            w-full
                            p-4
                            rounded-xl
                            bg-black
                            border
                            border-zinc-700
                            text-white
                            outline-none
                            focus:border-orange-500
                          "
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter"
                            ) {
                              const value =
                                e.currentTarget
                                  .value;

                              if (
                                value.trim()
                              ) {
                                addComment(
                                  trip.id,
                                  value
                                );

                                e.currentTarget.value =
                                  "";
                              }
                            }
                          }}
                        />

                        <div
                          className="
                            mt-4
                            space-y-2
                            max-h-60
                            overflow-y-auto
                          "
                        >
                          {(
                            trip.comments ||
                            []
                          ).map(
                            (
                              comment: any,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="
                                  bg-black/40
                                  border
                                  border-white/5
                                  rounded-xl
                                  p-3
                                  flex
                                  gap-3
                                "
                              >
                                {comment.image ? (
                                  <img
                                    src={
                                      comment.image
                                    }
                                    alt={
                                      comment.user
                                    }
                                    className="
                                      w-9
                                      h-9
                                      rounded-full
                                      object-cover
                                    "
                                  />
                                ) : (
                                  <div
                                    className="
                                      w-9
                                      h-9
                                      rounded-full
                                      bg-zinc-800
                                      flex
                                      items-center
                                      justify-center
                                    "
                                  >
                                    👤
                                  </div>
                                )}

                                <div>
                                  <p
                                    className="
                                      font-bold
                                      text-sm
                                    "
                                  >
                                    {comment.user}
                                  </p>

                                  <p
                                    className="
                                      text-zinc-400
                                      text-sm
                                      mt-1
                                    "
                                  >
                                    {comment.text}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {trips.length === 0 && (
            <div
              className="
                min-h-[60vh]
                flex
                items-center
                justify-center
                text-center
                px-6
              "
            >
              <div>
                <div
                  className="
                    text-6xl
                    mb-5
                  "
                >
                  🏍️
                </div>

                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  No matching rides
                </h2>

                <p
                  className="
                    text-zinc-400
                    mt-2
                    max-w-md
                    mx-auto
                  "
                >
                  We couldn't find a ride
                  matching your selected
                  filters.
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      px-5
                      py-3
                      rounded-full
                      bg-orange-500
                      text-black
                      font-black
                      hover:bg-orange-400
                      transition
                    "
                  >
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   PAGE WRAPPER
========================================================= */

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <main
          className="
            fixed
            inset-0
            top-16
            bg-black
            text-white
            flex
            items-center
            justify-center
          "
        >
          <div className="text-center">
            <div
              className="
                text-5xl
                mb-4
              "
            >
              🏍️
            </div>

            <p
              className="
                text-zinc-400
              "
            >
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <FeedContent />
    </Suspense>
  );
}