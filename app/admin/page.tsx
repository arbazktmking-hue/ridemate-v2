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
};

export default function AdminPage() {
  const [users, setUsers] = useState(0);
  const [trips, setTrips] = useState(0);
  const [requests, setRequests] = useState(0);
  const [completedRides, setCompletedRides] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [updatingFeedback, setUpdatingFeedback] = useState<string | null>(
    null
  );

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
  // LOAD DASHBOARD STATS
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
      console.error("Failed to load dashboard stats:", error);
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

      const feedbackSnapshot = await getDocs(feedbackQuery);

      const feedbackData: Feedback[] = feedbackSnapshot.docs.map(
        (feedbackDoc) => {
          const data = feedbackDoc.data();

          return {
            id: feedbackDoc.id,
            userId: data.userId || "",
            userName: data.userName || "Unknown User",
            userEmail: data.userEmail || "",
            type: data.type || "Share Feedback",
            message: data.message || "",
            createdAt: data.createdAt || 0,
            status: data.status || "new",
          };
        }
      );

      setFeedback(feedbackData);
      setFeedbackCount(feedbackData.length);
    } catch (error) {
      console.error("Failed to load feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadStats();
    loadFeedback();
  }, []);

  // =========================================================
  // MARK FEEDBACK AS RESOLVED
  // =========================================================

  const markResolved = async (feedbackId: string) => {
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
      console.error("Failed to update feedback:", error);
      alert("Failed to update feedback.");
    } finally {
      setUpdatingFeedback(null);
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unknown date";

    return new Date(timestamp).toLocaleString("en-IN", {
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

  const getTypeStyle = (type: string) => {
    if (type === "Report a Problem") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (type === "Report a Rider / Trip") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (type === "Suggest a Feature") {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    if (type === "Ask a Question") {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }

    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">

          <div>
            <h1 className="text-4xl md:text-5xl font-black text-orange-500">
              RideMate Admin Dashboard
            </h1>

            <p className="text-zinc-500 mt-2">
              Manage your RideMate platform
            </p>
          </div>

          <button
            onClick={() => {
              loadStats();
              loadFeedback();
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
            ↻ Refresh
          </button>

        </div>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">

          {/* Users */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Registered users
            </p>

            <h2 className="text-4xl font-black mt-2">
              {users}
            </h2>
          </div>

          {/* Trips */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Total trips posted
            </p>

            <h2 className="text-4xl font-black mt-2">
              {trips}
            </h2>
          </div>

          {/* Requests */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Ride requests sent
            </p>

            <h2 className="text-4xl font-black mt-2">
              {requests}
            </h2>
          </div>

          {/* Completed */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 text-sm">
              Completed rides
            </p>

            <h2 className="text-4xl font-black mt-2">
              {completedRides}
            </h2>
          </div>

          {/* Feedback */}

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
            FEEDBACK SECTION
        ===================================================== */}

        <section className="mt-12">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-3xl font-black">
                Help & Feedback
              </h2>

              <p className="text-zinc-500 mt-1">
                Feedback and reports submitted by RideMate users
              </p>
            </div>

            <div className="text-sm text-zinc-500">
              {feedbackCount} submissions
            </div>

          </div>

          {/* Loading */}

          {loadingFeedback ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
              <p className="text-zinc-400">
                Loading feedback...
              </p>
            </div>
          ) : feedback.length === 0 ? (

            /* No Feedback */

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">

              <div className="text-5xl mb-4">
                📭
              </div>

              <h3 className="text-xl font-bold">
                No feedback yet
              </h3>

              <p className="text-zinc-500 mt-2">
                User feedback will appear here when someone submits it.
              </p>

            </div>

          ) : (

            /* Feedback List */

            <div className="space-y-5">

              {feedback.map((item) => (

                <div
                  key={item.id}
                  className="
                    bg-zinc-900
                    border
                    border-zinc-800
                    rounded-3xl
                    p-6
                    hover:border-zinc-700
                    transition
                  "
                >

                  {/* Top Row */}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                    <div>

                      <div className="flex flex-wrap items-center gap-3">

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
                              item.status === "resolved"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-yellow-500/10 text-yellow-400"
                            }
                          `}
                        >
                          {item.status === "resolved"
                            ? "Resolved"
                            : "New"}
                        </span>

                      </div>

                      {/* User */}

                      <div className="mt-4">

                        <p className="font-black text-lg">
                          {item.userName}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          {item.userEmail}
                        </p>

                      </div>

                    </div>

                    {/* Date */}

                    <p className="text-zinc-600 text-xs">
                      {formatDate(item.createdAt)}
                    </p>

                  </div>

                  {/* Message */}

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

                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>

                  </div>

                  {/* Bottom */}

                  <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <p className="text-xs text-zinc-700">
                      Feedback ID: {item.id}
                    </p>

                    {item.status !== "resolved" && (
                      <button
                        onClick={() => markResolved(item.id)}
                        disabled={
                          updatingFeedback === item.id
                        }
                        className="
                          bg-green-500
                          hover:bg-green-600
                          disabled:opacity-50
                          text-black
                          font-black
                          px-5
                          py-2.5
                          rounded-xl
                          transition
                        "
                      >
                        {updatingFeedback === item.id
                          ? "Updating..."
                          : "✓ Mark Resolved"}
                      </button>
                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>
    </main>
  );
}