import { signIn } from "@/auth";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 mb-4 shadow-lg shadow-emerald-500/30">
            <Dumbbell className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gym Tracker</h1>
          <p className="mt-2 text-zinc-400 text-sm text-center">
            Track your workouts and progress over time.
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-zinc-800/60 backdrop-blur border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Sign in to continue</h2>
          <p className="text-zinc-400 text-sm mb-8">
            Your data stays private. Only you can see your workouts.
          </p>

          <div className="flex flex-col gap-3">
            {/* Google Sign In */}
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/planner" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-zinc-100 text-zinc-800 font-medium rounded-xl transition-colors duration-150"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>

            {/* Apple Sign In — placeholder, requires Apple credentials */}
            {/* <form
              action={async () => {
                "use server";
                await signIn("apple", { redirectTo: "/workout" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-zinc-900 text-white border border-zinc-700 font-medium rounded-xl transition-colors duration-150"
              >
                <AppleIcon />
                Continue with Apple
              </button>
            </form> */}
          </div>

          <p className="mt-6 text-xs text-zinc-500 text-center">
            By signing in, you agree to our{" "}
            <span className="text-zinc-400">Terms of Service</span> and{" "}
            <span className="text-zinc-400">Privacy Policy</span>.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Sessions last 30 days — no need to sign in every day.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
