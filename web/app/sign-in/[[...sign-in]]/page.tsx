import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FAF8F3] text-[#191F1C]">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-white font-extrabold shadow-xs">
            <span className="text-xl tracking-tight font-serif font-black">M</span>
          </div>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[11px] px-3 py-0.5">
            Maitri Livestock Health
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-[#191F1C]">
            Welcome back to Maitri
          </h1>
          <p className="text-xs text-stone-600 max-w-xs">
            Sign in to access your livestock health records, farm surveillance, and clinical portal.
          </p>
        </div>

        {/* Clerk Sign In Card */}
        <div className="w-full flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full shadow-xs",
                card: "bg-white border border-[#E5E0D8] rounded-3xl shadow-xs p-3 sm:p-6",
                headerTitle: "text-[#191F1C] text-lg font-bold",
                headerSubtitle: "text-stone-500 text-xs",
                socialButtonsBlockButton: "bg-[#FAF8F3] border border-[#D9D3C7] hover:bg-stone-100 text-[#191F1C] text-xs font-semibold rounded-xl min-h-[42px] transition-colors",
                socialButtonsBlockButtonText: "text-[#191F1C] font-semibold text-xs",
                formButtonPrimary: "bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold shadow-xs rounded-xl transition-all min-h-[42px] cursor-pointer",
                formFieldLabel: "text-stone-700 text-xs font-medium",
                formFieldInput: "bg-[#FAF8F3] border border-[#D9D3C7] text-[#191F1C] focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-xs rounded-xl min-h-[42px]",
                footerActionLink: "text-emerald-700 hover:text-emerald-800 text-xs font-semibold",
                footerActionText: "text-stone-500 text-xs",
                dividerLine: "bg-[#E5E0D8]",
                dividerText: "text-stone-400 text-xs uppercase font-medium",
                footer: "bg-[#FAF8F3] border-t border-[#E5E0D8] text-xs text-stone-500 rounded-b-3xl",
                identityPreview: "bg-[#FAF8F3] border border-[#E5E0D8] rounded-xl text-xs",
                identityPreviewText: "text-[#191F1C] text-xs",
                identityPreviewEditButton: "text-emerald-700 hover:text-emerald-800 text-xs font-semibold",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
