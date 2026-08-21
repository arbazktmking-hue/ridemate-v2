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
  ChevronDown,
  ChevronUp,
} from "lucide-react";


function FeedContent() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedTripId = searchParams.get("trip");

  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


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

        querySnapshot.forEach((tripDoc) => {

          const trip = tripDoc.data();

          loadedTrips.push({
            id: tripDoc.id,
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

            setExpandedTrip(sharedTrip.id);

          } else {

            setTrips(uniqueTrips);

          }

        } else {

          setTrips(uniqueTrips);

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


        snapshot.forEach((docSnap) => {

          const data = docSnap.data();

          if (data.user === user.name) {

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

        alert(
          "Please login first."
        );

        return;

      }


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
        image: user.image || "",
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

    setOpenComments((prev) =>
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


            return (

              <div
                key={trip.id}
                className={`
                  group
                  relative
                  w-full
                  overflow-hidden
                  border-y
                  border-white/10
                  transition-all
                  duration-500
                  ${
                    isExpanded
                      ? "bg-white/[0.07]"
                      : "bg-white/[0.035] hover:bg-white/[0.055]"
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
                      LEFT — FULL PROFILE IMAGE
                  ================================================= */}

                  <div
                    className="
                      relative
                      w-[24%]
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
                        src={trip.userImage}
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


                    {/* IMAGE EDGE FADE */}

                    <div
                      className="
                        absolute
                        inset-y-0
                        right-0
                        w-16
                        md:w-24
                        bg-gradient-to-r
                        from-transparent
                        to-black
                      "
                    />

                  </div>


                  {/* =================================================
                      CENTER — BIKE + DATE
                      PERFECTLY CENTERED
                  ================================================= */}

                  <div
                    className="
                      flex-1
                      min-w-0
                      flex
                      items-center
                      justify-center
                      px-2
                      sm:px-4
                      md:px-8
                    "
                  >

                    <div
                      className="
                        flex
                        flex-col
                        items-center
                        justify-center
                        text-center
                        gap-2
                        md:gap-3
                        min-w-0
                      "
                    >

                      {/* BIKE */}

                      <div
                        className="
                          flex
                          items-center
                          justify-center
                          gap-2
                          text-orange-400
                          max-w-full
                        "
                      >

                        <Bike
                          size={18}
                          className="
                            flex-shrink-0
                          "
                        />

                        <span
                          className="
                            text-xs
                            sm:text-sm
                            md:text-base
                            font-bold
                            truncate
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
                          gap-2
                          text-zinc-400
                          max-w-full
                        "
                      >

                        <CalendarDays
                          size={16}
                          className="
                            flex-shrink-0
                          "
                        />

                        <span
                          className="
                            text-[11px]
                            sm:text-xs
                            md:text-sm
                            truncate
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

                  </div>


                  {/* =================================================
                      RIGHT — DESTINATION
                  ================================================= */}

                  <div
                    className="
                      w-[36%]
                      sm:w-[35%]
                      md:w-[32%]
                      lg:w-[30%]
                      flex
                      items-center
                      justify-end
                      gap-2
                      md:gap-4
                      px-3
                      sm:px-4
                      md:px-8
                    "
                  >

                    <div
                      className="
                        text-right
                        min-w-0
                      "
                    >

                      <p
                        className="
                          hidden
                          md:block
                          text-[9px]
                          text-zinc-500
                          uppercase
                          tracking-[0.25em]
                          mb-1
                        "
                      >
                        Destination
                      </p>


                      <h2
                        className="
                          text-lg
                          sm:text-2xl
                          md:text-4xl
                          lg:text-5xl
                          font-black
                          leading-none
                          tracking-tight
                          truncate
                        "
                      >
                        {trip.destination}
                      </h2>

                    </div>


                    {/* EXPAND ICON */}

                    <div
                      className="
                        w-8
                        h-8
                        md:w-10
                        md:h-10
                        rounded-full
                        bg-white/5
                        border
                        border-white/10
                        flex
                        items-center
                        justify-center
                        flex-shrink-0
                        transition-all
                        duration-300
                        group-hover:border-orange-500/50
                      "
                    >

                      {isExpanded ? (

                        <ChevronUp
                          size={18}
                          className="
                            text-orange-500
                          "
                        />

                      ) : (

                        <ChevronDown
                          size={18}
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
                        ? "max-h-[1400px] opacity-100"
                        : "max-h-0 opacity-0"
                    }
                  `}
                >

                  <div
                    className="
                      border-t
                      border-white/10
                      px-4
                      md:px-8
                      py-6
                      md:py-8
                    "
                  >

                    {/* =================================================
                        RIDER PROFILE
                    ================================================= */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        mb-6
                      "
                    >

                      <Link
                        href={`/rider/${encodeURIComponent(
                          trip.userName
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
                            src={trip.userImage}
                            alt="Rider"
                            className="
                              w-10
                              h-10
                              rounded-full
                              object-cover
                            "
                          />

                        ) : (

                          <div
                            className="
                              w-10
                              h-10
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


                      {/* RIDE TYPE */}

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

                          <Users
                            size={14}
                          />

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

                      {/* START */}

                      <div
                        className="
                          bg-black/40
                          backdrop-blur-xl
                          border
                          border-white/10
                          rounded-2xl
                          p-4
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            text-orange-400
                            mb-2
                          "
                        >

                          <MapPin
                            size={16}
                          />

                          <span
                            className="
                              text-[10px]
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
                            text-sm
                            md:text-base
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
                          rounded-2xl
                          p-4
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            text-orange-400
                            mb-2
                          "
                        >

                          <Route
                            size={16}
                          />

                          <span
                            className="
                              text-[10px]
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
                            text-sm
                            md:text-base
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
                          rounded-2xl
                          p-4
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            text-orange-400
                            mb-2
                          "
                        >

                          <CalendarDays
                            size={16}
                          />

                          <span
                            className="
                              text-[10px]
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
                            text-sm
                            md:text-base
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
                          rounded-2xl
                          p-4
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            mb-2
                          "
                        >

                          <IndianRupee
                            size={16}
                          />

                          <span
                            className="
                              text-[10px]
                              uppercase
                              tracking-wider
                              font-black
                            "
                          >
                            Contribution
                          </span>

                        </div>

                        <p
                          className="
                            font-black
                            text-lg
                          "
                        >
                          ₹{trip.tripPrice || 0}
                        </p>

                      </div>

                    </div>


                    {/* =================================================
                        CAPTION
                    ================================================= */}

                    {trip.caption && (

                      <div
                        className="
                          mt-4
                          bg-black/40
                          border
                          border-white/10
                          rounded-2xl
                          p-5
                        "
                      >

                        <p
                          className="
                            text-orange-400
                            text-xs
                            font-black
                            uppercase
                            tracking-widest
                            mb-2
                          "
                        >
                          📝 Ride Story
                        </p>

                        <p
                          className="
                            text-zinc-300
                            leading-relaxed
                            text-sm
                            md:text-base
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
                          mt-4
                          bg-black/40
                          border
                          border-white/10
                          rounded-2xl
                          p-5
                        "
                      >

                        <p
                          className="
                            text-orange-400
                            text-xs
                            font-black
                            uppercase
                            tracking-widest
                            mb-2
                          "
                        >
                          🗺️ Itinerary
                        </p>

                        <p
                          className="
                            text-zinc-300
                            whitespace-pre-line
                            text-sm
                            md:text-base
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
                        mt-6
                        flex
                        flex-wrap
                        items-center
                        gap-3
                      "
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      {/* LIKE */}

                      <button
                        onClick={() =>
                          likeTrip(
                            trip.id,
                            trip.likes || 0
                          )
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          bg-white/5
                          hover:bg-red-500/10
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                        "
                      >

                        <Heart
                          size={18}
                          className="
                            text-red-400
                          "
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
                          gap-2
                          bg-white/5
                          hover:bg-blue-500/10
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                        "
                      >

                        <MessageCircle
                          size={18}
                          className="
                            text-sky-400
                          "
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
                          gap-2
                          bg-white/5
                          hover:bg-green-500/10
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
                          transition
                        "
                      >

                        <Share2
                          size={18}
                          className="
                            text-green-400
                          "
                        />

                        <span
                          className="
                            hidden
                            sm:inline
                            text-sm
                            font-bold
                          "
                        >
                          Share
                        </span>

                      </button>


                      {/* SAVE */}

                      <button
                        onClick={() =>
                          toggleSaveTrip(
                            trip.id
                          )
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          bg-white/5
                          hover:bg-yellow-500/10
                          border
                          border-white/10
                          px-4
                          py-3
                          rounded-full
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
                        onClick={() =>
                          requestToJoin(
                            trip
                          )
                        }
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

                        <Rocket
                          size={18}
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
                                  bg-black
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

                                  <span
                                    className="
                                      text-orange-500
                                      font-bold
                                      text-sm
                                    "
                                  >
                                    {comment.user}
                                  </span>

                                </div>

                                <p
                                  className="
                                    text-zinc-300
                                    text-sm
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
                          ).length === 0 && (

                            <p
                              className="
                                text-center
                                text-zinc-500
                                py-4
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

          })}


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

                <div className="text-6xl mb-5">
                  🏍️
                </div>

                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  No rides yet
                </h2>

                <p
                  className="
                    text-zinc-400
                    mt-2
                  "
                >
                  Be the first rider to
                  post a trip.
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

          <div className="text-center">

            <div className="text-5xl mb-4">
              🏍️
            </div>

            Loading...

          </div>

        </main>

      }
    >

      <FeedContent />

    </Suspense>

  );

}