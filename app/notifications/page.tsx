
"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

type NotificationItem = {
  id: string;
  text?: string;
  read?: boolean;
  createdAt?: any;
  actorUid?: string;
  recipientUid?: string;
  user?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch only notifications belonging to this signed-in user.
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("recipientUid", "==", user.uid)
        );

        const snapshot = await getDocs(notificationsQuery);

        const loaded: NotificationItem[] = snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          } as NotificationItem)
        );

        // Newest notifications first.
        loaded.sort((a, b) => {
          const getTime = (value: any) => {
            if (value?.toMillis) return value.toMillis();
            if (typeof value === "number") return value;
            return 0;
          };

          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        if (!active) return;

        setNotifications(loaded);

        // Mark unread notifications as read.
        const unreadNotifications = snapshot.docs.filter(
          (docSnap) => docSnap.data().read === false
        );

        await Promise.all(
          unreadNotifications.map((docSnap) =>
            updateDoc(docSnap.ref, { read: true })
          )
        );
      } catch (err) {
        console.error("Notifications loading error:", err);

        if (active) {
          setError(
            "Unable to load notifications. Please refresh and try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <PageBackground>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-4xl md:text-5xl font-black text-orange-500 mb-8">
          Notifications 🔔
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-gray-400">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="bg-zinc-900 p-6 rounded-2xl border border-red-800 text-red-400">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-gray-400">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔔</div>

                  <div className="flex-1">
                    <p className="text-white">
                      {notification.text || "You have a new notification."}
                    </p>

                    {notification.createdAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(
                          typeof notification.createdAt === "number"
                            ? notification.createdAt
                            : notification.createdAt.toMillis?.() || 0
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageBackground>
  );
}
