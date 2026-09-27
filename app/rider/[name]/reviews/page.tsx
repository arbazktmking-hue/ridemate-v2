"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function RiderReviewsPage() {
  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );

  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        /* ==================================================
           FIND RIDER UID
        ================================================== */

        let riderUid = "";

        // First try username
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", riderName),
          limit(1)
        );

        const usernameSnapshot = await getDocs(
          usernameQuery
        );

        if (!usernameSnapshot.empty) {
          riderUid =
            usernameSnapshot.docs[0].id;
        }

        // Fallback to name
        if (!riderUid) {
          const nameQuery = query(
            collection(db, "users"),
            where("name", "==", riderName),
            limit(1)
          );

          const nameSnapshot = await getDocs(
            nameQuery
          );

          if (!nameSnapshot.empty) {
            riderUid =
              nameSnapshot.docs[0].id;
          }
        }

        if (!riderUid) {
          setReviews([]);
          setAvgRating(0);
          return;
        }

        /* ==================================================
           LOAD REVIEWS
        ================================================== */

        const snapshot = await getDocs(
          collection(db, "rideReviews")
        );

        const riderReviews: any[] = [];

        let totalRating = 0;

        snapshot.forEach((reviewDoc) => {
          const review = reviewDoc.data();

          /*
           * Firebase UID is the real identity.
           * rider is kept only as display information.
           */
          if (
            review.riderUid === riderUid
          ) {
            riderReviews.push({
              id: reviewDoc.id,
              ...review,
            });

            totalRating += Number(
              review.rating || 0
            );
          }
        });

        riderReviews.sort(
          (a, b) =>
            Number(b.createdAt || 0) -
            Number(a.createdAt || 0)
        );

        setReviews(riderReviews);

        setAvgRating(
          riderReviews.length
            ? totalRating /
                riderReviews.length
            : 0
        );
      } catch (error) {
        console.error(
          "Failed to load rider reviews:",
          error
        );

        setReviews([]);
        setAvgRating(0);
      }
    };

    loadReviews();
  }, [riderName]);

  return (
    <main className="min-h-screen bg-black text-white px-6 pt-24 pb-10">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl md:text-5xl font-black text-orange-500 mb-2">
          Reviews
        </h1>

        <p className="text-zinc-400 mb-8">
          What riders are saying about{" "}
          {riderName}
        </p>

        <p className="text-xl text-yellow-400 mb-8">
          Average Rating:{" "}
          {avgRating.toFixed(1)} / 5
        </p>

        {reviews.length === 0 ? (
          <div className="bg-zinc-900 p-6 rounded-2xl">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-4">

            {reviews.map((review) => (
              <div
                key={review.id}
                className="
                  bg-zinc-900
                  p-5
                  rounded-2xl
                  border border-zinc-800
                "
              >
                <div className="text-yellow-400 text-xl font-bold">
                  {"⭐".repeat(
                    Number(review.rating || 0)
                  )}
                </div>

                <p className="mt-3 text-zinc-300">
                  {review.review}
                </p>

                <p className="mt-4 text-sm text-zinc-500">
                  — {review.reviewer}
                </p>
              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}