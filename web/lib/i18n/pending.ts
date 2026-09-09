import { Locale } from "@/lib/i18n";

export interface PendingCopy {
  badge: string;
  title: string;
  submitted: string;
  professional: string;
  applicant: string;
  phone: string;
  scope: string;
  assignedDistrict: string;
  whyTitle: string;
  whyText: string;
  checkStatus: string;
  signOut: string;
  roleNames: Record<string, string>;
}

const copies: Record<Locale, PendingCopy> = {
  en: {
    badge: "Verification Pending",
    title: "Waiting for account approval",
    submitted: "Your registration as a {role} has been sent to the district veterinary officer for verification.",
    professional: "professional",
    applicant: "Applicant name",
    phone: "Mobile phone",
    scope: "Assigned scope",
    assignedDistrict: "Assigned district",
    whyTitle: "Why is approval required?",
    whyText: "Veterinary and field-agent accounts are verified by the district animal husbandry department to protect the accuracy and security of outbreak data.",
    checkStatus: "Check status",
    signOut: "Sign out",
    roleNames: { DISTRICT_AUTHORITY: "District Authority", FIELD_AGENT: "Field Agent", VETERINARIAN: "Veterinarian" },
  },
  bn: {
    badge: "যাচাই অপেক্ষমাণ",
    title: "অ্যাকাউন্ট অনুমোদনের অপেক্ষায়",
    submitted: "{role} হিসেবে আপনার নিবন্ধন যাচাইয়ের জন্য জেলা পশুচিকিৎসা কর্মকর্তার কাছে পাঠানো হয়েছে।",
    professional: "পেশাদার",
    applicant: "আবেদনকারীর নাম",
    phone: "মোবাইল ফোন",
    scope: "নির্ধারিত এলাকা",
    assignedDistrict: "নির্ধারিত জেলা",
    whyTitle: "অনুমোদন কেন প্রয়োজন?",
    whyText: "রোগের প্রাদুর্ভাব সংক্রান্ত তথ্যের নির্ভুলতা ও নিরাপত্তার জন্য পশুচিকিৎসক এবং মাঠকর্মী অ্যাকাউন্ট জেলা পশুপালন বিভাগ যাচাই করে।",
    checkStatus: "অবস্থা দেখুন",
    signOut: "সাইন আউট",
    roleNames: { DISTRICT_AUTHORITY: "জেলা কর্তৃপক্ষ", FIELD_AGENT: "মাঠকর্মী", VETERINARIAN: "পশুচিকিৎসক" },
  },
  hi: {
    badge: "सत्यापन लंबित",
    title: "खाता स्वीकृति की प्रतीक्षा है",
    submitted: "{role} के रूप में आपका पंजीकरण सत्यापन के लिए जिला पशु चिकित्सा अधिकारी को भेजा गया है।",
    professional: "पेशेवर",
    applicant: "आवेदक का नाम",
    phone: "मोबाइल फोन",
    scope: "निर्धारित क्षेत्र",
    assignedDistrict: "निर्धारित जिला",
    whyTitle: "स्वीकृति क्यों आवश्यक है?",
    whyText: "रोग प्रकोप डेटा की सटीकता और सुरक्षा के लिए पशु चिकित्सा और फील्ड एजेंट खातों का सत्यापन जिला पशुपालन विभाग द्वारा किया जाता है।",
    checkStatus: "स्थिति जांचें",
    signOut: "साइन आउट",
    roleNames: { DISTRICT_AUTHORITY: "जिला प्राधिकरण", FIELD_AGENT: "फील्ड एजेंट", VETERINARIAN: "पशु चिकित्सक" },
  },
  mr: {
    badge: "पडताळणी प्रलंबित",
    title: "खाते मंजुरीची प्रतीक्षा आहे",
    submitted: "आपली {role} म्हणून नोंदणी पडताळणीसाठी जिल्हा पशुवैद्यकीय अधिकाऱ्यांकडे पाठवली आहे.",
    professional: "व्यावसायिक",
    applicant: "अर्जदाराचे नाव",
    phone: "मोबाईल फोन",
    scope: "नेमून दिलेली कार्यकक्षा",
    assignedDistrict: "नेमून दिलेला जिल्हा",
    whyTitle: "मंजुरी का आवश्यक आहे?",
    whyText: "रोग प्रादुर्भाव डेटाच्या अचूकतेसाठी आणि सुरक्षिततेसाठी, पशुवैद्यकीय आणि फील्ड एजंट खात्यांची जिल्हा पशुसंवर्धन विभागाकडून पडताळणी केली जाते.",
    checkStatus: "स्थिती तपासा",
    signOut: "बाहेर पडा",
    roleNames: { DISTRICT_AUTHORITY: "जिल्हा नियंत्रण अधिकारी", FIELD_AGENT: "पशुसखी / फील्ड एजंट", VETERINARIAN: "पशुवैद्यकीय अधिकारी" },
  },
};

export function getPendingCopy(locale: Locale): PendingCopy {
  return copies[locale] || copies.en;
}
