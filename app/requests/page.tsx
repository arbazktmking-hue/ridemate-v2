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

type AdminView = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
};

export default function RequestsPage() {
  const [receivedRequests, setReceivedRequests] =
    useState<any[]>([]);

  const [sentRequests, setSentRequests] =
    useState<any[]>([]);

  const [expandedTrip, setExpandedTrip] =
    useState<any | null>(null);

  const [loadingTrip, setLoadingTrip] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<"received" | "sent">(
      "received"
    );

  const [expandedRequestId, setExpandedRequestId] =
    useState<string | null>(null);

  const [updatingRequestId, setUpdatingRequestId] =
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
     DATE FORMATTER
  ========================================================= */

  const formatRequestDateTime = (
    request: any
  ) => {
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

      if (
        typeof value === "object" &&
        typeof value.toDate ===
          "function"
      ) {
        date = value.toDate();
      } else if (
        typeof value === "object" &&
        value.seconds !==
          undefined
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
          year: "numeric",
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
     LOAD REQUESTS
  ========================================================= */

  useEffect(() => {
    const loadRequests =
      async () => {
        try {
          let activeUserName = "";

          /* ===============================================
             ADMIN INVESTIGATION MODE
          =============================================== */

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

          /* ===============================================
             NORMAL USER
          =============================================== */

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
            setReceivedRequests([]);
            setSentRequests([]);
            return;
          }

          console.log(
            "Ride Requests active user:",
            activeUserName
          );

          const snapshot =
            await getDocs(
              collection(
                db,
                "rideRequests"
              )
            );

          const received: any[] =
            [];

          const sent: any[] = [];

          snapshot.forEach(
            (docSnap) => {
              const request =
                docSnap.data();

              /* =========================================
                 REQUESTS RECEIVED
              ========================================= */

              if (
                request.tripOwner ===
                activeUserName
              ) {
                received.push({
                  id: docSnap.id,
                  ...request,
                });
              }

              /* =========================================
                 REQUESTS SENT
              ========================================= */

              if (
                request.requester ===
                activeUserName
              ) {
                sent.push({
                  id: docSnap.id,
                  ...request,
                });
              }
            }
          );

          setReceivedRequests(
            received
          );

          setSentRequests(
            sent
          );
        } catch (error) {
          console.error(
            "Failed to load requests:",
            error
          );
        }
      };

    loadRequests();
  }, [isAdminView]);

  /* =========================================================
     APPROVE / REJECT REQUEST
     ONLY NORMAL USER
  ========================================================= */

  const updateRequest = async (
    requestId: string,
    status:
      | "approved"
      | "rejected",
    tripId: string
  ) => {
    /* ===============================================
       BLOCK ADMIN INVESTIGATION MODE
    =============================================== */

    if (isAdminView) {
      alert(
        "Admin View Mode is read-only.\n\nYou cannot approve or reject requests while investigating a user account."
      );

      return;
    }

    try {
      setUpdatingRequestId(
        requestId
      );

      const request =
        receivedRequests.find(
          (r) =>
            r.id === requestId
        );

      if (!request) {
        return;
      }

      /* ===============================================
         UPDATE REQUEST STATUS
      =============================================== */

      await updateDoc(
        doc(
          db,
          "rideRequests",
          requestId
        ),
        {
          status,
          tripCompleted: false,
          tripId,
        }
      );

      /* ===============================================
         CREATE / UPDATE TRIP CHAT
         ONLY WHEN APPROVED
      =============================================== */

      if (
        status === "approved"
      ) {
        const chatRef =
          doc(
            db,
            "tripChats",
            tripId
          );

        const existingChat =
          await getDoc(
            chatRef
          );

        if (
          !existingChat.exists()
        ) {
          await setDoc(
            chatRef,
            {
              tripId,

              destination:
                request.destination,

              owner:
                request.tripOwner,

              members: [
                request.tripOwner,
                request.requester,
              ],

              createdAt:
                Date.now(),

              completed: false,
            }
          );
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

      /* ===============================================
         SEND NOTIFICATION
      =============================================== */

      await addDoc(
        collection(
          db,
          "notifications"
        ),
        {
          user:
            request.requester,

          text:
            status ===
            "approved"
              ? `🎉 ${request.tripOwner} approved your ride request to ${request.destination}`
              : `❌ ${request.tripOwner} rejected your ride request to ${request.destination}`,

          createdAt:
            Date.now(),

          read: false,
        }
      );

      /* ===============================================
         REMOVE FROM RECEIVED
      =============================================== */

      setReceivedRequests(
        (prev) =>
          prev.filter(
            (r) =>
              r.id !==
              requestId
          )
      );

      setExpandedRequestId(
        null
      );

      setExpandedTrip(null);
    } catch (error) {
      console.error(
        "Failed to update request:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setUpdatingRequestId(
        null
      );
    }
  };

  /* =========================================================
     TOGGLE CARD
  ========================================================= */

  const toggleCard = async (
    request: any
  ) => {
    if (
      expandedRequestId ===
      request.id
    ) {
      setExpandedRequestId(
        null
      );

      setExpandedTrip(null);

      return;
    }

    setExpandedRequestId(
      request.id
    );

    setExpandedTrip(null);

    setLoadingTrip(true);

    try {
      if (!request.tripId) {
        setExpandedTrip(
          request
        );

        return;
      }

      const tripRef =
        doc(
          db,
          "trips",
          request.tripId
        );

      const tripSnap =
        await getDoc(
          tripRef
        );

      if (
        tripSnap.exists()
      ) {
        setExpandedTrip({
          id: tripSnap.id,
          ...tripSnap.data(),
        });
      } else {
        setExpandedTrip(
          request
        );
      }
    } catch (error) {
      console.error(
        "Failed to load trip details:",
        error
      );

      setExpandedTrip(
        request
      );
    } finally {
      setLoadingTrip(false);
    }
  };

  /* =========================================================
     TRIP DETAILS
  ========================================================= */

  const TripDetails = ({
    request,
    showActions = false,
  }: {
    request: any;
    showActions?: boolean;
  }) => {
    const trip =
      expandedTrip ||
      request;

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
          <div
            className="
              py-5
              text-center
              text-zinc-500
              text-sm
            "
          >
            Loading trip details...
          </div>
        ) : (
          <>
            {/* TRIP HEADER */}

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
                <p
                  className="
                    text-zinc-500
                    text-[10px]
                    uppercase
                    font-bold
                  "
                >
                  Ride Hosted By
                </p>

                <p
                  className="
                    text-orange-500
                    font-black
                    text-sm
                    truncate
                  "
                >
                  {ownerName}
                </p>
              </div>
            </div>

            {/* DESTINATION */}

            <div
              className="
                bg-black
                rounded-xl
                p-3
                mb-2
              "
            >
              <p
                className="
                  text-orange-500
                  text-[10px]
                  uppercase
                  font-black
                "
              >
                🏔️ Destination
              </p>

              <p
                className="
                  text-white
                  font-black
                  text-lg
                  mt-1
                "
              >
                {destination}
              </p>
            </div>

            {/* TRIP INFORMATION */}

            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-4
                gap-2
              "
            >
              {/* START */}

              <div
                className="
                  bg-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-zinc-500
                    text-[10px]
                    uppercase
                    font-bold
                  "
                >
                  📍 Starting From
                </p>

                <p
                  className="
                    text-white
                    font-bold
                    text-sm
                    mt-1
                    truncate
                  "
                >
                  {startLocation ||
                    "Not specified"}
                </p>
              </div>

              {/* DISTANCE */}

              <div
                className="
                  bg-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-zinc-500
                    text-[10px]
                    uppercase
                    font-bold
                  "
                >
                  🛣️ Distance
                </p>

                <p
                  className="
                    text-white
                    font-bold
                    text-sm
                    mt-1
                  "
                >
                  {distance
                    ? `${distance} KM`
                    : "Not specified"}
                </p>
              </div>

              {/* BIKE */}

              <div
                className="
                  bg-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-zinc-500
                    text-[10px]
                    uppercase
                    font-bold
                  "
                >
                  🏍️ Bike
                </p>

                <p
                  className="
                    text-white
                    font-bold
                    text-sm
                    mt-1
                    truncate
                  "
                >
                  {bike ||
                    "Not specified"}
                </p>
              </div>

              {/* CONTRIBUTION */}

              <div
                className="
                  bg-orange-500
                  text-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-[10px]
                    uppercase
                    font-black
                  "
                >
                  ₹ Contribution
                </p>

                <p
                  className="
                    font-black
                    text-lg
                    mt-1
                  "
                >
                  ₹{tripPrice}
                </p>
              </div>
            </div>

            {/* DEPARTURE */}

            {tripDate && (
              <div
                className="
                  mt-2
                  bg-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-zinc-500
                    text-[10px]
                    uppercase
                    font-bold
                  "
                >
                  🗓️ Departure
                </p>

                <p
                  className="
                    text-white
                    font-bold
                    text-sm
                    mt-1
                  "
                >
                  {formatRequestDateTime(
                    {
                      createdAt:
                        tripDate,
                    }
                  )}
                </p>
              </div>
            )}

            {/* RIDE TYPE */}

            {rideType && (
              <div
                className="
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
                "
              >
                {rideType ===
                "group"
                  ? "👥 Group Ride"
                  : "👤 Individual Ride"}
              </div>
            )}

            {/* RIDE STORY */}

            {rideStory && (
              <div
                className="
                  mt-2
                  bg-black
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-orange-500
                    text-[10px]
                    uppercase
                    font-black
                  "
                >
                  Ride Story
                </p>

                <p
                  className="
                    text-zinc-300
                    text-sm
                    mt-1
                    leading-relaxed
                  "
                >
                  {rideStory}
                </p>
              </div>
            )}

            {/* ADMIN READ ONLY */}

            {isAdminView &&
              request.status ===
                "pending" &&
              showActions && (
                <div
                  className="
                    mt-5
                    pt-4
                    border-t
                    border-zinc-800
                  "
                >
                  <div
                    className="
                      bg-orange-500/10
                      border
                      border-orange-500/20
                      rounded-xl
                      px-4
                      py-3
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
                      🔒 Investigation Mode —
                      Approve / Reject disabled
                    </p>
                  </div>
                </div>
              )}

            {/* APPROVE / REJECT */}
            {/* ONLY NORMAL USER */}

            {showActions &&
              !isAdminView &&
              request.status ===
                "pending" && (
                <div
                  className="
                    mt-5
                    pt-4
                    border-t
                    border-zinc-800
                    flex
                    gap-3
                  "
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <button
                    type="button"
                    disabled={
                      updatingRequestId ===
                      request.id
                    }
                    onClick={() =>
                      updateRequest(
                        request.id,
                        "approved",
                        request.tripId
                      )
                    }
                    className="
                      flex-1
                      bg-green-500
                      hover:bg-green-400
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      text-black
                      font-black
                      py-3
                      rounded-xl
                      transition
                    "
                  >
                    {updatingRequestId ===
                    request.id
                      ? "Processing..."
                      : "Approve ✅"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingRequestId ===
                      request.id
                    }
                    onClick={() =>
                      updateRequest(
                        request.id,
                        "rejected",
                        request.tripId
                      )
                    }
                    className="
                      flex-1
                      bg-red-500
                      hover:bg-red-400
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      text-white
                      font-black
                      py-3
                      rounded-xl
                      transition
                    "
                  >
                    {updatingRequestId ===
                    request.id
                      ? "Processing..."
                      : "Reject ❌"}
                  </button>
                </div>
              )}
          </>
        )}
      </div>
    );
  };

  /* =========================================================
     REQUEST CARD - RECEIVED
  ========================================================= */

  const ReceivedRequestCard = ({
    request,
  }: {
    request: any;
  }) => {
    const isExpanded =
      expandedRequestId ===
      request.id;

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
        <div
          className="
            flex
            items-center
            gap-3
            sm:gap-4
          "
        >
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
              Status:{" "}
              {request.status}
            </p>
          </div>

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
              Received
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

        {isExpanded && (
          <TripDetails
            request={request}
            showActions={true}
          />
        )}
      </div>
    );
  };

  /* =========================================================
     REQUEST CARD - SENT
  ========================================================= */

  const SentRequestCard = ({
    request,
  }: {
    request: any;
  }) => {
    const isExpanded =
      expandedRequestId ===
      request.id;

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

        {isExpanded && (
          <TripDetails
            request={request}
            showActions={false}
          />
        )}
      </div>
    );
  };

  /* =========================================================
     PAGE
  ========================================================= */

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
        {/* ===============================================
            ADMIN INVESTIGATION NOTICE
        =============================================== */}

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
              "User"}'s Ride Requests

            <span className="ml-2 opacity-70">
              (Read Only)
            </span>
          </div>
        )}

        {/* TITLE */}

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

        {/* TABS */}

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
              setActiveTab(
                "received"
              )
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
              setActiveTab(
                "sent"
              )
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
            RECEIVED
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
                {isAdminView
                  ? "This user has not received any ride requests."
                  : "No requests received"}
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
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                    />
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* =================================================
            SENT
        ================================================= */}

        {activeTab ===
          "sent" && (
          <>
            {sentRequests.length ===
            0 ? (
              <p className="text-zinc-400">
                {isAdminView
                  ? "This user has not sent any ride requests."
                  : "No requests sent"}
              </p>
            ) : (
              <div className="space-y-4">
                {sentRequests.map(
                  (request) => (
                    <SentRequestCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
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