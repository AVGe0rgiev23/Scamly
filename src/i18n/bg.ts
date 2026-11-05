// Every piece of Bulgarian text that a user can see lives in this one file.
// Screens never contain text directly: they import `bg` and use, for example, bg.app.tagline.
// This makes proofreading easy and lets us add another language later (e.g. tr.ts).

import { APP_NAME } from "@/config/app";

// `as const` makes every value read-only, like a frozen Python dict
// (TypeScript then also knows the exact text of each string).
export const bg = {
  app: {
    name: APP_NAME,
    // Shown in the browser tab and in search results.
    metaTitle: `${APP_NAME} – защита от телефонни измами`,
    tagline: "Обаждат ли ви се за пари? Проверете за 30 секунди.",
    description: `${APP_NAME} помага на възрастните хора да разпознаят телефонна измама и предупреждава близките им.`,
  },
  common: {
    yes: "Да",
    no: "Не",
    loading: "Зареждане…",
    errorGeneric: "Нещо се обърка. Опитайте отново.",
    notFoundTitle: "Страницата не е намерена",
    notFoundText: "Няма страница на този адрес.",
    backHome: "Към началната страница",
  },
  // The frame around every page: header with menu, and footer (W2-13, src/components/layout/).
  layout: {
    skipToContent: "Към основното съдържание",
    // Read by screen readers after the logo text, so the logo link says where it leads.
    homeLink: "Начална страница",
    navLabel: "Основно меню",
    login: "Вход",
    register: "Регистрация",
    pair: "Свържи телефон",
    footerProject: `${APP_NAME} е училищен проект за ИТ турнира „Джон Атанасов“.`,
    footerPrinciples: "Свободен софтуер с лиценз GPL-3.0. Без реклами и без проследяване.",
  },
  // The home page „/“ (W2-13, src/app/page.tsx). Its main heading is app.tagline.
  home: {
    eyebrow: "Защита от телефонни измами",
    problem:
      "Телефонните измамници в България търсят възрастни хора, а в решаващите минути семейството не е до тях.",
    register: "Регистрация за близки",
    pair: "Свържи телефон",
    login: "Вход",
    pairNote: "„Свържи телефон“ е за телефона на възрастния човек и изисква код от близък.",
    stepsTitle: "Как работи",
    // The 3 steps, in order. A list of objects, like a Python list of dicts.
    steps: [
      {
        title: "Свързване",
        text: "Близкият свързва телефона на възрастния човек с код от 6 цифри. Парола не е нужна.",
      },
      {
        title: "Проверка",
        text: "При съмнително обаждане възрастният човек натиска един голям бутон, отговаря на няколко въпроса и веднага вижда дали има признаци на измама.",
      },
      {
        title: "Сигнал",
        text: "Семейството получава сигнал веднага и може да се обади на близкия си навреме.",
      },
    ],
    rulesTitle: "Какво да правите при съмнително обаждане",
    rules: [
      "Полицията никога не иска пари по телефона.",
      "Не давайте пари на непознати и не ги хвърляйте от балкона.",
      "Затворете и се обадете сами на близък на номера, който знаете.",
    ],
  },
  theme: {
    label: "Изглед",
    system: "Според устройството",
    light: "Светъл изглед",
    dark: "Тъмен изглед",
  },
  verdict: {
    red: {
      title: "ТОВА Е ИЗМАМА.",
      description:
        "Затворете. Не давайте пари или лични данни. Обадете се на близък на номера, който знаете.",
    },
    yellow: {
      title: "Внимание!",
      description:
        "Има съмнителни признаци. Затворете и проверете, като се обадите сами на познат номер.",
    },
    green: {
      title: "Няма типични признаци на измама.",
      description:
        "Ако се съмнявате, затворете и се обадете сами на близкия си на номера, който знаете.",
    },
  },
  // Texts of the detection engine (src/engine). The headline and advice of a verdict
  // are bg.verdict above (one place for the D9 green wording).
  engine: {
    // Hard rules (D10, BUILD_PLAN 4.6): a short name and the explanation shown to the person.
    hardRules: {
      HR1_POLICE_ASKS_MONEY: {
        name: "Полиция иска пари",
        explanation: "Полицията никога не иска пари или ценности по телефона.",
      },
      HR2_HANDOVER_TO_STRANGER: {
        name: "Предаване на непознат",
        explanation: "Никой честен човек не иска да хвърляте пари или да ги давате на непознат.",
      },
      HR3_SECRECY_AND_MONEY: {
        name: "Тайна и пари",
        explanation: "Когато някой иска пари и ви казва да не казвате на никого, това е измама.",
      },
      HR4_ASKS_FOR_CODES: {
        name: "Искат кодове",
        explanation: "Банката никога не иска ПИН, пароли или кодове по телефона.",
      },
      HR5_SAFE_ACCOUNT: {
        name: "Сигурна сметка",
        explanation: "Няма „сигурна сметка“. Това е класическа измама.",
      },
      HR6_RELATIVE_IN_TROUBLE: {
        name: "Роднина в беда",
        explanation: "Затворете и се обадете сами на роднината на номера, който знаете.",
      },
    },
    // One reason per signal category (BUILD_PLAN 4.5), shown under the verdict.
    reasons: {
      identity_police: "Обаждащият се казва, че е от полицията.",
      identity_official: "Обаждащият се казва, че е от банка или от държавна институция.",
      identity_relative: "Обаждащият се казва, че е ваш близък.",
      identity_courier: "Обаждащият се казва, че е куриер.",
      identity_other: "Не е ясно кой всъщност се обажда.",
      money: "Искат пари или ценности.",
      urgency: "Карат ви да бързате.",
      secrecy: "Искат да пазите разговора в тайна.",
      scenario_police: "Разказват за полицейска акция или за фалшиви банкноти.",
      scenario_relative: "Разказват, че ваш близък е в беда: катастрофа, болница или арест.",
      scenario_official: "Говорят за надвзета сума, компенсация или неплатена сметка.",
      scenario_courier: "Искат доплащане, мито или такса за доставка.",
      bank_transfer: "Искат да преведете пари по банков път.",
      handover: "Искат да хвърлите парите или да ги дадете на непознат.",
      credentials: "Искат ПИН, парола или код.",
      safe_account: "Говорят за „сигурна сметка“.",
      move_money: "Искат да прехвърлите парите си.",
    },
  },
  ui: {
    title: "Компоненти и цветове",
    description: "Преглед на бутоните, въпросите и резултатите в двата изгледа.",
    typeSample: "Четлив текст, ясни действия и големи бутони.",
    cardTitle: "Проверете обаждането",
    cardText: "Отделете време. Можете да се посъветвате с близък.",
    primary: "Проверка",
    secondary: "Назад",
    disabled: "Недостъпно",
    clicked: "Избрано",
    question: "Поискаха ли ви пари?",
  },
  // Error messages of our API ({ error: { code, messageBg } }), shown by the forms.
  errors: {
    validation: "Проверете въведените данни.",
    invalidJson: "Заявката не може да бъде прочетена. Опитайте отново.",
    unauthorized: "Моля, влезте в профила си.",
    forbidden: "Нямате достъп до тази страница.",
    notFound: "Не е намерено.",
    badOrigin: "Заявката е отказана от съображения за сигурност.",
    rateLimited: "Твърде много опити. Опитайте след малко.",
    internal: "Нещо се обърка. Опитайте отново.",
  },
  // Login, registration and logout (pages /vhod and /registratsia).
  auth: {
    loginIntro: "Влезте, за да се грижите за близките си и да следите техните сигнали.",
    registerIntro:
      "Създайте семеен профил. След това ще можете да свържете телефона на ваш близък.",
    toPair: "Свързване на телефон на близък",
    submitting: "Моля, изчакайте…",
    networkError: "Не успяхме да се свържем. Проверете връзката си и опитайте отново.",
    loginTitle: "Вход в профила",
    loginButton: "Вход",
    registerTitle: "Регистрация",
    registerButton: "Създай профил",
    logoutButton: "Изход",
    emailLabel: "Имейл",
    passwordLabel: "Парола",
    passwordHint: "Поне 10 знака.",
    displayNameLabel: "Вашето име",
    toRegister: "Нямате профил? Регистрирайте се.",
    toLogin: "Вече имате профил? Влезте.",
    // Same message for a wrong e-mail and a wrong password, so nobody can find out
    // which e-mails have an account.
    invalidCredentials: "Грешен имейл или парола.",
    emailTaken: "Вече има профил с този имейл.",
    emailInvalid: "Въведете валиден имейл адрес.",
    emailNotConfirmed: "Първо потвърдете имейла си чрез писмото, което ви изпратихме.",
    passwordRequired: "Въведете паролата си.",
    passwordTooShort: "Паролата трябва да е поне 10 знака.",
    passwordTooLong: "Паролата може да е най-много 72 знака.",
    passwordWeak: "Паролата е твърде лесна за отгатване. Изберете друга.",
    displayNameInvalid: "Въведете име от 1 до 60 знака.",
    checkEmail: "Изпратихме ви писмо. Отворете връзката в него, за да потвърдите профила си.",
    signedInAs: "Влезли сте като",
  },
  // Pairing the older person's phone (page /svarzhi, BUILD_PLAN section 5).
  pairing: {
    codeHint: "Въведете всички цифри, включително нулите в началото.",
    retryHint: "Ако кодът не работи, помолете близкия си да създаде нов код.",
    submitting: "Свързване…",
    title: "Свързване на телефона",
    intro: "Въведете кода от 6 цифри, който вижда вашият близък.",
    codeLabel: "Код от 6 цифри",
    button: "Свържи",
    codeFormat: "Въведете точно 6 цифри.",
    // The same message for a wrong, expired or already used code: it reveals nothing.
    invalidCode: "Кодът е грешен или е изтекъл.",
    labelInvalid: "Името на телефона може да е най-много 60 знака.",
    deviceRevoked: "Този телефон вече не е свързан. Помолете близък да го свърже отново.",
  },
  // Protected persons (the older people a family member looks after).
  persons: {
    displayNameInvalid: "Въведете име от 1 до 60 знака.",
    districtInvalid: "Изберете област от списъка.",
    nothingToChange: "Променете поне името или областта.",
  },
  // The ordered list of people to call (trusted contacts) of a protected person.
  contacts: {
    listInvalid: "Списъкът трябва да съдържа от 1 до 5 близки.",
    displayNameInvalid: "Въведете име от 1 до 60 знака.",
    phoneInvalid: "Въведете телефонен номер, например 0888 123 456 или +359 888 123 456.",
    priorityInvalid: "Изберете място в списъка от 1 до 5.",
    priorityTaken: "Двама близки не може да са на едно и също място в списъка.",
    contactTwice: "Един и същ близък е въведен два пъти.",
    unknownContact:
      "Списъкът е бил променен междувременно. Презаредете страницата и опитайте отново.",
    ownerRequired: "Вие трябва да останете в списъка с близки.",
    phoneRequired: `Въведете телефонен номер за всеки близък, който няма профил в ${APP_NAME}.`,
  },
  // Invites for other relatives to become trusted contacts (link /pokana?t=…).
  invites: {
    displayNameInvalid: "Въведете име от 1 до 60 знака.",
    priorityInvalid: "Изберете място в списъка от 1 до 5.",
    // The same message for a wrong, expired or already used invite: it reveals nothing.
    invalidInvite: "Поканата е грешна, изтекла или вече е използвана.",
    ownInvite: "Това е ваша покана. Изпратете връзката на близкия, когото каните.",
    alreadyLinked: "Вече сте в списъка с близки на този човек.",
    noFreePlace:
      "В списъка с близки няма свободно място. Помолете човека, който ви е поканил, да освободи място, и отворете връзката отново.",
    tryAgain: "Списъкът с близки се промени в същия момент. Опитайте отново.",
  },
  // Call checks: the answers of the older person and the family's „Обаждам ѝ се сега“.
  checks: {
    answerInvalid: "Изберете един от отговорите.",
    handoverOnlyWithMoney: "Начинът на предаване на парите се посочва само когато искат пари.",
    textTooLong: "Текстът може да е най-много 2000 знака.",
    alreadyAnswered: "На тази проверка вече е отговорено.",
    // Shown on the older person's phone after a family member presses „Обаждам ѝ се сега“.
    // {name} is replaced with the name of the family member, e.g. „Иван“.
    acknowledgedBy: "{name} ще ви се обади веднага.",
    // The same, when we don't know the name (the family member is no longer in the list).
    acknowledgedBySomeone: "Ваш близък ще ви се обади веднага.",
  },
  // Alert e-mails to family members (W2-06, src/server/notifications/email/alertEmail.ts).
  // draft — Roberta to proofread (W2-06 wording)
  // {name} = the protected person's name, {time} = e.g. „9 ноември в 12:05 ч.“,
  // {link} = the address of the alert page. No phone numbers or call details, ever.
  alertEmail: {
    startedSubject: `${APP_NAME}: {name} проверява съмнително обаждане`,
    redSubject: `${APP_NAME}: Внимание! Проверката на {name} показва признаци на измама`,
    greeting: "Здравейте!",
    startedText: `{name} получи съмнително обаждане и започна проверка в ${APP_NAME} на {time}.`,
    redText: "Проверката на {name} завърши на {time} и показва признаци на телефонна измама.",
    riskLabel: "Ниво на риска:",
    risk: {
      pending: "още не е известно – проверката продължава",
      red: "високо – признаци на измама",
      yellow: "средно – има съмнителни признаци",
      green: "ниско – няма типични признаци на измама",
    },
    callNow: "Обадете се веднага на {name} на номера, който знаете.",
    openText: "Вижте подробностите тук: {link}",
    openButton: "Вижте сигнала",
    footer: `Получавате това писмо, защото сте сред близките на {name} в ${APP_NAME}. Можете да спрете тези писма от настройките на профила си.`,
    // {date} = „9 ноември“, {time} = „12:05“ (Bulgarian time).
    timeFormat: "{date} в {time} ч.",
  },
  // Web push notifications to family members (W2-05, src/server/notifications/pushChannel.ts).
  // draft — Roberta to proofread (W2-05 wording)
  // {name} = the protected person's name, always at the start of a phrase (so the
  // fallback `someone` fits too). Short: a phone shows about 40 characters of the title.
  // No phone numbers or call details, ever.
  push: {
    startedTitle: "{name}: съмнително обаждане",
    startedBody: `Започна проверка в ${APP_NAME}. Докоснете, за да видите подробностите.`,
    redTitle: "Внимание! {name}: признаци на измама",
    redBody:
      "Проверката показва признаци на телефонна измама. Обадете се веднага на близкия си на номера, който знаете.",
    // Used for {name} when the person's name is unknown (e.g. the person was deleted).
    someone: "Ваш близък",
    // Errors of POST /api/push/subscriptions.
    subscriptionInvalid: "Известията не могат да бъдат включени от този браузър. Опитайте отново.",
    endpointTaken: "Този браузър вече получава известия за друг профил. Опитайте отново.",
  },
  // The 28 districts (области) by their ISO 3166-2:BG code. The same names as the
  // districts table in the database (migration 20261102000001); a unit test
  // (src/i18n/districts.test.ts) checks that the two lists stay equal.
  districts: {
    "BG-01": "Благоевград",
    "BG-02": "Бургас",
    "BG-03": "Варна",
    "BG-04": "Велико Търново",
    "BG-05": "Видин",
    "BG-06": "Враца",
    "BG-07": "Габрово",
    "BG-08": "Добрич",
    "BG-09": "Кърджали",
    "BG-10": "Кюстендил",
    "BG-11": "Ловеч",
    "BG-12": "Монтана",
    "BG-13": "Пазарджик",
    "BG-14": "Перник",
    "BG-15": "Плевен",
    "BG-16": "Пловдив",
    "BG-17": "Разград",
    "BG-18": "Русе",
    "BG-19": "Силистра",
    "BG-20": "Сливен",
    "BG-21": "Смолян",
    "BG-22": "София (столица)",
    "BG-23": "София (област)",
    "BG-24": "Стара Загора",
    "BG-25": "Търговище",
    "BG-26": "Хасково",
    "BG-27": "Шумен",
    "BG-28": "Ямбол",
  },
  // The family dashboard /family (W2-07, src/components/family/).
  family: {
    signedInAs: "Влезли сте като",
    networkError: "Няма връзка със сървъра. Проверете интернета си и опитайте отново.",
    retry: "Опитай отново",
    // The list of protected persons (/family).
    listTitle: "Хората, които пазите",
    listIntro:
      "Изберете човек, за да видите проверките му, свързания телефон и списъка с близки за обаждане.",
    addPerson: "Добави човек",
    listLoading: "Зареждаме списъка…",
    emptyTitle: "Още нямате добавен човек",
    emptyText:
      "Добавете възрастния човек, когото искате да пазите. След това ще свържете телефона му с код от 6 цифри.",
    district: "Област",
    unknownDistrict: "Неизвестна област",
    roleOwner: "Вие сте създали този профил",
    roleContact: "Вие сте в списъка с близки",
    backToList: "Към списъка с хората",
    saving: "Запазване…",
    // Creating a protected person (/family/new).
    createTitle: "Добавяне на човек",
    createIntro:
      "Въведете името и областта на възрастния човек, когото искате да пазите. Вие ще бъдете първи в списъка му с близки за обаждане.",
    nameLabel: "Име",
    nameHint: "Както го наричате вкъщи, например Баба Мария. До 60 знака.",
    districtHint: "Използва се само за анонимната карта на измамите по области.",
    districtPlaceholder: "Изберете област",
    createButton: "Добави",
    // {date} = „5 ноември 2026 г.“, {time} = „14:30“ (Bulgarian time).
    dateTime: "{date}, {time} ч.",
    // One protected person's page (/family/[personId]).
    personLoading: "Зареждаме данните…",
    readOnlyNote: "Само човекът, който е създал профила, може да променя тези данни.",
    // Name and district (owner only), and deleting the person.
    settingsTitle: "Име и област",
    saveChanges: "Запази промените",
    changesSaved: "Промените са запазени.",
    deleteTitle: "Изтриване на профила",
    deleteText:
      "Изтриването премахва човека и всички негови данни: списъка с близки, проверките и свързаните телефони.",
    deleteButton: "Изтрий профила",
    // {name} = the protected person's name.
    deleteDialogTitle: "Да изтрием ли профила на {name}?",
    deleteDialogText:
      "Ще бъдат изтрити списъкът с близки, всички проверки, поканите и кодовете. Свързаните телефони ще бъдат изключени веднага. Това не може да бъде отменено.",
    deleteConfirm: "Да, изтрий завинаги",
    deleting: "Изтриване…",
    cancel: "Отказ",
    // The ordered contact list (who is called first).
    contactsTitle: "Ред за обаждане",
    contactsIntro:
      "Подредете близките в реда, в който трябва да бъдат търсени. Първият близък с телефонен номер се показва на телефона на възрастния човек като бутон за обаждане.",
    // {n} = the place in the list, 1 to 5.
    contactPlace: "Място {n}",
    contactName: "Име",
    contactPhone: "Телефон",
    phoneHint: "Например 0888 123 456",
    hasAccount: `Има профил в ${APP_NAME} и получава сигнали`,
    noAccount: "Няма профил, само телефон",
    you: "Това сте вие",
    noPhone: "Без телефон",
    // {name} = the contact's name. Read aloud by screen readers on the ↑ ↓ buttons.
    moveUp: "Премести {name} нагоре",
    moveDown: "Премести {name} надолу",
    removeContact: "Премахни",
    removeContactLabel: "Премахни {name}",
    unnamed: "близък без име",
    // Announced after ↑ or ↓: „Иван е на място 2.“
    movedTo: "{name} е на място {n}.",
    addContactTitle: "Добавяне на близък с телефон",
    addContactButton: "Добави в списъка",
    listFull: "Списъкът е пълен: най-много 5 близки.",
    saveContacts: "Запази списъка",
    contactsSaved: "Списъкът с близки е запазен.",
    unsavedChanges: "Има незапазени промени. Натиснете „Запази списъка“.",
    // Inviting another relative with their own account (POST /api/persons/:id/invites).
    inviteTitle: "Покани близък",
    inviteIntro:
      "Създайте връзка и я изпратете на член на семейството. Когато я отвори и влезе в профила си, ще бъде добавен в списъка и ще получава сигнали.",
    inviteName: "Име на близкия",
    invitePlace: "Място в списъка",
    inviteButton: "Създай връзка за покана",
    inviteCreated: "Връзката за покана е готова.",
    inviteLinkLabel: "Връзка за покана",
    inviteOnce:
      "Връзката се показва само сега. Изпратете я само на човека, когото каните, например в лично съобщение.",
    // {time} = the full date and time, e.g. „12 ноември 2026 г., 14:30 ч.“
    inviteExpires: "Валидна до {time}. Може да бъде използвана само веднъж.",
    copyLink: "Копирай връзката",
    copied: "Връзката е копирана.",
    copyFailed: "Копирането не успя. Маркирайте връзката и я копирайте ръчно.",
  },
  // Temporary pages of the logged-in areas (designed later in Session F).
  areas: {
    forbiddenHelp:
      "Проверете дали сте влезли с правилния профил или се върнете към началната страница.",
    moderator: "Панел на модератора",
    admin: "Панел на администратора",
    protected: "Телефон на защитения човек",
    placeholderNote: "Временна страница. Истинският дизайн предстои.",
    forbiddenTitle: "Нямате достъп",
    forbiddenText: "Тази страница не е предназначена за вашия профил.",
  },
  // Fictional demo content used only when populating the agreed test database.
  seed: {
    familyName: "Мария Петрова",
    contactName: "Иван Петров",
    moderatorName: "Демо модератор",
    adminName: "Демо администратор",
    personName: "Елена Петрова",
    deviceLabel: "Демо телефон на Елена",
    policeCheckText: "Казаха, че са от полицията, и поискаха пари за акция.",
    bankCheckText: "От банката напомниха, че документът ми е готов в клона. Не поискаха нищо.",
    pendingReportText: "Обаждащият се поиска спешно пари и каза да не споделям с никого.",
    approvedReportText: "Представиха се за полицаи и поискаха пари за залавяне на измамници.",
  },
} as const;
