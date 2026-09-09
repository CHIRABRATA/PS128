import { notFound } from "next/navigation";
import { requireFarmer, assertFarmerOwnsAnimal } from "@/lib/auth/permissions";
import { getFarmerAnimalTalkContextAction } from "@/lib/actions/farmer-talk";
import { getDictionary, Locale } from "@/lib/i18n";
import { cookies } from "next/headers";
import { FarmerChatBox } from "@/components/farmer/FarmerChatBox";

interface PageProps {
  params: Promise<{
    animalId: string;
  }>;
}

export default async function ScopedFarmerTalkPage({ params }: PageProps) {
  const { animalId } = await params;
  const farmer = await requireFarmer();

  try {
    await assertFarmerOwnsAnimal(animalId);
  } catch {
    notFound();
  }

  const contextRes = await getFarmerAnimalTalkContextAction(animalId);
  if (!contextRes.success || !contextRes.contextPacket) {
    notFound();
  }

  const localeCookie = (await cookies()).get("maitri-locale")?.value;
  const locale = (localeCookie === "bn" || localeCookie === "hi" || localeCookie === "mr" || localeCookie === "en"
    ? localeCookie
    : farmer.preferredLanguage) as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">
      <FarmerChatBox
        animalId={animalId}
        initialContext={contextRes.contextPacket}
        dictionary={dict.farmerTalk}
      />
    </div>
  );
}
