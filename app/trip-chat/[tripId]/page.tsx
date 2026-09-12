"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  Send,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const DEFAULT_DESTINATION_RADIUS_KM = 20;
const MAX_RIDER_PILLION_DISTANCE_METERS = 50;
const MAX_ACCEPTABLE_GPS_ACCURACY_METERS = 1000;

type UserInfo = {
  uid: string;
  name: string;
  email?: string;
  image?: string;
};

type ChatData = {
  owner?: string;
  ownerUid?: string;
  participants?: string[];
  participantNames?: string[];
  tripId?: string;

  completed?: boolean;

  completionRequested?: boolean;
  completionPillionName?: string;

  completionRiderLatitude?: number;
  completionRiderLongitude?: number;
  completionRiderAccuracy?: number;
  completionRiderDistanceKm?: number;

  completionPillionConfirmed?: boolean;
  completionPillionLatitude?: number;
  completionPillionLongitude?: number;
  completionPillionAccuracy?: number;
  completionPillionDistanceKm?: number;

  completionRiderPillionDistanceMeters?: number;
  completionVerified?: boolean;
  completionVerifiedAt?: number;

  reviewedUsers?: string[];

  messages?: {
    sender?: string;
    senderUid?: string;
    text?: string;
    createdAt?: number;
  }[];
};

type TripData = {
  id: string;
  status?: string;

  destination?: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationRadiusKm?: number;

  userName?: string;
  userImage?: string;

  tripDate?: string;

  completionRequested?: boolean;
  completionPillionName?: string;

  completionRiderLatitude?: number;
  completionRiderLongitude?: number;
  completionRiderAccuracy?: number;
  completionRiderDistanceKm?: number;

  completionPillionConfirmed?: boolean;
  completionPillionLatitude?: number;
  completionPillionLongitude?: number;
  completionPillionAccuracy?: number;
  completionPillionDistanceKm?: number;

  completionRiderPillionDistanceMeters?: number;
  completionVerified?: boolean;
  completionVerifiedAt?: number;
};

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function getCurrentGPSLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Unable to get your current GPS location.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access and try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "Your current location is unavailable. Please make sure GPS/location services are enabled.";
        } else if (error.code === error.TIMEOUT) {
          message =
            "GPS took too long to respond. Please move to an area with better GPS signal and try again.";
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  });
}

export default function TripChatPage() {
  const params = useParams();
  const router = useRouter();

  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [adminView, setAdminView] = useState(false);

  const [chat, setChat] = useState<ChatData | null>(null);
  const [trip, setTrip] = useState<TripData | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const [completionLoading, setCompletionLoading] = useState(false);

  const [completionRequested, setCompletionRequested] = useState(false);
  const [completionPillionName, setCompletionPillionName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ------------------------------------------------------------
  // LOAD CURRENT USER
  // ------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const adminSession = localStorage.getItem("ridemateAdminView");

      if (adminSession) {
        const parsed = JSON.parse(adminSession);

        if (parsed?.active) {
          setAdminView(true);

          setCurrentUser({
            uid: parsed.userId || "",
            name: parsed.userName || "",
            email: parsed.userEmail || "",
            image: parsed.userImage || "",
          });

          return;
        }
      }

      const storedUser = localStorage.getItem("ridemateUser");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        setCurrentUser({
          uid: parsed.uid || "",
          name: parsed.name || parsed.userName || "",
          email: parsed.email || "",
          image: parsed.image || parsed.userImage || "",
        });
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  }, []);

  // ------------------------------------------------------------
  // LOAD TRIP + CHAT
  // ------------------------------------------------------------

  const loadTripAndChat = async () => {
    if (!tripId) return;

    try {
      const chatRef = doc(db, "tripChats", tripId);
      const chatSnap = await getDoc(chatRef);

      let chatData: ChatData = {};

      if (chatSnap.exists()) {
        chatData = chatSnap.data() as ChatData;
      }

      setChat(chatData);

      // IMPORTANT:
      // The trip document is the source of truth for completion.
      const actualTripId = chatData.tripId || tripId;

      const tripRef = doc(db, "trips", actualTripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        setTrip({
          id: actualTripId,
          ...(tripSnap.data() as Omit<TripData, "id">),
        });
      } else {
        setTrip(null);
      }

      updateCompletionState(chatData, tripSnap.exists() ? tripSnap.data() : null);
    } catch (error) {
      console.error("Error loading trip/chat:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tripId) return;

    loadTripAndChat();

    const interval = setInterval(() => {
      loadTripAndChat();
    }, 1000);

    return () => clearInterval(interval);
  }, [tripId]);

  // ------------------------------------------------------------
  // COMPLETION STATE
  // ------------------------------------------------------------

  const updateCompletionState = (
    chatData: ChatData,
    tripData: any | null
  ) => {
    /*
     * IMPORTANT:
     *
     * Do NOT use the tripDate to determine whether the ride is completed.
     *
     * Only:
     *
     * trips/{tripId}.status === "completed"
     *
     * means the ride is actually completed.
     */

    const actualTripCompleted = tripData?.status === "completed";

    if (actualTripCompleted) {
      setCompletionRequested(false);
      setCompletionPillionName("");
      return;
    }

    const requested =
      tripData?.completionRequested === true ||
      chatData?.completionRequested === true;

    if (requested) {
      setCompletionRequested(true);

      const pillionName =
        tripData?.completionPillionName ||
        chatData?.completionPillionName ||
        "";

      setCompletionPillionName(pillionName);

      return;
    }

    setCompletionRequested(false);
    setCompletionPillionName("");
  };

  // ------------------------------------------------------------
  // AUTO SCROLL
  // ------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat?.messages?.length]);

  // ------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------

  const sendMessage = async () => {
    if (!currentUser || adminView) return;

    const text = message.trim();

    if (!text || !tripId || sending) return;

    setSending(true);

    try {
      const chatRef = doc(db, "tripChats", tripId);

      await updateDoc(chatRef, {
        messages: arrayUnion({
          sender: currentUser.name,
          senderUid: currentUser.uid,
          text,
          createdAt: Date.now(),
        }),
      });

      setMessage("");

      await loadTripAndChat();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Unable to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ------------------------------------------------------------
  // FIND PILLION
  // ------------------------------------------------------------

  const findPillionForTrip = async (
    actualTripId: string
  ): Promise<string | null> => {
    try {
      /*
       * First inspect the trip chat.
       */

      if (chat) {
        const possibleParticipants = [
          ...(chat.participants || []),
          ...(chat.participantNames || []),
        ].filter(Boolean);

        if (currentUser?.name) {
          const otherParticipant = possibleParticipants.find(
            (name) => name !== currentUser.name
          );

          if (otherParticipant) {
            return otherParticipant;
          }
        }
      }

      /*
       * Then inspect approved ride requests.
       */

      const requestsQuery = query(
        collection(db, "rideRequests"),
        where("tripId", "==", actualTripId)
      );

      const requestsSnap = await getDocs(requestsQuery);

      const acceptedStatuses = [
        "approved",
        "accepted",
        "confirmed",
      ];

      for (const requestDoc of requestsSnap.docs) {
        const data = requestDoc.data();

        const status = String(data.status || "").toLowerCase();

        const accepted =
          acceptedStatuses.includes(status) ||
          data.approved === true ||
          data.accepted === true ||
          data.confirmed === true;

        if (!accepted) continue;

        const possibleName =
          data.userName ||
          data.username ||
          data.name ||
          data.requesterName ||
          data.riderName ||
          data.passengerName;

        if (
          possibleName &&
          possibleName !== currentUser?.name
        ) {
          return possibleName;
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding pillion:", error);
      return null;
    }
  };

  // ------------------------------------------------------------
  // REQUEST TRIP COMPLETION — HOST
  // ------------------------------------------------------------

  const requestTripCompletion = async () => {
    if (!currentUser || adminView) return;

    if (!tripId) return;

    if (!chat) {
      alert("Trip chat could not be loaded.");
      return;
    }

    setCompletionLoading(true);

    try {
const actualTripId = trip?.id || chat.tripId || tripId;      /*
       * ALWAYS reload the trip from Firestore before completion.
       * This prevents stale UI state from being used.
       */

      const tripRef = doc(db, "trips", actualTripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        alert("Trip could not be found.");
        return;
      }

      const freshTrip = {
        id: actualTripId,
        ...(tripSnap.data() as Omit<TripData, "id">),
      };

      setTrip(freshTrip);

      /*
       * IMPORTANT:
       * Only Firestore status === completed means completed.
       */

      if (freshTrip.status === "completed") {
        alert("This trip has already been completed.");
        await loadTripAndChat();
        return;
      }

      if (freshTrip.completionRequested === true) {
        alert("Trip completion has already been requested.");
        await loadTripAndChat();
        return;
      }

      /*
       * Verify host.
       */

      const hostName =
        freshTrip.userName ||
        chat.owner ||
        "";

      if (
        hostName &&
        currentUser.name !== hostName
      ) {
        alert(
          "Only the trip host can request trip completion."
        );
        return;
      }

      /*
       * Find pillion.
       */

      const pillionName =
        await findPillionForTrip(actualTripId);

      if (!pillionName) {
        alert(
          "No approved pillion was found for this trip. The host cannot complete the trip until an approved pillion is connected."
        );
        return;
      }

      /*
       * Destination coordinates.
       */

      const destinationLat = Number(
        freshTrip.destinationLat
      );

      const destinationLng = Number(
        freshTrip.destinationLng
      );

      if (
        !Number.isFinite(destinationLat) ||
        !Number.isFinite(destinationLng)
      ) {
        alert(
          "This trip does not have valid destination GPS coordinates. Please edit and save the trip destination again."
        );
        return;
      }

      const destinationRadiusKm =
        Number(
          freshTrip.destinationRadiusKm
        ) || DEFAULT_DESTINATION_RADIUS_KM;

      const destinationName =
        freshTrip.destination ||
        "the selected destination";

      const confirmed = window.confirm(
        `Request trip completion?\n\nDestination: ${destinationName}\n\nYour GPS location will be checked. You must be within ${destinationRadiusKm} km of the destination.\n\nThe approved pillion will then need to confirm from their own GPS location and be within 50 metres of you.`
      );

      if (!confirmed) return;

      /*
       * Get HOST GPS.
       */

      let hostGPS;

      try {
        hostGPS = await getCurrentGPSLocation();
      } catch (error: any) {
        alert(error?.message || "Unable to get your GPS location.");
        return;
      }

      /*
       * GPS accuracy check.
       */

      if (
        hostGPS.accuracy >
        MAX_ACCEPTABLE_GPS_ACCURACY_METERS
      ) {
        alert(
          `Your GPS accuracy is currently about ${Math.round(
            hostGPS.accuracy
          )} metres.\n\nFor trip verification, your GPS accuracy must be ${MAX_ACCEPTABLE_GPS_ACCURACY_METERS} metres or better.\n\nPlease move to an open area and try again.`
        );
        return;
      }

      /*
       * HOST → DESTINATION distance.
       */

      const hostDistanceKm =
        calculateDistanceKm(
          hostGPS.latitude,
          hostGPS.longitude,
          destinationLat,
          destinationLng
        );

      if (hostDistanceKm > destinationRadiusKm) {
        alert(
          `You are approximately ${hostDistanceKm.toFixed(
            2
          )} km from the selected destination.\n\nYou must be within ${destinationRadiusKm} km of ${destinationName} to request trip completion.`
        );
        return;
      }

      /*
       * Save completion request.
       */

      const completionData = {
        completionRequested: true,
        completionPillionName: pillionName,

        completionRiderLatitude: hostGPS.latitude,
        completionRiderLongitude: hostGPS.longitude,
        completionRiderAccuracy: hostGPS.accuracy,
        completionRiderDistanceKm: hostDistanceKm,

        completionRequestedAt: Date.now(),
      };

      await updateDoc(tripRef, completionData);

      const chatRef = doc(db, "tripChats", tripId);

      await updateDoc(chatRef, completionData);

      await loadTripAndChat();

      alert(
        `Trip completion request sent to ${pillionName}.\n\nYour GPS was verified at ${hostDistanceKm.toFixed(
          2
        )} km from the destination.`
      );
    } catch (error) {
      console.error(
        "Error requesting trip completion:",
        error
      );

      alert(
        "Something went wrong while requesting trip completion."
      );
    } finally {
      setCompletionLoading(false);
    }
  };

  // ------------------------------------------------------------
  // CONFIRM TRIP COMPLETION — PILLION
  // ------------------------------------------------------------

  const confirmTripCompletion = async () => {
    if (!currentUser || adminView) return;

    if (!tripId) return;

    setCompletionLoading(true);

    try {
      const chatRef = doc(db, "tripChats", tripId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        alert("Trip chat could not be found.");
        return;
      }

      const freshChat = chatSnap.data() as ChatData;

      const actualTripId =
        freshChat.tripId || tripId;

      const tripRef = doc(db, "trips", actualTripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        alert("Trip could not be found.");
        return;
      }

      const freshTrip = {
        id: actualTripId,
        ...(tripSnap.data() as Omit<TripData, "id">),
      };

      setTrip(freshTrip);

      /*
       * Check actual trip status first.
       */

      if (freshTrip.status === "completed") {
        alert("This trip has already been completed.");
        await loadTripAndChat();
        return;
      }

      /*
       * Completion must have been requested by host.
       */

      const requestExists =
        freshTrip.completionRequested === true ||
        freshChat.completionRequested === true;

      if (!requestExists) {
        alert(
          "The host has not requested trip completion yet."
        );
        return;
      }

      /*
       * Verify this is the requested pillion.
       */

      const requestedPillion =
        freshTrip.completionPillionName ||
        freshChat.completionPillionName ||
        "";

      if (
        requestedPillion &&
        requestedPillion !== currentUser.name
      ) {
        alert(
          "Only the approved pillion selected for this completion request can confirm the trip."
        );
        return;
      }

      /*
       * Destination coordinates.
       */

      const destinationLat = Number(
        freshTrip.destinationLat
      );

      const destinationLng = Number(
        freshTrip.destinationLng
      );

      if (
        !Number.isFinite(destinationLat) ||
        !Number.isFinite(destinationLng)
      ) {
        alert(
          "This trip does not have valid destination GPS coordinates."
        );
        return;
      }

      const destinationRadiusKm =
        Number(
          freshTrip.destinationRadiusKm
        ) || DEFAULT_DESTINATION_RADIUS_KM;

      const destinationName =
        freshTrip.destination ||
        "the selected destination";

      /*
       * HOST GPS saved during completion request.
       */

      const riderLatitude = Number(
        freshTrip.completionRiderLatitude ??
          freshChat.completionRiderLatitude
      );

      const riderLongitude = Number(
        freshTrip.completionRiderLongitude ??
          freshChat.completionRiderLongitude
      );

      const riderAccuracy = Number(
        freshTrip.completionRiderAccuracy ??
          freshChat.completionRiderAccuracy
      );

      if (
        !Number.isFinite(riderLatitude) ||
        !Number.isFinite(riderLongitude)
      ) {
        alert(
          "The host's GPS verification data could not be found. Please ask the host to request completion again."
        );
        return;
      }

      const confirmed = window.confirm(
        `Confirm trip completion?\n\nYour GPS location will be checked against ${destinationName}.\n\nYou must be within ${destinationRadiusKm} km of the destination and within 50 metres of the host.`
      );

      if (!confirmed) return;

      /*
       * Get PILLION GPS.
       */

      let pillionGPS;

      try {
        pillionGPS =
          await getCurrentGPSLocation();
      } catch (error: any) {
        alert(
          error?.message ||
            "Unable to get your GPS location."
        );
        return;
      }

      /*
       * PILLION GPS accuracy.
       */

      if (
        pillionGPS.accuracy >
        MAX_ACCEPTABLE_GPS_ACCURACY_METERS
      ) {
        alert(
          `Your GPS accuracy is currently about ${Math.round(
            pillionGPS.accuracy
          )} metres.\n\nFor trip verification, your GPS accuracy must be ${MAX_ACCEPTABLE_GPS_ACCURACY_METERS} metres or better.\n\nPlease move to an open area and try again.`
        );
        return;
      }

      /*
       * PILLION → DESTINATION
       */

      const pillionDistanceKm =
        calculateDistanceKm(
          pillionGPS.latitude,
          pillionGPS.longitude,
          destinationLat,
          destinationLng
        );

      if (pillionDistanceKm > destinationRadiusKm) {
        alert(
          `You are approximately ${pillionDistanceKm.toFixed(
            2
          )} km from the selected destination.\n\nYou must be within ${destinationRadiusKm} km of ${destinationName} to confirm trip completion.`
        );
        return;
      }

      /*
       * HOST ↔ PILLION
       */

      const riderPillionDistanceKm =
        calculateDistanceKm(
          riderLatitude,
          riderLongitude,
          pillionGPS.latitude,
          pillionGPS.longitude
        );

      const riderPillionDistanceMeters =
        riderPillionDistanceKm * 1000;

      if (
        riderPillionDistanceMeters >
        MAX_RIDER_PILLION_DISTANCE_METERS
      ) {
        alert(
          `You and the host are approximately ${Math.round(
            riderPillionDistanceMeters
          )} metres apart.\n\nYou must be within ${MAX_RIDER_PILLION_DISTANCE_METERS} metres of each other to complete the trip.\n\nPlease move closer to the host and try again.`
        );
        return;
      }

      /*
       * FINAL CONFIRMATION
       */

      const finalConfirm = window.confirm(
        `GPS verification successful.\n\nDestination distance: ${pillionDistanceKm.toFixed(
          2
        )} km\nDistance from host: ${Math.round(
          riderPillionDistanceMeters
        )} m\n\nMark this trip as COMPLETED?`
      );

      if (!finalConfirm) return;

      /*
       * Final completion data.
       */

      const completionData = {
        status: "completed",

        completionRequested: false,

        completionPillionConfirmed: true,
        completionPillionName: currentUser.name,

        completionPillionLatitude:
          pillionGPS.latitude,
        completionPillionLongitude:
          pillionGPS.longitude,
        completionPillionAccuracy:
          pillionGPS.accuracy,

        completionPillionDistanceKm:
          pillionDistanceKm,

        completionRiderPillionDistanceMeters:
          riderPillionDistanceMeters,

        completionVerified: true,
        completionVerifiedAt: Date.now(),
      };

      /*
       * Update actual TRIP first.
       *
       * My Rides uses this status.
       */

      await updateDoc(tripRef, completionData);

      /*
       * Update Trip Chat.
       */

      await updateDoc(chatRef, {
        completed: true,
        completionRequested: false,

        completionPillionConfirmed: true,
        completionPillionName: currentUser.name,

        completionPillionLatitude:
          pillionGPS.latitude,
        completionPillionLongitude:
          pillionGPS.longitude,
        completionPillionAccuracy:
          pillionGPS.accuracy,

        completionPillionDistanceKm:
          pillionDistanceKm,

        completionRiderPillionDistanceMeters:
          riderPillionDistanceMeters,

        completionVerified: true,
        completionVerifiedAt: Date.now(),

        reviewedUsers: [],
      });

      await loadTripAndChat();

      alert(
        "Trip completed successfully! 🎉\n\nBoth GPS locations were verified."
      );
    } catch (error) {
      console.error(
        "Error confirming trip completion:",
        error
      );

      alert(
        "Something went wrong while confirming trip completion."
      );
    } finally {
      setCompletionLoading(false);
    }
  };

  // ------------------------------------------------------------
  // BACK
  // ------------------------------------------------------------

  const goBack = () => {
    router.back();
  };

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3">🏍️</div>
          <p className="text-zinc-400">
            Loading trip chat...
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // NO CHAT
  // ------------------------------------------------------------

  if (!chat) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={40} />

          <h1 className="text-xl font-bold mb-2">
            Trip chat not found
          </h1>

          <p className="text-zinc-400 text-sm mb-6">
            This trip chat could not be loaded.
          </p>

          <button
            onClick={goBack}
            className="px-5 py-2.5 rounded-xl bg-orange-500 text-black font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // REAL COMPLETION STATE
  // ------------------------------------------------------------

  const isTripCompleted =
    trip?.status === "completed";

  const isHost =
    !!currentUser &&
    !!trip?.userName &&
    currentUser.name === trip.userName;

  const isRequestedPillion =
    !!currentUser &&
    !!completionPillionName &&
    currentUser.name === completionPillionName;

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ADMIN NOTICE */}

      {adminView && (
        <div className="bg-orange-500 text-black px-4 py-2 text-center text-xs sm:text-sm font-semibold">
          🛡️ ADMIN INVESTIGATION MODE — READ ONLY
        </div>
      )}

      {/* HEADER */}

      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-full hover:bg-zinc-800 transition"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">
              Trip Chat
            </h1>

            {trip?.destination && (
              <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                <MapPin size={12} className="text-orange-500 shrink-0" />
                {trip.destination}
              </p>
            )}
          </div>

          {isTripCompleted && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
              <CheckCircle2 size={17} />
              Completed
            </div>
          )}
        </div>
      </header>

      {/* TRIP COMPLETION SECTION */}

      <div className="max-w-3xl w-full mx-auto px-4 pt-4">
        {/* SAFETY NOTICE */}

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 mb-3">
          <p className="text-zinc-600 text-[11px] sm:text-xs flex items-center gap-1.5">
            <span className="text-yellow-500">
              ⚠️
            </span>

            <span className="text-zinc-400">
              Do not exchange personal details or financial information until the trip has started.
            </span>
          </p>
        </div>

        {/* COMPLETED */}

        {isTripCompleted && (
          <div className="rounded-2xl border border-green-900/60 bg-green-950/20 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle2
                  size={25}
                  className="text-green-400"
                />
              </div>

              <div>
                <h2 className="font-bold text-green-400">
                  Trip Completed
                </h2>

                <p className="text-sm text-zinc-400 mt-1">
                  This trip has been successfully verified.
                </p>

                {trip?.completionVerifiedAt && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Verified on{" "}
                    {new Date(
                      trip.completionVerifiedAt
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPLETION REQUESTED */}

        {!isTripCompleted &&
          completionRequested && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Clock
                    size={24}
                    className="text-orange-400"
                  />
                </div>

                <div className="flex-1">
                  <h2 className="font-bold text-orange-400">
                    Trip Completion Requested
                  </h2>

                  <p className="text-sm text-zinc-400 mt-1">
                    {completionPillionName
                      ? `${completionPillionName} needs to confirm the trip from their current GPS location.`
                      : "Waiting for the pillion to confirm the trip."}
                  </p>

                  {isRequestedPillion &&
                    !adminView && (
                      <button
                        onClick={confirmTripCompletion}
                        disabled={completionLoading}
                        className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-500 text-black font-bold hover:bg-orange-400 disabled:opacity-50 transition"
                      >
                        {completionLoading
                          ? "Verifying GPS..."
                          : "📍 Confirm Trip Completion"}
                      </button>
                    )}

                  {isHost && !isRequestedPillion && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                      <Clock size={14} />
                      Waiting for pillion confirmation
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* HOST REQUEST BUTTON */}

        {!isTripCompleted &&
          !completionRequested &&
          isHost &&
          !adminView && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <MapPin
                    size={24}
                    className="text-orange-500"
                  />
                </div>

                <div className="flex-1">
                  <h2 className="font-bold">
                    Ready to complete the trip?
                  </h2>

                  <p className="text-sm text-zinc-400 mt-1">
                    Your GPS must be within{" "}
                    {trip?.destinationRadiusKm ||
                      DEFAULT_DESTINATION_RADIUS_KM}{" "}
                    km of the destination. The pillion will then verify their GPS location.
                  </p>

                  <button
                    onClick={requestTripCompletion}
                    disabled={completionLoading}
                    className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-500 text-black font-bold hover:bg-orange-400 disabled:opacity-50 transition"
                  >
                    {completionLoading
                      ? "Checking GPS..."
                      : "🏁 Request Trip Completion"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* NON-HOST / NO REQUEST */}

        {!isTripCompleted &&
          !completionRequested &&
          !isHost && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={21}
                  className="text-zinc-500"
                />

                <p className="text-sm text-zinc-400">
                  The trip host can request completion once the ride reaches the destination.
                </p>
              </div>
            </div>
          )}

        {/* ADMIN */}

        {adminView && !isTripCompleted && (
          <div className="rounded-2xl border border-orange-500/20 bg-orange-950/10 p-4 mt-3">
            <p className="text-xs text-orange-300">
              🛡️ Completion controls are disabled while investigating this user's account.
            </p>
          </div>
        )}
      </div>

      {/* MESSAGES */}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5">
        <div className="space-y-3">
          {(chat.messages || []).map(
            (msg, index) => {
              const mine =
                currentUser?.name &&
                msg.sender === currentUser.name;

              return (
                <div
                  key={`${msg.createdAt || index}-${index}`}
                  className={`flex ${
                    mine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                      mine
                        ? "bg-orange-500 text-black rounded-br-md"
                        : "bg-zinc-900 text-white rounded-bl-md"
                    }`}
                  >
                    {!mine && (
                      <p className="text-xs font-semibold text-orange-400 mb-1">
                        {msg.sender || "User"}
                      </p>
                    )}

                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    {msg.createdAt && (
                      <p
                        className={`text-[10px] mt-1.5 ${
                          mine
                            ? "text-black/60"
                            : "text-zinc-500"
                        }`}
                      >
                        {new Date(
                          msg.createdAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            }
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* MESSAGE INPUT */}

      {!adminView && !isTripCompleted && (
        <div className="sticky bottom-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />

              <button
                onClick={sendMessage}
                disabled={
                  sending || !message.trim()
                }
                className="w-12 h-12 rounded-full bg-orange-500 text-black flex items-center justify-center disabled:opacity-40 hover:bg-orange-400 transition"
              >
                <Send size={19} />
              </button>
            </div>

            <p className="text-[10px] text-zinc-600 mt-2 text-center">
              Press Enter to send • Shift + Enter for a new line
            </p>
          </div>
        </div>
      )}

      {/* COMPLETED CHAT FOOTER */}

      {!adminView && isTripCompleted && (
        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <CheckCircle2
                size={15}
                className="text-green-500"
              />
              Trip chat is closed because the ride has been completed.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}