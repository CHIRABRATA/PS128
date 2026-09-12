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
  photoUploadFailed: string;
  photoRetry: string;
  photoUploading: string;
  photoUploaded: string;
}

const copies: Record<Locale, ReportCopy> = {
  en: {
    pageTitle: "Report Livestock Illness",
    pageDescription: "Record observed symptoms for triage, AI decision support, and veterinary routing.",
    farmerPortal: "Farmer Portal",
    successBadge: "Report submitted successfully",
    caseFor: "Health incident recorded for",
    submittedToVet: "and routed to veterinary services.",
    status: "Status",
    registrationType: "Registration Type",
    farmerSelf: "Farmer Direct Intake",
    animalTag: "Animal Tag",
    symptoms: "Reported Symptoms",
    reportedAt: "Reported At",
    centralNotice: "Your report has been received in the central registry. A veterinary officer will review the case details.",
    newReport: "Report Another Animal",
    decisionTitle: "Clinical Decision Support",
    decisionDescription: "Multi-modal analysis from reported symptoms, IoT sensor telemetry, weather variables, and disease cluster tracking.",
    retry: "Retry Analysis",
    startAnalysis: "Run Clinical Assessment",
    riskScore: "Overall risk score",
    clinicalSummary: "Clinical Summary",
    noSummary: "Preliminary assessment recorded from case intake data.",
    sensorTitle: "IoT sensor signals",
    weatherTitle: "Weather and vector risk",
    outbreakTitle: "Outbreak trend analysis",
    advisoryTitle: "Farmer advisory",
    unavailable: "Unavailable",
    noSensor: "No active sensor telemetry available.",
    noWeather: "Weather forecast unavailable.",
    noCluster: "No localized outbreak cluster detected.",
    noAdvisory: "No specific farmer advisory generated.",
    temperature: "Temperature",
    activity: "Activity",
    anomalies: "Anomalies",
    humidity: "Humidity",
    precipitation: "Precipitation",
    vectorRisk: "Vector Risk",
    latestCases: "Recent Cases",
    historicalMean: "Historical Mean",
    outbreakSpike: "Outbreak Spike",
    photoUploadFailed: "Photo upload failed. Your photo is still available for retry. Please try uploading again.",
    photoRetry: "Retry Upload",
    photoUploading: "Uploading image securely...",
    photoUploaded: "Photo uploaded securely",
  },
  bn: {
    pageTitle: "পশুর স্বাস্থ্য রিপোর্ট",
    pageDescription: "চিকিৎসা সহায়তা ও পশুচিকিৎসক পর্যালোচনার জন্য লক্ষণগুলি নথিভুক্ত করুন।",
    farmerPortal: "কৃষক পোর্টাল",
    successBadge: "রিপোর্ট জমা হয়েছে",
    caseFor: "স্বাস্থ্য সমস্যা নথিভুক্ত হয়েছে",
    submittedToVet: "এবং পশুচিকিৎসা বিভাগে পাঠানো হয়েছে।",
    status: "অবস্থা",
    registrationType: "নিবন্ধন প্রকার",
    farmerSelf: "কৃষক সরাসরি রিপোর্ট",
    animalTag: "পশুর ট্যাগ",
    symptoms: "লক্ষণসমূহ",
    reportedAt: "রিপোর্টের সময়",
    centralNotice: "আপনার রিপোর্ট কেন্দ্রীয় সিস্টেমে জমা হয়েছে। একজন পশুচিকিৎসক শীঘ্রই এটি পর্যালোচনা করবেন।",
    newReport: "অন্য পশুর রিপোর্ট করুন",
    decisionTitle: "ক্লিনিক্যাল সিদ্ধান্ত সহায়তা",
    decisionDescription: "লক্ষণ, সেন্সর ও আবহাওয়া ডেটার উপর ভিত্তি করে বিশ্লেষণ।",
    retry: "পুনরায় চেষ্টা করুন",
    startAnalysis: "বিশ্লেষণ শুরু করুন",
    riskScore: "সামগ্রিক ঝুঁকি স্কোর",
    clinicalSummary: "ক্লিনিক্যাল সারাংশ",
    noSummary: "প্রাথমিক মূল্যায়ন সংরক্ষিত হয়েছে।",
    sensorTitle: "IoT সেন্সর সংকেত",
    weatherTitle: "আবহাওয়া ও ভেক্টর ঝুঁকি",
    outbreakTitle: "প্রকোপ ক্লাস্টার ট্র্যাকিং",
    advisoryTitle: "কৃষক পরামর্শ",
    unavailable: "অনুপলব্ধ",
    noSensor: "কোন সেন্সর সংযুক্ত নেই।",
    noWeather: "আবহাওয়ার তথ্য পাওয়া যায়নি।",
    noCluster: "কোন প্রকোপ শনাক্ত হয়নি।",
    noAdvisory: "কোন পরামর্শ তৈরি হয়নি।",
    temperature: "তাপমাত্রা",
    activity: "কার্যকলাপ",
    anomalies: "অস্বাভাবিকতা",
    humidity: "আর্দ্রতা",
    precipitation: "বৃষ্টিপাত",
    vectorRisk: "ভেক্টর ঝুঁকি",
    latestCases: "সাম্প্রতিক কেস",
    historicalMean: "ঐতিহাসিক গড়",
    outbreakSpike: "প্রকোপ বৃদ্ধি",
    photoUploadFailed: "ছবি আপলোড ব্যর্থ হয়েছে। আপনার ছবিটি সুরক্ষিত আছে, পুনরায় আপলোড করার চেষ্টা করুন।",
    photoRetry: "আবার চেষ্টা করুন",
    photoUploading: "ছবি সুরক্ষিতভাবে আপলোড হচ্ছে...",
    photoUploaded: "ছবি সফলভাবে যুক্ত হয়েছে",
  },
  hi: {
    pageTitle: "पशु बीमारी की रिपोर्ट",
    pageDescription: "स्वचालित जांच, AI सहायता और पशु चिकित्सक परामर्श के लिए लक्षण दर्ज करें।",
    farmerPortal: "किसान पोर्टल",
    successBadge: "रिपोर्ट सफलतापूर्वक जमा हुई",
    caseFor: "स्वास्थ्य समस्या दर्ज की गई",
    submittedToVet: "और पशु चिकित्सक को भेजी गई।",
    status: "स्थिति",
    registrationType: "पंजीकरण प्रकार",
    farmerSelf: "किसान स्वयं रिपोर्ट",
    animalTag: "पशु टैग",
    symptoms: "दर्ज लक्षण",
    reportedAt: "रिपोर्ट का समय",
    centralNotice: "आपकी स्वास्थ्य रिपोर्ट केंद्रीय प्रणाली में दर्ज हो गई है। पशु चिकित्सक उपचार और सलाह देंगे।",
    newReport: "दूसरे पशु की रिपोर्ट करें",
    decisionTitle: "क्लिनिकल निर्णय सहायता",
    decisionDescription: "लक्षण, सेंसर, मौसम और प्रकोप डेटा का संयुक्त विश्लेषण।",
    retry: "फिर से विश्लेषण करें",
    startAnalysis: "विश्लेषण शुरू करें",
    riskScore: "कुल जोखिम स्कोर",
    clinicalSummary: "क्लिनिकल सारांश",
    noSummary: "उपलब्ध स्वास्थ्य जानकारी के आधार पर प्रारंभिक मूल्यांकन दर्ज किया गया।",
    sensorTitle: "IoT सेंसर संकेत",
    weatherTitle: "मौसम और वेक्टर जोखिम",
    outbreakTitle: "प्रकोप प्रवृत्ति विश्लेषण",
    advisoryTitle: "किसान सलाह",
    unavailable: "जानकारी उपलब्ध नहीं",
    noSensor: "कोई सेंसर जुड़ा नहीं है।",
    noWeather: "मौसम पूर्वानुमान उपलब्ध नहीं है।",
    noCluster: "स्थानीय प्रकोप डेटा उपलब्ध नहीं है।",
    noAdvisory: "कोई सलाह नहीं बनाई गई।",
    temperature: "तापमान",
    activity: "गतिविधि",
    anomalies: "असामान्यताएं",
    humidity: "नमी",
    precipitation: "वर्षा",
    vectorRisk: "वेक्टर जोखिम",
    latestCases: "नवीनतम मामले",
    historicalMean: "ऐतिहासिक औसत",
    outbreakSpike: "प्रकोप वृद्धि",
    photoUploadFailed: "फ़ोटो अपलोड विफल रही। आपकी फ़ोटो सुरक्षित है, कृपया पुनः प्रयास करें।",
    photoRetry: "पुनः प्रयास करें",
    photoUploading: "फ़ोटो सुरक्षित रूप से अपलोड हो रही है...",
    photoUploaded: "फ़ोटो सफलतापूर्वक संलग्न की गई",
  },
  mr: {
    pageTitle: "पशुधन आजाराचा अहवाल",
    pageDescription: "स्वयंचलित तपासणी, AI निर्णय सहाय्य आणि पशुवैद्यकीय सल्ल्यासाठी लक्षणे नोंदवा.",
    farmerPortal: "पशुपालक पोर्टल",
    successBadge: "अहवाल यशस्वीरीत्या नोंदवला",
    caseFor: "आरोग्य तक्रार नोंदवली असून",
    submittedToVet: "पशुवैद्यकीय अधिकाऱ्यांकडे पाठवली आहे.",
    status: "स्थिती",
    registrationType: "नोंदणी प्रकार",
    farmerSelf: "पशुपालक स्व-नोंदणी",
    animalTag: "जनावर टॅग",
    symptoms: "नोंदवलेली लक्षणे",
    reportedAt: "नोंदवलेली वेळ",
    centralNotice: "आपली आरोग्य तक्रार मध्यवर्ती प्रणालीत नोंदवली आहे. पशुवैद्यकीय अधिकारी उपचार व सल्ला देतील.",
    newReport: "दुसऱ्या जनावराची तक्रार नोंदवा",
    decisionTitle: "पशु रोग नैदानिक निर्णय सहाय्य",
    decisionDescription: "लक्षणे, सेन्सर, हवामान आणि प्रादुर्भाव डेटाचे बहुआयामी विश्लेषण.",
    retry: "पुन्हा तपासा",
    startAnalysis: "विश्लेषण सुरू करा",
    riskScore: "एकूण रोग धोका स्कोअर",
    clinicalSummary: "वैद्यकीय सारांश",
    noSummary: "उपलब्ध आरोग्य माहितीच्या आधारे प्राथमिक मूल्यांकन नोंदवले गेले.",
    sensorTitle: "IoT सेन्सर सिग्नल्स",
    weatherTitle: "हवामान व कीटक धोका",
    outbreakTitle: "प्रादुर्भाव क्लस्टर विश्लेषण",
    advisoryTitle: "पशुपालक तातडीचा सल्ला",
    unavailable: "माहिती उपलब्ध नाही",
    noSensor: "कोणताही सेन्सर जोडलेला नाही.",
    noWeather: "हवामान अंदाज उपलब्ध नाही.",
    noCluster: "स्थानिक क्लस्टर डेटा उपलब्ध नाही.",
    noAdvisory: "सल्ला उपलब्ध नाही.",
    temperature: "तापमान",
    activity: "हालचाल",
    anomalies: "असामान्यता",
    humidity: "आर्द्रता",
    precipitation: "पाऊस",
    vectorRisk: "कीटक धोका",
    latestCases: "अलीकडील प्रकरणे",
    historicalMean: "ऐतिहासिक सरासरी",
    outbreakSpike: "प्रादुर्भाव वाढ",
    photoUploadFailed: "छायाचित्र अपलोड अयशस्वी झाले. आपले छायाचित्र सुरक्षित आहे, कृपया पुन्हा प्रयत्न करा.",
    photoRetry: "पुन्हा प्रयत्न करा",
    photoUploading: "छायाचित्र सुरक्षितपणे अपलोड होत आहे...",
    photoUploaded: "छायाचित्र सुरक्षितपणे जोडले गेले",
  },
};

export function getReportCopy(locale: Locale): ReportCopy {
  return copies[locale] || copies.en;
}
