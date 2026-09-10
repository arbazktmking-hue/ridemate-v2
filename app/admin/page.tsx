"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

type Feedback = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  message: string;
  createdAt: number;
  status: string;
  adminReply?: string;
  repliedAt?: number;
};

type UserAccount = {
  id: string;
  [key: string]: any;
};

type Trip = {
  id: string;
  [key: string]: any;
};

type RideRequest = {
  id: string;
  [key: string]: any;
};

type AdminTab =
  | "dashboard"
  | "feedback"
  | "users";

type DashboardTab =
  | "users"
  | "trips"
  | "requests"
  | "completed";

export default function AdminPage() {
  const router = useRouter();

  // =========================================================
  // MAIN ADMIN TAB
  // =========================================================

  const [activeTab, setActiveTab] =
    useState<AdminTab>("dashboard");

  // =========================================================
  // DASHBOARD SUB TAB
  // =========================================================

  const [dashboardTab, setDashboardTab] =
    useState<DashboardTab>("users");

  // =========================================================
  // DASHBOARD STATS
  // =========================================================

  const [users, setUsers] = useState(0);
  const [trips, setTrips] = useState(0);
  const [requests, setRequests] = useState(0);
  const [completedRides, setCompletedRides] =
    useState(0);
  const [feedbackCount, setFeedbackCount] =
    useState(0);

  // =========================================================
  // DASHBOARD LISTS
  // =========================================================

  const [dashboardUsers, setDashboardUsers] =
    useState<UserAccount[]>([]);

  const [dashboardTrips, setDashboardTrips] =
    useState<Trip[]>([]);

  const [dashboardRequests, setDashboardRequests] =
    useState<RideRequest[]>([]);

  const [dashboardCompletedTrips, setDashboardCompletedTrips] =
    useState<Trip[]>([]);

  const [loadingDashboardLists, setLoadingDashboardLists] =
    useState(false);

  // =========================================================
  // FEEDBACK
  // =========================================================

  const [feedback, setFeedback] =
    useState<Feedback[]>([]);

  const [loadingFeedback, setLoadingFeedback] =
    useState(true);

  const [updatingFeedback, setUpdatingFeedback] =
    useState<string | null>(null);

  const [replyText, setReplyText] =
    useState<Record<string, string>>({});

  // =========================================================
  // USERS
  // =========================================================

  const [userAccounts, setUserAccounts] =
    useState<UserAccount[]>([]);

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [userSearch, setUserSearch] =
    useState("");

  // =========================================================
  // ADMIN ACCESS
  // =========================================================

  useEffect(() => {
    try {
      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (
        user.email !==
        "arbazktmking@gmail.com"
      ) {
        router.replace("/home");
      }
    } catch {
      router.replace("/home");
    }
  }, [router]);

  // =========================================================
  // LOAD STATS
  // =========================================================

  const loadStats = async () => {
    try {
      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      setUsers(
        usersSnapshot.size
      );

      const tripsSnapshot = await getDocs(
        collection(db, "trips")
      );

      setTrips(
        tripsSnapshot.size
      );

      const requestsSnapshot = await getDocs(
        collection(db, "rideRequests")
      );

      setRequests(
        requestsSnapshot.size
      );

      const completedQuery = query(
        collection(db, "trips"),
        where(
          "status",
          "==",
          "completed"
        )
      );

      const completedSnapshot =
        await getDocs(
          completedQuery
        );

      setCompletedRides(
        completedSnapshot.size
      );
    } catch (error) {
      console.error(
        "Failed to load dashboard stats:",
        error
      );
    }
  };

  // =========================================================
  // LOAD DASHBOARD LISTS
  // =========================================================

  const loadDashboardLists = async () => {
    try {
      setLoadingDashboardLists(
        true
      );

      // -----------------------------------------------------
      // USERS
      // -----------------------------------------------------

      const usersSnapshot =
        await getDocs(
          collection(db, "users")
        );

      const loadedUsers: UserAccount[] =
        usersSnapshot.docs.map(
          (userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          })
        );

      loadedUsers.sort(
        (a, b) => {
          const dateA =
            typeof a.createdAt ===
            "number"
              ? a.createdAt
              : 0;

          const dateB =
            typeof b.createdAt ===
            "number"
              ? b.createdAt
              : 0;

          return dateB - dateA;
        }
      );

      setDashboardUsers(
        loadedUsers
      );

      // -----------------------------------------------------
      // TRIPS
      // -----------------------------------------------------

      const tripsSnapshot =
        await getDocs(
          collection(db, "trips")
        );

      const loadedTrips: Trip[] =
        tripsSnapshot.docs.map(
          (tripDoc) => ({
            id: tripDoc.id,
            ...tripDoc.data(),
          })
        );

      loadedTrips.sort(
        (a, b) => {
          const dateA =
            typeof a.createdAt ===
            "number"
              ? a.createdAt
              : 0;

          const dateB =
            typeof b.createdAt ===
            "number"
              ? b.createdAt
              : 0;

          return dateB - dateA;
        }
      );

      setDashboardTrips(
        loadedTrips
      );

      // -----------------------------------------------------
      // COMPLETED TRIPS
      // -----------------------------------------------------

      const completedSnapshot =
        await getDocs(
          query(
            collection(db, "trips"),
            where(
              "status",
              "==",
              "completed"
            )
          )
        );

      const loadedCompletedTrips: Trip[] =
        completedSnapshot.docs.map(
          (tripDoc) => ({
            id: tripDoc.id,
            ...tripDoc.data(),
          })
        );

      loadedCompletedTrips.sort(
        (a, b) => {
          const dateA =
            typeof a.createdAt ===
            "number"
              ? a.createdAt
              : 0;

          const dateB =
            typeof b.createdAt ===
            "number"
              ? b.createdAt
              : 0;

          return dateB - dateA;
        }
      );

      setDashboardCompletedTrips(
        loadedCompletedTrips
      );

      // -----------------------------------------------------
      // RIDE REQUESTS
      // -----------------------------------------------------

      const requestsSnapshot =
        await getDocs(
          collection(
            db,
            "rideRequests"
          )
        );

      const loadedRequests: RideRequest[] =
        requestsSnapshot.docs.map(
          (requestDoc) => ({
            id: requestDoc.id,
            ...requestDoc.data(),
          })
        );

      loadedRequests.sort(
        (a, b) => {
          const dateA =
            typeof a.createdAt ===
            "number"
              ? a.createdAt
              : typeof a.requestedAt ===
                "number"
              ? a.requestedAt
              : 0;

          const dateB =
            typeof b.createdAt ===
            "number"
              ? b.createdAt
              : typeof b.requestedAt ===
                "number"
              ? b.requestedAt
              : 0;

          return dateB - dateA;
        }
      );

      setDashboardRequests(
        loadedRequests
      );

    } catch (error) {
      console.error(
        "Failed to load dashboard lists:",
        error
      );
    } finally {
      setLoadingDashboardLists(
        false
      );
    }
  };

  // =========================================================
  // LOAD FEEDBACK
  // =========================================================

  const loadFeedback = async () => {
    try {
      setLoadingFeedback(
        true
      );

      const feedbackQuery =
        query(
          collection(
            db,
            "feedback"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );

      const feedbackSnapshot =
        await getDocs(
          feedbackQuery
        );

      const feedbackData: Feedback[] =
        feedbackSnapshot.docs.map(
          (feedbackDoc) => {
            const data =
              feedbackDoc.data();

            return {
              id:
                feedbackDoc.id,

              userId:
                data.userId || "",

              userName:
                data.userName ||
                "Unknown User",

              userEmail:
                data.userEmail || "",

              type:
                data.type ||
                "Share Feedback",

              message:
                data.message || "",

              createdAt:
                data.createdAt || 0,

              status:
                data.status ||
                "new",

              adminReply:
                data.adminReply ||
                "",

              repliedAt:
                data.repliedAt || 0,
            };
          }
        );

      setFeedback(
        feedbackData
      );

      setFeedbackCount(
        feedbackData.length
      );

      const existingReplies:
        Record<string, string> =
        {};

      feedbackData.forEach(
        (item) => {
          existingReplies[
            item.id
          ] =
            item.adminReply ||
            "";
        }
      );

      setReplyText(
        existingReplies
      );

    } catch (error) {
      console.error(
        "Failed to load feedback:",
        error
      );
    } finally {
      setLoadingFeedback(
        false
      );
    }
  };

  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async () => {
    try {
      setLoadingUsers(
        true
      );

      const usersSnapshot =
        await getDocs(
          collection(db, "users")
        );

      const userData: UserAccount[] =
        usersSnapshot.docs.map(
          (userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          })
        );

      userData.sort(
        (a, b) => {
          const dateA =
            typeof a.createdAt ===
            "number"
              ? a.createdAt
              : 0;

          const dateB =
            typeof b.createdAt ===
            "number"
              ? b.createdAt
              : 0;

          return dateB - dateA;
        }
      );

      setUserAccounts(
        userData
      );

    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );
    } finally {
      setLoadingUsers(
        false
      );
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadStats();
    loadFeedback();
    loadUsers();
    loadDashboardLists();
  }, []);

  // =========================================================
  // REFRESH EVERYTHING
  // =========================================================

  const refreshEverything =
    async () => {
      await Promise.all([
        loadStats(),
        loadFeedback(),
        loadUsers(),
        loadDashboardLists(),
      ]);
    };

  // =========================================================
  // ADMIN REPLY
  // =========================================================

  const sendReply = async (
    feedbackId: string
  ) => {
    const reply =
      replyText[
        feedbackId
      ]?.trim();

    if (!reply) {
      alert(
        "Please write a response first."
      );
      return;
    }

    try {
      setUpdatingFeedback(
        feedbackId
      );

      const replyTime =
        Date.now();

      await updateDoc(
        doc(
          db,
          "feedback",
          feedbackId
        ),
        {
          adminReply:
            reply,

          repliedAt:
            replyTime,

          status:
            "responded",
        }
      );

      setFeedback(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              feedbackId
                ? {
                    ...item,

                    adminReply:
                      reply,

                    repliedAt:
                      replyTime,

                    status:
                      "responded",
                  }
                : item
          )
      );

      alert(
        "Response saved successfully."
      );

    } catch (error) {
      console.error(
        "Failed to send response:",
        error
      );

      alert(
        "Failed to save the response."
      );

    } finally {
      setUpdatingFeedback(
        null
      );
    }
  };

  // =========================================================
  // MARK RESOLVED
  // =========================================================

  const markResolved = async (
    feedbackId: string
  ) => {
    try {
      setUpdatingFeedback(
        feedbackId
      );

      await updateDoc(
        doc(
          db,
          "feedback",
          feedbackId
        ),
        {
          status:
            "resolved",

          resolvedAt:
            Date.now(),
        }
      );

      setFeedback(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              feedbackId
                ? {
                    ...item,
                    status:
                      "resolved",
                  }
                : item
          )
      );

    } catch (error) {
      console.error(
        "Failed to resolve feedback:",
        error
      );

      alert(
        "Failed to update feedback."
      );

    } finally {
      setUpdatingFeedback(
        null
      );
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (
    timestamp: number
  ) => {
    if (!timestamp) {
      return "Unknown date";
    }

    return new Date(
      timestamp
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =========================================================
  // FORMAT TRIP DATE
  // =========================================================

  const formatTripDate =
    (value: any) => {
      if (!value) {
        return "Date not available";
      }

      if (
        typeof value ===
        "number"
      ) {
        return formatDate(
          value
        );
      }

      if (
        typeof value ===
        "string"
      ) {
        return value;
      }

      return "Date not available";
    };

  // =========================================================
  // FEEDBACK TYPE STYLE
  // =========================================================

  const getTypeStyle = (
    type: string
  ) => {
    if (
      type ===
        "Report a Problem" ||
      type ===
        "Report a Rider / Trip"
    ) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (
      type ===
      "Suggest a Feature"
    ) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    if (
      type ===
      "Ask a Question"
    ) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }

    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  };

  // =========================================================
  // START ADMIN USER VIEW
  // =========================================================

  const viewAsUser = (
    user: UserAccount
  ) => {
    const name =
      user.username ||
      user.name ||
      "Unknown User";

    const email =
      user.email ||
      "";

    const uid =
      user.uid ||
      user.id;

    const image =
      user.image ||
      user.photoURL ||
      "";

    const adminViewSession = {
      active: true,

      userId:
        uid,

      userName:
        name,

      userEmail:
        email,

      userImage:
        image,

      startedAt:
        Date.now(),
    };

    localStorage.setItem(
      "ridemateAdminView",
      JSON.stringify(
        adminViewSession
      )
    );

    router.push(
      "/home"
    );
  };

  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers =
    userAccounts.filter(
      (user) => {
        const search =
          userSearch
            .toLowerCase()
            .trim();

        if (!search) {
          return true;
        }

        const name =
          String(
            user.username ||
              user.name ||
              ""
          ).toLowerCase();

        const email =
          String(
            user.email ||
              ""
          ).toLowerCase();

        const uid =
          String(
            user.uid ||
              user.id ||
              ""
          ).toLowerCase();

        return (
          name.includes(
            search
          ) ||
          email.includes(
            search
          ) ||
          uid.includes(
            search
          )
        );
      }
    );

  // =========================================================
  // MAIN TAB BUTTON
  // =========================================================

  const mainTabClass = (
    tab: AdminTab
  ) => `
    flex-1
    min-w-[110px]
    px-4
    py-3
    sm:py-4
    rounded-xl
    font-black
    transition-all
    duration-200
    ${
      activeTab === tab
        ? "bg-orange-500 text-black shadow-lg shadow-orange-500/10"
        : "bg-zinc-900 text-zinc-400 hover:text-white hover:border-orange-500"
    }
  `;

  // =========================================================
  // DASHBOARD TAB BUTTON
  // =========================================================

  const dashboardTabClass = (
    tab: DashboardTab
  ) => `
    flex-1
    min-w-[140px]
    px-4
    py-3
    rounded-xl
    border
    font-black
    transition-all
    duration-200
    ${
      dashboardTab === tab
        ? "bg-orange-500 text-black border-orange-500"
        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-orange-500"
    }
  `;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        p-4
        md:p-6
      "
    >

      <div
        className="
          max-w-7xl
          mx-auto
        "
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-5
            mb-8
          "
        >

          <div>

            <h1
              className="
                text-4xl
                md:text-5xl
                font-black
                text-orange-500
              "
            >
              RideMate Admin
            </h1>

            <p
              className="
                text-zinc-500
                mt-2
              "
            >
              Manage your RideMate platform
            </p>

          </div>


          <button
            onClick={
              refreshEverything
            }
            className="
              bg-zinc-900
              border
              border-zinc-800
              hover:border-orange-500
              px-5
              py-3
              rounded-xl
              font-bold
              transition
            "
          >
            ↻ Refresh Dashboard
          </button>

        </div>


        {/* =================================================
            MAIN ADMIN TABS
        ================================================= */}

        <div
          className="
            sticky
            top-0
            z-40
            mb-8
            bg-black/95
            backdrop-blur-md
            py-3
            border-b
            border-zinc-900
          "
        >

          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-2
              p-2
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
            "
          >

            <button
              onClick={() =>
                setActiveTab(
                  "dashboard"
                )
              }
              className={mainTabClass(
                "dashboard"
              )}
            >
              📊 Dashboard
            </button>


            <button
              onClick={() =>
                setActiveTab(
                  "feedback"
                )
              }
              className={mainTabClass(
                "feedback"
              )}
            >
              📨 Feedback

              {feedbackCount >
                0 && (
                <span
                  className="
                    ml-2
                    text-xs
                    opacity-70
                  "
                >
                  ({feedbackCount})
                </span>
              )}

            </button>


            <button
              onClick={() =>
                setActiveTab(
                  "users"
                )
              }
              className={mainTabClass(
                "users"
              )}
            >
              👥 User Accounts

              {userAccounts.length >
                0 && (
                <span
                  className="
                    ml-2
                    text-xs
                    opacity-70
                  "
                >
                  ({userAccounts.length})
                </span>
              )}

            </button>

          </div>

        </div>


        {/* =================================================
            DASHBOARD
        ================================================= */}

        {activeTab ===
          "dashboard" && (

          <section>

            <div
              className="
                mb-6
              "
            >

              <h2
                className="
                  text-3xl
                  font-black
                "
              >
                📊 Dashboard
              </h2>

              <p
                className="
                  text-zinc-500
                  mt-1
                "
              >
                Select a category to investigate the platform data.
              </p>

            </div>


            {/* =================================================
                DASHBOARD SUB TABS
            ================================================= */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-4
                gap-4
                mb-8
              "
            >

              {/* USERS */}

              <button
                onClick={() =>
                  setDashboardTab(
                    "users"
                  )
                }
                className={`
                  text-left
                  rounded-3xl
                  p-6
                  border
                  transition-all
                  ${
                    dashboardTab ===
                    "users"
                      ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:border-orange-500"
                  }
                `}
              >

                <p
                  className={`
                    text-sm
                    font-bold
                    ${
                      dashboardTab ===
                      "users"
                        ? "text-black/60"
                        : "text-zinc-400"
                    }
                  `}
                >
                  👤 Registered Users
                </p>

                <p
                  className="
                    text-4xl
                    font-black
                    mt-2
                  "
                >
                  {users}
                </p>

                <p
                  className={`
                    text-xs
                    mt-3
                    ${
                      dashboardTab ===
                      "users"
                        ? "text-black/60"
                        : "text-zinc-600"
                    }
                  `}
                >
                  View all registered accounts →
                </p>

              </button>


              {/* TRIPS */}

              <button
                onClick={() =>
                  setDashboardTab(
                    "trips"
                  )
                }
                className={`
                  text-left
                  rounded-3xl
                  p-6
                  border
                  transition-all
                  ${
                    dashboardTab ===
                    "trips"
                      ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:border-orange-500"
                  }
                `}
              >

                <p
                  className={`
                    text-sm
                    font-bold
                    ${
                      dashboardTab ===
                      "trips"
                        ? "text-black/60"
                        : "text-zinc-400"
                    }
                  `}
                >
                  🏍️ Total Trips
                </p>

                <p
                  className="
                    text-4xl
                    font-black
                    mt-2
                  "
                >
                  {trips}
                </p>

                <p
                  className={`
                    text-xs
                    mt-3
                    ${
                      dashboardTab ===
                      "trips"
                        ? "text-black/60"
                        : "text-zinc-600"
                    }
                  `}
                >
                  View all trips →
                </p>

              </button>


              {/* REQUESTS */}

              <button
                onClick={() =>
                  setDashboardTab(
                    "requests"
                  )
                }
                className={`
                  text-left
                  rounded-3xl
                  p-6
                  border
                  transition-all
                  ${
                    dashboardTab ===
                    "requests"
                      ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:border-orange-500"
                  }
                `}
              >

                <p
                  className={`
                    text-sm
                    font-bold
                    ${
                      dashboardTab ===
                      "requests"
                        ? "text-black/60"
                        : "text-zinc-400"
                    }
                  `}
                >
                  📩 Ride Requests
                </p>

                <p
                  className="
                    text-4xl
                    font-black
                    mt-2
                  "
                >
                  {requests}
                </p>

                <p
                  className={`
                    text-xs
                    mt-3
                    ${
                      dashboardTab ===
                      "requests"
                        ? "text-black/60"
                        : "text-zinc-600"
                    }
                  `}
                >
                  View all ride requests →
                </p>

              </button>


              {/* COMPLETED */}

              <button
                onClick={() =>
                  setDashboardTab(
                    "completed"
                  )
                }
                className={`
                  text-left
                  rounded-3xl
                  p-6
                  border
                  transition-all
                  ${
                    dashboardTab ===
                    "completed"
                      ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:border-orange-500"
                  }
                `}
              >

                <p
                  className={`
                    text-sm
                    font-bold
                    ${
                      dashboardTab ===
                      "completed"
                        ? "text-black/60"
                        : "text-zinc-400"
                    }
                  `}
                >
                  🏁 Completed Rides
                </p>

                <p
                  className="
                    text-4xl
                    font-black
                    mt-2
                  "
                >
                  {completedRides}
                </p>

                <p
                  className={`
                    text-xs
                    mt-3
                    ${
                      dashboardTab ===
                      "completed"
                        ? "text-black/60"
                        : "text-zinc-600"
                    }
                  `}
                >
                  View completed rides →
                </p>

              </button>

            </div>


            {/* =================================================
                DASHBOARD CONTENT
            ================================================= */}

            {loadingDashboardLists ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-12
                  text-center
                "
              >

                <div
                  className="
                    text-4xl
                    mb-4
                  "
                >
                  ⏳
                </div>

                <p
                  className="
                    text-zinc-400
                  "
                >
                  Loading dashboard data...
                </p>

              </div>

            ) : (

              <>

                {/* =================================================
                    REGISTERED USERS
                ================================================= */}

                {dashboardTab ===
                  "users" && (

                  <div>

                    <div
                      className="
                        flex
                        flex-col
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        gap-3
                        mb-5
                      "
                    >

                      <div>

                        <h3
                          className="
                            text-2xl
                            font-black
                          "
                        >
                          👤 Registered Users
                        </h3>

                        <p
                          className="
                            text-zinc-500
                            text-sm
                            mt-1
                          "
                        >
                          {dashboardUsers.length} registered account(s)
                        </p>

                      </div>

                    </div>


                    {dashboardUsers.length ===
                      0 ? (

                      <div
                        className="
                          bg-zinc-900
                          border
                          border-zinc-800
                          rounded-3xl
                          p-10
                          text-center
                        "
                      >
                        No registered users found.
                      </div>

                    ) : (

                      <div
                        className="
                          grid
                          grid-cols-1
                          md:grid-cols-2
                          xl:grid-cols-3
                          gap-5
                        "
                      >

                        {dashboardUsers.map(
                          (user) => {

                            const name =
                              user.username ||
                              user.name ||
                              "Unknown User";

                            const image =
                              user.image ||
                              user.photoURL ||
                              "";

                            return (

                              <div
                                key={
                                  user.id
                                }
                                className="
                                  bg-zinc-900
                                  border
                                  border-zinc-800
                                  rounded-3xl
                                  p-5
                                "
                              >

                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-4
                                  "
                                >

                                  {image ? (

                                    <img
                                      src={
                                        image
                                      }
                                      alt={
                                        name
                                      }
                                      className="
                                        w-16
                                        h-16
                                        rounded-full
                                        object-cover
                                        border
                                        border-zinc-700
                                      "
                                    />

                                  ) : (

                                    <div
                                      className="
                                        w-16
                                        h-16
                                        rounded-full
                                        bg-zinc-800
                                        flex
                                        items-center
                                        justify-center
                                        text-2xl
                                      "
                                    >
                                      👤
                                    </div>

                                  )}


                                  <div
                                    className="
                                      min-w-0
                                    "
                                  >

                                    <p
                                      className="
                                        font-black
                                        text-lg
                                        truncate
                                      "
                                    >
                                      {name}
                                    </p>

                                    <p
                                      className="
                                        text-zinc-500
                                        text-sm
                                        truncate
                                      "
                                    >
                                      {user.email ||
                                        "No email"}
                                    </p>

                                  </div>

                                </div>


                                <div
                                  className="
                                    mt-5
                                  "
                                >

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    USER ID
                                  </p>

                                  <p
                                    className="
                                      text-zinc-400
                                      text-xs
                                      break-all
                                      mt-1
                                    "
                                  >
                                    {user.uid ||
                                      user.id}
                                  </p>

                                </div>


                                <button
                                  onClick={() =>
                                    viewAsUser(
                                      user
                                    )
                                  }
                                  className="
                                    w-full
                                    mt-5
                                    bg-orange-500
                                    hover:bg-orange-600
                                    text-black
                                    py-3
                                    rounded-xl
                                    font-black
                                    transition
                                  "
                                >
                                  🛡️ View as User
                                </button>

                              </div>

                            );
                          }
                        )}

                      </div>

                    )}

                  </div>

                )}


                {/* =================================================
                    TOTAL TRIPS
                ================================================= */}

                {dashboardTab ===
                  "trips" && (

                  <div>

                    <div
                      className="
                        mb-5
                      "
                    >

                      <h3
                        className="
                          text-2xl
                          font-black
                        "
                      >
                        🏍️ Total Trips
                      </h3>

                      <p
                        className="
                          text-zinc-500
                          text-sm
                          mt-1
                        "
                      >
                        {dashboardTrips.length} trip(s) in RideMate.
                      </p>

                    </div>


                    {dashboardTrips.length ===
                      0 ? (

                      <div
                        className="
                          bg-zinc-900
                          border
                          border-zinc-800
                          rounded-3xl
                          p-10
                          text-center
                        "
                      >
                        No trips found.
                      </div>

                    ) : (

                      <div
                        className="
                          space-y-4
                        "
                      >

                        {dashboardTrips.map(
                          (trip) => (

                            <div
                              key={
                                trip.id
                              }
                              className="
                                bg-zinc-900
                                border
                                border-zinc-800
                                rounded-3xl
                                p-5
                                md:p-6
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  lg:flex-row
                                  lg:items-start
                                  lg:justify-between
                                  gap-5
                                "
                              >

                                <div>

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
                                        px-3
                                        py-1
                                        rounded-full
                                        bg-orange-500/10
                                        border
                                        border-orange-500/20
                                        text-orange-400
                                        text-xs
                                        font-bold
                                      "
                                    >
                                      🏍️ TRIP
                                    </span>

                                    <span
                                      className={`
                                        px-3
                                        py-1
                                        rounded-full
                                        text-xs
                                        font-bold
                                        ${
                                          trip.status ===
                                          "completed"
                                            ? "bg-green-500/10 text-green-400"
                                            : "bg-blue-500/10 text-blue-400"
                                        }
                                      `}
                                    >
                                      {trip.status ||
                                        "active"}
                                    </span>

                                  </div>


                                  <h4
                                    className="
                                      text-2xl
                                      font-black
                                      mt-4
                                      text-white
                                    "
                                  >
                                    {trip.destination ||
                                      "Unknown destination"}
                                  </h4>

                                  <p
                                    className="
                                      text-zinc-400
                                      mt-1
                                    "
                                  >
                                    Hosted by{" "}
                                    <span
                                      className="
                                        text-orange-400
                                        font-bold
                                      "
                                    >
                                      {trip.userName ||
                                        trip.username ||
                                        "Unknown rider"}
                                    </span>
                                  </p>

                                </div>


                                {trip.image && (

                                  <img
                                    src={
                                      trip.image
                                    }
                                    alt={
                                      trip.destination ||
                                      "Trip"
                                    }
                                    className="
                                      w-full
                                      lg:w-44
                                      h-28
                                      object-cover
                                      rounded-2xl
                                      border
                                      border-zinc-800
                                    "
                                  />

                                )}

                              </div>


                              <div
                                className="
                                  grid
                                  grid-cols-1
                                  sm:grid-cols-2
                                  lg:grid-cols-4
                                  gap-4
                                  mt-6
                                "
                              >

                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    START
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {trip.startLocation ||
                                      trip.startCity ||
                                      "Not available"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    DATE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {formatTripDate(
                                      trip.tripDate
                                    )}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    BIKE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {trip.bike ||
                                      "Not available"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    CONTRIBUTION
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-orange-400
                                      font-bold
                                      mt-1
                                    "
                                  >
                                    {trip.tripPrice !==
                                    undefined
                                      ? `₹${trip.tripPrice}`
                                      : "₹0"}
                                  </p>

                                </div>

                              </div>


                              {trip.caption && (

                                <div
                                  className="
                                    mt-5
                                    bg-black/30
                                    border
                                    border-zinc-800
                                    rounded-2xl
                                    p-4
                                  "
                                >

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                      mb-1
                                    "
                                  >
                                    CAPTION
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                    "
                                  >
                                    {trip.caption}
                                  </p>

                                </div>

                              )}

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                )}


                {/* =================================================
                    RIDE REQUESTS
                ================================================= */}

                {dashboardTab ===
                  "requests" && (

                  <div>

                    <div
                      className="
                        mb-5
                      "
                    >

                      <h3
                        className="
                          text-2xl
                          font-black
                        "
                      >
                        📩 Ride Requests
                      </h3>

                      <p
                        className="
                          text-zinc-500
                          text-sm
                          mt-1
                        "
                      >
                        {dashboardRequests.length} ride request(s).
                      </p>

                    </div>


                    {dashboardRequests.length ===
                      0 ? (

                      <div
                        className="
                          bg-zinc-900
                          border
                          border-zinc-800
                          rounded-3xl
                          p-10
                          text-center
                        "
                      >
                        No ride requests found.
                      </div>

                    ) : (

                      <div
                        className="
                          space-y-4
                        "
                      >

                        {dashboardRequests.map(
                          (request) => (

                            <div
                              key={
                                request.id
                              }
                              className="
                                bg-zinc-900
                                border
                                border-zinc-800
                                rounded-3xl
                                p-5
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  sm:flex-row
                                  sm:items-start
                                  sm:justify-between
                                  gap-4
                                "
                              >

                                <div>

                                  <span
                                    className="
                                      inline-block
                                      px-3
                                      py-1
                                      rounded-full
                                      bg-orange-500/10
                                      border
                                      border-orange-500/20
                                      text-orange-400
                                      text-xs
                                      font-bold
                                    "
                                  >
                                    📩 RIDE REQUEST
                                  </span>


                                  <h4
                                    className="
                                      text-xl
                                      font-black
                                      mt-3
                                    "
                                  >
                                    {request.tripDestination ||
                                      request.destination ||
                                      request.tripName ||
                                      "Ride Request"}
                                  </h4>

                                </div>


                                <span
                                  className={`
                                    px-3
                                    py-1
                                    rounded-full
                                    text-xs
                                    font-bold
                                    w-fit
                                    ${
                                      request.status ===
                                      "approved"
                                        ? "bg-green-500/10 text-green-400"
                                        : request.status ===
                                          "rejected"
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-yellow-500/10 text-yellow-400"
                                    }
                                  `}
                                >
                                  {request.status ||
                                    "pending"}
                                </span>

                              </div>


                              <div
                                className="
                                  grid
                                  grid-cols-1
                                  sm:grid-cols-2
                                  lg:grid-cols-4
                                  gap-4
                                  mt-5
                                "
                              >

                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    REQUESTED BY
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      font-bold
                                      mt-1
                                    "
                                  >
                                    {request.requesterName ||
                                      request.userName ||
                                      request.riderName ||
                                      "Unknown rider"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    HOST
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {request.hostName ||
                                      request.owner ||
                                      request.tripOwner ||
                                      "Unknown host"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    TRIP ID
                                  </p>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-400
                                      break-all
                                      mt-1
                                    "
                                  >
                                    {request.tripId ||
                                      "Not available"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    REQUEST DATE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {formatTripDate(
                                      request.createdAt ||
                                        request.requestedAt
                                    )}
                                  </p>

                                </div>

                              </div>


                              {request.message && (

                                <div
                                  className="
                                    mt-5
                                    bg-black/30
                                    border
                                    border-zinc-800
                                    rounded-2xl
                                    p-4
                                  "
                                >

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                      mb-1
                                    "
                                  >
                                    MESSAGE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      whitespace-pre-wrap
                                    "
                                  >
                                    {request.message}
                                  </p>

                                </div>

                              )}

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                )}


                {/* =================================================
                    COMPLETED RIDES
                ================================================= */}

                {dashboardTab ===
                  "completed" && (

                  <div>

                    <div
                      className="
                        mb-5
                      "
                    >

                      <h3
                        className="
                          text-2xl
                          font-black
                        "
                      >
                        🏁 Completed Rides
                      </h3>

                      <p
                        className="
                          text-zinc-500
                          text-sm
                          mt-1
                        "
                      >
                        {dashboardCompletedTrips.length} completed ride(s).
                      </p>

                    </div>


                    {dashboardCompletedTrips.length ===
                      0 ? (

                      <div
                        className="
                          bg-zinc-900
                          border
                          border-zinc-800
                          rounded-3xl
                          p-10
                          text-center
                        "
                      >
                        No completed rides found.
                      </div>

                    ) : (

                      <div
                        className="
                          space-y-4
                        "
                      >

                        {dashboardCompletedTrips.map(
                          (trip) => (

                            <div
                              key={
                                trip.id
                              }
                              className="
                                bg-zinc-900
                                border
                                border-zinc-800
                                rounded-3xl
                                p-5
                                md:p-6
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  md:flex-row
                                  md:items-start
                                  md:justify-between
                                  gap-4
                                "
                              >

                                <div>

                                  <span
                                    className="
                                      inline-block
                                      px-3
                                      py-1
                                      rounded-full
                                      bg-green-500/10
                                      text-green-400
                                      text-xs
                                      font-bold
                                    "
                                  >
                                    🏁 COMPLETED
                                  </span>


                                  <h4
                                    className="
                                      text-2xl
                                      font-black
                                      mt-3
                                    "
                                  >
                                    {trip.destination ||
                                      "Unknown destination"}
                                  </h4>


                                  <p
                                    className="
                                      text-zinc-400
                                      mt-1
                                    "
                                  >
                                    Hosted by{" "}
                                    <span
                                      className="
                                        text-orange-400
                                        font-bold
                                      "
                                    >
                                      {trip.userName ||
                                        trip.username ||
                                        "Unknown rider"}
                                    </span>
                                  </p>

                                </div>


                                {trip.image && (

                                  <img
                                    src={
                                      trip.image
                                    }
                                    alt={
                                      trip.destination ||
                                      "Completed ride"
                                    }
                                    className="
                                      w-full
                                      md:w-48
                                      h-32
                                      object-cover
                                      rounded-2xl
                                      border
                                      border-zinc-800
                                    "
                                  />

                                )}

                              </div>


                              <div
                                className="
                                  grid
                                  grid-cols-1
                                  sm:grid-cols-2
                                  lg:grid-cols-4
                                  gap-4
                                  mt-6
                                "
                              >

                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    START
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {trip.startLocation ||
                                      trip.startCity ||
                                      "Not available"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    DATE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {formatTripDate(
                                      trip.tripDate
                                    )}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    BIKE
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                      mt-1
                                    "
                                  >
                                    {trip.bike ||
                                      "Not available"}
                                  </p>

                                </div>


                                <div>

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                    "
                                  >
                                    CONTRIBUTION
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-orange-400
                                      font-bold
                                      mt-1
                                    "
                                  >
                                    {trip.tripPrice !==
                                    undefined
                                      ? `₹${trip.tripPrice}`
                                      : "₹0"}
                                  </p>

                                </div>

                              </div>


                              {trip.caption && (

                                <div
                                  className="
                                    mt-5
                                    bg-black/30
                                    border
                                    border-zinc-800
                                    rounded-2xl
                                    p-4
                                  "
                                >

                                  <p
                                    className="
                                      text-xs
                                      text-zinc-600
                                      mb-1
                                    "
                                  >
                                    CAPTION
                                  </p>

                                  <p
                                    className="
                                      text-sm
                                      text-zinc-300
                                    "
                                  >
                                    {trip.caption}
                                  </p>

                                </div>

                              )}

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                )}

              </>

            )}

          </section>

        )}


        {/* =================================================
            FEEDBACK TAB
        ================================================= */}

        {activeTab ===
          "feedback" && (

          <section>

            <div
              className="
                mb-6
              "
            >

              <h2
                className="
                  text-3xl
                  font-black
                "
              >
                📨 Feedback Center
              </h2>

              <p
                className="
                  text-zinc-500
                  mt-1
                "
              >
                Read user feedback and respond directly from your admin panel.
              </p>

            </div>


            {loadingFeedback ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-10
                  text-center
                "
              >
                <p
                  className="
                    text-zinc-400
                  "
                >
                  Loading feedback...
                </p>
              </div>

            ) : feedback.length ===
              0 ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-10
                  text-center
                "
              >

                <div
                  className="
                    text-5xl
                    mb-4
                  "
                >
                  📭
                </div>

                <h3
                  className="
                    text-xl
                    font-bold
                  "
                >
                  No feedback yet
                </h3>

                <p
                  className="
                    text-zinc-500
                    mt-2
                  "
                >
                  User submissions will appear here.
                </p>

              </div>

            ) : (

              <div
                className="
                  space-y-6
                "
              >

                {feedback.map(
                  (item) => (

                    <div
                      key={
                        item.id
                      }
                      className="
                        bg-zinc-900
                        border
                        border-zinc-800
                        rounded-3xl
                        p-5
                        md:p-6
                      "
                    >

                      <div
                        className="
                          flex
                          flex-col
                          md:flex-row
                          md:justify-between
                          gap-4
                        "
                      >

                        <div>

                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-2
                            "
                          >

                            <span
                              className={`
                                px-3
                                py-1
                                rounded-full
                                border
                                text-xs
                                font-bold
                                ${getTypeStyle(
                                  item.type
                                )}
                              `}
                            >
                              {item.type}
                            </span>


                            <span
                              className={`
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-bold
                                ${
                                  item.status ===
                                  "resolved"
                                    ? "bg-green-500/10 text-green-400"
                                    : item.status ===
                                      "responded"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-yellow-500/10 text-yellow-400"
                                }
                              `}
                            >
                              {item.status ===
                              "resolved"
                                ? "Resolved"
                                : item.status ===
                                  "responded"
                                ? "Responded"
                                : "New"}
                            </span>

                          </div>


                          <div
                            className="
                              mt-4
                            "
                          >

                            <p
                              className="
                                font-black
                                text-lg
                              "
                            >
                              {item.userName}
                            </p>

                            <p
                              className="
                                text-zinc-500
                                text-sm
                              "
                            >
                              {item.userEmail}
                            </p>

                          </div>

                        </div>


                        <p
                          className="
                            text-zinc-600
                            text-xs
                          "
                        >
                          {formatDate(
                            item.createdAt
                          )}
                        </p>

                      </div>


                      {/* USER MESSAGE */}

                      <div
                        className="
                          mt-6
                          bg-black/40
                          border
                          border-zinc-800
                          rounded-2xl
                          p-5
                        "
                      >

                        <p
                          className="
                            text-xs
                            text-zinc-600
                            mb-2
                          "
                        >
                          USER MESSAGE
                        </p>

                        <p
                          className="
                            text-zinc-300
                            leading-relaxed
                            whitespace-pre-wrap
                          "
                        >
                          {item.message}
                        </p>

                      </div>


                      {/* ADMIN REPLY */}

                      {item.adminReply && (

                        <div
                          className="
                            mt-4
                            bg-orange-500/5
                            border
                            border-orange-500/20
                            rounded-2xl
                            p-5
                          "
                        >

                          <p
                            className="
                              text-xs
                              text-orange-500
                              font-bold
                              mb-2
                            "
                          >
                            YOUR RESPONSE
                          </p>

                          <p
                            className="
                              text-zinc-300
                              whitespace-pre-wrap
                            "
                          >
                            {item.adminReply}
                          </p>

                          {item.repliedAt ? (

                            <p
                              className="
                                text-zinc-600
                                text-xs
                                mt-3
                              "
                            >
                              Responded on{" "}
                              {formatDate(
                                item.repliedAt
                              )}
                            </p>

                          ) : null}

                        </div>

                      )}


                      {/* REPLY */}

                      {item.status !==
                        "resolved" && (

                        <div
                          className="
                            mt-5
                          "
                        >

                          <p
                            className="
                              text-sm
                              font-bold
                              text-zinc-300
                              mb-3
                            "
                          >
                            Reply to user
                          </p>


                          <textarea
                            value={
                              replyText[
                                item.id
                              ] || ""
                            }
                            onChange={(e) =>
                              setReplyText(
                                (previous) => ({
                                  ...previous,

                                  [item.id]:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="Write your response to this user..."
                            rows={4}
                            maxLength={
                              2000
                            }
                            className="
                              w-full
                              bg-black
                              border
                              border-zinc-800
                              focus:border-orange-500
                              outline-none
                              rounded-2xl
                              p-4
                              text-white
                              placeholder:text-zinc-600
                              resize-none
                            "
                          />


                          <div
                            className="
                              flex
                              flex-col
                              sm:flex-row
                              gap-3
                              mt-3
                            "
                          >

                            <button
                              onClick={() =>
                                sendReply(
                                  item.id
                                )
                              }
                              disabled={
                                updatingFeedback ===
                                item.id
                              }
                              className="
                                bg-orange-500
                                hover:bg-orange-600
                                disabled:opacity-50
                                text-black
                                font-black
                                px-6
                                py-3
                                rounded-xl
                                transition
                              "
                            >
                              {updatingFeedback ===
                              item.id
                                ? "Saving..."
                                : "↗ Send Response"}
                            </button>


                            <button
                              onClick={() =>
                                markResolved(
                                  item.id
                                )
                              }
                              disabled={
                                updatingFeedback ===
                                item.id
                              }
                              className="
                                bg-green-500
                                hover:bg-green-600
                                disabled:opacity-50
                                text-black
                                font-black
                                px-6
                                py-3
                                rounded-xl
                                transition
                              "
                            >
                              ✓ Mark Resolved
                            </button>

                          </div>

                        </div>

                      )}


                      <p
                        className="
                          text-xs
                          text-zinc-700
                          mt-5
                        "
                      >
                        Feedback ID:{" "}
                        {item.id}
                      </p>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================================
            USER ACCOUNTS TAB
        ================================================= */}

        {activeTab ===
          "users" && (

          <section>

            <div
              className="
                flex
                flex-col
                lg:flex-row
                lg:items-end
                lg:justify-between
                gap-5
                mb-6
              "
            >

              <div>

                <h2
                  className="
                    text-3xl
                    font-black
                  "
                >
                  👥 User Accounts
                </h2>

                <p
                  className="
                    text-zinc-500
                    mt-1
                  "
                >
                  View and investigate registered RideMate users.
                </p>

              </div>


              <div
                className="
                  text-sm
                  text-zinc-500
                "
              >
                {filteredUsers.length} users
              </div>

            </div>


            {/* SEARCH */}

            <div
              className="
                mb-6
              "
            >

              <input
                type="text"
                value={
                  userSearch
                }
                onChange={(e) =>
                  setUserSearch(
                    e.target.value
                  )
                }
                placeholder="Search by name, email or UID..."
                className="
                  w-full
                  bg-zinc-900
                  border
                  border-zinc-800
                  focus:border-orange-500
                  outline-none
                  rounded-2xl
                  px-5
                  py-4
                  text-white
                  placeholder:text-zinc-600
                "
              />

            </div>


            {loadingUsers ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-10
                  text-center
                "
              >

                <p
                  className="
                    text-zinc-400
                  "
                >
                  Loading user accounts...
                </p>

              </div>

            ) : filteredUsers.length ===
              0 ? (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-10
                  text-center
                "
              >

                <div
                  className="
                    text-5xl
                    mb-4
                  "
                >
                  🔍
                </div>

                <h3
                  className="
                    text-xl
                    font-bold
                  "
                >
                  No users found
                </h3>

              </div>

            ) : (

              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-3
                  gap-5
                "
              >

                {filteredUsers.map(
                  (user) => {

                    const name =
                      user.username ||
                      user.name ||
                      "Unknown User";

                    const image =
                      user.image ||
                      user.photoURL ||
                      "";

                    return (

                      <div
                        key={
                          user.id
                        }
                        className="
                          bg-zinc-900
                          border
                          border-zinc-800
                          rounded-3xl
                          p-5
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-4
                          "
                        >

                          {image ? (

                            <img
                              src={
                                image
                              }
                              alt={
                                name
                              }
                              className="
                                w-16
                                h-16
                                rounded-full
                                object-cover
                                border
                                border-zinc-700
                              "
                            />

                          ) : (

                            <div
                              className="
                                w-16
                                h-16
                                rounded-full
                                bg-zinc-800
                                flex
                                items-center
                                justify-center
                                text-2xl
                              "
                            >
                              👤
                            </div>

                          )}


                          <div
                            className="
                              min-w-0
                            "
                          >

                            <p
                              className="
                                font-black
                                text-lg
                                truncate
                              "
                            >
                              {name}
                            </p>

                            <p
                              className="
                                text-zinc-500
                                text-sm
                                truncate
                              "
                            >
                              {user.email ||
                                "No email"}
                            </p>

                          </div>

                        </div>


                        <div
                          className="
                            mt-5
                          "
                        >

                          <p
                            className="
                              text-xs
                              text-zinc-600
                            "
                          >
                            USER ID
                          </p>

                          <p
                            className="
                              text-zinc-400
                              text-xs
                              break-all
                              mt-1
                            "
                          >
                            {user.uid ||
                              user.id}
                          </p>

                        </div>


                        <button
                          onClick={() =>
                            viewAsUser(
                              user
                            )
                          }
                          className="
                            w-full
                            mt-5
                            bg-orange-500
                            hover:bg-orange-600
                            text-black
                            py-3
                            rounded-xl
                            font-black
                            transition
                          "
                        >
                          🛡️ View as User
                        </button>

                      </div>

                    );

                  }
                )}

              </div>

            )}

          </section>

        )}

      </div>
    </main>
  );
}