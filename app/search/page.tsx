"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PageBackground from "../components/PageBackground";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  Search,
  X,
  UserRound,
  Loader2,
} from "lucide-react";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   =========================================================
   LOAD ALL REGISTERED USERS
   =========================================================
  */

  useEffect(() => {
    const loadRiders = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "users")
        );

        const riderMap: {
          [key: string]: any;
        } = {};

        snapshot.forEach((userDoc) => {
          const user = userDoc.data();

          const username = user.username;

          if (
            !username ||
            typeof username !== "string"
          ) {
            return;
          }

          const cleanUsername =
            username.trim();

          const key =
            cleanUsername.toLowerCase();

          /*
           Prevent duplicate usernames
          */

          if (!riderMap[key]) {
            riderMap[key] = {
              name: cleanUsername,
              image: user.image || "",
            };
          }
        });

        const loadedRiders =
          Object.values(riderMap);

        /*
         Sort riders alphabetically
        */

        loadedRiders.sort(
          (a: any, b: any) =>
            a.name.localeCompare(b.name)
        );

        setRiders(loadedRiders);
      } catch (error) {
        console.error(
          "Failed to load riders:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadRiders();
  }, []);

  /*
   =========================================================
   FILTER RIDERS
   =========================================================
  */

  const filteredRiders =
    riders.filter((rider) => {
      const riderName =
        rider.name?.toLowerCase() || "";

      const searchText =
        search.trim().toLowerCase();

      return riderName.includes(searchText);
    });

  /*
   =========================================================
   CLEAR SEARCH
   =========================================================
  */

  const clearSearch = () => {
    setSearch("");
  };

  /*
   =========================================================
   RENDER
   =========================================================
  */

  return (
    <PageBackground>

      <main
        className="
          w-full
          min-h-screen
          text-white
          px-4
          sm:px-6
          pt-28
          sm:pt-32
          pb-10
        "
      >

        <div className="max-w-4xl mx-auto">

          {/* =================================================
              HEADING
          ================================================= */}

          <div className="mb-7 sm:mb-9">

            <h1
              className="
                text-4xl
                sm:text-5xl
                font-black
                text-orange-500
                leading-tight
              "
            >
              Search Riders 🔍
            </h1>

            <p
              className="
                mt-2
                text-sm
                sm:text-base
                text-zinc-500
              "
            >
              Find riders registered on RideMate.
            </p>

          </div>


          {/* =================================================
              SEARCH BAR
          ================================================= */}

          <div className="relative mb-7">

            <Search
              size={21}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-zinc-500
                pointer-events-none
              "
            />

            <input
              type="text"
              placeholder="Search rider..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="
                w-full
                p-4
                pl-12
                pr-12
                rounded-2xl
                bg-zinc-900
                border
                border-zinc-700
                text-white
                placeholder:text-zinc-600
                outline-none
                focus:border-orange-500
                focus:ring-1
                focus:ring-orange-500/30
                transition
              "
            />

            {/* CLEAR SEARCH */}

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-zinc-500
                  hover:text-white
                  transition
                "
              >
                <X size={20} />
              </button>
            )}

          </div>


          {/* =================================================
              RIDER HEADER
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-between
              mb-4
              px-1
            "
          >

            <h2
              className="
                text-sm
                sm:text-base
                font-black
                uppercase
                tracking-widest
                text-zinc-400
              "
            >
              {search.trim()
                ? "Search Results"
                : "All Riders"}
            </h2>

            {!loading && (
              <span
                className="
                  text-xs
                  text-zinc-600
                "
              >
                {filteredRiders.length}{" "}
                {filteredRiders.length === 1
                  ? "rider"
                  : "riders"}
              </span>
            )}

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                py-16
                text-center
              "
            >

              <Loader2
                size={32}
                className="
                  text-orange-500
                  animate-spin
                  mb-4
                "
              />

              <p
                className="
                  text-zinc-500
                  text-sm
                "
              >
                Loading RideMate riders...
              </p>

            </div>
          )}


          {/* =================================================
              RIDER LIST
          ================================================= */}

          {!loading &&
            filteredRiders.length > 0 && (

              <div className="space-y-3">

                {filteredRiders.map(
                  (rider, index) => (

                    <Link
                      key={`${rider.name}-${index}`}
                      href={`/rider/${encodeURIComponent(
                        rider.name
                      )}`}
                      className="
                        group
                        flex
                        items-center
                        gap-4
                        p-4
                        rounded-2xl
                        bg-zinc-900
                        border
                        border-zinc-800
                        hover:border-orange-500
                        hover:bg-zinc-900/80
                        transition-all
                        duration-200
                      "
                    >

                      {/* =================================================
                          PROFILE IMAGE
                      ================================================= */}

                      <div
                        className="
                          flex-shrink-0
                          w-14
                          h-14
                          sm:w-16
                          sm:h-16
                          rounded-full
                          overflow-hidden
                          bg-zinc-800
                          border
                          border-zinc-700
                          group-hover:border-orange-500
                          transition
                        "
                      >

                        {rider.image ? (
                          <img
                            src={rider.image}
                            alt={rider.name}
                            className="
                              w-full
                              h-full
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              w-full
                              h-full
                              flex
                              items-center
                              justify-center
                              text-zinc-500
                            "
                          >
                            <UserRound size={27} />
                          </div>
                        )}

                      </div>


                      {/* =================================================
                          RIDER NAME
                      ================================================= */}

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >

                        <h3
                          className="
                            text-base
                            sm:text-lg
                            font-black
                            text-white
                            truncate
                            group-hover:text-orange-400
                            transition
                          "
                        >
                          {rider.name}
                        </h3>

                        <p
                          className="
                            text-xs
                            sm:text-sm
                            text-zinc-600
                            mt-0.5
                          "
                        >
                          RideMate rider
                        </p>

                      </div>


                      {/* =================================================
                          ARROW
                      ================================================= */}

                      <div
                        className="
                          flex-shrink-0
                          text-zinc-600
                          group-hover:text-orange-500
                          transition
                        "
                      >
                        <span className="text-xl">
                          →
                        </span>
                      </div>

                    </Link>

                  )
                )}

              </div>
            )}


          {/* =================================================
              NO RIDERS / NO SEARCH RESULTS
          ================================================= */}

          {!loading &&
            filteredRiders.length === 0 && (

              <div
                className="
                  py-16
                  px-6
                  text-center
                  bg-zinc-900/50
                  border
                  border-zinc-800
                  rounded-2xl
                "
              >

                <div className="text-5xl mb-4">
                  🏍️
                </div>

                <h3
                  className="
                    text-lg
                    sm:text-xl
                    font-black
                    text-white
                  "
                >
                  No riders found
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    text-zinc-500
                  "
                >
                  {search.trim()
                    ? `No rider matches "${search}".`
                    : "No riders have registered yet."}
                </p>

              </div>
            )}

        </div>

      </main>

    </PageBackground>
  );
}