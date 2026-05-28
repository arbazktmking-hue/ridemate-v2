import Navbar from "./components/Navbar";
export default function HomePage() {
  return (
    <>
  <Navbar />

  <main></main>
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      <h1 className="text-7xl font-black text-orange-500">
        RideMate 🏍🔥
      </h1>

      <p className="text-zinc-400 mt-6 text-xl text-center max-w-2xl">
        The ultimate social platform for bikers, travelers,
        and adventure riders.
      </p>

      <div className="flex gap-6 mt-10">

        <a
          href="/feed"
          className="bg-orange-500 px-8 py-4 rounded-2xl text-xl font-bold hover:scale-105 transition"
        >
          Explore Feed
        </a>

        <a
          href="/profile"
          className="border border-orange-500 px-8 py-4 rounded-2xl text-xl font-bold hover:bg-orange-500 hover:text-black transition"
        >
          My Profile
        </a>

      </div>

    </main>
</>
  );
}