"use client";

import {
  Suspense,
  useEffect,
  useState,
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
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Rocket,
  Share2,
  MapPin,
  Bike,
  CalendarDays,
  Route,
  IndianRupee,
  Users,
  UserRound,
} from "lucide-react";


function FeedContent() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedTripId = searchParams.get("trip");

  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);


  const focusedTrip = trips.find(
    (trip) => trip.id === sharedTripId
  );


  /* =========================================================
     LOAD TRIPS
  ========================================================= */

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
            index ===
            self.findIndex(
              (t) => t.id === trip.id
            )
        );


        if (sharedTripId) {

          const sharedTrip = uniqueTrips.find(
            (trip) => trip.id === sharedTripId
          );

          const otherTrips = uniqueTrips.filter(
            (trip) => trip.id !== sharedTripId
          );


          if (sharedTrip) {

            setTrips([
              sharedTrip,
              ...otherTrips,
            ]);

          } else {

            setTrips(uniqueTrips);

          }

        } else {

          setTrips(uniqueTrips);

        }


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

  }, [sharedTripId]);


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


        snapshot.forEach((doc) => {

          const data = doc.data();


          if (data.user === user.name) {

            saved.push(data.tripId);

          }

        });


        setSavedTrips(saved);

      } catch (error) {

        console.log(error);

      }

    };


    loadSavedTrips();

  }, []);


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


      if (!user.name) return;


      const saveId =
        `${user.name}_${tripId}`;


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

      console.log(error);

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


      await updateDoc(
        tripRef,
        {
          likes:
            currentLikes + 1,
        }
      );


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
        trip.userName !==
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

            text:
              `${currentUser.name} liked your trip ❤️`,

            createdAt:
              Date.now(),

            read:
              false,
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
                      currentLikes + 1,
                  }
                : trip
          )
      );

    } catch (error) {

      console.log(error);

    }

  };


  /* =========================================================
     ADD COMMENT
  ========================================================= */

  const addComment = async (
    tripId: string,
    commentText: string
  ) => {

    if (!commentText.trim())
      return;


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


      const newComment = {
        user: user.name,
        image: user.image,
        text: commentText,
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


      const trip = trips.find(
        (t) => t.id === tripId
      );


      if (
        trip &&
        trip.userName !== user.name
      ) {

        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            user:
              trip.userName,

            text:
              `${user.name} commented on your trip 💬`,

            createdAt:
              Date.now(),

            read:
              false,
          }
        );

      }


      setTrips(
        (prevTrips) =>
          prevTrips.map(
            (trip) =>
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

      console.log(error);

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


      if (
        currentUser.name ===
        trip.userName
      ) {

        alert(
          "You cannot join your own ride."
        );

        return;

      }


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
        (doc) => {

          const request =
            doc.data();


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
            currentUser.image ||
            "",

          destination:
            trip.destination,

          createdAt:
            Date.now(),

          status:
            "pending",
        }
      );


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

          read:
            false,
        }
      );


      alert(
        "Ride request sent 🚀"
      );

    } catch (error) {

      console.log(error);

      alert(
        "Something went wrong. Please try again."
      );

    }

  };


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
        overflow-hidden
      "
    >

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

          {(sharedTripId && focusedTrip
            ? [focusedTrip]
            : trips
          ).map((trip) => (

            <div
              key={trip.id}
              className="
                snap-start
                h-[calc(100dvh-64px)]
                min-h-[500px]
                w-full
                relative
                overflow-hidden
                bg-black
              "
            >

              {/* =================================================
                  ONE SINGLE PROFILE IMAGE
              ================================================= */}

              <img
                src={trip.userImage || ""}
                alt={trip.userName || "Rider"}
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                  object-center
                  select-none
                "
              />


              {/* =================================================
                  CINEMATIC OVERLAY
              ================================================= */}

              <div
                className="
                  absolute
                  inset-0
                  bg-black/20
                  pointer-events-none
                "
              />


              {/* =================================================
                  LEFT SIDE BLUR / DARKENING
              ================================================= */}

              <div
                className="
                  absolute
                  inset-y-0
                  left-0
                  w-full
                  md:w-[55%]
                  backdrop-blur-md
                  bg-black/60
                  border-r
                  border-white/10
                  pointer-events-none
                "
              />


              {/* =================================================
                  EXTRA LEFT GRADIENT
              ================================================= */}

              <div
                className="
                  absolute
                  inset-y-0
                  left-0
                  w-full
                  md:w-[62%]
                  bg-gradient-to-r
                  from-black/80
                  via-black/55
                  to-transparent
                  pointer-events-none
                "
              />


              {/* =================================================
                  TOP RIDER PROFILE
              ================================================= */}

              <Link
                href={`/rider/${encodeURIComponent(
                  trip.userName
                )}`}
                onClick={(e) =>
                  e.stopPropagation()
                }
                className="
                  absolute
                  top-4
                  left-4
                  md:left-8
                  flex
                  items-center
                  gap-3
                  bg-black/55
                  backdrop-blur-xl
                  px-3
                  py-2
                  rounded-full
                  border
                  border-white/10
                  hover:bg-black/75
                  transition
                  z-40
                  max-w-[85%]
                "
              >

                {trip.userImage ? (

                  <img
                    src={trip.userImage}
                    alt="Rider"
                    className="
                      w-10
                      h-10
                      rounded-full
                      object-cover
                      border
                      border-orange-500
                      flex-shrink-0
                    "
                  />

                ) : (

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-zinc-800
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

                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    Ride hosted by
                  </p>

                  <span
                    className="
                      font-bold
                      text-white
                      truncate
                      block
                    "
                  >
                    {trip.userName}
                  </span>

                </div>

              </Link>


              {/* =================================================
                  TRIP INFORMATION
              ================================================= */}

              <div
                className="
                  absolute
                  z-20

                  left-4
                  right-4
                  top-24
                  bottom-28

                  md:left-8
                  md:right-auto
                  md:top-24
                  md:bottom-28
                  md:w-[50%]

                  flex
                  flex-col
                  justify-center

                  pointer-events-none
                "
              >

                {/* DESTINATION */}

                <div
                  className="
                    animate-[fadeIn_0.6s_ease-out]
                  "
                >

                  <p
                    className="
                      text-xs
                      md:text-sm
                      uppercase
                      tracking-[0.25em]
                      text-orange-400
                      font-bold
                      mb-2
                    "
                  >
                    Upcoming Ride
                  </p>


                  <h1
                    className="
                      text-4xl
                      sm:text-5xl
                      md:text-6xl
                      lg:text-7xl
                      font-black
                      leading-[0.95]
                      tracking-tight
                      text-white
                      drop-shadow-2xl
                    "
                  >
                    {trip.destination}
                  </h1>


                  <div
                    className="
                      mt-3
                      h-1
                      w-20
                      md:w-28
                      bg-orange-500
                      rounded-full
                    "
                  />

                </div>


                {/* RIDE TYPE */}

                <div className="mt-6">

                  {trip.rideType === "group" ? (

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                        bg-blue-500/20
                        border
                        border-blue-400/30
                        text-blue-200
                        px-4
                        py-2
                        rounded-full
                        text-xs
                        md:text-sm
                        font-bold
                        backdrop-blur-xl
                      "
                    >
                      <Users className="w-4 h-4" />
                      Group Ride • Own Bike
                    </span>

                  ) : (

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                        bg-green-500/20
                        border
                        border-green-400/30
                        text-green-200
                        px-4
                        py-2
                        rounded-full
                        text-xs
                        md:text-sm
                        font-bold
                        backdrop-blur-xl
                      "
                    >
                      <UserRound className="w-4 h-4" />
                      Individual Ride • Pillion
                    </span>

                  )}

                </div>


                {/* INFORMATION GRID */}

                <div
                  className="
                    mt-5
                    grid
                    grid-cols-2
                    gap-3
                    max-w-xl
                  "
                >

                  {/* BIKE */}

                  <div
                    className="
                      bg-black/45
                      backdrop-blur-xl
                      border
                      border-white/10
                      rounded-2xl
                      p-3
                      md:p-4
                    "
                  >

                    <div className="flex items-center gap-2 text-orange-400">

                      <Bike className="w-4 h-4" />

                      <span className="text-[10px] md:text-xs uppercase tracking-wider">
                        Bike
                      </span>

                    </div>

                    <p className="mt-1 font-bold text-sm md:text-base truncate">
                      {trip.bike || "Not specified"}
                    </p>

                  </div>


                  {/* START */}

                  <div
                    className="
                      bg-black/45
                      backdrop-blur-xl
                      border
                      border-white/10
                      rounded-2xl
                      p-3
                      md:p-4
                    "
                  >

                    <div className="flex items-center gap-2 text-orange-400">

                      <MapPin className="w-4 h-4" />

                      <span className="text-[10px] md:text-xs uppercase tracking-wider">
                        Starting From
                      </span>

                    </div>

                    <p className="mt-1 font-bold text-sm md:text-base truncate">
                      {trip.startLocation || "Not specified"}
                    </p>

                  </div>


                  {/* DISTANCE */}

                  <div
                    className="
                      bg-black/45
                      backdrop-blur-xl
                      border
                      border-white/10
                      rounded-2xl
                      p-3
                      md:p-4
                    "
                  >

                    <div className="flex items-center gap-2 text-orange-400">

                      <Route className="w-4 h-4" />

                      <span className="text-[10px] md:text-xs uppercase tracking-wider">
                        Distance
                      </span>

                    </div>

                    <p className="mt-1 font-bold text-sm md:text-base">
                      {trip.distance
                        ? `${trip.distance} KM`
                        : "Not specified"}
                    </p>

                  </div>


                  {/* DATE */}

                  <div
                    className="
                      bg-black/45
                      backdrop-blur-xl
                      border
                      border-white/10
                      rounded-2xl
                      p-3
                      md:p-4
                    "
                  >

                    <div className="flex items-center gap-2 text-orange-400">

                      <CalendarDays className="w-4 h-4" />

                      <span className="text-[10px] md:text-xs uppercase tracking-wider">
                        Departure
                      </span>

                    </div>

                    <p className="mt-1 font-bold text-sm md:text-base">
                      {trip.tripDate
                        ? new Date(
                            trip.tripDate
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )
                        : "TBA"}
                    </p>

                  </div>

                </div>


                {/* PRICE */}

                <div
                  className="
                    mt-4
                    inline-flex
                    self-start
                    items-center
                    gap-2
                    bg-orange-500
                    text-black
                    px-5
                    py-2.5
                    rounded-full
                    font-black
                    text-sm
                    md:text-base
                    shadow-lg
                    shadow-orange-500/20
                  "
                >

                  <IndianRupee className="w-4 h-4" />

                  Contribution: ₹
                  {trip.tripPrice || 0}

                </div>


                {/* CAPTION */}

                {trip.caption && (

                  <p
                    className="
                      mt-4
                      max-w-xl
                      text-sm
                      md:text-base
                      text-white/80
                      italic
                      line-clamp-3
                      drop-shadow-lg
                    "
                  >
                    "{trip.caption}"
                  </p>

                )}

              </div>


              {/* =================================================
                  RIGHT SIDE CLEAR PHOTO INDICATOR
              ================================================= */}

              <div
                className="
                  hidden
                  md:block
                  absolute
                  right-8
                  top-1/2
                  -translate-y-1/2
                  z-20
                  pointer-events-none
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    bg-black/25
                    backdrop-blur-sm
                    border
                    border-white/10
                    px-4
                    py-2
                    rounded-full
                    text-white/70
                    text-xs
                  "
                >

                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />

                  Rider Profile

                </div>

              </div>


              {/* =================================================
                  BOTTOM ACTION BAR
              ================================================= */}

              <div
                className="
                  absolute
                  bottom-3
                  left-3
                  right-3
                  md:left-8
                  md:right-8
                  grid
                  grid-cols-5
                  items-center
                  bg-black/65
                  backdrop-blur-xl
                  border
                  border-white/10
                  rounded-3xl
                  py-2
                  md:py-3
                  z-40
                  shadow-2xl
                "
                onClick={(e) =>
                  e.stopPropagation()
                }
              >

                {/* LIKE */}

                <div className="flex flex-col items-center">

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      likeTrip(
                        trip.id,
                        trip.likes || 0
                      );

                    }}
                  >

                    <div
                      className="
                        w-10
                        h-10
                        md:w-12
                        md:h-12
                        rounded-full
                        bg-white/10
                        flex
                        items-center
                        justify-center
                        hover:bg-red-500/20
                        transition
                      "
                    >

                      <Heart
                        className="
                          w-5
                          h-5
                          md:w-6
                          md:h-6
                          text-red-400
                        "
                      />

                    </div>

                  </button>

                  <span className="text-[10px] md:text-xs mt-1">
                    {trip.likes || 0}
                  </span>

                </div>


                {/* COMMENT */}

                <div className="flex flex-col items-center">

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      if (
                        openComments.includes(
                          trip.id
                        )
                      ) {

                        setOpenComments(
                          (prev) =>
                            prev.filter(
                              (id) =>
                                id !==
                                trip.id
                            )
                        );

                      } else {

                        setOpenComments(
                          (prev) => [
                            ...prev,
                            trip.id,
                          ]
                        );

                      }

                    }}
                  >

                    <div
                      className="
                        w-10
                        h-10
                        md:w-12
                        md:h-12
                        rounded-full
                        bg-white/10
                        flex
                        items-center
                        justify-center
                        hover:bg-blue-500/20
                        transition
                      "
                    >

                      <MessageCircle
                        className="
                          w-5
                          h-5
                          md:w-6
                          md:h-6
                          text-sky-400
                        "
                      />

                    </div>

                  </button>

                  <span className="text-[10px] md:text-xs mt-1">
                    {(trip.comments || []).length}
                  </span>

                </div>


                {/* SHARE */}

                <div className="flex flex-col items-center">

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      router.push(
                        `/share/${trip.id}`
                      );

                    }}
                  >

                    <div
                      className="
                        w-10
                        h-10
                        md:w-12
                        md:h-12
                        rounded-full
                        bg-white/10
                        flex
                        items-center
                        justify-center
                        hover:bg-green-500/20
                        transition
                      "
                    >

                      <Share2
                        className="
                          w-5
                          h-5
                          md:w-6
                          md:h-6
                          text-green-400
                        "
                      />

                    </div>

                  </button>

                  <span className="text-[10px] md:text-xs mt-1">
                    Share
                  </span>

                </div>


                {/* SAVE */}

                <div className="flex flex-col items-center">

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      toggleSaveTrip(
                        trip.id
                      );

                    }}
                  >

                    <div
                      className="
                        w-10
                        h-10
                        md:w-12
                        md:h-12
                        rounded-full
                        bg-white/10
                        flex
                        items-center
                        justify-center
                        hover:bg-yellow-500/20
                        transition
                      "
                    >

                      <Bookmark
                        className={`
                          w-5
                          h-5
                          md:w-6
                          md:h-6
                          ${
                            savedTrips.includes(
                              trip.id
                            )
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-white"
                          }
                        `}
                      />

                    </div>

                  </button>

                  <span className="text-[10px] md:text-xs mt-1">
                    {savedTrips.includes(
                      trip.id
                    )
                      ? "Saved"
                      : "Save"}
                  </span>

                </div>


                {/* JOIN */}

                <div className="flex flex-col items-center">

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      const currentUser =
                        JSON.parse(
                          localStorage.getItem(
                            "ridemateUser"
                          ) || "{}"
                        );


                      if (
                        currentUser.name ===
                        trip.userName
                      ) {

                        alert(
                          "This is your ride"
                        );

                        return;

                      }


                      requestToJoin(
                        trip
                      );

                    }}
                  >

                    <div
                      className="
                        w-10
                        h-10
                        md:w-12
                        md:h-12
                        rounded-full
                        bg-orange-500
                        flex
                        items-center
                        justify-center
                        hover:scale-110
                        transition
                        shadow-lg
                        shadow-orange-500/30
                      "
                    >

                      <Rocket
                        className="
                          w-5
                          h-5
                          md:w-6
                          md:h-6
                          text-white
                        "
                      />

                    </div>

                  </button>

                  <span className="text-[10px] md:text-xs mt-1">

                    {trip.rideType ===
                    "group"
                      ? "Join Ride"
                      : "Ride Along"}

                  </span>

                </div>

              </div>


              {/* =================================================
                  HEART ANIMATION
              ================================================= */}

              {heartAnimation ===
                trip.id && (

                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    pointer-events-none
                    z-[100]
                  "
                >

                  <span
                    className="
                      text-7xl
                      md:text-9xl
                      animate-ping
                    "
                  >
                    ❤️
                  </span>

                </div>

              )}


              {/* =================================================
                  COMMENTS PANEL
              ================================================= */}

              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
                className={`
                  absolute
                  bottom-20
                  md:bottom-24
                  left-0
                  right-0
                  bg-black/95
                  backdrop-blur-xl
                  z-50
                  overflow-y-auto
                  transition-all
                  duration-300
                  ${
                    openComments.includes(
                      trip.id
                    )
                      ? "max-h-[320px] opacity-100"
                      : "max-h-0 opacity-0"
                  }
                `}
              >

                <div className="p-4">

                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="
                      w-full
                      p-4
                      rounded-xl
                      bg-zinc-950
                      border
                      border-zinc-700
                      text-base
                      outline-none
                      focus:border-orange-500
                    "
                    onKeyDown={(e) => {

                      if (
                        e.key ===
                        "Enter"
                      ) {

                        addComment(
                          trip.id,
                          e.currentTarget
                            .value
                        );


                        e.currentTarget
                          .value =
                          "";

                      }

                    }}
                  />


                  <div className="mt-4 space-y-2">

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
                            bg-black
                            p-4
                            rounded-2xl
                            border
                            border-zinc-800
                            hover:border-orange-500
                            transition
                          "
                        >

                          <div
                            className="
                              flex
                              items-center
                              gap-3
                              mb-2
                            "
                          >

                            {comment.image ? (

                              <img
                                src={
                                  comment.image
                                }
                                alt="User"
                                className="
                                  w-8
                                  h-8
                                  rounded-full
                                  object-cover
                                "
                              />

                            ) : (

                              <div
                                className="
                                  w-8
                                  h-8
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


                            <p
                              className="
                                font-bold
                                text-orange-500
                              "
                            >
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

          ))}


          {/* EMPTY STATE */}

          {trips.length === 0 && (

            <div
              className="
                h-[calc(100dvh-64px)]
                flex
                items-center
                justify-center
                bg-zinc-950
                text-center
                px-6
              "
            >

              <div>

                <div className="text-6xl mb-5">
                  🏍️
                </div>

                <h2 className="text-2xl font-black">
                  No rides yet
                </h2>

                <p className="text-zinc-400 mt-2">
                  Be the first rider to post a trip.
                </p>

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

          Loading...

        </main>

      }
    >

      <FeedContent />

    </Suspense>

  );

}