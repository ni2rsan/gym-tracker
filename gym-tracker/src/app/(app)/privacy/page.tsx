import { Shield } from "lucide-react";

export const metadata = { title: "Privacy Policy — Gym Tracker" };

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            How we handle your data
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            1. Data We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account info</strong> — Name, email, and profile picture from your Google
              account (via OAuth). We never see or store your Google password.
            </li>
            <li>
              <strong>Profile data</strong> — Username, height, and profile photo you optionally
              provide.
            </li>
            <li>
              <strong>Workout data</strong> — Exercises, sets, reps, and weights you log.
            </li>
            <li>
              <strong>Body metrics</strong> — Weight, body fat %, muscle mass (manually entered or
              synced from Withings).
            </li>
            <li>
              <strong>Planned workouts</strong> — Your training schedule and planner data.
            </li>
            <li>
              <strong>Social data</strong> — Friend connections and privacy preferences.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            2. How We Use Your Data
          </h2>
          <p>
            Your data is used solely to provide the Gym Tracker service: tracking workouts,
            displaying progress, generating reports, and enabling social features with friends you
            explicitly add. We do not sell, share, or use your data for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            3. Data Storage & Security
          </h2>
          <p>
            All data is stored in a PostgreSQL database hosted on Neon (EU region: Frankfurt). The
            connection is encrypted via TLS. Authentication uses signed JWT tokens stored in
            HttpOnly cookies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            4. Third-Party Services
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google OAuth</strong> — For authentication only. We request minimal scopes
              (email + profile).
            </li>
            <li>
              <strong>Withings API</strong> — Optional integration. Only activated if you explicitly
              connect your Withings account. Can be disconnected at any time.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            5. Your Rights (GDPR)
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Right to access (Art. 15)</strong> — You can view all your data within the
              app.
            </li>
            <li>
              <strong>Right to data portability (Art. 20)</strong> — Export all your data as JSON
              from your Profile page.
            </li>
            <li>
              <strong>Right to erasure (Art. 17)</strong> — Delete your account and all associated
              data from your Profile page.
            </li>
            <li>
              <strong>Right to rectification (Art. 16)</strong> — Edit your profile and correct data
              at any time.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            6. Data Retention
          </h2>
          <p>
            When you delete data (workouts, metrics, planned series), it is soft-deleted — marked as
            inactive but retained for 90 days for recovery purposes. After 90 days, soft-deleted
            data may be permanently purged. When you delete your account, all data is immediately
            soft-deleted and your profile is anonymised.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
            7. Contact
          </h2>
          <p>
            For questions about your data or privacy, use the Requests page to contact the
            administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
