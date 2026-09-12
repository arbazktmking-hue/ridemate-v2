"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  ShieldCheck,
  Send,
  MapPin,
  Loader2,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type AdminView = {
  active: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  startedAt?: number;
};

type GPSLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

/* =========================================================
   DEFAULT DESTINATION RADIUS
========================================================= */

const DEFAULT_DESTINATION_RADIUS_KM = 20;

/* =========================================================
   DISTANCE CALCULATOR
   Haversine formula
========================================================= */

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

/* =========================================================
   GET CURRENT GPS LOCATION
========================================================= */

function getCurrentGPSLocation(): Promise<GPSLocation> {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        reject(
          new Error(
            "Geolocation is not supported by this device/browser."
          )
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,

            accuracy:
              position.coords
                .accuracy,
          });
        },

        (error) => {
          reject(error);
        },

        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function TripChatPage() {
  const params = useParams();

  const tripId =
    params.tripId as string;

  /* =========================================================
     STATE
  ========================================================= */

  const [chat, setChat] =
    useState<any>(null);

  const [messages, setMessages] =
    useState<any[]>([]);

  const [message, setMessage] =
    useState("");

  const [rating, setRating] =
    useState(5);

  const [review, setReview] =
    useState("");

  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [adminView, setAdminView] =
    useState<AdminView | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [completingTrip, setCompletingTrip] =
    useState(false);

  /* =========================================================
     ADMIN INVESTIGATION MODE
  ========================================================= */

  const isAdminView =
    Boolean(
      adminView?.active &&
        adminView?.userName
    );

  /* =========================================================
     LOAD USER / ADMIN VIEW
  ========================================================= */

  useEffect(() => {
    try {
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
          parsedAdminView?.userName
        ) {
          setAdminView(
            parsedAdminView
          );

          setCurrentUser({
            uid:
              parsedAdminView.userId ||
              "",

            name:
              parsedAdminView.userName,

            email:
              parsedAdminView.userEmail ||
              "",

            image:
              parsedAdminView.userImage ||
              "",
          });

          return;
        }
      }

      const savedUser =
        localStorage.getItem(
          "ridemateUser"
        );

      if (savedUser) {
        setCurrentUser(
          JSON.parse(savedUser)
        );
      }
    } catch (error) {
      console.error(
        "Failed to load user:",
        error
      );
    }
  }, []);

  /* =========================================================
     LOAD CHAT
  ========================================================= */

  useEffect(() => {
    if (!tripId) {
      return;
    }

    loadChat();
  }, [tripId]);

  async function loadChat() {
    try {
      if (!tripId) {
        return;
      }

      const chatRef =
        doc(
          db,
          "tripChats",
          tripId
        );

      const snap =
        await getDoc(chatRef);

      if (snap.exists()) {
        setChat(
          snap.data()
        );
      }
    } catch (error) {
      console.error(
        "Failed to load trip chat:",
        error
      );
    }
  }

  /* =========================================================
     LOAD MESSAGES
  ========================================================= */

  useEffect(() => {
    if (!tripId) {
      return;
    }

    loadMessages();

    const interval =
      setInterval(
        loadMessages,
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [tripId]);

  async function loadMessages() {
    try {
      if (!tripId) {
        return;
      }

      const snapshot =
        await getDocs(
          collection(
            db,
            "tripChatMessages"
          )
        );

      const msgs: any[] =
        [];

      snapshot.forEach(
        (messageDoc) => {
          const data =
            messageDoc.data();

          if (
            data.tripId ===
            tripId
          ) {
            msgs.push(data);
          }
        }
      );

      msgs.sort(
        (a, b) =>
          (a.createdAt || 0) -
          (b.createdAt || 0)
      );

      setMessages(
        msgs
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "Failed to load trip chat messages:",
        error
      );

      setLoading(false);
    }
  }

  /* =========================================================
     CHECK EXISTING REVIEW
  ========================================================= */

  useEffect(() => {
    if (
      chat &&
      currentUser?.name
    ) {
      checkExistingReview();
    }
  }, [
    chat,
    currentUser,
  ]);

  async function checkExistingReview() {
    if (!tripId) {
      return;
    }

    if (!currentUser?.name) {
      return;
    }

    try {
      const snapshot =
        await getDocs(
          collection(
            db,
            "rideReviews"
          )
        );

      let found = false;

      snapshot.forEach(
        (reviewDoc) => {
          const data =
            reviewDoc.data();

          if (
            data.tripId ===
              tripId &&
            data.reviewer ===
              currentUser.name
          ) {
            found = true;
          }
        }
      );

      setAlreadyReviewed(
        found
      );
    } catch (error) {
      console.error(
        "Failed to check review:",
        error
      );
    }
  }

  /* =========================================================
     COMPLETE TRIP
  ========================================================= */

  async function completeTrip() {
    /*
     * ADMIN INVESTIGATION MODE
     * IS READ ONLY.
     */

    if (isAdminView) {
      alert(
        "Trip completion is disabled while using Admin Investigation Mode."
      );

      return;
    }

    if (!tripId) {
      return;
    }

    if (completingTrip) {
      return;
    }

    /*
    =========================================================
    GET TRIP ID
    =========================================================
    */

    const actualTripId =
      chat?.tripId || tripId;

    if (!actualTripId) {
      alert(
        "Unable to identify this trip."
      );

      return;
    }

    /*
    =========================================================
    GET TRIP DATA
    =========================================================
    */

    let tripData: any = null;

    try {
      const tripSnap =
        await getDoc(
          doc(
            db,
            "trips",
            actualTripId
          )
        );

      if (!tripSnap.exists()) {
        alert(
          "This trip could not be found."
        );

        return;
      }

      tripData =
        tripSnap.data();
    } catch (error) {
      console.error(
        "Failed to load trip:",
        error
      );

      alert(
        "Unable to verify the trip. Please try again."
      );

      return;
    }

    /*
    =========================================================
    OWNER PROTECTION
    =========================================================
    */

    if (
      tripData.userName &&
      currentUser?.name &&
      tripData.userName !==
        currentUser.name
    ) {
      alert(
        "Only the trip host can complete this trip."
      );

      return;
    }

    /*
    =========================================================
    CHECK DESTINATION COORDINATES
    =========================================================
    */

    const destinationLat =
      Number(
        tripData.destinationLat
      );

    const destinationLng =
      Number(
        tripData.destinationLng
      );

    const destinationRadiusKm =
      Number(
        tripData.destinationRadiusKm ||
          DEFAULT_DESTINATION_RADIUS_KM
      );

    if (
      !Number.isFinite(
        destinationLat
      ) ||
      !Number.isFinite(
        destinationLng
      )
    ) {
      alert(
        "❌ This trip does not have a verified destination location.\n\nPlease edit the trip and save it again so RideMate can verify the destination."
      );

      return;
    }

    /*
    =========================================================
    CONFIRMATION
    =========================================================
    */

    const confirmed =
      confirm(
        `RideMate will check your current GPS location to verify that you are within ${destinationRadiusKm} km of the trip destination.\n\nDestination: ${
          tripData.destination ||
          "Trip destination"
        }\n\nDo you want to continue?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingTrip(
        true
      );

      /*
      =======================================================
      GET CURRENT GPS
      =======================================================
      */

      let currentLocation:
        | GPSLocation
        | null = null;

      try {
        currentLocation =
          await getCurrentGPSLocation();
      } catch (gpsError: any) {
        console.error(
          "GPS error:",
          gpsError
        );

        if (
          gpsError?.code === 1
        ) {
          alert(
            "📍 Location permission was denied.\n\nPlease allow location access for RideMate and try again."
          );
        } else if (
          gpsError?.code === 2
        ) {
          alert(
            "📍 Your current location could not be determined.\n\nPlease make sure your device location/GPS is turned on and try again."
          );
        } else if (
          gpsError?.code === 3
        ) {
          alert(
            "📍 Location request timed out.\n\nPlease move to an area with better GPS signal and try again."
          );
        } else {
          alert(
            "📍 Unable to get your current location.\n\nPlease make sure location access is enabled and try again."
          );
        }

        return;
      }

      if (!currentLocation) {
        alert(
          "Unable to determine your current location."
        );

        return;
      }

      /*
      =======================================================
      CALCULATE DISTANCE
      =======================================================
      */

      const distanceFromDestination =
        calculateDistanceKm(
          currentLocation.latitude,
          currentLocation.longitude,
          destinationLat,
          destinationLng
        );

      console.log(
        "Destination:",
        {
          latitude:
            destinationLat,
          longitude:
            destinationLng,
        }
      );

      console.log(
        "Current GPS:",
        currentLocation
      );

      console.log(
        "Distance from destination:",
        distanceFromDestination,
        "km"
      );

      /*
      =======================================================
      GPS ACCURACY WARNING
      =======================================================
      */

      if (
        currentLocation.accuracy >
        1000
      ) {
        const retry =
          confirm(
            `⚠️ Your GPS accuracy is currently about ${Math.round(
              currentLocation.accuracy
            )} meters.\n\nRideMate may not be able to reliably verify your destination.\n\nWould you like to try again?`
          );

        if (retry) {
          return completeTrip();
        }

        return;
      }

      /*
      =======================================================
      DESTINATION CHECK
      =======================================================
      */

      if (
        distanceFromDestination >
        destinationRadiusKm
      ) {
        alert(
          `❌ Destination verification failed.\n\nYou are approximately ${distanceFromDestination.toFixed(
            1
          )} km from the saved destination.\n\nYou must be within ${destinationRadiusKm} km of ${
            tripData.destination ||
            "the destination"
          } to complete this trip.`
        );

        return;
      }

      /*
      =======================================================
      SUCCESS
      =======================================================
      */

      const locationMessage =
        `Current GPS is ${distanceFromDestination.toFixed(
          1
        )} km from the destination.`;

      const finalConfirmed =
        confirm(
          `✅ Destination verified!\n\n${locationMessage}\n\nGPS accuracy: approximately ${Math.round(
            currentLocation.accuracy
          )} m\n\nMark this trip as completed?`
        );

      if (!finalConfirmed) {
        return;
      }

      /*
      =======================================================
      MARK CHAT AS COMPLETED
      =======================================================
      */

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          completed: true,
          reviewedUsers: [],
          completionVerified: true,
          completionLatitude:
            currentLocation.latitude,
          completionLongitude:
            currentLocation.longitude,
          completionAccuracy:
            currentLocation.accuracy,
          completionDistanceKm:
            distanceFromDestination,
          completionVerifiedAt:
            Date.now(),
        }
      );

      /*
      =======================================================
      MARK TRIP AS COMPLETED
      =======================================================
      */

      await updateDoc(
        doc(
          db,
          "trips",
          actualTripId
        ),
        {
          status: "completed",

          completionVerified:
            true,

          completionLatitude:
            currentLocation.latitude,

          completionLongitude:
            currentLocation.longitude,

          completionAccuracy:
            currentLocation.accuracy,

          completionDistanceKm:
            distanceFromDestination,

          completionVerifiedAt:
            Date.now(),
        }
      );

      await loadChat();

      alert(
        `🏁 Trip marked as completed!\n\n📍 Destination verified\n📏 Distance: ${distanceFromDestination.toFixed(
          1
        )} km`
      );
    } catch (error) {
      console.error(
        "Failed to complete trip:",
        error
      );

      alert(
        "Failed to complete the trip. Please try again."
      );
    } finally {
      setCompletingTrip(
        false
      );
    }
  }

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  async function sendMessage() {
    if (isAdminView) {
      alert(
        "Messaging is disabled while using Admin Investigation Mode."
      );

      return;
    }

    if (!currentUser?.name) {
      return;
    }

    if (!message.trim()) {
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "tripChatMessages"
        ),
        {
          tripId,

          sender:
            currentUser.name,

          text:
            message.trim(),

          createdAt:
            Date.now(),
        }
      );

      setMessage("");

      await loadMessages();
    } catch (error) {
      console.error(
        "Failed to send message:",
        error
      );

      alert(
        "Failed to send message. Please try again."
      );
    }
  }

  /* =========================================================
     SUBMIT REVIEW
  ========================================================= */

  async function submitReview() {
    if (isAdminView) {
      alert(
        "Review submission is disabled while using Admin Investigation Mode."
      );

      return;
    }

    if (alreadyReviewed) {
      alert(
        "You have already reviewed this ride."
      );

      return;
    }

    if (!chat || !tripId) {
      return;
    }

    if (!currentUser?.name) {
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "rideReviews"
        ),
        {
          tripId,

          rider:
            chat.owner,

          reviewer:
            currentUser.name,

          rating,

          review:
            review.trim(),

          createdAt:
            Date.now(),
        }
      );

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          reviewedUsers:
            arrayUnion(
              currentUser.name
            ),
        }
      );

      setAlreadyReviewed(
        true
      );

      alert(
        "⭐ Review submitted successfully!"
      );
    } catch (error) {
      console.error(
        "Failed to submit review:",
        error
      );

      alert(
        "Failed to submit review. Please try again."
      );
    }
  }

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (
    !chat ||
    !currentUser?.name
  ) {
    return (
      <main
        className="
          min-h-screen
          bg-black
          text-white
          flex
          items-center
          justify-center
          p-6
        "
      >
        Loading...
      </main>
    );
  }

  /* =========================================================
     RENDER
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
      <div
        className="
          max-w-4xl
          mx-auto
          pt-16
          sm:pt-20
        "
      >

        {/* =================================================
            ADMIN INVESTIGATION NOTICE
        ================================================= */}

        {isAdminView && (
          <div
            className="
              mb-6
              rounded-2xl
              border
              border-orange-500/30
              bg-orange-500/10
              px-4
              py-4
              flex
              items-start
              gap-3
            "
          >
            <ShieldCheck
              size={22}
              className="
                text-orange-500
                flex-shrink-0
                mt-0.5
              "
            />

            <div>
              <p
                className="
                  text-orange-400
                  font-black
                  text-sm
                "
              >
                🛡️ INVESTIGATION MODE
              </p>

              <p
                className="
                  text-zinc-300
                  text-sm
                  mt-1
                "
              >
                Viewing{" "}
                <span
                  className="
                    text-white
                    font-bold
                  "
                >
                  {adminView?.userName}
                </span>
                's Live Trip Chat.
              </p>

              <p
                className="
                  text-zinc-500
                  text-xs
                  mt-1
                "
              >
                Read-only investigation mode. Messages,
                trip completion, and reviews cannot be changed.
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            TRIP HEADER
        ================================================= */}

        <h1
          className="
            text-4xl
            sm:text-5xl
            font-black
            text-orange-500
          "
        >
          🏍 {chat.destination}
        </h1>

        <p
          className="
            text-zinc-400
            mt-2
          "
        >
          Live Trip Chat
        </p>

        {/* =================================================
            CHAT CONTAINER
        ================================================= */}

        <div
          className="
            mt-6
            bg-zinc-900
            rounded-3xl
            p-4
            sm:p-5
            h-[70vh]
            flex
            flex-col
            border
            border-zinc-800
          "
        >

          {/* =================================================
              MESSAGES
          ================================================= */}

          <div
            className="
              flex-1
              overflow-y-auto
              space-y-3
              pr-1
            "
          >
            {loading && (
              <div
                className="
                  h-full
                  flex
                  items-center
                  justify-center
                  text-zinc-500
                "
              >
                Loading messages...
              </div>
            )}

            {!loading &&
              messages.length === 0 && (
                <div
                  className="
                    h-full
                    flex
                    items-center
                    justify-center
                    text-zinc-500
                    text-sm
                    text-center
                  "
                >
                  No messages in this trip chat yet.
                </div>
              )}

            {!loading &&
              messages.map(
                (msg, index) => (
                  <div
                    key={index}
                    className={`
                      max-w-[75%]
                      p-3
                      rounded-2xl
                      ${
                        msg.sender ===
                        currentUser.name
                          ? "ml-auto bg-orange-500 text-black"
                          : "bg-zinc-800"
                      }
                    `}
                  >
                    <div
                      className="
                        text-xs
                        font-bold
                        mb-1
                      "
                    >
                      {msg.sender}
                    </div>

                    <div>
                      {msg.text}
                    </div>
                  </div>
                )
              )}
          </div>

          {/* =================================================
              BOTTOM ACTION AREA
          ================================================= */}

          <div
            className="
              mt-4
              space-y-3
            "
          >

            {/* =================================================
                COMPLETED TRIP
            ================================================= */}

            {chat.completed ? (
              <div
                className="
                  bg-green-900
                  text-green-300
                  p-4
                  rounded-xl
                  text-center
                  font-bold
                "
              >
                🏁 This trip has been completed.

                {/* =========================================
                    ADMIN MODE — REVIEW READ ONLY
                ========================================= */}

                {isAdminView && (
                  <div
                    className="
                      mt-4
                      bg-black/20
                      border
                      border-orange-500/20
                      p-3
                      rounded-xl
                      text-orange-400
                      text-sm
                    "
                  >
                    🛡️ Review submission is disabled in
                    Investigation Mode.
                  </div>
                )}

                {/* =========================================
                    NORMAL PASSENGER REVIEW
                ========================================= */}

                {!isAdminView &&
                  currentUser.name !==
                    chat.owner &&
                  !alreadyReviewed && (
                    <div
                      className="
                        mt-4
                        bg-zinc-800
                        p-4
                        rounded-xl
                        space-y-3
                        text-left
                      "
                    >
                      <h2
                        className="
                          font-bold
                          text-orange-400
                        "
                      >
                        ⭐ Rate Your Rider
                      </h2>

                      <select
                        value={rating}
                        onChange={(e) =>
                          setRating(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="
                          w-full
                          p-3
                          rounded-lg
                          bg-black
                        "
                      >
                        <option value={5}>
                          ⭐⭐⭐⭐⭐
                        </option>

                        <option value={4}>
                          ⭐⭐⭐⭐
                        </option>

                        <option value={3}>
                          ⭐⭐⭐
                        </option>

                        <option value={2}>
                          ⭐⭐
                        </option>

                        <option value={1}>
                          ⭐
                        </option>
                      </select>

                      <textarea
                        value={review}
                        onChange={(e) =>
                          setReview(
                            e.target.value
                          )
                        }
                        placeholder="Share your experience..."
                        className="
                          w-full
                          p-3
                          rounded-lg
                          bg-black
                        "
                      />

                      <button
                        onClick={
                          submitReview
                        }
                        className="
                          w-full
                          bg-orange-500
                          text-black
                          font-bold
                          py-3
                          rounded-xl
                          hover:bg-orange-400
                          transition
                        "
                      >
                        Submit Review
                      </button>
                    </div>
                  )}

                {/* =========================================
                    ALREADY REVIEWED
                ========================================= */}

                {!isAdminView &&
                  currentUser.name !==
                    chat.owner &&
                  alreadyReviewed && (
                    <div
                      className="
                        mt-4
                        bg-zinc-800
                        p-3
                        rounded-xl
                        text-zinc-400
                        text-sm
                      "
                    >
                      ⭐ You have already reviewed this ride.
                    </div>
                  )}
              </div>
            ) : (
              /* =================================================
                 ACTIVE TRIP
              ================================================= */

              <>
                {/* =============================================
                    ADMIN MODE — NO MESSAGE INPUT
                ============================================= */}

                {isAdminView ? (
                  <div
                    className="
                      bg-orange-500/5
                      border
                      border-orange-500/20
                      rounded-xl
                      p-4
                      text-center
                    "
                  >
                    <p
                      className="
                        text-orange-400
                        font-bold
                        text-sm
                      "
                    >
                      🛡️ Read-only investigation
                    </p>

                    <p
                      className="
                        text-zinc-500
                        text-xs
                        mt-1
                      "
                    >
                      Sending messages is disabled while
                      investigating this trip chat.
                    </p>
                  </div>
                ) : (
                  /* =========================================
                     NORMAL MESSAGE INPUT
                  ========================================= */

                  <div
                    className="
                      flex
                      gap-3
                    "
                  >
                    <input
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key ===
                          "Enter"
                        ) {
                          sendMessage();
                        }
                      }}
                      placeholder="Type message..."
                      className="
                        flex-1
                        p-3
                        rounded-xl
                        bg-zinc-800
                        border
                        border-zinc-700
                        outline-none
                        focus:border-orange-500
                      "
                    />

                    <button
                      onClick={
                        sendMessage
                      }
                      className="
                        bg-orange-500
                        px-5
                        sm:px-6
                        rounded-xl
                        font-bold
                        text-black
                        flex
                        items-center
                        gap-2
                        hover:bg-orange-400
                        transition
                      "
                    >
                      <Send
                        size={18}
                      />

                      <span>
                        Send
                      </span>
                    </button>
                  </div>
                )}

                {/* =============================================
                    COMPLETE TRIP BUTTON
                ============================================= */}

                {!isAdminView &&
                  currentUser.name ===
                    chat.owner && (
                    <button
                      onClick={
                        completeTrip
                      }
                      disabled={
                        completingTrip
                      }
                      className="
                        w-full
                        bg-green-600
                        hover:bg-green-500
                        py-3
                        rounded-xl
                        font-bold
                        transition
                        disabled:opacity-60
                        disabled:cursor-not-allowed
                        flex
                        items-center
                        justify-center
                        gap-2
                      "
                    >
                      {completingTrip ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />

                          <span>
                            Verifying GPS Location...
                          </span>
                        </>
                      ) : (
                        <>
                          <MapPin
                            size={18}
                          />

                          <span>
                            🏁 Trip Completed
                          </span>
                        </>
                      )}
                    </button>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}