"use client";

import { useEffect, useRef, useState } from "react";
import PageBackground from "../components/PageBackground";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
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
CONSTANTS
=========================================================
*/

const DESTINATION_RADIUS_KM = 20;

const BENGALURU = {
  lat: 12.9716,
  lng: 77.5946,
};

/*
=========================================================
GOOGLE MAPS LOADER
=========================================================
*/

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "Google Maps can only load in the browser."
      )
    );
  }

  if (
    (window as any).google?.maps?.importLibrary
  ) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<void>(
    (resolve, reject) => {
      const apiKey =
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        reject(
          new Error(
            "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Check your .env.local file."
          )
        );

        return;
      }

      const callbackName =
        "ridemateGoogleMapsCallback";

      (
        window as any
      )[callbackName] = () => {
        console.log(
          "✅ Google Maps JavaScript API loaded."
        );

        if (
          (window as any).google?.maps?.importLibrary
        ) {
          resolve();
        } else {
          reject(
            new Error(
              "Google Maps callback fired, but the Maps API is unavailable."
            )
          );
        }
      };

      const oldScript =
        document.querySelector(
          'script[data-ridemate-google-maps="true"]'
        );

      if (oldScript) {
        oldScript.remove();
      }

      const script =
        document.createElement("script");

      script.src =
        `https://maps.googleapis.com/maps/api/js` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&v=weekly` +
        `&loading=async` +
        `&callback=${callbackName}`;

      script.async = true;
      script.defer = true;

      script.dataset.ridemateGoogleMaps =
        "true";

      script.onerror = () => {
        console.error(
          "❌ Google Maps script failed to load."
        );

        reject(
          new Error(
            "Google Maps failed to load. Check your API key, website restrictions, billing, and enabled APIs."
          )
        );
      };

      document.head.appendChild(script);
    }
  );

  return googleMapsPromise;
}

/*
=========================================================
LOCATION TYPE
=========================================================
*/

type LocationData = {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
};

/*
=========================================================
LOCATION PICKER PROPS
=========================================================
*/

type LocationPickerProps = {
  open: boolean;
  title: string;
  initialLocation: LocationData | null;
  onClose: () => void;
  onConfirm: (
    location: LocationData
  ) => void;
};

/*
=========================================================
LOCATION PICKER
=========================================================
*/

function LocationPicker({
  open,
  title,
  initialLocation,
  onClose,
  onConfirm,
}: LocationPickerProps) {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const autocompleteContainerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<any>(null);

  const markerRef =
    useRef<any>(null);

  const geocoderRef =
    useRef<any>(null);

  const autocompleteRef =
    useRef<any>(null);

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState<LocationData | null>(
    initialLocation
  );

  const [
    loadingMap,
    setLoadingMap,
  ] = useState(false);

  const [
    mapError,
    setMapError,
  ] = useState("");

  const [
    reverseGeocoding,
    setReverseGeocoding,
  ] = useState(false);

  /*
  =========================================================
  RESET WHEN OPENED
  =========================================================
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedLocation(
      initialLocation
    );

    setMapError("");
  }, [
    open,
    initialLocation,
  ]);

  /*
  =========================================================
  INITIALIZE MAP
  =========================================================
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const initializeMap =
      async () => {
        try {
          setLoadingMap(true);
          setMapError("");

          await loadGoogleMaps();

          if (cancelled) {
            return;
          }

          const google =
            (window as any).google;

          if (
            !google?.maps?.importLibrary
          ) {
            throw new Error(
              "Google Maps is not available."
            );
          }

          /*
          =================================================
          LOAD LIBRARIES
          =================================================
          */

          const [
            mapsLibrary,
            placesLibrary,
            markerLibrary,
            geocodingLibrary,
          ] =
            await Promise.all([
              google.maps.importLibrary(
                "maps"
              ),
              google.maps.importLibrary(
                "places"
              ),
              google.maps.importLibrary(
                "marker"
              ),
              google.maps.importLibrary(
                "geocoding"
              ),
            ]);

          if (cancelled) {
            return;
          }

          const Map =
            mapsLibrary.Map;

          const PlaceAutocompleteElement =
            placesLibrary.PlaceAutocompleteElement;

          const AdvancedMarkerElement =
            markerLibrary.AdvancedMarkerElement;

          const Geocoder =
            geocodingLibrary.Geocoder;

          if (
            !mapContainerRef.current ||
            !autocompleteContainerRef.current
          ) {
            return;
          }

          /*
          =================================================
          INITIAL POSITION
          =================================================
          */

          const startingPosition =
            initialLocation
              ? {
                  lat:
                    initialLocation.latitude,
                  lng:
                    initialLocation.longitude,
                }
              : BENGALURU;

          /*
          =================================================
          CREATE MAP
          =================================================
          */

          const map =
            new Map(
              mapContainerRef.current,
              {
                center:
                  startingPosition,

                zoom:
                  initialLocation
                    ? 15
                    : 11,

                mapId:
                  "DEMO_MAP_ID",

                mapTypeControl:
                  false,

                streetViewControl:
                  false,

                fullscreenControl:
                  true,

                gestureHandling:
                  "greedy",
              }
            );

          mapRef.current =
            map;

          /*
          =================================================
          GEOCODER
          =================================================
          */

          const geocoder =
            new Geocoder();

          geocoderRef.current =
            geocoder;

          /*
          =================================================
          MARKER
          =================================================
          */

          const marker =
            new AdvancedMarkerElement(
              {
                map,

                position:
                  startingPosition,

                gmpDraggable:
                  true,

                title:
                  "RideMate location",
              }
            );

          markerRef.current =
            marker;

          /*
          =================================================
          UPDATE LOCATION
          =================================================
          */

          const updateLocation =
            ({
              latitude,
              longitude,
              address,
              placeId,
            }: LocationData) => {
              const location = {
                lat: latitude,
                lng: longitude,
              };

              marker.position =
                location;

              map.setCenter(
                location
              );

              map.setZoom(16);

              setSelectedLocation({
                latitude,
                longitude,
                address,
                placeId,
              });
            };

          /*
          =================================================
          REVERSE GEOCODING
          =================================================
          */

          const reverseGeocode =
            async (
              latitude: number,
              longitude: number
            ) => {
              try {
                setReverseGeocoding(
                  true
                );

                setMapError("");

                const response =
                  await geocoder.geocode(
                    {
                      location: {
                        lat: latitude,
                        lng: longitude,
                      },
                    }
                  );

                const result =
                  response.results?.[0];

                if (!result) {
                  throw new Error(
                    "No address found."
                  );
                }

                updateLocation({
                  latitude,
                  longitude,
                  address:
                    result.formatted_address ||
                    `${latitude.toFixed(
                      6
                    )}, ${longitude.toFixed(
                      6
                    )}`,
                  placeId:
                    result.place_id ||
                    "",
                });
              } catch (error) {
                console.error(
                  "Reverse geocoding failed:",
                  error
                );

                setMapError(
                  "Could not identify this location. Try moving the pin slightly."
                );
              } finally {
                setReverseGeocoding(
                  false
                );
              }
            };

          /*
          =================================================
          MAP CLICK
          =================================================
          */

          map.addListener(
            "click",
            (event: any) => {
              if (
                event.latLng
              ) {
                void reverseGeocode(
                  event.latLng.lat(),
                  event.latLng.lng()
                );
              }
            }
          );

          /*
          =================================================
          MARKER DRAG
          =================================================
          */

          marker.addListener(
            "dragend",
            async () => {
              const position =
                marker.position;

              if (!position) {
                return;
              }

              const latitude =
                typeof position.lat ===
                "function"
                  ? position.lat()
                  : position.lat;

              const longitude =
                typeof position.lng ===
                "function"
                  ? position.lng()
                  : position.lng;

              if (
                typeof latitude !==
                  "number" ||
                typeof longitude !==
                  "number"
              ) {
                return;
              }

              await reverseGeocode(
                latitude,
                longitude
              );
            }
          );

          /*
          =================================================
          GOOGLE PLACES AUTOCOMPLETE
          =================================================
          */

          autocompleteContainerRef.current.innerHTML =
            "";

          const autocomplete =
            new PlaceAutocompleteElement();

          autocompleteRef.current =
            autocomplete;

          (
            autocomplete as any
          ).includedRegionCodes = [
            "in",
          ];

          (
            autocomplete as any
          ).placeholder =
            "Search a place, road, area or landmark...";

          /*
          =================================================
          KEEP SEARCH ABOVE MAP
          =================================================
          */

          const autocompleteElement =
            autocomplete as HTMLElement;

          autocompleteElement.style.width =
            "100%";

          autocompleteElement.style.position =
            "relative";

          autocompleteElement.style.zIndex =
            "9999";

          autocompleteElement.style.display =
            "block";

          autocompleteContainerRef.current.appendChild(
            autocomplete
          );

          /*
          =================================================
          PLACE SELECT
          =================================================
          */

          autocomplete.addEventListener(
            "gmp-select",
            async (
              event: any
            ) => {
              try {
                setMapError("");

                const placePrediction =
                  event.placePrediction;

                if (
                  !placePrediction
                ) {
                  return;
                }

                const place =
                  placePrediction.toPlace();

                await place.fetchFields({
                  fields: [
                    "displayName",
                    "formattedAddress",
                    "location",
                  ],
                });

                if (
                  !place.location
                ) {
                  setMapError(
                    "Google could not find exact coordinates for this place."
                  );

                  return;
                }

                const latitude =
                  place.location.lat();

                const longitude =
                  place.location.lng();

                const address =
                  place.formattedAddress ||
                  place.displayName ||
                  "Selected location";

                updateLocation({
                  latitude,
                  longitude,
                  address,
                  placeId:
                    place.id ||
                    "",
                });

                /*
                =================================================
                FIT MAP TO PLACE
                =================================================
                */

                if (
                  place.viewport
                ) {
                  map.fitBounds(
                    place.viewport
                  );
                }
              } catch (error) {
                console.error(
                  "Place selection failed:",
                  error
                );

                setMapError(
                  "Could not select this place. Please try again."
                );
              }
            }
          );

          /*
          =================================================
          DONE
          =================================================
          */

          setLoadingMap(false);
        } catch (error) {
          console.error(
            "Google Maps initialization failed:",
            error
          );

          setMapError(
            error instanceof Error
              ? error.message
              : "Google Maps could not be loaded."
          );

          setLoadingMap(false);
        }
      };

    void initializeMap();

    return () => {
      cancelled = true;

      if (
        autocompleteContainerRef.current
      ) {
        autocompleteContainerRef.current.innerHTML =
          "";
      }

      mapRef.current =
        null;

      markerRef.current =
        null;

      geocoderRef.current =
        null;

      autocompleteRef.current =
        null;
    };
  }, [open]);

  /*
  =========================================================
  DON'T RENDER
  =========================================================
  */

  if (!open) {
    return null;
  }

  /*
  =========================================================
  MODAL
  =========================================================
  */

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        bg-black/80
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-3
        sm:p-5
      "
    >
      <div
        className="
          relative
          w-full
          max-w-5xl
          bg-zinc-950
          border
          border-zinc-800
          rounded-3xl
          overflow-visible
          shadow-2xl
          z-[100]
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            p-4
            sm:p-5
            border-b
            border-zinc-800
          "
        >
          <div>
            <h2
              className="
                text-xl
                sm:text-2xl
                font-black
                text-white
              "
            >
              📍 {title}
            </h2>

            <p
              className="
                text-zinc-500
                text-xs
                sm:text-sm
                mt-1
              "
            >
              Search for a place or tap the map.
              You can also drag the pin.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-10
              h-10
              rounded-full
              bg-zinc-800
              hover:bg-zinc-700
              text-white
              text-xl
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            ×
          </button>
        </div>

        {/* SEARCH */}

        <div
          className="
            relative
            z-[1000]
            p-4
            sm:p-5
            pb-3
          "
        >
          <div
            className="
              relative
              z-[1000]
              bg-white
              rounded-2xl
              overflow-visible
            "
          >
            <div
              ref={
                autocompleteContainerRef
              }
              className="
                relative
                z-[1000]
                w-full
                overflow-visible
              "
            />
          </div>
        </div>

        {/* MAP */}

        <div
          className="
            relative
            z-0
            px-4
            sm:px-5
          "
        >
          <div
            className="
              relative
              w-full
              h-[360px]
              sm:h-[450px]
              rounded-2xl
              overflow-hidden
              border
              border-zinc-800
            "
          >
            <div
              ref={
                mapContainerRef
              }
              className="
                absolute
                inset-0
              "
            />

            {loadingMap && (
              <div
                className="
                  absolute
                  inset-0
                  bg-zinc-950/80
                  flex
                  items-center
                  justify-center
                  z-10
                "
              >
                <div
                  className="
                    text-center
                    text-white
                  "
                >
                  <div
                    className="
                      text-3xl
                      mb-2
                    "
                  >
                    🗺️
                  </div>

                  <p className="font-bold">
                    Loading Google Maps...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SELECTED LOCATION */}

        <div
          className="
            p-4
            sm:p-5
          "
        >
          {mapError && (
            <div
              className="
                bg-red-500/10
                border
                border-red-500/30
                text-red-300
                rounded-xl
                p-3
                text-sm
                mb-3
              "
            >
              ⚠️ {mapError}
            </div>
          )}

          {reverseGeocoding && (
            <div
              className="
                bg-orange-500/10
                border
                border-orange-500/20
                text-orange-300
                rounded-xl
                p-3
                text-sm
                mb-3
              "
            >
              📍 Identifying selected location...
            </div>
          )}

          {selectedLocation ? (
            <div
              className="
                bg-orange-500/10
                border
                border-orange-500/30
                rounded-2xl
                p-4
                mb-4
              "
            >
              <p
                className="
                  text-orange-400
                  text-[10px]
                  uppercase
                  tracking-widest
                  font-black
                  mb-1
                "
              >
                Selected Location
              </p>

              <p
                className="
                  text-white
                  font-bold
                  text-sm
                  sm:text-base
                "
              >
                📍 {selectedLocation.address}
              </p>

              <p
                className="
                  text-zinc-500
                  text-xs
                  mt-2
                "
              >
                {selectedLocation.latitude.toFixed(
                  6
                )}
                ,{" "}
                {selectedLocation.longitude.toFixed(
                  6
                )}
              </p>
            </div>
          ) : (
            <div
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-4
                mb-4
                text-zinc-400
                text-sm
              "
            >
              Search for a place or tap the map
              to select a location.
            </div>
          )}

          {/* ACTIONS */}

          <div
            className="
              flex
              flex-col-reverse
              sm:flex-row
              gap-3
            "
          >
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1
                py-3.5
                rounded-2xl
                bg-zinc-800
                hover:bg-zinc-700
                text-white
                font-bold
              "
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                !selectedLocation ||
                reverseGeocoding
              }
              onClick={() => {
                if (
                  selectedLocation
                ) {
                  onConfirm(
                    selectedLocation
                  );
                }
              }}
              className="
                flex-1
                py-3.5
                rounded-2xl
                bg-orange-500
                hover:bg-orange-400
                disabled:opacity-40
                disabled:cursor-not-allowed
                text-black
                font-black
              "
            >
              ✅ Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
=========================================================
CREATE TRIP PAGE
=========================================================
*/

function CreateTripContent() {
  const router =
    useRouter();

  const [
    editId,
    setEditId,
  ] = useState<string | null>(null);

  const isEditing =
    !!editId;

  const [
    rideType,
    setRideType,
  ] = useState<
    "individual" | "group"
  >("individual");

  const [
    tripImage,
    setTripImage,
  ] = useState("");

  const [
    destination,
    setDestination,
  ] = useState("");

  const [
    startLocation,
    setStartLocation,
  ] = useState("");

  const [
    startCity,
    setStartCity,
  ] = useState("");

  const [
    bike,
    setBike,
  ] = useState("");

  const [
    caption,
    setCaption,
  ] = useState("");

  const [
    distance,
    setDistance,
  ] = useState("");

  const [
    distanceKm,
    setDistanceKm,
  ] = useState<number | null>(null);

  const [
    tripDate,
    setTripDate,
  ] = useState("");

  const [
    itinerary,
    setItinerary,
  ] = useState("");

  const [
    tripPrice,
    setTripPrice,
  ] = useState("");

  const [
    startLocationData,
    setStartLocationData,
  ] = useState<LocationData | null>(
    null
  );

  const [
    destinationLocationData,
    setDestinationLocationData,
  ] =
    useState<LocationData | null>(
      null
    );

  const [
    locationPickerOpen,
    setLocationPickerOpen,
  ] = useState(false);

  const [
    locationPickerType,
    setLocationPickerType,
  ] = useState<
    "start" | "destination"
  >("start");

  const [
    savingTrip,
    setSavingTrip,
  ] = useState(false);

  const [
    deletingTrip,
    setDeletingTrip,
  ] = useState(false);

  const [
    calculatingDistance,
    setCalculatingDistance,
  ] = useState(false);

  /*
  =========================================================
  LOAD PROFILE IMAGE
  =========================================================
  */

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "ridemateUser"
      );

    if (!savedUser) {
      return;
    }

    try {
      const user =
        JSON.parse(
          savedUser
        );

      if (user.image) {
        setTripImage(
          user.image
        );
      }
    } catch (error) {
      console.error(
        "Could not load saved user:",
        error
      );
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

  /*
  =========================================================
  CALCULATE MOTORCYCLE ROAD DISTANCE
  =========================================================
  */

  const calculateRoadDistance =
    async (
      start: LocationData,
      destination: LocationData
    ) => {
      try {
        setCalculatingDistance(
          true
        );

        await loadGoogleMaps();

        const google =
          (window as any).google;

        if (
          !google?.maps?.importLibrary
        ) {
          throw new Error(
            "Google Maps is not available."
          );
        }

        /*
        =====================================================
        LOAD ROUTES LIBRARY
        =====================================================
        */

        const routesLibrary =
          await google.maps.importLibrary(
            "routes"
          );

        const Route =
          routesLibrary.Route;

        if (
          !Route?.computeRoutes
        ) {
          throw new Error(
            "Google Routes API is unavailable."
          );
        }

        /*
        =====================================================
        MOTORCYCLE ROUTE
        =====================================================
        */

        const result =
          await Route.computeRoutes({
            origin: {
              lat:
                start.latitude,
              lng:
                start.longitude,
            },

            destination: {
              lat:
                destination.latitude,
              lng:
                destination.longitude,
            },

            /*
            IMPORTANT:
            TWO_WHEELER keeps this as
            motorcycle routing.
            */

            travelMode:
              "TWO_WHEELER",

            routingPreference:
              "TRAFFIC_UNAWARE",

            /*
            IMPORTANT:
            No "units" property here.
            Google returns distanceMeters.
            */

            fields: [
              "distanceMeters",
              "durationMillis",
            ],
          });

        /*
        =====================================================
        GET ROUTE
        =====================================================
        */

        const route =
          result?.routes?.[0];

        if (
          !route ||
          typeof route.distanceMeters !==
            "number"
        ) {
          throw new Error(
            "No motorcycle route was found between these locations."
          );
        }

        /*
        =====================================================
        METERS → KILOMETERS
        =====================================================
        */

        const km =
          route.distanceMeters /
          1000;

        const roundedKm =
          Number(
            km.toFixed(1)
          );

        setDistanceKm(
          roundedKm
        );

        setDistance(
          `${roundedKm} km`
        );

        console.log(
          "🏍️ Motorcycle road distance:",
          roundedKm,
          "km"
        );

        return roundedKm;
      } catch (error) {
        console.error(
          "Route calculation failed:",
          error
        );

        setDistance("");
        setDistanceKm(null);

        throw error;
      } finally {
        setCalculatingDistance(
          false
        );
      }
    };

  /*
  =========================================================
  RECALCULATE WHEN LOCATIONS CHANGE
  =========================================================
  */

  useEffect(() => {
    if (
      !startLocationData ||
      !destinationLocationData
    ) {
      return;
    }

    void calculateRoadDistance(
      startLocationData,
      destinationLocationData
    );
  }, [
    startLocationData,
    destinationLocationData,
  ]);

  /*
  =========================================================
  LOAD EXISTING TRIP
  =========================================================
  */

  useEffect(() => {
    const loadTrip =
      async () => {
        if (!editId) {
          return;
        }

        try {
          const snap =
            await getDoc(
              doc(
                db,
                "trips",
                editId
              )
            );

          if (!snap.exists()) {
            alert(
              "This trip no longer exists."
            );

            router.push(
              "/my-rides"
            );

            return;
          }

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

          if (
            typeof trip.distanceKm ===
            "number"
          ) {
            setDistanceKm(
              trip.distanceKm
            );
          }

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

          /*
          ===================================================
          LOAD START LOCATION
          ===================================================
          */

          if (
            typeof trip.startLat ===
              "number" &&
            typeof trip.startLng ===
              "number"
          ) {
            setStartLocationData({
              latitude:
                trip.startLat,

              longitude:
                trip.startLng,

              address:
                trip.startFormattedAddress ||
                trip.startLocation ||
                "",

              placeId:
                trip.startPlaceId ||
                "",
            });
          }

          /*
          ===================================================
          LOAD DESTINATION
          ===================================================
          */

          if (
            typeof trip.destinationLat ===
              "number" &&
            typeof trip.destinationLng ===
              "number"
          ) {
            setDestinationLocationData({
              latitude:
                trip.destinationLat,

              longitude:
                trip.destinationLng,

              address:
                trip.destinationFormattedAddress ||
                trip.destination ||
                "",

              placeId:
                trip.destinationPlaceId ||
                "",
            });
          }
        } catch (error) {
          console.error(
            "Failed to load trip:",
            error
          );
        }
      };

    void loadTrip();
  }, [
    editId,
    router,
  ]);

  /*
  =========================================================
  OPEN LOCATION PICKER
  =========================================================
  */

  const openLocationPicker =
    (
      type:
        | "start"
        | "destination"
    ) => {
      setLocationPickerType(
        type
      );

      setLocationPickerOpen(
        true
      );
    };

  /*
  =========================================================
  CONFIRM LOCATION
  =========================================================
  */

  const handleLocationConfirm =
    (
      location: LocationData
    ) => {
      if (
        locationPickerType ===
        "start"
      ) {
        setStartLocationData(
          location
        );

        setStartLocation(
          location.address
        );
      } else {
        setDestinationLocationData(
          location
        );

        setDestination(
          location.address
        );
      }

      setLocationPickerOpen(
        false
      );
    };

  /*
  =========================================================
  POST / UPDATE TRIP
  =========================================================
  */

  const postTrip =
    async () => {
      if (savingTrip) {
        return;
      }

      try {
        const savedUser =
          localStorage.getItem(
            "ridemateUser"
          );

        const user =
          JSON.parse(
            savedUser || "{}"
          );

        if (!user.name) {
          alert(
            "Please login first."
          );

          return;
        }

        /*
        =====================================================
        START CITY
        =====================================================
        */

        if (
          !startCity.trim()
        ) {
          alert(
            "Please select your starting city."
          );

          return;
        }

        /*
        =====================================================
        START LOCATION
        =====================================================
        */

        if (
          !startLocationData
        ) {
          alert(
            "📍 Please select your exact starting location using the map."
          );

          return;
        }

        /*
        =====================================================
        DESTINATION
        =====================================================
        */

        if (
          !destinationLocationData
        ) {
          alert(
            "📍 Please select your destination using the map."
          );

          return;
        }

        /*
        =====================================================
        BIKE
        =====================================================
        */

        if (
          !bike.trim()
        ) {
          alert(
            "Please enter your bike name."
          );

          return;
        }

        /*
        =====================================================
        DATE
        =====================================================
        */

        if (!tripDate) {
          alert(
            "Please select your trip date and time."
          );

          return;
        }

        setSavingTrip(
          true
        );

        /*
        =====================================================
        FINAL DISTANCE CALCULATION
        =====================================================
        */

        const finalDistanceKm =
          await calculateRoadDistance(
            startLocationData,
            destinationLocationData
          );

        if (
          typeof finalDistanceKm !==
            "number" ||
          finalDistanceKm <=
            0
        ) {
          throw new Error(
            "Could not calculate route distance."
          );
        }

        /*
        =====================================================
        TRIP DATA
        =====================================================
        */

        const tripData: any = {
          status:
            "upcoming",

          rideType,

          /*
          DESTINATION
          */

          destination:
            destinationLocationData.address,

          destinationLat:
            destinationLocationData.latitude,

          destinationLng:
            destinationLocationData.longitude,

          destinationRadiusKm:
            DESTINATION_RADIUS_KM,

          destinationFormattedAddress:
            destinationLocationData.address,

          destinationPlaceId:
            destinationLocationData.placeId ||
            "",

          /*
          START
          */

          startCity,

          startLocation:
            startLocationData.address,

          startLat:
            startLocationData.latitude,

          startLng:
            startLocationData.longitude,

          startFormattedAddress:
            startLocationData.address,

          startPlaceId:
            startLocationData.placeId ||
            "",

          /*
          DISTANCE
          */

          distance:
            `${finalDistanceKm} km`,

          distanceKm:
            finalDistanceKm,

          /*
          OTHER TRIP DATA
          */

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

        /*
        =====================================================
        EDIT EXISTING TRIP
        =====================================================
        */

        if (
          isEditing &&
          editId
        ) {
          const existingTripSnap =
            await getDoc(
              doc(
                db,
                "trips",
                editId
              )
            );

          if (
            !existingTripSnap.exists()
          ) {
            alert(
              "This trip no longer exists."
            );

            router.push(
              "/my-rides"
            );

            return;
          }

          const existingTrip =
            existingTripSnap.data();

          /*
          ===================================================
          OWNER PROTECTION
          ===================================================
          */

          if (
            existingTrip.userName &&
            existingTrip.userName !==
              user.name
          ) {
            alert(
              "You are not allowed to edit this trip."
            );

            router.push(
              "/my-rides"
            );

            return;
          }

          /*
          ===================================================
          PRESERVE EXISTING DATA
          ===================================================
          */

          await updateDoc(
            doc(
              db,
              "trips",
              editId
            ),
            {
              ...existingTrip,
              ...tripData,
            }
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
        RESET
        =====================================================
        */

        setDestination("");
        setStartLocation("");
        setStartCity("");
        setDistance("");
        setDistanceKm(null);

        setStartLocationData(
          null
        );

        setDestinationLocationData(
          null
        );

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
          error instanceof Error
            ? error.message
            : "Failed to save trip."
        );
      } finally {
        setSavingTrip(
          false
        );
      }
    };

  /*
  =========================================================
  DELETE TRIP
  =========================================================
  */

  const deleteTrip =
    async () => {
      if (
        !isEditing ||
        !editId ||
        deletingTrip
      ) {
        return;
      }

      try {
        const savedUser =
          localStorage.getItem(
            "ridemateUser"
          );

        const user =
          JSON.parse(
            savedUser || "{}"
          );

        if (!user.name) {
          alert(
            "Please login first."
          );

          return;
        }

        const tripRef =
          doc(
            db,
            "trips",
            editId
          );

        const tripSnap =
          await getDoc(
            tripRef
          );

        if (
          !tripSnap.exists()
        ) {
          alert(
            "This trip has already been deleted."
          );

          router.push(
            "/my-rides"
          );

          return;
        }

        const trip =
          tripSnap.data();

        /*
        =====================================================
        OWNER PROTECTION
        =====================================================
        */

        if (
          trip.userName !==
          user.name
        ) {
          alert(
            "You are not allowed to delete this trip."
          );

          return;
        }

        /*
        =====================================================
        CONFIRM
        =====================================================
        */

        const confirmed =
          window.confirm(
            "⚠️ Delete this trip?\n\n" +
              "This action cannot be undone.\n\n" +
              "Any pending or approved ride requests for this trip will also be removed."
          );

        if (!confirmed) {
          return;
        }

        setDeletingTrip(
          true
        );

        /*
        =====================================================
        DELETE RELATED RIDE REQUESTS
        =====================================================
        */

        try {
          const requestsQuery =
            query(
              collection(
                db,
                "rideRequests"
              ),
              where(
                "tripId",
                "==",
                editId
              )
            );

          const requestsSnapshot =
            await getDocs(
              requestsQuery
            );

          await Promise.all(
            requestsSnapshot.docs.map(
              async (
                requestDoc
              ) => {
                await deleteDoc(
                  requestDoc.ref
                );
              }
            )
          );
        } catch (
          requestError
        ) {
          console.warn(
            "Could not delete related ride requests:",
            requestError
          );
        }

        /*
        =====================================================
        DELETE TRIP
        =====================================================
        */

        await deleteDoc(
          tripRef
        );

        alert(
          "🗑️ Trip deleted successfully!"
        );

        router.push(
          "/my-rides"
        );
      } catch (error) {
        console.error(
          "Failed to delete trip:",
          error
        );

        alert(
          "Failed to delete trip. Please try again."
        );

        setDeletingTrip(
          false
        );
      }
    };

  /*
  =========================================================
  LOCATION PICKER DATA
  =========================================================
  */

  const pickerInitialLocation =
    locationPickerType ===
    "start"
      ? startLocationData
      : destinationLocationData;

  const pickerTitle =
    locationPickerType ===
    "start"
      ? "Select Starting Location"
      : "Select Destination";

  /*
  =========================================================
  UI
  =========================================================
  */

  return (
    <PageBackground>
      <LocationPicker
        open={
          locationPickerOpen
        }
        title={
          pickerTitle
        }
        initialLocation={
          pickerInitialLocation
        }
        onClose={() =>
          setLocationPickerOpen(
            false
          )
        }
        onConfirm={
          handleLocationConfirm
        }
      />

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
        {/* PROFILE IMAGE */}

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
          {/* RIDE TYPE */}

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
              value={
                rideType
              }
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

          {/* DESTINATION */}

          <div
            className="
              bg-black
              border
              border-zinc-700
              rounded-2xl
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                mb-3
              "
            >
              <div>
                <label
                  className="
                    block
                    text-orange-400
                    font-bold
                  "
                >
                  🏁 Destination
                </label>

                <p
                  className="
                    text-zinc-500
                    text-xs
                    mt-1
                  "
                >
                  Choose the exact destination on Google Maps.
                </p>
              </div>
            </div>

            {destinationLocationData ? (
              <div
                className="
                  bg-orange-500/10
                  border
                  border-orange-500/20
                  rounded-xl
                  p-3
                  mb-3
                "
              >
                <p
                  className="
                    text-white
                    font-bold
                    text-sm
                  "
                >
                  📍{" "}
                  {
                    destinationLocationData.address
                  }
                </p>

                <p
                  className="
                    text-zinc-500
                    text-xs
                    mt-1
                  "
                >
                  Coordinates:{" "}
                  {destinationLocationData.latitude.toFixed(
                    6
                  )}
                  ,{" "}
                  {destinationLocationData.longitude.toFixed(
                    6
                  )}
                </p>
              </div>
            ) : (
              <div
                className="
                  bg-zinc-950
                  border
                  border-zinc-800
                  rounded-xl
                  p-3
                  mb-3
                  text-zinc-500
                  text-sm
                "
              >
                No destination selected yet.
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                openLocationPicker(
                  "destination"
                )
              }
              className="
                w-full
                p-4
                rounded-2xl
                bg-orange-500
                hover:bg-orange-400
                text-black
                font-black
                transition
              "
            >
              📍{" "}
              {destinationLocationData
                ? "Change Destination"
                : "Select Destination on Map"}
            </button>
          </div>

          {/* STARTING LOCATION */}

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
                "
              >
                Select your starting city and then
                choose the exact starting point on Google Maps.
              </p>
            </div>

            {/* STARTING CITY */}

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
                value={
                  startCity
                }
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

            {/* EXACT START */}

            <div>
              {startLocationData ? (
                <div
                  className="
                    bg-orange-500/10
                    border
                    border-orange-500/20
                    rounded-xl
                    p-3
                    mb-3
                  "
                >
                  <p
                    className="
                      text-white
                      font-bold
                      text-sm
                    "
                  >
                    📍{" "}
                    {
                      startLocationData.address
                    }
                  </p>

                  <p
                    className="
                      text-zinc-500
                      text-xs
                      mt-1
                    "
                  >
                    Coordinates:{" "}
                    {startLocationData.latitude.toFixed(
                      6
                    )}
                    ,{" "}
                    {startLocationData.longitude.toFixed(
                      6
                    )}
                  </p>
                </div>
              ) : (
                <div
                  className="
                    bg-zinc-950
                    border
                    border-zinc-800
                    rounded-xl
                    p-3
                    mb-3
                    text-zinc-500
                    text-sm
                  "
                >
                  No exact starting point selected yet.
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  openLocationPicker(
                    "start"
                  )
                }
                className="
                  w-full
                  p-4
                  rounded-2xl
                  bg-orange-500
                  hover:bg-orange-400
                  text-black
                  font-black
                  transition
                "
              >
                📍{" "}
                {startLocationData
                  ? "Change Starting Location"
                  : "Select Starting Location on Map"}
              </button>
            </div>

            {/* PREVIEW */}

            {(startLocationData ||
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
                  {startLocationData
                    ?.address ||
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

          {/* DISTANCE */}

          <div
            className="
              bg-black
              border
              border-zinc-700
              rounded-2xl
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-orange-400
                    font-bold
                  "
                >
                  🛣️ Motorcycle Road Distance
                </p>

                <p
                  className="
                    text-zinc-500
                    text-xs
                    mt-1
                  "
                >
                  Automatically calculated between your selected locations.
                </p>
              </div>

              <div
                className="
                  text-right
                  min-w-[100px]
                "
              >
                {calculatingDistance ? (
                  <p
                    className="
                      text-orange-400
                      font-black
                      text-sm
                    "
                  >
                    Calculating...
                  </p>
                ) : distance ? (
                  <p
                    className="
                      text-white
                      font-black
                      text-xl
                    "
                  >
                    {distance}
                  </p>
                ) : (
                  <p
                    className="
                      text-zinc-600
                      font-bold
                      text-sm
                    "
                  >
                    Select locations
                  </p>
                )}
              </div>
            </div>

            <div
              className="
                mt-3
                bg-yellow-500/10
                border
                border-yellow-500/20
                rounded-xl
                p-3
              "
            >
              <p
                className="
                  text-yellow-300
                  text-xs
                "
              >
                ⚠️ Motorcycle road distance is an
                estimate based on Google's two-wheeler
                routing data.
              </p>
            </div>
          </div>

          {/* DATE & TIME */}

          <input
            type="datetime-local"
            value={
              tripDate
            }
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
            "
          />

          {/* TRIP PRICE */}

          <input
            type="number"
            placeholder="Trip Price (₹)"
            value={
              tripPrice
            }
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

          {/* BIKE */}

          <input
            type="text"
            placeholder="Bike Name"
            value={
              bike
            }
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

          {/* STORY + ITINERARY */}

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
                📝 Ride Story
              </label>

              <textarea
                placeholder="Tell riders about your trip..."
                value={
                  caption
                }
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
                value={
                  itinerary
                }
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

          {/* SAVE / POST */}

          <button
            onClick={
              postTrip
            }
            disabled={
              deletingTrip ||
              savingTrip ||
              calculatingDistance
            }
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
              disabled:opacity-50
              disabled:hover:scale-100
            "
          >
            {savingTrip
              ? "📍 Saving Trip..."
              : calculatingDistance
              ? "🛣️ Calculating Distance..."
              : isEditing
              ? "Save Changes"
              : "Post Trip"}
          </button>

          {/* DELETE */}

          {isEditing && (
            <div
              className="
                pt-2
              "
            >
              <button
                onClick={
                  deleteTrip
                }
                disabled={
                  deletingTrip ||
                  savingTrip
                }
                className="
                  w-full
                  bg-red-600/10
                  border
                  border-red-600/40
                  text-red-400
                  hover:bg-red-600
                  hover:text-white
                  py-4
                  rounded-2xl
                  text-lg
                  font-black
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {deletingTrip
                  ? "Deleting Trip..."
                  : "🗑️ Delete Trip"}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}

export default CreateTripContent;