from app.schemas.advisory import MultilingualAdvisoryRequest, MultilingualAdvisoryResponse

# Pre-compiled dictionary mapping for standard advisory phrases across major Indian languages
# In production, this falls back to dynamic LLM translation if available
LOCALIZATION_STORE = {
    "hi": {
        "CRITICAL": "अत्यंत गंभीर आपात स्थिति",
        "HIGH": "उच्च जोखिम चेतावनी",
        "MEDIUM": "मध्यम जोखिम",
        "LOW": "सामान्य / कम जोखिम",
        "actions": {
            "IMMEDIATE ISOLATION of affected animals.": "बीमार पशुओं को तुरंत अन्य पशुओं से अलग (क्वारंटीन) करें।",
            "Contact local veterinary officer immediately.": "नजदीकी सरकारी पशु चिकित्सक (Vet Officer) से तुरंत संपर्क करें।",
            "Restrict farm access and do not move animals off-site.": "फार्म पर बाहरी लोगों की आवाजाही रोकें और पशुओं को बाहर न भेजें।",
            "Apply anti-vector sprays and clear standing water near shelter.": "पशुबाड़े के पास ठहरे पानी को हटाएं और मच्छर/मक्खी रोधक स्प्रे छिड़कें।",
            "ALARM: Local outbreak spike detected. Notify regional veterinary authorities.": "चेतावनी: इलाके में बीमारी का प्रकोप बढ़ रहा है। क्षेत्रीय पशुपालन विभाग को सूचित करें।"
        },
        "headline": "पशु स्वास्थ्य सुरक्षा निर्देश",
        "helpline": "1962 (राष्ट्रीय पशुधन स्वास्थ्य हेल्पलाइन)"
    },
    "ta": {
        "CRITICAL": "மிகவும் அவசரமான நிலை",
        "HIGH": "உயர் ஆபத்து எச்சரிக்கை",
        "MEDIUM": "மிதமான ஆபத்து",
        "LOW": "குறைந்த ஆபத்து / இயல்பு",
        "actions": {
            "IMMEDIATE ISOLATION of affected animals.": "பாதிக்கப்பட்ட விலங்குகளை உடனடியாக தனிமைப்படுத்தவும்.",
            "Contact local veterinary officer immediately.": "உடனே அருகில் உள்ள கால்நடை மருத்துவரை தொடர்பு கொள்ளவும்.",
            "Restrict farm access and do not move animals off-site.": "பண்ணை அணுகலை கட்டுப்படுத்தவும், விலங்குகளை வெளியே கொண்டு செல்ல வேண்டாம்.",
            "Apply anti-vector sprays and clear standing water near shelter.": "கொசு/ஈ மருந்துகளை தெளிக்கவும், தேங்கிய தண்ணீரை அகற்றவும்.",
            "ALARM: Local outbreak spike detected. Notify regional veterinary authorities.": "எச்சரிக்கை: பகுதியில் நோய் பரவல் அதிகரித்துள்ளது. அதிகாரிகளுக்கு தகவல் தெரிவிக்கவும்."
        },
        "headline": "கால்நடை சுகாதார அவசர வழிகாட்டுதல்",
        "helpline": "1962 (கால்நடை உதவி எண்)"
    },
    "bn": {
        "CRITICAL": "জরুরি সংকটজনক সতর্কতা",
        "HIGH": "উচ্চ ঝুঁকিপূর্ণ সতর্কবার্তা",
        "MEDIUM": "মাঝারি ঝুঁকি",
        "LOW": "স্বাভাবিক / কম ঝুঁকি",
        "actions": {
            "IMMEDIATE ISOLATION of affected animals.": "আক্রান্ত গবাদি পশুটিকে অবিলম্বে আলাদা করে রাখুন।",
            "Contact local veterinary officer immediately.": "অবিলম্বে স্থানীয় সরকারি পশু চিকিৎসকের সাথে যোগাযোগ করুন।",
            "Restrict farm access and do not move animals off-site.": "খামারে বহিরাগতদের প্রবেশ বন্ধ করুন এবং পশু স্থানান্তর করবেন না।",
            "Apply anti-vector sprays and clear standing water near shelter.": "গোয়ালঘরের চারপাশের জমে থাকা জল পরিষ্কার করুন এবং মশা-মাছি নাশক স্প্রে করুন।",
            "ALARM: Local outbreak spike detected. Notify regional veterinary authorities.": "সতর্কতা: এলাকায় রোগ প্রাদুর্ভাব বৃদ্ধি পেয়েছে। পশু পালন বিভাগকে জানান।"
        },
        "headline": "পশু স্বাস্থ্য পরামর্শ ও নির্দেশিকা",
        "helpline": "1962 (জাতীয় পশুপালন হেল্পলাইন)"
    }
}

def generate_multilingual_advisory(req: MultilingualAdvisoryRequest) -> MultilingualAdvisoryResponse:
    lang = req.target_language.lower()
    loc = LOCALIZATION_STORE.get(lang, None)
    
    if not loc:
        # Default English fallback
        return MultilingualAdvisoryResponse(
            language="en",
            headline="Livestock Advisory Directive",
            urgency_badge=f"RISK LEVEL: {req.risk_level}",
            translated_condition=req.suspected_condition,
            localized_actions=req.unified_recommendations,
            emergency_contacts={"National Livestock Helpline": "1962", "District Vet Center": "Local Officer"}
        )

    badge = loc.get(req.risk_level, req.risk_level)
    translated_actions = []
    
    for action in req.unified_recommendations:
        translated_action = loc["actions"].get(action, action)
        translated_actions.append(translated_action)

    return MultilingualAdvisoryResponse(
        language=lang,
        headline=loc["headline"],
        urgency_badge=badge,
        translated_condition=req.suspected_condition,
        localized_actions=translated_actions,
        emergency_contacts={
            "Toll-Free Helpline": loc["helpline"],
            "Department": "Animal Husbandry & Dairying (DAHD)"
        }
    )
