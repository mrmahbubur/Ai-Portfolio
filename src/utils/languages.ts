export interface LanguageOption {
  code: string; // BCP-47 code e.g. 'en-US'
  name: string;
  nativeName: string;
  flag?: string;
  regionHint?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸', regionHint: 'Primary & Default' },
  { code: 'bn-BD', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', regionHint: 'বাংলা' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', regionHint: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷', regionHint: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', regionHint: 'Deutsch' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', regionHint: 'العربية' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', regionHint: 'हिन्दी' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', regionHint: '日本語' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', regionHint: '简体中文' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', regionHint: 'Português' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', regionHint: 'Italiano' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', regionHint: 'Русский' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', regionHint: 'Türkçe' },
  { code: 'ur-PK', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', regionHint: 'اردو' },
];

export const LOCALIZED_GREETINGS: Record<string, string> = {
  'en-US':
    "Hello and welcome! I am Camellia, personal concierge for M R S. Thank you for stopping by today. M R S is an IT Support Professional, Web Manager, and Digital Entrepreneur dedicated to high-uptime systems and seamless digital administration. Feel free to explore any project card or section, and I’ll walk you through the details.",
  'bn-BD':
    "হ্যালো এবং স্বাগতম। আমি ক্যামেলিয়া (এম আর এস অ্যাসিস্ট্যান্ট), এম আর এস-এর ব্যক্তিগত ডিজিটাল প্রতিনিধি। এম আর এস-এর অফিসিয়াল পোর্টফোলিওতে আপনাকে স্বাগতম। তিনি একজন আইটি সাপোর্ট প্রফেশনাল, ওয়েব ম্যানেজার এবং উদ্যোক্তা। যে কোনো সেকশনে ক্লিক করুন, আমি আপনাকে বুঝিয়ে বলব।",
  'es-ES':
    "Hola y bienvenido. Soy Camellia, Asistente M R S, la conserje personal dedicada de M R S. Es un placer presentarle su portafolio oficial. Es un profesional de soporte de TI, gestor web y emprendedor digital. Haga clic en cualquier sección para comenzar.",
  'fr-FR':
    "Bonjour et bienvenue. Je suis Camellia, l'Assistante M R S, la concierge personnelle dédiée de M R S. C'est un plaisir de vous présenter son portfolio officiel. N'hésitez pas à cliquer sur une section pour la découvrir.",
  'de-DE':
    "Hallo und herzlich willkommen. Ich bin Camellia, M R S Assistentin, die persönliche Concierge für M R S. Ich freue mich, Ihnen sein offizielles Portfolio vorstellen zu dürfen. Klicken Sie auf einen beliebigen Bereich für Details.",
  'ar-SA':
    "مرحباً بكم وأهلاً وسهلاً. أنا كاميليا (المساعد الشخصي لـ M R S). يسعدني أن أقدم لكم محفظة أعماله وخبراته التقنية. انقر على أي قسم وسأقوم بشرحه لكم بكل سرور.",
  'hi-IN':
    "नमस्ते और स्वागत है। मैं कैमेलिया (M R S डिजिटल सहायक) हूँ। M R S के आधिकारिक पोर्टफोलियो में आपका स्वागत है। किसी भी सेक्शन पर क्लिक करें, मैं आपको विस्तार से बताऊँगा।",
  'ja-JP':
    "こんにちは、ようこそ。私はカメリア、M R Sのパーソナルコンシェルジュアシスタントです。M R Sの公式ポートフォリオをご案内いたします。気になるセクションをクリックしてください。",
  'zh-CN':
    "您好，欢迎光临。我是卡蜜莉亚（Camellia），M R S 的个人数字助理。很高兴向您介绍 M R S 的官方作品集。您可以点击任何部分了解详细内容。",
  'pt-BR':
    "Olá e seja bem-vindo. Sou Camellia, a Assistente M R S, o concierge pessoal de M R S. É um prazer apresentar seu portfólio oficial. Clique em qualquer seção para ouvir a explicação.",
  'it-IT':
    "Ciao e benvenuto. Sono Camellia, l'Assistente M R S, il concierge personale di M R S. È un piacere presentarti il suo portfolio ufficiale. Clicca su qualsiasi sezione per ascoltare la guida.",
  'ru-RU':
    "Здравствуйте и добро пожаловать. Я Камелия, персональный ассистент M R S. Рад представить вам официальное портфолио M R S. Нажмите на любой раздел, и я расскажу о нём подробнее.",
  'tr-TR':
    "Merhaba ve hoş geldiniz. Ben Camellia, M R S'in kişisel asistanıyım. M R S'in resmi portföyünü size sunmaktan mutluluk duyuyorum. Bilgi almak için herhangi bir bölüme tıklayabilirsiniz.",
  'ur-PK':
    "السلام علیکم اور خوش آمدید۔ میں کیمیلیا، M R S کا ذاتی ڈیجیٹل اسسٹنٹ ہوں۔ M R S کے باضابطہ پورٹ فولیو میں آپ کا خیر مقدم ہے۔ کسی بھی سیکশন پر کلک کریں، میں آپ کی رہنمائی کروں گا۔",
};

/**
 * Multiple distinctive introducing speech variations ensuring returning visitors
 * experience a fresh, engaging, and different opening every time.
 */
export const LOCALIZED_GREETINGS_VARIATIONS: Record<string, string[]> = {
  'en-US': [
    // Variation 1: Warm & Direct Professional Welcome
    "Hello and welcome! I am Camellia, personal concierge for M R S. Thank you for stopping by today. M R S is an IT Support Professional, Web Manager, and Digital Entrepreneur dedicated to high-uptime systems and seamless digital administration. Feel free to explore any project card or section, and I’ll walk you through the details.",

    // Variation 2: Interactive Storyteller & Portfolio Overview
    "Welcome in! My name is Camellia, and I am honored to be your interactive guide through M R S’s verified portfolio. Here you’ll discover a spectrum of work spanning remote IT administration, technical publications, enterprise web hubs, and humanitarian initiatives. Whenever you're ready, tap any project or category to hear the full story.",

    // Variation 3: Technical & Operational Focus
    "Greetings, and a very warm welcome. I am Camellia, your personal concierge here for M R S. From hands-on system troubleshooting and Microsoft 365 administration to autonomous digital ventures, M R S combines technical precision with steady reliability. Take a look around, or click any card and let's explore together.",

    // Variation 4: Conversational & Fresh Welcome
    "Hello there, and welcome aboard! I am Camellia, M R S Assistant. Whether you're here to review verified credentials, explore live web platforms, or discuss a technical collaboration, I'm delighted to assist you. Simply choose any section that catches your eye, and I'll share all the highlights.",

    // Variation 5: Thoughtful & Holistic Perspective
    "A wonderful day to you, and welcome. I am Camellia, representing M R S and his digital workspace. Built upon years of disciplined remote administration and creative web engineering, this portfolio brings together his certified IT skills and active platforms. Feel free to ask me anything or click through the showcased ventures.",

    // Variation 6: Modern Digital Hub Invitation
    "Welcome! It’s great to have you here. I am Camellia, M R S’s dedicated assistant. Across this space, you’ll find everything from IT infrastructure management and curated troubleshooting guides to live streaming hubs and community projects. Click on any area to get started, and I’ll be your voice along the way.",

    // Variation 7: Executive & Creative Showcase
    "Hello, and welcome to M R S’s verified digital portfolio. I am Camellia, your interactive concierge. As an IT Support Specialist, Web Manager, and Entrepreneur, M R S focuses on building reliable, client-centered solutions. Every card you see is interactive — select whichever interests you, and I’ll be glad to give you the insider tour.",

    // Variation 8: Dynamic Problem-Solving & Service Focus
    "Good day, and welcome to M R S’s digital portfolio. I am Camellia, his interactive assistant. Whether troubleshooting complex software tickets or managing digital platforms from the ground up, M R S believes in clean execution and dependable service. Explore the cards at your own pace, or tap any link to learn more.",
  ],

  'bn-BD': [
    "হ্যালো এবং স্বাগতম। আমি ক্যামেলিয়া (এম আর এস অ্যাসিস্ট্যান্ট), এম আর এস-এর ব্যক্তিগত ডিজিটাল প্রতিনিধি। এম আর এস-এর অফিসিয়াল পোর্টফোলিওতে আপনাকে স্বাগতম। তিনি একজন আইটি সাপোর্ট প্রফেশনাল, ওয়েব ম্যানেজার এবং উদ্যোক্তা। যে কোনো সেকশনে ক্লিক করুন, আমি আপনাকে বুঝিয়ে বলব।",
    "স্বাগতম! আমি ক্যামেলিয়া, এম আর এস-এর ব্যক্তিগত কনসিয়ার্জ। এখানে আপনি তাঁর রিমোট আইটি সাপোর্ট, টেকনিক্যাল ব্লগ, লাইভ ওয়েব প্ল্যাটফর্ম এবং সামাজিক উদ্যোগসমূহ দেখতে পাবেন। যেকোনো কার্ডে ক্লিক করে বিস্তারিত জেনে নিতে পারেন।",
    "নমস্কার ও আন্তরিক শুভেচ্ছা। আমি ক্যামেলিয়া, এম আর এস-এর ডিজিটাল প্রতিনিধি। দূরবর্তী আইটি সহায়তা ও ওয়েবসাইট পরিচালনায় এম আর এস সর্বদা নিবেদিতপ্রাণ। তাঁর কাজের ক্ষেত্র ও প্রকল্পগুলো ঘুরে দেখতে যে কোনো সেকশনে ক্লিক করুন।",
    "শুভ দিন এবং এম আর এস-এর অফিশিয়াল প্রোফাইলে স্বাগতম! আমি ক্যামেলিয়া। মাইক্রোসফট ৩৬৫, ট্রাবলশুটিং এবং আধুনিক ডিজিটাল প্ল্যাটফর্ম নিয়ে তাঁর অভিজ্ঞতা জানতে সঙ্গে থাকুন এবং যে কোনো প্রশ্ন করতে পারেন।",
  ],

  'es-ES': [
    "Hola y bienvenido. Soy Camellia, Asistente M R S, la conserje personal dedicada de M R S. Es un placer presentarle su portafolio oficial. Es un profesional de soporte de TI, gestor web y emprendedor digital. Haga clic en cualquier sección para comenzar.",
    "¡Le damos una cordial bienvenida! Mi nombre es Camellia y seré su guía interactiva a través del portafolio verificado de M R S. Desde administración remota de TI hasta plataformas web activas, explore cualquier tarjeta para conocer los detalles.",
    "Saludos cordiales. Soy Camellia, conserje personal de M R S. Conozca su experiencia técnica en soporte de sistemas, gestión web y proyectos digitales independientes. Haga clic en cualquier sección para comenzar nuestro recorrido.",
  ],

  'fr-FR': [
    "Bonjour et bienvenue. Je suis Camellia, l'Assistante M R S, la concierge personnelle dédiée de M R S. C'est un plaisir de vous présenter son portfolio officiel. N'hésitez pas à cliquer sur une section pour la découvrir.",
    "Bienvenue à vous! Je m'appelle Camellia et j'ai l'honneur de vous guider à travers l'espace numérique vérifié de M R S. Du support informatique à distance à la gestion web, cliquez sur la section de votre choix pour en savoir plus.",
    "Très chaleureuse bienvenue. Je suis Camellia, votre concierge interactive pour M R S. Découvrez son expertise technique, ses plateformes en ligne et ses projets humanitaires en explorant les cartes interactives.",
  ],

  'de-DE': [
    "Hallo und herzlich willkommen. Ich bin Camellia, M R S Assistentin, die persönliche Concierge für M R S. Ich freue mich, Ihnen sein offizielles Portfolio vorstellen zu dürfen. Klicken Sie auf einen beliebigen Bereich für Details.",
    "Willkommen! Mein Name ist Camellia und ich begleite Sie gerne durch das verifizierte Portfolio von M R S. Von professionellem IT-Support und Microsoft 365 bis hin zu Web-Management: Klicken Sie einfach auf eine Karte.",
    "Schön, dass Sie hier sind. Ich bin Camellia, persönliche Assistentin von M R S. Erkunden Sie seine technischen Zertifizierungen, Plattformen und Projekte ganz nach Ihrem Tempo.",
  ],

  'ar-SA': [
    "مرحباً بكم وأهلاً وسهلاً. أنا كاميليا (المساعد الشخصي لـ M R S). يسعدني أن أقدم لكم محفظة أعماله وخبراته التقنية. انقر على أي قسم وسأقوم بشرحه لكم بكل سرور.",
    "أهلاً ومرحباً بكم في الموقع الرقمي الموثق لـ M R S. أنا كاميليا، مرشدتكم التفاعلية. استكشفوا خدمات الدعم الفني، وإدارة المواقع، والمشاريع المتنوعة بالضغط على أي قسم.",
    "تحية طيبة وترحيب حار. أنا كاميليا المساعدة الشخصية لـ M R S. يسعدني مرافقتكم في جولة عبر مهاراته التقنية وخبراته في الإدارة عن بُعد.",
  ],

  'hi-IN': [
    "नमस्ते और स्वागत है। मैं कैमेलिया (M R S डिजिटल सहायक) हूँ। M R S के आधिकारिक पोर्टफोलियो में आपका स्वागत है। किसी भी सेक्शन पर क्लिक करें, मैं आपको विस्तार से बताऊँगा।",
    "सादर अभिनंदन! मेरा नाम कैमेलिया है और मैं M R S के सत्यापित पोर्टफोलियो में आपकी मार्गदर्शिका हूँ। रिमोट आईटी सहायता से लेकर लाइव वेब प्लेटफ़ॉर्म तक, किसी भी कार्ड पर क्लिक करके विस्तृत जानकारी प्राप्त करें।",
    "नमस्कार! M R S के आधिकारिक डिजिटल स्पेस में आपका स्वागत है। मैं कैमेलिया हूँ। उनकी तकनीकी विशेषज्ञता, सिस्टम ट्रबलशूटिंग और प्रोजेक्ट्स को देखने के लिए किसी भी सेक्शन को चुनें।",
  ],

  'ja-JP': [
    "こんにちは、ようこそ。私はカメリア、M R Sのパーソナルコンシェルジュアシスタントです。M R Sの公式ポートフォリオをご案内いたします。気になるセクションをクリックしてください。",
    "ようこそお越しくださいました。M R Sのインタラクティブガイド、カメリアです。リモートITサポートからWeb管理、公開プロジェクトまで、各カードをクリックして詳しくご覧いただけます。",
    "ご訪問ありがとうございます。カメリアと申します。M R Sの認証済み経歴や専門スキル、多彩なプラットフォームを分かりやすくご案内いたします。",
  ],

  'zh-CN': [
    "您好，欢迎光临。我是卡蜜莉亚（Camellia），M R S 的个人数字助理。很高兴向您介绍 M R S 的官方作品集。您可以点击任何部分了解详细内容。",
    "欢迎访问！我是卡蜜莉亚，担任 M R S 官方作品集的交互式向导。从远程 IT 支持到数字化平台运营，点击任意卡片即可听取详细介绍。",
    "大家好，欢迎来到 M R S 的数字主页。我是助理卡蜜莉亚。欢迎随时点击感兴趣的板块，我将为您全面解析各项技术专长与精选项目。",
  ],

  'pt-BR': [
    "Olá e seja bem-vindo. Sou Camellia, a Assistente M R S, o concierge pessoal de M R S. É um prazer apresentar seu portfólio oficial. Clique em qualquer seção para ouvir a explicação.",
    "Boas-vindas! Meu nome é Camellia e é uma satisfação guiá-lo pelo portfólio oficial de M R S. Conheça sua atuação em suporte de TI, administração remota e projetos digitais.",
    "Olá! Sou Camellia, assistente pessoal de M R S. Sinta-se à vontade para explorar os cartões de projetos ou clicar em qualquer categoria para saber todos os detalhes.",
  ],

  'it-IT': [
    "Ciao e benvenuto. Sono Camellia, l'Assistente M R S, il concierge personale di M R S. È un piacere presentarti il suo portfolio ufficiale. Clicca su qualsiasi sezione per ascoltare la guida.",
    "Benvenuto! Mi chiamo Camellia e sono onorata di accompagnarti alla scoperta del portfolio di M R S. Dalla gestione IT remota alle piattaforme web, clicca sulle schede per approfondire.",
    "Un caloroso saluto e benvenuto. Sono Camellia, concierge digitale di M R S. Esplora le sue certificazioni, piattaforme e iniziative semplicemente selezionando le varie sezioni.",
  ],

  'ru-RU': [
    "Здравствуйте и добро пожаловать. Я Камелия, персональный ассистент M R S. Рад представить вам официальное портфолио M R S. Нажмите на любой раздел, и я расскажу о нём подробнее.",
    "Добро пожаловать! Меня зовут Камелия, я ваш интерактивный гид по портфолио M R S. От дистанционной поддержки IT до веб-платформ — выберите интересующий раздел для подробностей.",
    "Приветствую вас на официальном сайте M R S. Я Камелия, его персональный консьерж. Познакомьтесь с подтвержденными навыками и проектами, кликнув на любую карточку.",
  ],

  'tr-TR': [
    "Merhaba ve hoş geldiniz. Ben Camellia, M R S'in kişisel asistanıyım. M R S'in resmi portföyünü size sunmaktan mutluluk duyuyorum. Bilgi almak için herhangi bir bölüme tıklayabilirsiniz.",
    "Hoş geldiniz! Adım Camellia; M R S'in doğrulanmış dijital portföyünde size rehberlik etmekten mutluluk duyarım. Uzaktan BT desteğinden canlı web projelerine kadar dilediğiniz kartı seçebilirsiniz.",
    "Merhabalar ve sıcak bir karşılama. Ben M R S Asistanı Camellia. Sistem sorun giderme ve web yönetimi deneyimlerini keşfetmek için bölümlere tıklayarak turumuza katılabilirsiniz.",
  ],

  'ur-PK': [
    "السلام علیکم اور خوش آمدید۔ میں کیمیلیا، M R S کا ذاتی ڈیجیটل اسسٹنٹ ہوں۔ M R S کے باضابطہ پورট فولیو میں آپ کا خیر مقدم ہے۔ کسی بھی سیکشن پر کلک کریں، میں آپ کی رہنمائی کروں گا۔",
    "خوش آمدید! میرا نام کیمیلیا ہے اور میں M R S کے تصدیق شدہ پورٹ فولیو میں آپ کی انٹرایکٹو رہنما ہوں۔ ریموٹ آئی ٹی ایڈمنسٹریشن اور ویب پلیٹ فارمز کے بارے میں جاننے کے لیے کسی بھی کارڈ پر کلک کریں۔",
    "سلام اور دلی خیر مقدم۔ میں کیمیلیا ہوں، M R S کی ذاتی کنسیئرج۔ ان کی تکنیکی صلاحیتوں، مائیکروسافٹ 365 سپورٹ اور فلاحی منصوبوں کو جاننے کے لیے بلا جھجھک دریافت کریں۔",
  ],
};

// In-memory tracker for non-repeating variations
const lastIntroIndices: Record<string, number> = {};

/**
 * Returns a varied introducing speech for the given language code,
 * ensuring that each time it is invoked it starts in a different way
 * and never repeats the immediately preceding variation.
 */
export function getVariedIntroSpeech(code: string = 'en-US'): string {
  const langKey = LOCALIZED_GREETINGS_VARIATIONS[code] ? code : 'en-US';
  const variations = LOCALIZED_GREETINGS_VARIATIONS[langKey] || LOCALIZED_GREETINGS_VARIATIONS['en-US'];

  if (!variations || variations.length === 0) {
    return LOCALIZED_GREETINGS[code] || LOCALIZED_GREETINGS['en-US'];
  }

  if (variations.length === 1) {
    return variations[0];
  }

  // Get previous index from sessionStorage or in-memory map
  let lastIdx = -1;
  const storageKey = `mrs_last_intro_${langKey}`;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored !== null) {
        lastIdx = parseInt(stored, 10);
      }
    }
  } catch {
    // fallback to in-memory
  }

  if (lastIdx === -1 && lastIntroIndices[langKey] !== undefined) {
    lastIdx = lastIntroIndices[langKey];
  }

  // Pick an index different from lastIdx
  const candidates: number[] = [];
  for (let i = 0; i < variations.length; i++) {
    if (i !== lastIdx) candidates.push(i);
  }

  const nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
  lastIntroIndices[langKey] = nextIdx;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(storageKey, nextIdx.toString());
    }
  } catch {
    // ignore
  }

  return variations[nextIdx];
}

/**
 * Returns 'en-US' as default language
 */
export function detectBrowserLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const navLang = navigator.language.toLowerCase();
    const match = SUPPORTED_LANGUAGES.find(
      (l) => l.code.toLowerCase() === navLang || l.code.toLowerCase().startsWith(navLang.split('-')[0])
    );
    if (match) return match.code;
  }
  return 'en-US';
}

/**
 * Look up language details by BCP-47 code
 */
export function getLanguageByCode(code: string): LanguageOption {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  return match || SUPPORTED_LANGUAGES[0];
}

/**
 * Retrieve welcome greeting for a language (now dynamically varied and non-repeating every time)
 */
export function getLocalizedGreeting(code: string = 'en-US', varied = true): string {
  if (varied) {
    return getVariedIntroSpeech(code);
  }
  return LOCALIZED_GREETINGS[code] || LOCALIZED_GREETINGS['en-US'];
}

/**
 * Builds the language directive for system instructions
 */
export function buildMultilingualDirective(languageCode: string = 'en-US'): string {
  const lang = getLanguageByCode(languageCode);
  if (languageCode === 'en-US') {
    return `
LANGUAGE DIRECTIVE:
- Primary Language: English (en-US).
- Speak and respond in natural, calm, polished, conversational English.`;
  }
  return `
LANGUAGE DIRECTIVE:
- Active Language: ${lang.name} (${lang.nativeName}, code: ${lang.code}).
- You MUST speak, explain, narrate, and answer questions fluently in ${lang.name} (${lang.nativeName}).
- Keep your tone calm, gentle, respectful, and articulate.
- Always refer to the site owner as "M R S" and yourself as "Camellia, M R S Assistant" (or localized equivalent).`;
}
