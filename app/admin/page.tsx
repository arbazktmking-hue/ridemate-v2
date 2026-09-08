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

export default function AdminPage() {
  // =========================================================
  // DASHBOARD STATS
  // =========================================================

  const [users, setUsers] = useState(0);
  const [trips, setTrips] = useState(0);
  const [requests, setRequests] = useState(0);
  const [completedRides, setCompletedRides] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // =========================================================
  // FEEDBACK
  // =========================================================

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  const [updatingFeedback, setUpdatingFeedback] =
    useState<string | null>(null);

  const [replyText, setReplyText] = useState<
    Record<string, string>
  >({});

  // =========================================================
  // USERS
  // =========================================================

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [userSearch, setUserSearch] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<UserAccount | null>(null);

  // =========================================================
  // ADMIN
  // =========================================================

  const router = useRouter();

  // =========================================================
  // ADMIN ACCESS
  // =========================================================

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    if (user.email !== "arbazktmking@gmail.com") {
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

      setUsers(usersSnapshot.size);

      const tripsSnapshot = await getDocs(
        collection(db, "trips")
      );

      setTrips(tripsSnapshot.size);

      const requestsSnapshot = await getDocs(
        collection(db, "rideRequests")
      );

      setRequests(requestsSnapshot.size);

      const completedQuery = query(
        collection(db, "trips"),
        where("status", "==", "completed")
      );

      const completedSnapshot = await getDocs(
        completedQuery
      );

      setCompletedRides(completedSnapshot.size);
    } catch (error) {
      console.error(
        "Failed to load dashboard stats:",
        error
      );
    }
  };

  // =========================================================
  // LOAD FEEDBACK
  // =========================================================

  const loadFeedback = async () => {
    try {
      setLoadingFeedback(true);

      const feedbackQuery = query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc")
      );

      const feedbackSnapshot = await getDocs(
        feedbackQuery
      );

      const feedbackData: Feedback[] =
        feedbackSnapshot.docs.map((feedbackDoc) => {
          const data = feedbackDoc.data();

          return {
            id: feedbackDoc.id,
            userId: data.userId || "",
            userName:
              data.userName || "Unknown User",
            userEmail: data.userEmail || "",
            type:
              data.type || "Share Feedback",
            message: data.message || "",
            createdAt:
              data.createdAt || 0,
            status:
              data.status || "new",
            adminReply:
              data.adminReply || "",
            repliedAt:
              data.repliedAt || 0,
          };
        });

      setFeedback(feedbackData);
      setFeedbackCount(feedbackData.length);

      // Load existing replies into text boxes
      const existingReplies: Record<
        string,
        string
      > = {};

      feedbackData.forEach((item) => {
        existingReplies[item.id] =
          item.adminReply || "";
      });

      setReplyText(existingReplies);
    } catch (error) {
      console.error(
        "Failed to load feedback:",
        error
      );
    } finally {
      setLoadingFeedback(false);
    }
  };

  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      const userData: UserAccount[] =
        usersSnapshot.docs.map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }));

      // Newest users first
      userData.sort((a, b) => {
        const dateA =
          typeof a.createdAt === "number"
            ? a.createdAt
            : 0;

        const dateB =
          typeof b.createdAt === "number"
            ? b.createdAt
            : 0;

        return dateB - dateA;
      });

      setUserAccounts(userData);
    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadStats();
    loadFeedback();
    loadUsers();
  }, []);

  // =========================================================
  // SEND ADMIN REPLY
  // =========================================================

  const sendReply = async (
    feedbackId: string
  ) => {
    const reply =
      replyText[feedbackId]?.trim();

    if (!reply) {
      alert("Please write a response first.");
      return;
    }

    try {
      setUpdatingFeedback(feedbackId);

      await updateDoc(
        doc(db, "feedback", feedbackId),
        {
          adminReply: reply,
          repliedAt: Date.now(),
          status: "responded",
        }
      );

      setFeedback((previous) =>
        previous.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                adminReply: reply,
                repliedAt: Date.now(),
                status: "responded",
              }
            : item
        )
      );

      alert("Response saved successfully.");
    } catch (error) {
      console.error(
        "Failed to send response:",
        error
      );

      alert(
        "Failed to save the response."
      );
    } finally {
      setUpdatingFeedback(null);
    }
  };

  // =========================================================
  // MARK RESOLVED
  // =========================================================

  const markResolved = async (
    feedbackId: string
  ) => {
    try {
      setUpdatingFeedback(feedbackId);

      await updateDoc(
        doc(db, "feedback", feedbackId),
        {
          status: "resolved",
          resolvedAt: Date.now(),
        }
      );

      setFeedback((previous) =>
        previous.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                status: "resolved",
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
      setUpdatingFeedback(null);
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
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // FEEDBACK TYPE STYLE
  // =========================================================

  const getTypeStyle = (
    type: string
  ) => {
    if (
      type === "Report a Problem" ||
      type === "Report a Rider / Trip"
    ) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (
      type === "Suggest a Feature"
    ) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    if (
      type === "Ask a Question"
    ) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }

    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  };

  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers =
    userAccounts.filter((user) => {
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
          user.email || ""
        ).toLowerCase();

      const uid =
        String(
          user.uid ||
            user.id ||
            ""
        ).toLowerCase();

      return (
        name.includes(search) ||
        email.includes(search) ||
        uid.includes(search)
      );
    });

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">

          <div>
            <h1 className="text-4xl md:text-5xl font-black text-orange-500">
              RideMate Admin
            </h1>

            <p className="text-zinc-500 mt-2">
              Manage your RideMate platform
            </p>
          </div>

          <button
            onClick={() => {
              loadStats();
              loadFeedback();
              loadUsers();
            }}
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

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Registered users
            </p>

            <h2 className="text-4xl font-black mt-2">
              {users}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Total trips
            </p>

            <h2 className="text-4xl font-black mt-2">
              {trips}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Ride requests
            </p>

            <h2 className="text-4xl font-black mt-2">
              {requests}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Completed rides
            </p>

            <h2 className="text-4xl font-black mt-2">
              {completedRides}
            </h2>
          </div>

          <div className="bg-orange-500 text-black rounded-3xl p-6">
            <p className="text-black/60 text-sm font-bold">
              User feedback
            </p>

            <h2 className="text-4xl font-black mt-2">
              {feedbackCount}
            </h2>
          </div>

        </div>

        {/* =====================================================
            FEEDBACK CENTER
        ===================================================== */}

        <section className="mt-14">

          <div className="mb-6">

            <h2 className="text-3xl font-black">
              📨 Feedback Center
            </h2>

            <p className="text-zinc-500 mt-1">
              Read user feedback and respond directly from your admin panel.
            </p>

          </div>

          {loadingFeedback ? (

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
              <p className="text-zinc-400">
                Loading feedback...
              </p>
            </div>

          ) : feedback.length === 0 ? (

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">

              <div className="text-5xl mb-4">
                📭
              </div>

              <h3 className="text-xl font-bold">
                No feedback yet
              </h3>

              <p className="text-zinc-500 mt-2">
                User submissions will appear here.
              </p>

            </div>

          ) : (

            <div className="space-y-6">

              {feedback.map((item) => (

                <div
                  key={item.id}
                  className="
                    bg-zinc-900
                    border
                    border-zinc-800
                    rounded-3xl
                    p-5 md:p-6
                  "
                >

                  {/* TOP */}

                  <div className="flex flex-col md:flex-row md:justify-between gap-4">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`
                            px-3
                            py-1
                            rounded-full
                            border
                            text-xs
                            font-bold
                            ${getTypeStyle(item.type)}
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

                      <div className="mt-4">

                        <p className="font-black text-lg">
                          {item.userName}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          {item.userEmail}
                        </p>

                      </div>

                    </div>

                    <p className="text-zinc-600 text-xs">
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

                    <p className="text-xs text-zinc-600 mb-2">
                      USER MESSAGE
                    </p>

                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>

                  </div>

                  {/* EXISTING ADMIN REPLY */}

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

                      <p className="text-xs text-orange-500 font-bold mb-2">
                        YOUR RESPONSE
                      </p>

                      <p className="text-zinc-300 whitespace-pre-wrap">
                        {item.adminReply}
                      </p>

                      {item.repliedAt ? (
                        <p className="text-zinc-600 text-xs mt-3">
                          Responded on{" "}
                          {formatDate(
                            item.repliedAt
                          )}
                        </p>
                      ) : null}

                    </div>
                  )}

                  {/* REPLY BOX */}

                  {item.status !==
                    "resolved" && (
                    <div className="mt-5">

                      <p className="text-sm font-bold text-zinc-300 mb-3">
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
                        maxLength={2000}
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

                      <div className="flex flex-col sm:flex-row gap-3 mt-3">

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

                  <p className="text-xs text-zinc-700 mt-5">
                    Feedback ID:{" "}
                    {item.id}
                  </p>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* =====================================================
            USER ACCOUNTS
        ===================================================== */}

        <section className="mt-16">

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">

            <div>

              <h2 className="text-3xl font-black">
                👥 User Accounts
              </h2>

              <p className="text-zinc-500 mt-1">
                View registered RideMate users and their account information.
              </p>

            </div>

            <div className="text-sm text-zinc-500">
              {filteredUsers.length} users
            </div>

          </div>

          {/* SEARCH */}

          <div className="mb-6">

            <input
              type="text"
              value={userSearch}
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

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
              <p className="text-zinc-400">
                Loading user accounts...
              </p>
            </div>

          ) : filteredUsers.length ===
            0 ? (

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">

              <div className="text-5xl mb-4">
                🔍
              </div>

              <h3 className="text-xl font-bold">
                No users found
              </h3>

            </div>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

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
                      key={user.id}
                      className="
                        bg-zinc-900
                        border
                        border-zinc-800
                        rounded-3xl
                        p-5
                      "
                    >

                      <div className="flex items-center gap-4">

                        {image ? (
                          <img
                            src={image}
                            alt={name}
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

                        <div className="min-w-0">

                          <p className="font-black text-lg truncate">
                            {name}
                          </p>

                          <p className="text-zinc-500 text-sm truncate">
                            {user.email ||
                              "No email"}
                          </p>

                        </div>

                      </div>

                      <div className="mt-5">

                        <p className="text-xs text-zinc-600">
                          USER ID
                        </p>

                        <p className="text-zinc-400 text-xs break-all mt-1">
                          {user.uid ||
                            user.id}
                        </p>

                      </div>

                      <button
                        onClick={() =>
                          setSelectedUser(
                            user
                          )
                        }
                        className="
                          w-full
                          mt-5
                          bg-zinc-800
                          hover:bg-orange-500
                          hover:text-black
                          py-3
                          rounded-xl
                          font-black
                          transition
                        "
                      >
                        View Account
                      </button>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>

      {/* =======================================================
          USER ACCOUNT MODAL
      ======================================================= */}

      {selectedUser && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            bg-black/80
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
          "
          onClick={() =>
            setSelectedUser(null)
          }
        >

          <div
            className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-3xl
              w-full
              max-w-2xl
              max-h-[90vh]
              overflow-y-auto
              p-6
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-4">

              <div>

                <h2 className="text-2xl font-black text-orange-500">
                  User Account
                </h2>

                <p className="text-zinc-500 text-sm mt-1">
                  Complete account information stored in RideMate.
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedUser(null)
                }
                className="
                  w-10
                  h-10
                  rounded-full
                  bg-zinc-900
                  hover:bg-zinc-800
                  flex
                  items-center
                  justify-center
                  text-xl
                "
              >
                ×
              </button>

            </div>

            {/* PROFILE */}

            <div className="mt-6 flex items-center gap-4">

              {(
                selectedUser.image ||
                selectedUser.photoURL
              ) ? (
                <img
                  src={
                    selectedUser.image ||
                    selectedUser.photoURL
                  }
                  alt={
                    selectedUser.username ||
                    selectedUser.name ||
                    "User"
                  }
                  className="
                    w-20
                    h-20
                    rounded-full
                    object-cover
                    border-2
                    border-orange-500
                  "
                />
              ) : (
                <div
                  className="
                    w-20
                    h-20
                    rounded-full
                    bg-zinc-800
                    flex
                    items-center
                    justify-center
                    text-3xl
                  "
                >
                  👤
                </div>
              )}

              <div>

                <h3 className="text-xl font-black">
                  {selectedUser.username ||
                    selectedUser.name ||
                    "Unknown User"}
                </h3>

                <p className="text-zinc-500">
                  {selectedUser.email ||
                    "No email"}
                </p>

              </div>

            </div>

            {/* ACCOUNT DATA */}

            <div className="mt-8 space-y-3">

              {Object.entries(
                selectedUser
              )
                .filter(
                  ([key]) =>
                    key !== "image" &&
                    key !== "photoURL"
                )
                .map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="
                        bg-zinc-900
                        border
                        border-zinc-800
                        rounded-xl
                        p-4
                      "
                    >

                      <p className="text-xs text-zinc-600 uppercase font-bold">
                        {key}
                      </p>

                      <p className="text-zinc-300 text-sm mt-1 break-words whitespace-pre-wrap">
                        {typeof value ===
                        "object"
                          ? JSON.stringify(
                              value,
                              null,
                              2
                            )
                          : String(value)}
                      </p>

                    </div>
                  )
                )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}