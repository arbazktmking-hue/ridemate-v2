
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 pt-28 pb-12">
      <div className="max-w-4xl mx-auto">

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-orange-500 mb-3">
            RideMate Privacy Policy
          </h1>

          <p className="text-zinc-400 text-sm">
            Last updated: 12 November 2026
          </p>

          <p className="text-zinc-300 mt-5 leading-7">
            RideMate respects your privacy. This Privacy Policy
            explains how we collect, use, store and protect
            information when you use the RideMate platform.
          </p>
        </header>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8">

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              1. Information We Collect
            </h2>

            <p className="text-zinc-300 leading-7 mb-3">
              Depending on the features you use, RideMate may
              collect the following information:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>
                Account information: name, email address,
                profile picture and Google account authentication
                information obtained through Google Sign-In.
              </li>
              <li>
                Profile information: username, gender and
                other profile details you choose to provide.
              </li>
              <li>
                Trip information: starting location, destination,
                travel date, time, itinerary, bike details
                and trip-related expenses.
              </li>
              <li>
                User content: photos, videos, captions,
                comments, messages and reviews you submit.
              </li>
              <li>
                Activity information: likes, saved trips,
                ride requests, connections and notifications.
              </li>
              <li>
                Location information: selected trip locations
                and GPS coordinates used for trip-completion
                verification.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              2. Google Sign-In and Authentication
            </h2>

            <p className="text-zinc-300 leading-7">
              RideMate uses Google Sign-In for account
              authentication through Firebase Authentication.
              When you sign in, we receive information made
              available through your Google account, such as
              your name, email address and profile picture.
              We use this information to create and manage
              your RideMate account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              3. Location Information
            </h2>

            <p className="text-zinc-300 leading-7 mb-3">
              RideMate uses Google Maps services to allow
              users to search for and select trip starting
              locations and destinations.
            </p>

            <p className="text-zinc-300 leading-7 mb-3">
              RideMate also requests your device's current
              GPS location when you use the trip-completion
              verification feature. This is used to:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>Check the rider's proximity to the trip destination.</li>
              <li>Check the approved pillion's proximity to the destination.</li>
              <li>Verify that the rider and pillion are within the required distance of each other.</li>
            </ul>

            <p className="text-zinc-300 leading-7 mt-3">
              For this verification, GPS coordinates and
              accuracy information are stored in the relevant
              trip and trip chat records. Location access is
              requested when this verification feature is used.
              RideMate does not use this feature for continuous
              background location tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              4. How We Use Your Information
            </h2>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>To create and manage user accounts.</li>
              <li>To display profiles and facilitate rider connections.</li>
              <li>To create, display and manage trips.</li>
              <li>To process ride requests and trip communications.</li>
              <li>To provide feed, comments, likes and saved-trip features.</li>
              <li>To verify trip completion using GPS information.</li>
              <li>To provide notifications, reviews and platform functionality.</li>
              <li>To maintain platform security and prevent misuse.</li>
              <li>To respond to support and account deletion requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              5. Information Sharing
            </h2>

            <p className="text-zinc-300 leading-7 mb-3">
              RideMate does not sell your personal information.
              Information may be shared in the following
              circumstances:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>
                With other RideMate users when you publish
                profile information, trips, posts, comments,
                reviews or messages.
              </li>
              <li>
                With service providers that support authentication,
                database hosting, maps and application infrastructure.
              </li>
              <li>
                When required by applicable law or a valid
                legal request.
              </li>
              <li>
                When reasonably necessary to protect the
                safety, security and rights of users or RideMate.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              6. Third-Party Services
            </h2>

            <p className="text-zinc-300 leading-7 mb-3">
              RideMate uses third-party services to operate
              its platform, including:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>Google Sign-In and Firebase Authentication.</li>
              <li>Google Firebase Firestore for application data.</li>
              <li>Google Maps Platform for maps, places and geocoding.</li>
              <li>Firebase Storage for supported user-uploaded media.</li>
              <li>Vercel for website hosting and deployment.</li>
            </ul>

            <p className="text-zinc-300 leading-7 mt-3">
              These services may process information according
              to their own privacy policies and applicable terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              7. Data Storage and Security
            </h2>

            <p className="text-zinc-300 leading-7">
              RideMate uses Firebase and other service providers
              to store and process application information.
              We take reasonable measures to protect information
              against unauthorized access, alteration, disclosure
              or destruction. However, no electronic storage
              or transmission method can be guaranteed to be
              completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              8. Data Retention
            </h2>

            <p className="text-zinc-300 leading-7">
              We retain personal information for as long as
              necessary to provide RideMate services, maintain
              relevant trip and platform records, resolve
              disputes, maintain security and meet applicable
              legal obligations. Information that is no longer
              required will be deleted or handled in accordance
              with applicable requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              9. Account and Data Deletion
            </h2>

            <p className="text-zinc-300 leading-7 mb-3">
              You can request deletion of your RideMate account
              and associated personal information through
              either of the following methods:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-zinc-300 leading-7">
              <li>Use the Delete Account option inside RideMate.</li>
              <li>
                Submit a request through our public
                <a href="/delete-account" className="text-orange-400 underline ml-1">
                  Account Deletion page
                </a>.
              </li>
            </ul>

            <p className="text-zinc-300 leading-7 mt-3">
              Requests submitted through the website require
              verification of your email address and account
              ownership. Once successfully verified, eligible
              account deletion requests will be completed
              within 30 days.
            </p>

            <p className="text-zinc-300 leading-7 mt-3">
              Associated account information, profile data,
              user content and other personal information
              will be deleted where applicable. Certain
              information may be retained where required
              by law or reasonably necessary for legitimate
              security, fraud-prevention or dispute-resolution
              purposes. Retained information will be handled
              according to applicable legal requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              10. Children's Privacy
            </h2>

            <p className="text-zinc-300 leading-7">
              RideMate is not intended for children who are
              not legally permitted to use the service.
              We do not knowingly collect personal information
              from children in violation of applicable law.
              If you believe a child has provided personal
              information without appropriate authorization,
              please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              11. Changes to This Privacy Policy
            </h2>

            <p className="text-zinc-300 leading-7">
              We may update this Privacy Policy from time
              to time to reflect changes in our services,
              practices or legal requirements. Updated
              versions will be published on this page
              with a revised update date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-orange-400 mb-3">
              12. Contact Us
            </h2>

            <p className="text-zinc-300 leading-7">
              If you have questions about this Privacy Policy,
              your personal information or account deletion,
              please contact:
            </p>

            <p className="mt-4 text-white font-semibold">
              RideMate Support
            </p>

            <a
              href="mailto:arbazktmking@gmail.com"
              className="text-orange-400 underline"
            >
              arbazktmking@gmail.com
            </a>

            <p className="text-zinc-400 text-sm mt-2">
              Website: www.ridemate.fun
            </p>
          </section>

        </div>

        <p className="text-center text-zinc-500 text-xs mt-8">
          © {new Date().getFullYear()} RideMate. All rights reserved.
        </p>

      </div>
    </main>
  );
}
