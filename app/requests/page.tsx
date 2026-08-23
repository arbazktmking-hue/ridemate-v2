"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../firebase";

export default function RequestsPage() {

  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
const [expandedTrip, setExpandedTrip] = useState<any | null>(null);
const [loadingTrip, setLoadingTrip] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "received" | "sent"
  >("received");

  // Currently expanded request
  const [expandedRequestId, setExpandedRequestId] =
    useState<string | null>(null);

  // =========================================================
  // DATE FORMATTER
  // =========================================================

  const formatRequestDateTime = (request: any) => {

    const value =
      request.createdAt ||
      request.requestedAt ||
      request.timestamp ||
      request.sentAt;

    if (!value) {
      return "";
    }

    try {

      let date: Date;

      // Firestore Timestamp
      if (
        typeof value === "object" &&
        typeof value.toDate === "function"
      ) {
        date = value.toDate();
      }

      // Firestore timestamp-like object
      else if (
        typeof value === "object" &&
        value.seconds !== undefined
      ) {
        date = new Date(
          value.seconds * 1000
        );
      }

      // Normal JS date / timestamp
      else {
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    } catch {
      return "";
    }
  };

  // =========================================================
  // LOAD REQUESTS
  // =========================================================

  useEffect(() => {

    const loadRequests = async () => {

      try {

        const currentUser = JSON.parse(
          localStorage.getItem("ridemateUser") || "{}"
        );

        if (!currentUser.name) return;

        const snapshot = await getDocs(
          collection(db, "rideRequests")
        );

        const received: any[] = [];
        const sent: any[] = [];

        snapshot.forEach((docSnap) => {

          const request = docSnap.data();

          // Requests received
          if (
            request.tripOwner === currentUser.name
          ) {
            received.push({
              id: docSnap.id,
              ...request,
            });
          }

          // Requests sent
          if (
            request.requester === currentUser.name
          ) {
            sent.push({
              id: docSnap.id,
              ...request,
            });
          }

        });

        setReceivedRequests(received);
        setSentRequests(sent);

      } catch (error) {

        console.error(
          "Failed to load requests:",
          error
        );

      }

    };

    loadRequests();

  }, []);

  // =========================================================
  // UPDATE REQUEST
  // =========================================================

  const updateRequest = async (
    requestId: string,
    status: string,
    tripId: string
  ) => {

    try {

      const request = receivedRequests.find(
        (r) => r.id === requestId
      );

      if (!request) return;

      // Update request
      await updateDoc(
        doc(db, "rideRequests", requestId),
        {
          status,
          tripCompleted: false,
          tripId,
        }
      );

      // =====================================================
      // CREATE / UPDATE TRIP CHAT
      // =====================================================

      if (status === "approved") {

        const chatRef = doc(
          db,
          "tripChats",
          tripId
        );

        const existingChat =
          await getDoc(chatRef);

        if (!existingChat.exists()) {

          await setDoc(chatRef, {

            tripId,

            destination:
              request.destination,

            owner:
              request.tripOwner,

            members: [
              request.tripOwner,
              request.requester,
            ],

            createdAt: Date.now(),

            completed: false,

          });

        } else {

          await updateDoc(
            chatRef,
            {
              members:
                arrayUnion(
                  request.requester
                ),
            }
          );

        }

      }

      // =====================================================
      // NOTIFICATION
      // =====================================================

      await addDoc(
        collection(db, "notifications"),
        {

          user:
            request.requester,

          text:
            status === "approved"
              ? `🎉 ${request.tripOwner} approved your ride request to ${request.destination}`
              : `❌ ${request.tripOwner} rejected your ride request to ${request.destination}`,

          createdAt:
            Date.now(),

          read:
            false,

        }
      );

      // Remove from local list
      setReceivedRequests((prev) =>
        prev.filter(
          (r) => r.id !== requestId
        )
      );

      // Collapse card
      setExpandedRequestId(null);

    } catch (error) {

      console.error(
        "Failed to update request:",
        error
      );

    }

  };

  // =========================================================
  // TOGGLE CARD
  // =========================================================

const toggleCard = async (request: any) => {

  if (expandedRequestId === request.id) {

    // Collapse current card
    setExpandedRequestId(null);
    setExpandedTrip(null);
    return;

  }

  // Expand selected card
  setExpandedRequestId(request.id);
  setExpandedTrip(null);
  setLoadingTrip(true);

  try {

    if (!request.tripId) {
      setExpandedTrip(request);
      return;
    }

    const tripRef = doc(
      db,
      "trips",
      request.tripId
    );

    const tripSnap = await getDoc(tripRef);

    if (tripSnap.exists()) {

      setExpandedTrip({
        id: tripSnap.id,
        ...tripSnap.data(),
      });

    } else {

      // Fallback to request data
      setExpandedTrip(request);

    }

  } catch (error) {

    console.error(
      "Failed to load trip details:",
      error
    );

    setExpandedTrip(request);

  } finally {

    setLoadingTrip(false);

  }

};

  // =========================================================
  // TRIP DETAILS
  // =========================================================

  const TripDetails = ({
  request,
}: {
  request: any;
}) => {

  // Use actual trip data when available
  const trip = expandedTrip || request;

  const destination =
    trip.destination ||
    request.destination ||
    "RideMate Trip";

  const startLocation =
    trip.startLocation ||
    request.startLocation ||
    "";

  const bike =
    trip.bike ||
    request.bike ||
    "";

  const distance =
    trip.distance ||
    request.distance ||
    "";

  const tripPrice =
    trip.tripPrice ??
    request.tripPrice ??
    "0";

  const tripDate =
    trip.tripDate ||
    request.tripDate ||
    null;

  const rideType =
    trip.rideType ||
    request.rideType ||
    "";

  const rideStory =
    trip.story ||
    trip.rideStory ||
    trip.description ||
    request.story ||
    request.rideStory ||
    request.description ||
    "";

  const ownerName =
    trip.userName ||
    trip.tripOwner ||
    request.tripOwner ||
    "";

  const ownerImage =
    trip.userImage ||
    trip.tripOwnerImage ||
    request.tripOwnerImage ||
    request.ownerImage ||
    "/default-avatar.png";

  return (

    <div
      className="
        mt-4
        pt-4
        border-t
        border-zinc-800
      "
    >

      {loadingTrip ? (

        <div className="
          py-5
          text-center
          text-zinc-500
          text-sm
        ">
          Loading trip details...
        </div>

      ) : (

        <>

          {/* ===============================================
              TRIP HEADER
          =============================================== */}

          <div
            className="
              flex
              items-center
              gap-3
              mb-3
            "
          >

            <img
              src={ownerImage}
              alt=""
              className="
                w-10
                h-10
                rounded-full
                object-cover
              "
            />

            <div className="min-w-0">

              <p className="
                text-zinc-500
                text-[10px]
                uppercase
                font-bold
              ">
                Ride Hosted By
              </p>

              <p className="
                text-orange-500
                font-black
                text-sm
                truncate
              ">
                {ownerName}
              </p>

            </div>

          </div>

          {/* ===============================================
              DESTINATION
          =============================================== */}

          <div
            className="
              bg-black
              rounded-xl
              p-3
              mb-2
            "
          >

            <p className="
              text-orange-500
              text-[10px]
              uppercase
              font-black
            ">
              🏔️ Destination
            </p>

            <p className="
              text-white
              font-black
              text-lg
              mt-1
            ">
              {destination}
            </p>

          </div>

          {/* ===============================================
              TRIP INFORMATION
          =============================================== */}

          <div
            className="
              grid
              grid-cols-2
              sm:grid-cols-4
              gap-2
            "
          >

            {/* STARTING LOCATION */}

            <div className="
              bg-black
              rounded-xl
              p-3
            ">

              <p className="
                text-zinc-500
                text-[10px]
                uppercase
                font-bold
              ">
                📍 Starting From
              </p>

              <p className="
                text-white
                font-bold
                text-sm
                mt-1
                truncate
              ">
                {startLocation || "Not specified"}
              </p>

            </div>

            {/* DISTANCE */}

            <div className="
              bg-black
              rounded-xl
              p-3
            ">

              <p className="
                text-zinc-500
                text-[10px]
                uppercase
                font-bold
              ">
                🛣️ Distance
              </p>

              <p className="
                text-white
                font-bold
                text-sm
                mt-1
              ">
                {distance
                  ? `${distance} KM`
                  : "Not specified"}
              </p>

            </div>

            {/* BIKE */}

            <div className="
              bg-black
              rounded-xl
              p-3
            ">

              <p className="
                text-zinc-500
                text-[10px]
                uppercase
                font-bold
              ">
                🏍️ Bike
              </p>

              <p className="
                text-white
                font-bold
                text-sm
                mt-1
                truncate
              ">
                {bike || "Not specified"}
              </p>

            </div>

            {/* CONTRIBUTION */}

            <div className="
              bg-orange-500
              text-black
              rounded-xl
              p-3
            ">

              <p className="
                text-[10px]
                uppercase
                font-black
              ">
                ₹ Contribution
              </p>

              <p className="
                font-black
                text-lg
                mt-1
              ">
                ₹{tripPrice}
              </p>

            </div>

          </div>

          {/* ===============================================
              DEPARTURE
          =============================================== */}

          {tripDate && (

            <div
              className="
                mt-2
                bg-black
                rounded-xl
                p-3
              "
            >

              <p className="
                text-zinc-500
                text-[10px]
                uppercase
                font-bold
              ">
                🗓️ Departure
              </p>

              <p className="
                text-white
                font-bold
                text-sm
                mt-1
              ">
                {formatRequestDateTime({
                  createdAt: tripDate,
                })}
              </p>

            </div>

          )}

          {/* ===============================================
              RIDE TYPE
          =============================================== */}

          {rideType && (

            <div className="
              mt-2
              inline-flex
              px-3
              py-1.5
              rounded-full
              bg-blue-500/10
              border
              border-blue-500/30
              text-blue-400
              text-xs
              font-bold
            ">

              {rideType === "group"
                ? "👥 Group Ride"
                : "👤 Individual Ride"}

            </div>

          )}

          {/* ===============================================
              RIDE STORY
          =============================================== */}

          {rideStory && (

            <div
              className="
                mt-2
                bg-black
                rounded-xl
                p-3
              "
            >

              <p className="
                text-orange-500
                text-[10px]
                uppercase
                font-black
              ">
                Ride Story
              </p>

              <p className="
                text-zinc-300
                text-sm
                mt-1
                leading-relaxed
              ">
                {rideStory}
              </p>

            </div>

          )}

          {/* ===============================================
              APPROVE / REJECT
          =============================================== */}

          {request.status ===
            "pending" && (

            <div className="
              flex
              gap-2
              mt-3
            ">

              <button
                onClick={(e) => {

                  e.stopPropagation();

                  updateRequest(
                    request.id,
                    "approved",
                    request.tripId
                  );

                }}
                className="
                  flex-1
                  bg-green-600
                  hover:bg-green-500
                  px-4
                  py-2.5
                  rounded-xl
                  font-bold
                  text-sm
                  transition
                "
              >
                Approve ✅
              </button>

              <button
                onClick={(e) => {

                  e.stopPropagation();

                  updateRequest(
                    request.id,
                    "rejected",
                    request.tripId
                  );

                }}
                className="
                  flex-1
                  bg-red-600
                  hover:bg-red-500
                  px-4
                  py-2.5
                  rounded-xl
                  font-bold
                  text-sm
                  transition
                "
              >
                Reject ❌
              </button>

            </div>

          )}

        </>

      )}

    </div>

  );
};
  // =========================================================
  // REQUEST CARD - RECEIVED
  // =========================================================

  const ReceivedRequestCard = ({
    request,
  }: {
    request: any;
  }) => {

    const isExpanded =
      expandedRequestId === request.id;

    return (

      <div
        onClick={() =>
  toggleCard(request)
}
        className="
          bg-zinc-900
          rounded-3xl
          border
          border-zinc-800
          p-4
          sm:p-5
          cursor-pointer
          transition-all
          duration-300
          hover:border-orange-500/40
        "
      >

        {/* =================================================
            COLLAPSED HEADER
        ================================================= */}

        <div
          className="
            flex
            items-center
            gap-3
            sm:gap-4
          "
        >

          {/* USER IMAGE */}

          <img
            src={
              request.requesterImage ||
              "/default-avatar.png"
            }
            alt=""
            className="
              w-12
              h-12
              sm:w-14
              sm:h-14
              rounded-full
              object-cover
              shrink-0
            "
          />

          {/* MAIN INFORMATION */}

          <div
            className="
              flex-1
              min-w-0
            "
          >

            <h2
              className="
                font-black
                text-lg
                sm:text-xl
                truncate
              "
            >
              {request.requester}
            </h2>

            <p
              className="
                text-zinc-400
                text-sm
                truncate
              "
            >
              Wants to join ride to{" "}
              <span className="text-white font-bold">
                {request.destination}
              </span>
            </p>

            <p
              className="
                text-orange-500
                text-sm
                mt-1
                font-bold
              "
            >
              Status: {request.status}
            </p>

          </div>

          {/* =================================================
              DATE / TIME - TOP RIGHT
          ================================================= */}

          <div
            className="
              text-right
              shrink-0
              self-start
            "
          >

            <p
              className="
                text-zinc-500
                text-[9px]
                sm:text-[10px]
                uppercase
                font-bold
              "
            >
              {request.tripOwner ===
              request.requester
                ? "Received"
                : "Request"}
            </p>

            <p
              className="
                text-zinc-400
                text-[10px]
                sm:text-xs
                mt-1
                whitespace-nowrap
              "
            >
              🕐{" "}
              {formatRequestDateTime(
                request
              )}
            </p>

          </div>

        </div>

        {/* =================================================
            EXPANDED DETAILS
        ================================================= */}

        {isExpanded && (

          <TripDetails
            request={request}
          />

        )}

      </div>

    );

  };

  // =========================================================
  // REQUEST CARD - SENT
  // =========================================================

  const SentRequestCard = ({
    request,
  }: {
    request: any;
  }) => {

    const isExpanded =
      expandedRequestId === request.id;

    return (

      <div
        onClick={() =>
  toggleCard(request)
}
        className="
          bg-zinc-900
          p-4
          sm:p-5
          rounded-3xl
          border
          border-zinc-800
          cursor-pointer
          transition-all
          duration-300
          hover:border-orange-500/40
        "
      >

        {/* =================================================
            COLLAPSED HEADER
        ================================================= */}

        <div
          className="
            flex
            items-start
            gap-3
          "
        >

          <div
            className="
              flex-1
              min-w-0
            "
          >

            <h2
              className="
                font-black
                text-lg
                sm:text-xl
                truncate
              "
            >
              {request.destination}
            </h2>

            <p
              className="
                text-zinc-400
                text-sm
                mt-1
              "
            >
              Requested to:{" "}
              <span className="text-white font-bold">
                {request.tripOwner}
              </span>
            </p>

          </div>

          {/* =================================================
              DATE / TIME - TOP RIGHT
          ================================================= */}

          <div
            className="
              text-right
              shrink-0
            "
          >

            <p
              className="
                text-zinc-500
                text-[9px]
                sm:text-[10px]
                uppercase
                font-bold
              "
            >
              Sent
            </p>

            <p
              className="
                text-zinc-400
                text-[10px]
                sm:text-xs
                mt-1
                whitespace-nowrap
              "
            >
              🕐{" "}
              {formatRequestDateTime(
                request
              )}
            </p>

          </div>

        </div>

        {/* =================================================
            STATUS
        ================================================= */}

        <p
          className="
            mt-3
            font-bold
            text-sm
          "
        >

          {request.status ===
            "approved" && (

            <span className="text-green-500">
              Approved ✅
            </span>

          )}

          {request.status ===
            "pending" && (

            <span className="text-yellow-500">
              Pending ⏳
            </span>

          )}

          {request.status ===
            "rejected" && (

            <span className="text-red-500">
              Rejected ❌
            </span>

          )}

        </p>

        {/* =================================================
            EXPANDED DETAILS
        ================================================= */}

        {isExpanded && (

          <TripDetails
            request={request}
          />

        )}

      </div>

    );

  };

  // =========================================================
  // PAGE
  // =========================================================

  return (

    <PageBackground>

      <div
        className="
          max-w-4xl
          mx-auto
          px-3
          sm:px-0
        "
      >

        {/* =================================================
            TITLE
        ================================================= */}

        <h1
          className="
            text-4xl
            sm:text-5xl
            font-black
            text-orange-500
            mb-8
            sm:mb-10
          "
        >
          Ride Requests 🚀
        </h1>

        {/* =================================================
            TABS
        ================================================= */}

        <div
          className="
            flex
            gap-2
            sm:gap-4
            mb-8
            sm:mb-10
          "
        >

          <button
            onClick={() =>
              setActiveTab("received")
            }
            className={`

              px-4
              sm:px-6
              py-3
              rounded-2xl
              font-black
              text-sm
              sm:text-base

              ${
                activeTab ===
                "received"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }

            `}
          >
            Requests Received
          </button>

          <button
            onClick={() =>
              setActiveTab("sent")
            }
            className={`

              px-4
              sm:px-6
              py-3
              rounded-2xl
              font-black
              text-sm
              sm:text-base

              ${
                activeTab ===
                "sent"
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 border border-zinc-800"
              }

            `}
          >
            Requests Sent
          </button>

        </div>

        {/* =================================================
            RECEIVED REQUESTS
        ================================================= */}

        {activeTab ===
          "received" && (

          <>

            {receivedRequests.length ===
              0 ? (

              <p
                className="
                  text-zinc-400
                  mb-10
                "
              >
                No requests received
              </p>

            ) : (

              <div
                className="
                  space-y-4
                  mb-14
                "
              >

                {receivedRequests.map(
                  (request) => (

                    <ReceivedRequestCard
                      key={request.id}
                      request={request}
                    />

                  )
                )}

              </div>

            )}

          </>

        )}

        {/* =================================================
            SENT REQUESTS
        ================================================= */}

        {activeTab ===
          "sent" && (

          <>

            {sentRequests.length ===
              0 ? (

              <p
                className="
                  text-zinc-400
                "
              >
                No requests sent
              </p>

            ) : (

              <div
                className="
                  space-y-4
                "
              >

                {sentRequests.map(
                  (request) => (

                    <SentRequestCard
                      key={request.id}
                      request={request}
                    />

                  )
                )}

              </div>

            )}

          </>

        )}

      </div>

    </PageBackground>

  );

}