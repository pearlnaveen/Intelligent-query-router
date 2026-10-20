/**
 * Translation & Multi-Language Helper Service for English <-> Tamil
 */

// Tamil keyword regex mapping to English equivalents
const TAMIL_TO_ENGLISH_KEYWORDS = [
  { pattern: /வேலைவாய்ப்பு|பிளேஸ்மென்ட்|ப்ளேஸ்மென்ட்|வேலை/g, english: 'placement' },
  { pattern: /சம்பளம்|சம்பள|பேக்கேஜ்|சம்பளப் பொதி/g, english: 'package salary' },
  { pattern: /உயர்ந்த|அதிகபட்ச|அதிக|மிகப்பெரிய|டாப்/g, english: 'highest' },
  { pattern: /சராசரி/g, english: 'average' },
  { pattern: /நிறுவனங்கள்|கம்பெனி|நிறுவனம்|நிறுவனங்களின்/g, english: 'companies' },
  { pattern: /விடுதி|ஹோஸ்டல்|தங்கும் விடுதி/g, english: 'hostel' },
  { pattern: /நூல்நிலையம்|லைப்ரரி|நூலகம்|புத்தகங்கள்/g, english: 'library' },
  { pattern: /உணவகம்|கேண்டீன்|சாப்பாடு/g, english: 'canteen' },
  { pattern: /கட்டணம்|கட்டணங்கள்|ஃபீஸ்/g, english: 'fees fee' },
  { pattern: /பேருந்து|போக்குவரத்து|பஸ்/g, english: 'transport bus' },
  { pattern: /நிறுவனர்|தொடங்கியவர்|யார் தொடங்கினா|நிறுவியவர்/g, english: 'founder' },
  { pattern: /வளாகம்|உள்கட்டமைப்பு|ஆய்வகம்|ஆய்வகங்கள்|லப்/g, english: 'infrastructure labs' },
  { pattern: /நிகழ்வுகள்|நிகழ்ச்சிகள்|ஹேக்கத்தான்|டெக்ஃபெஸ்ட்|சிம்போசியம்|கருத்தரங்கம்|மாநாடு|பயிலரங்கு/g, english: 'events hackathon symposium conference' },
  { pattern: /பாடத்திட்டம்|கரிக்குலம்/g, english: 'syllabus' },
  { pattern: /பாடப்பிரிவுகள்|கோர்ஸ்கள்|கோர்ஸ்|படிப்புகள்/g, english: 'courses' },
  { pattern: /தொடர்பு|போன்|மின்னஞ்சல்|தொலைபேசி/g, english: 'contact phone email' },
  { pattern: /முகவரி|இடம்|அமைவிடம்|எங்கே/g, english: 'location address' },
  { pattern: /விதிகள்|கட்டுப்பாடுகள்|ஒழுங்கு|விதிமுறைகள்/g, english: 'rules regulations' },
  { pattern: /கிளப்புகள்|கிளப்|மன்றம்|மன்றங்கள்|என்சிசி|என்எஸ்எஸ்|யோகா|இயற்கை மன்றம்/g, english: 'clubs club ncc nss' },
  { pattern: /யார்|யாரு|யாவர்/g, english: 'who' },
  { pattern: /என்ன|எவை/g, english: 'what' }
];

/**
 * Check if string contains Tamil characters
 */
export function containsTamilText(text) {
  if (!text) return false;
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Replace Tamil words in query with English equivalents for NLP intent classification
 */
export function preprocessTamilQuery(query) {
  if (!query) return query;
  let text = query.toLowerCase();

  for (const item of TAMIL_TO_ENGLISH_KEYWORDS) {
    text = text.replace(item.pattern, ` ${item.english} `);
  }

  return text;
}

/**
 * Dynamic English to Tamil Markdown Phrase Replacements
 */
function translateMarkdownHeadings(text) {
  if (!text) return text;
  let result = text;

  const phraseMap = [
    { en: /About National Engineering College \(NEC\)/gi, ta: 'தேசிய பொறியியல் கல்லூரி (NEC) பற்றி' },
    { en: /About NEC Assistant/gi, ta: 'NEC AI உதவியாளர் பற்றி' },
    { en: /Founder of NEC/gi, ta: 'NEC கல்லூரியின் நிறுவனர்' },
    { en: /College Leadership/gi, ta: 'கல்லூரி நிர்வாக தலைவர்கள்' },
    { en: /Vision of NEC/gi, ta: 'NEC கல்லூரியின் தொலைநோக்கு (Vision)' },
    { en: /Mission of NEC/gi, ta: 'NEC கல்லூரியின் லட்சியம் (Mission)' },
    { en: /Admission Process and Eligibility/gi, ta: 'சேர்க்கை நடைமுறை & தகுதிகள்' },
    { en: /Departments and Programs Offered/gi, ta: 'வழங்கப்படும் பாடப்பிரிவுகள் & துறைகள்' },
    { en: /Computer Science & Engineering \(CSE\)/gi, ta: 'கணினி அறிவியல் & பொறியியல் துறை (CSE)' },
    { en: /Information Technology \(IT\)/gi, ta: 'தகவல் தொழில்நுட்பவியல் துறை (IT)' },
    { en: /Mechanical Engineering/gi, ta: 'இயந்திரவியல் துறை (Mechanical)' },
    { en: /Civil Engineering/gi, ta: 'சிவில் பொறியியல் துறை (Civil)' },
    { en: /Campus Infrastructure and Facilities/gi, ta: 'வளாக உள்கட்டமைப்பு & வசதிகள்' },
    { en: /Hostel Facilities/gi, ta: 'விடுதி வசதிகள்' },
    { en: /Central Library/gi, ta: 'மத்திய நூலகம்' },
    { en: /Canteen Facilities/gi, ta: 'உணவக வசதிகள்' },
    { en: /Transport Facilities/gi, ta: 'பேருந்து & போக்குவரத்து வசதிகள்' },
    { en: /Fee Structure/gi, ta: 'கல்விக் கட்டண விவரங்கள்' },
    { en: /Rules and Regulations/gi, ta: 'கல்லூரி ஒழுங்கு விதிகள்' },
    { en: /Events & Techfest/gi, ta: 'விழாக்கள் & ஹேக்கத்தான்கள்' },
    { en: /Campus Life & Clubs/gi, ta: 'வளாக வாழ்க்கை & மாணவர் மன்றங்கள்' },
    { en: /Placement Highlights/gi, ta: 'வேலைவாய்ப்பு சிறப்பம்சங்கள்' },
    { en: /How to Reach NEC/gi, ta: 'NEC கல்லூரிக்கு செல்லும் வழி' },
    { en: /Contact Details/gi, ta: 'தொடர்பு விவரங்கள்' },
    { en: /Here is what I can do for you:/gi, ta: 'நான் உங்களுக்கு செய்யக்கூடிய உதவிகள்:' },
    { en: /Placement Statistics/gi, ta: 'வேலைவாய்ப்பு புள்ளிவிவரங்கள்' },
    { en: /Placed Students/gi, ta: 'வேலை பெற்ற மாணவர்கள்' },
    { en: /Participating Students/gi, ta: 'பங்கேற்ற மாணவர்கள்' },
    { en: /Placement Rate/gi, ta: 'வேலைவாய்ப்பு சதவீதம்' },
    { en: /Highest Package/gi, ta: 'மிக உயர்ந்த சம்பள பேக்கேஜ்' },
    { en: /Average Package/gi, ta: 'சராசரி சம்பள பேக்கேஜ்' },
    { en: /Recruiting Companies/gi, ta: 'வருகை தந்த நிறுவனங்கள்' },
    { en: /Upcoming Drives/gi, ta: 'வரவிருக்கும் வேலைவாய்ப்பு முகாம்கள்' }
  ];

  for (const item of phraseMap) {
    result = result.replace(item.en, item.ta);
  }

  return result;
}

/**
 * Main function to translate intent responses into rich, natural Tamil
 */
export function translateResponseToTamil(intent, replyText, contextData = {}) {
  const { dept, batch, stats, highest, avg, companiesList, drives, comp } = contextData;

  switch (intent) {
    case 'privacy_violation':
      return "⚠️ **தனிநபர் தகவல் பாதுகாப்பு தடுக்கப்பட்டது**\nதேசிய பொறியியல் கல்லூரியின் பொது AI உதவியாளராக, மாணவர்களின் தனிப்பட்ட தகவல்கள், மதிப்பெண்கள், வருகைப்பதிவு அல்லது கடவுச்சொற்களை என்னால் வழங்க முடியாது. உங்கள் தனிப்பட்ட தகவல்களுக்கு தயவுசெய்து ERP போர்ட்டலில் லாக் இன் செய்யவும்.";

    case 'placement_percentage':
      if (stats) {
        if (dept) {
          return `**${dept}** துறைக்கான வேலைவாய்ப்பு புள்ளிவிவரங்கள் (பேட்ச்: **${batch}**):\n\n` +
                 `- **வேலை பெற்ற மாணவர்கள்**: ${stats.placedCount} நபர்கள்\n` +
                 `- **பங்கேற்ற மாணவர்கள்**: ${stats.registeredCount} நபர்கள்\n` +
                 `- **வேலைவாய்ப்பு சதவீதம் (பங்கேற்றவர்கள்)**: **${stats.percentParticipating}%**\n` +
                 `- **மொத்த மாணவர்கள் எண்ணிக்கை**: ${stats.totalCount} நபர்கள்\n` +
                 `- **மொத்த வேலைவாய்ப்பு சதவீதம்**: **${stats.percentTotal}%**\n\n` +
                 `*குறிப்பு: உத்தியோகபூர்வ வேலைவாய்ப்பு சதவீதம் தகுதியான மாணவர்களின் அடிப்படையில் கணக்கிடப்படுகிறது.*`;
        }
        return `NEC கல்லூரியின் ஒட்டுமொத்த வேலைவாய்ப்பு புள்ளிவிவரங்கள் (பேட்ச்: **${batch}**):\n\n` +
               `- **வேலை பெற்ற மாணவர்கள்**: ${stats.placedCount} நபர்கள்\n` +
               `- **பங்கேற்ற மாணவர்கள்**: ${stats.registeredCount} நபர்கள்\n` +
               `- **வேலைவாய்ப்பு சதவீதம் (பங்கேற்றவர்கள்)**: **${stats.percentParticipating}%**\n` +
               `- **மொத்த மாணவர்கள் எண்ணிக்கை**: ${stats.totalCount} நபர்கள்\n` +
               `- **மொத்த வேலைவாய்ப்பு சதவீதம்**: **${stats.percentTotal}%**\n\n` +
               `*குறிப்பு: உத்தியோகபூர்வ வேலைவாய்ப்பு சதவீதம் தகுதியான மாணவர்களின் அடிப்படையில் கணக்கிடப்படுகிறது.*`;
      }
      break;

    case 'placement_highest':
      if (highest) {
        const deptText = dept ? `**${dept}** துறைக்கு` : 'ஒட்டுமொத்தமாக';
        return `NEC கல்லூரியில் ${deptText} **${batch}** பேட்சில் வழங்கப்பட்ட மிக உயர்ந்த சம்பள பேக்கேஜ் **${highest.formattedPackage}** ஆகும்.\n\n` +
               `**வேலைவாய்ப்பு விவரங்கள்**:\n` +
               highest.placements.map(p => `- **${p.company}** நிறுவனத்தில் **${p.role}** பணி (${p.department} துறை)`).join('\n');
      }
      return `**${batch}** பேட்சிற்கான மிக உயர்ந்த சம்பள விவரங்கள் எதுவும் பதிவு செய்யப்படவில்லை.`;

    case 'placement_average':
      if (avg) {
        const deptText = dept ? `**${dept}** துறைக்கு` : 'ஒட்டுமொத்தமாக';
        return `**${batch}** பேட்சில் ${deptText} வழங்கப்பட்ட சராசரி சம்பள பேக்கேஜ் **${avg.formattedPackage}** ஆகும்.`;
      }
      return `**${batch}** பேட்சிற்கான சராசரி சம்பள விவரங்கள் கிடைக்கவில்லை.`;

    case 'placement_count':
      if (stats) {
        return `**${batch}** பேட்சில் மொத்தம் **${stats.placedCount}** மாணவர்கள் வெற்றிகரமாக வேலைவாய்ப்பு பெற்றுள்ளனர்.`;
      }
      break;

    case 'placement_companies':
      if (companiesList && companiesList.length > 0) {
        return `**${batch}** பேட்சில் NEC கல்லூரிக்கு வருகை தந்த முக்கிய நிறுவனங்கள்:\n\n` +
               companiesList.map(c => `- ${c}`).join('\n');
      }
      return `**${batch}** பேட்சிற்கான நிறுவனங்களின் பட்டியல் கிடைக்கவில்லை.`;

    case 'upcoming_drives':
      if (drives && drives.length > 0) {
        return `NEC கல்லூரியில் வரவிருக்கும் வேலைவாய்ப்பு முகாம்கள் (பேட்ச்: **${batch}**):\n\n` +
               drives.map(d =>
                 `### ${d.company}\n` +
                 `- **தேதி**: ${d.date}\n` +
                 `- **சம்பளம்**: **${d.salary || 'சிறந்த சம்பளம்'}**\n` +
                 `- **பணி**: ${d.roles || 'பொறியாளர் / டெவலப்பர்'}\n` +
                 `- **தகுதியான துறைகள்**: ${d.departments.join(', ')}`
               ).join('\n\n');
      }
      return `தற்போது **${batch}** பேட்சிற்கு புதிய வேலைவாய்ப்பு முகாம்கள் எதுவும் அட்டவணைப்படுத்தப்படவில்லை.`;

    case 'interview_feedback':
      if (comp) {
        return `## **${comp}** நிறுவனத்தின் நேர்முகத்தேர்வு அனுபவம் & தகவல்கள்\n\n- **பரிந்துரைக்கப்பட்ட பகுதிகள்**: தரவு கட்டமைப்புகள் (Data Structures), அல்காரிதம்கள் (Algorithms) மற்றும் OOPs தலைப்புகளில் கவனம் செலுத்தவும்.\n- **நேர்முகத்தேர்வுகள்**: ஆப்டிடியூட், தொழில்நுட்ப சுற்று (Technical Round), மற்றும் எச்.ஆர் சுற்று (HR Round) அடங்கும்.`;
      }
      return "எந்த நிறுவனத்தின் நேர்முகத்தேர்வு அனுபவங்களை மதிப்பாய்வு செய்ய விரும்புகிறீர்கள்? (எ.கா. \"Zoho நேர்முகத்தேர்வு பற்றி கூறவும்\")";

    case 'bot_identity_info':
      return "வணக்கம்! நான் **தேசிய பொறியியல் கல்லூரியின் (NEC)** அதிகாரப்பூர்வ AI வளாக உதவியாளர். 👋\n\nநான் கல்லூரி உள்கட்டமைப்பு, வேலைவாய்ப்பு புள்ளிவிவரங்கள், விடுதி, நூலகம், பாடப்பிரிவுகள் மற்றும் சேர்க்கை தொடர்பான அனைத்து கேள்விகளுக்கும் 24/7 பதிலளிப்பேன்.";

    case 'hostel_info':
      return "## 🏡 NEC கல்லூரி விடுதி வசதிகள்\n\nNEC கல்லூரியில் மாணவர்கள் மற்றும் மாணவிகளுக்கு தனித்தனி நவீன விடுதிகள் உள்ளன:\n- **வசதிகள்**: 24/7 வைஃபை, சுவையான சத்தான உணவு, சுத்திகரிக்கப்பட்ட குடிநீர்.\n- **பாதுகாப்பு**: 24 மணிநேர கண்காணிப்பு மற்றும் மருத்துவ வசதிகள்.\n- **விளையாட்டு**: உடற்பயிற்சிகூடம் (Gym) மற்றும் விளையாட்டு மைதானங்கள் உள்ளன.";

    case 'library_info':
      return "## 📚 NEC மத்திய நூலகம்\n\nNEC கல்லூரியின் மத்திய நூலகம் 65,000-க்கும் மேற்பட்ட புத்தகங்கள் மற்றும் மின்-நூல்களைக் கொண்டுள்ளது:\n- **மின்-நூலகம்**: IEEE, ScienceDirect மற்றும் Springer இதழ்கள் அணுகல்.\n- **நேரம்**: வார நாட்களில் காலை 8:00 மணி முதல் இரவு 8:00 மணி வரை திறந்திருக்கும்.";

    case 'canteen_info':
      return "## 🍽️ கல்லூரி உணவகம் (Canteen)\n\nசுத்தமான மற்றும் சுகாதாரமான முறையில் தயாரிக்கப்பட்ட தென்னிந்திய மற்றும் வடஇந்திய உணவுகள், சிற்றுண்டிகள் மற்றும் பானங்கள் நியாயமான விலையில் கிடைக்கின்றன.";

    case 'transport_facilities_info':
      return "## 🚌 பேருந்து மற்றும் போக்குவரத்து வசதிகள்\n\nதிருநெல்வேலி, தூத்துக்குடி, கோவில்பட்டி, சாத்தூர், விருதுநகர் மற்றும் சுற்றியுள்ள பகுதியிலிருந்து மாணவர்களுக்காக 30-க்கும் மேற்பட்ட கல்லூரி பேருந்துகள் இயக்கப்படுகின்றன.";

    case 'fee_structures_info':
      return "## 💳 கல்விக் கட்டண விவரங்கள்\n\nதமிழ்நாடு அரசு TNEA மற்றும் அண்ணா பல்கலைக்கழக விதிமுறைகளின்படி கல்விக் கட்டணம் வசூலிக்கப்படுகிறது. கூடுதல் விவரங்களுக்கு கல்லூரி அலுவலகத்தை தொடர்பு கொள்ளவும்.";

    case 'rules_regulations_info':
      return "## 📜 கல்லூரி ஒழுங்கு விதிகள்\n\n- **வருகைப்பதிவு**: குறைந்தபட்சம் 75% வருகைப்பதிவு கட்டாயமாகும்.\n- **சீருடை**: நிர்ணயிக்கப்பட்ட சீருடை மற்றும் அடையாள அட்டை அணிய வேண்டும்.\n- **ஒழுக்கம்**: வளாகத்திற்குள் செல்போன் பயன்பாடு மற்றும் ஒழுங்கீனம் தடைசெய்யப்பட்டுள்ளது.";

    case 'founder_info':
      return "## 🏛️ NEC நிறுவன வரலாறு\n\nதேசிய பொறியியல் கல்லூரி 1984-ஆம் ஆண்டு 'கல்வித்தந்தை' **திரு. K. இராமசாமி** அவர்களால் நிறுவப்பட்டது. கிராமப்புற மாணவர்களுக்கு தரமான தொழில்நுட்பக் கல்வியை வழங்குவதே இதன் முக்கிய நோக்கமாகும்.";

    case 'infrastructure_info':
      return "## 🏢 வளாகம் & உள்கட்டமைப்பு\n\n300 ஏக்கர் பரப்பளவில் அமைந்துள்ள NEC வளாகத்தில் நவீன கணினி ஆய்வகங்கள், அதிநவீன ஸ்மார்ட் வகுப்பறைகள், 1000+ இருக்கைகள் கொண்ட கலையரங்கம் மற்றும் அதிவேக வைஃபை வசதிகள் உள்ளன.";

    case 'events_info':
      return "## ⚡ விழாக்கள் & ஹேக்கத்தான்கள்\n\nNEC-யில் வருடாந்திர தேசிய அளவிலான **TECHFEST**, பன்னாட்டு கருத்தரங்குகள், மாநில அளவிலான ஹேக்கத்தான்கள் மற்றும் கலாச்சார விழாக்கள் விமரிசையாக நடத்தப்படுகின்றன.";

    case 'courses_offered_info':
    case 'departments_list_info':
      return "## 🎓 வழங்கப்படும் பாடப்பிரிவுகள் & துறைகள்\n\n- **B.E / B.Tech துறைகள்**:\n  1. கணினி அறிவியல் (CSE)\n  2. தகவல் தொழில்நுட்பம் (IT)\n  3. செயற்கை நுண்ணறிவு & தரவு அறிவியல் (AI & DS)\n  4. மின்னணுவியல் & தொடர்பியல் (ECE)\n  5. மின் மற்றும் மின்னணுவியல் (EEE)\n  6. இயந்திரவியல் (Mechanical)\n  7. சிவில் பொறியியல் (Civil)\n\n- **M.E / M.Tech படிப்புகள்** மற்றும் Ph.D ஆராய்ச்சி மையங்களும் இயங்குகின்றன.";

    case 'cse_dept_info':
    case 'cse_department_info':
      return "## 💻 கணினி அறிவியல் மற்றும் பொறியியல் துறை (CSE)\n\nNEC கணினி அறிவியல் துறை (CSE) அதிநவீன கணினி ஆய்வகங்கள், AI & Cloud Computing சிறப்பம்சங்கள் மற்றும் சிறந்த பேராசிரியர்களைக் கொண்டுள்ளது. இத்துறை மாணவர்கள் Zoho, TCS, Accenture போன்ற முன்னணி நிறுவனங்களில் அதிக வேலைவாய்ப்பைப் பெறுகின்றனர்.";

    case 'it_dept_info':
    case 'it_department_info':
      return "## 🌐 தகவல் தொழில்நுட்பவியல் துறை (IT)\n\nதகவல் தொழில்நுட்பவியல் துறை (IT) மென்பொருள் மேம்பாடு, இணைய பாதுகாப்பு (Cybersecurity) மற்றும் தரவு அறிவியல் (Data Science) துறைகளில் மாணவர்களை தயார்படுத்துகிறது.";

    case 'mech_dept_info':
    case 'mech_department_info':
      return "## ⚙️ இயந்திரவியல் துறை (Mechanical Engineering)\n\nஇயந்திரவியல் துறை CAD/CAM ஆய்வகங்கள், 3D பிரிண்டிங் மற்றும் ரோபோடிக்ஸ் மையங்களுடன் இயங்குகிறது.";

    case 'civil_dept_info':
    case 'civil_department_info':
      return "## 🏗️ சிவில் பொறியியல் துறை (Civil Engineering)\n\nசிவில் பொறியியல் துறை நவீன நில அளவை (Surveying) மற்றும் கட்டமைப்பு பரிசோதனை ஆய்வகங்களைக் கொண்டுள்ளது.";

    case 'academics_info':
      return "## 📚 கல்வி & பாடத்திட்டம் (Academics)\n\nNEC ஒரு தன்னாட்சி (Autonomous) நிறுவனம் ஆகும். தொழில்முனைவோர் மற்றும் தொழில் துறை தேவைகளுக்கேற்ப புதுப்பிக்கப்பட்ட பாடத்திட்டம் (Choice Based Credit System - CBCS) பின்பற்றப்படுகிறது.";

    case 'research_info':
      return "## 🔬 ஆராய்ச்சி & புதுமை (Research & Innovation)\n\nNEC கல்லூரியில் அண்ணா பல்கலைக்கழகத்தால் அங்கீகரிக்கப்பட்ட ஆராய்ச்சி மையங்கள் உள்ளன. பேராசிரியர்கள் மற்றும் மாணவர்கள் பல காப்புரிமைகள் (Patents) மற்றும் பன்னாட்டு ஆய்வேடுகளை சமர்ப்பித்துள்ளனர்.";

    case 'campus_life_info':
      return "## 🌟 வளாக வாழ்க்கை & மாணவர் மன்றங்கள்\n\n- **மன்றங்கள்**: CSI, IEEE, ISTE, Fine Arts Club, Rotaract Club, Yoga Club.\n- **விளையாட்டு**: துப்பாக்கி சுடுதல் (Rifle Club), கூடைப்பந்து, கால்பந்து, உடற்பயிற்சிகூடம் (Gym).\n- **தேசிய சேவை**: NCC மற்றும் NSS பிரிவுகள் இயங்குகின்றன.";

    case 'placement_highlights_static_info':
      return "## 🚀 வேலைவாய்ப்பு சிறப்பம்சங்கள் (Placement Highlights)\n\n- **ஒட்டுமொத்த வேலைவாய்ப்பு**: 90%+ தகுதியான மாணவர்கள் வேலைவாய்ப்பு பெறுகின்றனர்.\n- **உயர்ந்த சம்பள பேக்கேஜ்**: ரூ. 15+ LPA\n- **முக்கிய நிறுவனங்கள்**: Zoho, TCS, Cognizant, Accenture, Wipro, Infosys, Mistral, etc.";

    case 'companies_inside_college_info':
      return "## 🏢 கல்லூரி வளாகத்தில் உள்ள நிறுவனங்கள் (Technobation Centers)\n\nNEC வளாகத்தில் மாணவர்கள் படிக்கும்போதே நேரடி தொழில் அனுபவம் பெற பல தொழில் நுட்ப மையங்கள் செயல்படுகின்றன:\n- **Mistral Solutions**\n- **Brimma Tech**\n- **Vlinder Labs**\n- **TryCAE**";

    case 'admission_info':
    case 'admissions_info':
      return "## 📝 சேர்க்கை விவரங்கள்\n\n- **அரசு ஒதுக்கீடு**: TNEA கலந்தாய்வு மூலம் சேர்க்கை (Code: 4962).\n- **நிர்வாக ஒதுக்கீடு**: +2 மதிப்பெண்கள் மற்றும் தகுதியின் அடிப்படையில் சேர்க்கை.";

    case 'location_info':
    case 'how_to_reach_info':
      return "## 📍 கல்லூரி முகவரி & அமைவிடம்\n\nதேசிய பொறியியல் கல்லூரி (தன்னாட்சி),\nK.R. நகர், கோவில்பட்டி - 628 503,\nதூத்துக்குடி மாவட்டம், தமிழ்நாடு.\n(NH-44 தேசிய நெடுஞ்சாலை அருகில் அமைந்துள்ளது).";

    case 'contact_info':
      return "## 📞 தொடர்பு விவரங்கள்\n\n- **தொலைபேசி**: 04632 - 222502 / 230227\n- **மின்னஞ்சல்**: principal@nec.edu.in\n- **இணையதளம்**: www.nec.edu.in";

    case 'leadership_info':
      return "## 🏛️ கல்லூரி நிர்வாக தலைவர்கள்\n\n- **நிறுவனர்**: 'கல்வித்தந்தை' திரு. K. இராமசாமி\n- **தாளாளர்**: திரு. K.R. அருணாசலம்\n- **இயக்குனர்**: முனைவர் S. சண்முகவேல்\n- **முதல்வர்**: முனைவர் K. காளிதாச முருகவேல்";

    case 'vision_mission_info':
    case 'vision_info':
    case 'mission_info':
      return "## 🎯 தொலைநோக்கு & லட்சியம் (Vision & Mission)\n\n- **தொலைநோக்கு (Vision)**: மனித மதிப்புகளுடன் கூடிய தரமான கல்வி மற்றும் ஆராய்ச்சி மூலம் வாழ்க்கையை மாற்றுதல்.\n- **லட்சியம் (Mission)**: சிறந்த உள்கட்டமைப்பு, தகுதியான பேராசிரியர்கள், சமூக அர்ப்பணிப்பு மற்றும் கூட்டு ஆராய்ச்சியை வழங்குதல்.";

    case 'default_fallback':
    default:
      if (replyText) {
        return translateMarkdownHeadings(replyText);
      }
      return "மன்னிக்கவும், உங்கள் கேள்வி எனக்கு முழுமையாக புரியவில்லை. தயவுசெய்து வேலைவாய்ப்பு, உள்கட்டமைப்பு, விடுதி அல்லது படிப்புகள் பற்றி மீண்டும் கேட்கவும்.";
  }
}
