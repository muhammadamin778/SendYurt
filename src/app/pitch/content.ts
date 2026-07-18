/**
 * Trilingual copy for the landing page. The pitch lives outside next-intl's
 * [locale] routing (it's served at "/"), so its content is kept here and
 * selected by the ?lang= query param. Numbers, colours and icons stay in the
 * page; only text lives here.
 */

export type PitchLang = "en" | "ru" | "uz";

export const PITCH_LANGS: { code: PitchLang; label: string }[] = [
  { code: "uz", label: "Oʻz" },
  { code: "ru", label: "Рус" },
  { code: "en", label: "Eng" },
];

export function resolveLang(v: string | undefined): PitchLang {
  return v === "ru" || v === "uz" ? v : "en";
}

interface Em {
  a: string;
  em: string;
  b: string;
}

export interface PitchContent {
  nav: { problem: string; how: string; features: string; investors: string; login: string; cta: string };
  hero: {
    chip: string;
    title: Em;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: [string, string][];
    receivesLabel: string;
    trustBadge: string;
  };
  badges: string[];
  marquee: string[];
  problem: { chip: string; title: Em; sub: string; statLabels: [string, string][] };
  how: { chip: string; title: Em; steps: { title: string; body: string }[] };
  features: { chip: string; title: Em; items: { tag: string; title: string; body: string }[] };
  opportunity: {
    chip: string;
    metricLabels: string[];
    note: string;
    title: Em;
    sub: string;
  };
  quote: Em;
  cta: { title: Em; sub: string; join: string; investors: string };
  footer: {
    tagline: string;
    groups: { title: string; links: [string, string][] }[];
    copyright: string;
  };
  form: {
    chip: string;
    heading: string;
    name: string;
    email: string;
    org: string;
    orgOptional: string;
    message: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    thankTitle: string;
    thankBody: string;
    preferEmail: string;
    errName: string;
    errEmail: string;
    errMessage: string;
    errRate: string;
    errServer: string;
    errNetwork: string;
  };
}

const en: PitchContent = {
  nav: { problem: "Problem", how: "How it works", features: "Features", investors: "Investors", login: "Log in", cta: "Demo" },
  hero: {
    chip: "Uzbekistan · 2026",
    title: { a: "Send money home ", em: "smarter", b: ", not blind." },
    sub: "SendYurt is the money co-pilot for Uzbek migrants and the families they support — the cheapest, safest route home, a trust rating on every provider, and one budget the whole family shares.",
    ctaPrimary: "Demo",
    ctaSecondary: "See how it works",
    stats: [["$16B+", "Annual remittances"], ["~2M+", "Migrants abroad"], ["6%", "Avg fee lost / transfer"]],
    receivesLabel: "Family receives",
    trustBadge: "Trust Score 96 · Verified",
  },
  badges: ["Trust Score verified", "Uzbek · Русский · English", "Works offline (PWA)"],
  marquee: ["Real-time rates", "Trust Score", "Family Budget", "Uzbek & Russian", "No hidden fees", "Works offline", "Scam protection", "Best-route finder"],
  problem: {
    chip: "The problem",
    title: { a: "Migrants are ", em: "bleeding money", b: " in the dark." },
    sub: "Every transfer home runs a gauntlet of hidden margins, bad rates and informal agents — and the family receiving it has no view of any of it.",
    statLabels: [
      ["Lost to fees & FX margin", "on a typical corridor transfer"],
      ["Burned every year", "in avoidable transfer costs"],
      ["Has met a scam ‘agent’", "with no way to check reputations"],
      ["Shared visibility", "between sender and family today"],
    ],
  },
  how: {
    chip: "How it works",
    title: { a: "Four steps to money that ", em: "arrives whole", b: "." },
    steps: [
      { title: "Enter amount & destination", body: "Tell SendYurt how much you're sending and where it lands — Tashkent, Samarkand, a village in Fergana." },
      { title: "Compare routes + Trust Scores", body: "Banks, cards and transfer operators — ranked by what your family actually receives, each with a trust rating." },
      { title: "Send the cheapest, safest way", body: "One tap on the winning route. No hidden margin, no guesswork, no queue at a kiosk." },
      { title: "Track it in the Family Budget", body: "The money lands into a plan both sides can see — rent, school, medicine — not a black box." },
    ],
  },
  features: {
    chip: "Features",
    title: { a: "Everything a migrant family needs. ", em: "Nothing they don't.", b: "" },
    items: [
      { tag: "Live rates", title: "Rate & Route Finder", body: "Compares every channel in real time for the cheapest, fastest transfer home." },
      { tag: "Anti-fraud", title: "Trust Score", body: "Rates providers and agents on hidden fees, speed and complaints so migrants dodge scams." },
      { tag: "Shared finance", title: "Family Budget", body: "Migrant and family share one plan — rent, school, medicine — so money reaches its purpose." },
      { tag: "Localized", title: "Uzbek & Russian native", body: "Built in the languages migrants actually use — not translated as an afterthought." },
      { tag: "Smart alerts", title: "Rate-drop alerts", body: "Get pinged the moment a better route opens up for your usual transfer." },
      { tag: "No app store", title: "Installs as a PWA", body: "Works on any phone, sips data on weak connections, updates itself. No download friction." },
    ],
  },
  opportunity: {
    chip: "The opportunity",
    metricLabels: ["Remittance market", "Of Uzbekistan's GDP", "Migrants abroad", "Trust-first rivals"],
    note: "Directional market estimates — verify against current World Bank / CBU data before investor distribution.",
    title: { a: "Building the ", em: "trust rail", b: " for a $16B corridor." },
    sub: "We're raising to expand coverage across the top remittance corridors and deepen the Trust Score data moat. Tell us what you'd like to see — the founders read every note.",
  },
  quote: { a: "“The financial co-pilot in every Uzbek migrant's pocket — ", em: "saving families millions", b: " in hidden fees.”" },
  cta: {
    title: { a: "Ready to send home ", em: "smarter", b: "?" },
    sub: "We're onboarding pilot families across the top remittance corridors now. Sit with us on the sender's side of the table.",
    join: "Join the pilot",
    investors: "Investor inquiries →",
  },
  footer: {
    tagline: "The money co-pilot for Uzbek migrants and the families they support.",
    groups: [
      { title: "Product", links: [["Rate finder", "/rates"], ["Trust Score", "/trust"], ["Family Budget", "/budget"], ["How it works", "#how"]] },
      { title: "Company", links: [["The problem", "#problem"], ["For investors", "#investors"], ["Get early access", "/register"]] },
      { title: "Contact", links: [["Telegram — @sendyurt", "https://t.me/sendyurt"], ["hello@sendyurt.uz", "mailto:hello@sendyurt.uz"]] },
    ],
    copyright: "© 2026 SendYurt · Tashkent, Uzbekistan",
  },
  form: {
    chip: "Investor inquiry",
    heading: "Talk to the founders",
    name: "Name",
    email: "Email",
    org: "Fund / firm",
    orgOptional: "(optional)",
    message: "What are you looking for?",
    messagePlaceholder: "Stage, check size, what you'd like to see from us…",
    send: "Send inquiry",
    sending: "Sending…",
    thankTitle: "Thank you — we'll be in touch.",
    thankBody: "Your note reached the SendYurt team. Expect a reply at",
    preferEmail: "Prefer email? Reach us directly at",
    errName: "Please enter your name.",
    errEmail: "Please enter a valid email address.",
    errMessage: "Please add a line or two about what you're looking for.",
    errRate: "Too many submissions — please try again a little later.",
    errServer: "Something went wrong on our side. Please try again.",
    errNetwork: "Couldn't reach the server. Please check your connection and retry.",
  },
};

const ru: PitchContent = {
  nav: { problem: "Проблема", how: "Как это работает", features: "Возможности", investors: "Инвесторам", login: "Войти", cta: "Demo" },
  hero: {
    chip: "Узбекистан · 2026",
    title: { a: "Отправляйте деньги домой ", em: "с умом", b: ", а не вслепую." },
    sub: "SendYurt — денежный со-пилот для узбекских мигрантов и их семей: самый дешёвый и надёжный маршрут домой, рейтинг доверия у каждого провайдера и общий бюджет для всей семьи.",
    ctaPrimary: "Demo",
    ctaSecondary: "Как это работает",
    stats: [["$16B+", "Переводов в год"], ["~2М+", "Мигрантов за рубежом"], ["6%", "Комиссии теряется / перевод"]],
    receivesLabel: "Семья получает",
    trustBadge: "Рейтинг доверия 96 · Подтверждён",
  },
  badges: ["Рейтинг доверия подтверждён", "Oʻzbek · Русский · English", "Работает офлайн (PWA)"],
  marquee: ["Курсы в реальном времени", "Рейтинг доверия", "Семейный бюджет", "Узбекский и русский", "Без скрытых комиссий", "Работает офлайн", "Защита от мошенников", "Поиск лучшего маршрута"],
  problem: {
    chip: "Проблема",
    title: { a: "Мигранты ", em: "теряют деньги", b: " вслепую." },
    sub: "Каждый перевод домой проходит через скрытые наценки, плохие курсы и неформальных агентов — а семья, которая получает деньги, не видит ничего из этого.",
    statLabels: [
      ["Уходит на комиссии и курс", "при типичном переводе по коридору"],
      ["Сгорает каждый год", "на ненужных издержках переводов"],
      ["Сталкивался с «агентом»-мошенником", "без возможности проверить репутацию"],
      ["Общей прозрачности", "между отправителем и семьёй сегодня"],
    ],
  },
  how: {
    chip: "Как это работает",
    title: { a: "Четыре шага к деньгам, которые ", em: "доходят целиком", b: "." },
    steps: [
      { title: "Укажите сумму и адрес", body: "Скажите SendYurt, сколько отправляете и куда — Ташкент, Самарканд, село в Фергане." },
      { title: "Сравните маршруты и рейтинги", body: "Банки, карты и операторы переводов — по тому, сколько реально получит ваша семья, у каждого свой рейтинг доверия." },
      { title: "Отправьте дёшево и безопасно", body: "Один тап по лучшему маршруту. Без скрытой наценки, догадок и очередей у кассы." },
      { title: "Отслеживайте в семейном бюджете", body: "Деньги попадают в план, который видят обе стороны — аренда, школа, лекарства, — а не в чёрный ящик." },
    ],
  },
  features: {
    chip: "Возможности",
    title: { a: "Всё, что нужно семье мигранта. ", em: "И ничего лишнего.", b: "" },
    items: [
      { tag: "Живые курсы", title: "Поиск курса и маршрута", body: "Сравнивает все каналы в реальном времени для самого дешёвого и быстрого перевода домой." },
      { tag: "Анти-мошенничество", title: "Рейтинг доверия", body: "Оценивает провайдеров и агентов по скрытым комиссиям, скорости и жалобам, чтобы мигранты избегали мошенников." },
      { tag: "Общие финансы", title: "Семейный бюджет", body: "Мигрант и семья ведут один план — аренда, школа, лекарства — чтобы деньги дошли до цели." },
      { tag: "Локализация", title: "Родные узбекский и русский", body: "Сделано на языках, которыми мигранты реально пользуются, а не переведено наспех." },
      { tag: "Умные оповещения", title: "Оповещения о курсе", body: "Уведомим, как только откроется более выгодный маршрут для вашего обычного перевода." },
      { tag: "Без магазина", title: "Ставится как PWA", body: "Работает на любом телефоне, экономит трафик на слабой связи, обновляется само. Без лишней установки." },
    ],
  },
  opportunity: {
    chip: "Возможность",
    metricLabels: ["Рынок переводов", "От ВВП Узбекистана", "Мигрантов за рубежом", "Конкурентов на доверии"],
    note: "Ориентировочные оценки рынка — сверьте с актуальными данными Всемирного банка / ЦБ РУз перед рассылкой инвесторам.",
    title: { a: "Строим ", em: "рельсы доверия", b: " для коридора в $16 млрд." },
    sub: "Мы привлекаем инвестиции, чтобы расширить покрытие ключевых коридоров переводов и углубить данные Рейтинга доверия. Напишите, что вам интересно — основатели читают каждое сообщение.",
  },
  quote: { a: "«Финансовый со-пилот в кармане каждого узбекского мигранта — ", em: "экономит семьям миллионы", b: " на скрытых комиссиях.»" },
  cta: {
    title: { a: "Готовы отправлять домой ", em: "с умом", b: "?" },
    sub: "Мы подключаем пилотные семьи по ключевым коридорам переводов. Садитесь с нами по сторону отправителя.",
    join: "В пилот",
    investors: "Инвесторам →",
  },
  footer: {
    tagline: "Денежный со-пилот для узбекских мигрантов и их семей.",
    groups: [
      { title: "Продукт", links: [["Поиск курса", "/rates"], ["Рейтинг доверия", "/trust"], ["Семейный бюджет", "/budget"], ["Как это работает", "#how"]] },
      { title: "Компания", links: [["Проблема", "#problem"], ["Инвесторам", "#investors"], ["Ранний доступ", "/register"]] },
      { title: "Контакты", links: [["Telegram — @sendyurt", "https://t.me/sendyurt"], ["hello@sendyurt.uz", "mailto:hello@sendyurt.uz"]] },
    ],
    copyright: "© 2026 SendYurt · Ташкент, Узбекистан",
  },
  form: {
    chip: "Запрос инвестора",
    heading: "Связаться с основателями",
    name: "Имя",
    email: "Email",
    org: "Фонд / компания",
    orgOptional: "(необязательно)",
    message: "Что вы ищете?",
    messagePlaceholder: "Стадия, размер чека, что хотели бы увидеть от нас…",
    send: "Отправить запрос",
    sending: "Отправка…",
    thankTitle: "Спасибо — мы свяжемся с вами.",
    thankBody: "Ваше сообщение получено командой SendYurt. Ответ придёт на",
    preferEmail: "Предпочитаете почту? Пишите напрямую на",
    errName: "Пожалуйста, укажите ваше имя.",
    errEmail: "Пожалуйста, укажите корректный email.",
    errMessage: "Добавьте пару строк о том, что вы ищете.",
    errRate: "Слишком много отправок — попробуйте чуть позже.",
    errServer: "Что-то пошло не так на нашей стороне. Попробуйте снова.",
    errNetwork: "Не удалось связаться с сервером. Проверьте соединение и повторите.",
  },
};

const uz: PitchContent = {
  nav: { problem: "Muammo", how: "Qanday ishlaydi", features: "Imkoniyatlar", investors: "Investorlarga", login: "Kirish", cta: "Demo" },
  hero: {
    chip: "Oʻzbekiston · 2026",
    title: { a: "Uyga pulni ", em: "aqlli", b: " yuboring, koʻr-koʻrona emas." },
    sub: "SendYurt — oʻzbek migrantlari va ular qoʻllab-quvvatlaydigan oilalar uchun pul hamrohi: uyga eng arzon, xavfsiz yoʻl, har bir provayderga ishonch bahosi va butun oila uchun yagona byudjet.",
    ctaPrimary: "Demo",
    ctaSecondary: "Qanday ishlaydi",
    stats: [["$16B+", "Yillik pul oʻtkazmalari"], ["~2M+", "Chet eldagi migrantlar"], ["6%", "Har oʻtkazmada yoʻqoladi"]],
    receivesLabel: "Oila oladi",
    trustBadge: "Ishonch bali 96 · Tasdiqlangan",
  },
  badges: ["Ishonch bali tasdiqlangan", "Oʻzbek · Русский · English", "Oflayn ishlaydi (PWA)"],
  marquee: ["Jonli kurslar", "Ishonch bali", "Oila byudjeti", "Oʻzbek va rus", "Yashirin toʻlovlarsiz", "Oflayn ishlaydi", "Firibgarlikdan himoya", "Eng yaxshi yoʻl qidiruvi"],
  problem: {
    chip: "Muammo",
    title: { a: "Migrantlar qorongʻuda ", em: "pul yoʻqotmoqda", b: "." },
    sub: "Uyga har bir oʻtkazma yashirin ustamalar, yomon kurslar va norasmiy agentlar orasidan oʻtadi — pulni oladigan oila esa bularning hech birini koʻrmaydi.",
    statLabels: [
      ["Toʻlov va kurs ustamasiga", "odatiy koridor oʻtkazmasida"],
      ["Har yili yonadi", "keraksiz oʻtkazma xarajatlariga"],
      ["Firibgar «agent»ga duch kelgan", "obroʻni tekshirish imkonisiz"],
      ["Umumiy shaffoflik", "yuboruvchi va oila oʻrtasida bugun"],
    ],
  },
  how: {
    chip: "Qanday ishlaydi",
    title: { a: "Pul ", em: "toʻliq yetib boradi", b: " — toʻrt qadamda." },
    steps: [
      { title: "Miqdor va manzilni kiriting", body: "SendYurt’ga qancha va qayerga yuborayotganingizni ayting — Toshkent, Samarqand, Fargʻonadagi qishloq." },
      { title: "Yoʻllar va ishonch balini solishtiring", body: "Banklar, kartalar va oʻtkazma operatorlari — oilangiz aslida oladigan miqdor boʻyicha saralanadi, har birida ishonch bahosi." },
      { title: "Eng arzon, xavfsiz yoʻl bilan yuboring", body: "Yutgan yoʻlga bir bosish. Yashirin ustama, taxmin va navbatlarsiz." },
      { title: "Oila byudjetida kuzating", body: "Pul ikkala tomon koʻra oladigan rejaga tushadi — ijara, maktab, dori — qora quti emas." },
    ],
  },
  features: {
    chip: "Imkoniyatlar",
    title: { a: "Migrant oilasiga kerak boʻlgan hamma narsa. ", em: "Ortiqchasi yoʻq.", b: "" },
    items: [
      { tag: "Jonli kurslar", title: "Kurs va yoʻnalish qidiruvi", body: "Uyga eng arzon va tez oʻtkazma uchun har bir kanalni real vaqtda solishtiradi." },
      { tag: "Firibgarlikka qarshi", title: "Ishonch bali", body: "Provayder va agentlarni yashirin toʻlov, tezlik va shikoyatlar boʻyicha baholaydi — migrantlar firibgarlardan qochadi." },
      { tag: "Umumiy moliya", title: "Oila byudjeti", body: "Migrant va oila bitta rejani yuritadi — ijara, maktab, dori — pul maqsadiga yetadi." },
      { tag: "Mahalliylashtirilgan", title: "Ona tili — oʻzbek va rus", body: "Migrantlar haqiqatan foydalanadigan tillarda qurilgan — shoshib tarjima qilingan emas." },
      { tag: "Aqlli ogohlantirish", title: "Kurs pasayishi haqida", body: "Odatiy oʻtkazmangiz uchun yaxshiroq yoʻl ochilishi bilan xabar beramiz." },
      { tag: "Ilova doʻkonisiz", title: "PWA sifatida oʻrnatiladi", body: "Har qanday telefonda ishlaydi, zaif aloqada trafikni tejaydi, oʻzini yangilaydi. Ortiqcha oʻrnatishsiz." },
    ],
  },
  opportunity: {
    chip: "Imkoniyat",
    metricLabels: ["Pul oʻtkazmalari bozori", "Oʻzbekiston YaIMdan", "Chet eldagi migrantlar", "Ishonchga asoslangan raqiblar"],
    note: "Taxminiy bozor baholari — investorlarga tarqatishdan oldin Jahon banki / OʻzR MB joriy maʼlumotlari bilan tekshiring.",
    title: { a: "$16B lik koridor uchun ", em: "ishonch magistrali", b: "ni quramiz." },
    sub: "Biz asosiy oʻtkazma koridorlarini kengaytirish va Ishonch bali maʼlumotlar afzalligini chuqurlashtirish uchun mablagʻ jalb qilyapmiz. Nimani koʻrishni istashingizni yozing — asoschilar har bir xabarni oʻqiydi.",
  },
  quote: { a: "«Har bir oʻzbek migrantining choʻntagidagi moliyaviy hamroh — ", em: "oilalarga millionlarni tejaydi", b: ", yashirin toʻlovlarda.»" },
  cta: {
    title: { a: "Uyga ", em: "aqlli", b: " yuborishga tayyormisiz?" },
    sub: "Biz asosiy oʻtkazma koridorlari boʻylab pilot oilalarni ulayapmiz. Yuboruvchi tomonda biz bilan birga oʻtiring.",
    join: "Pilotga qoʻshilish",
    investors: "Investorlarga →",
  },
  footer: {
    tagline: "Oʻzbek migrantlari va ular qoʻllab-quvvatlaydigan oilalar uchun pul hamrohi.",
    groups: [
      { title: "Mahsulot", links: [["Kurs qidiruvi", "/rates"], ["Ishonch bali", "/trust"], ["Oila byudjeti", "/budget"], ["Qanday ishlaydi", "#how"]] },
      { title: "Kompaniya", links: [["Muammo", "#problem"], ["Investorlarga", "#investors"], ["Erta kirish", "/register"]] },
      { title: "Aloqa", links: [["Telegram — @sendyurt", "https://t.me/sendyurt"], ["hello@sendyurt.uz", "mailto:hello@sendyurt.uz"]] },
    ],
    copyright: "© 2026 SendYurt · Toshkent, Oʻzbekiston",
  },
  form: {
    chip: "Investor soʻrovi",
    heading: "Asoschilar bilan gaplashing",
    name: "Ism",
    email: "Email",
    org: "Fond / kompaniya",
    orgOptional: "(ixtiyoriy)",
    message: "Nimani izlayapsiz?",
    messagePlaceholder: "Bosqich, chek hajmi, bizdan nimani koʻrishni istaysiz…",
    send: "Soʻrov yuborish",
    sending: "Yuborilmoqda…",
    thankTitle: "Rahmat — biz bogʻlanamiz.",
    thankBody: "Xabaringiz SendYurt jamoasiga yetdi. Javob quyidagi manzilga keladi:",
    preferEmail: "Email afzalmi? Toʻgʻridan-toʻgʻri yozing:",
    errName: "Iltimos, ismingizni kiriting.",
    errEmail: "Iltimos, toʻgʻri email kiriting.",
    errMessage: "Nimani izlayotganingiz haqida bir-ikki qator yozing.",
    errRate: "Juda koʻp yuborildi — birozdan soʻng qayta urinib koʻring.",
    errServer: "Bizning tomonda xatolik. Qayta urinib koʻring.",
    errNetwork: "Serverga ulanib boʻlmadi. Aloqani tekshirib, qayta urinib koʻring.",
  },
};

export const PITCH: Record<PitchLang, PitchContent> = { en, ru, uz };
