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
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  ShieldCheck,
  Send,
  MapPin,
  Loader2,
  CheckCircle2,
  Clock3,
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
   COMPLETION SETTINGS
========================================================= */

const DEFAULT_DESTINATION_RADIUS_KM = 20;

/*
 * Rider and pillion must be within 50 metres
 * of each other when the pillion confirms.
 */
const MAX_RIDER_PILLION_DISTANCE_METERS = 50;

/*
 * We don't accept extremely poor GPS readings.
 */
const MAX_ACCEPTABLE_GPS_ACCURACY_METERS = 1000;

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

  /*
   * Host has requested completion.
   */
  const [
    completionRequested,
    setCompletionRequested,
  ] = useState(false);

  /*
   * Whether current user is the pillion
   * expected to confirm.
   */
  const [
    isCompletionPillion,
    setIsCompletionPillion,
  ] = useState(false);

  /*
   * Name of the pillion who must confirm.
   */
  const [
    completionPillionName,
    setCompletionPillionName,
  ] = useState("");

  /*
   * Whether current user's completion
   * confirmation is being processed.
   */
  const [
    confirmingCompletion,
    setConfirmingCompletion,
  ] = useState(false);

  /*
   * Used when no approved pillion could
   * be identified.
   */
  const [
    completionError,
    setCompletionError,
  ] = useState("");

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

    void loadChat();
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

    void loadMessages();

    const interval =
      setInterval(
        () => {
          void loadMessages();
        },
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
      void checkExistingReview();
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
     FIND PILLION FOR THIS TRIP
  ========================================================= */

  async function findPillionForTrip(
    tripData: any
  ): Promise<string | null> {
    /*
     * First check common participant fields
     * that may already exist on tripChats.
     */

    const directCandidates = [
      chat?.pillionName,
      chat?.pillion,
      chat?.passengerName,
      chat?.passenger,
      chat?.riderName,
      chat?.rider,
      chat?.requesterName,
      chat?.requester,
      chat?.memberName,
    ];

    for (
      const candidate of directCandidates
    ) {
      if (
        typeof candidate ===
          "string" &&
        candidate.trim() &&
        candidate.trim() !==
          chat?.owner &&
        candidate.trim() !==
          currentUser?.name
      ) {
        return candidate.trim();
      }
    }

    /*
     * Check members arrays if present.
     */

    const memberArrays = [
      chat?.members,
      chat?.participants,
      chat?.users,
    ];

    for (
      const members of memberArrays
    ) {
      if (
        Array.isArray(members)
      ) {
        for (
          const member of members
        ) {
          const candidate =
            typeof member ===
            "string"
              ? member
              : member?.name ||
                member?.userName ||
                member?.username;

          if (
            typeof candidate ===
              "string" &&
            candidate.trim() &&
            candidate.trim() !==
              chat?.owner &&
            candidate.trim() !==
              currentUser?.name
          ) {
            return candidate.trim();
          }
        }
      }
    }

    /*
     * Finally check approved ride requests.
     */

    try {
      const requestsQuery =
        query(
          collection(
            db,
            "rideRequests"
          ),
          where(
            "tripId",
            "==",
            tripId
          )
        );

      const requestsSnapshot =
        await getDocs(
          requestsQuery
        );

      for (
        const requestDoc of
          requestsSnapshot.docs
      ) {
        const request =
          requestDoc.data();

        /*
         * Accept common approval values.
         */
        const requestStatus =
          String(
            request.status ||
              request.requestStatus ||
              ""
          ).toLowerCase();

        const isApproved =
          requestStatus ===
            "approved" ||
          requestStatus ===
            "accepted" ||
          requestStatus ===
            "confirmed" ||
          request.approved ===
            true ||
          request.accepted ===
            true;

        if (
          !isApproved
        ) {
          continue;
        }

        const candidate =
          request.userName ||
          request.username ||
          request.name ||
          request.requesterName ||
          request.riderName ||
          request.passengerName;

        if (
          typeof candidate ===
            "string" &&
          candidate.trim() &&
          candidate.trim() !==
            tripData.userName &&
          candidate.trim() !==
            currentUser?.name
        ) {
          return candidate.trim();
        }
      }
    } catch (error) {
      console.error(
        "Failed to find approved pillion:",
        error
      );
    }

    return null;
  }

  /* =========================================================
     REFRESH COMPLETION STATE
  ========================================================= */

  async function refreshCompletionState() {
    if (
      !chat ||
      !currentUser?.name
    ) {
      return;
    }

    /*
     * Trip already completed.
     */

    if (
      chat.completed ===
      true
    ) {
      setCompletionRequested(
        false
      );

      setIsCompletionPillion(
        false
      );

      return;
    }

    /*
     * No completion request.
     */

    if (
      chat.completionRequested !==
      true
    ) {
      setCompletionRequested(
        false
      );

      setIsCompletionPillion(
        false
      );

      setCompletionPillionName(
        ""
      );

      return;
    }

    setCompletionRequested(
      true
    );

    const expectedPillion =
      chat.completionPillionName ||
      "";

    setCompletionPillionName(
      expectedPillion
    );

    /*
     * Only the named pillion can confirm.
     */

    setIsCompletionPillion(
      Boolean(
        expectedPillion &&
          currentUser.name ===
            expectedPillion
      )
    );
  }

  useEffect(() => {
    void refreshCompletionState();
  }, [
    chat,
    currentUser,
  ]);

  /* =========================================================
     HOST REQUESTS TRIP COMPLETION
  ========================================================= */

  async function requestTripCompletion() {
    /*
     * Admin investigation mode is read only.
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

    if (
      !currentUser?.name
    ) {
      alert(
        "Please login first."
      );

      return;
    }

    /*
     * Only host can initiate.
     */

    if (
      chat?.owner &&
      currentUser.name !==
        chat.owner
    ) {
      alert(
        "Only the trip host can request trip completion."
      );

      return;
    }

    /*
     * Already requested.
     */

    if (
      chat?.completionRequested ===
      true
    ) {
      alert(
        "Trip completion has already been requested. Waiting for the pillion to confirm."
      );

      return;
    }

    /*
     * Trip already completed.
     */

    if (
      chat?.completed ===
      true
    ) {
      alert(
        "This trip has already been completed."
      );

      return;
    }

    /*
     =========================================================
     GET ACTUAL TRIP
     =========================================================
    */

    const actualTripId =
      chat?.tripId ||
      tripId;

    let tripData: any =
      null;

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
     DESTINATION COORDINATES
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
     FIND APPROVED PILLION
     =========================================================
    */

    setCompletionError("");

    let pillionName =
      await findPillionForTrip(
        tripData
      );

    /*
     * If an existing completion request already
     * contains the pillion, preserve it.
     */

    if (
      !pillionName &&
      chat?.completionPillionName
    ) {
      pillionName =
        chat.completionPillionName;
    }

    if (!pillionName) {
      setCompletionError(
        "No approved pillion could be identified for this trip."
      );

      alert(
        "❌ RideMate could not identify the approved pillion for this trip.\n\nPlease make sure a pillion has been approved before requesting trip completion."
      );

      return;
    }

    /*
     =========================================================
     CONFIRMATION
     =========================================================
    */

    const confirmed =
      window.confirm(
        `RideMate will check your current GPS location.\n\n` +
          `You must be within ${destinationRadiusKm} km of:\n` +
          `${
            tripData.destination ||
            "the destination"
          }\n\n` +
          `After verification, ${
            pillionName
          } will need to confirm the trip from their own location.\n\n` +
          `Continue?`
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
       GET HOST GPS
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
       GPS ACCURACY
       =======================================================
      */

      if (
        currentLocation.accuracy >
        MAX_ACCEPTABLE_GPS_ACCURACY_METERS
      ) {
        const retry =
          confirm(
            `⚠️ Your GPS accuracy is currently about ${Math.round(
              currentLocation.accuracy
            )} meters.\n\nRideMate may not be able to reliably verify your destination.\n\nWould you like to try again?`
          );

        if (retry) {
          return requestTripCompletion();
        }

        return;
      }

      /*
       =======================================================
       DISTANCE FROM DESTINATION
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
        "Host GPS:",
        currentLocation
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
        "Host distance from destination:",
        distanceFromDestination,
        "km"
      );

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
          `❌ Destination verification failed.\n\n` +
            `You are approximately ${distanceFromDestination.toFixed(
              1
            )} km from the saved destination.\n\n` +
            `You must be within ${destinationRadiusKm} km of ${
              tripData.destination ||
              "the destination"
            } to request trip completion.`
        );

        return;
      }

      /*
       =======================================================
       SAVE COMPLETION REQUEST
       =======================================================
      */

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          completionRequested:
            true,

          completionRequestedBy:
            currentUser.name,

          completionPillionName:
            pillionName,

          completionHostLatitude:
            currentLocation.latitude,

          completionHostLongitude:
            currentLocation.longitude,

          completionHostAccuracy:
            currentLocation.accuracy,

          completionHostDistanceKm:
            distanceFromDestination,

          completionRequestedAt:
            Date.now(),

          completionPillionConfirmed:
            false,
        }
      );

      /*
       =======================================================
       ALSO STORE REQUEST ON TRIP
       =======================================================
      */

      await updateDoc(
        doc(
          db,
          "trips",
          actualTripId
        ),
        {
          completionRequested:
            true,

          completionRequestedBy:
            currentUser.name,

          completionPillionName:
            pillionName,

          completionHostLatitude:
            currentLocation.latitude,

          completionHostLongitude:
            currentLocation.longitude,

          completionHostAccuracy:
            currentLocation.accuracy,

          completionHostDistanceKm:
            distanceFromDestination,

          completionRequestedAt:
            Date.now(),

          completionPillionConfirmed:
            false,
        }
      );

      await loadChat();

      alert(
        `📍 Your location has been verified!\n\n` +
          `Distance from destination: ${distanceFromDestination.toFixed(
            1
          )} km\n` +
          `GPS accuracy: approximately ${Math.round(
            currentLocation.accuracy
          )} m\n\n` +
          `${pillionName} must now confirm the trip from their own phone.`
      );
    } catch (error) {
      console.error(
        "Failed to request trip completion:",
        error
      );

      alert(
        "Failed to request trip completion. Please try again."
      );
    } finally {
      setCompletingTrip(
        false
      );
    }
  }

  /* =========================================================
     PILLION CONFIRMS TRIP COMPLETION
  ========================================================= */

  async function confirmTripCompletion() {
    /*
     * Admin investigation mode is read only.
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

    if (
      confirmingCompletion
    ) {
      return;
    }

    if (
      !currentUser?.name
    ) {
      alert(
        "Please login first."
      );

      return;
    }

    /*
     * Must have an active completion request.
     */

    if (
      chat?.completionRequested !==
      true
    ) {
      alert(
        "There is no trip completion request waiting for confirmation."
      );

      return;
    }

    /*
     * Only the specifically selected pillion
     * can confirm.
     */

    if (
      chat?.completionPillionName &&
      currentUser.name !==
        chat.completionPillionName
    ) {
      alert(
        "Only the approved pillion for this trip can confirm completion."
      );

      return;
    }

    /*
     * Already completed.
     */

    if (
      chat?.completed ===
      true
    ) {
      alert(
        "This trip has already been completed."
      );

      return;
    }

    /*
     =========================================================
     GET TRIP DATA
     =========================================================
    */

    const actualTripId =
      chat?.tripId ||
      tripId;

    let tripData: any =
      null;

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
     GET DESTINATION
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
        "❌ This trip does not have a verified destination location."
      );

      return;
    }

    /*
     =========================================================
     GET HOST'S SAVED GPS
     =========================================================
    */

    const hostLatitude =
      Number(
        chat.completionHostLatitude
      );

    const hostLongitude =
      Number(
        chat.completionHostLongitude
      );

    const hostAccuracy =
      Number(
        chat.completionHostAccuracy
      );

    const hostDistanceFromDestination =
      Number(
        chat.completionHostDistanceKm
      );

    if (
      !Number.isFinite(
        hostLatitude
      ) ||
      !Number.isFinite(
        hostLongitude
      )
    ) {
      alert(
        "❌ The rider's completion location could not be found.\n\nPlease ask the rider to request completion again."
      );

      return;
    }

    /*
     =========================================================
     CONFIRMATION DIALOG
     =========================================================
    */

    const confirmed =
      window.confirm(
        `You are confirming that the trip has been completed.\n\n` +
          `Destination: ${
            tripData.destination ||
            "Trip destination"
          }\n\n` +
          `RideMate will now check your GPS and verify that:\n\n` +
          `• You are within ${destinationRadiusKm} km of the destination\n` +
          `• You are within 50 metres of the rider\n\n` +
          `Continue?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setConfirmingCompletion(
        true
      );

      /*
       =======================================================
       GET PILLION GPS
       =======================================================
      */

      let pillionLocation:
        | GPSLocation
        | null = null;

      try {
        pillionLocation =
          await getCurrentGPSLocation();
      } catch (gpsError: any) {
        console.error(
          "Pillion GPS error:",
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

      if (!pillionLocation) {
        alert(
          "Unable to determine your current location."
        );

        return;
      }

      /*
       =======================================================
       GPS ACCURACY CHECK
       =======================================================
      */

      if (
        pillionLocation.accuracy >
        MAX_ACCEPTABLE_GPS_ACCURACY_METERS
      ) {
        const retry =
          confirm(
            `⚠️ Your GPS accuracy is currently about ${Math.round(
              pillionLocation.accuracy
            )} meters.\n\nRideMate may not be able to reliably verify your location.\n\nWould you like to try again?`
          );

        if (retry) {
          return confirmTripCompletion();
        }

        return;
      }

      /*
       =======================================================
       PILLION → DESTINATION
       =======================================================
      */

      const pillionDistanceFromDestination =
        calculateDistanceKm(
          pillionLocation.latitude,
          pillionLocation.longitude,
          destinationLat,
          destinationLng
        );

      console.log(
        "Pillion GPS:",
        pillionLocation
      );

      console.log(
        "Pillion distance from destination:",
        pillionDistanceFromDestination,
        "km"
      );

      /*
       =======================================================
       CHECK PILLION DESTINATION RADIUS
       =======================================================
      */

      if (
        pillionDistanceFromDestination >
        destinationRadiusKm
      ) {
        alert(
          `❌ Destination verification failed.\n\n` +
            `You are approximately ${pillionDistanceFromDestination.toFixed(
              1
            )} km from the saved destination.\n\n` +
            `You must be within ${destinationRadiusKm} km of ${
              tripData.destination ||
              "the destination"
            } to confirm the trip.`
        );

        return;
      }

      /*
       =======================================================
       RIDER ↔ PILLION DISTANCE
       =======================================================
      */

      const riderPillionDistanceKm =
        calculateDistanceKm(
          hostLatitude,
          hostLongitude,
          pillionLocation.latitude,
          pillionLocation.longitude
        );

      const riderPillionDistanceMeters =
        riderPillionDistanceKm *
        1000;

      console.log(
        "Rider ↔ Pillion distance:",
        riderPillionDistanceMeters,
        "meters"
      );

      /*
       =======================================================
       50 METRE CHECK
       =======================================================
      */

      if (
        riderPillionDistanceMeters >
        MAX_RIDER_PILLION_DISTANCE_METERS
      ) {
        alert(
          `❌ Rider and pillion are too far apart.\n\n` +
            `Current distance between you: ${Math.round(
              riderPillionDistanceMeters
            )} metres.\n\n` +
            `You must be within ${MAX_RIDER_PILLION_DISTANCE_METERS} metres of the rider to complete this trip.\n\n` +
            `Please meet the rider and try again.`
        );

        return;
      }

      /*
       =======================================================
       FINAL CONFIRMATION
       =======================================================
      */

      const finalConfirmed =
        window.confirm(
          `✅ All location checks passed!\n\n` +
            `🏁 Destination: verified\n` +
            `📍 Rider distance from destination: ${hostDistanceFromDestination.toFixed(
              1
            )} km\n` +
            `📍 Your distance from destination: ${pillionDistanceFromDestination.toFixed(
              1
            )} km\n` +
            `🤝 Rider ↔ Pillion: ${Math.round(
              riderPillionDistanceMeters
            )} metres\n\n` +
            `GPS accuracy:\n` +
            `Rider: approximately ${Math.round(
              hostAccuracy || 0
            )} m\n` +
            `You: approximately ${Math.round(
              pillionLocation.accuracy
            )} m\n\n` +
            `Confirm that this trip has been completed?`
        );

      if (!finalConfirmed) {
        return;
      }

      /*
       =======================================================
       MARK TRIP CHAT COMPLETED
       =======================================================
      */

      await updateDoc(
        doc(
          db,
          "tripChats",
          tripId
        ),
        {
          completed:
            true,

          completionRequested:
            false,

          completionPillionConfirmed:
            true,

          completionPillionName:
            currentUser.name,

          completionPillionLatitude:
            pillionLocation.latitude,

          completionPillionLongitude:
            pillionLocation.longitude,

          completionPillionAccuracy:
            pillionLocation.accuracy,

          completionPillionDistanceKm:
            pillionDistanceFromDestination,

          completionRiderPillionDistanceMeters:
            riderPillionDistanceMeters,

          completionVerified:
            true,

          completionVerifiedAt:
            Date.now(),

          reviewedUsers:
            [],
        }
      );

      /*
       =======================================================
       MARK ACTUAL TRIP COMPLETED
       =======================================================
      */

      await updateDoc(
        doc(
          db,
          "trips",
          actualTripId
        ),
        {
          status:
            "completed",

          completionRequested:
            false,

          completionPillionConfirmed:
            true,

          completionPillionName:
            currentUser.name,

          completionPillionLatitude:
            pillionLocation.latitude,

          completionPillionLongitude:
            pillionLocation.longitude,

          completionPillionAccuracy:
            pillionLocation.accuracy,

          completionPillionDistanceKm:
            pillionDistanceFromDestination,

          completionRiderPillionDistanceMeters:
            riderPillionDistanceMeters,

          completionVerified:
            true,

          completionVerifiedAt:
            Date.now(),
        }
      );

      await loadChat();

      alert(
        `🏁 Trip completed successfully!\n\n` +
          `📍 Destination verified for both riders\n` +
          `🤝 Rider & pillion distance: ${Math.round(
            riderPillionDistanceMeters
          )} m\n\n` +
          `RideMate has marked this trip as completed.`
      );
    } catch (error) {
      console.error(
        "Failed to confirm trip completion:",
        error
      );

      alert(
        "Failed to complete the trip. Please try again."
      );
    } finally {
      setConfirmingCompletion(
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
                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <CheckCircle2
                    size={20}
                  />

                  <span>
                    🏁 This trip has been completed.
                  </span>
                </div>

                {/* =========================================
                    ADMIN MODE
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
                    COMPLETION REQUEST WAITING
                ============================================= */}

                {!isAdminView &&
                  completionRequested && (
                    <div
                      className="
                        bg-yellow-500/10
                        border
                        border-yellow-500/30
                        rounded-2xl
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <Clock3
                          size={22}
                          className="
                            text-yellow-400
                            flex-shrink-0
                            mt-0.5
                          "
                        />

                        <div
                          className="
                            flex-1
                          "
                        >
                          {isCompletionPillion ? (
                            <>
                              <p
                                className="
                                  text-yellow-300
                                  font-black
                                  text-sm
                                "
                              >
                                🏁 Trip Completion Requested
                              </p>

                              <p
                                className="
                                  text-zinc-300
                                  text-sm
                                  mt-1
                                "
                              >
                                The rider has reached the
                                destination zone and requested
                                trip completion.
                              </p>

                              <p
                                className="
                                  text-zinc-500
                                  text-xs
                                  mt-2
                                "
                              >
                                Your GPS will be checked to
                                confirm that you are also
                                within 20 km of the destination
                                and within 50 metres of the rider.
                              </p>

                              <button
                                onClick={
                                  confirmTripCompletion
                                }
                                disabled={
                                  confirmingCompletion
                                }
                                className="
                                  w-full
                                  mt-4
                                  bg-green-600
                                  hover:bg-green-500
                                  text-white
                                  py-3
                                  rounded-xl
                                  font-black
                                  transition
                                  disabled:opacity-60
                                  disabled:cursor-not-allowed
                                  flex
                                  items-center
                                  justify-center
                                  gap-2
                                "
                              >
                                {confirmingCompletion ? (
                                  <>
                                    <Loader2
                                      size={18}
                                      className="animate-spin"
                                    />

                                    Verifying Your GPS...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2
                                      size={18}
                                    />

                                    ✅ Confirm Trip Completion
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <p
                                className="
                                  text-yellow-300
                                  font-black
                                  text-sm
                                "
                              >
                                ⏳ Waiting for Pillion Confirmation
                              </p>

                              <p
                                className="
                                  text-zinc-300
                                  text-sm
                                  mt-1
                                "
                              >
                                Your location has been verified.
                              </p>

                              <p
                                className="
                                  text-zinc-500
                                  text-xs
                                  mt-2
                                "
                              >
                                Waiting for{" "}
                                <span
                                  className="
                                    text-white
                                    font-bold
                                  "
                                >
                                  {completionPillionName ||
                                    "the pillion"}
                                </span>{" "}
                                to confirm from their own phone.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
                      Sending messages and trip completion
                      actions are disabled while investigating
                      this trip chat.
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
                          void sendMessage();
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
                      onClick={() =>
                        void sendMessage()
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
                    HOST — REQUEST COMPLETION
                ============================================= */}

                {!isAdminView &&
                  currentUser.name ===
                    chat.owner &&
                  !completionRequested && (
                    <button
                      onClick={() =>
                        void requestTripCompletion()
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
                            🏁 Request Trip Completion
                          </span>
                        </>
                      )}
                    </button>
                  )}

                {/* =============================================
                    PILLION — CONFIRM BUTTON
                ============================================= */}

                {!isAdminView &&
                  isCompletionPillion &&
                  completionRequested && (
                    <div
                      className="
                        bg-green-500/10
                        border
                        border-green-500/20
                        rounded-xl
                        p-3
                        text-center
                      "
                    >
                      <p
                        className="
                          text-green-400
                          text-xs
                          font-bold
                        "
                      >
                        Your confirmation is required
                        to complete this trip.
                      </p>
                    </div>
                  )}

                {/* =============================================
                    COMPLETION ERROR
                ============================================= */}

                {completionError && (
                  <div
                    className="
                      bg-red-500/10
                      border
                      border-red-500/20
                      rounded-xl
                      p-3
                      text-red-300
                      text-xs
                    "
                  >
                    ⚠️ {completionError}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}