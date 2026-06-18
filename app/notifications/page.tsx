"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!currentUser.name) return;

      const snapshot = await getDocs(
        collection(db, "notifications")
      );

      const loaded: any[] = [];

      for (const docSnap of snapshot.docs) {
        const notification = docSnap.data();

        if (notification.user === currentUser.name) {
          loaded.push({
            id: docSnap.id,
            ...notification,
          });

          // Mark unread notifications as read
          if (notification.read === false) {
            await updateDoc(docSnap.ref, {
              read: true,
            });
          }
        }
      }

      // newest first
      loaded.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      setNotifications(loaded);
    };

    loadNotifications();
  }, []);

  return (
    <PageBackground>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Notifications 🔔
        </h1>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"
              >
                {notification.text}
              </div>
            ))
          )}
        </div>
      </div>
    </PageBackground>
  );
}