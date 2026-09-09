import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Activity } from "lucide-react";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-zinc-950">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-indigo-600/30">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Welcome back to <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Maitri</span>
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs">
            Sign in to access your livestock health intelligence dashboard
          </p>
        </div>

        {/* Clerk Sign In Card */}
        <div className="w-full flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full shadow-2xl",
                card: "bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl shadow-xl",
                headerTitle: "text-zinc-100 text-lg font-bold",
                headerSubtitle: "text-zinc-400 text-xs",
                socialButtonsBlockButton: "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all",
                formFieldLabel: "text-zinc-300 text-xs font-medium",
                formFieldInput: "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-indigo-500 focus:ring-indigo-500/20 text-xs rounded-xl",
                footerActionLink: "text-indigo-400 hover:text-indigo-300 text-xs font-semibold",
                dividerLine: "bg-zinc-800",
                dividerText: "text-zinc-500 text-xs",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
