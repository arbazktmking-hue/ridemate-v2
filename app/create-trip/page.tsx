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

/*
=========================================================
INDIAN CITIES
=========================================================
*/

const INDIAN_CITIES = [
  "Agartala",
  "Agra",
  "Ahmedabad",
  "Ahmednagar",
  "Aizawl",
  "Ajmer",
  "Akola",
  "Alappuzha",
  "Aligarh",
  "Allahabad",
  "Alwar",
  "Amaravati",
  "Ambala",
  "Amravati",
  "Amritsar",
  "Anand",
  "Anantapur",
  "Aurangabad",
  "Asansol",
  "Baddi",
  "Bahadurgarh",
  "Bareilly",
  "Bathinda",
  "Belagavi",
  "Bellary",
  "Bengaluru",
  "Bangalore",
  "Berhampur",
  "Bhagalpur",
  "Bharatpur",
  "Bharuch",
  "Bhavnagar",
  "Bhilai",
  "Bhilwara",
  "Bhopal",
  "Bhubaneswar",
  "Bhuj",
  "Bidar",
  "Bikaner",
  "Bilaspur",
  "Bokaro",
  "Bokaro Steel City",
  "Chandigarh",
  "Chandrapur",
  "Chennai",
  "Chikkamagaluru",
  "Chittoor",
  "Coimbatore",
  "Cooch Behar",
  "Cuttack",
  "Daman",
  "Darbhanga",
  "Darjeeling",
  "Dehradun",
  "Delhi",
  "Deoghar",
  "Dewas",
  "Dhanbad",
  "Dharwad",
  "Dibrugarh",
  "Dimapur",
  "Durg",
  "Durgapur",
  "Erode",
  "Faridabad",
  "Firozabad",
  "Gandhinagar",
  "Gangtok",
  "Gaya",
  "Ghaziabad",
  "Goa",
  "Gorakhpur",
  "Greater Noida",
  "Gulbarga",
  "Guntur",
  "Gurgaon",
  "Gurugram",
  "Guwahati",
  "Gwalior",
  "Haldia",
  "Haridwar",
  "Hassan",
  "Hathras",
  "Hazaribagh",
  "Hisar",
  "Hosur",
  "Hubballi",
  "Hubli",
  "Hyderabad",
  "Imphal",
  "Indore",
  "Itanagar",
  "Jabalpur",
  "Jaipur",
  "Jalandhar",
  "Jalgaon",
  "Jalna",
  "Jammu",
  "Jamnagar",
  "Jamshedpur",
  "Jhansi",
  "Jodhpur",
  "Jorhat",
  "Junagadh",
  "Kakinada",
  "Kalaburagi",
  "Kalyan",
  "Kanchipuram",
  "Kannur",
  "Kanpur",
  "Kanyakumari",
  "Karimnagar",
  "Karnal",
  "Kasaragod",
  "Kashipur",
  "Katihar",
  "Katra",
  "Kavaratti",
  "Khammam",
  "Kochi",
  "Kohima",
  "Kolhapur",
  "Kolkata",
  "Kollam",
  "Kota",
  "Kottayam",
  "Kozhikode",
  "Kullu",
  "Kurnool",
  "Kurukshetra",
  "Latur",
  "Leh",
  "Lucknow",
  "Ludhiana",
  "Madgaon",
  "Madurai",
  "Mahabalipuram",
  "Malegaon",
  "Mangalore",
  "Mangaluru",
  "Manali",
  "Manipal",
  "Meerut",
  "Moradabad",
  "Mumbai",
  "Mysore",
  "Mysuru",
  "Muzaffarnagar",
  "Muzaffarpur",
  "Nagercoil",
  "Nagpur",
  "Nainital",
  "Nanded",
  "Nashik",
  "Navi Mumbai",
  "Navsari",
  "Nellore",
  "New Delhi",
  "Noida",
  "Panaji",
  "Panipat",
  "Pathankot",
  "Patiala",
  "Patna",
  "Pimpri-Chinchwad",
  "Pondicherry",
  "Port Blair",
  "Prayagraj",
  "Puducherry",
  "Pune",
  "Puri",
  "Raipur",
  "Rajahmundry",
  "Rajkot",
  "Ranchi",
  "Ratlam",
  "Rishikesh",
  "Rohtak",
  "Roorkee",
  "Rourkela",
  "Sagar",
  "Saharanpur",
  "Salem",
  "Sambalpur",
  "Satara",
  "Shillong",
  "Shimla",
  "Shivamogga",
  "Siliguri",
  "Silchar",
  "Sirohi",
  "Sirsa",
  "Solan",
  "Solapur",
  "Srinagar",
  "Surat",
  "Thane",
  "Thanjavur",
  "Thiruvananthapuram",
  "Thrissur",
  "Tinsukia",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupati",
  "Tiruppur",
  "Tumakuru",
  "Udaipur",
  "Udupi",
  "Ujjain",
  "Vadodara",
  "Valsad",
  "Varanasi",
  "Vasai-Virar",
  "Vellore",
  "Vijayawada",
  "Visakhapatnam",
  "Warangal",
  "Wardha",
  "Yamunanagar",
];


/*
=========================================================
CREATE TRIP
=========================================================
*/

function CreateTripContent() {

  const router = useRouter();

  const [editId, setEditId] =
    useState<string | null>(null);

  const [rideType, setRideType] =
    useState<"individual" | "group">(
      "individual"
    );


  /*
  =========================================================
  PROFILE IMAGE
  =========================================================
  */

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


  /*
  =========================================================
  GET EDIT ID
  =========================================================
  */

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


  /*
  =========================================================
  FORM STATES
  =========================================================
  */

  const [destination, setDestination] =
    useState("");

  const [startLocation, setStartLocation] =
    useState("");

  /*
  NEW:
  STARTING CITY
  */

  const [startCity, setStartCity] =
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


  /*
  =========================================================
  LOAD EXISTING TRIP WHEN EDITING
  =========================================================
  */

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


          /*
          LOAD CITY
          */

          setStartCity(
            trip.startCity ||
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


  /*
  =========================================================
  POST / UPDATE TRIP
  =========================================================
  */

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


        /*
        MAKE SURE CITY IS SELECTED
        */

        if (!startCity.trim()) {

          alert(
            "Please select your starting city."
          );

          return;

        }


        if (!startLocation.trim()) {

          alert(
            "Please enter your starting location."
          );

          return;

        }


        let tripData;


        /*
        =====================================================
        EDIT EXISTING TRIP
        =====================================================
        */

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

            /*
            NEW CITY FIELD
            */

            startCity,

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


        /*
        =====================================================
        CREATE NEW TRIP
        =====================================================
        */

        else {

          tripData = {

            status:
              "upcoming",

            rideType,

            destination,

            /*
            NEW CITY FIELD
            */

            startCity,

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


        /*
        =====================================================
        UPDATE EXISTING TRIP
        =====================================================
        */

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


        /*
        =====================================================
        CREATE NEW TRIP
        =====================================================
        */

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


        /*
        =====================================================
        RESET FORM
        =====================================================
        */

        setDestination("");

        setStartLocation("");

        setStartCity("");

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


  /*
  =========================================================
  UI
  =========================================================
  */

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
              STARTING LOCATION CARD
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

            <div>

              <label
                className="
                  block
                  text-orange-400
                  font-bold
                  mb-2
                "
              >
                📍 Starting Location
              </label>

              <p
                className="
                  text-zinc-500
                  text-xs
                  mb-3
                "
              >
                Select your city first, then enter
                the exact starting point.
              </p>

            </div>


            {/* =================================================
                STARTING CITY
            ================================================= */}

            <div>

              <label
                className="
                  block
                  text-zinc-300
                  text-sm
                  font-semibold
                  mb-2
                "
              >
                Starting City
              </label>


              <input
                type="text"
                list="indian-cities"
                placeholder="Search your city..."
                value={startCity}
                onChange={(e) =>
                  setStartCity(
                    e.target.value
                  )
                }
                className="
                  w-full
                  p-4
                  rounded-2xl
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  outline-none
                  focus:border-orange-500
                "
              />


              <datalist id="indian-cities">

                {INDIAN_CITIES.map(
                  (city) => (

                    <option
                      key={city}
                      value={city}
                    />

                  )
                )}

              </datalist>

            </div>


            {/* =================================================
                EXACT STARTING LOCATION
            ================================================= */}

            <div>

              <label
                className="
                  block
                  text-zinc-300
                  text-sm
                  font-semibold
                  mb-2
                "
              >
                Exact Starting Point
              </label>


              <input
                type="text"
                placeholder="Example: HSR Layout"
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
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  outline-none
                  focus:border-orange-500
                "
              />

            </div>


            {/* =================================================
                PREVIEW
            ================================================= */}

            {(startLocation ||
              startCity) && (

              <div
                className="
                  bg-orange-500/10
                  border
                  border-orange-500/20
                  rounded-xl
                  p-3
                "
              >

                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-widest
                    text-orange-400
                    font-bold
                    mb-1
                  "
                >
                  Explore Trips Preview
                </p>


                <p
                  className="
                    text-white
                    font-bold
                  "
                >
                  📍{" "}
                  {startLocation ||
                    "Starting point"}

                  {startCity && (
                    <>
                      , {startCity}
                    </>
                  )}

                </p>

              </div>

            )}

          </div>


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