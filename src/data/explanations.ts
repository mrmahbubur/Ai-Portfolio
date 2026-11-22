import { BioProfile } from '../types';
import { getLocalizedGreeting } from '../utils/languages';

// Comprehensive, rich, multi-lingual narratives covering all sections and projects across 14 global languages
export const SECTION_EXPLANATIONS: Record<string, Record<string, string>> = {
  header: {
    'en-US':
      "Here is M R S's Verified Executive Profile. The owner is M R S, working globally and remotely as an IT Support Professional, Web Manager, Digital Entrepreneur, and Content Creator. Displayed action options allow you to send a direct message, schedule a consultation via Calendly, or open his central Web Hub. As additional information: M R S specializes in remote administrative excellence, high-uptime digital architectures, and end-to-end web management. He brings precision, patience, and verified technical troubleshooting to clients and distributed teams across worldwide time zones.",
    'bn-BD':
      "এটি এম আর এস-এর ভেরিফাইড এক্সিকিউটিভ প্রোফাইল। তিনি একজন আন্তর্জাতিক আইটি সাপোর্ট প্রফেশনাল, ওয়েব ম্যানেজার, ডিজিটাল উদ্যোক্তা এবং কনটেন্ট ক্রিয়েটর। এখান থেকে আপনি সরাসরি ইমেইল পাঠাতে পারেন, ক্যালেন্ডলি দিয়ে মিটিং শিডিউল করতে পারেন বা সেন্ট্রাল হাব ভিজিট করতে পারেন। অতিরিক্ত তথ্য হিসেবে: এম আর এস রিমোট অ্যাডমিনিস্ট্রেশন, হাই-আপটাইম ওয়েব আর্কিটেকচার এবং টেকনিক্যাল ট্রাবলশুটিংয়ে অত্যন্ত দক্ষ ও নির্ভরযোগ্য।",
    'es-ES':
      "Este es el Perfil Ejecutivo Verificado de M R S. Trabaja a nivel global y remoto como Profesional de Soporte de TI, Gestor Web, Emprendedor Digital y Creador de Contenido. Puede enviar un mensaje directo, programar una consulta en Calendly o acceder a su Web Hub central. Información adicional: M R S se especializa en administración remota de alta precisión, arquitecturas web de máxima disponibilidad y resolución experta de problemas técnicos.",
    'fr-FR':
      "Voici le profil exécutif vérifié de M R S. Il travaille à l'échelle mondiale à distance en tant que professionnel du support informatique, gestionnaire web, entrepreneur numérique et créateur de contenu. Vous pouvez envoyer un message direct, planifier une réunion via Calendly ou explorer son Web Hub central.",
    'de-DE':
      "Hier ist das verifizierte Profil von M R S. Er arbeitet global und remote als IT-Support-Spezialist, Webmanager, digitaler Unternehmer und Content-Ersteller. Sie können eine direkte Nachricht senden, ein Treffen über Calendly buchen oder seinen zentralen Web Hub öffnen.",
    'ar-SA':
      "هذا هو الملف التنفيذي الموثق لـ M R S. يعمل عالمياً عن بُعد كمتخصص في دعم تكنولوجيا المعلومات، ومدير مواقع ويب، ورائد أعمال رقمي، ومنشئ محتوى. يمكنك إرسال رسالة مباشرة أو حجز موعد عبر Calendly أو زيارة مركزه الرقمي الرئيسي.",
    'hi-IN':
      "यह M R S का सत्यापित कार्यकारी प्रोफ़ाइल है। वह विश्व स्तर पर रिमोट आईटी सपोर्ट प्रोफेशनल, वेब मैनेजर, डिजिटल उद्यमी और कंटेंट क्रिएटर के रूप में कार्यरत हैं। आप सीधा संदेश भेज सकते हैं या Calendly से मीटिंग शेड्यूल कर सकते हैं।",
    'ja-JP':
      "こちらはM R Sの認証済みエグゼクティブプロフィールです。ITサポート、Web管理、デジタル起業、コンテンツ制作をグローバルに展開しています。直接のメッセージ送信やCalendlyでの相談予約が可能です。",
    'zh-CN':
      "这是 M R S 的官方认证档案。他作为全球远程 IT 支持专家、网站管理员、数字创业者和内容创作者提供专业服务。您可以发送直接消息，或通过 Calendly 预约咨询。",
    'pt-BR':
      "Este é o Perfil Executivo Verificado de M R S. Atuando globalmente de forma remota como Profissional de Suporte de TI, Gestor Web, Empreendedor Digital e Criador de Conteúdo. Você pode enviar uma mensagem direta ou agendar via Calendly.",
    'it-IT':
      "Ecco il profilo verificato di M R S. Lavora a livello globale da remoto come professionista del supporto IT, web manager, imprenditore digitale e creatore di contenuti. Puoi inviare un messaggio diretto o prenotare con Calendly.",
    'ru-RU':
      "Это верифицированный профиль M R S. Он работает дистанционно по всему миру как специалист технической поддержки, веб-менеджер, цифровой предприниматель и автор контента. Доступна отправка сообщений и запись на встречу.",
    'tr-TR':
      "Bu, M R S'in Doğrulanmış Yönetici Profilidir. BT Destek Uzmanı, Web Yöneticisi, Dijital Girişimci ve İçerik Üreticisi olarak küresel ve uzaktan çalışmaktadır. Doğrudan mesaj gönderebilir veya Calendly ile randevu alabilirsiniz.",
    'ur-PK':
      "یہ M R S کا تصدیق شدہ ایگزیکٹو پروفائل ہے۔ وہ عالمی سطح پر ریموٹ آئی ٹی سپورٹ پروفیشنل، ویب مینیجر، ڈیجیٹل انٹرپرینیور اور مواد تخلیق کار کے طور پر کام کرتے ہیں۔",
  },

  bio: {
    'en-US':
      "Here is the About & Professional Summary. M R S highlights: 'I am a dedicated IT support and administrative professional with a strong technical foundation and a genuine passion for solving problems. My expertise centers on Microsoft Office applications, document management, job application processing, and professional email correspondence — skills I apply with precision, patience, and reliability, backed by a solid understanding of system troubleshooting.' As additional details: His career has been forged on remote independence, self-motivation, and disciplined autonomous operations. He has been actively publishing technical articles since 2018, bringing a rich blend of administrative precision, cybersecurity awareness, and clear client communication to every project. Complete credentials and academic background are included inside his downloadable Executive CV.",
    'bn-BD':
      "এখানে রয়েছে এম আর এস-এর জীবনবৃত্তান্ত ও পেশাগত পরিচিতি। এম আর এস বলেন: 'আমি একজন নিবেদিতপ্রাণ আইটি সাপোর্ট ও প্রশাসনিক প্রফেশনাল। মাইক্রোসফট অফিস অ্যাপ্লিকেশন, ডকুমেন্ট ম্যানেজমেন্ট ও ক্লায়েন্ট যোগাযোগে আমার সুদীর্ঘ অভিজ্ঞতা রয়েছে এবং সিস্টেম ট্রাবলশুটিংয়ে দক্ষতা রয়েছে।' অতিরিক্ত তথ্য হিসেবে: ২০১৮ সাল থেকে তিনি নিয়মিত টেকনিক্যাল আর্টিকেল প্রকাশ করছেন এবং রিমোট কাজের স্বনির্ভরতায় অত্যন্ত অভিজ্ঞ। সম্পূর্ণ বিবরণ তাঁর ডাউনলোডযোগ্য সিভিতে সংরক্ষিত আছে।",
    'es-ES':
      "Aquí está el Resumen Profesional y Biografía de M R S. Es un profesional dedicado de soporte de TI y administración con sólida base técnica en Microsoft 365, gestión documental y resolución de problemas. Publica artículos técnicos desde 2018.",
    'fr-FR':
      "Voici le résumé professionnel de M R S. Professionnel dévoué du support informatique et de l'administration, expert en Microsoft 365, gestion de documents et dépannage système depuis 2018.",
    'de-DE':
      "Hier ist die professionelle Zusammenfassung von M R S. Ein engagierter IT-Support- und Verwaltungsprofi mit fundiertem Fachwissen in Microsoft 365, Dokumentenmanagement und System-Troubleshooting.",
    'ar-SA':
      "هنا ملخص السيرة الذاتية المهنية لـ M R S. متخصص متفانٍ في دعم تكنولوجيا المعلومات والإدارة، ولديه خبرة عميقة في تطبيقات مايكروسوفت وإدارة المستندات وحل المشكلات التقنية بدقة.",
    'hi-IN':
      "यहाँ M R S का व्यावसायिक सारांश है। वह एक समर्पित आईटी सहायता और प्रशासनिक पेशेवर हैं, जिन्हें माइक्रोसॉफ्ट 365, दस्तावेज़ प्रबंधन और सिस्टम समस्या निवारण में गहरी विशेषज्ञता हासिल है।",
    'ja-JP':
      "こちらはM R Sの経歴・専門概要です。Microsoft 365、文書管理、システムトラブルシューティングを強みとし、2018年より技術解説を発信しています。",
    'zh-CN':
      "这是 M R S 的个人简介与专业概述。他专注于 IT 支持与数字化管理，在 Microsoft 365、文档管理和系统故障排查方面拥有丰富实践经验。",
    'pt-BR':
      "Aqui está o resumo profissional de M R S. Especialista dedicado em suporte de TI e administração de sistemas com sólida experiência em Microsoft 365 e suporte remoto desde 2018.",
    'it-IT':
      "Ecco il riepilogo professionale di M R S. Professionista dedicato al supporto IT e all'amministrazione, esperto in Microsoft 365, gestione documentale e risoluzione problemi tecnici.",
    'ru-RU':
      "Это профессиональное резюме M R S. Он обладает высокой квалификацией в области системной поддержки, Microsoft 365, документооборота и устранения технических неисправностей.",
    'tr-TR':
      "Burada M R S'in profesyonel özeti yer almaktadır. Microsoft 365, belge yönetimi ve teknik arıza giderme konularında güçlü uzmanlığa sahiptir.",
    'ur-PK':
      "یہاں M R S کا پیشہ ورانہ خلاصہ ہے۔ وہ ایک ماہر آئی ٹی سپورٹ اور انتظامی پیشہ ور ہیں جنہیں مائیکروسافٹ 365 اور سسٹم ٹربل شوٹنگ میں وسیع مہارت حاصل ہے۔",
  },

  verified: {
    'en-US':
      "Here are M R S's Official Profiles & Verified Networks. This section lists his authenticated channels synced from Gravatar: X (@Mrshahinx), GitHub (@mrmahbubur), Bluesky (mrxshahin.bsky.social), LinkedIn (/in/mrmahbubur), WordPress (mrxshahin.wordpress.com), Calendly scheduling, Cloud Admin Portal, direct telephone at +8809611056361, and email at mr216873@gmail.com. As additional information: M R S maintains authenticated identity verification across all major networks.",
    'bn-BD':
      "এখানে এম আর এস-এর অফিসিয়াল ভেরিফাইড প্রোফাইল ও নেটওয়ার্কের তালিকা রয়েছে: গ্রাভাটার, এক্স (টুইটার), গিটহাব, ব্লুস্কাই, লিঙ্কডইন, ওয়ার্ডপ্রেস, ক্যালেন্ডলি, ক্লাউড অ্যাডমিন পোর্টাল, ফোন +৮৮০৯৬১১০৫৬৩৬১ এবং ইমেইল mr216873@gmail.com। এম আর এস সকল প্রধান প্ল্যাটফর্মে ভেরিফাইড পরিচিতি বজায় রাখেন।",
    'es-ES':
      "Aquí están los perfiles oficiales y redes verificadas de M R S: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly, Bluesky, teléfono +8809611056361 y correo mr216873@gmail.com con identidad totalmente autenticada.",
    'fr-FR':
      "Voici les profils officiels et réseaux vérifiés de M R S: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly, Bluesky et email direct mr216873@gmail.com.",
    'de-DE':
      "Hier sind die offiziellen und verifizierten Profile von M R S: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly, Bluesky und E-Mail mr216873@gmail.com.",
    'ar-SA':
      "هنا الحسابات الرسمية والشبكات الموثقة لـ M R S: لينكد إن، جيت هب، إكس، ووردبريس، كالانيدلي، والبريد المباشر mr216873@gmail.com.",
    'hi-IN':
      "यहाँ M R S के आधिकारिक और सत्यापित नेटवर्क हैं: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly और ईमेल mr216873@gmail.com।",
    'ja-JP':
      "こちらはM R Sの認証済み公式SNS・ネットワーク一覧です。Gravatar、LinkedIn、GitHub、X、WordPress、Calendly、メール mr216873@gmail.com などがリンクされています。",
    'zh-CN':
      "这是 M R S 的官方认证社交与专业网络列表，包括 Gravatar、LinkedIn、GitHub、X、WordPress、Calendly 和电子邮箱 mr216873@gmail.com。",
    'pt-BR':
      "Aqui estão as redes e perfis oficiais verificados de M R S: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly e e-mail direto mr216873@gmail.com.",
    'it-IT':
      "Ecco i profili ufficiali e le reti verificate di M R S: Gravatar, LinkedIn, GitHub, X, WordPress, Calendly ed email mr216873@gmail.com.",
    'ru-RU':
      "Здесь представлены официальные подтвержденные профили M R S: LinkedIn, GitHub, X, WordPress, Calendly и электронная почта mr216873@gmail.com.",
    'tr-TR':
      "Burada M R S'in resmi doğrulanmış hesapları listelenmektedir: LinkedIn, GitHub, X, WordPress, Calendly ve mr216873@gmail.com e-posta adresi.",
    'ur-PK':
      "یہاں M R S کے باضابطہ تصدیق شدہ نیٹ ورکس ہیں جن میں LinkedIn، GitHub، X، WordPress، Calendly اور ای میل mr216873@gmail.com شامل ہیں۔",
  },

  links: {
    'en-US':
      "Here are M R S's Featured Platforms & Live Ventures synced directly from Gravatar. All nine active platforms include: All Services hub, IPTV WEB live streaming, Apps Store curated software repository, Private C N encrypted collaboration workspace, Camellia Shop lifestyle e-commerce, Charity Project foundation, BLOGGER tech guides, Camellia Ai studio, and Cloud infrastructure portal. Click any card to inspect or open the live site.",
    'bn-BD':
      "এখানে গ্রাভাটার থেকে রিয়েল-টাইমে সিঙ্ক হওয়া এম আর এস-এর ৯টি লাইভ প্ল্যাটফর্ম ও প্রজেক্ট প্রদর্শিত হচ্ছে: অল সার্ভিসেস, আইপিটিভি ওয়েব, অ্যাপস স্টোর, প্রাইভেট সি এন, ক্যামেলিয়া শপ, চ্যারিটি প্রজেক্ট, ব্লগার টেক ব্লগ, ক্যামেলিয়া এআই এবং ক্লাউড অ্যাডমিন পোর্টাল।",
    'es-ES':
      "Aquí están las 9 plataformas y proyectos activos de M R S sincronizados en tiempo real desde Gravatar: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai y Cloud.",
    'fr-FR':
      "Voici les 9 plateformes et projets actifs de M R S synchronisés en direct depuis Gravatar : All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai et Cloud.",
    'de-DE':
      "Hier sind die 9 Live-Plattformen von M R S direkt aus Gravatar synchronisiert: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai und Cloud.",
    'ar-SA':
      "هنا المنصات والمشاريع التسع النشطة لـ M R S المتزامنة مباشرة من Gravatar: All Services، IPTV WEB، Apps Store، Private C N، Camellia Shop، Charity Project، BLOGGER، Camellia Ai، و Cloud.",
    'hi-IN':
      "यहाँ Gravatar से लाइव सिंक किए गए M R S के सभी 9 प्लेटफॉर्म और प्रोजेक्ट हैं: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai और Cloud।",
    'ja-JP':
      "こちらはGravatarからリアルタイム同期されたM R Sの9個のプラットフォーム一覧です：All Services、IPTV WEB、Apps Store、Private C N、Camellia Shop、Charity Project、BLOGGER、Camellia Ai、Cloud。",
    'zh-CN':
      "这是从 Gravatar 实时同步的 M R S 九大线上平台与项目：All Services、IPTV WEB、Apps Store、Private C N、Camellia Shop、Charity Project、BLOGGER、Camellia Ai 与 Cloud。",
    'pt-BR':
      "Aqui estão as 9 plataformas ativas de M R S sincronizadas em tempo real do Gravatar: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai e Cloud.",
    'it-IT':
      "Ecco le 9 piattaforme live di M R S sincronizzate da Gravatar: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai e Cloud.",
    'ru-RU':
      "Здесь представлены 9 активных платформ M R S, синхронизированных с Gravatar: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai и Cloud.",
    'tr-TR':
      "İşte Gravatar'dan gerçek zamanlı senkronize edilen M R S'in 9 aktif platformu: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai ve Cloud.",
    'ur-PK':
      "یہاں Gravatar سے لائیو سنک ہونے والے M R S کے تمام 9 فعال پلیٹ فارمز موجود ہیں: All Services، IPTV WEB، Apps Store، Private C N، Camellia Shop، Charity Project، BLOGGER، Camellia Ai اور Cloud۔",
  },

  '1-services': {
    'en-US':
      "Here is All Services at mrs-services.ai.studio, M R S's unified digital services directory. It brings together remote IT troubleshooting, Microsoft 365 administration, document formatting, web management, and client onboarding packages into a single clear portal.",
    'bn-BD':
      "এটি অল সার্ভিসেস (mrs-services.ai.studio), এম আর এস-এর রিমোট আইটি সাপোর্ট, মাইক্রোসফট ৩৬৫ ও ওয়েব ম্যানেজমেন্ট পরিষেবাসমূহের সমন্বিত পোর্টাল।",
  },

  '3-apps-store': {
    'en-US':
      "Here is Apps Store at mrmahbubur.github.io/APPS-STORE/, M R S's curated software and utility distribution directory featuring verified Android, Windows, and productivity tools.",
    'bn-BD':
      "এটি অ্যাপস স্টোর (mrmahbubur.github.io/APPS-STORE/), যাচাইকৃত অ্যান্ড্রয়েড, উইন্ডোজ এবং ইউটিলিটি সফটওয়্যার ডাউনলোডের নির্ভরযোগ্য সংগ্রহশালা।",
  },

  '4-pcn': {
    'en-US':
      "Here is Private C N at mrs-pcn.ai.studio, a privacy-first workspace and private community network engineered for secure collaboration, encrypted messaging, and confidential remote workflows.",
    'bn-BD':
      "এটি প্রাইভেট সি এন (mrs-pcn.ai.studio), নিরাপদ যোগাযোগ ও প্রাইভেসি-ফার্স্ট রিমোট কাজের জন্য তৈরি একটি আধুনিক নেটওয়ার্কিং প্ল্যাটফর্ম।",
  },

  '8-camellia-ai': {
    'en-US':
      "Here is Camellia Ai at mrmahbubur.github.io/Camellia-Ai/, M R S's dedicated AI concierge studio showcasing multilingual natural-voice interaction, document intelligence, and smart workflow automation.",
    'bn-BD':
      "এটি ক্যামেলিয়া এআই (mrmahbubur.github.io/Camellia-Ai/), বহুভাষিক ভয়েস এআই ও অটোমেশন প্রযুক্তির বিশেষায়িত স্টুডিও।",
  },

  '9-cloud': {
    'en-US':
      "Here is Cloud at mrmahbubur.github.io/Admin/, M R S's remote administration & cloud systems portal serving as an executive control hub for web operations, infrastructure health, and service delivery.",
    'bn-BD':
      "এটি ক্লাউড (mrmahbubur.github.io/Admin/), এম আর এস-এর রিমোট অ্যাডমিনিস্ট্রেশন ও ওয়েব অপারেশনস কন্ট্রোল হাব।",
  },

  portfolio: {
    'en-US':
      "Here is Ai Portfolio at mrxshahin.ai.studio, M R S's flagship interactive AI portfolio integrating real-time Gravatar synchronization, multimodal Gemini voice streaming, and executive credential presentation.",
    'bn-BD':
      "এটি এআই পোর্টফোলিও (mrxshahin.ai.studio), এম আর এস-এর ইন্টারেক্টিভ ভয়েস এআই ও গ্রাভাটার-সিঙ্কড কেন্দ্রীয় পোর্টফোলিও।",
    'es-ES':
      "Aquí está Ai Portfolio (mrxshahin.ai.studio), el portafolio interactivo con IA de voz en tiempo real y sincronización Gravatar de M R S.",
    'fr-FR':
      "Voici Ai Portfolio (mrxshahin.ai.studio), la vitrine numérique interactive de M R S dotée d'un concierge vocal IA et d'une synchronisation Gravatar en direct.",
    'de-DE':
      "Hier ist Ai Portfolio (mrxshahin.ai.studio), das interaktive KI-Portfolio von M R S mit Echtzeit-Gravatar-Synchronisierung.",
    'ar-SA':
      "هنا Ai Portfolio (mrxshahin.ai.studio)، البوابة التفاعلية المدعومة بالذكاء الاصطناعي المتزامنة مباشرة مع Gravatar.",
    'hi-IN':
      "यह M R S का Ai Portfolio (mrxshahin.ai.studio) है, जो लाइव Gravatar सिंक और इंटरैक्टिव वॉयस AI से लैस है।",
    'ja-JP':
      "こちらはM R SのAi Portfolio（mrxshahin.ai.studio）です。Gravatar同期とリアルタイム音声AIを搭載した主力ポートフォリオです。",
    'zh-CN':
      "这是 M R S 的 Ai Portfolio (mrxshahin.ai.studio)，集成了实时 Gravatar 同步与多模态 AI 语音助手。",
    'pt-BR':
      "Aqui está o Ai Portfolio (mrxshahin.ai.studio), o portfólio interativo com IA de voz e sincronização Gravatar de M R S.",
    'it-IT':
      "Ecco Ai Portfolio (mrxshahin.ai.studio), il portfolio interattivo di M R S con assistente vocale AI e sincronizzazione Gravatar.",
    'ru-RU':
      "Это интерактивное AI-портфолио (mrxshahin.ai.studio) с голосовым ассистентом и синхронизацией Gravatar в реальном времени.",
    'tr-TR':
      "Bu, gerçek zamanlı Gravatar senkronizasyonu ve sesli yapay zeka asistanına sahip Ai Portfolio'dur (mrxshahin.ai.studio).",
    'ur-PK':
      "یہ M R S کا Ai Portfolio (mrxshahin.ai.studio) ہے جو ریئل ٹائم Gravatar سنک اور وائس اے آئی اسسٹنٹ سے آراستہ ہے۔",
  },

  blog: {
    'en-US':
      "Here is the Tech Blog with the Practical Tech Guides badge. It delivers practical, in-depth troubleshooting guides and step-by-step solutions for everyday technology problems and software optimization at mrxshahin.blogspot.com. As additional information: Since 2018, M R S has authored actionable tutorials covering Windows and Linux system maintenance, network troubleshooting, Microsoft 365 optimization, and productivity workflows to help both beginners and experienced technicians resolve complex IT issues.",
    'bn-BD':
      "এটি এম আর এস-এর টেক ব্লগ (mrxshahin.blogspot.com)। ২০১৮ সাল থেকে তিনি এখানে উইন্ডোজ, লিনাক্স, নেটওয়ার্কিং এবং দৈনন্দিন টেকনিক্যাল সমস্যার সহজ ও কার্যকরী সমাধান প্রকাশ করছেন।",
    'es-ES':
      "Aquí está el Blog Técnico (mrxshahin.blogspot.com), con guías prácticas de resolución de problemas en Windows, Linux y optimización de software desde 2018.",
    'fr-FR':
      "Voici le Blog Tech (mrxshahin.blogspot.com), offrant des guides pratiques de dépannage informatique, Windows, Linux et optimisation logicielle.",
    'de-DE':
      "Hier ist der Tech-Blog (mrxshahin.blogspot.com) mit praxisnahen Anleitungen zur Problembehebung bei Windows, Linux und IT-Systemen.",
    'ar-SA':
      "هنا المدونة التقنية (mrxshahin.blogspot.com) التي تقدم شروحات وحلولاً عملية لمشاكل الحاسوب وأنظمة ويندوز ولينكس منذ عام 2018.",
    'hi-IN':
      "यह M R S का टेक ब्लॉग (mrxshahin.blogspot.com) है, जिसमें 2018 से विंडोज़, लिनक्स और सिस्टम समाधान के व्यावहारिक गाइड उपलब्ध हैं।",
    'ja-JP':
      "こちらは技術ブログ（mrxshahin.blogspot.com）です。WindowsやLinuxのトラブルシューティング記事を多数掲載しています。",
    'zh-CN':
      "这是实战技术博客 (mrxshahin.blogspot.com)，自2018年起提供关于 Windows、Linux 系统维护与实战 IT 解决方案。",
    'pt-BR':
      "Aqui está o Blog de Tecnologia (mrxshahin.blogspot.com), com tutoriais práticos de manutenção de sistemas e resolução de problemas.",
    'it-IT':
      "Ecco il Blog Tecnico (mrxshahin.blogspot.com) con guide pratiche di troubleshooting per Windows, Linux e software.",
    'ru-RU':
      "Это технический блог (mrxshahin.blogspot.com), где публикуются пошаговые руководства по настройке Windows, Linux и решению проблем.",
    'tr-TR':
      "Bu, 2018'den beri Windows, Linux ve sistem optimizasyonu üzerine rehberler sunan Pratik Teknik Blog'dur (mrxshahin.blogspot.com).",
    'ur-PK':
      "یہ M R S کا ٹیک بلاگ (mrxshahin.blogspot.com) ہے جو ونڈوز اور لینکس کی ٹربل شوٹنگ پر عملی رہنمائی فراہم کرتا ہے۔",
  },

  iptv: {
    'en-US':
      "Here is Mrs IPTV with the Flagship Streaming badge. It is a premier multimedia streaming network broadcasting over 10,000 live global channels with high availability and a premium ad-free tier. As additional information: Engineered for high reliability, Mrs IPTV utilizes adaptive bitrate streaming, low-latency content delivery networks, resilient media proxy pipelines, and round-the-clock stream health monitoring to deliver smooth live television across desktop, mobile, and smart TV devices.",
    'bn-BD':
      "এটি মিসেস আইপিটিভি (Mrs IPTV), ১০,০০০-এর বেশি লাইভ গ্লোবাল চ্যানেল সহ একটি হাই-অ্যাভেইলেবিলিটি মাল্টিমিডিয়া স্ট্রিমিং নেটওয়ার্ক। এটি ডেস্কটপ, মোবাইল ও স্মার্ট টিভিতে নির্ভরযোগ্য লাইভ টিভি সুবিধা দেয়।",
    'es-ES':
      "Aquí está Mrs IPTV, una red de transmisión multimedia con más de 10,000 canales globales en vivo de alta disponibilidad y streaming adaptativo.",
    'fr-FR':
      "Voici Mrs IPTV, un réseau de streaming multimédia de pointe diffusant plus de 10 000 chaînes mondiales en direct avec haute disponibilité.",
    'de-DE':
      "Hier ist Mrs IPTV, ein erstklassiges Multimedia-Streaming-Netzwerk mit über 10.000 Live-Sendern und adaptiver Bitraten-Technologie.",
    'ar-SA':
      "هنا منصة Mrs IPTV للبث التلفزيوني الحي، وتضم أكثر من 10,000 قناة عالمية مع بنية تحتية سريعة ومستقرة.",
    'hi-IN':
      "यह मिसेज आईपीटीवी (Mrs IPTV) है, जो 10,000 से अधिक लाइव वैश्विक चैनलों के साथ एक प्रीमियम स्ट्रीमिंग नेटवर्क है।",
    'ja-JP':
      "こちらはMrs IPTVです。1万以上のグローバル生放送チャンネルを高可用性で配信するストリーミングネットワークです。",
    'zh-CN':
      "这是 Mrs IPTV 旗舰流媒体平台，提供全球超过 10,000 个直播频道，具备高可用性与自适应码率技术。",
    'pt-BR':
      "Aqui está a Mrs IPTV, rede de streaming multimídia com mais de 10.000 canais globais ao vivo e alta confiabilidade.",
    'it-IT':
      "Ecco Mrs IPTV, una rete di streaming multimediale con oltre 10.000 canali live globali e trasmissione ad alta affidabilità.",
    'ru-RU':
      "Это платформа Mrs IPTV — премиальная сеть потокового вещания с более чем 10 000 глобальных телеканалов в реальном времени.",
    'tr-TR':
      "Bu, 10.000'den fazla küresel canlı kanalı yüksek erişilebilirlikle yayınlayan Mrs IPTV platformudur.",
    'ur-PK':
      "یہ مسز آئی پی ٹی وی ہے جو 10,000 سے زائد لائیو چینلز کے ساتھ اعلیٰ معیار کا اسٹریمنگ نیٹ ورک ہے۔",
  },

  store: {
    'en-US':
      "Here is Camellia Shop at mrmahbubur.github.io/Camellia-Shop/, a modern lifestyle e-commerce storefront curated for fashion essentials, daily products, and streamlined online ordering with dedicated support.",
    'bn-BD':
      "এটি ক্যামেলিয়া শপ (mrmahbubur.github.io/Camellia-Shop/), লাইফস্টাইল ফ্যাশন এবং নিত্যপ্রয়োজনীয় পণ্যের জন্য একটি আধুনিক ই-কমার্স প্ল্যাটফর্ম।",
    'es-ES':
      "Aquí está Camellia Shop (mrmahbubur.github.io/Camellia-Shop/), una tienda moderna de comercio electrónico con moda y productos esenciales.",
    'fr-FR':
      "Voici Camellia Shop (mrmahbubur.github.io/Camellia-Shop/), une boutique en ligne moderne dédiée à la mode et aux essentiels du quotidien.",
    'de-DE':
      "Hier ist Camellia Shop (mrmahbubur.github.io/Camellia-Shop/), eine moderne E-Commerce-Plattform für Lifestyle und Mode.",
    'ar-SA':
      "هنا متجر Camellia Shop الإلكتروني (mrmahbubur.github.io/Camellia-Shop/) للأزياء العصرية ومنتجات الحياة اليومية مع تجربة تسوق سلسة.",
    'hi-IN':
      "यह कैमेलिया शॉप (mrmahbubur.github.io/Camellia-Shop/) है, जो लाइफस्टाइल फैशन और रोजमर्रा के उत्पादों का आधुनिक ई-कॉमर्स प्लेटफॉर्म है।",
    'ja-JP':
      "こちらはCamellia Shop（mrmahbubur.github.io/Camellia-Shop/）です。最新ファッションと日用品を取り揃えたECストアです。",
    'zh-CN':
      "这是 Camellia Shop 现代化电商商城 (mrmahbubur.github.io/Camellia-Shop/)，精选潮流时尚与精选生活好物。",
    'pt-BR':
      "Aqui está a Camellia Shop (mrmahbubur.github.io/Camellia-Shop/), moderna loja virtual de estilo de vida e acessórios.",
    'it-IT':
      "Ecco Camellia Shop (mrmahbubur.github.io/Camellia-Shop/), un negozio e-commerce moderno per moda e prodotti essenziali.",
    'ru-RU':
      "Это интернет-магазин Camellia Shop (mrmahbubur.github.io/Camellia-Shop/) с актуальной одеждой и товарами для жизни.",
    'tr-TR':
      "Bu, yaşam tarzı ve moda ürünleri sunan modern e-ticaret mağazası Camellia Shop'tur (mrmahbubur.github.io/Camellia-Shop/).",
    'ur-PK':
      "یہ کیمیلیا شاپ (mrmahbubur.github.io/Camellia-Shop/) ہے جو فیشن اور روزمرہ مصنوعات کے لیے ایک جدید ای کامرس پلیٹ فارم ہے۔",
  },

  charity: {
    'en-US':
      "Here is the MRS Charity Foundation with the Philanthropic Initiative badge. It is a humanitarian initiative dedicated to expanding access to quality healthcare, youth education, and vital community shelter support. As additional information: Founded on the principle of giving back, this upcoming foundation plans to channel digital enterprise resources directly into grassroots education, medical aid for underserved families, and sustainable community shelter projects.",
    'bn-BD':
      "এটি এমআরএস চ্যারিটি ফাউন্ডেশন (MRS Charity Foundation), সুবিধাবঞ্চিত মানুষের স্বাস্থ্যসেবা, যুব শিক্ষা ও সামাজিক আশ্রয়ের জন্য একটি মানবিক উদ্যোগ।",
    'es-ES':
      "Aquí está la MRS Charity Foundation, una iniciativa humanitaria dedicada a la atención médica, educación juvenil y apoyo comunitario.",
    'fr-FR':
      "Voici la Fondation caritative MRS, une initiative humanitaire dédiée à la santé, l'éducation des jeunes et l'aide communautaire.",
    'de-DE':
      "Hier ist die MRS Charity Foundation, eine philanthropische Initiative für Gesundheitsförderung, Bildung und soziale Unterstützung.",
    'ar-SA':
      "هنا مؤسسة MRS الخيرية، وهي مبادرة إنسانية تهدف لدعم الرعاية الصحية وتعليم الشباب والمساعدات المجتمعية.",
    'hi-IN':
      "यह एमआरएस चैरिटी फाउंडेशन है, जो स्वास्थ्य सेवा, युवा शिक्षा और सामुदायिक कल्याण के लिए एक परोपकारी पहल है।",
    'ja-JP':
      "こちらはMRS Charity Foundationです。医療支援、青少年教育、地域コミュニティ支援を目的とした人道支援イニシアチブです。",
    'zh-CN':
      "这是 MRS 慈善基金会，致力于提升基层医疗救助、青少年教育普及与社区人道主义关怀。",
    'pt-BR':
      "Aqui está a Fundação Filantrópica MRS, iniciativa humanitária voltada para saúde, educação jovem e apoio comunitário.",
    'it-IT':
      "Ecco la Fondazione di Beneficenza MRS, un'iniziativa umanitaria per la salute, l'istruzione giovanile e il supporto comunitario.",
    'ru-RU':
      "Это благотворительный фонд MRS — гуманитарная инициатива в сфере здравоохранения, образования и поддержки нуждающихся.",
    'tr-TR':
      "Bu, sağlık hizmetleri, gençlik eğitimi ve toplum desteğine adanmış insani bir girişim olan MRS Yardım Vakfı'dır.",
    'ur-PK':
      "یہ ایم آر ایس چیریٹی فاؤنڈیشن ہے جو صحت، تعلیم اور کمیونٹی فلاح و بہبود کے لیے وقف ایک انسانی اقدام ہے۔",
  },

  interests: {
    'en-US':
      "Here are M R S's Interests & Core Competencies. Featured focus areas include #Web Development, #Web3, #Cybersecurity & IT Defense, #Social Sciences, and #Remote Working. The competency matrix spans four core areas: IT Support & Administration covering System Troubleshooting, Microsoft 365, Document Management, and Hardware & Network Diagnostics; Web & Digital Management covering Blogspot & WordPress CMS, Web Architecture, Domain & DNS, and SEO; Digital Operations covering Digital Interactive Concierge Systems, Workflow Automation, and E-Commerce Operations; and Core Competencies covering Remote Work Autonomy, Technical Writing, and Client Communication. As additional information: M R S combines hands-on technical troubleshooting with forward-looking interest in decentralized technologies, cyber defense, and efficient remote team collaboration.",
    'bn-BD':
      "এখানে এম আর এস-এর আগ্রহ ও দক্ষতার ক্ষেত্রসমূহ প্রদর্শিত হচ্ছে: ওয়েব ডেভেলপমেন্ট, ওয়েব৩, সাইবার নিরাপত্তা ও আইটি ডিফেন্স, সোশ্যাল সায়েন্সেস এবং রিমোট ওয়ার্কিং। এছাড়া আইটি সাপোর্ট, মাইক্রোসফট ৩৬৫, ডিএনএস ম্যানেজমেন্ট ও কনসিয়ার্জ সিস্টেমে তাঁর গভীর দক্ষতা রয়েছে।",
    'es-ES':
      "Aquí están los intereses y competencias de M R S: Desarrollo Web, Web3, Ciberseguridad y Defensa IT, Ciencias Sociales y Trabajo Remoto, con matriz técnica en Microsoft 365, soporte y automatización.",
    'fr-FR':
      "Voici les centres d'intérêt et compétences de M R S: Développement Web, Web3, Cybersécurité et Défense IT, Sciences Sociales et Télétravail avec une solide expertise en support IT et gestion web.",
    'de-DE':
      "Hier sind die Interessen und Kernkompetenzen von M R S: Webentwicklung, Web3, Cybersicherheit & IT-Verteidigung, Sozialwissenschaften und Remote Work.",
    'ar-SA':
      "هنا مجالات الاهتمام والمهارات الأساسية لـ M R S: تطوير الويب، Web3، الأمن السيبراني والدفاع التقني، والعمل عن بُعد، مع خبرة في مايكروسوفت 365 والدعم الفني.",
    'hi-IN':
      "यहाँ M R S की रुचियाँ और मुख्य दक्षताएं हैं: वेब डेवलपमेंट, Web3, साइबर सुरक्षा और आईटी डिफेंस, सोशल साइंसेज और रिमोट वर्किंग।",
    'ja-JP':
      "こちらはM R Sの関心領域と専門スキルです。Web開発、Web3、サイバーセキュリティ防衛、リモートワーク、Microsoft 365サポートを網羅しています。",
    'zh-CN':
      "这是 M R S 的技术专长与核心能力矩阵，涵盖 Web 开发、Web3、网络安全与系统防护、远程协作以及 Microsoft 365 运维支持。",
    'pt-BR':
      "Aqui estão os interesses e competências de M R S: Desenvolvimento Web, Web3, Segurança da Informação e Defesa Cibernética, Trabalho Remoto e suporte Microsoft 365.",
    'it-IT':
      "Ecco gli interessi e le competenze di M R S: Sviluppo Web, Web3, Sicurezza Informatica, Lavoro da Remoto e supporto Microsoft 365.",
    'ru-RU':
      "Здесь представлены ключевые компетенции M R S: веб-разработка, Web3, кибербезопасность и защита систем, удаленная работа и администрирование Microsoft 365.",
    'tr-TR':
      "Burada M R S'in ilgi alanları ve temel yetkinlikleri yer alır: Web Geliştirme, Web3, Siber Güvenlik, Uzaktan Çalışma ve BT Desteği.",
    'ur-PK':
      "یہاں M R S کے شعبہ جات اور مہارتیں ہیں جن میں ویب ڈویلپمنٹ، Web3، سائبر سیکیورٹی، ریموٹ ورک اور آئی ٹی سپورٹ شامل ہیں۔",
  },

  contact: {
    'en-US':
      "Here is the Direct Contact & Message section. This provides direct channels including email to mr216873@gmail.com, instant meeting booking via Calendly, and an interactive message form where you can submit your name, email, and inquiry note. As additional information: M R S reviews all incoming messages promptly and is available for technical support contracts, web management engagements, IT consulting, and long-term remote collaborations with guaranteed confidentiality and rapid response.",
    'bn-BD':
      "এটি সরাসরি যোগাযোগের সেকশন। আপনি mr216873@gmail.com ঠিকানায় ইমেইল পাঠাতে পারেন, ক্যালেন্ডলি দিয়ে মিটিং বুক করতে পারেন অথবা মেসেজ ফর্মের মাধ্যমে বার্তা পাঠাতে পারেন। এম আর এস দ্রুত সাড়া দিয়ে থাকেন।",
    'es-ES':
      "Esta es la sección de Contacto Directo. Puede escribir a mr216873@gmail.com, agendar una reunión en Calendly o enviar un mensaje a través del formulario.",
    'fr-FR':
      "Voici la section Contact Direct. Vous pouvez écrire à mr216873@gmail.com, réserver une réunion sur Calendly ou envoyer un message via le formulaire.",
    'de-DE':
      "Hier ist der Direktkontakt-Bereich. Sie können eine E-Mail an mr216873@gmail.com senden, ein Calendly-Meeting buchen oder das Formular nutzen.",
    'ar-SA':
      "هذا قسم التواصل المباشر. يمكنك مراسلة mr216873@gmail.com أو حجز موعد عبر Calendly أو إرسال استفسارك عبر النموذج المتاح.",
    'hi-IN':
      "यह सीधा संपर्क अनुभाग है। आप mr216873@gmail.com पर ईमेल भेज सकते हैं, Calendly से मीटिंग बुक कर सकते हैं या फॉर्म भर सकते हैं।",
    'ja-JP':
      "こちらは直接お問い合わせセクションです。mr216873@gmail.com へのメール送信、Calendly予約、メッセージフォームが利用可能です。",
    'zh-CN':
      "这是直接联系与咨询专区。您可以通过 mr216873@gmail.com 发送邮件、使用 Calendly 预约会议，或提交在线留言表单。",
    'pt-BR':
      "Esta é a seção de Contato Direto. Entre em contato pelo e-mail mr216873@gmail.com, agende no Calendly ou envie uma mensagem.",
    'it-IT':
      "Questa è la sezione Contatto Diretto. Puoi inviare un'email a mr216873@gmail.com, prenotare su Calendly o compilare il modulo.",
    'ru-RU':
      "Это раздел прямой связи. Вы можете написать на mr216873@gmail.com, забронировать встречу в Calendly или отправить сообщение через форму.",
    'tr-TR':
      "Bu Doğrudan İletişim bölümüdür. mr216873@gmail.com adresine e-posta atabilir, Calendly ile görüşme planlayabilir veya form gönderebilirsiniz.",
    'ur-PK':
      "یہ براہ راست رابطہ کا سیکشن ہے۔ آپ mr216873@gmail.com پر ای میل بھیج سکتے ہیں یا Calendly کے ذریعے میٹنگ طے کر سکتے ہیں۔",
  },

  subscribe: {
    'en-US':
      "Here is the Always Connecting and Platform Updates section. Please remember: visiting and exploring M R S's portfolio is always completely open and free with no account or sign-in required. However, if you would like to be notified the moment a new featured platform, project, or technical tool is launched, you can sign up with your email. As M R S Assistant, I will personally curate and send you customized email updates with comprehensive technical highlights, release notes, and direct access links.",
    'bn-BD':
      "এটি অলওয়েজ কানেক্টিং এবং প্ল্যাটফর্ম আপডেট সেকশন। মনে রাখবেন: এম আর এস-এর পোর্টফোলিও ভিজিট করার জন্য কোনো সাইন ইন বা অ্যাকাউন্টের প্রয়োজন নেই, এটি সবার জন্য উন্মুক্ত। কিন্তু যখনই নতুন কোনো ফিচার্ড প্ল্যাটফর্ম বা প্রজেক্ট যুক্ত হবে, আপনি যদি ইমেইলের মাধ্যমে সরাসরি আপডেট পেতে চান, তবে এখানে সাইন আপ করতে পারেন। এম আর এস অ্যাসিস্ট্যান্ট হিসেবে আমি আপনাকে বিস্তারিত আপডেট ইমেইল পাঠিয়ে জানাব।",
    'es-ES':
      "Aquí está la sección Siempre Conectado y Actualizaciones. Visitar el portafolio de M R S es 100% abierto sin necesidad de registrarse. Si desea recibir avisos por correo electrónico cuando se agreguen nuevas plataformas o proyectos, puede suscribirse para recibir actualizaciones personalizadas del Asistente M R S.",
    'fr-FR':
      "Voici la section Toujours Connecté et Mises à jour. La visite du portfolio de M R S est totalement libre sans compte requis. Si vous souhaitez recevoir des notifications par courriel lors du lancement de nouvelles plateformes, inscrivez-vous pour recevoir des mises à jour personnalisées par l'Assistant M R S.",
    'de-DE':
      "Hier ist der Bereich Immer Verbunden und Plattform-Updates. Der Besuch des Portfolios von M R S ist jederzeit ohne Anmeldung frei möglich. Wenn Sie jedoch über neue Plattformen und Projekte per E-Mail informiert werden möchten, können Sie sich für personalisierte Updates anmelden.",
    'ar-SA':
      "هنا قسم التواصل الدائم وتحديثات المنصات. زيارة موقع M R S متاحة للجميع بالكامل دون الحاجة لتسجيل دخول. وإذا رغبت في استلام تنبيهات عبر البريد الإلكتروني عند إضافة منصات أو مشاريع جديدة، يمكنك الاشتراك لتصلك التحديثات من المساعد الشخصي.",
    'hi-IN':
      "यह ऑलवेज़ कनेक्टिंग और प्लेटफॉर्म अपडेट अनुभाग है। साइट देखने के लिए किसी साइन इन की आवश्यकता नहीं है। यदि आप नए प्लेटफॉर्म और प्रोजेक्ट के ईमेल अपडेट प्राप्त करना चाहते हैं, तो साइन अप कर सकते हैं।",
    'ja-JP':
      "こちらは最新情報とお知らせセクションです。サイトの閲覧にはログインは不要ですが、新しいプラットフォームやプロジェクトの公開時にメール通知を希望される場合は、ぜひご登録ください。",
    'zh-CN':
      "这是持续连接与平台更新专区。浏览 M R S 的作品集无需登录或注册。如果您希望在新平台或项目上线时第一时间获取定制邮件通知，可在此订阅。",
    'pt-BR':
      "Aqui é a seção Sempre Conectado e Atualizações. A visita ao portfólio é totalmente livre. Se quiser receber notificações por e-mail sobre novas plataformas e projetos, inscreva-se.",
    'it-IT':
      "Ecco la sezione Sempre Connessi e Aggiornamenti. La navigazione del sito è aperta senza registrazione. Se desideri ricevere notifiche via email quando vengono lanciate nuove piattaforme, puoi iscriverti qui.",
    'ru-RU':
      "Это раздел постоянной связи и обновлений. Просмотр сайта полностью открыт без регистрации. Если вы хотите получать уведомления о запуске новых проектов на почту, подпишитесь здесь.",
    'tr-TR':
      "Burası Her Zaman Bağlantıda ve Platform Güncellemeleri bölümüdür. Siteyi gezmek için kayıt gerekmez. Yeni projeler eklendiğinde e-posta ile bildirim almak isterseniz buradan abone olabilirsiniz.",
    'ur-PK':
      "یہ آلویز کنیکٹڈ اور اپ ڈیٹس کا سیکشن ہے۔ پورٹ فولیو وزٹ کرنے کے لیے سائن ان کی ضرورت نہیں ہے۔ اگر آپ نئے پروجیکٹس اور پلیٹ فارمز کے ای میل اپ ڈیٹس چاہتے ہیں تو سبسکرائب کر سکتے ہیں۔",
  },

  sponsors: {
    'en-US':
      "Here is M R S's Sponsored Partners & Network Directory. These clearly labeled sponsored links and partner zones help fund free technical troubleshooting guides, streaming utilities, web hosting, and humanitarian initiatives without paywalling visitor access. Clicking any partner opens the external offer safely in a new tab.",
    'bn-BD':
      "এটি এম আর এস-এর স্পন্সরড পার্টনার ও বিজ্ঞাপন নেটওয়ার্ক ডিরেক্টরি। এই স্বচ্ছ স্পন্সরড লিংকগুলোর মাধ্যমে বিনামূল্যে টেকনিক্যাল গাইড, আইটি সহায়তা, ওয়েব হোস্টিং এবং চ্যারিটি কার্যক্রম পরিচালিত হয়। যেকোনো পার্টনার কার্ডে ক্লিক করলে নিরাপদে নতুন ট্যাবে অফারটি খুলবে।",
    'hi-IN':
      "यह M R S का प्रायोजित भागीदार और विज्ञापन नेटवर्क अनुभाग है। ये पारदर्शी प्रायोजित लिंक मुफ्त तकनीकी गाइड, वेब होस्टिंग और सामुदायिक पहल को सहयोग करते हैं।",
    'ur-PK':
      "یہ M R S کا سپانسرڈ پارٹنرز اور نیٹ ورک ڈائریکٹری سیکشن ہے۔ یہ شفاف سپانسرڈ لنکس مفت آئی ٹی گائیڈز، ویب ہوسٹنگ اور کمیونٹی خدمات کو جاری رکھنے میں مدد فراہم کرتے ہیں۔",
  },
};

export function getExplanationForSection(key: string, profile: BioProfile, languageCode = 'en-US'): string {
  if (key === 'header') {
    return getLocalizedGreeting(languageCode);
  }

  const baseLang = languageCode || 'en-US';
  const langKey = SECTION_EXPLANATIONS[key] ? (SECTION_EXPLANATIONS[key][baseLang] ? baseLang : 'en-US') : 'en-US';

  if (SECTION_EXPLANATIONS[key] && SECTION_EXPLANATIONS[key][langKey]) {
    return SECTION_EXPLANATIONS[key][langKey];
  }

  // Dynamic lookup for project cards by id
  const project = profile.projects.find((p) => p.id === key || p.id === `proj-${key}`);
  if (project) {
    const shortKey = project.id.replace('proj-', '');
    const aliasMap: Record<string, string> = {
      '2-iptv-web': 'iptv',
      '5-shop': 'store',
      '6-charity': 'charity',
      '7-blogger': 'blog',
      '10-ai-portfolio': 'portfolio',
      'iptv-apk': 'iptv',
    };
    const dictKey = SECTION_EXPLANATIONS[shortKey] ? shortKey : aliasMap[shortKey];
    if (dictKey && SECTION_EXPLANATIONS[dictKey]) {
      const projDict = SECTION_EXPLANATIONS[dictKey];
      if (projDict[baseLang]) return projDict[baseLang];
      if (projDict['en-US']) return projDict['en-US'];
    }
    return `Here is ${project.title}, categorized under ${project.category} with the ${project.badge} badge. Details: ${project.description}. As additional information: ${project.speechNarrative || 'This project reflects M R S’s dedication to quality digital engineering and reliable execution.'}`;
  }

  return `Here is the ${key} section of ${profile.ownerName || 'M R S'}'s profile. Feel free to click any section or ask me any questions!`;
}
