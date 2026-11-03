// Bulgarian scam evidence as data; the engine normalises and matches these entries.
// This typed list is like a Python list of TypedDict values, not detection logic.
// Short stems (up to four letters) match exactly, so common inflected forms are explicit.
// Latin fallbacks document common spellings; Cyrillic variants cover their normalised forms.
// identity_other is deliberately absent: only the person's answer can establish "other".
import type { DictionaryEntry } from "./types";

export const DICTIONARY: DictionaryEntry[] = [
  // Example: „От полицията сме, провеждаме разследване.“
  {
    category: "identity_police",
    stems: ["полиц", "инспектор", "мвр", "данс", "прокурор", "следовател"],
    example: "От полицията сме, провеждаме разследване.",
  },
  // Example: „Аз съм служител на банката.“
  {
    category: "identity_official",
    stems: [
      "банка",
      "банката",
      "банков",
      "евн",
      "енерго",
      "електро",
      "нзок",
      "нап",
      "нои",
      "пенси",
      "служител",
    ],
    example: "Аз съм служител на банката.",
  },
  // Example: „Бабо, аз съм твоят внук.“
  {
    category: "identity_relative",
    stems: [
      "син",
      "синът",
      "сина",
      "синат",
      "дъщер",
      "дъщър",
      "внук",
      "внука",
      "внукът",
      "внучк",
      "снаха",
      "зет",
      "зетят",
      "бабо",
      "дядо",
      "мамо",
    ],
    example: "Бабо, аз съм твоят внук.",
  },
  // Example: „Куриер съм, имате пратка.“ Courier identity alone is not stranger handover.
  {
    category: "identity_courier",
    stems: ["куриер", "колет", "пратка", "пратки", "пратката", "доставк"],
    example: "Куриер съм, имате пратка.",
  },
  // Example: „Пригответе парите и спестяванията.“
  {
    category: "money",
    stems: [
      "пари",
      "парите",
      "спестяван",
      "лев",
      "лева",
      "левов",
      "евро",
      "злато",
      "златни",
      "бижут",
      "сума",
      "сумата",
      "налич",
      "сейф",
      "сейфа",
    ],
    example: "Пригответе парите и спестяванията.",
  },
  // Example: „Трябва веднага, няма време, до час!“
  {
    category: "urgency",
    stems: ["веднага", "спешн", "бързо", "барзо", "сега", "незабав"],
    phrases: [
      ["няма", "време"],
      ["до", "час"],
    ],
    example: "Трябва веднага, няма време, до час!",
  },
  // Example: „Не казвайте на никого и не затваряйте телефона.“
  // Keep negation in the phrase: "казвайте" or "никого" alone proves no secrecy.
  {
    category: "secrecy",
    stems: ["тайна", "тайно", "тайната"],
    phrases: [
      ["не", "казвай", "никого"],
      ["не", "казва", "никого"],
      ["не", "казват", "никого"],
      ["не", "споделя"],
      ["не", "обажда"],
      ["не", "затваря"],
      ["не", "затваряй"],
      ["пази", "тайна"],
    ],
    example: "Не казвайте на никого и не затваряйте телефона.",
  },
  // Example: „Помогнете на полицията да заловим измамниците с фалшиви банкноти.“
  {
    category: "scenario_police",
    stems: ["акция", "акцията", "залав", "залов", "измамниц"],
    phrases: [
      ["помогне", "полиц"],
      ["фалшив", "банкнот"],
      ["серийн", "номер"],
    ],
    example: "Помогнете на полицията да заловим измамниците с фалшиви банкноти.",
  },
  // Example: „Дъщеря ви е в болница след катастрофа, трябва операция.“
  {
    category: "scenario_relative",
    stems: [
      "катастроф",
      "блъсна",
      "блъснат",
      "болниц",
      "операци",
      "арест",
      "арестув",
      "задърж",
      "гаранци",
    ],
    example: "Дъщеря ви е в болница след катастрофа, трябва операция.",
  },
  // Example: „Имате надвзета сума и ще получите компенсация.“
  {
    category: "scenario_official",
    stems: ["надвзет", "надплат", "компенсац"],
    phrases: [
      ["връщане", "пари"],
      ["връщане", "парите"],
      ["неплатен", "сметка"],
      ["неплатен", "сметки"],
    ],
    example: "Имате надвзета сума и ще получите компенсация.",
  },
  // Example: „Има доплащане за мито и такса за доставка.“
  {
    category: "scenario_courier",
    stems: ["мито", "митото", "доплащ"],
    phrases: [
      ["такса", "доставк"],
      ["таксата", "доставк"],
    ],
    example: "Има доплащане за мито и такса за доставка.",
  },
  // Example: „Преведете сумата по банковата сметка.“
  {
    category: "bank_transfer",
    stems: ["преведе", "превод", "сметка", "сметки", "сметката"],
    example: "Преведете сумата по банковата сметка.",
  },
  // Example: „Хвърлете парите от терасата.“ A balcony mention alone is not HR2.
  {
    category: "handover",
    phrases: [
      ["хвърл", "пари"],
      ["хвърл", "парите"],
      ["хвърл", "торба"],
      ["хвърл", "торбата"],
      ["хвърл", "плик"],
      ["хвърл", "плика"],
      ["хвърл", "балкон"],
      ["хвърл", "тераса"],
      ["хвърл", "прозор"],
      ["хварл", "парите"],
      ["хварл", "тераса"],
    ],
    example: "Хвърлете парите от терасата.",
  },
  // Example: „Предайте парите на куриера, нашият колега ще ги вземе.“
  {
    category: "handover",
    phrases: [
      ["предай", "куриер"],
      ["предай", "човек"],
      ["предай", "колега"],
      ["дайте", "куриер"],
      ["дайте", "човек"],
      ["дайте", "колега"],
      ["дай", "куриер"],
      ["дай", "човек"],
      ["дай", "колега"],
      ["оставе", "врата"],
      ["оставе", "пощенск"],
    ],
    example: "Предайте парите на куриера, нашият колега ще ги вземе.",
  },
  // Example: „Кажете ПИН кода или паролата си.“ Asking matters; a safety reminder is not HR4.
  {
    category: "credentials",
    phrases: [
      ["кажете", "пин"],
      ["кажете", "парола"],
      ["дайте", "пин"],
      ["дайте", "парола"],
      ["изпрате", "пин"],
      ["изпрате", "парола"],
      ["продикту", "пин"],
      ["продикту", "парола"],
      ["въведе", "пин"],
      ["въведе", "парола"],
    ],
    example: "Кажете ПИН кода или паролата си.",
  },
  // Example: „Продиктувайте кода от SMS и номера на картата.“
  {
    category: "credentials",
    phrases: [
      ["кажете", "кода", "смс"],
      ["дайте", "кода", "смс"],
      ["изпрате", "кода", "смс"],
      ["продикту", "кода", "смс"],
      ["кажете", "cvv"],
      ["кажете", "цвв"],
      ["дайте", "cvv"],
      ["дайте", "цвв"],
      ["продикту", "номер", "карта"],
      ["кажете", "номер", "карта"],
      ["дайте", "номер", "карта"],
      ["изпрате", "номер", "карта"],
    ],
    example: "Продиктувайте кода от SMS и номера на картата.",
  },
  // Example: „Преместете всичко в защитена сметка.“ An account alone is not HR5.
  {
    category: "safe_account",
    phrases: [
      ["сигурн", "сметка"],
      ["защитен", "сметка"],
      ["безопасн", "сметка"],
    ],
    example: "Преместете всичко в защитена сметка.",
  },
  // Example: „Прехвърлете парите, обаждаме се от банката.“ Needs official/police identity for HR5.
  {
    category: "move_money",
    phrases: [
      ["прехвърл", "пари"],
      ["прехвърл", "парите"],
      ["прехварл", "парите"],
      ["премест", "парите"],
    ],
    example: "Прехвърлете парите, обаждаме се от банката.",
  },
  // Example: „politsiyata iska pari“ → „полицията иска пари“; common missing/swapped letters.
  {
    category: "identity_police",
    stems: ["politsiya", "policia", "полициа", "полиця", "полици", "полций"],
    example: "politsiyata iska pari",
  },
  // Example: „bankata iska parite“; Latin alternatives are data for the normaliser integration.
  {
    category: "identity_official",
    stems: ["banka", "bankata", "slujitel", "слуйител", "служтел"],
    example: "bankata iska parite",
  },
  // Example: „sinat vi katastrofira“ with а replacing ъ in шльокавица.
  {
    category: "scenario_relative",
    stems: ["katastrof", "катасторф", "болнциа", "operaci"],
    example: "sinat vi katastrofira",
  },
  // Example: „kurierat iska pari“ → „куриерат иска пари“.
  {
    category: "identity_courier",
    stems: ["kurier", "курйер", "курер"],
    example: "kurierat iska pari",
  },
  // Example: „hvarlete parite ot terasata“; а/ъ variation is common in Latin-script input.
  {
    category: "money",
    stems: ["pari", "parite", "спестявна", "праите"],
    example: "hvarlete parite ot terasata",
  },
];
