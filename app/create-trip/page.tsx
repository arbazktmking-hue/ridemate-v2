"use client";

import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useRouter } from "next/navigation";


function CreateTripContent() {

  const router = useRouter();

  const [editId, setEditId] =
    useState<string | null>(null);

  const [rideType, setRideType] =
    useState<"individual" | "group">(
      "individual"
    );


  /* =========================================================
     LOAD USER PROFILE IMAGE
  ========================================================= */

  const [tripImage, setTripImage] =
    useState("");


  useEffect(() => {

    const savedUser =
      localStorage.getItem(
        "ridemateUser"
      );

    if (savedUser) {

      const user =
        JSON.parse(savedUser);

      if (user.image) {

        setTripImage(
          user.image
        );

      }

    }

  }, []);


  /* =========================================================
     GET EDIT ID
  ========================================================= */

  useEffect(() => {

    const params =
      new URLSearchParams(
        window.location.search
      );

    setEditId(
      params.get("edit")
    );

  }, []);


  const isEditing =
    !!editId;


  /* =========================================================
     FORM STATES
  ========================================================= */

  const [destination, setDestination] =
    useState("");

  const [startLocation, setStartLocation] =
    useState("");

  const [bike, setBike] =
    useState("");

  const [caption, setCaption] =
    useState("");

  const [distance, setDistance] =
    useState("");

  const [tripDate, setTripDate] =
    useState("");

  const [itinerary, setItinerary] =
    useState("");

  const [tripPrice, setTripPrice] =
    useState("");


  /* =========================================================
     LOAD EXISTING TRIP WHEN EDITING
  ========================================================= */

  useEffect(() => {

    const loadTrip =
      async () => {

        if (!editId)
          return;

        try {

          const snap =
            await getDoc(
              doc(
                db,
                "trips",
                editId
              )
            );

          if (!snap.exists())
            return;

          const trip =
            snap.data();


          setDestination(
            trip.destination ||
              ""
          );

          setStartLocation(
            trip.startLocation ||
              ""
          );

          setBike(
            trip.bike ||
              ""
          );

          setCaption(
            trip.caption ||
              ""
          );

          setDistance(
            trip.distance ||
              ""
          );

          setTripDate(
            trip.tripDate ||
              ""
          );

          setItinerary(
            trip.itinerary ||
              ""
          );

          setTripPrice(
            trip.tripPrice ||
              ""
          );

          setRideType(
            trip.rideType ||
              "individual"
          );

        } catch (error) {

          console.error(
            "Failed to load trip:",
            error
          );

        }

      };


    loadTrip();

  }, [editId]);


  /* =========================================================
     POST / UPDATE TRIP
  ========================================================= */

  const postTrip =
    async () => {

      try {

        const user =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );


        if (!user.name) {

          alert(
            "Please login first."
          );

          return;

        }


        let tripData;


        /* =====================================================
           EDIT EXISTING TRIP
        ===================================================== */

        if (
          isEditing &&
          editId
        ) {

          const existingTrip =
            (
              await getDoc(
                doc(
                  db,
                  "trips",
                  editId
                )
              )
            ).data();


          tripData = {

            ...existingTrip,

            status:
              "upcoming",

            rideType,

            destination,

            startLocation,

            distance,

            bike,

            tripDate,

            itinerary:
              itinerary.trim(),

            tripPrice,

            caption,

            image:
              tripImage,

            userName:
              user.name,

            userImage:
              user.image || "",

          };

        }

        /* =====================================================
           CREATE NEW TRIP
        ===================================================== */

        else {

          tripData = {

            status:
              "upcoming",

            rideType,

            destination,

            startLocation,

            distance,

            bike,

            tripDate,

            itinerary:
              itinerary.trim(),

            tripPrice,

            caption,

            image:
              tripImage,

            userName:
              user.name,

            userImage:
              user.image || "",

          };

        }


        /* =====================================================
           UPDATE EXISTING TRIP
        ===================================================== */

        if (
          isEditing &&
          editId
        ) {

          await updateDoc(
            doc(
              db,
              "trips",
              editId
            ),
            tripData
          );


          alert(
            "✅ Trip updated successfully!"
          );


          router.push(
            "/my-rides"
          );

          return;

        }


        /* =====================================================
           CREATE NEW TRIP
        ===================================================== */

        await addDoc(
          collection(
            db,
            "trips"
          ),
          {

            ...tripData,

            createdAt:
              new Date(),

            likes:
              0,

            comments:
              [],

          }
        );


        alert(
          "🔥 Trip Posted Successfully!"
        );


        /* =====================================================
           RESET FORM
        ===================================================== */

        setDestination("");

        setStartLocation("");

        setDistance("");

        setBike("");

        setCaption("");

        setTripDate("");

        setTripPrice("");

        setItinerary("");


      } catch (error) {

        console.error(
          "Failed to save trip:",
          error
        );

        alert(
          "Failed to save trip"
        );

      }

    };


  /* =========================================================
     UI
  ========================================================= */

  return (

    <PageBackground>

      <div
        className="
          w-full
          max-w-3xl
          mx-auto
          bg-zinc-900
          rounded-3xl
          border
          border-zinc-800
          p-4
          sm:p-6
          md:p-8
          mt-8
          mb-8
        "
      >

        {/* =====================================================
            PROFILE IMAGE
        ===================================================== */}

        {tripImage && (

          <div
            className="
              flex
              justify-center
              mb-6
            "
          >

            <img
              src={tripImage}
              alt="Profile"
              className="
                w-32
                h-32
                object-cover
                rounded-full
                border-4
                border-orange-500
                shadow-xl
              "
            />

          </div>

        )}


        <div
          className="
            space-y-6
            mt-8
          "
        >


          {/* ===================================================
              RIDE TYPE
          =================================================== */}

          <div
            className="
              space-y-2
            "
          >

            <label
              className="
                font-bold
                text-orange-400
              "
            >
              Ride Type
            </label>


            <select
              value={rideType}
              onChange={(e) =>
                setRideType(
                  e.target.value as
                    | "individual"
                    | "group"
                )
              }
              className="
                w-full
                p-4
                rounded-2xl
                bg-black
                border
                border-zinc-700
                text-white
              "
            >

              <option value="individual">
                👤 Individual Ride (Need Pillion)
              </option>

              <option value="group">
                👥 Group Ride (Bring Your Own Bike)
              </option>

            </select>

          </div>


          {/* ===================================================
              DESTINATION
          =================================================== */}

          <input
            type="text"
            placeholder="Destination"
            value={destination}
            onChange={(e) =>
              setDestination(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              STARTING LOCATION
          =================================================== */}

          <input
            type="text"
            placeholder="Starting Location"
            value={startLocation}
            onChange={(e) =>
              setStartLocation(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              DISTANCE
          =================================================== */}

          <input
            type="number"
            placeholder="Distance (KM)"
            value={distance}
            onChange={(e) =>
              setDistance(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              DATE & TIME
          =================================================== */}

          <input
            type="datetime-local"
            value={tripDate}
            onChange={(e) =>
              setTripDate(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              TRIP PRICE
          =================================================== */}

          <input
            type="number"
            placeholder="Trip Price (₹)"
            value={tripPrice}
            onChange={(e) =>
              setTripPrice(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              BIKE
          =================================================== */}

          <input
            type="text"
            placeholder="Bike Name"
            value={bike}
            onChange={(e) =>
              setBike(
                e.target.value
              )
            }
            className="
              w-full
              p-4
              rounded-2xl
              bg-black
              border
              border-zinc-700
              text-white
              outline-none
              focus:border-orange-500
            "
          />


          {/* ===================================================
              STORY + ITINERARY
          =================================================== */}

          <div
            className="
              bg-black
              border
              border-zinc-700
              rounded-2xl
              p-4
              space-y-4
            "
          >

            {/* RIDE STORY */}

            <div>

              <label
                className="
                  block
                  text-orange-400
                  font-bold
                  mb-2
                "
              >
                📝 Ride Story
              </label>


              <textarea
                placeholder="Tell riders about your trip..."
                value={caption}
                onChange={(e) =>
                  setCaption(
                    e.target.value
                  )
                }
                className="
                  w-full
                  h-40
                  bg-transparent
                  outline-none
                  resize-none
                  text-white
                "
              />

            </div>


            {/* ITINERARY */}

            <div
              className="
                border-t
                border-zinc-700
                pt-4
              "
            >

              <label
                className="
                  block
                  text-orange-400
                  font-bold
                  mb-2
                "
              >
                🗺️ Itinerary (Optional)
              </label>


              <textarea
                value={itinerary}
                onChange={(e) =>
                  setItinerary(
                    e.target.value
                  )
                }
                placeholder={`Example:
• Bangalore → Chitradurga
• Breakfast stop
• Lunch at Davangere
• Sunset viewpoint`}
                className="
                  w-full
                  h-28
                  bg-transparent
                  outline-none
                  resize-none
                  text-white
                "
              />

            </div>

          </div>


          {/* ===================================================
              POST BUTTON
          =================================================== */}

          <button
            onClick={postTrip}
            className="
              w-full
              bg-orange-500
              text-black
              py-4
              rounded-2xl
              text-xl
              font-black
              hover:bg-orange-400
              hover:scale-[1.02]
              transition
            "
          >

            {isEditing
              ? "Save Changes"
              : "Post Trip"}

          </button>

        </div>

      </div>

    </PageBackground>

  );

}


export default CreateTripContent;