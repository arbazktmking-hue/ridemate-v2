export default function Navbar() {
  return (
    <nav className="w-full bg-zinc-900 text-white border-b border-zinc-800 px-6 py-4 flex items-center justify-between">

      <h1 className="text-3xl font-black text-orange-500">
        RideMate 🏍🔥
      </h1>

      <div className="flex gap-4">

        <a
          href="/"
          className="text-white hover:text-orange-500 transition"
        >
          Home
        </a>

        <a
          href="/feed"
          className="text-white hover:text-orange-500 transition"
        >
          Feed
        </a>

        <a
          href="/leaderboard"
          className="text-white hover:text-orange-500 transition"
        >
          Leaderboard
        </a>

        <a
          href="/inbox"
          className="text-white hover:text-orange-500 transition"
        >
          Inbox
        </a>

        <a
          href="/create-trip"
          className="text-white hover:text-orange-500 transition"
        >
          Create Trip
        </a>

        <a
          href="/profile"
          className="text-white hover:text-orange-500 transition"
        >
          Profile
        </a>

      </div>

    </nav>
  );
}