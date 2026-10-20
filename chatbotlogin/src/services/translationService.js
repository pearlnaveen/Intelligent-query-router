/**
 * Translation & Multi-Language Helper Service for English <-> Tamil in ChatbotLogin
 */

const TAMIL_TO_ENGLISH_KEYWORDS = [
  { pattern: /வருகைப்பதிவு|வருகை|அட்டெண்டன்ஸ்|பிரசன்னம்|லீவு|அப்சென்ட்/g, english: 'attendance' },
  { pattern: /சதவீதம்|பர்சென்டேஜ்|சதவீதம் என்ன/g, english: 'percentage' },
  { pattern: /மதிப்பெண்கள்|கிரேடு|சிஜிபிஏ|ஜிபிஏ|தேர்ச்சி|ரிசல்ட்/g, english: 'cgpa gpa grade marks' },
  { pattern: /பாடங்கள்|படிப்புகள்|கோர்ஸ்கள்|பாடம்|நடத்தும் பாடங்கள்/g, english: 'courses subjects' },
  { pattern: /அட்டவணை|டைம் டேபிள்|நேர அட்டவணை|இன்றைய வகுப்புகள்/g, english: 'timetable schedule' },
  { pattern: /வேலைவாய்ப்பு|பிளேஸ்மென்ட்|ப்ளேஸ்மென்ட்|வேலை/g, english: 'placement' },
  { pattern: /சம்பளம்|சம்பள|பேக்கேஜ்|சம்பளப் பொதி/g, english: 'package salary' },
  { pattern: /உயர்ந்த|அதிகபட்ச|அதிக|மிகப்பெரிய|டாப்/g, english: 'highest' },
  { pattern: /சராசரி/g, english: 'average' },
  { pattern: /நிறுவனங்கள்|கம்பெனி|நிறுவனம்/g, english: 'companies' },
  { pattern: /விடுதி|ஹோஸ்டல்/g, english: 'hostel' },
  { pattern: /நூல்நிலையம்|லைப்ரரி|நூலகம்/g, english: 'library' },
  { pattern: /கட்டணம்|ஃபீஸ்/g, english: 'fees' }
];

export function containsTamilText(text) {
  if (!text) return false;
  return /[\u0B80-\u0BFF]/.test(text);
}

export function preprocessTamilQuery(query) {
  if (!query) return query;
  let text = query.toLowerCase();

  for (const item of TAMIL_TO_ENGLISH_KEYWORDS) {
    text = text.replace(item.pattern, ` ${item.english} `);
  }

  return text;
}

export function translateResponseToTamil(intent, content, data = {}) {
  switch (intent) {
    case 'student_overall_attendance': {
      const { att, name, regno } = data;
      if (!att || att.totalDays === 0) {
        return `மாணவர் **${name || regno}** அவர்களுக்கு வருகைப்பதிவு விவரங்கள் ஏதும் தரவுத்தளத்தில் இல்லை.`;
      }
      const isEligible = att.percentage >= 75;
      return `📊 **வருகைப்பதிவு விவரங்கள் (${name || regno})**:\n\n` +
             `- **மொத்த நாட்கள்**: ${att.totalDays} நாட்கள்\n` +
             `- **வருகை தந்த நாட்கள்**: **${att.daysPresent}** நாட்கள்\n` +
             `- **வருகை சதவீதம்**: **${att.percentage}%**\n` +
             `- **தேர்வுத் தகுதி நிலை**: ${isEligible ? '✅ **தேர்வெழுத தகுதி உள்ளது (>= 75%)**' : '⚠️ **வருகைப்பதிவு குறைவு (< 75%)**'}`;
    }

    case 'student_subjectwise_attendance': {
      const { list, name } = data;
      if (!list || list.length === 0) {
        return `பாடவாரியான வருகைப்பதிவு விவரங்கள் ஏதும் கிடைக்கவில்லை.`;
      }
      return `📚 **பாடவாரியான வருகைப்பதிவு விவரங்கள் (${name})**:\n\n` +
             list.map(s => `- **${s.courseCode}** (${s.courseTitle}): **${s.percentage}%** (${s.presentPeriods}/${s.totalPeriods} பீரியடுகள்)`).join('\n');
    }

    case 'student_cgpa_gpa': {
      const { gpaData, name } = data;
      if (!gpaData) return `உங்களது CGPA / GPA விவரங்கள் இன்னும் புதுப்பிக்கப்படவில்லை.`;
      return `🎓 **மதிப்பெண் / CGPA விவரங்கள் (${name})**:\n\n` +
             `- **ஒட்டுமொத்த CGPA**: **${gpaData.cgpa || gpaData.gpa || 'N/A'}**\n` +
             `- **சமீபத்திய செமஸ்டர் GPA**: **${gpaData.gpa || 'N/A'}**\n` +
             `- **ஈட்டிய கிரெடிட்கள்**: ${gpaData.earnedCredits || 'N/A'} / ${gpaData.totalCredits || 'N/A'}`;
    }

    case 'student_courses': {
      const { courses, name } = data;
      if (!courses || courses.length === 0) return `நடப்பு செமஸ்டருக்கான பாடங்கள் ஏதும் பதிவாகவில்லை.`;
      return `📖 **நடப்பு செமஸ்டர் பாடங்கள் (${name})**:\n\n` +
             courses.map(c => `- **${c.courseCode}**: ${c.courseTitle} (${c.credits} Credits, Type: ${c.type || 'Theory'})`).join('\n');
    }

    case 'staff_class_attendance': {
      const { stats, name } = data;
      return `👨‍🏫 **ஆசிரியர் வகுப்புகளின் வருகைப்பதிவுச் சுருக்கம் (${name})**:\n\n` +
             `- **ஒட்டுமொத்த சராசரி வருகைப்பதிவு**: **${stats.percentage}%**\n` +
             `- **நடத்தப்பட்ட மொத்த பாடப்பிரிவுகள் (Classes)**: ${stats.totalSessions}\n` +
             `- **ஒட்டுமொத்த வருகைப் பதிவு எண்ணிக்கை**: ${stats.totalPresent} / ${stats.totalAttendanceRecords}`;
    }

    case 'access_denied_student': {
      return `⚠️ **அனுமதி மறுக்கப்பட்டது**: நீங்கள் ஒரு மாணவர் என்பதால் உங்கள் சொந்த கல்வி மற்றும் வருகைப்பதிவு விவரங்களை மட்டுமே பார்க்க முடியும். பிற மாணவர்களின் தகவல்களை பார்க்க ஆசிரியர்களுக்கு மட்டுமே அனுமதி உண்டு.`;
    }

    default:
      return content;
  }
}
