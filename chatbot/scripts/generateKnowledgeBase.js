import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawKnowledgeBase = {
  "greeting": {
    "title": "Greetings",
    "keywords": [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good evening",
      "greetings",
      "vanakkam",
      "vanakam"
    ],
    "tamilKeywords": [
      "வணக்கம்",
      "ஹலோ",
      "வணக்கம் பா",
      "ஹாய்"
    ],
    "content": "Hello! 👋 Welcome to the National Engineering College (NEC) Assistant. I am your 24/7 intelligent campus guide. Ask me any question about admissions, departments, courses, placements, hostel, library, transport, fees, and more!",
    "tamilContent": "வணக்கம்! 👋\nநான் NEC Assistant. NEC-ன் சேர்க்கை, துறைகள், படிப்புகள், வேலைவாய்ப்பு (Placement), விடுதி (Hostel), நூலகம் (Library), பேருந்து (Transport), கட்டணம் (Fees) மற்றும் பிற தகவல்களை என்னால் வழங்க முடியும். உங்களுக்கு எப்படி உதவட்டும்?"
  },
  "bot_identity": {
    "title": "About NEC Assistant",
    "keywords": [
      "who are you",
      "what you do",
      "what do you do",
      "what can you do",
      "who r u",
      "who are u",
      "about yourself",
      "introduce yourself",
      "how can you help",
      "your purpose",
      "what is your role",
      "what is your name",
      "bot info"
    ],
    "tamilKeywords": [
      "நீ யாரு",
      "யார் நீ",
      "உன் பெயர் என்ன",
      "நீ என்ன செய்வாய்",
      "உன்னை பற்றி சொல்லு",
      "நீ யாருன்னு சொல்லு",
      "பாட் யாரு",
      "பாட் இன்ஃபோ",
      "போட் இன்ஃபோ",
      "போட் யாரு",
      "பாட் பெயர் என்ன",
      "உன் நேம் என்ன",
      "போட் நேம் என்ன",
      "nee yaaru",
      "yaaru nee",
      "un peru enna",
      "un name enna",
      "who is this bot"
    ],
    "content": "Hello! I am the **NEC Assistant**, the virtual AI helper for National Engineering College (NEC), Kovilpatti. 👋\n\n**Here is what I can do for you:**\n- **College Details**: Learn about NEC's history, founder (Kalvithanthai Thiru. K. Ramasamy), leadership, vision & mission, and NIRF rankings.\n- **Admissions & Eligibility**: Get info on TNEA counselling procedures, required certificates, cutoff marks, and fee structures.\n- **Departments & Courses**: Explore details, syllabi, laboratories, and faculties for CSE, IT, ECE, EEE, Mechanical, Civil, and AI&DS.\n- **Placements & Packages**: Check batch placement statistics, highest and average packages, visiting companies, upcoming placement drives, and student interview experiences.\n- **Campus Life & Facilities**: Find details about hostels, the central library, canteens, bus transport routes, rules & regulations, and Technobation/incubation centers.\n\nFeel free to ask me any question about NEC!",
    "tamilContent": "வணக்கம்! நான் **நேஷனல் பொறியியல் கல்லூரியின் (NEC)** அதிகாரப்பூர்வ AI உதவியாளர். 👋\n\n**நான் உங்களுக்கு வழங்கக்கூடிய தகவல்கள்:**\n- **கல்லூரி விவரங்கள்**: NEC வரலாறு, நிறுவனர் 'கல்வித்தந்தை' திரு. K. இராமசாமி அவர்கள், தலைமைப் பொறுப்பாளர்கள், NIRF தரவரிசை.\n- **சேர்க்கை & தகுதிகள்**: TNEA கலந்தாய்வு முறைகள், தேவையான சான்றிதழ்கள், கட்ஆஃப் மதிப்பெண்கள், கல்விக் கட்டண விவரங்கள்.\n- **துறைகள் & படிப்புகள்**: CSE, IT, ECE, EEE, Mechanical, Civil, AI&DS ஆகிய துறைகளின் விவரங்கள், பாடத்திட்டம் மற்றும் ஆய்வகங்கள்.\n- **வேலைவாய்ப்பு (Placement)**: வேலைவாய்ப்பு புள்ளிவிவரங்கள், அதிகபட்ச & சராசரி சம்பளம், நிறுவனங்கள் மற்றும் நேர்முகத்தேர்வு அனுபவங்கள்.\n- **வளாக வசதிகள்**: விடுதி (Hostel), நூலகம் (Library), உணவகம் (Canteen), பேருந்து வழிகள் மற்றும் ஸ்டார்ட்அப் மையங்கள்."
  },
  "general_info": {
    "title": "About National Engineering College (NEC)",
    "keywords": [
      "about nec",
      "nec history",
      "nec college",
      "about college",
      "history of nec",
      "when established",
      "nec establishment",
      "college start",
      "nec autonomous",
      "affiliation nec",
      "about national engineering college",
      "about",
      "nec",
      "college",
      "history",
      "established",
      "establishment",
      "start",
      "started",
      "autonomous",
      "affiliation",
      "university",
      "home",
      "home page",
      "main page"
    ],
    "tamilKeywords": [
      "கல்லூரி பற்றி",
      "தேசிய பொறியியல் கல்லூரி",
      "நேஷனல் பொறியியல் கல்லூரி",
      "nec பற்றி",
      "வரலாறு",
      "எப்போது தொடங்கப்பட்டது",
      "கல்லூரி எப்போது ஆரம்பிச்சாங்க",
      "காலேஜ் பற்றி",
      "காலேஜ் ஹிஸ்டரி",
      "என்இசி பற்றி",
      "காலேஜ் எப்படிப்பட்டது",
      "என்இசி காலேஜ் பற்றி",
      "nec pathi sollunga",
      "college pathi",
      "nec history",
      "nec epdiப்பட்ட college"
    ],
    "content": "National Engineering College (NEC) is a premier autonomous institution established in 1984. It is affiliated with Anna University, Chennai. The college was established under the self-financing scheme sanctioned by the Government of Tamilnadu (G.O. No. 939 dated 20.07.1984) by the National Educational and Charitable Trust, Kovilpatti, Thoothukudi district. It is ranked #169 in the National Institutional Ranking Framework (NIRF) 2022 and has state-of-the-art infrastructure, laboratories, and partnerships with leading industries. TNEA counselling code for NEC is 4962.",
    "tamilContent": "நேஷனல் பொறியியல் கல்லூரி (NEC) 1984-ஆம் ஆண்டு 'கல்வித்தந்தை' திரு. K. இராமசாமி அவர்கள் தொடங்கப்பட்ட ஒரு தன்னாட்சி (Autonomous) நிறுவனமாகும். இது சென்னை அண்ணா பல்கலைக்கழகத்துடன் இணைக்கப்பட்டுள்ளது. தூத்துக்குடி மாவட்டம், கோவில்பட்டி அருகே K.R. நகரில் 300 ஏக்கர் பரப்பளவில் அமைந்துள்ளது. மத்திய அரசின் NIRF தரவரிசையில் 169-வது இடத்தில் உள்ளது. NEC கல்லூரியின் TNEA கலந்தாய்வு குறியீடு (Code): **4962**."
  },
  "founder": {
    "title": "Founder of NEC",
    "keywords": [
      "founder",
      "ramasamy",
      "kalvithanthai",
      "who founded",
      "who is founder",
      "who is the founder",
      "who is the founder of nec",
      "founder of nec",
      "nec founder",
      "founder name",
      "establish"
    ],
    "tamilKeywords": [
      "நிறுவனர்",
      "யார் தொடங்கியவர்",
      "நிறுவியவர்",
      "இராமசாமி",
      "கல்வித்தந்தை",
      "நிறுவனர் யார்",
      "நிறுவனர் யாரு",
      "நிறுவியவர் யார்",
      "பவுண்டர் யார்",
      "பவுண்டர் யாரு",
      "என்இசி பவுண்டர் யார்",
      "என்இசி பவுண்டர் யாரு",
      "ராமசாமி யாரு",
      "founder yaaru",
      "who is founder",
      "nec founder yaaru",
      "ramasamy yaaru",
      "nec founder"
    ],
    "content": "NEC was founded by the visionary philanthropist Kalvithanthai Thiru. K. Ramasamy in 1984. By wielding the magical wand of social commitment and munificence, he transformed a strip of barren land in Kovilpatti into a magnificent academic complex to produce high-competence engineers and uplift the rural student community.",
    "tamilContent": "நேஷனல் பொறியியல் கல்லூரி 1984-ஆம் ஆண்டு 'கல்வித்தந்தை' **திரு. K. இராமசாமி அவர்கள்** அவர்களால் நிறுவப்பட்டது. கிராமப்புற மாணவர்களுக்கு தரமான தொழில்நுட்பக் கல்வியை வழங்கி சிறந்த பொறியாளர்களாக உருவாக்குவதே அவர்களின் முதன்மை லட்சியமாகும்."
  },
  "leadership": {
    "title": "College Leadership",
    "keywords": [
      "leadership",
      "correspondent",
      "director",
      "principal",
      "who is principal",
      "who is the principal",
      "who is principal of nec",
      "who is the principal of nec",
      "principal of nec",
      "nec principal",
      "principal name",
      "principal details",
      "who is director",
      "who is the director",
      "director of nec",
      "nec director",
      "director name",
      "who is correspondent",
      "who is the correspondent",
      "correspondent of nec",
      "nec correspondent",
      "correspondent name",
      "head of college",
      "college principal",
      "college director",
      "college correspondent",
      "head",
      "administration",
      "officials",
      "arunachalam",
      "shanmugavel",
      "murugavel",
      "kalidasa murugavel"
    ],
    "tamilKeywords": [
      "நிர்வாகம்",
      "முதல்வர்",
      "இயக்குனர்",
      "தாளாளர்",
      "தலைவர்கள்",
      "முதல்வர் யார்",
      "முதல்வர் யாரு",
      "பிரின்சிபல் யார்",
      "பிரின்சிபால் யார்",
      "பிரின்சிபல் யாரு",
      "டைரக்டர் யார்",
      "டிரக்டர் யார்",
      "டிரெக்டர் யார்",
      "டைரக்டர் யாரு",
      "கரெஸ்பாண்டன்ட் யார்",
      "கரெஸ்பாண்டன்ட் யாரு",
      "என்இசி பிரின்சிபல் யார்",
      "என்இசி டைரக்டர் யார்",
      "principal yaaru",
      "director yaaru",
      "முனைவர்",
      "correspondent yaaru",
      "nec principal",
      "nec director"
    ],
    "content": "The key administrative leaders of National Engineering College are:\n- **Founder**: Thiru. K. Ramasamy\n- **Correspondent**: Thiru. K.R. Arunachalam\n- **Director**: Dr. S. Shanmugavel\n- **Principal**: Dr. K. Kalidasa Murugavel",
    "tamilContent": "நேஷனல் பொறியியல் கல்லூரியின் முக்கிய நிர்வாக தலைவர்கள்:\n- **நிறுவனர்**: 'கல்வித்தந்தை' திரு. K. இராமசாமி அவர்கள்\n- **தாளாளர் (Correspondent)**: திரு. K.R. அருணாசலம் அவர்கள்\n- **இயக்குனர் (Director)**: முனைவர் S. சண்முகவேல் அவர்கள்\n- **முதல்வர் (Principal)**: முனைவர் K. காளிதாச முருகவேல் அவர்கள்"
  },
  "vision": {
    "title": "Vision of NEC",
    "keywords": [
      "vision",
      "goal",
      "aim",
      "nec vision",
      "nec goal",
      "nec aim"
    ],
    "tamilKeywords": [
      "தொலைநோக்கு",
      "நோக்கம்",
      "விஷன் என்ன",
      "விசன் என்ன",
      "என்இசி விஷன் என்ன",
      "vision enna",
      "nec vision enna"
    ],
    "content": "NEC's Vision is: \"Transforming lives through quality education and research with human values.\" (Also described as: To be a globally recognized institution that fosters academic excellence, innovation, and ethical leadership, empowering students to create a sustainable future.)",
    "tamilContent": "NEC கல்லூரியின் தொலைநோக்கு (Vision):\n\"மனித மதிப்புகளுடன் கூடிய தரமான கல்வி மற்றும் ஆராய்ச்சி மூலம் மாணவர்களின் வாழ்க்கையை உயர்த்துதல்.\""
  },
  "mission": {
    "title": "Mission of NEC",
    "keywords": [
      "mission",
      "objectives",
      "nec mission",
      "nec objective"
    ],
    "tamilKeywords": [
      "லட்சியம்",
      "குறிக்கோள்",
      "மிஷன் என்ன",
      "மிசன் என்ன",
      "என்இசி மிஷன் என்ன",
      "mission enna",
      "nec mission enna",
      "nec objectives enna"
    ],
    "content": "NEC's Mission includes:\n1. To maintain excellent infrastructure and highly qualified and dedicated faculty.\n2. To provide a conducive environment with an ambiance of humanity, wisdom, creativity, and team spirit.\n3. To promote the values of ethical behavior and commitment to society.\n4. To partner with academic, industrial, and government entities to attain collaborative research.",
    "tamilContent": "NEC கல்லூரியின் லட்சியம் (Mission):\n1. சிறந்த உள்கட்டமைப்பு மற்றும் தகுதியான பேராசிரியர்களை பராமரித்தல்.\n2. மாணவர்களிடையே படைப்பாற்றல், மனிதநேயம் மற்றும் குழு மனப்பான்மையை வளர்த்தல்.\n3. சமூக அர்ப்பணிப்பு மற்றும் ஒழுக்க நெறிகளை ஊக்குவித்தல்.\n4. தொழில் நிறுவனங்கள் மற்றும் அரசுடன் இணைந்து கூட்டு ஆராய்ச்சி செய்தல்."
  },
  "admissions": {
    "title": "Admission Process and Eligibility",
    "keywords": [
      "admission",
      "apply",
      "documents",
      "tnea",
      "apply now",
      "procedure"
    ],
    "tamilKeywords": [
      "சேர்க்கை",
      "சேர்க்கை எப்படி",
      "விண்ணப்பிப்பது எப்படி",
      "சான்றிதழ்கள்",
      "அட்மிஷன் எப்படி",
      "அட்மிஷன் எப்படின்னு சொல்லுங்க",
      "அட்மிஷன் எப்போது",
      "அட்மிஷன் டாக்குமெண்ட்ஸ்",
      "காலேஜ் அட்மிஷன் எப்படி",
      "டாக்குமெண்ட்ஸ் வேணும்",
      "admission epdi",
      "admission eppadi",
      "college admission epdi",
      "nec admission epdi",
      "admissionaepdi apply pannanum",
      "documents venum"
    ],
    "content": "Admissions to NEC are conducted via TNEA (Tamil Nadu Engineering Admissions) guidelines. Documents required at the time of admission include:\n1. TNEA Provisional allotment order (color printed)\n2. 10th Marksheet\n3. 12th Marksheet\n4. Transfer Certificate (TC) and conduct certificate from last studied institution\n5. Community Certificate (for BC/MBC/SC/ST/SCA candidates)\n6. Income Certificate (for possible scholarship)\n7. Nativity Certificate (if applicable)\n8. Bank account passbook photocopy\n\nFor **First Graduate Students**, the following additional documents are required:\n1. First Graduate Certificate (Maximum 7 family members entry in U-card and Joint declaration)\n2. Sibling Bonafide Certificate (if sibling is studying and hasn't availed the concession).",
    "tamilContent": "NEC கல்லூரியில் சேர்க்கை TNEA (தமிழ்நாடு பொறியியல் சேர்க்கை) வழிகாட்டுதல்களின்படி நடைபெறுகிறது.\n\n**தேவையான சான்றிதழ்கள்**:\n1. TNEA சேர்க்கை ஒதுக்கீட்டு ஆணை (Provisional Allotment Order)\n2. 10-ஆம் வகுப்பு & 12-ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்கள்\n3. மாற்றுச் சான்றிதழ் (TC) & நற்சான்றிதழ்\n4. சாதிச் சான்றிதழ் (Community Certificate)\n5. வருமானச் சான்றிதழ் (Income Certificate)\n6. இருப்பிடச் சான்றிதழ் (Nativity Certificate)\n7. வங்கி கணக்கு புத்தக நகல்\n\n**முதல் பட்டதாரி (First Graduate)** மாணவர்களுக்கு முதல் பட்டதாரி சான்றிதழ் மற்றும் கூட்டு உறுதிமொழி படிவம் தேவை."
  },
  "counselling_code": {
    "title": "Counselling Code",
    "keywords": [
      "counselling_code",
      "code",
      "tnea code",
      "counselling code"
    ],
    "tamilKeywords": [
      "கலந்தாய்வு குறியீடு",
      "கவுன்சிலிங் கோட்",
      "tnea கோட்",
      "கவுன்சிலிங் கோட் என்ன",
      "டிஎன்இஏ கோட் என்ன",
      "என்இசி கவுன்சிலிங் கோட்",
      "counselling code enna",
      "tnea code enna",
      "nec counselling code enna"
    ],
    "content": "National Engineering College (NEC) is assigned the counselling code **4962** for the Tamil Nadu Engineering Admissions (TNEA) process.",
    "tamilContent": "தமிழ்நாடு பொறியியல் சேர்க்கை (TNEA) கலந்தாய்வில் நேஷனல் பொறியியல் கல்லூரியின் (NEC) கவுன்சிலிங் கோட்: **4962**."
  },
  "eligibility_criteria": {
    "title": "Eligibility Criteria for Admission",
    "keywords": [
      "eligibility",
      "criteria",
      "eligibility criteria",
      "admission eligibility",
      "cutoff",
      "cutoff marks",
      "tnea cutoff",
      "minimum cutoff",
      "required cutoff"
    ],
    "tamilKeywords": [
      "தகுதி",
      "கட்ஆஃப்",
      "கட் ஆஃப் மதிப்பெண்",
      "சேர்க்கை தகுதி",
      "கட்ஆஃப் எவ்வளவு",
      "கட்ஆஃப் எவ்வளோ",
      "கட்ஆஃப் மார்க்ஸ் என்ன",
      "சிஎஸ்இ கட்ஆஃப் எவ்வளவு",
      "எலிஜிபிலிட்டி என்ன",
      "cutoff evlo",
      "cutoff marks enna",
      "cse cutoff evlo",
      "aids cutoff evlo",
      "it cutoff evlo",
      "ece cutoff evlo",
      "eee cutoff evlo",
      "mech cutoff evlo",
      "civil cutoff evlo",
      "eligibility enna"
    ],
    "content": "Admission to National Engineering College (NEC) is based on the Tamil Nadu Engineering Admissions (TNEA) counselling process. Eligibility depends on the candidate's TNEA cutoff mark, preferred branch, and community category. The previous year's cutoff marks are as follows: \nArtificial Intelligence and Data Science – OC: 183.5, BC: 179.5, BCM: 182.0, MBC: 175.5, SC: 146.5, SCA: 150.5. \nComputer Science and Engineering – OC: 188.0, BC: 181.5, BCM: 183.5, MBC: 180.5, SC: 156.5, SCA: 162.5. \nInformation Technology – OC: 184.0, BC: 180.0, BCM: 183.0, MBC: 174.5, SC: 149.5, SCA: 144.0. \nElectronics and Communication Engineering – OC: 185.0, BC: 179.0, BCM: 184.5, MBC: 173.0, SC: 144.5, SCA: 95.0, ST: 127.0. \nElectrical and Electronics Engineering – OC: 178.5, BC: 175.5, BCM: 175.5, MBC: 168.0, SC: 141.0. \nCivil Engineering – OC: 169.0, BC: 152.5, BCM: 158.5, MBC: 145.5, SC: 115.0. \nMechanical Engineering – OC: 172.0, BC: 163.0, MBC: 147.0, SC: 104.5, SCA: 93.0. \nThese cutoff marks are for reference only and may vary every year depending on TNEA counselling, seat availability, reservation category, and the number of applicants.",
    "tamilContent": "NEC கல்லூரியில் சேர்க்கை TNEA கட்ஆஃப் மதிப்பெண்கள் மற்றும் சாதிப் பிரிவு அடிப்படையில் வழங்கப்படுகிறது.\n\n**முந்தைய ஆண்டு கட்ஆஃப் மதிப்பெண்கள் (மாதிரி)**:\n- **CSE**: OC: 188.0, BC: 181.5, MBC: 180.5, SC: 156.5\n- **ECE**: OC: 185.0, BC: 179.0, MBC: 173.0, SC: 144.5\n- **IT**: OC: 184.0, BC: 180.0, MBC: 174.5, SC: 149.5\n- **AI & DS**: OC: 183.5, BC: 179.5, MBC: 175.5, SC: 146.5\n- **EEE**: OC: 178.5, BC: 175.5, MBC: 168.0, SC: 141.0\n- **Mechanical**: OC: 172.0, BC: 163.0, MBC: 147.0, SC: 104.5\n- **Civil**: OC: 169.0, BC: 152.5, MBC: 145.5, SC: 115.0"
  },
  "how_to_reach": {
    "title": "Location and Directions",
    "keywords": [
      "location",
      "reach",
      "address",
      "map",
      "directions",
      "where",
      "kovilpatti",
      "thoothukudi",
      "distance",
      "city",
      "cities",
      "where is nec"
    ],
    "tamilKeywords": [
      "இடம்",
      "முகவரி",
      "எங்கே",
      "எங்கு",
      "கல்லூரி எங்கே",
      "கல்லூரி எங்கு",
      "வருவது எப்படி",
      "செல்வது எப்படி",
      "அமைவிடம்",
      "காலேஜ் எங்கே இருக்கு",
      "காலேஜ் எங்க இருக்கு",
      "என்இசி எங்கே இருக்கு",
      "என்இசி எங்க இருக்கு",
      "அட்ரஸ் என்ன",
      "லொகேஷன் என்ன",
      "எப்படி போகணும்",
      "enga",
      "engae",
      "college enga",
      "nec enga",
      "nec enga irukku",
      "address enna",
      "location enna",
      "epdi poganum"
    ],
    "content": "National Engineering College is located at K.R. Nagar, Kovilpatti, Thoothukudi District, Tamil Nadu - 628503. \n\n**Nearby Cities and Distances**:\n- Kovilpatti (Institutional Town)\n- Tirunelveli: 60 km (37 mi)\n- Thoothukudi: 60 km (37 mi)\n- Madurai: 100 km (62 mi)\n- Kanyakumari: 110 km (68 mi)\n\nGoogle Maps Location: [How to reach NEC](https://maps.app.goo.gl/RkRkUvH3YANpi2BD6).",
    "tamilContent": "நேஷனல் பொறியியல் கல்லூரி (தன்னாட்சி),\nK.R. நகர், கோவில்பட்டி - 628 503,\nதூத்துக்குடி மாவட்டம், தமிழ்நாடு.\n(NH-44 தேசிய நெடுஞ்சாலை அருகில் அமைந்துள்ளது).\n\n**அருகிலுள்ள நகரங்கள் & தொலைவு**:\n- திருநெல்வேலி: 60 கி.மீ\n- தூத்துக்குடி: 60 கி.மீ\n- மதுரை: 100 கி.மீ\n- கன்னியாகுமரி: 110 கி.மீ \n\nGoogle Maps Location: [How to reach NEC](https://maps.app.goo.gl/RkRkUvH3YANpi2BD6)."
  },
  "cse_department": {
    "title": "Department of Computer Science and Engineering (CSE)",
    "keywords": [
      "cse",
      "computer science",
      "laboratories",
      "labs",
      "courses",
      "programs",
      "strength",
      "hod cse",
      "gomathi",
      "accreditation",
      "nba"
    ],
    "tamilKeywords": [
      "கணினி அறிவியல்",
      "சிஎஸ்இ",
      "cse துறை",
      "கோமதி",
      "சிஎஸ்இ எச்ஓடி யார்",
      "சிஎஸ்இ எச்ஓடி யாரு",
      "சிஎஸ்இ hod யார்",
      "சிஎஸ்இ டிபார்ட்மென்ட் எங்கே",
      "சிஎஸ்இ டிபார்ட்மென்ட் எங்க",
      "சிஎஸ்இ விவரங்கள்",
      "cse hod yaaru",
      "cse department enga",
      "cse pathi sollu",
      "cse hod name enna"
    ],
    "content": "The Department of Computer Science and Engineering was established in 1984. It is accredited by NBA, New Delhi, since 2006.\n\n- **HOD**: Dr. V. Gomathi, M.Tech, Ph.D. (Professor & Head)\n- **Email**: hodcse@nec.edu.in\n- **Phone**: 9442522764, 8428884480\n\n**Academic Programmes Offered**:\n- **UG - B.E. CSE**: Established in 1984. (Total strength: 400)\n- **PG - M.E. CSE**: Established in 2002. (Total strength: 9)\n- **Ph.D. Research Centre**: Established in 2006. (3 full-time scholars, 10 part-time scholars, 40 Ph.Ds awarded)\n\n**Infrastructure & Laboratories**:\n- Well-equipped laboratories including an Image Processing research center, NVIDIA DLI labs, and in-house incubation centers.\n- Department library with over 1000 books.\n- 24/7 Wi-Fi and ICT-enabled smart classrooms.",
    "tamilContent": "## 💻 கணினி அறிவியல் மற்றும் பொறியியல் துறை (CSE)\n\nCSE துறை 1984-ஆம் ஆண்டு தொடங்கப்பட்டது. புதுடெல்லி NBA அமைப்பால் அங்கீகரிக்கப்பட்டது.\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் V. கோமதி அவர்கள், M.Tech, Ph.D.\n- **மின்னஞ்சல்**: hodcse@nec.edu.in\n- **தொலைபேசி**: 9442522764, 8428884480\n\n**வழங்கப்படும் படிப்புகள்**:\n- **B.E. CSE** (தொடங்கிய ஆண்டு: 1984)\n- **M.E. CSE** (தொடங்கிய ஆண்டு: 2002)\n- **Ph.D ஆராய்ச்சி மையம்** (தொடங்கிய ஆண்டு: 2006)\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- NVIDIA DLI ஆய்வகம், இமேஜ் પ્રોસેசிங் ஆராய்ச்சி மையம், 24/7 வைஃபை மற்றும் ஸ்மார்ட் வகுப்பறைகள் உள்ளன."
  },
  "it_department": {
    "title": "Department of Information Technology (IT)",
    "keywords": [
      "it",
      "information technology",
      "labs",
      "hod it",
      "Muthukkumar",
      "courses",
      "programs"
    ],
    "tamilKeywords": [
      "தகவல் தொழில் நுட்பம்",
      "ஐடி துறை",
      "it hod yaaru",
      "முத்துக்குமார்",
      "ஐடி எச்ஓடி யார்",
      "ஐடி எச்ஓடி யாரு",
      "ஐடி hod யார்",
      "ஐடி டிபார்ட்மென்ட் எங்கே",
      "ஐடி டிபார்ட்மென்ட் விவரங்கள்",
      "it hod yaaru",
      "it department pathi sollu"
    ],
    "content": "The Department of Information Technology offers high-quality engineering instruction.\n\n- **HOD**: Dr. R. Muthukkumar, M.Tech, Ph.D. (Professor & Head)\n- **Email**: hodit@nec.edu.in\n- **Phone**: Refer to public directories\n\n**Key Facilities & Labs**:\n- UG Lab I (Boolean Lab)\n- UG Lab II (S. Ramanujan Lab)\n- UG Lab III\n- PG Lab\n- Seminar Hall\n- Technobation Centre and Incubation Centre\n- Focuses on logical reasoning, application development, and industrial project practices.",
    "tamilContent": "## 🌐 தகவல் தொழில்நுட்பவியல் துறை (IT)\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் R. முத்துகுமார் அவர்கள், M.Tech, Ph.D.\n- **மின்னஞ்சல்**: hodit@nec.edu.in\n\n**முக்கிய ஆய்வகங்கள் & வசதிகள்**:\n- பூலியன் ஆய்வகம் (UG Lab I)\n- இராமானுஜன் ஆய்வகம் (UG Lab II)\n- டெக்னோபேஷன் மையம் & இன்குபேஷன் மையம்\n- மென்பொருள் மேம்பாடு, இணைய பாதுகாப்பு மற்றும் பயன்பாட்டு உருவாக்கத்தில் சிறப்பு கவனம் செலுத்தப்படுகிறது."
  },
  "mech_department": {
    "title": "Department of Mechanical Engineering (MECH)",
    "keywords": [
      "mech",
      "mechanical",
      "hod mech",
      "iyah raja",
      "dr iyah raja",
      "mechanical engineering",
      "labs",
      "courses",
      "programs",
      "strength"
    ],
    "tamilKeywords": [
      "இயந்திரவியல்",
      "மெக்கானிக்கல்",
      "mech hod yaaru",
      "ஐயா ராஜா",
      "மெக்கானிக்கல் எச்ஓடி யார்",
      "மெக்கானிக்கல் எச்ஓடி யாரு",
      "மெக் hod யார்",
      "மெக்கானிக்கல் டிபார்ட்மென்ட் எங்கே",
      "mech hod yaaru",
      "mechanical pathi sollu"
    ],
    "content": "The Department of Mechanical Engineering is established in the year 1984. The department has qualified and experienced faculty members with industrial and research backgrounds to achieve excellence in academic and research activities.\n\n- **HOD**: Dr Iyah Raja.S. (Professor & Head)\n- **Email**: hodmech@nec.edu.in\n\n**Academic Programmes Offered**:\n- **UG**: Year of Establishment – 1984, Student Strength – 60\n- **PG**: Year of Establishment – 2004, Student Strength – 6\n- **Ph.D**: Year of Establishment – 2006 (Scholars: Full-time – 2, Part-time – 10, Awarded – 35)\n\n**Infrastructure & Laboratories**:\n- Well-established design and thermal labs, machinery workshops, and CAD/CAM software centres.",
    "tamilContent": "## ⚙️ இயந்திரவியல் துறை (Mechanical Engineering)\n\nஇயந்திரவியல் துறை 1984-ஆம் ஆண்டு நிறுவப்பட்டது.\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் S. ஐயா ராஜா அவர்கள் (Professor & Head)\n- **மின்னஞ்சல்**: hodmech@nec.edu.in\n\n**வழங்கப்படும் படிப்புகள்**:\n- **B.E. Mechanical** (1984)\n- **M.E. Energy Engineering** (2004)\n- **Ph.D ஆராய்ச்சி மையம்** (2006)\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- CAD/CAM மென்பொருள் மையங்கள், 3D பிரிண்டிங் மற்றும் தெர்மல் ஆய்வகங்கள் செயல்படுகின்றன."
  },
  "civil_department": {
    "title": "Department of Civil Engineering (CIVIL)",
    "keywords": [
      "civil",
      "hod civil",
      "padmanaban",
      "dr i padmanaban",
      "civil engineering",
      "labs",
      "courses",
      "programs",
      "strength"
    ],
    "tamilKeywords": [
      "சிவில் துறை",
      "சிவில் பொறியியல்",
      "civil hod yaaru",
      "பத்மநாபன்",
      "சிவில் எச்ஓடி யார்",
      "சிவில் எச்ஓடி யாரு",
      "சிவில் hod யார்",
      "சிவில் டிபார்ட்மென்ட் எங்கே",
      "civil hod yaaru",
      "civil pathi sollu"
    ],
    "content": "The Civil Engineering Department started in the year 2012, offers B.E-Civil Engineering. The department has its own well-equipped state of art infrastructure.\n\n- **HOD**: Dr. I. Padmanaban (Professor & Head)\n- **Email**: Contact through the college administration\n\n**Academic Programmes Offered**:\n- **UG**: Establishment Year – 2012, Student Strength – 191\n\n**Infrastructure & Laboratories**:\n- Well-equipped surveying labs, concrete technology labs, and environmental engineering testing setups.",
    "tamilContent": "## 🏗️ சிவில் பொறியியல் துறை (Civil Engineering)\n\nசிவில் பொறியியல் துறை 2012-ஆம் ஆண்டு தொடங்கப்பட்டது.\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் I. பத்மநாபன் அவர்கள் (Professor & Head)\n- **படிப்புகள்**: B.E. Civil Engineering\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- நில அளவை ஆய்வகம் (Surveying Lab), கான்கிரீட் தொழில் நுட்ப ஆய்வகம் மற்றும் சுற்றுச்சூழல் பொறியியல் பரிசோதனை மையங்கள் உள்ளன."
  },
  "ece_department": {
    "title": "Department of Electronics and Communication Engineering (ECE)",
    "keywords": [
      "ece",
      "electronics and communication",
      "electronics",
      "communication",
      "hod ece",
      "tamil selvi",
      "labs",
      "laboratories",
      "courses",
      "programs"
    ],
    "tamilKeywords": [
      "மின்னணுவியல்",
      "ஈசிஈ",
      "ece துறை",
      "ece hod yaaru",
      "தமிழ் செல்வி",
      "ஈசிஈ எச்ஓடி யார்",
      "ஈசிஈ எச்ஓடி யாரு",
      "ஈசிஈ hod யார்",
      "ஈசிஈ டிபார்ட்மென்ட் எங்கே",
      "ece hod yaaru",
      "ece department pathi sollu"
    ],
    "content": "The Department of Electronics and Communication Engineering at NEC is a Tier-1 NBA accredited research centre.\n\n- **HOD**: Dr. S. Tamil Selvi (Professor & Head)\n- **Email**: hodece@nec.edu.in\n- **Designation**: Professor & Head of ECE\n\n**Laboratories & Facilities**:\n- Core Electronics Lab & Linear Integrated Circuits (IC) Lab\n- Microprocessors & Microcontrollers Lab\n- Digital Signal Processing (DSP) Lab & VLSI Lab\n- Embedded Systems Lab & Network Lab\n- Centre for Antenna Design and Fabrication\n- PCB Design Fabrication Lab & Semiconductor Chip Testing Lab\n- Product Development Centre (focusing on IoT, healthcare, and assistive devices)",
    "tamilContent": "## 📡 மின்னணுவியல் & தொடர்பியல் துறை (ECE)\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் S. தமிழ் செல்வி அவர்கள் (Professor & Head)\n- **மின்னஞ்சல்**: hodece@nec.edu.in\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- VLSI ஆய்வகம், மைக்ரோபிராசஸர் ஆய்வகம், ஆளிணைப்பு ஆய்வகம் (Antenna Design Centre), PCB வடிவமைப்பு மையம் மற்றும் IoT தயாரிப்பு மேம்பாட்டு மையம்."
  },
  "eee_department": {
    "title": "Department of Electrical and Electronics Engineering (EEE)",
    "keywords": [
      "eee",
      "electrical and electronics",
      "electrical",
      "hod eee",
      "willjuice",
      "iruthayarajan",
      "labs",
      "laboratories",
      "courses",
      "programs"
    ],
    "tamilKeywords": [
      "மின் பொறியியல்",
      "ஈஈஈ",
      "eee துறை",
      "eee hod yaaru",
      "வில்ஜூஸ் இருதயராஜன்",
      "ஈஈஈ எச்ஓடி யார்",
      "ஈஈஈ எச்ஓடி யாரு",
      "ஈஈஈ hod யார்",
      "ஈஈஈ டிபார்ட்மென்ட் எங்கே",
      "eee hod yaaru",
      "eee pathi sollu"
    ],
    "content": "The Department of Electrical and Electronics Engineering at NEC offers undergraduate and postgraduate programmes with advanced practical exposure.\n\n- **HOD**: Dr. M. Willjuice Iruthayarajan (Professor & Head)\n- **Email**: hodeee@nec.edu.in\n\n**Laboratories & Facilities**:\n- High Voltage Laboratory\n- Smart Protection & Control Laboratory\n- Electrical Machines Laboratory\n- Applied Electronics Laboratory\n- Electrical Workshop (for foundational engineering practices)",
    "tamilContent": "## ⚡ மின் மற்றும் மின்னணுவியல் துறை (EEE)\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் M. வில்ஜூஸ் இருதயராஜன் அவர்கள் (Professor & Head)\n- **மின்னஞ்சல்**: hodeee@nec.edu.in\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- உயர் மின்னழுத்த ஆய்வகம் (High Voltage Lab), ஸ்மார்ட் பாதுகாப்பு ஆய்வகம் மற்றும் எலக்ட்ரிக்கல் மெஷின்ஸ் ஆய்வகம்."
  },
  "aids_department": {
    "title": "Department of Artificial Intelligence and Data Science (AIDS)",
    "keywords": [
      "aids",
      "ai & ds",
      "artificial intelligence",
      "data science",
      "hod aids",
      "kalaivani",
      "labs",
      "laboratories",
      "courses",
      "programs"
    ],
    "tamilKeywords": [
      "செயற்கை நுண்ணறிவு",
      "தரவு அறிவியல்",
      "ஏஐடிஎஸ்",
      "aids hod yaaru",
      "கலைவாணி",
      "ஏஐடிஎஸ் எச்ஓடி யார்",
      "ஏஐடிஎஸ் எச்ஓடி யாரு",
      "ஏஐடிஎஸ் hod யார்",
      "ஏஐடிஎஸ் டிபார்ட்மென்ட் எங்கே",
      "aids hod yaaru",
      "ai and ds pathi sollu"
    ],
    "content": "Established in 2022, the Department of Artificial Intelligence and Data Science at NEC prepares students for modern computational and data-driven careers using high-end workstations and GPU-enabled hardware.\n\n- **HOD**: Dr. V. Kalaivani (Professor & Head)\n- **Email**: hodaids@nec.edu.in\n\n**Laboratories & Facilities**:\n- **Data Analytics Laboratory**: Focused on data collection, cleaning, processing, analysis, and visualization using tools like Python, R, PowerBI, and Tableau.\n- **Artificial Intelligence Laboratory**: Dedicated to machine learning, deep learning, NLP, and computer vision experimentation.",
    "tamilContent": "## 🤖 செயற்கை நுண்ணறிவு & தரவு அறிவியல் துறை (AI & DS)\n\n- **துறைத் தலைவர் (HOD)**: முனைவர் V. கலைவாணி அவர்கள் (Professor & Head)\n- **மின்னஞ்சல்**: hodaids@nec.edu.in\n\n**ஆய்வகங்கள் & வசதிகள்**:\n- டேட்டா அனலிட்டிக்ஸ் ஆய்வகம் (Python, PowerBI, Tableau) மற்றும் மெஷின் லேர்னிங் / டீப் லேர்னிங் AI ஆய்வகங்கள்."
  },
  "placement_highlights_static": {
    "title": "Placement Highlights (General)",
    "keywords": [
      "placement",
      "placements",
      "placment",
      "placement info",
      "placement details",
      "placement overview",
      "placement highlights",
      "placed rate",
      "internship",
      "placement trends"
    ],
    "tamilKeywords": [
      "வேலைவாய்ப்பு",
      "வேலைவாய்ப்பு சிறப்பம்சங்கள்",
      "ப்ளேஸ்மென்ட் விவரங்கள்",
      "பிளேஸ்மென்ட் எவ்வளவு",
      "பிளேஸ்மென்ட் எவ்வளோ",
      "பிளேஸ்மென்ட் விவரங்கள்",
      "பிளேஸ்மென்ட் சதவீதம்",
      "ப்ளேஸ்மென்ட் டிடைல்ஸ்",
      "placement evlo",
      "placement pathi sollu",
      "placement percentage evalo"
    ],
    "content": "National Engineering College maintains a consistent placement rate of above 95% for eligible students, alongside strong internship records with prominent companies like Zoho, TCS, Accenture, Cognizant, and Wipro. The college has dedicated incubation centres that help students practice industry skills well in advance.",
    "tamilContent": "## 🚀 வேலைவாய்ப்பு சிறப்பம்சங்கள் (Placement Highlights)\n\n- **ஒட்டுமொத்த வேலைவாய்ப்பு**: 90%+ தகுதியான மாணவர்கள் வேலைவாய்ப்பு பெறுகின்றனர்.\n- **உயர்ந்த சம்பள பேக்கேஜ்**: ரூ. 15+ LPA\n- **முக்கிய நிறுவனங்கள்**: Zoho, TCS, Cognizant, Accenture, Wipro, Infosys, Mistral, ect."
  },
  "hostel": {
    "title": "Hostel Facilities at NEC",
    "keywords": [
      "hostel",
      "hostels",
      "dormitory",
      "dormitories",
      "accommodation",
      "stay",
      "mess",
      "boarding",
      "room",
      "rooms"
    ],
    "tamilKeywords": [
      "விடுதி",
      "ஹோஸ்டல்",
      "ஹாஸ்டல்",
      "தங்கும் விடுதி",
      "விடுதி வசதி",
      "ஹாஸ்டல் கட்டணம்",
      "ஹாஸ்டல் இருக்கா",
      "ஹாஸ்டல் வசதி இருக்கா",
      "ஹாஸ்டல் எப்படி இருக்கு",
      "ஹாஸ்டல் பீஸ் எவ்வளவு",
      "ஹாஸ்டல் ஃபீஸ் எவ்வளவு",
      "ஹோஸ்டல் இருக்கா",
      "ஹாஸ்டல் டிடைல்ஸ்",
      "hostel irukka",
      "hostel epdi irukku",
      "hostel fee evlo",
      "hostel pathi sollu"
    ],
    "content": "National Engineering College provides excellent, separate hostel facilities for boys and girls inside the campus:\n\n- **Rooms**: Well-ventilated, spacious rooms with single, double, and multi-bed sharing options.\n- **Facilities**: 24/7 high-speed Wi-Fi, uninterrupted power supply, clean drinking water (RO plants), gymnasiums, and recreation halls with television.\n- **Mess**: Modern, hygienic steam-cooking kitchens offering nutritious vegetarian and non-vegetarian meals.\n- **Safety**: 24/7 security personnel, CCTV surveillance, and resident wardens to assist students at any time.",
    "tamilContent": "## 🏡 NEC கல்லூரி விடுதி வசதிகள்\n\nNEC கல்லூரியில் மாணவர்கள் மற்றும் மாணவிகளுக்கு தனித்தனி நவீன விடுதிகள் உள்ளன:\n- **வசதிகள்**: 24/7 வைஃபை, சுவையான சத்தான உணவு, சுத்திகரிக்கப்பட்ட குடிநீர்.\n- **பாதுகாப்பு**: 24 மணிநேர கண்காணிப்பு மற்றும் மருத்துவ வசதிகள்.\n- **விளையாட்டு**: உடற்பயிற்சிகூடம் (Gym) மற்றும் விளையாட்டு மைதானங்கள் உள்ளன."
  },
  "library": {
    "title": "Central Library at NEC",
    "keywords": [
      "library",
      "libraries",
      "book",
      "books",
      "journal",
      "journals",
      "reading room",
      "study",
      "digital library",
      "borrow",
      "reference"
    ],
    "tamilKeywords": [
      "நூல்நிலையம்",
      "நூலகம்",
      "லைப்ரரி",
      "புத்தகங்கள்",
      "லைப்ரரி டைமிங் என்ன",
      "லைப்ரரி இருக்கா",
      "லைப்ரரி விவரங்கள்",
      "லைப்ரரி டைமிங்க்ஸ் என்ன",
      "library timing enna",
      "library irukka",
      "library pathi sollu"
    ],
    "content": "The Central Library of NEC is a state-of-the-art information center established in 1984:\n\n- **Collection**: Over 60,000 volumes of books, 15,000 national and international print/online journals, and extensive e-resources (IEEE, Springer, ScienceDirect).\n- **Digital Library**: Equipped with high-speed internet terminals for access to online resource repositories, NPTEL video lectures, and DELNET databases.\n- **Facilities**: Air-conditioned reading halls, study cubicles, photocopying services, and an automated book transactions system (barcoded/RFID enabled).\n- **Working Hours**: Open from 8:00 AM to 8:00 PM on working days to foster student research and learning.",
    "tamilContent": "## 📚 NEC மத்திய நூலகம்\n\nNEC கல்லூரியின் மத்திய நூலகம் 65,000-க்கும் மேற்பட்ட புத்தகங்கள் மற்றும் மின்-நூல்களைக் கொண்டுள்ளது:\n- **மின்-நூலகம்**: IEEE, ScienceDirect மற்றும் Springer இதழ்கள் அணுகல்.\n- **வசதிகள்**: குளிர்சாதன வசதியுடன் கூடிய வாசிப்பு அரங்குகள், தனிப்பட்ட படிப்பு அறைகள், நகலெடுக்கும் சேவைகள்.\n- **நேரம்**: வார நாட்களில் காலை 8:00 மணி முதல் இரவு 8:00 மணி வரை திறந்திருக்கும்."
  },
  "canteen": {
    "title": "Canteen and Food Court at NEC",
    "keywords": [
      "canteen",
      "canteens",
      "food court",
      "food",
      "cafeteria",
      "lunch",
      "snacks",
      "drinks",
      "coffee",
      "tea",
      "bakery"
    ],
    "tamilKeywords": [
      "உணவகம்",
      "கேண்டீன்",
      "சாப்பாடு",
      "கேண்டீன் இருக்கா",
      "கேண்டீன் வசதி இருக்கா",
      "கேண்டீன் எப்படி இருக்கு",
      "ஃபூட் கோர்ட் இருக்கா",
      "canteen irukka",
      "food court pathi sollu",
      "canteen pathi sollu"
    ],
    "content": "The college campus features a modern and spacious canteen providing healthy and affordable dining:\n\n- **Menu**: Offers a variety of South Indian, North Indian, and Chinese dishes, fresh juices, bakery items, snacks, and hot beverages.\n- **Hygiene**: Strict focus on quality, cleanliness, and food safety standards. Clean tables and washing facilities are regularly maintained.\n- **Timing**: Operates from 7:30 AM to 6:30 PM to cater to day scholars, hostellers, visitors, and staff members.",
    "tamilContent": "## 🍽️ கல்லூரி உணவகம் (Canteen)\n\nசுத்தமான மற்றும் சுகாதாரமான முறையில் தயாரிக்கப்பட்ட தென்னிந்திய மற்றும் வட இந்திய உணவுகள், சிற்றுண்டிகள் மற்றும் பானங்கள் நியாயமான விலையில் கிடைக்கின்றன."
  },
  "contact": {
    "title": "Contact National Engineering College",
    "keywords": [
      "contact",
      "email",
      "phone",
      "call",
      "address",
      "reach",
      "communication",
      "office"
    ],
    "tamilKeywords": [
      "தொடர்பு",
      "தொடர்பு கொள்ள",
      "தொலைபேசி எண்",
      "மின்னஞ்சல்",
      "காண்டாக்ட் நம்பர்",
      "காண்டாக்ட் நம்பர் என்ன",
      "என்இசி போன் நம்பர்",
      "என்இசி ஈமெயில் ஐடி",
      "காண்டாக்ட் விவரங்கள்",
      "போன் நம்பர் என்ன",
      "contact number enna",
      "nec phone number enna",
      "nec email id enna",
      "contact details kudu"
    ],
    "content": "You can reach National Engineering College through the following contact details:\n- **Address**: K.R. Nagar, Kovilpatti, Thoothukudi District, Tamil Nadu - 628503\n- **Phone**: +91 4632 222502, 230227\n- **Fax**: +91 4632 232749\n- **Email**: principal@nec.edu.in\n- **Website**: [www.nec.edu.in](https://www.nec.edu.in)",
    "tamilContent": "## 📞 தொடர்பு விவரங்கள்\n\n- **தொலைபேசி**: 04632 - 222502 / 230227\n- **மின்னஞ்சல்**: principal@nec.edu.in\n- **இணையதளம்**: www.nec.edu.in"
  },
  "sports_and_scholarships": {
    "title": "Sports Facilities and Scholarships at NEC",
    "keywords": [
      "sports",
      "scholarship",
      "scholarships",
      "fee waiver",
      "concession",
      "merit",
      "means",
      "sports quota",
      "games",
      "athletics"
    ],
    "tamilKeywords": [
      "விளையாட்டு",
      "உதவித்தொகை",
      "ஸ்காலர்ஷிப்",
      "கட்டண சலுகை",
      "ஸ்போர்ட்ஸ் இருக்கா",
      "ஸ்போர்ட்ஸ் ஃபெசிலிட்டி இருக்கா",
      "ஸ்காலர்ஷிப் கிடைக்குமா",
      "ஸ்காலர்ஷிப் விவரங்கள்",
      "sports irukka",
      "scholarship kedaikkuma"
    ],
    "content": "NEC actively supports student talent through physical education and extensive financial aid options:\n\n- **Merit Scholarships**: Awarded to academic toppers based on university and college examinations.\n- **Merit-cum-Means Scholarships**: Financial assistance for students from economically disadvantaged backgrounds showing strong academic performance.\n- **Sports Facilities**: Campus features a multi-purpose playground, athletic track, basketball court, volleyball court, indoor games hall, and a well-equipped gymnasium.",
    "tamilContent": "## 🏆 விளையாட்டு & உதவித்தொகை (Scholarships)\n\n- **கல்வி உதவித்தொகை**: தகுதி மற்றும் பொருளாதாரத்தில் பின்தங்கிய மாணவர்களுக்கு அரசு மற்றும் கல்லூரி டிரஸ்ட் மூலம் உதவித்தொகைகள் வழங்கப்படுகின்றன.\n- **விளையாட்டு வசதிகள்**: தடகளப் பாதை, கூடைப்பந்து, கால்பந்து மைதானங்கள் மற்றும் துப்பாக்கி சுடுதல் (Rifle Club) பயிற்சி மையங்கள் உள்ளன."
  },
  "rules_regulations": {
    "title": "Rules and Regulations of NEC",
    "keywords": [
      "rules",
      "regulations",
      "discipline",
      "policies",
      "regulation",
      "policy",
      "code of conduct",
      "conduct",
      "dress code",
      "attendance",
      "academic regulations",
      "Ragging"
    ],
    "tamilKeywords": [
      "விதிகள்",
      "கட்டுப்பாடுகள்",
      "ஒழுங்கு முறை",
      "வருகைப்பதிவு",
      "ரூல்ஸ் என்ன",
      "அட்டென்டன்ஸ் சதவீதம்",
      "அட்டென்டன்ஸ் எவ்வளவு",
      "டிரஸ் கோட்",
      "டிரஸ் கோட் என்ன",
      "rules enna",
      "attendance percent evalo",
      "dress code epdi",
      "dress code irukka",
      "ragging irukka"
    ],
    "content": "National Engineering College (NEC) enforces a clear code of conduct to maintain a disciplined and productive learning environment:\n\n- **Academic Regulations**: General academic parameters are governed by the college's autonomous regulations. Official copies (UG Regulation 2023, PG Regulation 2023, UG Regulation 2019, PG Regulation 2019) can be viewed and downloaded under the **Academic Regulations** section of the portal.\n- **Attendance**: Students must maintain a minimum of **75% attendance** in each subject to be eligible to appear for the end-semester Anna University examinations.\n- **Dress Code & Discipline**: Students are expected to dress professionally and adhere to campus discipline guidelines. Mobile phone usage within academic zones is permitted solely for academic purposes. Any unauthorized or non-academic use of mobile phones is strictly prohibited.\n- **Anti-Ragging**: NEC operates under a strict zero-tolerance policy against any form of ragging or harassment, with severe disciplinary consequences for violations.",
    "tamilContent": "## 📜 கல்லூரி ஒழுங்கு விதிகள்\n\n- **வருகைப்பதிவு**: குறைந்தபட்சம் 75% வருகைப்பதிவு கட்டாயமாகும்.\n- **சீருடை**: நிர்ணயிக்கப்பட்ட சீருடை மற்றும் அடையாள அட்டை அணிய வேண்டும்.\n- **ஒழுக்கம்**: வளாகத்திற்குள் மொபைல் போன் பயன்படுத்துவது கல்வி தொடர்பான நோக்கங்களுக்காக மட்டுமே அனுமதிக்கப்படுகிறது. மற்ற எந்த நோக்கங்களுக்காவும் மொபைல் போன் பயன்படுத்துவது கண்டிப்பாக தடைசெய்யப்பட்டுள்ளது.\n- **Anti-Ragging**: தேசிய பொறியியல் கல்லூரி (NEC) எந்த விதமான துன்புறுத்தல்களையும் சகித்துக் கொள்ளாத கொள்கையைக் கடைபிடித்து வருகிறது."
  },
  "transport_facilities": {
    "title": "Transport Facilities at NEC",
    "keywords": [
      "transport",
      "transportation",
      "bus",
      "buses",
      "routes",
      "route",
      "commute",
      "travel"
    ],
    "tamilKeywords": [
      "பேருந்து",
      "போக்குவரத்து",
      "பஸ்",
      "பஸ் வசதி",
      "பஸ் வசதி இருக்கா",
      "பஸ் ஃபெசிலிட்டி இருக்கா",
      "பஸ் ரூட்ஸ் என்ன",
      "பேருந்து வசதி இருக்கா",
      "bus facility irukka",
      "bus routes enna"
    ],
    "content": "NEC provides reliable transport facilities to ensure easy travel for students and staff:\n\n- **Bus Fleet**: The college operates a comprehensive fleet of buses connecting the campus at Kovilpatti (K.R. Nagar) with various locations across Kovilpatti town and neighboring cities (such as Tirunelveli and Thoothukudi).\n - **Route & Pass Inquiries**: Information regarding daily bus routes, pickup points, timings, and bus passes can be obtained directly from the transport desk or administrative office.",
    "tamilContent": "## 🚌 பேருந்து மற்றும் போக்குவரத்து வசதிகள்\n\nதிருநெல்வேலி, தூத்துக்குடி, கோவில்பட்டி, சாத்தூர், விருதுநகர் மற்றும் சுற்றியுள்ள பகுதியிலிருந்து மாணவர்களுக்காக 30-க்கும் மேற்பட்ட கல்லூரி பேருந்துகள் இயக்கப்படுகின்றன."
  },
  "fee_structures": {
    "title": "Fee Structure and Concessions at NEC",
    "keywords": [
      "fee",
      "fees",
      "tuition",
      "structure",
      "payment",
      "cost",
      "charges",
      "expense",
      "concession",
      "waiver"
    ],
    "tamilKeywords": [
      "கட்டணம்",
      "கட்டணங்கள்",
      "ஃபீஸ்",
      "பீஸ்",
      "கல்விக் கட்டணம்",
      "பீஸ் எவ்வளவு",
      "பீஸ் எவ்வளோ",
      "ஃபீஸ் எவ்வளவு",
      "காலேஜ் பீஸ் எவ்வளவு",
      "பீஸ் ஸ்ட்ரக்சர் என்ன",
      "college fees evlo",
      "fees structure enna",
      "fees evlo"
    ],
    "content": "The fee structure at NEC is established in alignment with self-financing autonomous guidelines:\n\n- **Tuition & Core Fees**: Fees vary by engineering branch and quota (TNEA counselling allotment vs Management quota). Detailed fee lists can be retrieved through the Academic or Account Section of the portal.\n- **Concessions & Waivers**:\n  - **First Graduate Concession**: Provided for first-generation students meeting Tamil Nadu government guidelines.\n  - **Merit & Financial Aid**: Awarded to academic toppers and economically weaker students based on merit and means.\n- **Payment**: Semester and exam fee payments can be conveniently made online through the authenticated student portal.",
    "tamilContent": "## 💳 கல்விக் கட்டண விவரங்கள்\n\nதமிழ்நாடு அரசு TNEA மற்றும் அண்ணா பல்கலைக்கழக விதிமுறைகளின்படி கல்விக் கட்டணம் வசூலிக்கப்படுகிறது. முதல் பட்டதாரி மாணவர்களுக்கு அரசு சலுகைகள் உண்டு. கூடுதல் விவரங்களுக்கு கல்லூரி அலுவலகத்தை தொடர்பு கொள்ளவும்."
  },
  "other_facilities": {
    "title": "Other Campus Facilities at NEC",
    "keywords": [
      "other facilities",
      "facilities",
      "amenities",
      "infrastructure",
      "Campus Facilities",
      "wifi",
      "internet",
      "lab",
      "labs",
      "classroom",
      "classrooms",
      "seminar hall",
      "auditorium",
      "medical",
      "atm"
    ],
    "tamilKeywords": [
      "இதர வசதிகள்",
      "வளாக வசதிகள்",
      "வைஃபை",
      "வைஃபை இருக்கா",
      "வைஃபை வசதி இருக்கா",
      "ஃபெசிலிட்டிஸ் என்ன",
      "wifi irukka",
      "facilities enna"
    ],
    "content": "In addition to core hostel, library, and canteen services, National Engineering College features modern amenities to support campus life:\n\n- **Research & Development Center**: Fully equipped research facilities funded by DST, BRNS, and AICTE to foster innovation.\n- **Business Incubator**: A dedicated center to guide student-led startups and product commercialization projects.\n- **Technobation & Incubation Labs**: Modern compute resources and programming labs for high-end software development.\n- **Smart Classrooms**: ICT-enabled smart classrooms and high-tech seminar halls in every department.\n- **Internet & WiFi**: 24/7 high-speed WiFi connectivity covering the entire campus.\n- **Support Services**: On-campus medical/first-aid center, ATM facilities, and a stationery store.",
    "tamilContent": "## 🏢 வளாகம் & உள்கட்டமைப்பு வசதிகள்\n\n300 ஏக்கர் பரப்பளவில் அமைந்துள்ள NEC வளாகத்தில் நவீன கணினி ஆய்வகங்கள், அதிநவீன ஸ்மார்ட் வகுப்பறைகள், 1000+ இருக்கைகள் கொண்ட கலையரங்கம், ஏடிஎம் மற்றும் அதிவேக வைஃபை வசதிகள் உள்ளன. \n\n- **Business Incubator**: மாணவர் தொழில்முனைவோரை ஊக்குவிக்கும் பிரத்யேக மையம்.\n- **Technobation & Incubation Labs**: மேம்பட்ட கணினி வன்பொருள் மற்றும் மென்பொருள் ஆய்வகங்கள்.\n- **Smart Classrooms**: உயர் தொழில்நுட்ப வசதிகளுடன் கூடிய நவீன வகுப்பறைகள்.\n- **Internet & WiFi**: 24/7 அதிவேக வைஃபை வசதி.\n- **Support Services**: மருத்துவ மையம், ஏடிஎம், புத்தகக் கடை."
  },
  "faculties": {
    "title": "Faculties and Department Heads at NEC",
    "keywords": [
      "faculty",
      "faculties",
      "teachers",
      "professor",
      "professors",
      "teaching staff",
      "staff",
      "hod"
    ],
    "tamilKeywords": [
      "பேராசிரியர்கள்",
      "ஆசிரியர்கள்",
      "துறைத் தலைவர்கள்",
      "ப்ரொஃபஸர்கள் லிஸ்ட்",
      "ப்ரொஃபஸர்கள் லிஸ்ட் என்ன",
      "ஸ்டாஃப் லிஸ்ட்",
      "ஸ்டாஃப் லிஸ்ட் என்ன",
      "ஹோட்ஸ் லிஸ்ட்",
      "ethana professors",
      "ethana staff"
    ],
    "content": "National Engineering College boasts a highly qualified, dedicated faculty pool:\n\n- **Faculty Strength**: Over **170+ faculty members** with significant academic, research, and industrial experience. Many hold Doctorate (Ph.D) degrees and are Anna University approved research guides.\n- **Heads of Departments (HODs)**:\n  - **Computer Science & Engineering (CSE)**: Dr. V. Gomathi\n  - **Information Technology (IT)**: Dr. R. Muthukkumar\n  - **AI & Data Science (AIDS)**: Dr. V. Kalaivani\n  - **Electronics & Communication (ECE)**: Dr. S. Tamil Selvi\n  - **Electrical & Electronics (EEE)**: Dr. M. Willjuice Iruthayarajan\n  - **Mechanical Engineering**: Dr Iyah Raja.S.\n  - **Civil Engineering**: Dr. I. Padmanaban\n- **Detailed Profiles**: Faculty profile details, publication lists, and Vidwan portal links can be viewed on the respective department pages.",
    "tamilContent": "## 👨‍🏫 பேராசிரியர்கள் & துறைத் தலைவர்கள் (HODs)\n\nNEC கல்லூரியில் 170-க்கும் மேற்பட்ட தகுதியான பேராசிரியர்கள் பணிபுரிகின்றனர்.\n\n- **HODs பட்டியல்**:\n  - **CSE**: முனைவர் V. கோமதி அவர்கள்\n  - **IT**: முனைவர் R. முத்துக்குமார் அவர்கள்\n  - **AIDS**: முனைவர் V. கலைவாணி அவர்கள்\n  - **ECE**: முனைவர் S. தமிழ் செல்வி அவர்கள்\n  - **EEE**: முனைவர் M. வில்ஜூஸ் இருதயராஜன் அவர்கள்\n  - **MECH**: முனைவர் S. ஐயா ராஜா அவர்கள்\n  - **CIVIL**: முனைவர் I. பத்மநாபன் அவர்கள்"
  },
  "alumni_network": {
    "title": "Alumni Network of NEC",
    "keywords": [
      "alumni",
      "alumnus",
      "graduates",
      "network",
      "alumini",
      "association",
      "connect",
      "alumni website",
      "former students",
      "distinguished alumni"
    ],
    "tamilKeywords": [
      "முன்னாள் மாணவர்கள்",
      "அலும்னி",
      "அலும்னி சங்கம்",
      "அலும்னி விவரங்கள்",
      "அலும்னி நெட்வொர்க்",
      "alumni association enna",
      "alumni details sollu"
    ],
    "content": "NEC has a globally spread, highly active alumni network with over **20,000+ graduates**:\n\n- **NEC Alumni Association**: Actively fosters connections between the institution and former students. It organizes mentoring programmes, career guidance, and mock interviews for current students.\n- **Alumni Portal**: Graduates can register, connect with classmates, and coordinate chapter activities on the official [Alumni Portal](https://alumni.nec.edu.in/).\n- **Alumni Chapters**: The association hosts active chapters in major hubs (Chennai, Bengaluru, Kovilpatti) as well as international chapters in the US, Europe, and the Middle East.",
    "tamilContent": "## 🤝 முன்னாள் மாணவர் சங்கம் (Alumni Network)\n\nNEC கல்லூரியில் 20,000-க்கும் மேற்பட்ட முன்னாள் மாணவர்கள் உலகளவில் முன்னணி நிறுவனங்களில் உயர்பதவிகளில் பணிபுரிகின்றனர். \n- **NEC Alumni Association**: மாணவர்களுடன் முன்னாள் மாணவர்களை இணைக்கும் அமைப்பு. வழிகாட்டல், Career guidance, Mock interviews போன்ற நிகழ்ச்சிகளை நடத்துகிறது.\n- **Alumni Portal**: முன்னாள் மாணவர்கள் இணைவதற்கும், தங்கள் அத்தியாயங்களை ஒருங்கிணைப்பதற்கும் அதிகாரப்பூர்வ போர்ட்டல் உள்ளது [Alumni Portal](https://alumni.nec.edu.in/).\n- **Alumni Chapters**: சென்னை, பெங்களூரு, கோவில்பட்டி, அமெரிக்கா, ஐரோப்பா, மத்திய கிழக்கு ஆகிய இடங்களில் செயல்படும் முன்னாள் மாணவர் குழுக்கள்."
  },
  "incubation_center": {
    "title": "NEC Business Incubator and Incubation Centers",
    "keywords": [
      "incubator",
      "incubation",
      "startups",
      "entrepreneurship",
      "startup",
      "business incubator",
      "innovation",
      "new product development"
    ],
    "tamilKeywords": [
      "இன்குபேஷன் மையம்",
      "ஸ்டார்ட்அப்",
      "ஸ்டார்ட்அப் மையம்",
      "இன்குபேஷன் விவரங்கள்",
      "தொழில் முனைவோர்",
      "startup center iruka"
    ],
    "content": "National Engineering College highly promotes research, entrepreneurship, and innovation among students:\n\n- **NEC Business Incubator**: Approved by MSME and recognized for fostering student startups, providing work spaces, seed funding advice, and business mentorship.\n- **Technobation & Incubation Centers**: Department-specific labs offering hardware facilities and computing resources for student product development.\n- **Product Commercialization**: NEC's focus on engineering products has led to over 36+ successfully developed student products, several of which have been commercialized.\n- **IPR & Patents**: Active support is provided for intellectual property rights, helping students patent their inventions.",
    "tamilContent": "## 🚀 தொழில் தொடக்க மையம் (Incubation Center)\n\nமாணவர்கள் சொந்தமாக ஸ்டார்ட்அப் (Startup) நிறுவனங்கள் தொடங்க தேவையான உள்கட்டமைப்பு மற்றும் நிதி உதவி MSME இன்குபேட்டர் மூலம் வழங்கப்படுகிறது."
  },
  "departments_list": {
    "title": "Departments at National Engineering College (NEC)",
    "keywords": [
      "departments",
      "how many departments",
      "list departments",
      "department list",
      "which departments",
      "branches",
      "depts",
      "dept",
      "disciplines"
    ],
    "tamilKeywords": [
      "துறைகள்",
      "என்னென்ன துறைகள் உள்ளன",
      "எத்தனை துறைகள் உள்ளன",
      "பாடப்பிரிவுகள்",
      "எத்தனை டிபார்ட்மென்ட்ஸ் இருக்கு",
      "டிபார்ட்மென்ட்ஸ் லிஸ்ட்",
      "என்னென்ன டிபார்ட்மென்ட் இருக்கு",
      "ethana departments irukku",
      "enna department iruku",
      "departments list sollu"
    ],
    "content": "National Engineering College (NEC) has **7 engineering departments** and **1 freshman department**:\n\n1. **Computer Science and Engineering (CSE)**\n2. **Information Technology (IT)**\n3. **Artificial Intelligence and Data Science (AIDS)**\n4. **Electronics and Communication Engineering (ECE)**\n5. **Electrical and Electronics Engineering (EEE)**\n6. **Mechanical Engineering (MECH)**\n7. **Civil Engineering (CIVIL)**\n8. **Science & Humanities (S&H)** (Freshman foundational department)",
    "tamilContent": "## 🎓 NEC கல்லூரியின் துறைகள் (Departments)\n\nNEC கல்லூரியில் 7 முக்கிய பொறியியல் துறைகள் உள்ளன:\n1. கணினி அறிவியல் (CSE)\n2. தகவல் தொழில்நுட்பம் (IT)\n3. செயற்கை நுண்ணறிவு & தரவு அறிவியல் (AIDS)\n4. மின்னணுவியல் & தொடர்பியல் (ECE)\n5. மின் மற்றும் மின்னணுவியல் (EEE)\n6. இயந்திரவியல் (Mechanical)\n7. சிவில் பொறியியல் (Civil)"
  },
  "courses_offered": {
    "title": "Academic Programs and Courses Offered at NEC",
    "keywords": [
      "courses",
      "programs",
      "branches",
      "degrees",
      "courses offered",
      "academic programs",
      "what can i study",
      "undergraduate",
      "postgraduate"
    ],
    "tamilKeywords": [
      "படிப்புகள்",
      "என்னென்ன படிப்புகள் உள்ளன",
      "கோர்ஸ் விவரங்கள்",
      "என்ன கோர்ஸ்கள் இருக்கு",
      "கோர்ஸ்கள் ஆஃபர்டு",
      "enna courses irukku",
      "courses enna"
    ],
    "content": "National Engineering College (NEC) offers several undergraduate (UG) and postgraduate (PG) courses, as well as research opportunities:\n\n### **Undergraduate Programmes (B.E. / B.Tech - 4 Years)**\n- **B.E. Computer Science and Engineering (CSE)**\n- **B.E. Electronics and Communication Engineering (ECE)**\n- **B.E. Electrical and Electronics Engineering (EEE)**\n- **B.E. Mechanical Engineering (MECH)**\n- **B.E. Civil Engineering (CIVIL)**\n- **B.Tech. Information Technology (IT)**\n- **B.Tech. Artificial Intelligence and Data Science (AIDS)**\n\n### **Postgraduate Programmes (M.E. - 2 Years)**\n- **M.E. Computer Science and Engineering (CSE)**\n- **M.E. Embedded System Technologies (ECE)**\n- **M.E. High Voltage Engineering (EEE)**\n- **M.E. Energy Engineering (MECH)**\n\n### **Doctoral Programmes (Ph.D.)**\n- Ph.D. Research Centers exist for CSE, ECE, EEE, and Mechanical Engineering.",
    "tamilContent": "## 🎓 வழங்கப்படும் பாடப்பிரிவுகள் (Courses Offered)\n\n- **B.E / B.Tech (4 ஆண்டுகள்)**: CSE, IT, AI & DS, ECE, EEE, Mechanical, Civil.\n- **M.E (2 ஆண்டுகள்)**: CSE, Embedded Systems, High Voltage, Energy Engineering.\n- **Ph.D**: ஆராய்ச்சி மையங்கள் இயக்கப்படுகின்றன."
  },
  "syllabus_curriculum": {
    "title": "Syllabus and Curriculum Details",
    "keywords": [
      "syllabus",
      "curriculum",
      "curriculam",
      "regulations",
      "regulation 2023",
      "regulation 2019",
      "course structure",
      "subjects",
      "academic syllabus",
      "curriculum structure"
    ],
    "tamilKeywords": [
      "பாடத்திட்டம்",
      "கரிக்குலம்",
      "சிலபஸ் என்ன",
      "பாடத்திட்டம் என்ன",
      "சப்ஜெக்ட்ஸ் என்ன",
      "syllabus enna",
      "subjects enna"
    ],
    "content": "National Engineering College (NEC) is an autonomous institution, and its syllabus and curriculum are structured under specific academic regulations:\n\n- **UG Regulation 2023 / 2019**: Governing all B.E. and B.Tech. programmes.\n- **PG Regulation 2023 / 2019**: Governing all M.E. programmes.\n\n### **How to Access/Download the Syllabus**:\nStudents can access the detailed syllabus and course structures directly from the **Academic Regulations** section of the authenticated student portal. For freshman (Semester 1 & 2), the curriculum covers foundational courses like:\n\n- **CSE**: Programming for Problem Solving (CS101), Engineering Math I & II, Engineering Physics, Data Structures (CS203), Object-Oriented Programming (CS202), and Technical/Professional Communication.\n- **ECE**: Electronic Devices (EC101), Engineering Mathematics.\n- **IT**: Programming in C (IT101), Engineering Mathematics.\n- **AIDS**: Introduction to AI (AI101), Engineering Mathematics.",
    "tamilContent": "## 📚 பாடத்திட்டம் (Syllabus)\n\nNEC ஒரு தன்னாட்சி நிறுவனம் என்பதால் தொழில்துறை தேவைக்கேற்ப புதுப்பிக்கப்பட்ட தன்னாட்சி பாடத்திட்டம் பின்பற்றப்படுகிறது."
  },
  "companies_inside_college": {
    "title": "Companies Inside NEC (Technobation Centers)",
    "keywords": [
      "companies inside",
      "companies inside the college",
      "companies in the campus",
      "companies inside it",
      "what companies are inside",
      "companies inside the campus",
      "in-house companies",
      "technobation centers"
    ],
    "tamilKeywords": [
      "வளாகத்தில் உள்ள நிறுவனங்கள்",
      "கல்லூரியில் உள்ள நிறுவனங்கள்",
      "கல்லூரி உள்ள கம்பெனிகள்",
      "இன் ஹவுஸ் கம்பெனிகள்",
      "in-house companies enna",
      "technobation centers enna",
      "enna company iruku"
    ],
    "content": "National Engineering College (NEC) hosts several in-house software and system engineering companies within the campus under its **Technobation Centers** program:\n\n1. **Mistral Solutions** (NEC - Mistral Technobation Center)\n2. **Brimma Tech** (NEC - Brimma Technobation Center)\n3. **Vlinder Private Labs** (NEC - Vlinder Technobation Center)\n4. **TryCAE Industrial Engineering** (NEC - TryCAE Technobation Center)\n\n*Specifically ask about any company (e.g., \"Tell me about Mistral\" or \"What does Brimma do?\") to get detailed information about their tech stack, internship opportunities, and student placements.*",
    "tamilContent": "## 🏢 கல்லூரி வளாகத்தில் உள்ள நிறுவனங்கள்\n\nNEC வளாகத்தில் மாணவர்கள் படிக்கும்போதே நேரடி தொழில் அனுபவம் பெற 4 தொழில் நுட்ப மையங்கள் செயல்படுகின்றன:\n1. Mistral Solutions\n2. Brimma Tech\n3. Vlinder Private Labs\n4. TryCAE \n\n குறிப்பிட்ட நிறுவனத்தைப் பற்றி (எ.கா., “Mistral பற்றி சொல்லுங்கள்” அல்லது “Brimma நிறுவனம் என்ன செய்கிறது?”) கேட்டு, அந்த நிறுவனத்தின் தொழில்நுட்பக் கட்டமைப்பு (Tech Stack), இன்டர்ன்ஷிப் வாய்ப்புகள் மற்றும் மாணவர் வேலைவாய்ப்பு (Student Placements) பற்றிய விரிவான தகவல்களைப் பெறலாம்."
  },
  "mistral_technobation": {
    "title": "NEC - Mistral Technobation Center",
    "keywords": [
      "mistral",
      "mistral solutions",
      "embedded design",
      "mistral technobation"
    ],
    "tamilKeywords": [
      "மிஸ்ட்ரல்",
      "மிஸ்ட்ரல் விவரங்கள்",
      "mistral details kudu",
      "mistral pathi sollu"
    ],
    "content": "**M/s Mistral Solutions** is a technology design and system engineering company providing end-to-end embedded product design and development services for global customers for 25 years.\n\nM/s Mistral solutions, Bangalore has established technobation center at our campus in 2021. Our students are trained through internships and get offers in Mistral Solutions.",
    "tamilContent": "## Mistral Technobation Center\n\nஎம்படட் சிஸ்டம்ஸ் தயாரிப்பு நிறுவனமான Mistral Solutions NEC வளாகத்தில் தனது தொழில் மையத்தை அமைத்து இம்மையத்தின் மூலம் எங்கள் மாணவர்களுக்கு இன்டர்ன்ஷிப் வாயிலாக பயிற்சி வழங்கப்படுகிறது. மேலும், பயிற்சி பெற்ற மாணவர்களுக்கு Mistral Solutions நிறுவனத்தில் வேலைவாய்ப்பு (Job Offers) கிடைக்கின்றன."
  },
  "brimma_technobation": {
    "title": "NEC - Brimma Technobation Center",
    "keywords": [
      "brimma",
      "brimma tech",
      "mortgage domain",
      "brimma technobation",
      "subramanian"
    ],
    "tamilKeywords": [
      "பிரிம்மா",
      "பிரிம்மா விவரங்கள்",
      "brimma details",
      "brimma pathi sollu",
      "brimma details kudu",

    ],
    "content": "**Brimma Tech** has been an emerging Software product development company in the Mortgage domain for over 15 years. It is our pride and privilege that the founder of Brimma, Mr. Subramanian, is an NEC Alumni and native of the Tenkasi district.\n\nAs part of the social responsibility and commitment to the inclusive development of our rural students, Brimma established a \"Technobation Center\" at NEC to equip students with outstanding skills for employability.",
    "tamilContent": "## Brimma Technobation Center\n\nNEC முன்னாள் மாணவர் திரு. சுப்பிரமணியன் அவர்கள் நிறுவிய Brimma Tech மென்பொருள் நிறுவனம் வளாகத்தில் பயிற்சி மையம் அமைத்துள்ளது. இதன் மூலம் மாணவர்களுக்கு வேலைவாய்ப்பைப் பெறுவதற்குத் தேவையான சிறந்த தொழில்நுட்ப மற்றும் தொழில்துறை திறன்கள் வழங்கப்படுகின்றன."
  },
  "vlinder_technobation": {
    "title": "NEC - Vlinder Technobation Center",
    "keywords": [
      "vlinder",
      "vlinder labs",
      "vlinder private labs",
      "blockchain",
      "vlinder technobation"
    ],
    "tamilKeywords": [
      "ப்ளிண்டர்",
      "ப்ளிண்டர் விவரங்கள்",
      "vlinder pathi sollu",
      "vlinder details"
    ],
    "content": "**Vlinder** is a startup company that works on Blockchain Technology. It works with a vision to enable businesses to harness the power of Blockchain through its state-of-the-art and innovative platforms.\n\nM/s Vlinder Private Labs, Bangalore established technobation center at our campus in July 2023. Our students are trained through internships and got offers in Vlinder Private Labs.",
    "tamilContent": "## Vlinder Technobation Center\n\nபிளாக்செயின் (Blockchain) தொழில்நுட்பத்தில் இயங்கும் Vlinder Labs நிறுவனம் வளாகத்தில் பயிற்சி மையம் அமைத்துள்ளது.\nஇம்மையத்தின் மூலம் எங்கள் மாணவர்களுக்கு இன்டர்ன்ஷிப் மற்றும் தொழில்நுட்பப் பயிற்சிகள் வழங்கப்படுகின்றன. மேலும், பயிற்சி பெற்ற எங்கள் மாணவர்களில் சிலர் Vlinder Private Labs நிறுவனத்தில் வேலைவாய்ப்பு (Job Offers) பெற்றுள்ளனர்."
  },
  "trycae_technobation": {
    "title": "NEC - TryCAE Technobation Center",
    "keywords": [
      "trycae",
      "trycae industrial",
      "trycae engineering",
      "cae",
      "cfd",
      "trycae technobation"
    ],
    "tamilKeywords": [
      "டிரைசிஏஇ",
      "டிரைசிஏஇ விவரங்கள்",
      "trycae pathi sollu",
      "trycae details kudu"
    ],
    "content": "**TryCAE Industrial Engineering Pvt Ltd**, Tiruchirappalli, Tamil Nadu was established in the year 2017, which provides best Industrial Engineering Design, and Walkthrough Animations. The NEC-TryCAE Technobation Centre was inaugurated on 29.08.2025 to empower students with industry-ready skills in advanced CAE and emerging technologies. The centre offers certification programmes, internships, placements, and research opportunities in areas such as CFD/FEA, AI, 3D Printing, Photogrammetry, Digital Twin, and AR/VR development.",
    "tamilContent": "## TryCAE Technobation Center\n\n3D பிரிண்டிங் மற்றும் AR/VR தொழில் நுட்பங்களை மாணவர்களுக்கு கற்பிக்க TryCAE மையம் செயல்படுகிறது.\n NEC-TryCAE Technobation Centre 29.08.2025 அன்று, மேம்பட்ட CAE மற்றும் வளர்ந்து வரும் தொழில்நுட்பங்களில் மாணவர்களுக்கு தொழில்துறைக்கு ஏற்ற திறன்களை வழங்கும் நோக்கில் தொடங்கப்பட்டது.\nஇந்த மையம் CFD/FEA, AI, 3D Printing, Photogrammetry, Digital Twin மற்றும் AR/VR Development போன்ற துறைகளில் சான்றிதழ் பயிற்சிகள், இன்டர்ன்ஷிப், வேலைவாய்ப்பு மற்றும் ஆராய்ச்சி வாய்ப்புகளை வழங்குகிறது."
  },
  "mandatory_disclosure": {
    "title": "Mandatory Disclosure of NEC",
    "keywords": [
      "mandatory disclosure",
      "disclosure",
      "aicte disclosure",
      "mandatory disclosures"
    ],
    "tamilKeywords": [
      "கட்டாய வெளிப்படுத்தல்",
      "டிஸ்க்ளோஷர் விவரங்கள்",
      "disclosure details"
    ],
    "content": "The Mandatory Disclosure of National Engineering College (NEC) details regulatory approvals, accreditation, and administrative profiles:\n- **AICTE Approval**: Fully approved autonomous self-financing institution since inception under the National Educational and Charitable Trust.\n- **Accreditation**: NAAC accredited and multiple departments (CSE, ECE, EEE, MECH) Tier-1 NBA accredited.\n- **Information Access**: The official Mandatory Disclosure documents (containing details about student intake, infrastructure details, faculty status, and campus resources) are available for download under the **Mandatory Disclosure** section of the portal.",
    "tamilContent": "நேஷனல் இன்ஜினியரிங் கல்லூரி (NEC)-யின் கட்டாய வெளிப்படுத்தல் (Mandatory Disclosure) ஆவணங்களில், கல்லூரியின் ஒழுங்குமுறை அங்கீகாரங்கள், தரச்சான்றுகள் மற்றும் நிர்வாக விவரங்கள் இடம்பெற்றுள்ளன.\n\n**AICTE அங்கீகாரம்**: நேஷனல் எஜுகேஷனல் அண்ட் சாரிட்டபிள் டிரஸ்டின் கீழ் தொடங்கப்பட்டதிலிருந்து, முழுமையாக அங்கீகரிக்கப்பட்ட தன்னாட்சி சுயநிதி கல்வி நிறுவனமாக செயல்பட்டு வருகிறது.\n**தரச்சான்று (Accreditation)**: கல்லூரி NAAC அங்கீகாரம் பெற்றுள்ளது. மேலும் CSE, ECE, EEE மற்றும் MECH உள்ளிட்ட பல துறைகள் Tier-1 NBA அங்கீகாரம் பெற்றுள்ளன.\n**தகவல் அணுகல்**: மாணவர் சேர்க்கை எண்ணிக்கை, உள்கட்டமைப்பு வசதிகள், ஆசிரியர் விவரங்கள் மற்றும் வளாக வளங்கள் போன்ற தகவல்கள் அடங்கிய அதிகாரப்பூர்வ Mandatory Disclosure ஆவணங்களை கல்லூரி இணையதளத்தின் “Mandatory Disclosure” பிரிவில் பதிவிறக்கம் செய்து பார்க்கலாம்."
  },
  "academics": {
    "title": "Academics at NEC",
    "keywords": [
      "academics",
      "academic",
      "study",
      "education",
      "calendar",
      "regulations"
    ],
    "tamilKeywords": [
      "கல்வி",
      "கல்வி முறை",
      "அகாடமிக்ஸ் விவரங்கள்",
      "academics details"
    ],
    "content": "National Engineering College provides premium academic instruction with student-focused, choice-based systems:\n- **Curriculum & Regulations**: Governed by the autonomous UG and PG Regulations of 2019 and 2023, designed to align with industry expectations.\n- **Schedules**: Term schedules, class tests, and end-semester timetables are updated dynamically on the academic calendar.\n- **Advising**: Academic progress is monitored by class coordinators and mentors. Students can download regulations, curriculum frameworks, and syllabus copies directly from the portal.",
    "tamilContent": "## 📚 கல்வி & பாடத்திட்டம் (Academics)\n\nNEC ஒரு தன்னாட்சி (Autonomous) நிறுவனம் ஆகும். CBCS பாடத்திட்டம் பின்பற்றப்படுகிறது.நேஷனல் இன்ஜினியரிங் கல்லூரி (NEC) மாணவர்களை மையமாகக் கொண்ட, விருப்பத் தேர்வு அடிப்படையிலான கல்வி முறையின் மூலம் தரமான கல்வியை வழங்குகிறது.\n\n**பாடத்திட்டம் மற்றும் விதிமுறைகள்**: 2019 மற்றும் 2023 ஆம் ஆண்டுகளின் தன்னாட்சி UG மற்றும் PG விதிமுறைகளின் அடிப்படையில் கல்வி நிர்வகிக்கப்படுகிறது. இவை தொழில்துறையின் எதிர்பார்ப்புகளுக்கு ஏற்ப வடிவமைக்கப்பட்டுள்ளன.\n**கல்வி அட்டவணைகள்**: பருவ அட்டவணைகள், வகுப்புத் தேர்வுகள் மற்றும் பருவ இறுதித் தேர்வு அட்டவணைகள் Academic Calendar-ல் அவ்வப்போது புதுப்பிக்கப்படுகின்றன.\n**கல்வி வழிகாட்டுதல்**: மாணவர்களின் கல்வி முன்னேற்றம் வகுப்பு ஒருங்கிணைப்பாளர்கள் (Class Coordinators) மற்றும் வழிகாட்டிகள் (Mentors) மூலம் கண்காணிக்கப்படுகிறது. மாணவர்கள் விதிமுறைகள், பாடத்திட்டக் கட்டமைப்புகள் மற்றும் பாடத்திட்ட நகல்களை கல்லூரி இணையதளத்திலிருந்து நேரடியாகப் பதிவிறக்கம் செய்து கொள்ளலாம்."
  },
  "coe": {
    "title": "Controller of Examinations (CoE)",
    "keywords": [
      "coe",
      "controller of examinations",
      "exam",
      "exams",
      "examination",
      "examinations",
      "results",
      "hall ticket",
      "grade sheets",
      "revaluation",
      "exam cell"
    ],
    "tamilKeywords": [
      "தேர்வு கட்டுப்பாட்டு பிரிவு",
      "தேர்வுகள்",
      "தேர்வு முடிவுகள்",
      "சிஓஇ விவரங்கள்",
      "எக்ஸாம் ரிசல்ட்ஸ்",
      "பரீட்சை முடிவுகள்",
      "coe detailskudu",
      "exam results"
    ],
    "content": "The Office of the Controller of Examinations (CoE) handles all examination administration and assessment services at NEC:\n- **Schedules**: Publishes end-semester exam dates, venue allocations, and issues student hall tickets.\n- **Results**: Processes and publishes semester assessment results online via the student login portal.\n- **Revaluation**: Manages applications for photocopy requests, paper valuation review, and revaluation.\n- **Certificates**: Distributes official grade sheets, transcripts, and coordinates provisional and degree certifications.\n- **Contact**: Students can visit the CoE examination cell located in the administration block for any examination-related queries.",
    "tamilContent": "## 📝 தேர்வு கட்டுப்பாட்டு பிரிவு (CoE)\n\nதேர்வு கட்டுப்பாட்டாளர் அலுவலகம் கல்லூரி பருவத்தேர்வுகள், கால அட்டவணை மற்றும் மதிப்பெண் சான்றிதழ்களை நிர்வகிக்கிறது. \n\n- **தேர்வு அட்டவணை**: பருவத் தேர்வு தேர்வுகள், நடைபெறும் இடங்கள் மற்றும் மாணவர்களுக்கான தேர்வு நுழைவுச் சீட்டுகள் (Hall Tickets) வெளியிடப்படும். \n- **தேர்வு முடிவுகள்**: பருவத் தேர்வு முடிவுகள் ஆன்லைனில் வெளியிடப்படும். மதிப்பெண்களை విద్యార్థులు கல்லூரி இணையதளத்தில் உள்நுழைந்து பார்வையிடலாம். \n- **மறு மதிப்பீடு (Revaluation)**: தேர்வு முடிவுகள் வந்தவுடன், மதிப்பெண் நகல் கோரல், மறு மதிப்பீடு போன்றவற்றுக்கு விண்ணப்பிக்கலாம். \n- **சான்றிதழ்கள்**: மதிப்பெண் சான்றிதழ்கள், தற்காலிக மதிப்பெண் பட்டியல்கள் மற்றும் பட்டமளிப்பு விவரங்கள் CoE அலுவலகத்தால் வழங்கப்படும். \n- **தொடர்புக்கு**: தேர்வு தொடர்பான சந்தேகங்கள் இருப்பின், தேர்வு கட்டுப்பாட்டுப் பிரிவில் (CoE) நேரடியாக அணுகலாம்."
  },
  "research": {
    "title": "Research and Development at NEC",
    "keywords": [
      "research",
      "development",
      "r&d",
      "publications",
      "projects",
      "grants",
      "patents",
      "phd",
      "scholars",
      "funded projects"
    ],
    "tamilKeywords": [
      "ஆராய்ச்சி",
      "காப்புரிமை",
      "ரிசர்ச் விவரங்கள்",
      "research details sollu"
    ],
    "content": "Research and Development (R&D) is a cornerstone of excellence at National Engineering College:\n- **Research Centres**: Fully recognized Ph.D. research centers exist for CSE, ECE, EEE, and Mechanical Engineering under Anna University.\n- **Grants & Funding**: Major research projects funded by national bodies like DST, BRNS, DRDO, CSIR, and AICTE.\n- **Patents**: Active support is provided for intellectual property rights, resulting in more than 30+ patents filed and granted to students and faculty.\n- **Publications**: Faculty members and research scholars regularly publish in international, peer-reviewed SCI and Scopus indexed journals.",
    "tamilContent": "## 🔬 ஆராய்ச்சி & புதுமை (Research & Innovation)\n\nNEC கல்லூரியில் அண்ணா பல்கலைக்கழகத்தால் அங்கீகரிக்கப்பட்ட ஆராய்ச்சி மையங்கள் உள்ளன. பல காப்புரிமைகள் (Patents) பெறப்பட்டுள்ளன."
  },
  "iqac": {
    "title": "Internal Quality Assurance Cell (IQAC)",
    "keywords": [
      "iqac",
      "quality assurance",
      "quality cell",
      "audit",
      "audits",
      "naac",
      "nba",
      "academic audit",
      "quality enhancement"
    ],
    "tamilKeywords": [
      "தர உத்தரவாதக் குழு",
      "ஐக்யூஏசி விவரங்கள்",
      "iqac details"
    ],
    "content": "The Internal Quality Assurance Cell (IQAC) at NEC is responsible for post-accreditation quality sustenance and enhancement initiatives:\n- **Objectives**: Focuses on designing, monitoring, and executing quality parameters for academic delivery, institutional assessment, and internal audits.\n- **Accreditation**: Steers continuous self-evaluation processes for NAAC and NBA reviews.\n- **Audits**: Organizes annual external and internal academic and administrative audits.\n- **Feedback**: Collects and analyzes feedback from students, alumni, parents, and industry stakeholders to refine institutional efficiency.",
    "tamilContent": "கல்லூரியின் கல்வித்தரம் மற்றும் கற்பித்தல் முறைகளை IQAC தொடர்ந்து கண்காணிக்கிறது."
  },
  "sa_ir": {
    "title": "Student Affairs & International Relations (SA & IR)",
    "keywords": [
      "sa & ir",
      "student affairs",
      "international relations",
      "foreign",
      "abroad",
      "higher studies",
      "exchange programme",
      "exchange program",
      "mou",
      "clubs",
      "activities",
      "extracurricular"
    ],
    "tamilKeywords": [
      "மாணவர் நலன்",
      "சர்வதேச தொடர்புகள்",
      "ஸ்டூடென்ட் அஃபேர்ஸ்"
    ],
    "content": "The Student Affairs & International Relations (SA & IR) cell at NEC coordinates international collaborations and student development:\n- **International Relations**: Facilitates student exchange programs, guest lectures by foreign academicians, and NRI/foreign admissions. Develops academic partnerships via global MoUs.\n- **Student Affairs**: Manages and supports extracurricular student clubs (NSS, NCC, Rotaract, Fine Arts, YRC, Yoga and departmental student associations).\n- **Higher Education**: Provides counselling, expert coaching, and guidelines for students planning to pursue higher education and research abroad.",
    "tamilContent": "**மாணவர் விவகாரங்கள் மற்றும் சர்வதேச உறவுகள் (SA & IR) பிரிவு** NEC-யில் சர்வதேச ஒத்துழைப்புகள் மற்றும் மாணவர்களின் வளர்ச்சியை ஒருங்கிணைக்கிறது:\n- **சர்வதேச உறவுகள்**: மாணவர் பரிமாற்றத் திட்டங்கள், வெளிநாட்டு கல்வியாளர்களின் சிறப்பு விரிவுரைகள் மற்றும் NRI/வெளிநாட்டு மாணவர் சேர்க்கைக்கு ஆதரவு வழங்குகிறது. உலகளாவிய புரிந்துணர்வு ஒப்பந்தங்கள் (MoUs) மூலம் கல்வி நிறுவனங்களுடன் கல்விசார் கூட்டாண்மைகளை உருவாக்குகிறது.\n- **மாணவர் விவகாரங்கள்**: NSS, NCC, Rotaract, நுண்கலை, YRC, யோகா மற்றும் துறை சார்ந்த மாணவர் சங்கங்கள் உள்ளிட்ட மாணவர்களின் இணைப் பாடத்திட்ட மற்றும் பாடத்திட்டத்திற்கு அப்பாற்பட்ட செயல்பாடுகளை ஒருங்கிணைத்து ஆதரிக்கிறது.\n- **உயர்கல்வி**: வெளிநாடுகளில் உயர்கல்வி மற்றும் ஆராய்ச்சியைத் தொடரத் திட்டமிடும் மாணவர்களுக்கு ஆலோசனை, நிபுணர் பயிற்சி மற்றும் வழிகாட்டுதல்களை வழங்குகிறது."
  },
  "innovation": {
    "title": "Innovation and Entrepreneurship Support",
    "keywords": [
      "innovation",
      "innovative",
      "entrepreneurship",
      "iedc",
      "intellectual property",
      "patents",
      "incubation",
      "product development",
      "business incubator"
    ],
    "tamilKeywords": [
      "கண்டுபிடிப்பு மையம்",
      "புதுமை",
      "இன்னோவேஷன் மையம்"
    ],
    "content": "NEC fosters a powerful ecosystem for innovation, startup development, and commercialization:\n- **MSME Business Incubator**: Approved by MSME to support student entrepreneurship, offering workspaces, seed funding mentorship, and prototyping assistance.\n- **Product Development**: Focus on product engineering has resulted in 36+ successfully developed and commercialized student products.\n- **IEDC**: The Innovation and Entrepreneurship Development Centre organizes hackathons, ideation camps, and business plan workshops.\n- **IPR Cell**: Assists students and faculty in filing patents, design registrations, and copyrights.",
    "tamilContent": "மாணவர்களின் புதிய யோசனைகளுக்கு நிதி உதவி மற்றும் காப்புரிமை பெற வழிகாட்டுதல் வழங்கப்படுகிறது."
  },
  "facilities": {
    "title": "Campus Facilities at NEC",
    "keywords": [
      "facilities",
      "amenities",
      "infrastructure",
      "hostel",
      "library",
      "campus life",
      "canteen",
      "transport",
      "sports",
      "gym",
      "atm",
      "medical"
    ],
    "tamilKeywords": [
      "வசதிகள்",
      "உள்கட்டமைப்பு",
      "கேம்பஸ் ஃபெसिलிட்டிஸ்",
    ],
    "content": "National Engineering College features state-of-the-art infrastructure and facilities to enrich student life:\n- **Hostels**: Separate, secure hostels for boys and girls with multi-bed sharing options, RO drinking water, Wi-Fi, and recreation rooms.\n- **Central Library**: Holds over 60,000 volumes, national/international print journals, and online digital libraries (IEEE, DELNET).\n- **Dining**: Modern canteen and food court serving delicious, hygienic, and affordable vegetarian and non-vegetarian food.\n- **Transport**: Extensive fleet of buses covering Kovilpatti, Tirunelveli, and Thoothukudi districts.\n- **Other Amenities**: Multi-purpose sports fields, indoor games hall, gymnasiums, medical center, ATM, and stationery shop.",
    "tamilContent": "நவீன கணினி ஆய்வகங்கள், விடுதிகள், நூலகம், உணவகம் மற்றும் பேருந்து வசதிகள் உள்ளன."
  },
  "students": {
    "title": "Student Services and Campus Life",
    "keywords": [
      "students",
      "student life",
      "grievance",
      "grievances",
      "clubs",
      "associations",
      "student portal",
      "mentoring",
      "counselling",
      "grievance cell"
    ],
    "tamilKeywords": [
      "மாணவர் நலன்",
      "மாணவர் வாழ்க்கை",
      "ஸ்டூடென்ட் போர்ட்டல்"
    ],
    "content": "NEC provides complete support services to ensure student welfare and active campus participation:\n- **Student Portal**: Authenticated access for checking attendance, semester marks, fee dues, and registrations.\n- **Mentoring System**: Dedicated faculty mentors assigned to guide students in academic performance and personal development.\n- **Grievance Redressal**: Active Student Grievance Redressal Committee and Internal Complaints Committee to address any student concerns.\n- **Discipline & Safety**: Anti-Ragging committee ensures a 100% ragging-free campus. General student code of conduct is governed under the college regulations.",
    "tamilContent": "NEC மாணவர்களின் நலன் மற்றும் வளாகச் செயல்பாடுகளில் அவர்களின் சுறுசுறுப்பான பங்கேற்பை உறுதி செய்யும் வகையில் முழுமையான ஆதரவு சேவைகளை வழங்குகிறது:\n- **மாணவர் இணையதளம் (Student Portal)**: மாணவர்கள் தங்களின் வருகைப் பதிவு, பருவத் தேர்வு மதிப்பெண்கள், கட்டண நிலுவைகள் மற்றும் பதிவுகளை பாதுகாப்பான முறையில் அணுகிப் பார்க்கலாம்.\n- **வழிகாட்டுதல் அமைப்பு (Mentoring System)**: மாணவர்களின் கல்வி முன்னேற்றம் மற்றும் தனிப்பட்ட வளர்ச்சிக்கு வழிகாட்டுவதற்காக ஒவ்வொரு மாணவருக்கும் ஆசிரியர் வழிகாட்டிகள் (Faculty Mentors) நியமிக்கப்படுகின்றனர்.\n- **குறைதீர் அமைப்பு (Grievance Redressal)**: மாணவர்களின் குறைகள் மற்றும் பிரச்சினைகளைத் தீர்ப்பதற்காக Student Grievance Redressal Committee மற்றும் Internal Complaints Committee செயல்பட்டு வருகின்றன.\n- **ஒழுக்கம் மற்றும் பாதுகாப்பு (Discipline & Safety)**: Anti-Ragging Committee மூலம் ராகிங் இல்லாத வளாகம் உறுதி செய்யப்படுகிறது. மாணவர்களின் பொதுவான நடத்தை விதிமுறைகள் கல்லூரியின் விதிமுறைகளின்படி நிர்வகிக்கப்படுகின்றன.",
  },
  "nss": {
    "title": "National Service Scheme (NSS) at NEC",
    "keywords": [
      "nss",
      "national service scheme",
      "nss unit",
      "nss units",
      "nss club",
      "nss activities",
      "nss camp",
      "nss camps",
      "social service",
      "nss volunteer",
      "nss volunteers",
      "community service",
      "blood donation",
      "tree plantation",
      "about nss",
      "tell me about nss",
      "what is nss",
      "nss in nec",
      "nss details",
      "nss coordinator"
    ],
    "tamilKeywords": [
      "என்எஸ்எஸ்",
      "தேசிய சேவைத் திட்டம்",
      "என் எஸ் எஸ்",
      "என்எஸ்எஸ் முகாம்",
      "என்எஸ்எஸ் விவரங்கள்",
      "என்எஸ்எஸ் பற்றி",
      "சமூக சேவை",
      "ரத்த தான முகாம்",
      "nss irukka",
      "nss irukaa",
      "nss pathi sollu",
      "nss details sollu"
    ],
    "content": "National Engineering College (NEC) has active **National Service Scheme (NSS)** units that organize social service, rural development, and youth awareness activities:\n\n- **Core Activities**: Blood donation camps, tree plantation drives, environmental awareness rallies, literacy awareness, and village health check-up camps.\n- **Annual Special Camps**: NSS volunteers participate in 7-day rural adoption camps in neighboring villages to support local infrastructure, hygiene, and community education.\n- **Volunteer Benefits**: NSS participants build strong leadership, social responsibility, and civic awareness, and receive official NSS certificates useful for higher education and public sector careers.",
    "tamilContent": "## 🚩 தேசிய சேவைத் திட்டம் (NSS)\n\nNational Engineering College (NEC) கல்லூரியில் **தேசிய சேவைத் திட்டம் (NSS)** இயங்கி வருகிறது:\n\n- **சமூக சேவைகள்**: ரத்த தான முகாம்கள், மரக்கன்றுகள் நடுதல், சுற்றுச்சூழல் விழிப்புணர்வு பேரணிகள் மற்றும் கிராமப்புற சுகாதார முகாம்கள்.\n- **ஆண்டு சிறப்பு முகாம்**: ஆண்டுதோறும் 7 நாட்கள் கிராமப்புற தத்தெடுப்பு முகாம்கள் மூலம் கிராம வளர்ச்சிப் பணிகள் மேற்கொள்ளப்படுகின்றன.\n- **நன்மைகள்**: மாணவர்களிடம் தலைமைப் பண்பு மற்றும் சமூகப் பொறுப்புணர்வு வளர்கிறது, மேலும் சான்றிதழ்களும் வழங்கப்படுகின்றன."
  },
  "ncc": {
    "title": "National Cadet Corps (NCC) at NEC",
    "keywords": [
      "ncc",
      "national cadet corps",
      "ncc unit",
      "ncc units",
      "ncc army",
      "ncc navy",
      "ncc air force",
      "ncc cadet",
      "ncc cadets",
      "ncc training",
      "ncc parade",
      "ncc camp",
      "ncc camps",
      "ncc certificate",
      "ncc b certificate",
      "ncc c certificate",
      "b certificate",
      "c certificate",
      "armed forces",
      "defense",
      "defence",
      "army training",
      "about ncc",
      "tell me about ncc",
      "what is ncc",
      "ncc in nec",
      "ncc details",
      "ncc officer"
    ],
    "tamilKeywords": [
      "என்சிசி",
      "தேசிய மாணவர் படை",
      "என் சி சி",
      "என்சிசி பயிற்சி",
      "என்சிசி முகாம்",
      "என்சிசி விவரங்கள்",
      "என்சிசி பற்றி",
      "ராணுவ பயிற்சி",
      "ncc irukka",
      "ncc irukaa",
      "ncc pathi sollu",
      "ncc details sollu"
    ],
    "content": "National Engineering College (NEC) houses an active **National Cadet Corps (NCC)** unit aimed at developing character, discipline, and military leadership among students:\n\n- **Training & Practice**: Regular drill practice, parade sessions, physical fitness, weapon training, map reading, and obstacle courses.\n- **Certificates**: Cadets receive guidance and training to earn **'B' and 'C' Certificates**, which provide direct preference and reservation in Armed Forces recruitment (CDS, SSB interviews, Police, and Defense services).\n- **Camps & Events**: Cadets represent NEC at National Integration Camps (NIC), Combined Annual Training Camps (CATC), and Republic Day Parades (RDC) in New Delhi.",
    "tamilContent": "## 🎖️ தேசிய மாணவர் படை (NCC)\n\nNational Engineering College (NEC) கல்லூரியில் **தேசிய மாணவர் படை (NCC)** இயங்கி வருகிறது:\n\n- **ராணுவப் பயிற்சிகள்**: அணிவகுப்புப் பயிற்சி (Drill), துப்பாக்கி சுடுதல் பயிற்சி, உடற்பயிற்சி மற்றும் வரைபட வாசிப்பு (Map Reading).\n- **சான்றிதழ்கள்**: **'B' மற்றும் 'C' சான்றிதழ்கள்** பெற சிறப்புப் பயிற்சி அளிக்கப்படுகிறது. இது இந்திய ராணுவம் (Armed Forces), காவல் துறை மற்றும் SSB நேர்முகத் தேர்வுகளில் முன்னுரிமை அளிக்கிறது.\n- **தேசிய முகாம்கள்**: குடியரசு தின பேரணி (RDC - New Delhi), தேசிய ஒருமைப்பாட்டு முகாம் (NIC) மற்றும் கடற்படை/விமானப்படை முகாம்களில் cadets பங்கேற்கின்றனர்."
  },
  "student_clubs": {
    "title": "Student Clubs and Extracurricular Activities at NEC",
    "keywords": [
      "clubs",
      "club",
      "student clubs",
      "extracurricular",
      "extracurricular activities",
      "co-curricular",
      "co-curricular activities",
      "fine arts",
      "fine arts club",
      "rotaract",
      "rotaract club",
      "yrc",
      "youth red cross",
      "red cross",
      "eco club",
      "nature club",
      "coding club",
      "photography club",
      "music club",
      "dance club",
      "literary club",
      "debate club",
      "tamil mandram",
      "ieee",
      "iste",
      "csi",
      "iete",
      "robotics club",
      "dramatics",
      "culturals",
      "cultural club",
      "cultural activities",
      "what clubs are there",
      "list of clubs",
      "clubs in nec"
    ],
    "tamilKeywords": [
      "மன்றங்கள்",
      "கிளப்புகள்",
      "மாணவர் மன்றங்கள்",
      "கிளப்",
      "ஃபைன் ஆர்ட்ஸ்",
      "ரோட்டராக்ட்",
      "ஒய்ஆர்சி",
      "ரெட் கிராஸ்",
      "கோடிங் கிளப்",
      "இசை மன்றம்",
      "நடன மன்றம்",
      "ஈகோ கிளப்",
      "தமிழ் மன்றம்",
      "கலாச்சார நிகழ்வுகள்",
      "clubs list",
      "clubs in nec",
      "clubs enna irukku"
    ],
    "content": "National Engineering College offers a vibrant campus environment with a wide variety of technical, social, and cultural student clubs:\n\n- **Social Service & Leadership**: NSS (National Service Scheme), NCC (National Cadet Corps), Rotaract Club, Youth Red Cross (YRC).\n- **Arts & Cultural Clubs**: Fine Arts Club (Music, Dance, Dramatics, Painting), Tamil Mandram, English Literary & Debate Club, Photography Club.\n- **Professional Student Chapters**: IEEE Student Branch, ISTE Student Chapter, CSI (Computer Society of India), IETE Student Forum.\n- **Special Interest & Tech Clubs**: Eco / Nature Club, Coding & Competitive Programming Club, Robotics Club, Entrepreneurship Development Cell (EDC).",
    "tamilContent": "## 🌟 மாணவர் மன்றங்கள் & கலைநிகழ்ச்சிகள் (Student Clubs & Extra-curriculars)\n\nNEC கல்லூரியில் மாணவர்களின் பல்வேறு திறன்களை வெளிக்கொணர பல்வேறு மன்றங்கள் செயல்படுகின்றன:\n\n- **சமூக சேவை மன்றங்கள்**: NSS (தேசிய சேவைத் திட்டம்), NCC (தேசிய மாணவர் படை), Rotaract Club, Youth Red Cross (YRC).\n- **கலை & பண்பாட்டு மன்றங்கள்**: நுண்கலை மன்றம் (Fine Arts Club), தமிழ் மன்றம், ஆங்கில இலக்கிய மன்றம் (Literary Club), புகைப்பட மன்றம் (Photography Club).\n- **தொழில்நுட்ப மாணவர் அமைப்புகள்**: IEEE, ISTE, CSI, IETE மற்றும் Coding Club.\n- **சிறப்பு மன்றங்கள்**: பசுமை மன்றம் (Eco Club), ரோபோடிக்ஸ் மன்றம் மற்றும் யோகா மன்றம்."
  },
  "nirf": {
    "title": "National Institutional Ranking Framework (NIRF)",
    "keywords": [
      "nirf",
      "rank",
      "ranking",
      "rankings",
      "mhrd",
      "place",
      "standing"
    ],
    "tamilKeywords": [
      "என்ஐஆர்எஃப்",
      "தரவரிசை",
      "என்ஐஆர்எஃப் ரேங்க் என்ன",
      "nirf rank enna"
    ],
    "content": "National Engineering College consistently participates in and ranks highly in the NIRF evaluations by the Ministry of Education:\n- **Rankings**: NEC was ranked #169 in the NIRF Engineering category in 2022.\n- **Evaluation Metrics**: Excels in major NIRF parameters: Teaching, Learning & Resources (TLR), Research and Professional Practice (RP), Graduation Outcomes (GO), Outreach and Inclusivity (OI), and Peer Perception (PR).\n- **Significance**: Reflects our quality education, outstanding faculty-to-student ratios, placements, and strong research output.",
    "tamilContent": "NEC கல்லூரி மத்திய அரசின் NIRF பொறியியல் கல்லூரி தரவரிசையில் 169-வது இடத்தை பெற்றுள்ளது."
  },
  "events_symposiums": {
    "title": "Events, Symposiums, Workshops & Conferences at NEC",
    "keywords": [
      "events conducted",
      "events in nec",
      "nec events",
      "college events",
      "annual events",
      "events list",
      "events",
      "event",
      "symposium",
      "symposiums",
      "techfest",
      "techfest 2k24",
      "hackathon",
      "hackathons",
      "conference",
      "pre-conference workshop",
      "workshop",
      "workshops",
      "deep tech",
      "sustainable engineering",
      "international conference",
      "national level technical symposium"
    ],
    "tamilKeywords": [
      "நிகழ்வுகள் என்ன",
      "கல்லூரி நிகழ்வுகள்",
      "நிகழ்வுகள்",
      "நிகழ்ச்சிகள்",
      "கருத்தரங்கம்",
      "சிம்போசியம்",
      "ஹேக்கத்தான்",
      "டெக்ஃபெஸ்ட்",
      "கான்பரன்ஸ்",
      "வொர்க்ஷாப்",
      "சிம்போசியம் இருக்கா",
      "ஹேக்கத்தான் நடத்தப்படுமா",
      "ஈவென்ட்ஸ் என்ன",
      "events enna",
      "symposium details",
      "hackathon details"
    ],
    "content": "National Engineering College (NEC) conducts annual hackathons, national-level technical symposiums, workshops, and international conferences every year:\n\n- **Annual Events**: The college conducts hackathons, national-level technical symposiums, and workshops every year.\n- **Techfest 2k24**: A national-level technical symposium hosted at NEC.\n- **International Conference on Deep Tech and Sustainable Engineering Solutions (Pre-Conference Workshop)**: As part of the International Conference on Deep Tech and Sustainable Engineering Solutions, the pre-conference workshop provides an immersive experience showcasing the latest advancements in technology, engineering, and sustainability. This hands-on event brings together experts, innovators, and industry leaders to explore the intersection of cutting-edge technologies and sustainable practices shaping the future of engineering.",
    "tamilContent": "## 🎉 NEC கருத்தரங்குகள் & தேசிய மாநாடுகள் (Events & Symposiums)\n\nNEC கல்லூரியில் ஒவ்வொரு ஆண்டும் தேசிய அளவிலான தொழில்நுட்ப சிம்போசியம்கள், ஹேக்கத்தான்கள் மற்றும் சர்வதேச மாநாடுகள் நடத்தப்படுகின்றன:\n\n- **ஆண்டு நிகழ்வுகள்**: தேசிய அளவிலான தொழில்நுட்ப சிம்போசியம், ஹேக்கத்தான் மற்றும் பயிலரங்குகள் ஒவ்வொரு ஆண்டும் நடத்தப்படுகின்றன.\n- **Techfest 2k24**: தேசிய அளவிலான தொழில்நுட்ப சிம்போசியம்.\n- **Deep Tech & Sustainable Engineering Solutions (சர்வதேச மாநாடு & Pre-Conference Workshop)**: தொழில்நுட்பம், பொறியியல் மற்றும் நிலையான வளர்ச்சிக்கான அதிநவீன கண்டுபிடிப்புகள், வல்லுநர்கள் மற்றும் தொழில்முனைவோரின் கைமுறை பயிற்சி பயிலரங்கம்."
  },
  "cse_vision_mission": {
    "title": "CSE Department Vision and Mission",
    "keywords": [
      "cse vision",
      "cse mission",
      "computer science vision",
      "computer science mission"
    ],
    "tamilKeywords": [
      "சிஎஸ்இ துறையின் நோக்கம்",
      "சிஎஸ்இ துறையின் குறிக்கோள்",
      "கணினி அறிவியல் துறையின் நோக்கம்",
      "கணினி அறிவியல் துறையின் குறிக்கோள்",
      "cse thuraiyin nokkam",
      "cse thuraiyin kurikkol",
      "cse vision tamil",
      "cse mission tamil",
      "computer science vision tamil",
      "computer science mission tamil"
    ],
    "content": "**CSE Department Vision**:\n1. To produce globally competent, innovative and socially responsible computing professionals.\n\n**CSE Department Mission**:\n1. To provide world-class teaching-learning and research facilities.\n2. To stimulate student's logical thinking, creativity, and communication skills effectively.\n3. To cultivate awareness about emerging trends through self-initiative.\n4. To instill a sense of societal and ethical responsibilities.\n5. To collaborate with industries and government organizations.",
    "tamilContent": "## 💻 CSE துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**CSE துறையின் நோக்கம் (Vision)**:\nஉலகளவில் திறமையான, புதுமையான மற்றும் சமூகப் பொறுப்புணர்வு கொண்ட கணினித் தொழில்நுட்ப வல்லுநர்களை உருவாக்குதல்.\n\n**CSE துறையின் குறிக்கோள்கள் (Mission)**:\n1. உலகத் தரம் வாய்ந்த கற்பித்தல்-கற்றல் மற்றும் ஆராய்ச்சி வசதிகளை வழங்குதல்.\n2. மாணவர்களின் தர்க்கரீதியான சிந்தனை, படைப்பாற்றல் மற்றும் தகவல் தொடர்புத் திறன்களை மேம்படுத்துதல்.\n3. சுயமுயற்சியின் மூலம் வளர்ந்து வரும் தொழில்நுட்பப் போக்குகள் குறித்த விழிப்புணர்வை ஏற்படுத்துதல்.\n4. சமூக மற்றும் நெறிமுறைப் பொறுப்புணர்வை மாணவர்களிடம் வளர்த்தல்.\n5. தொழில்துறை நிறுவனங்கள் மற்றும் அரசு நிறுவனங்களுடன் இணைந்து செயல்படுதல்."
  },

  "ece_vision_mission": {
    "title": "ECE Department Vision and Mission",
    "keywords": [
      "ece vision",
      "ece mission",
      "electronics and communication engineering vision",
      "electronics and communication engineering mission"
    ],
    "tamilKeywords": [
      "ஈசிஇ துறையின் நோக்கம்",
      "ஈசிஇ துறையின் குறிக்கோள்",
      "மின்னணுவியல் மற்றும் தொடர்பியல் பொறியியல் துறையின் நோக்கம்",
      "மின்னணுவியல் மற்றும் தொடர்பியல் பொறியியல் துறையின் குறிக்கோள்",
      "ece thuraiyin nokkam",
      "ece thuraiyin kurikkol",
      "ece vision tamil",
      "ece mission tamil",
      "electronics communication vision tamil",
      "electronics communication mission tamil"
    ],
    "content": "**ECE Department Vision**:\nTo produce Electronics and Communication Engineers capable of generating a knowledge economy with social responsibility.\n\n**ECE Department Mission**:\nTo impart high quality education with ethical behaviour.\n2. To equip the students compatible with recent trends in Electronic industries.\n3. To develop leadership qualities with humanity, wisdom, creativity and team spirit\n4. To provide a passionate environment for continual learning.",
    "tamilContent": "## 📡 ECE துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**ECE துறையின் நோக்கம் (Vision)**:\nசமூகப் பொறுப்புணர்வுடன் அறிவுசார் பொருளாதாரத்தை உருவாக்கும் திறன் கொண்ட மின்னணுவியல் மற்றும் தொடர்பியல் பொறியாளர்களை உருவாக்குதல்.\n\n**ECE துறையின் குறிக்கோள்கள் (Mission)**:\n1. உயர்தரமான கல்வியை நெறிமுறை நடத்தையுடன் வழங்குதல்.\n2. மின்னணுத் தொழில்துறையில் சமீபத்திய தொழில்நுட்பப் போக்குகளுக்கு ஏற்ப மாணவர்களைத் திறன்படுத்துதல்.\n3. மனிதநேயம், ஞானம், படைப்பாற்றல் மற்றும் குழு உணர்வுடன் கூடிய தலைமைத்துவப் பண்புகளை வளர்த்தல்.\n4. தொடர்ச்சியான கற்றலுக்கான ஆர்வமிக்க சூழலை உருவாக்குதல்."
  },

  "eee_vision_mission": {
    "title": "EEE Department Vision and Mission",
    "keywords": [
      "eee vision",
      "eee mission",
      "electrical and electronics vision",
      "electrical and electronics mission"
    ],
    "tamilKeywords": [
      "ஈஈஈ துறையின் நோக்கம்",
      "ஈஈஈ துறையின் குறிக்கோள்",
      "மின் மற்றும் மின்னணுவியல் பொறியியல் துறையின் நோக்கம்",
      "மின் மற்றும் மின்னணுவியல் பொறியியல் துறையின் குறிக்கோள்",
      "eee thuraiyin nokkam",
      "eee thuraiyin kurikkol",
      "eee vision tamil",
      "eee mission tamil",
      "electrical electronics vision tamil",
      "electrical electronics mission tamil"
    ],
    "content": "**EEE Department Vision**:\nPromoting active learning, critical thinking coupled with ethical values to meet the global challenges.\n\n**EEE Department Mission**:\n1. To instill state-of-the-art technical knowledge and research capability that will prepare our graduates for professionalism and life-long learning.\n2. To update knowledge to inculcate social and ethical values.\n3. To meet industrial and real-world challenges.",
    "tamilContent": "## ⚡ EEE துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**EEE துறையின் நோக்கம் (Vision)**:\nஉலகளாவிய சவால்களை எதிர்கொள்ளும் வகையில் செயலில் கற்றல், விமர்சன சிந்தனை மற்றும் நெறிமுறை மதிப்புகளை ஒருங்கிணைத்து வளர்த்தல்.\n\n**EEE துறையின் குறிக்கோள்கள் (Mission)**:\n1. நவீன தொழில்நுட்ப அறிவு மற்றும் ஆராய்ச்சித் திறனை வளர்த்து, பட்டதாரிகளை தொழில்முறை வாழ்க்கைக்கும் வாழ்நாள் முழுவதும் கற்றலுக்கும் தயார்படுத்துதல்.\n2. அறிவைப் புதுப்பித்து, சமூக மற்றும் நெறிமுறை மதிப்புகளை வளர்த்தல்.\n3. தொழில்துறை மற்றும் நிஜ உலகச் சவால்களை எதிர்கொள்ளும் திறனை வளர்த்தல்."
  },

  "mech_vision_mission": {
    "title": "MECH Department Vision and Mission",
    "keywords": [
      "mech vision",
      "mech mission",
      "mechanical vision",
      "mechanical mission"
    ],
    "tamilKeywords": [
      "மெக்கானிக்கல் துறையின் நோக்கம்",
      "மெக்கானிக்கல் துறையின் குறிக்கோள்",
      "இயந்திரவியல் துறையின் நோக்கம்",
      "இயந்திரவியல் துறையின் குறிக்கோள்",
      "mech thuraiyin nokkam",
      "mech thuraiyin kurikkol",
      "mechanical thurai nokkam",
      "mechanical thurai kurikkol",
      "mech vision tamil",
      "mech mission tamil",
      "mechanical vision tamil",
      "mechanical mission tamil"
    ],
    "content": "**MECH Department Vision**:\nProducing globally competitive Mechanical Engineers with social responsibilities.\n\n**MECH Department Mission**:\n1. Imparting quality education by providing excellent Teaching-Learning environment.\n2. Inculcating qualities of continuous learning, professionalism, team spirit, communication skill and leadership with social responsibilities.\n3. Promoting leading-edge research and development through collaboration with academia and industry.",
    "tamilContent": "## ⚙️ MECH துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**MECH துறையின் நோக்கம் (Vision)**:\nசமூகப் பொறுப்புணர்வுடன் உலகளவில் போட்டியிடக்கூடிய இயந்திரவியல் பொறியாளர்களை உருவாக்குதல்.\n\n**MECH துறையின் குறிக்கோள்கள் (Mission)**:\n1. சிறந்த கற்பித்தல்-கற்றல் சூழலை வழங்குவதன் மூலம் தரமான கல்வியை வழங்குதல்.\n2. தொடர்ச்சியான கற்றல், தொழில்முறை அணுகுமுறை, குழு உணர்வு, தகவல் தொடர்புத் திறன் மற்றும் தலைமைத்துவப் பண்புகளை சமூகப் பொறுப்புணர்வுடன் வளர்த்தல்.\n3. கல்வி நிறுவனங்கள் மற்றும் தொழில்துறையுடன் இணைந்து நவீன ஆராய்ச்சி மற்றும் மேம்பாட்டை ஊக்குவித்தல்."
  },

  "civil_vision_mission": {
    "title": "CIVIL Department Vision and Mission",
    "keywords": [
      "civil vision",
      "civil mission",
      "civil engineering vision",
      "civil engineering mission"
    ],
    "tamilKeywords": [
      "சிவில் துறையின் நோக்கம்",
      "சிவில் துறையின் குறிக்கோள்",
      "கட்டிடப் பொறியியல் துறையின் நோக்கம்",
      "கட்டிடப் பொறியியல் துறையின் குறிக்கோள்",
      "civil thuraiyin nokkam",
      "civil thuraiyin kurikkol",
      "civil engineering nokkam",
      "civil engineering kurikkol",
      "civil vision tamil",
      "civil mission tamil"
    ],
    "content": "**CIVIL Department Vision**:\nProducing outstanding civil engineering professionals with human values to face future challenges\n\n**CIVIL Department Mission**:\n1.To provide with excellent teaching and research ambience.\n2. To prepare student for leadership roles in civil engineering.\n3. To facilitate student with lifetime skills and human values.\n4. To collaborate with industries to meet the ever challenging environment.",
    "tamilContent": "## 🏗️ CIVIL துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**CIVIL துறையின் நோக்கம் (Vision)**:\nஎதிர்கால சவால்களை எதிர்கொள்ளும் வகையில் மனிதநேய மதிப்புகளுடன் சிறந்த கட்டிடப் பொறியியல் வல்லுநர்களை உருவாக்குதல்.\n\n**CIVIL துறையின் குறிக்கோள்கள் (Mission)**:\n1. சிறந்த கற்பித்தல் மற்றும் ஆராய்ச்சிக்கான சூழலை வழங்குதல்.\n2. கட்டிடப் பொறியியல் துறையில் தலைமைத்துவப் பொறுப்புகளை ஏற்க மாணவர்களைத் தயார்படுத்துதல்.\n3. வாழ்நாள் முழுவதும் பயன்படும் திறன்கள் மற்றும் மனிதநேய மதிப்புகளை மாணவர்களிடம் வளர்த்தல்.\n4. தொடர்ந்து மாறிவரும் சவாலான சூழலை எதிர்கொள்ள தொழில்துறை நிறுவனங்களுடன் இணைந்து செயல்படுதல்."
  },

  "it_vision_mission": {
    "title": "IT Department Vision and Mission",
    "keywords": [
      "it vision",
      "it mission",
      "information technology vision",
      "information technology mission"
    ],
    "tamilKeywords": [
      "ஐடி துறையின் நோக்கம்",
      "ஐடி துறையின் குறிக்கோள்",
      "தகவல் தொழில்நுட்ப துறையின் நோக்கம்",
      "தகவல் தொழில்நுட்ப துறையின் குறிக்கோள்",
      "it thuraiyin nokkam",
      "it thuraiyin kurikkol",
      "information technology nokkam",
      "information technology kurikkol",
      "it vision tamil",
      "it mission tamil"
    ],
    "content": "**IT Department Vision**:\nTo produce technically competent and value based IT Professionals to meet the current challenges of the modern IT industry.\n\n**IT Department Mission**:\n1. Imparting quality education with innovative components in teaching learning process.\n2. Conducting student centric programme to enhance communication, team spirit, leadership skills and self learning.\n3. Motivating the students to realize the need of ethics and human values.\n4. Developing a conducive environment for collaborative research.",
    "tamilContent": "## 🖥️ IT துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**IT துறையின் நோக்கம் (Vision)**:\nநவீன தகவல் தொழில்நுட்பத் துறையின் தற்போதைய சவால்களை எதிர்கொள்ளும் வகையில் தொழில்நுட்பத் திறனும் மதிப்புகளும் கொண்ட தகவல் தொழில்நுட்ப வல்லுநர்களை உருவாக்குதல்.\n\n**IT துறையின் குறிக்கோள்கள் (Mission)**:\n1. கற்பித்தல்-கற்றல் செயல்முறையில் புதுமையான கூறுகளுடன் தரமான கல்வியை வழங்குதல்.\n2. தகவல் தொடர்பு, குழு உணர்வு, தலைமைத்துவத் திறன் மற்றும் சுய கற்றலை மேம்படுத்த மாணவர் மையப்படுத்தப்பட்ட நிகழ்ச்சிகளை நடத்துதல்.\n3. நெறிமுறைகள் மற்றும் மனிதநேய மதிப்புகளின் அவசியத்தை மாணவர்கள் உணர ஊக்குவித்தல்.\n4. கூட்டு ஆராய்ச்சிக்கு ஏற்ற சூழலை உருவாக்குதல்."
  },

  "aids_vision_mission": {
    "title": "AIDS Department Vision and Mission",
    "keywords": [
      "aids vision",
      "aids mission",
      "artificial intelligence and data science vision",
      "artificial intelligence and data science mission"
    ],
    "tamilKeywords": [
      "ஏஐடிஎஸ் துறையின் நோக்கம்",
      "ஏஐடிஎஸ் துறையின் குறிக்கோள்",
      "செயற்கை நுண்ணறிவு மற்றும் தரவு அறிவியல் துறையின் நோக்கம்",
      "செயற்கை நுண்ணறிவு மற்றும் தரவு அறிவியல் துறையின் குறிக்கோள்",
      "aids thuraiyin nokkam",
      "aids thuraiyin kurikkol",
      "artificial intelligence data science nokkam",
      "artificial intelligence data science kurikkol",
      "aids vision tamil",
      "aids mission tamil",
      "ai data science vision tamil",
      "ai data science mission tamil"
    ],
    "content": "**AIDS Department Vision**:\nTo Produce globally competent, innovative, Computing professionals to meet current challenges in the field of Artificial intelligence and Data Science with social responsibilities.\n\n**AIDS Department Mission**:\n1. Offering well-balanced curriculum with state of the art technologies to impart professional competencies and transferable skills.\n2. Bringing innovations in Teaching-Learning process through experienced learning and project/product based learning.\n3. Collaborating National and International Industries and Academia to develop foresight technologies in Artificial intelligence and Data Science.",
    "tamilContent": "## 🤖 AIDS துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**AIDS துறையின் நோக்கம் (Vision)**:\nசெயற்கை நுண்ணறிவு மற்றும் தரவு அறிவியல் துறையில் தற்போதைய சவால்களை எதிர்கொள்ளும் வகையில், சமூகப் பொறுப்புணர்வுடன் உலகளவில் திறமையான, புதுமையான கணினித் தொழில்நுட்ப வல்லுநர்களை உருவாக்குதல்.\n\n**AIDS துறையின் குறிக்கோள்கள் (Mission)**:\n1. தொழில்முறை திறன்கள் மற்றும் பல்துறை பயன்பாட்டுத் திறன்களை வழங்கும் வகையில் நவீன தொழில்நுட்பங்களுடன் சமநிலையான பாடத்திட்டத்தை வழங்குதல்.\n2. அனுபவக் கற்றல் மற்றும் திட்டம்/தயாரிப்பு அடிப்படையிலான கற்றல் மூலம் கற்பித்தல்-கற்றல் செயல்முறையில் புதுமைகளை ஏற்படுத்துதல்.\n3. செயற்கை நுண்ணறிவு மற்றும் தரவு அறிவியல் துறைகளில் எதிர்கால தொழில்நுட்பங்களை உருவாக்க தேசிய மற்றும் சர்வதேச தொழில்துறை நிறுவனங்கள் மற்றும் கல்வி நிறுவனங்களுடன் இணைந்து செயல்படுதல்."
  },

  "sh_vision_mission": {
    "title": "S&H Department Vision and Mission",
    "keywords": [
      "s&h vision",
      "s&h mission",
      "science and humanities vision",
      "science and humanities mission"
    ],
    "tamilKeywords": [
      "அறிவியல் மற்றும் மனிதநேயத் துறையின் நோக்கம்",
      "அறிவியல் மற்றும் மனிதநேயத் துறையின் குறிக்கோள்",
      "அறிவியல் மற்றும் மனிதநேய துறை நோக்கம்",
      "அறிவியல் மற்றும் மனிதநேய துறை குறிக்கோள்",
      "s and h thuraiyin nokkam",
      "s and h thuraiyin kurikkol",
      "science humanities nokkam",
      "science humanities kurikkol",
      "s&h vision tamil",
      "s&h mission tamil",
      "science humanities vision tamil",
      "science humanities mission tamil"
    ],
    "content": "**S&H Department Vision**:\nProducing potentially competent freshman engineers with leadership qualities and human values.\n\n**S&H Department Mission**:\n1. To impart engineering fundamentals by providing Basic Science and Mathematics.\n2. To stimulate reading, listening and writing skills.\n3. To promote innovative culture among the students.",
    "tamilContent": "## 📚 S&H துறையின் நோக்கம் மற்றும் குறிக்கோள்\n\n**S&H துறையின் நோக்கம் (Vision)**:\nதிறமையான, தலைமைத்துவப் பண்புகள் மற்றும் மனிதநேய மதிப்புகளைக் கொண்ட முதலாம் ஆண்டு பொறியியல் மாணவர்களை உருவாக்குதல்.\n\n**S&H துறையின் குறிக்கோள்கள் (Mission)**:\n1. அடிப்படை அறிவியல் மற்றும் கணிதத்தின் மூலம் பொறியியல் அடிப்படைக் கருத்துகளை கற்பித்தல்.\n2. மாணவர்களின் வாசிப்பு, கேட்டல் மற்றும் எழுதும் திறன்களை மேம்படுத்துதல்.\n3. மாணவர்களிடையே புதுமையான சிந்தனை மற்றும் கலாச்சாரத்தை ஊக்குவித்தல்."
  }
};

// Programmatically sanitize and deduplicate all keyword lists
const knowledgeBase = {};
for (const [categoryKey, data] of Object.entries(rawKnowledgeBase)) {
  const sanitizeList = (list) => {
    if (!Array.isArray(list)) return [];
    const cleaned = list.map(item => item.replace(/[?.,!]/g, '').trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(cleaned));
  };

  knowledgeBase[categoryKey] = {
    ...data,
    keywords: sanitizeList(data.keywords),
    tamilKeywords: sanitizeList(data.tamilKeywords)
  };
}

const outputDir = path.resolve(__dirname, '../src/knowledge');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'knowledge_base.json'),
  JSON.stringify(knowledgeBase, null, 2),
  'utf8'
);

console.log('✅ Precomputed knowledge base with honorific "அவர்கள்" written to chatbot/src/knowledge/knowledge_base.json successfully!');
