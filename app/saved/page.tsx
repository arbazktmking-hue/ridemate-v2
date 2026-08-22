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
  ChevronDown,
  ChevronUp,
} from "lucide-react";


function SavedTripsContent() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedTripId =
    searchParams.get("trip");


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
     LOAD SAVED TRIPS
  ========================================================= */

  useEffect(() => {

    const fetchSavedTrips = async () => {

      try {

        setLoading(true);

        const user =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        if (!user.name) {

          setTrips([]);

          setSavedTrips([]);

          return;

        }


        /* =====================================================
           GET SAVED TRIP IDs FOR CURRENT USER
        ===================================================== */

        const savedSnapshot =
          await getDocs(
            collection(
              db,
              "savedTrips"
            )
          );


        const savedIds: string[] =
          [];


        savedSnapshot.forEach(
          (savedDoc) => {

            const data =
              savedDoc.data();


            if (
              data.user ===
              user.name &&
              data.tripId
            ) {

              savedIds.push(
                data.tripId
              );

            }

          }
        );


        setSavedTrips(
          savedIds
        );


        /* =====================================================
           NO SAVED TRIPS
        ===================================================== */

        if (
          savedIds.length === 0
        ) {

          setTrips([]);

          return;

        }


        /* =====================================================
           GET ALL TRIPS
        ===================================================== */

        const tripsQuery =
          query(
            collection(
              db,
              "trips"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          );


        const tripSnapshot =
          await getDocs(
            tripsQuery
          );


        const loadedTrips: any[] =
          [];


        tripSnapshot.forEach(
          (tripDoc) => {

            const trip =
              tripDoc.data();


            if (
              savedIds.includes(
                tripDoc.id
              )
            ) {

              loadedTrips.push({
                id:
                  tripDoc.id,
                ...trip,
              });

            }

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
                  t.id ===
                  trip.id
              )
          );


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


          const otherTrips =
            uniqueTrips.filter(
              (trip) =>
                trip.id !==
                sharedTripId
            );


          if (sharedTrip) {

            setTrips([
              sharedTrip,
              ...otherTrips,
            ]);

            setExpandedTrip(
              sharedTrip.id
            );

          } else {

            setTrips(
              uniqueTrips
            );

          }

        } else {

          setTrips(
            uniqueTrips
          );

        }

      } catch (error) {

        console.error(
          "Failed to load saved trips:",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    fetchSavedTrips();

  }, [sharedTripId]);


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
     UNSAVE
  ========================================================= */

  const toggleSaveTrip = async (
    tripId: string
  ) => {

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


      /*
       * Remove the trip immediately
       * from the Saved Trips page.
       */

      setTrips(
        (prevTrips) =>
          prevTrips.filter(
            (trip) =>
              trip.id !==
              tripId
          )
      );


      /*
       * If the removed trip was expanded,
       * close it.
       */

      setExpandedTrip(
        (current) =>
          current === tripId
            ? null
            : current
      );

    } catch (error) {

      console.error(
        "Unsave error:",
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

      const tripRef =
        doc(
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


      const trip =
        trips.find(
          (t) =>
            t.id === id
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
                      currentLikes +
                      1,
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
      !commentText.trim()
    )
      return;


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

        user:
          user.name,

        image:
          user.image || "",

        text:
          commentText,

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
            t.id ===
            tripId
        );


      if (
        trip &&
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

  const requestToJoin =
    async (
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


        if (
          alreadyRequested
        ) {

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
              trip.destination ||
              "",

            startLocation:
              trip.startLocation ||
              "",

            distance:
              trip.distance ||
              "",

            bike:
              trip.bike ||
              "",

            tripDate:
              trip.tripDate ||
              "",

            tripPrice:
              trip.tripPrice ||
              "",

            rideType:
              trip.rideType ||
              "individual",

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
        prev.includes(
          tripId
        )
          ? prev.filter(
              (id) =>
                id !==
                tripId
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

        <div
          className="
            text-center
          "
        >

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
            Loading saved rides...
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
          CINEMATIC BACKGROUND
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
            PAGE HEADER
        ================================================= */}

        <div
          className="
            px-3
            sm:px-4
            md:px-6
            mb-3
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <Bookmark
              size={20}
              className="
                text-yellow-400
                fill-yellow-400
              "
            />

            <h1
              className="
                text-lg
                sm:text-xl
                md:text-2xl
                font-black
              "
            >
              Saved Trips
            </h1>

          </div>


          <p
            className="
              text-zinc-500
              text-xs
              mt-1
            "
          >
            Your saved rides are waiting for you.
          </p>

        </div>


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

          {trips.map(
            (trip) => {

              const isExpanded =
                expandedTrip ===
                trip.id;


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

                      {/* USERNAME */}

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


                      {/* BIKE */}

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


                      {/* DATE */}

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
                          className="
                            flex-shrink-0
                          "
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
                                  day:
                                    "numeric",
                                  month:
                                    "short",
                                  year:
                                    "numeric",
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
                            className="
                              text-orange-500
                            "
                          />

                        ) : (

                          <ChevronDown
                            size={14}
                            className="
                              text-zinc-400
                            "
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
                        py-4
                        md:py-5
                      "
                    >

                      {/* =================================================
                          RIDER PROFILE
                      ================================================= */}

                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          justify-between
                          gap-3
                          mb-4
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
                            gap-2
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
                                bg-zinc-900
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
                                text-[8px]
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
                                text-sm
                              "
                            >
                              {trip.userName ||
                                "Rider"}
                            </p>

                          </div>

                        </Link>


                        {/* RIDE TYPE */}

                        {trip.rideType ===
                        "group" ? (

                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              bg-blue-500/10
                              border
                              border-blue-400/20
                              text-blue-300
                              px-2.5
                              py-1.5
                              rounded-full
                              text-[10px]
                              font-bold
                            "
                          >

                            <Users
                              size={12}
                            />

                            Group Ride

                          </span>

                        ) : (

                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              bg-green-500/10
                              border
                              border-green-400/20
                              text-green-300
                              px-2.5
                              py-1.5
                              rounded-full
                              text-[10px]
                              font-bold
                            "
                          >

                            <UserRound
                              size={12}
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
                          grid-cols-2
                          sm:grid-cols-2
                          lg:grid-cols-4
                          gap-2
                        "
                      >

                        {/* BIKE */}

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

                            <Bike
                              size={14}
                            />

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
                              text-xs
                              md:text-sm
                              break-words
                            "
                          >
                            {trip.bike ||
                              "Not specified"}
                          </p>

                        </div>


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
                            className="
                              flex
                              items-center
                              gap-1.5
                              text-orange-400
                              mb-1.5
                            "
                          >

                            <MapPin
                              size={14}
                            />

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
                            {trip.startLocation ||
                              "Not specified"}
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

                            <Route
                              size={14}
                            />

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
                                    day:
                                      "numeric",
                                    month:
                                      "short",
                                    year:
                                      "numeric",
                                    hour:
                                      "numeric",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : "TBA"}

                          </p>

                        </div>

                      </div>


                      {/* =================================================
                          CONTRIBUTION
                      ================================================= */}

                      <div
                        className="
                          mt-3
                          bg-orange-500
                          text-black
                          rounded-xl
                          px-3
                          py-2.5
                          inline-flex
                          items-center
                          gap-3
                          min-w-0
                        "
                      >

                        <IndianRupee
                          size={15}
                        />

                        <div>

                          <p
                            className="
                              text-[8px]
                              uppercase
                              tracking-wider
                              font-black
                              leading-none
                            "
                          >
                            Contribution
                          </p>

                          <p
                            className="
                              font-black
                              text-base
                              leading-tight
                              mt-0.5
                            "
                          >
                            ₹{trip.tripPrice ||
                              0}
                          </p>

                        </div>

                      </div>


                      {/* =================================================
                          RIDE STORY
                      ================================================= */}

                      {trip.caption && (

                        <div
                          className="
                            mt-3
                            bg-black/30
                            border
                            border-white/10
                            rounded-xl
                            p-3
                          "
                        >

                          <p
                            className="
                              text-orange-400
                              text-[9px]
                              font-black
                              uppercase
                              tracking-widest
                              mb-1.5
                            "
                          >
                            📝 Ride Story
                          </p>

                          <p
                            className="
                              text-zinc-300
                              leading-relaxed
                              text-xs
                              md:text-sm
                            "
                          >
                            "{trip.caption}"
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
                            p-3
                          "
                        >

                          <p
                            className="
                              text-orange-400
                              text-[9px]
                              font-black
                              uppercase
                              tracking-widest
                              mb-1.5
                            "
                          >
                            🗺️ Itinerary
                          </p>

                          <p
                            className="
                              text-zinc-300
                              leading-relaxed
                              text-xs
                              md:text-sm
                              whitespace-pre-line
                            "
                          >
                            {trip.itinerary}
                          </p>

                        </div>

                      )}


                      {/* =================================================
                          ACTIONS
                      ================================================= */}

                      <div
                        className="
                          mt-4
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >

                        {/* LIKE */}

                        <button
                          onClick={() =>
                            likeTrip(
                              trip.id,
                              trip.likes ||
                                0
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            bg-white/5
                            hover:bg-red-500/10
                            border
                            border-white/10
                            px-3
                            py-2
                            rounded-full
                            transition
                          "
                        >

                          <Heart
                            size={16}
                            className="
                              text-red-400
                            "
                          />

                          <span
                            className="
                              text-xs
                              font-bold
                            "
                          >
                            {trip.likes ||
                              0}
                          </span>

                        </button>


                        {/* COMMENT */}

                        <button
                          onClick={() =>
                            toggleComments(
                              trip.id
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            bg-white/5
                            hover:bg-blue-500/10
                            border
                            border-white/10
                            px-3
                            py-2
                            rounded-full
                            transition
                          "
                        >

                          <MessageCircle
                            size={16}
                            className="
                              text-sky-400
                            "
                          />

                          <span
                            className="
                              text-xs
                              font-bold
                            "
                          >
                            {(
                              trip.comments ||
                              []
                            ).length}
                          </span>

                        </button>


                        {/* SHARE */}

                        <button
                          onClick={() =>
                            router.push(
                              `/share/${trip.id}`
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            bg-white/5
                            hover:bg-green-500/10
                            border
                            border-white/10
                            px-3
                            py-2
                            rounded-full
                            transition
                          "
                        >

                          <Share2
                            size={16}
                            className="
                              text-green-400
                            "
                          />

                          <span
                            className="
                              text-xs
                              font-bold
                            "
                          >
                            Share
                          </span>

                        </button>


                        {/* UNSAVE */}

                        <button
                          onClick={() =>
                            toggleSaveTrip(
                              trip.id
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            bg-yellow-500/10
                            hover:bg-yellow-500/20
                            border
                            border-yellow-500/30
                            px-3
                            py-2
                            rounded-full
                            transition
                          "
                        >

                          <Bookmark
                            size={16}
                            className="
                              fill-yellow-400
                              text-yellow-400
                            "
                          />

                          <span
                            className="
                              hidden
                              sm:inline
                              text-xs
                              font-bold
                              text-yellow-300
                            "
                          >
                            Saved
                          </span>

                        </button>


                        {/* JOIN */}

                        <button
                          onClick={() =>
                            requestToJoin(
                              trip
                            )
                          }
                          className="
                            ml-auto
                            flex
                            items-center
                            gap-1.5
                            bg-orange-500
                            hover:bg-orange-400
                            text-black
                            px-4
                            py-2
                            rounded-full
                            text-xs
                            font-black
                            shadow-lg
                            shadow-orange-500/20
                            hover:scale-105
                            transition
                          "
                        >

                          <Rocket
                            size={16}
                          />

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
                            mt-3
                            bg-black/40
                            border
                            border-white/10
                            rounded-xl
                            p-3
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
                              p-3
                              rounded-lg
                              bg-black
                              border
                              border-zinc-700
                              text-white
                              text-sm
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


                          <div
                            className="
                              mt-3
                              space-y-1.5
                              max-h-52
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
                                    bg-black
                                    border
                                    border-white/10
                                    rounded-lg
                                    p-2.5
                                  "
                                >

                                  <div
                                    className="
                                      flex
                                      items-center
                                      gap-2
                                      mb-1.5
                                    "
                                  >

                                    {comment.image ? (

                                      <img
                                        src={
                                          comment.image
                                        }
                                        alt="User"
                                        className="
                                          w-7
                                          h-7
                                          rounded-full
                                          object-cover
                                        "
                                      />

                                    ) : (

                                      <div
                                        className="
                                          w-7
                                          h-7
                                          rounded-full
                                          bg-zinc-800
                                          flex
                                          items-center
                                          justify-center
                                          text-xs
                                        "
                                      >
                                        👤
                                      </div>

                                    )}


                                    <span
                                      className="
                                        text-orange-500
                                        font-bold
                                        text-xs
                                      "
                                    >
                                      {comment.user}
                                    </span>

                                  </div>


                                  <p
                                    className="
                                      text-zinc-300
                                      text-xs
                                    "
                                  >
                                    {comment.text}
                                  </p>

                                </div>

                              )
                            )}


                            {(
                              trip.comments ||
                              []
                            ).length ===
                              0 && (

                              <p
                                className="
                                  text-center
                                  text-zinc-500
                                  py-3
                                  text-xs
                                "
                              >
                                No comments yet.
                                Be the first!
                              </p>

                            )}

                          </div>

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              );

            }
          )}


          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {trips.length === 0 && (

            <div
              className="
                min-h-[70vh]
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
                  🔖
                </div>


                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  No saved trips
                </h2>


                <p
                  className="
                    text-zinc-400
                    mt-2
                  "
                >
                  Trips you save will
                  appear here.
                </p>


                <Link
                  href="/explore"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    mt-5
                    bg-orange-500
                    hover:bg-orange-400
                    text-black
                    px-5
                    py-2.5
                    rounded-full
                    text-sm
                    font-black
                    transition
                  "
                >

                  <Rocket
                    size={16}
                  />

                  Explore Trips

                </Link>

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

export default function SavedTripsPage() {

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

          <div
            className="
              text-center
            "
          >

            <div
              className="
                text-5xl
                mb-4
              "
            >
              🏍️
            </div>

            Loading saved trips...

          </div>

        </main>

      }
    >

      <SavedTripsContent />

    </Suspense>

  );

}