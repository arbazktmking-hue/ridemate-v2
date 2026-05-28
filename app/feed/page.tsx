const trips = [
  {
    rider: "Arbhaz Pasha",
    bike: "KTM Duke 390",
    destination: "Tawang",
    caption: "Conquering mountains one ride at a time 🏔🔥",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
  },

  {
    rider: "Rahul Rider",
    bike: "Royal Enfield Himalayan",
    destination: "Leh Ladakh",
    caption: "Roads test the rider, mountains reward the soul ❤️",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
          Ride Feed 🔥
        </h1>

        <div className="space-y-10">

          {trips.map((trip, index) => (
            <div
              key={index}
              className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800"
            >

              <img
                src={trip.image}
                alt="Trip"
                className="w-full h-[400px] object-cover"
              />

              <div className="p-6">

                <h2 className="text-3xl font-black">
                  {trip.destination}
                </h2>

                <p className="text-orange-500 mt-2 font-bold">
                  {trip.bike}
                </p>

                <p className="text-zinc-300 mt-4">
                  {trip.caption}
                </p>

                <div className="mt-6 flex items-center justify-between">

                  <p className="font-bold">
                    👤 {trip.rider}
                  </p>

                  <button className="bg-orange-500 px-5 py-2 rounded-xl font-bold hover:scale-105 transition">
                    ❤️ Like
                  </button>

                </div>

              </div>

            </div>
          ))}

        </div>

      </div>

    </main>
  );
}