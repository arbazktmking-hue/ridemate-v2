"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
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
      const snapshot = await getDocs(
        collection(db, "rideReviews")
      );

      const riderReviews: any[] = [];

      let totalRating = 0;

      snapshot.forEach((doc) => {
        const review = doc.data();

        if (review.rider === riderName) {
          riderReviews.push(review);

          totalRating += review.rating || 0;
        }
      });

      setReviews(
        riderReviews.sort(
          (a, b) => b.createdAt - a.createdAt
        )
      );

      setAvgRating(
        riderReviews.length
          ? totalRating / riderReviews.length
          : 0
      );
    };

    loadReviews();
  }, [riderName]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-black text-orange-500 mb-3">
          ⭐ Reviews for {riderName}
        </h1>

        <p className="text-xl text-yellow-400 mb-8">
          Average Rating: {avgRating.toFixed(1)} / 5
        </p>

        {reviews.length === 0 ? (
          <div className="bg-zinc-900 p-6 rounded-2xl">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-4">

            {reviews.map((review, index) => (
              <div
                key={index}
                className="
                  bg-zinc-900
                  p-5
                  rounded-2xl
                  border border-zinc-800
                "
              >
                <div className="text-yellow-400 text-xl font-bold">
                  {"⭐".repeat(review.rating)}
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