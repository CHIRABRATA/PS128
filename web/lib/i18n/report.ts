import { Locale } from "@/lib/i18n";

export interface ReportCopy {
  pageTitle: string;
  pageDescription: string;
  farmerPortal: string;
  successBadge: string;
  caseFor: string;
  submittedToVet: string;
  status: string;
  registrationType: string;
  farmerSelf: string;
  animalTag: string;
  symptoms: string;
  reportedAt: string;
  centralNotice: string;
  newReport: string;
  decisionTitle: string;
  decisionDescription: string;
  retry: string;
  startAnalysis: string;
  riskScore: string;
  clinicalSummary: string;
  noSummary: string;
  sensorTitle: string;
  weatherTitle: string;
  outbreakTitle: string;
  advisoryTitle: string;
  unavailable: string;
  noSensor: string;
  noWeather: string;
  noCluster: string;
  noAdvisory: string;
  temperature: string;
  activity: string;
  anomalies: string;
  humidity: string;
  precipitation: string;
  vectorRisk: string;
  latestCases: string;
  historicalMean: string;
  outbreakSpike: string;
}

const copies: Record<Locale, ReportCopy> = {
  en: {
    pageTitle: "Report Livestock Illness", pageDescription: "Record animal symptoms for automated triage, AI decision support, and veterinary consultation.", farmerPortal: "Farmer Portal", successBadge: "Report submitted successfully", caseFor: "Health concern recorded for", submittedToVet: "and sent to the veterinary officer.", status: "Status", registrationType: "Registration type", farmerSelf: "Farmer self-report", animalTag: "Animal tag", symptoms: "Recorded symptoms", reportedAt: "Reported at", centralNotice: "Your health report was recorded in the central system. A veterinarian will provide treatment and advice.", newReport: "Report another animal", decisionTitle: "Clinical Decision Support", decisionDescription: "Multimodal analysis of symptoms, sensors, weather, and outbreak data.", retry: "Retry analysis", startAnalysis: "Start analysis", riskScore: "Overall risk score", clinicalSummary: "Clinical summary", noSummary: "A preliminary assessment was recorded from the available health data.", sensorTitle: "IoT sensor signals", weatherTitle: "Weather and vector risk", outbreakTitle: "Outbreak trend analysis", advisoryTitle: "Farmer advisory", unavailable: "Data unavailable", noSensor: "No sensor connected.", noWeather: "Weather forecast unavailable.", noCluster: "Local outbreak data unavailable.", noAdvisory: "No advisory generated.", temperature: "Temperature", activity: "Activity", anomalies: "Anomalies", humidity: "Humidity", precipitation: "Precipitation", vectorRisk: "Vector risk", latestCases: "Latest cases", historicalMean: "Historical mean", outbreakSpike: "Outbreak spike",
  },
  bn: {
    pageTitle: "পশুর অসুস্থতার প্রতিবেদন", pageDescription: "স্বয়ংক্রিয় যাচাই, AI সহায়তা এবং পশুচিকিৎসকের পরামর্শের জন্য লক্ষণ নথিভুক্ত করুন।", farmerPortal: "কৃষক পোর্টাল", successBadge: "প্রতিবেদন সফলভাবে জমা হয়েছে", caseFor: "স্বাস্থ্য সমস্যা নথিভুক্ত হয়েছে", submittedToVet: "এবং পশুচিকিৎসকের কাছে পাঠানো হয়েছে।", status: "অবস্থা", registrationType: "নিবন্ধনের ধরন", farmerSelf: "কৃষকের স্ব-প্রতিবেদন", animalTag: "পশুর ট্যাগ", symptoms: "নথিভুক্ত লক্ষণ", reportedAt: "প্রতিবেদনের সময়", centralNotice: "আপনার স্বাস্থ্য প্রতিবেদন কেন্দ্রীয় ব্যবস্থায় নথিভুক্ত হয়েছে। পশুচিকিৎসক চিকিৎসা ও পরামর্শ দেবেন।", newReport: "অন্য পশুর প্রতিবেদন করুন", decisionTitle: "ক্লিনিক্যাল সিদ্ধান্ত সহায়তা", decisionDescription: "লক্ষণ, সেন্সর, আবহাওয়া ও রোগের প্রবণতার সমন্বিত বিশ্লেষণ।", retry: "আবার বিশ্লেষণ করুন", startAnalysis: "বিশ্লেষণ শুরু করুন", riskScore: "সামগ্রিক ঝুঁকি স্কোর", clinicalSummary: "ক্লিনিক্যাল সারাংশ", noSummary: "উপলব্ধ স্বাস্থ্য তথ্যের ভিত্তিতে প্রাথমিক মূল্যায়ন নথিভুক্ত হয়েছে।", sensorTitle: "IoT সেন্সর সংকেত", weatherTitle: "আবহাওয়া ও বাহক ঝুঁকি", outbreakTitle: "রোগের প্রবণতা বিশ্লেষণ", advisoryTitle: "কৃষকের পরামর্শ", unavailable: "তথ্য পাওয়া যায়নি", noSensor: "কোনো সেন্সর সংযুক্ত নেই।", noWeather: "আবহাওয়ার পূর্বাভাস পাওয়া যায়নি।", noCluster: "স্থানীয় রোগের তথ্য পাওয়া যায়নি।", noAdvisory: "কোনো পরামর্শ তৈরি হয়নি।", temperature: "তাপমাত্রা", activity: "সক্রিয়তা", anomalies: "অস্বাভাবিকতা", humidity: "আর্দ্রতা", precipitation: "বৃষ্টিপাত", vectorRisk: "বাহক ঝুঁকি", latestCases: "সাম্প্রতিক ঘটনা", historicalMean: "ঐতিহাসিক গড়", outbreakSpike: "রোগের প্রাদুর্ভাব",
  },
  hi: {
    pageTitle: "पशु बीमारी की रिपोर्ट", pageDescription: "स्वचालित जांच, AI सहायता और पशु चिकित्सक परामर्श के लिए लक्षण दर्ज करें।", farmerPortal: "किसान पोर्टल", successBadge: "रिपोर्ट सफलतापूर्वक जमा हुई", caseFor: "स्वास्थ्य समस्या दर्ज की गई", submittedToVet: "और पशु चिकित्सक को भेजी गई।", status: "स्थिति", registrationType: "पंजीकरण प्रकार", farmerSelf: "किसान स्वयं रिपोर्ट", animalTag: "पशु टैग", symptoms: "दर्ज लक्षण", reportedAt: "रिपोर्ट का समय", centralNotice: "आपकी स्वास्थ्य रिपोर्ट केंद्रीय प्रणाली में दर्ज हो गई है। पशु चिकित्सक उपचार और सलाह देंगे।", newReport: "दूसरे पशु की रिपोर्ट करें", decisionTitle: "क्लिनिकल निर्णय सहायता", decisionDescription: "लक्षण, सेंसर, मौसम और प्रकोप डेटा का संयुक्त विश्लेषण।", retry: "फिर से विश्लेषण करें", startAnalysis: "विश्लेषण शुरू करें", riskScore: "कुल जोखिम स्कोर", clinicalSummary: "क्लिनिकल सारांश", noSummary: "उपलब्ध स्वास्थ्य जानकारी के आधार पर प्रारंभिक मूल्यांकन दर्ज किया गया।", sensorTitle: "IoT सेंसर संकेत", weatherTitle: "मौसम और वेक्टर जोखिम", outbreakTitle: "प्रकोप प्रवृत्ति विश्लेषण", advisoryTitle: "किसान सलाह", unavailable: "जानकारी उपलब्ध नहीं", noSensor: "कोई सेंसर जुड़ा नहीं है।", noWeather: "मौसम पूर्वानुमान उपलब्ध नहीं है।", noCluster: "स्थानीय प्रकोप डेटा उपलब्ध नहीं है।", noAdvisory: "कोई सलाह नहीं बनाई गई।", temperature: "तापमान", activity: "गतिविधि", anomalies: "असामान्यताएं", humidity: "नमी", precipitation: "वर्षा", vectorRisk: "वेक्टर जोखिम", latestCases: "नवीनतम मामले", historicalMean: "ऐतिहासिक औसत", outbreakSpike: "प्रकोप वृद्धि",
  },
  mr: {
    pageTitle: "पशुधन आजाराचा अहवाल", pageDescription: "स्वयंचलित तपासणी, AI निर्णय सहाय्य आणि पशुवैद्यकीय सल्ल्यासाठी लक्षणे नोंदवा.", farmerPortal: "पशुपालक पोर्टल", successBadge: "अहवाल यशस्वीरीत्या नोंदवला", caseFor: "आरोग्य तक्रार नोंदवली असून", submittedToVet: "पशुवैद्यकीय अधिकाऱ्यांकडे पाठवली आहे.", status: "स्थिती", registrationType: "नोंदणी प्रकार", farmerSelf: "पशुपालक स्व-नोंदणी", animalTag: "जनावर टॅग", symptoms: "नोंदवलेली लक्षणे", reportedAt: "नोंदवलेली वेळ", centralNotice: "आपली आरोग्य तक्रार मध्यवर्ती प्रणालीत नोंदवली आहे. पशुवैद्यकीय अधिकारी उपचार व सल्ला देतील.", newReport: "दुसऱ्या जनावराची तक्रार नोंदवा", decisionTitle: "पशु रोग नैदानिक निर्णय सहाय्य", decisionDescription: "लक्षणे, सेन्सर, हवामान आणि प्रादुर्भाव डेटाचे बहुआयामी विश्लेषण.", retry: "पुन्हा तपासा", startAnalysis: "विश्लेषण सुरू करा", riskScore: "एकूण रोग धोका स्कोअर", clinicalSummary: "वैद्यकीय सारांश", noSummary: "उपलब्ध आरोग्य माहितीच्या आधारे प्राथमिक मूल्यांकन नोंदवले गेले.", sensorTitle: "IoT सेन्सर सिग्नल्स", weatherTitle: "हवामान व कीटक धोका", outbreakTitle: "प्रादुर्भाव क्लस्टर विश्लेषण", advisoryTitle: "पशुपालक तातडीचा सल्ला", unavailable: "माहिती उपलब्ध नाही", noSensor: "कोणताही सेन्सर जोडलेला नाही.", noWeather: "हवामान अंदाज उपलब्ध नाही.", noCluster: "स्थानिक क्लस्टर डेटा उपलब्ध नाही.", noAdvisory: "सल्ला उपलब्ध नाही.", temperature: "तापमान", activity: "हालचाल", anomalies: "असामान्यता", humidity: "आर्द्रता", precipitation: "पाऊस", vectorRisk: "कीटक धोका", latestCases: "अलीकडील प्रकरणे", historicalMean: "ऐतिहासिक सरासरी", outbreakSpike: "प्रादुर्भाव वाढ",
  },
};

export function getReportCopy(locale: Locale): ReportCopy {
  return copies[locale] || copies.en;
}
