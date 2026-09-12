import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentAppUser } from "@/lib/auth/session";

/**
 * Authoritative Server-Side Role Dispatcher.
 * Inspects authenticated Prisma User record and redirects to appropriate destination.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const appUser = await getCurrentAppUser();

  // 1. Unonboarded user -> /onboarding
  if (!appUser) {
    redirect("/onboarding");
  }

  // 2. Pending verification -> /pending-approval
  if (appUser.status === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }

  // 3. Rejected user -> /rejected
  if (appUser.status === "REJECTED") {
    redirect("/rejected");
  }

  // 4. Active User Role Dispatcher
  switch (appUser.role) {
    case "FARMER":
      redirect("/farmer");
    case "FIELD_AGENT":
      redirect("/agent");
    case "VETERINARIAN":
      redirect("/vet");
    case "DISTRICT_AUTHORITY":
      redirect("/authority");
    case "ADMIN":
      redirect("/admin");
    default:
      redirect("/onboarding");
  }
}
