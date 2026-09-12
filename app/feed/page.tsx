"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
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

/* =========================================================
   ADMIN VIEW TYPE
========================================================= */

type AdminView = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  startedAt?: number;
};

/* =========================================================
   FEED CONTENT
========================================================= */

function FeedContent() {
  const searchParams = useSearchParams();

  /* =========================================================
     ADMIN INVESTIGATION MODE
  ========================================================= */

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const [isAdminView, setIsAdminView] =
    useState(false);

  useEffect(() => {
    try {
      const savedAdminView =
        localStorage.getItem(
          "ridemateAdminView"
        );

      if (!savedAdminView) {
        setAdminView(null);
        setIsAdminView(false);
        return;
      }

      const parsedAdminView =
        JSON.parse(savedAdminView);

      if (
        parsedAdminView &&
        parsedAdminView.active &&
        parsedAdminView.userName
      ) {
        setAdminView(parsedAdminView);
        setIsAdminView(true);
      } else {
        setAdminView(null);
        setIsAdminView(false);
      }
    } catch (error) {
      console.error(
        "Failed to load admin view:",
        error
      );

      setAdminView(null);
      setIsAdminView(false);
    }
  }, []);

  /* =========================================================
     BLOCK ADMIN MUTATIONS
  ========================================================= */

  const blockedAdminAction = (
    action: string
  ) => {
    if (!isAdminView) {
      return false;
    }

    alert(
      `Admin View Mode is read-only.\n\nYou cannot ${action} while investigating a user account.`
    );

    return true;
  };

  /* =========================================================
     POSTED DATE
  ========================================================= */

  const formatPostedDate = (
    value: any
  ) => {
    if (!value) return "";

    try {
      let date: Date;

      if (
        typeof value === "object" &&
        typeof value.toDate ===
          "function"
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
        return "";
      }

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );
    } catch {
      return "";
    }
  };

  /* =========================================================
     URL PARAMETERS
  ========================================================= */

  const sharedTripId =
    searchParams.get("trip");

  const requestedStartLocation = (
    searchParams.get(
      "startLocation"
    ) ||
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
    searchParams.get(
      "destination"
    ) ||
    searchParams.get("to") ||
    ""
  ).trim();

  const hasUrlSearchFilter =
    Boolean(
      requestedStartLocation ||
        requestedCity ||
        requestedDestination
    );

  /* =========================================================
     STATE
  ========================================================= */

  const [allTrips, setAllTrips] =
    useState<any[]>([]);

  const [trips, setTrips] =
    useState<any[]>([]);

  const [savedTrips, setSavedTrips] =
    useState<string[]>([]);

  const [openComments, setOpenComments] =
    useState<string[]>([]);

  const [expandedTrip, setExpandedTrip] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  /* =========================================================
     FILTER STATE
  ========================================================= */

  const [showFilters, setShowFilters] =
    useState(false);

  const [startFilter, setStartFilter] =
    useState(
      requestedStartLocation
    );

  const [
    destinationFilter,
    setDestinationFilter,
  ] = useState(
    requestedDestination
  );

  const [dateFilter, setDateFilter] =
    useState("");

  const [
    filterFallbackNotice,
    setFilterFallbackNotice,
  ] = useState(false);

  /* =========================================================
     FEMALE RIDER FILTER
  ========================================================= */

  const [
    currentUserGender,
    setCurrentUserGender,
  ] = useState("");

  const [
    femaleOnly,
    setFemaleOnly,
  ] = useState(false);

  /* =========================================================
     NORMALIZE LOCATION
  ========================================================= */

  const normalizeLocation = (
    value: any
  ) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  /* =========================================================
     LOAD CURRENT USER GENDER
  ========================================================= */

  useEffect(() => {
    const loadCurrentUserGender =
      async () => {
        try {
          /*
           * Do not show the female filter while
           * an admin is investigating another user.
           */
          const savedAdminView =
            localStorage.getItem(
              "ridemateAdminView"
            );

          if (savedAdminView) {
            try {
              const parsedAdminView =
                JSON.parse(
                  savedAdminView
                );

              if (
                parsedAdminView?.active
              ) {
                setCurrentUserGender("");
                setFemaleOnly(false);
                return;
              }
            } catch {
              // Ignore malformed admin view
            }
          }

          const savedUser =
            localStorage.getItem(
              "ridemateUser"
            );

          if (!savedUser) {
            setCurrentUserGender("");
            return;
          }

          const user =
            JSON.parse(savedUser);

          setCurrentUserGender(
            String(
              user.gender || ""
            ).trim()
          );
        } catch (error) {
          console.error(
            "Failed to load current user gender:",
            error
          );

          setCurrentUserGender("");
        }
      };

    loadCurrentUserGender();
  }, []);

  /* =========================================================
     LOAD TRIPS + USER GENDERS
  ========================================================= */

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);

        const q = query(
          collection(db, "trips"),
          orderBy(
            "createdAt",
            "desc"
          )
        );

        const querySnapshot =
          await getDocs(q);

        /* =====================================================
           LOAD USER GENDERS
        ===================================================== */

        const usersSnapshot =
          await getDocs(
            collection(
              db,
              "users"
            )
          );

        const genderMap: Record<
          string,
          string
        > = {};

        usersSnapshot.forEach(
          (userDoc) => {
            const userData =
              userDoc.data();

            const gender =
              String(
                userData.gender || ""
              ).trim();

            if (!gender) {
              return;
            }

            /*
             * Support both name and username
             * because existing RideMate accounts
             * may use either field.
             */

            if (
              userData.name
            ) {
              genderMap[
                String(
                  userData.name
                )
                  .trim()
                  .toLowerCase()
              ] = gender;
            }

            if (
              userData.username
            ) {
              genderMap[
                String(
                  userData.username
                )
                  .trim()
                  .toLowerCase()
              ] = gender;
            }
          }
        );

        const loadedTrips: any[] =
          [];

        querySnapshot.forEach(
          (tripDoc) => {
            const tripData =
              tripDoc.data();

            const hostName =
              String(
                tripData.userName ||
                  ""
              )
                .trim()
                .toLowerCase();

            loadedTrips.push({
              id: tripDoc.id,
              ...tripData,

              /*
               * Add gender only to the local
               * trip object. Firestore is not changed.
               */
              hostGender:
                genderMap[
                  hostName
                ] || "",
            });
          }
        );

        /* =====================================================
           REMOVE DUPLICATES
        ===================================================== */

        const uniqueTrips =
          loadedTrips.filter(
            (
              trip,
              index,
              self
            ) =>
              index ===
              self.findIndex(
                (t) =>
                  t.id === trip.id
              )
          );

        setAllTrips(
          uniqueTrips
        );

        /* =====================================================
           APPLY INITIAL URL FILTER
        ===================================================== */

        const normalizedRequestedStart =
          normalizeLocation(
            requestedStartLocation
          );

        const normalizedRequestedCity =
          normalizeLocation(
            requestedCity
          );

        const normalizedRequestedDestination =
          normalizeLocation(
            requestedDestination
          );

        let filteredTrips =
          uniqueTrips;

        if (
          normalizedRequestedStart ||
          normalizedRequestedCity ||
          normalizedRequestedDestination
        ) {
          /* ===================================================
             CITY + DESTINATION MATCHING
          =================================================== */

          const cityDestinationTrips =
            uniqueTrips.filter(
              (trip) => {
                const tripCity =
                  normalizeLocation(
                    trip.startCity ||
                      trip.city ||
                      ""
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
              }
            );

          /* ===================================================
             EXACT START LOCATION FIRST
          =================================================== */

          if (
            normalizedRequestedStart
          ) {
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

            if (
              exactStartTrips.length >
              0
            ) {
              const exactStartIds =
                new Set(
                  exactStartTrips.map(
                    (trip) =>
                      trip.id
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

              setFilterFallbackNotice(
                false
              );
            } else {
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

            setFilterFallbackNotice(
              false
            );
          }
        }

        /* =====================================================
           SHARED TRIP
        ===================================================== */

        if (sharedTripId) {
          const sharedTrip =
            uniqueTrips.find(
              (trip) =>
                trip.id ===
                sharedTripId
            );

          if (sharedTrip) {
            const otherTrips =
              filteredTrips.filter(
                (trip) =>
                  trip.id !==
                  sharedTripId
              );

            const finalTrips = [
              sharedTrip,
              ...otherTrips,
            ];

            setTrips(
              finalTrips
            );

            setExpandedTrip(
              sharedTrip.id
            );
          } else {
            setTrips(
              filteredTrips
            );
          }
        } else {
          setTrips(
            filteredTrips
          );
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

    let filtered = [
      ...allTrips,
    ];

    /* =======================================================
       FEMALE RIDERS FILTER
    ======================================================= */

    if (
      femaleOnly &&
      currentUserGender ===
        "Female"
    ) {
      filtered =
        filtered.filter(
          (trip) =>
            String(
              trip.hostGender ||
                ""
            )
              .trim()
              .toLowerCase() ===
            "female"
        );
    }

    const normalizedStart =
      normalizeLocation(
        startFilter
      );

    const normalizedDestination =
      normalizeLocation(
        destinationFilter
      );

    /* =======================================================
       START LOCATION FILTER
    ======================================================= */

    if (normalizedStart) {
      const exactStartTrips =
        filtered.filter(
          (trip) => {
            const tripStart =
              normalizeLocation(
                trip.startLocation
              );

            return (
              tripStart ===
              normalizedStart
            );
          }
        );

      if (
        exactStartTrips.length >
        0
      ) {
        filtered =
          exactStartTrips;

        setFilterFallbackNotice(
          false
        );
      } else {
        const partialStartTrips =
          filtered.filter(
            (trip) => {
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
            }
          );

        filtered =
          partialStartTrips;

        setFilterFallbackNotice(
          partialStartTrips.length >
            0
        );
      }
    }

    /* =======================================================
       DESTINATION FILTER
    ======================================================= */

    if (normalizedDestination) {
      filtered =
        filtered.filter(
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
      filtered =
        filtered.filter(
          (trip) => {
            if (!trip.tripDate) {
              return false;
            }

            const tripDate =
              new Date(
                trip.tripDate
              );

            if (
              isNaN(
                tripDate.getTime()
              )
            ) {
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
            trip.id ===
            sharedTripId
        );

      if (sharedTrip) {
        /*
         * When Female Riders is active,
         * do not bypass the female filter
         * for a shared trip.
         */
        if (
          !femaleOnly ||
          currentUserGender !==
            "Female" ||
          String(
            sharedTrip.hostGender ||
              ""
          )
            .trim()
            .toLowerCase() ===
            "female"
        ) {
          const otherTrips =
            filtered.filter(
              (trip) =>
                trip.id !==
                sharedTripId
            );

          setTrips([
            sharedTrip,
            ...otherTrips,
          ]);

          return;
        }
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
    femaleOnly,
    currentUserGender,
  ]);

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setStartFilter("");
    setDestinationFilter("");
    setDateFilter("");
    setFemaleOnly(false);

    setFilterFallbackNotice(
      false
    );
  };

  const hasActiveFilters =
    Boolean(
      startFilter ||
        destinationFilter ||
        dateFilter ||
        femaleOnly
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
    const loadSavedTrips =
      async () => {
        try {
          let userName = "";

          /* ===================================================
             ADMIN INVESTIGATION MODE
          =================================================== */

          const savedAdminView =
            localStorage.getItem(
              "ridemateAdminView"
            );

          if (savedAdminView) {
            try {
              const parsedAdminView =
                JSON.parse(
                  savedAdminView
                );

              if (
                parsedAdminView?.active
              ) {
                userName =
                  parsedAdminView.userName ||
                  "";
              }
            } catch {
              // Ignore malformed admin view
            }
          }

          /* ===================================================
             NORMAL USER
          =================================================== */

          if (!userName) {
            const savedUser =
              localStorage.getItem(
                "ridemateUser"
              );

            if (savedUser) {
              try {
                const user =
                  JSON.parse(
                    savedUser
                  );

                userName =
                  user.name ||
                  user.username ||
                  "";
              } catch {
                userName = "";
              }
            }
          }

          if (!userName) {
            setSavedTrips([]);
            return;
          }

          const snapshot =
            await getDocs(
              collection(
                db,
                "savedTrips"
              )
            );

          const saved: string[] =
            [];

          snapshot.forEach(
            (docSnap) => {
              const data =
                docSnap.data();

              if (
                data.user ===
                userName
              ) {
                if (
                  data.tripId
                ) {
                  saved.push(
                    data.tripId
                  );
                }
              }
            }
          );

          setSavedTrips(saved);
        } catch (error) {
          console.error(
            "Failed to load saved trips:",
            error
          );
        }
      };

    loadSavedTrips();
  }, [isAdminView]);

  /* =========================================================
     EXPAND / COLLAPSE
  ========================================================= */

  const toggleExpanded = (
    tripId: string
  ) => {
    setExpandedTrip(
      (current) =>
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
    if (
      blockedAdminAction(
        "save or unsave rides"
      )
    ) {
      return;
    }

    try {
      const user =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (!user.name) {
        alert(
          "Please login first."
        );
        return;
      }

      const saveId =
        `${user.name}_${tripId}`;

      if (
        savedTrips.includes(
          tripId
        )
      ) {
        await deleteDoc(
          doc(
            db,
            "savedTrips",
            saveId
          )
        );

        setSavedTrips(
          (prev) =>
            prev.filter(
              (id) =>
                id !== tripId
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

        setSavedTrips(
          (prev) => [
            ...prev,
            tripId,
          ]
        );
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
    if (
      blockedAdminAction(
        "like rides"
      )
    ) {
      return;
    }

    try {
      const tripRef =
        doc(
          db,
          "trips",
          id
        );

      const newLikeCount =
        currentLikes + 1;

      await updateDoc(
        tripRef,
        {
          likes:
            newLikeCount,
        }
      );

      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      const trip =
        trips.find(
          (t) =>
            t.id === id
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
            user:
              trip.userName,
            text: `${currentUser.name} liked your trip ❤️`,
            createdAt:
              Date.now(),
            read: false,
          }
        );
      }

      setTrips(
        (prevTrips) =>
          prevTrips.map(
            (trip) =>
              trip.id === id
                ? {
                    ...trip,
                    likes:
                      newLikeCount,
                  }
                : trip
          )
      );

      setAllTrips(
        (prevTrips) =>
          prevTrips.map(
            (trip) =>
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
    if (
      blockedAdminAction(
        "comment on rides"
      )
    ) {
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    try {
      const tripRef =
        doc(
          db,
          "trips",
          tripId
        );

      const user =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (!user.name) {
        alert(
          "Please login first."
        );
        return;
      }

      const newComment = {
        user: user.name,
        image:
          user.image || "",
        text:
          commentText.trim(),
      };

      await updateDoc(
        tripRef,
        {
          comments:
            arrayUnion(
              newComment
            ),
        }
      );

      const trip =
        trips.find(
          (t) =>
            t.id === tripId
        );

      if (
        trip &&
        trip.userName &&
        trip.userName !==
          user.name
      ) {
        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            user:
              trip.userName,
            text: `${user.name} commented on your trip 💬`,
            createdAt:
              Date.now(),
            read: false,
          }
        );
      }

      setTrips(
        (prevTrips) =>
          prevTrips.map(
            (trip) =>
              trip.id ===
              tripId
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

      setAllTrips(
        (prevTrips) =>
          prevTrips.map(
            (trip) =>
              trip.id ===
              tripId
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
    if (
      blockedAdminAction(
        "join rides"
      )
    ) {
      return;
    }

    try {
      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (!currentUser.name) {
        alert(
          "Please login first."
        );
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

      let alreadyRequested =
        false;

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
            alreadyRequested =
              true;
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
          tripId:
            trip.id,

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
          user:
            trip.userName,

          text:
            trip.rideType ===
            "group"
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
    setOpenComments(
      (prev) =>
        prev.includes(tripId)
          ? prev.filter(
              (id) =>
                id !== tripId
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
     FEMALE THEME
  ========================================================= */

  const femaleTheme =
    femaleOnly &&
    currentUserGender ===
      "Female";

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
          ADMIN INVESTIGATION NOTICE
      ===================================================== */}

      {isAdminView && (
        <div
          className="
            sticky
            top-0
            z-[100]
            w-full
            bg-orange-600
            text-black
            text-center
            py-2
            px-4
            text-xs
            sm:text-sm
            font-black
            shadow-lg
          "
        >
          🛡️ INVESTIGATION MODE — Viewing{" "}
          {adminView?.userName ||
            "User"}'s Explore Trips
          <span className="ml-2 opacity-70">
            (Read Only)
          </span>
        </div>
      )}

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className={`
          fixed
          inset-0
          pointer-events-none
          ${
            femaleTheme
              ? "bg-[radial-gradient(circle_at_15%_10%,rgba(244,114,182,0.10),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.04),transparent_30%)]"
              : "bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,0.10),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.04),transparent_30%)]"
          }
        `}
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
            className={`
              rounded-2xl
              border
              bg-white/[0.035]
              backdrop-blur-xl
              overflow-hidden
              ${
                femaleTheme
                  ? "border-pink-300/30"
                  : "border-orange-500/30"
              }
            `}
          >
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
                  className={`
                    w-8
                    h-8
                    rounded-lg
                    border
                    flex
                    items-center
                    justify-center
                    ${
                      femaleTheme
                        ? "bg-pink-300/10 border-pink-300/20"
                        : "bg-orange-500/10 border-orange-500/20"
                    }
                  `}
                >
                  <SlidersHorizontal
                    size={16}
                    className={
                      femaleTheme
                        ? "text-pink-300"
                        : "text-orange-400"
                    }
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
                  {/* START */}

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

                    <div className="relative">
                      <MapPin
                        size={16}
                        className={`
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          ${
                            femaleTheme
                              ? "text-pink-300"
                              : "text-orange-400"
                          }
                        `}
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
                        className={`
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
                          transition
                          ${
                            femaleTheme
                              ? "focus:border-pink-300"
                              : "focus:border-orange-500"
                          }
                        `}
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

                    <div className="relative">
                      <Route
                        size={16}
                        className={`
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          ${
                            femaleTheme
                              ? "text-pink-300"
                              : "text-orange-400"
                          }
                        `}
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
                        className={`
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
                          transition
                          ${
                            femaleTheme
                              ? "focus:border-pink-300"
                              : "focus:border-orange-500"
                          }
                        `}
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

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className={`
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          pointer-events-none
                          ${
                            femaleTheme
                              ? "text-pink-300"
                              : "text-orange-400"
                          }
                        `}
                      />

                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) =>
                          setDateFilter(
                            e.target.value
                          )
                        }
                        className={`
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
                          transition
                          ${
                            femaleTheme
                              ? "focus:border-pink-300"
                              : "focus:border-orange-500"
                          }
                        `}
                      />
                    </div>
                  </div>
                </div>

                {/* =================================================
                    FEMALE RIDER FILTER
                ================================================= */}

                {currentUserGender ===
                  "Female" && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFemaleOnly(
                          (prev) =>
                            !prev
                        )
                      }
                      className={`
                        w-full
                        sm:w-auto
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        px-4
                        py-2.5
                        rounded-xl
                        border
                        text-xs
                        font-black
                        transition-all
                        duration-300
                        ${
                          femaleOnly
                            ? "bg-pink-300 text-black border-pink-200 shadow-[0_0_20px_rgba(244,114,182,0.25)]"
                            : "bg-pink-300/10 text-pink-200 border-pink-300/30 hover:bg-pink-300/20 hover:border-pink-300/50"
                        }
                      `}
                    >
                      <span className="text-sm">
                        🌸
                      </span>

                      <span>
                        Find Female Riders
                      </span>

                      {femaleOnly && (
                        <span className="text-[10px] ml-1">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                )}

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
                    <span className="text-xs text-zinc-400">
                      {resultText}
                    </span>

                    {startFilter && (
                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          text-[10px]
                          font-bold
                          ${
                            femaleTheme
                              ? "bg-pink-300/10 border border-pink-300/20 text-pink-200"
                              : "bg-orange-500/10 border border-orange-500/20 text-orange-300"
                          }
                        `}
                      >
                        From:{" "}
                        {startFilter}
                      </span>
                    )}

                    {destinationFilter && (
                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          text-[10px]
                          font-bold
                          ${
                            femaleTheme
                              ? "bg-pink-300/10 border border-pink-300/20 text-pink-200"
                              : "bg-orange-500/10 border border-orange-500/20 text-orange-300"
                          }
                        `}
                      >
                        To:{" "}
                        {destinationFilter}
                      </span>
                    )}

                    {dateFilter && (
                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          text-[10px]
                          font-bold
                          ${
                            femaleTheme
                              ? "bg-pink-300/10 border border-pink-300/20 text-pink-200"
                              : "bg-orange-500/10 border border-orange-500/20 text-orange-300"
                          }
                        `}
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

                    {femaleOnly && (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          px-2.5
                          py-1
                          rounded-full
                          bg-pink-300/10
                          border
                          border-pink-300/30
                          text-pink-200
                          text-[10px]
                          font-bold
                        "
                      >
                        🌸 Female Riders
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
            FEMALE MODE NOTICE
        ================================================= */}

        {femaleTheme && (
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
                rounded-xl
                border
                border-pink-300/20
                bg-pink-300/5
                px-4
                py-3
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  w-8
                  h-8
                  rounded-full
                  bg-pink-300/10
                  border
                  border-pink-300/20
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
              >
                🌸
              </div>

              <div>
                <p className="text-pink-200 text-xs font-black">
                  Female Riders
                </p>

                <p className="text-zinc-500 text-[10px] mt-0.5">
                  Showing rides hosted by female riders
                </p>
              </div>
            </div>
          </div>
        )}

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
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
                  {requestedStartLocation}
                </span>{" "}
                in{" "}
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
                  {requestedCity}
                </span>{" "}
                to{" "}
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
                  {requestedDestination}
                </span>
              </>
            ) : requestedCity &&
              requestedDestination ? (
              <>
                Showing{" "}
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
                  {requestedCity}
                </span>{" "}
                rides to{" "}
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
                  {requestedDestination}
                </span>
              </>
            ) : requestedDestination ? (
              <>
                Showing rides to{" "}
                <span
                  className={
                    femaleTheme
                      ? "text-pink-300 font-semibold"
                      : "text-orange-400 font-semibold"
                  }
                >
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
              expandedTrip ===
              trip.id;

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
                  transition-all
                  duration-500

                  ${
                    femaleTheme
                      ? "border-pink-300/80 shadow-[0_0_18px_rgba(244,114,182,0.12)]"
                      : "border-orange-500/80 shadow-[0_0_18px_rgba(249,115,22,0.10)]"
                  }

                  ${
                    isExpanded
                      ? femaleTheme
                        ? "bg-white/[0.07] shadow-[0_0_28px_rgba(244,114,182,0.20)]"
                        : "bg-white/[0.07] shadow-[0_0_28px_rgba(249,115,22,0.18)]"
                      : femaleTheme
                        ? "bg-white/[0.035] hover:bg-white/[0.055] hover:border-pink-300"
                        : "bg-white/[0.035] hover:bg-white/[0.055] hover:border-orange-400"
                  }
                `}
              >
                {/* CINEMATIC LIGHT */}

                <div
                  className={`
                    absolute
                    inset-0
                    pointer-events-none
                    bg-gradient-to-r
                    ${
                      femaleTheme
                        ? "from-pink-300/[0.08]"
                        : "from-orange-500/[0.08]"
                    }
                    via-transparent
                    to-white/[0.03]
                    opacity-70
                  `}
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
                  {/* LEFT PROFILE */}

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
                      className={`
                        absolute
                        inset-0
                        border-r
                        pointer-events-none
                        z-20
                        ${
                          femaleTheme
                            ? "border-pink-300/50"
                            : "border-orange-500/50"
                        }
                      `}
                    />
                  </div>

                  {/* CENTER */}

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
                      className={`
                        flex
                        items-center
                        justify-center
                        gap-1.5
                        md:gap-2
                        max-w-full
                        ${
                          femaleTheme
                            ? "text-pink-300"
                            : "text-orange-400"
                        }
                      `}
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

                  {/* RIGHT */}

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
                      className={`
                        text-[8px]
                        sm:text-[9px]
                        md:text-xs
                        uppercase
                        tracking-[0.25em]
                        mb-1
                        ${
                          femaleTheme
                            ? "text-pink-300"
                            : "text-orange-500"
                        }
                      `}
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
                      className={`
                        mt-2
                        w-7
                        h-7
                        sm:w-8
                        sm:h-8
                        rounded-full
                        bg-black/60
                        border
                        flex
                        items-center
                        justify-center
                        transition-all
                        duration-300
                        ${
                          femaleTheme
                            ? "border-pink-300/50 group-hover:border-pink-300 group-hover:bg-pink-300/10"
                            : "border-orange-500/50 group-hover:border-orange-500 group-hover:bg-orange-500/10"
                        }
                      `}
                    >
                      {isExpanded ? (
                        <ChevronUp
                          size={14}
                          className={
                            femaleTheme
                              ? "text-pink-300"
                              : "text-orange-500"
                          }
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
                    {/* RIDER */}

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
                            className={`
                              w-10
                              h-10
                              rounded-full
                              object-cover
                              border
                              ${
                                femaleTheme
                                  ? "border-pink-300"
                                  : "border-orange-500"
                              }
                            `}
                          />
                        ) : (
                          <div
                            className={`
                              w-10
                              h-10
                              rounded-full
                              bg-zinc-900
                              border
                              flex
                              items-center
                              justify-center
                              ${
                                femaleTheme
                                  ? "border-pink-300"
                                  : "border-orange-500"
                              }
                            `}
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
                            className={`
                              font-bold
                              ${
                                femaleTheme
                                  ? "text-pink-300"
                                  : "text-orange-400"
                              }
                            `}
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

                    {/* DETAILS */}

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-4
                        gap-3
                      "
                    >
                      {/* START */}

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
                          className={`
                            flex
                            items-center
                            gap-1.5
                            mb-1.5
                            ${
                              femaleTheme
                                ? "text-pink-300"
                                : "text-orange-400"
                            }
                          `}
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
                          className={`
                            flex
                            items-center
                            gap-1.5
                            mb-1.5
                            ${
                              femaleTheme
                                ? "text-pink-300"
                                : "text-orange-400"
                            }
                          `}
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
                          className={`
                            flex
                            items-center
                            gap-1.5
                            mb-1.5
                            ${
                              femaleTheme
                                ? "text-pink-300"
                                : "text-orange-400"
                            }
                          `}
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
                        className={`
                          text-black
                          rounded-xl
                          p-3
                          min-w-0
                          ${
                            femaleTheme
                              ? "bg-pink-300"
                              : "bg-orange-500"
                          }
                        `}
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

                    {/* BIKE */}

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
                        className={`
                          flex
                          items-center
                          gap-2
                          mb-1
                          ${
                            femaleTheme
                              ? "text-pink-300"
                              : "text-orange-400"
                          }
                        `}
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

                    {/* RIDE STORY */}

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
                          className={`
                            text-xs
                            font-bold
                            mb-2
                            uppercase
                            tracking-wider
                            ${
                              femaleTheme
                                ? "text-pink-300"
                                : "text-orange-400"
                            }
                          `}
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

                    {/* ITINERARY */}

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
                          className={`
                            text-xs
                            font-bold
                            mb-2
                            uppercase
                            tracking-wider
                            ${
                              femaleTheme
                                ? "text-pink-300"
                                : "text-orange-400"
                            }
                          `}
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
                        className={`
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                          ${
                            isAdminView
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:border-red-500/50"
                          }
                        `}
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
                          {trip.likes ||
                            0}
                        </span>

                        {isAdminView && (
                          <span className="text-[10px] text-zinc-500">
                            🔒
                          </span>
                        )}
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
                        className={`
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                          ${
                            femaleTheme
                              ? "hover:border-pink-300/50"
                              : "hover:border-orange-500/50"
                          }
                        `}
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
                        className={`
                          flex
                          items-center
                          gap-2
                          bg-black/50
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                          ${
                            isAdminView
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:border-yellow-500/50"
                          }
                        `}
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

                        {isAdminView && (
                          <span className="text-[10px] text-zinc-500">
                            🔒
                          </span>
                        )}
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
                        className={`
                          ml-auto
                          flex
                          items-center
                          gap-2
                          px-5
                          py-3
                          rounded-full
                          font-black
                          transition
                          ${
                            isAdminView
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              : femaleTheme
                                ? "bg-pink-300 hover:bg-pink-200 text-black shadow-lg shadow-pink-300/20 hover:scale-105"
                                : "bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20 hover:scale-105"
                          }
                        `}
                      >
                        <Rocket size={18} />

                        {trip.rideType ===
                        "group"
                          ? "Join Ride"
                          : "Ride Along"}

                        {isAdminView && (
                          <span className="text-[10px]">
                            🔒
                          </span>
                        )}
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
                        {/* ADMIN READ-ONLY COMMENT NOTICE */}

                        {isAdminView ? (
                          <div
                            className="
                              rounded-xl
                              border
                              border-orange-500/20
                              bg-orange-500/5
                              px-4
                              py-3
                              text-xs
                              text-orange-300
                            "
                          >
                            🛡️ Investigation Mode —
                            comments are read-only.
                            You can view this user's
                            ride comments but cannot
                            add a comment.
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Write a comment and press Enter..."
                            className={`
                              w-full
                              p-4
                              rounded-xl
                              bg-black
                              border
                              border-zinc-700
                              text-white
                              outline-none
                              ${
                                femaleTheme
                                  ? "focus:border-pink-300"
                                  : "focus:border-orange-500"
                              }
                            `}
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                "Enter"
                              ) {
                                const value =
                                  e
                                    .currentTarget
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
                        )}

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
                                key={
                                  index
                                }
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
                                    {
                                      comment.user
                                    }
                                  </p>

                                  <p
                                    className="
                                      text-zinc-400
                                      text-sm
                                      mt-1
                                    "
                                  >
                                    {
                                      comment.text
                                    }
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
                  {femaleTheme
                    ? "🌸"
                    : "🏍️"}
                </div>

                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  {femaleTheme
                    ? "No female rider trips"
                    : "No matching rides"}
                </h2>

                <p
                  className="
                    text-zinc-400
                    mt-2
                    max-w-md
                    mx-auto
                  "
                >
                  {femaleTheme
                    ? "We couldn't find any rides hosted by female riders matching your selected filters."
                    : "We couldn't find a ride matching your selected filters."}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className={`
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      px-5
                      py-3
                      rounded-full
                      text-black
                      font-black
                      transition
                      ${
                        femaleTheme
                          ? "bg-pink-300 hover:bg-pink-200"
                          : "bg-orange-500 hover:bg-orange-400"
                      }
                    `}
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