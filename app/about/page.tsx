export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 pt-24 pb-12">
      <div className="max-w-5xl mx-auto">
        {/* Hero section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-orange-500 mb-4">
            About RideMate
          </h1>
          <div className="flex flex-col items-center gap-4">
  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500/15 border border-orange-500/30">
    <span className="text-orange-400 text-sm font-bold tracking-wide uppercase">
      Our identity
    </span>
  </div>

  <p className="text-2xl md:text-4xl font-black text-orange-400 uppercase tracking-wide whitespace-nowrap">
  BUILT BY RIDERS, FOR RIDERS.
</p>

  <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
    Every feature in RideMate is designed from the perspective of someone who
    loves the road, values trust, and believes every great ride deserves great
    company.
  </p>
</div>
        </div>

        {/* Mission */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-black text-orange-500 mb-4">
            Our mission
          </h2>
          <p className="text-zinc-300 leading-8 text-lg">
            RideMate is a community-driven platform that helps solo riders find
            trusted companions for motorcycle trips. Whether you’re looking for
            a pillion rider, a group ride, or fellow explorers heading to the
            same destination, RideMate makes meaningful riding connections
            possible.
          </p>
        </div>

        {/* Features */}
        <div className="mb-10">
          <h2 className="text-3xl font-black text-orange-500 mb-6">
            What RideMate offers
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              "🏍 Explore motorcycle trips",
              "👥 Join group rides",
              "🪖 Find trusted pillion riders",
              "💬 Trip-specific chat rooms",
              "⭐ Rider ratings and reviews",
              "📍 Verified ride history",
              "❤️ Community-driven connections",
              "🗺 Shared adventures across India",
            ].map((item, index) => (
              <div
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
              >
                <p className="text-lg font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Story */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-black text-orange-500 mb-4">
            Why we built RideMate
          </h2>
          <p className="text-zinc-300 leading-8 text-lg">
            RideMate started from a simple problem: many riders wanted to travel
            but didn’t always have someone to ride with. We wanted to create a
            platform where trust, adventure, and community come together in one
            place.
          </p>
        </div>

        {/* Beta */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-black text-orange-500 mb-4">
            Beta launch
          </h2>
          <p className="text-zinc-300 leading-8 text-lg">
            RideMate is currently in beta. We’re building this platform with
            feedback from our early riding community, and every suggestion helps
            us improve the experience for all riders.
          </p>
        </div>

        {/* Vision */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-black text-orange-400 mb-4">
            Our vision
          </h2>
          <p className="text-zinc-200 leading-8 text-lg mb-6">
  We’re building India’s most trusted motorcycle travel community — a place
  where every rider can discover routes, companions, stories, and adventures
  that last a lifetime.
</p>

<div className="space-y-4 text-zinc-200 text-lg">
  <div className="flex items-start gap-3">
    <span className="text-orange-400 text-xl">•</span>
    <p>
      <strong>Reduce the cost of motorcycle travel</strong> by helping
      riders share fuel, tolls, and trip expenses with trusted companions.
    </p>
  </div>

  <div className="flex items-start gap-3">
    <span className="text-orange-400 text-xl">•</span>
    <p>
      <strong>Build a strong riding community</strong> where trust,
      respect, and shared experiences bring riders together.
    </p>
  </div>

  <div className="flex items-start gap-3">
    <span className="text-orange-400 text-xl">•</span>
    <p>
      <strong>Make every journey more meaningful</strong>, whether it’s
      a weekend escape, a cross-country adventure, or the beginning of a lifelong
      friendship.
    </p>
  </div>
</div>
        </div>
{/* Terms & Conditions */}
<div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-10">
  <details className="group">
    <summary className="cursor-pointer list-none flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-black text-orange-500">
          📜 Terms & Conditions
        </h2>
        <p className="text-zinc-400 mt-1 text-sm">
          Read the terms that apply to using RideMate
        </p>
      </div>

      <span className="text-orange-500 text-2xl transition-transform group-open:rotate-180">
        ▼
      </span>
    </summary>

    <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5 text-zinc-300 leading-7">
      <p>
        <strong>1. RideMate is a connecting platform.</strong>
      </p>

      <p>
        <strong>2. Users are responsible for their own safety.</strong>
      </p>

      <p>
        <strong>
          3. RideMate is not liable for accidents, injuries, theft,
          disputes, or any mishappening.
        </strong>
      </p>

      <p>
        <strong>
          4. Users must verify the identity and documents of fellow riders
          before any trip.
        </strong>
      </p>

      <p>
        <strong>
          5. Users must comply with all traffic laws and carry valid
          documents.
        </strong>
      </p>

      <p>
        <strong>6. RideMate is not responsible for personal belongings.</strong>
      </p>

      <p>
        <strong>
          7. Expense sharing is a private arrangement between users.
        </strong>
      </p>

      <p>
        <strong>
          8. Harassment, fraud, abuse, or illegal activity may lead to
          account suspension.
        </strong>
      </p>

      <p>
        <strong>
          9. RideMate is currently in beta and service availability is not
          guaranteed.
        </strong>
      </p>

      <p>
        <strong>
          10. By using RideMate, you voluntarily accept all risks associated
          with motorcycle travel and agree that RideMate acts only as a
          mediator connecting users.
        </strong>
      </p>

      <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
        <p className="text-zinc-500 text-sm">
          Your safety is your responsibility. RideMate only helps riders
          connect.
        </p>
      </div>
    </div>
  </details>
</div>
       {/* Founder */}
<div className="text-center pt-8 border-t border-zinc-800">
  <h3 className="text-2xl font-black text-orange-500 mb-4 uppercase tracking-wide">
    Founder
  </h3>

  <p
    className="
      text-4xl md:text-5xl
      font-black
      uppercase
      tracking-[0.25em]
      text-orange-400
    "
    style={{
      textShadow:
        "0 1px 0 #c2410c, 0 2px 0 #9a3412, 0 3px 0 #7c2d12, 0 6px 14px rgba(0,0,0,0.6)",
      transform: "perspective(600px) rotateX(8deg)",
    }}
  >
    ARBHAZ PASHA
  </p>

  <p
    className="
      text-xl
      md:text-2xl
      font-semibold
      text-white
      tracking-wide
      mt-3
    "
  >
    📞 +91 8123117301
  </p>

  <p className="text-zinc-400 mt-4 text-lg">
    Bangalore, India
  </p>

  <p className="text-zinc-500 mt-2 italic">
    The road built the idea. RideMate is the journey.
  </p>
</div>
      </div>
    </main>
  );
}