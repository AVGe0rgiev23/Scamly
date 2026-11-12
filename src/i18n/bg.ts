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
    tagline: "Съмнително обаждане?",
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
    // The public education pages /kak-raboti (W3-05), for guests.
    education: "Как работи измамата",
    // When logged in, the menu shows the link to the person's own area (by role),
    // the name („Влезли сте като …“) and „Изход“ (not on the older person's phone).
    accountFamily: "Моите близки",
    // The family's live alert page /family/alerts (W2-03).
    accountFamilyAlerts: "Сигнали",
    accountModerator: "Модерация",
    accountModeratorReports: "Сигнали",
    accountAdmin: "Администрация",
    accountProtected: "Проверка на обаждане",
    signedInAs: "Влезли сте като",
    footerProject: `${APP_NAME} е училищен проект за ИТ турнира „Джон Атанасов“.`,
    footerPrinciples: "Свободен софтуер с лиценз GPL-3.0. Без реклами и без проследяване.",
  },
  // The home page „/“ (W2-13, src/app/page.tsx). Its main heading is app.tagline.
  home: {
    eyebrow: "Защита от телефонни измами",
    startCheck: "Провери обаждането",
    setupLinks: "Свързване и вход",
    problem:
      "За около 30 секунди Scamly проверява за признаци на телефонна измама и предупреждава близките ви.",
    register: "Регистрация за близки",
    pair: "Свържи телефон",
    login: "Вход",
    pairNote: "Ако телефонът още не е свързан, ще ви трябва код от близък.",
    adviceTitle: "Затворете телефона",
    advice: "Обадете се сами на близък на номер, който знаете. Не давайте пари или лични данни.",
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
  // The new sections of the home page (redesign v2, src/components/landing/). Every
  // sentence describes a feature that exists; no numbers or quotes are invented.
  landing: {
    howLink: "Как работи",
    demo: {
      title: "Опитайте с примерно обаждане",
      scenarioLabel: "Примерни обаждания",
      textLabel: "Какво казва обаждащият се",
      textHint: "Променете текста и вижте как се променя оценката.",
      answersLabel: "Отговори на въпросите",
      riskLabel: "Риск",
      scoreOf: "{score} от 100",
      reasonsTitle: "Защо",
      noReasons: "Няма открити признаци.",
      engineNote: "Примерът използва същата проверка, която работи в приложението.",
      notAnswered: "без отговор",
    },
    featuresTitle: "Какво прави Scamly",
    sampleScreen: "Примерен екран",
    features: {
      check: {
        title: "Един бутон, няколко въпроса",
        text: "Възрастният човек натиска един голям бутон и отговаря с по едно докосване. Без пароли и без писане.",
      },
      verdict: {
        title: "Ясен отговор с обяснение",
        text: "Три нива на риск и причините с прости думи. Зеленото никога не казва, че обаждането е безопасно.",
      },
      alert: {
        title: "Семейството научава веднага",
        text: "Сигналът тръгва още при натискането на бутона: на живо в Scamly, с известие на телефона и по имейл.",
      },
      pairing: {
        title: "Свързване без парола",
        text: "Код от 6 цифри или QR код. Валиден е 10 минути и работи само веднъж.",
      },
      voice: {
        title: "Може и с глас",
        text: "Вместо да пише, човекът може да каже какво са му казали. Scamly не записва звук.",
      },
      offline: {
        title: "Работи и при слаб интернет",
        text: "Ако сървърът не отговори до 4 секунди, телефонът сам изчислява резултата и изпраща отговорите, когато връзката се върне.",
      },
    },
    hardRulesTitle: "Шест признака, които винаги означават измама",
    hardRulesText: "При всеки от тях резултатът е червен, каквито и да са останалите отговори.",
    familyTitle: "За близките",
    familyText: "Настройвате всичко веднъж. След това Scamly ви търси само когато има нужда.",
    familyPoints: [
      "Подреждате до 5 близки в реда, в който да бъдат търсени.",
      "Каните други членове на семейството с връзка.",
      "Виждате историята на проверките и причините за всяка оценка.",
      "С едно натискане казвате „Обаждам ѝ се сега“ и телефонът на близкия ви го показва.",
    ],
    timelineTitle: "Как изглежда един сигнал",
    timeline: [
      "Натиска големия бутон.",
      "Близките получават сигнал.",
      "Проверката показва признаци на измама.",
      "Близък потвърждава, че се обажда.",
    ],
    resourcesTitle: "Отворено за всички",
    resourcesText: "Без профил и без регистрация.",
    faqTitle: "Често задавани въпроси",
    faq: [
      {
        question: "Безплатен ли е Scamly?",
        answer: "Да. Scamly е свободен софтуер с лиценз GPL-3.0, без реклами и без проследяване.",
      },
      {
        question: "Трябва ли възрастният човек да помни парола?",
        answer:
          "Не. Близък създава код от 6 цифри и го въвежда на телефона му веднъж. След това телефонът остава свързан.",
      },
      {
        question: "Спира ли Scamly обажданията от измамници?",
        answer:
          "Не. Scamly не блокира обаждания и не ги слуша. Той помага на човека да провери съмнително обаждане и предупреждава близките му.",
      },
      {
        question: "Означава ли зеленият резултат, че обаждането е безопасно?",
        answer:
          "Не. Зеленият резултат означава само, че няма типични признаци на измама. При съмнение затворете и се обадете сами на близък на номер, който знаете.",
      },
      {
        question: "Какво пази Scamly за едно обаждане?",
        answer:
          "Отговорите на въпросите и текста, от който личните данни са скрити. Гласът се превръща в текст от браузъра и не се записва. Телефонните номера в сигналите се пазят само в шифрован вид.",
      },
      {
        question: "Какво става, ако няма интернет?",
        answer:
          "Телефонът изчислява резултата сам и го показва веднага. Близките получават сигнала, когато връзката се върне.",
      },
    ],
    ctaTitle: "Свържете телефона на близкия си",
    ctaText: "Създайте семеен профил, добавете човека и въведете кода на неговия телефон.",
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
  // Short verdict labels for lists, e.g. the family's check history (VerdictBadge).
  // Green never says "safe" (D9).
  verdictBadge: {
    red: "Признаци на измама",
    yellow: "Съмнително обаждане",
    green: "Без типични признаци",
    pending: "Незавършена проверка",
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
    // Extra samples of the redesigned gallery (/dev/ui).
    sectionButtons: "Бутони",
    sectionFields: "Полета",
    sectionStatus: "Състояния",
    sectionSignal: "Сигнална линия",
    sectionLoading: "Зареждане, празно и грешка",
    fieldLabel: "Телефон",
    fieldHint: "Например 0888 123 456",
    fieldError: "Въведете телефонен номер.",
    checkboxLabel: "Получавай известия",
    switchLabel: "Звук при нов сигнал",
    tabsLabel: "Примерни раздели",
    tabOne: "Чакащи",
    tabTwo: "Одобрени",
    openDialog: "Отвори прозорец",
    dialogText: "Примерен прозорец. Затваря се с „Отказ“ или с Esc.",
    showToast: "Покажи съобщение",
    toastText: "Промените са запазени.",
    tooltip: "Подсказка",
    signalStates: "Измама, съмнително, без признаци, покой",
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
    // After registering from an invite (/registratsia?next=/pokana?t=…).
    checkEmailThenInvite:
      "Изпратихме ви писмо. Отворете връзката в него, за да потвърдите профила си. След това влезте и отворете отново връзката за покана.",
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
  // The invite page /pokana?t=… (W2-14, src/components/auth/InviteAccept.tsx).
  // {name} = the protected person's name, {n} = the place in the list (1–5).
  invitePage: {
    title: "Покана за близък",
    intro: `Поканени сте да пазите близък в ${APP_NAME}.`,
    guestText:
      "Влезте в профила си или създайте нов. След това ще ви върнем тук и поканата ще бъде приета.",
    loginButton: "Вход",
    registerButton: "Регистрация",
    registerHint:
      "Ако създадете нов профил, първо потвърдете имейла си. След това отворете връзката за покана отново.",
    redeeming: "Приемаме поканата…",
    success: "Вече сте близък на {name} на място {n}.",
    successNext: "Ще получавате сигнал, когато {name} проверява съмнително обаждане.",
    openPerson: "Към страницата на {name}",
    wrongRole: "Тази покана е за профил на близък.",
    wrongRoleHint: "Отворете връзката на устройство, на което сте влезли със семейния си профил.",
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
  // Proofread by Roberta (W2-06 wording, 6 Nov).
  // {name} = the protected person's name, {time} = e.g. „9 ноември в 12:05 ч.“,
  // {link} = the address of the alert page. No phone numbers or call details, ever.
  alertEmail: {
    startedSubject: `${APP_NAME}: {name} проверява съмнително обаждане`,
    redSubject: `Внимание! Проверката на {name} в ${APP_NAME} показва признаци на измама`,
    greeting: "Здравейте!",
    // No full stop at the end: {time} already ends with „ч.“
    startedText: `{name} получи съмнително обаждане. Проверката в ${APP_NAME} започна на {time}`,
    redText: "Проверката на {name} завърши на {time} и показва признаци на телефонна измама.",
    riskLabel: "Ниво на риска:",
    risk: {
      pending: "още не е известно – проверката продължава",
      red: "високо – има признаци на измама",
      yellow: "средно – има съмнителни признаци",
      green: "ниско – няма типични признаци на измама",
    },
    callNow: "Обадете се веднага на {name} на номера, който знаете.",
    openText: "Вижте подробностите тук: {link}",
    openButton: "Вижте сигнала",
    footer: `Получавате това писмо, защото сте в списъка с близки на {name} в ${APP_NAME}. Можете да спрете тези писма от настройките на профила си.`,
    // {date} = „9 ноември“, {time} = „12:05“ (Bulgarian time).
    timeFormat: "{date} в {time} ч.",
  },
  // Web push notifications to family members (W2-05, src/server/notifications/pushChannel.ts).
  // Proofread by Roberta (W2-05 wording, 6 Nov).
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
    subscriptionInvalid: "Известията не могат да бъдат включени в този браузър. Опитайте отново.",
    endpointTaken: "Този браузър вече получава известия за друг профил. Опитайте отново.",
  },
  // Errors of the public reports API (POST /api/reports, GET /api/map/stats, W3-01).
  reports: {
    districtInvalid: "Изберете област от списъка.",
    scriptInvalid: "Изберете вида на измамата от списъка.",
    dateInvalid: "Въведете датата на обаждането.",
    dateInFuture: "Датата на обаждането не може да е в бъдещето.",
    dateTooOld: "Можете да подадете сигнал за обаждане от последните 90 дни.",
    descriptionTooLong: "Описанието може да е най-много 1000 знака.",
    callerNumberInvalid:
      "Въведете българския номер, от който ви се обадиха, например 0888 123 456 или +359 888 123 456.",
    weeksInvalid: "Изберете период от 1 до 12 седмици.",
  },
  // The public report form /signal „Подай сигнал за измама“ (W3-02), its links on the
  // home page and in the footer. Errors of single fields come from bg.reports.
  reportForm: {
    title: "Подай сигнал за измама",
    lead: "Обадиха ли ви се измамници? Разкажете ни накратко и предупредете другите.",
    privacyTitle: "Какво трябва да знаете",
    privacy: [
      "Сигналът е анонимен: не ви трябва профил и не пазим кой го е изпратил.",
      "На картата на измамите се вижда само областта и видът на измамата.",
      "Модератор проверява всеки сигнал, преди да се появи на картата.",
      "Моля, не пишете адреси и имена.",
    ],
    formLabel: "Сигнал за измама",
    district: "Област, в която живеете",
    districtPlaceholder: "Изберете област",
    scriptQuestion: "Каква беше измамата?",
    // The answers of the big choice, in this order.
    scriptOptions: {
      police: "Фалшив полицай",
      relative_in_trouble: "Роднина в беда",
      fake_official: "Фалшив служител",
      courier: "Колет или куриер",
      unknown: "Друго",
    },
    date: "Кога ви се обадиха?",
    dateHint: "Днес или до 90 дни назад.",
    description: "Какво ви казаха? (по желание)",
    descriptionHint: "Не пишете имена, телефони или адреси — ще бъдат премахнати автоматично.",
    descriptionCounter: "{count} от {max} знака",
    callerNumber: "От кой номер ви се обадиха? (по желание)",
    callerNumberHint:
      "Номерът се пази само в шифрован вид и никога не се показва. Така разбираме дали един и същи номер звъни на много хора.",
    // The honeypot: hidden from people, only bots fill it in.
    honeypot: "Не попълвайте това поле",
    submit: "Изпрати сигнала",
    sending: "Изпращаме сигнала…",
    fixErrors: "Поправете отбелязаните полета.",
    rateLimited: "Твърде много сигнали от тази мрежа. Опитайте по-късно.",
    networkError: "Няма връзка със сървъра. Проверете интернета си и опитайте отново.",
    successTitle: "Благодарим!",
    successText: "Сигналът ви ще бъде проверен от модератор, преди да се появи на картата.",
    successEducation: "Как работи измамата",
    successHome: "Към началната страница",
    another: "Подай още един сигнал",
    // On the home page and in the footer.
    homeTitle: "Обадиха ли ви се измамници?",
    homeText:
      "Подайте анонимен сигнал. След проверка от модератор той ще предупреди хората от вашата област.",
    homeLink: "Подай сигнал",
    footerLink: "Подай сигнал за измама",
  },
  // The scam-script library (W3-05): error messages of POST/PATCH /api/scripts, also
  // shown by the moderator's editor, and the short name of each kind of scam.
  scripts: {
    slugInvalid:
      "Адресът трябва да е до 60 малки латински букви, цифри и тирета, например rodnina-v-beda.",
    slugTaken: "Вече има схема с този адрес. Изберете друг.",
    scriptTypeInvalid: "Изберете вида на измамата от списъка.",
    titleInvalid: "Заглавието трябва да е от 1 до 80 знака.",
    textInvalid: "Всяко от трите описания трябва да е от 1 до 1500 знака.",
    keywordLength: "Ключовата дума трябва да е от 3 до 30 букви.",
    keywordLetters: "Ключовата дума може да съдържа само малки букви на кирилица, без интервали.",
    keywordsInvalid: "Ключовите думи трябва да са списък от думи.",
    keywordsTooMany: "Може да има най-много 30 ключови думи.",
    publishedInvalid: "Изберете дали схемата е публикувана.",
    nothingToChange: "Няма промени за запазване.",
    // The short name of each script type (the database enum public.script_type).
    typeNames: {
      police: "Полицай",
      relative_in_trouble: "Роднина в беда",
      fake_official: "Фалшив служител",
      courier: "Колет или куриер",
      unknown: "Друга схема",
    },
  },
  // The A5 reminder linked from the education page (W3-10).
  fridgeCard: {
    link: "Карта за хладилник (A5)",
    title: "Съмнително обаждане?",
    steps: [
      "Затворете телефона.",
      "Обадете се на близък на номер, който вече знаете.",
      "Не давайте пари, лични данни или кодове.",
    ],
    check: "За проверка отворете Scamly на свързания телефон.",
    pairing: "За да свържете телефон, сканирайте кода и въведете кода за свързване от ваш близък.",
    qrLabel: "QR код към страницата за свързване на телефон със Scamly.",
  },
  // The public education pages /kak-raboti and /kak-raboti/<card> (W3-05).
  education: {
    title: "Как работи измамата",
    lead: "Как работят телефонните измами и какво да правите",
    intro:
      "Кратки карти за най-честите схеми в България: как започва обаждането, какво казват измамниците и какво да направите. Покажете ги на възрастните си близки или ги отпечатайте.",
    listTitle: "Схеми на измамниците",
    readCard: "Прочетете картата",
    howItStarts: "Как започва",
    whatTheySay: "Какво казват",
    whatToDo: "Какво да направите",
    print: "Отпечатай картата",
    backToList: "Всички схеми",
    loadError: "Картите не могат да се заредят в момента. Опитайте отново след малко.",
    empty: "Все още няма публикувани карти.",
    // Shown when the cards can't be loaded, so the page still helps.
    rulesTitle: "Запомнете",
    printNote: `${APP_NAME} · Проверете съмнително обаждане за 30 секунди.`,
    // A link on the home page.
    homeTitle: "Научете схемите на измамниците",
    homeText:
      "Кратки карти за „Полицай“, „Роднина в беда“, „Фалшив служител“ и „Колет или куриер“: как започват и какво да направите.",
    homeLink: "Как работи измамата",
  },
  // The moderator's area (W3-05): the hub /moderator and the scam-script editor
  // /moderator/scripts. Error messages of the API come from bg.scripts.
  moderator: {
    hubTitle: "Панел на модератора",
    hubIntro: "Оттук поддържате картите „Как работи измамата“ и проверявате сигналите.",
    scriptsCardTitle: "Схеми на измамите",
    scriptsCardText:
      "Картите на страницата „Как работи измамата“ и ключовите думи, по които проверката разпознава всяка схема.",
    scriptsCardLink: "Отвори схемите",
    libraryTitle: "Схеми на измамите",
    libraryIntro:
      "Само публикуваните схеми се виждат на страницата „Как работи измамата“ и се използват в проверката на обаждания.",
    newScript: "Нова схема",
    edit: "Редактирай",
    statusPublished: "Публикувана",
    statusDraft: "Чернова",
    keywordCount: "Ключови думи: {count}",
    empty: "Все още няма схеми. Създайте първата.",
    loading: "Зареждане на схемите…",
    retry: "Опитай отново",
    backToHub: "Към панела на модератора",
    backToList: "Към всички схеми",
    newTitle: "Нова схема",
    editTitle: "Редактиране на схема",
    titleLabel: "Заглавие",
    titleHint: "До 80 знака, например „Фалшив полицай“.",
    typeLabel: "Вид измама",
    slugLabel: "Адрес на страницата",
    slugHint: "Малки латински букви, цифри и тирета. Картата ще е на /kak-raboti/{slug}.",
    howItStartsLabel: "Как започва",
    whatTheySayLabel: "Какво казват",
    whatTheySayHint: "Всяка фраза в кавички „…“ се показва на отделен ред.",
    whatToDoLabel: "Какво да направите",
    whatToDoHint: "Всяко изречение се показва като отделна стъпка.",
    charCount: "{count} от {max} знака",
    keywordsTitle: "Ключови думи за проверката",
    keywordsHelp:
      "Начало на дума на кирилица, например „жетон“ за „жетони“. Думата се добавя към признаците на тази схема в проверката на обаждания. Тежестта на признака не се променя.",
    keywordLabel: "Нова ключова дума",
    keywordAdd: "Добави",
    keywordRemove: "Премахни „{stem}“",
    keywordDuplicate: "Тази дума вече е в списъка.",
    keywordsEmpty: "Няма добавени ключови думи.",
    keywordAdded: "Думата „{stem}“ е добавена.",
    keywordRemoved: "Думата „{stem}“ е премахната.",
    publishedLabel: "Публикувана",
    publishedHint:
      "Публикуваната схема се вижда от всички на „Как работи измамата“ и ключовите ѝ думи се използват в проверката.",
    save: "Запази",
    saving: "Запазване…",
    saved: "Промените са запазени.",
    created: "Схемата е създадена.",
    viewPublic: "Виж публичната страница",
    // The report queue /moderator/reports (W3-04 UI) and its card on the hub.
    reportsCardTitle: "Сигнали за проверка",
    reportsCardText: "Одобрените сигнали се показват на картата на измамите.",
    reportsCardLink: "Отвори сигналите",
    reportsCardPending: "Чакащи: {count}",
    reportsCardNone: "Няма чакащи сигнали.",
    reportsCardLoading: "Броене на чакащите сигнали…",
    reportsTitle: "Сигнали за проверка",
    reportsIntro:
      "Одобрете сигнала, ако описва телефонна измама в правилната област. Само одобрените сигнали се броят на картата на измамите.",
    reportsTabsLabel: "Състояние на сигналите",
    tabPending: "Чакащи",
    tabApproved: "Одобрени",
    tabRejected: "Отхвърлени",
    reportsLoading: "Зареждане на сигналите…",
    emptyPending: "Няма сигнали, които чакат проверка.",
    emptyApproved: "Все още няма одобрени сигнали.",
    emptyRejected: "Все още няма отхвърлени сигнали.",
    reportDistrict: "Област {district}",
    reportCallDay: "Обаждане на {date}",
    reportNoDescription: "Без описание.",
    // The repeat-caller badge: only how many, never the number itself.
    repeatOne: "Още 1 сигнал от същия номер",
    repeatMany: "Още {count} сигнала от същия номер",
    approvedBy: "Одобрен от {name} на {time}",
    rejectedBy: "Отхвърлен от {name} на {time}",
    deletedReviewer: "изтрит профил",
    rejectReasonShown: "Причина: {reason}",
    approve: "Одобри",
    approving: "Одобряване…",
    reject: "Отхвърли",
    // Added for screen readers to „Одобри“ / „Отхвърли“: which report it is.
    reportButtonContext: "сигнал „{type}“ от област {district}",
    approvedNotice: "Сигналът е одобрен и ще се появи на картата до минута.",
    rejectedNotice: "Сигналът е отхвърлен.",
    conflictNotice: "Друг модератор вече е решил този сигнал.",
    rejectTitle: "Отхвърляне на сигнал",
    rejectText:
      "Напишете защо сигналът не е подходящ за картата. Причината виждат само модераторите.",
    rejectReasonLabel: "Причина за отхвърлянето",
    quickReasonsLabel: "Бърз избор на причина",
    // Ready-made reasons: one tap fills the text field (it can still be edited).
    quickReasons: ["Спам", "Не е измама", "Лични данни", "Грешна област", "Дублиран сигнал"],
    rejectConfirm: "Отхвърли сигнала",
    rejecting: "Отхвърляне…",
    cancel: "Отказ",
  },
  // The public scam map /karta „Карта на измамите“ (W3-03, src/components/map/).
  map: {
    title: "Карта на измамите",
    lead: "Къде в България хората са получили обаждания от измамници. Показваме само области, никога адреси.",
    note: "Броим само сигнали, одобрени от модератор. Картата се обновява до минута след одобрението.",
    periodLabel: "Период",
    // The three periods, by number of weeks.
    periods: { 1: "1 седмица", 4: "4 седмици", 12: "12 седмици" },
    wavesTitle: "Вълни от измами",
    // A "scam wave" (BUILD_PLAN Q10): this kind of scam is suddenly frequent there.
    wave: "Тази седмица в област {district}: {count} сигнала за схемата „{script}“",
    noWaves: "Няма вълни от измами в момента.",
    mapLabel: "Карта на 28-те области с броя одобрени сигнали",
    loading: "Зареждане на картата…",
    loadError: "Картата не може да се зареди в момента. Опитайте отново след малко.",
    retry: "Опитай отново",
    empty: "Няма одобрени сигнали за този период.",
    legendTitle: "Одобрени сигнали за периода",
    // The legend's ranges (number of approved reports in a district).
    legendRange: "{from}–{to}",
    legendOver: "над {from}",
    // "1 сигнал", "5 сигнала"
    reportsOne: "{count} сигнал",
    reportsMany: "{count} сигнала",
    // Read by screen readers on each district of the map and shown in its tooltip.
    districtLabel: "{district}: {reports}",
    panelEmptyTitle: "Подробности за област",
    panelHint: "Изберете област на картата или в таблицата, за да видите подробности.",
    panelTitle: "Област {district}",
    panelTotal: "Одобрени сигнали за периода: {count}",
    panelByScript: "По вид измама",
    panelWave: "Вълна: {script}",
    tableTitle: "Всички области",
    tableCaption: "Одобрени сигнали по области за избрания период",
    tableDistrict: "Област",
    tableTotal: "Сигнали",
    tableWave: "Вълна от измами",
    tableNoWave: "—",
    tableSelect: "Покажи подробности за област {district}",
    // The data credit under the map (the shapes are public domain; we credit anyway).
    attribution: `Граници на областите: Natural Earth (обществено достояние). Данни: сигнали, одобрени от модераторите на ${APP_NAME}.`,
    mapAttribution: "Граници: Natural Earth",
    reportLink: "Подай сигнал за измама",
    // On the home page, in the footer and after sending a report.
    homeTitle: "Карта на измамите",
    homeText: "Вижте в кои области хората получават най-много обаждания от измамници тази седмица.",
    homeLink: "Отвори картата",
    footerLink: "Карта на измамите",
    successLink: "Виж картата на измамите",
  },
  // The moderation API for public reports (W3-04): GET/PATCH /api/moderation/reports.
  moderation: {
    statusInvalid: "Изберете състояние: чакащи, одобрени или отхвърлени.",
    cursorInvalid: "Невалидна страница на списъка. Заредете списъка отначало.",
    decisionInvalid: "Изберете дали одобрявате, или отхвърляте сигнала.",
    rejectReasonRequired: "Напишете причина за отхвърлянето.",
    rejectReasonLength: "Причината трябва да е от 3 до 200 знака.",
    alreadyReviewed: "Този сигнал вече е прегледан от модератор. Заредете списъка отново.",
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
    // The short hints shown above the arrow buttons (the labels above are read aloud).
    moveUpHint: "Нагоре",
    moveDownHint: "Надолу",
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
    // Pairing the older person's phone (POST /api/persons/:id/pairing-codes).
    pairingTitle: "Свързване на телефона",
    // {address} = our pairing page, e.g. „scamly.example/svarzhi“.
    pairingIntro:
      "Създайте код от 6 цифри. На телефона на възрастния човек отворете {address} и въведете кода или сканирайте QR кода с камерата на телефона.",
    pairingRules:
      "Кодът е валиден 10 минути и може да се използва само веднъж. Новият код отменя предишния.",
    pairingButton: "Свържи телефон",
    newCode: "Нов код",
    creatingCode: "Създаване на код…",
    codeLabel: "Код за свързване",
    codeReady: "Кодът е готов.",
    qrLabel: "QR код с връзка за свързване на телефона",
    // {time} = minutes and seconds left, e.g. „9:42“.
    codeTimeLeft: "Остават {time} мин.",
    codeExpired: "Кодът изтече. Натиснете „Нов код“, за да създадете друг.",
    // The paired phones and „Премахни“ (DELETE /api/devices/:id, owner only).
    devicesTitle: "Свързани телефони",
    devicesEmpty: "Още няма свързан телефон. Свържете го с код от 6 цифри.",
    deviceUnnamed: "Телефон без име",
    // {time} = the full date and time of pairing.
    devicePairedAt: "Свързан на {time}",
    deviceActive: "Активен",
    deviceRevoked: "Премахнат",
    refreshDevices: "Обнови списъка",
    revokeButton: "Премахни",
    // {name} = the phone's name, e.g. „Телефонът на баба“.
    revokeLabel: "Премахни {name}",
    revokeDialogTitle: "Да премахнем ли „{name}“?",
    revokeDialogText:
      "Телефонът ще бъде изключен веднага и няма да може да прави проверки. За да го използвате отново, ще трябва да го свържете с нов код.",
    revokeConfirm: "Да, премахни",
    revoking: "Премахване…",
    deviceRemoved: "Телефонът е премахнат.",
    // The history of call checks (GET /api/checks?personId=…).
    historyTitle: "Проверки на обаждания",
    historyLoading: "Зареждаме проверките…",
    historyEmpty:
      "Още няма проверки. Когато възрастният човек натисне големия бутон на телефона си, проверката ще се появи тук.",
    showMore: "Покажи още",
    // {identity} = e.g. „полицай“.
    claimedIdentity: "Кой се обажда: {identity}",
    identities: {
      police: "полицай",
      relative: "роднина",
      official: "служител на банка или институция",
      courier: "куриер",
      other: "друг човек",
      unknown: "не е посочено",
    },
    // {name} = the family member who pressed „Обаждам ѝ се сега“, {time} = when.
    acknowledgedBy: "{name} потвърди, че се обажда ({time}).",
    acknowledgedBySomeone: "Близък потвърди, че се обажда ({time}).",
    notAcknowledged: "Още никой не е потвърдил, че се обажда.",
    showDetails: "Подробности",
    hideDetails: "Скрий подробностите",
    // {time} = when the check started; read aloud on the „Подробности“ button.
    detailsLabel: "Подробности за проверката от {time}",
    detailsLoading: "Зареждаме подробностите…",
    reasonsTitle: "Защо",
    noReasons: "Няма отбелязани признаци.",
    answersTitle: "Отговори на въпросите",
    asksMoney: "Искане на пари",
    handover: "Начин на предаване",
    rushing: "Натиск за бързане",
    secrecy: "Искане за тайна",
    callText: "Какво е казано (личните данни са скрити)",
    triAnswers: {
      yes: "Да",
      no: "Не",
      unsure: "Не знам",
      none: "Без отговор",
    },
    handoverMethods: {
      courier_or_stranger: "чрез куриер или непознат",
      throw: "хвърляне през балкона или прозореца",
      bank_transfer: "банков превод",
      other: "друг начин",
    },
  },
  // The family's live alert page /family/alerts (W2-03) and the „Обаждам ѝ се сега“
  // button on each alert (W2-04, src/components/family/AlertsPage.tsx).
  alerts: {
    title: "Сигнали",
    intro:
      "Тук виждате на живо проверките на обаждания на хората, които пазите. Новите сигнали се появяват сами, без да презареждате страницата.",
    loading: "Зареждаме сигналите…",
    empty:
      "Още няма сигнали. Когато някой от хората, които пазите, натисне големия бутон на телефона си, сигналът ще се появи тук веднага.",
    noPersons: "Още нямате добавен човек, затова няма и сигнали.",
    live: "Връзка на живо: новите сигнали се появяват веднага.",
    liveLost: "Връзката на живо прекъсна. Показваме новостите на всеки 5 секунди.",
    refreshFailed: "Не успяхме да обновим сигналите. Опитваме отново след малко.",
    listLabel: "Сигнали, най-новите първи",
    newBadge: "Нов сигнал",
    focusedBadge: "Сигналът от известието",
    focusNotFound:
      "Сигналът от връзката не е намерен. Може да е изтрит или да нямате достъп до него.",
    // {name} = the protected person's name. Read aloud by screen readers.
    announceNew: "Нов сигнал: {name} проверява съмнително обаждане.",
    // Used for {name} when the person is not in the list any more.
    someone: "Ваш близък",
    statusStarted: "Проверката още тече.",
    statusAnswered: "Проверката е завършена.",
    // Sound and vibration for a new alert: only after the user turns them on (a browser
    // may not play sound before the user has pressed something on the page).
    soundOn: "Включи звук и вибрация",
    soundOff: "Изключи звук и вибрация",
    soundEnabled: "Звукът и вибрацията при нов сигнал са включени.",
    soundDisabled: "Звукът и вибрацията са изключени.",
    // W2-04: the family member tells the older person's phone that they are calling.
    callNow: "Обаждам ѝ се сега",
    // {name} = the protected person, {time} = when the check started. Read aloud.
    callNowLabel: "Обаждам ѝ се сега: {name}, проверка от {time}",
    callNowHint: "Натиснете бутона и на телефона на {name} веднага ще се покаже, че се обаждате.",
    sending: "Изпращане…",
    youResponded: "Вие поехте обаждането.",
    // {name} = the family member who pressed the button first.
    otherResponding: "{name} вече се обажда.",
    someoneResponding: "Друг близък вече се обажда.",
  },
  // The older person's call check on the paired phone (/protected, W2-01).
  // Few words, big text: this screen is for an 80-year-old during a stressful call.
  protectedCheck: {
    // Read aloud as the page heading (hidden on screen: the big button says it all).
    title: "Проверка на обаждане",
    bigButton: "Обаждат ми се за пари!",
    // A check can also start after the call has ended (brief 5.2 A).
    afterCall: "Обаждането вече приключи — искам да проверя",
    // {name} = the first trusted contact with a phone, e.g. „Иван“ (a tel: link).
    callContact: "Обади се на {name}",
    // The questions (BUILD_PLAN 4.1), one per screen. {current} and {total} are numbers.
    progress: "Въпрос {current} от {total}",
    back: "Назад",
    next: "Напред",
    questions: {
      claimedIdentity: "Кой казва, че е?",
      asksMoney: "Искат ли пари или ценности?",
      // Only asked when the answer to „Искат ли пари…“ is „Да“.
      handover: "Как искат да ги дадете?",
      rushing: "Карат ли ви да бързате?",
      secrecy: "Казват ли ви да не казвате на никого?",
    },
    identities: {
      police: "Полиция",
      relative: "Роднина",
      official: "Банка/ток/НЗОК",
      courier: "Куриер",
      other: "Друг",
    },
    tri: {
      yes: "Да",
      no: "Не",
      unsure: "Не знам",
    },
    handoverMethods: {
      courier_or_stranger: "На куриер/непознат",
      throw: "Да ги хвърля",
      bank_transfer: "По банков път",
      other: "Друго",
    },
    // The last, optional step: what the caller said. {count} and {max} are numbers.
    textLabel: "Какво ви казаха? (по желание)",
    textHint: "Можете да напишете няколко думи или да прескочите.",
    textCounter: "{count} от {max} знака",
    skip: "Прескочи",
    check: "Провери",
    checking: "Проверяваме…",
    // The result screen. A red result starts with praise (IDEAS #8): the person did the
    // right thing, and a calm voice helps them act. Green uses bg.verdict.green (D9).
    praise: "Добре направихте, че проверихте.",
    hangUp: "Затворете телефона.",
    reasonsTitle: "Защо:",
    newCheck: "Нова проверка",
    // Offline fallback (BUILD_PLAN 4.9): the server did not answer within 4 s, so the
    // phone computed the verdict itself and keeps sending the answers in the background.
    localNote: "Резултатът е изчислен на телефона — семейството може още да не е уведомено.",
    emergencyCallAdvice: "Ако сте в непосредствена опасност, обадете се на 112.",
  },
  // The „Известия на телефона“ card on /family (W2-05, src/components/family/PushOptIn.tsx).
  pushOptIn: {
    title: "Известия на телефона",
    checking: "Проверяваме…",
    disabled: "Известията още не са настроени.",
    unsupported: `Този браузър не може да показва известия. На телефона отворете ${APP_NAME} в Chrome (Android) или от иконата на началния екран (iPhone).`,
    off: "Известията са изключени. Включете ги, за да научавате веднага, когато ваш близък проверява съмнително обаждане.",
    on: "Известията са включени на това устройство.",
    // One word for the state pill next to the title (the sentence below explains it).
    pillOn: "Включени",
    pillOff: "Изключени",
    pillBlocked: "Блокирани",
    pillUnavailable: "Недостъпни",
    blocked:
      "Браузърът блокира известията от този сайт. Разрешете ги от настройките на сайта (иконата до адреса) и презаредете страницата.",
    turnOn: "Включи известията",
    turnOff: "Изключи",
    working: "Момент…",
    // The person closed the browser's question without „Разреши“.
    notAllowed: "Известията не бяха разрешени. Можете да опитате отново.",
    failed: "Не успяхме да променим известията. Проверете връзката и опитайте отново.",
    // iPhone / iPad in a normal Safari tab: push works only from the home screen icon.
    iosIntro: `На iPhone известията работят само когато ${APP_NAME} е добавен към началния екран:`,
    iosStepShare: "Натиснете „Сподели“",
    iosStepAdd: "Изберете „Добави към началния екран“",
    iosStepOpen: `Отворете ${APP_NAME} от новата икона`,
  },
  // The „Инсталирай Scamly“ card on the home page and /family (W2-09,
  // src/components/pwa/InstallPrompt.tsx). The iPhone steps reuse pushOptIn.iosStep*.
  install: {
    title: `Инсталирай ${APP_NAME}`,
    // Android / Chrome: the browser can install the app with one tap.
    lead: `Сложете ${APP_NAME} на началния екран като приложение: отваря се с едно докосване и известията пристигат сигурно.`,
    button: "Инсталирай",
    dismiss: "Не сега",
    // iPhone / iPad in Safari: three steps by hand.
    iosLead: `На iPhone добавете ${APP_NAME} към началния екран. Така се отваря като приложение и може да получава известия:`,
  },
  // The offline card /offline (W2-09, src/app/offline/route.ts), shown by the service
  // worker when a page can't load. The three rules reuse home.rulesTitle and home.rules.
  offline: {
    pageTitle: `Няма връзка – ${APP_NAME}`,
    title: "Няма връзка с интернет",
    lead: `Без интернет ${APP_NAME} не може да провери обаждането. Ако ви се обаждат за пари, запомнете:`,
    retry: "Опитайте отново",
  },
  // Voice input on the older person's text step (W2-10, src/components/protected/VoiceInput.tsx).
  voice: {
    start: "Говорете",
    stop: "Спри",
    listening: "Слушам… Говорете сега.",
    // {text} = what the browser has heard so far (not final yet).
    heard: "Чувам: „{text}“",
    added: "Добавено в полето.",
    privacyNote: `Гласът се превръща в текст от браузъра. ${APP_NAME} не записва звук.`,
    errorNoSpeech: "Не чух нищо. Натиснете „Говорете“ и опитайте пак.",
    errorNotAllowed:
      "Микрофонът не е разрешен. Разрешете го от настройките на браузъра или напишете текста.",
    errorNoMicrophone: "Не намерих микрофон. Можете да напишете текста.",
    errorNetwork: "Гласовото въвеждане се нуждае от интернет. Можете да напишете текста.",
    errorOther: "Гласовото въвеждане не проработи. Можете да напишете текста.",
  },
  // The admin area /admin (W3-06, src/components/admin/): users and roles, statistics
  // charts and the audit log. Also the error messages of /api/admin/*.
  admin: {
    hubTitle: "Панел на администратора",
    hubIntro:
      "Оттук управлявате ролите на профилите, следите статистиката и преглеждате дневника на важните действия.",
    tabsLabel: "Раздели на панела",
    tabUsers: "Потребители",
    tabStats: "Статистика",
    tabAudit: "Дневник",
    loading: "Зареждане…",
    retry: "Опитай отново",
    showMore: "Покажи още",
    loadingMore: "Зареждане на още…",
    // API errors
    searchTooLong: "Търсенето може да е най-много 100 знака.",
    roleInvalid: "Изберете роля: семейство, модератор или администратор.",
    cursorInvalid: "Невалидна страница на списъка. Презаредете страницата.",
    daysInvalid: "Изберете период от 7 до 90 дни.",
    ownRole: "Не можете да смените собствената си роля. Помолете друг администратор, ако е нужно.",
    deviceAccount: "Това е телефон на защитен човек. Ролята му не може да се променя оттук.",
    roleChangedMeanwhile:
      "Ролята на този профил току-що е била променена от друг администратор. Презаредете списъка.",
    // The role names (the database enum public.app_role).
    roleNames: {
      family: "Семейство",
      moderator: "Модератор",
      admin: "Администратор",
      protected: "Телефон на защитен човек",
    },
    // Users
    usersTitle: "Потребители",
    usersIntro:
      "Телефоните на защитените хора не са в този списък: те получават ролята си само чрез код за свързване.",
    searchLabel: "Търсене по име или имейл",
    searchHint: "Част от името или имейл с „@“.",
    roleFilterLabel: "Роля",
    roleFilterAll: "Всички роли",
    search: "Търси",
    usersEmpty: "Няма профили, които отговарят на търсенето.",
    noEmail: "Без имейл",
    createdOn: "Регистриран на {date}",
    roleSelectLabel: "Роля на {name}",
    selfNote: "Това сте вие. Собствената си роля не можете да смените.",
    youBadge: "вие",
    confirmTitle: "Да сменим ли ролята?",
    confirmText:
      "{name} ще стане „{role}“ (досега: „{oldRole}“). Промяната важи веднага и се записва в дневника.",
    confirmButton: "Смени ролята",
    confirmPending: "Сменяме…",
    cancel: "Отказ",
    roleChanged: "Ролята на {name} вече е „{role}“.",
    // Statistics
    statsTitle: "Статистика",
    periodLabel: "Период",
    periodDays: "{days} дни",
    periodRange: "От {from} до {to}",
    totalsChecks: "Проверки: {count}",
    totalsReports: "Сигнали: {count}",
    partialNote:
      "Данните са твърде много, затова числата може да не са пълни. Изберете по-кратък период.",
    noData: "Няма данни за този период.",
    showNumbers: "Покажи числата",
    tableDate: "Ден",
    tableTotal: "Общо",
    tableCount: "Брой",
    tableDistrict: "Област",
    tableLevel: "Ниво",
    tableScript: "Вид измама",
    maxLabel: "най-много {count} на ден",
    checksPerDayTitle: "Проверки по дни",
    checksPerDayText: "Всеки стълб е един ден; цветовете показват резултата от проверката.",
    checksByLevelTitle: "Резултат от проверките",
    checksByScriptTitle: "Видове измами в проверките",
    checksByScriptText: "Само завършените проверки.",
    reportsByDistrictTitle: "Сигнали по области",
    reportsByDistrictText: "Десетте области с най-много сигнали, подадени през периода.",
    reportStatuses: {
      approved: "Одобрени",
      pending: "Чакат преглед",
      rejected: "Отхвърлени",
    },
    levelNames: {
      red: "Признаци на измама",
      yellow: "Съмнително обаждане",
      green: "Без типични признаци",
      unfinished: "Незавършена проверка",
    },
    // Audit log
    auditTitle: "Дневник на действията",
    auditIntro:
      "Всеки ред е важно действие: смяна на роля, свързан или премахнат телефон, промяна на схема. Редовете не могат да се променят или изтриват.",
    auditEmpty: "Дневникът е празен.",
    auditNoActor: "Без профил",
    auditBy: "От: {name}",
    auditTarget: "Обект: {target}",
    // Short names of the actions in audit_log.action (unknown ones show the code).
    actions: {
      role_changed: "Смяна на роля",
      pairing_code_created: "Създаден код за свързване",
      device_paired: "Свързан телефон",
      device_revoked: "Премахнат телефон",
      person_deleted: "Изтрит защитен човек",
      invite_created: "Създадена покана",
      invite_redeemed: "Приета покана",
      check_acknowledged: "Близък пое обаждането",
      script_created: "Създадена схема",
      script_updated: "Променена схема",
      script_published: "Публикувана схема",
      report_approved: "Одобрен сигнал",
      report_rejected: "Отхвърлен сигнал",
    },
    // Names of audit_log.target_type.
    targets: {
      profile: "Профил",
      device: "Телефон",
      pairing_code: "Код за свързване",
      protected_person: "Защитен човек",
      contact_invite: "Покана",
      trusted_contact: "Доверен контакт",
      check: "Проверка",
      scam_script: "Схема",
      report: "Сигнал",
    },
    // Pieces of the short summary of audit_log.details (built on the server).
    summary: {
      roleChange: "{from} → {to}",
      slug: "адрес: {slug}",
      published: "публикувана",
      draft: "чернова",
      fields: "променени полета: {count}",
      priority: "място в списъка: {priority}",
      devicesRevoked: "премахнати телефони: {count}",
      personDeleted: "при изтриване на защитен човек",
      linkedExisting: "свързан със съществуващ контакт",
    },
  },
  // Temporary pages of the logged-in areas (designed later in Session F).
  areas: {
    forbiddenHelp:
      "Проверете дали сте влезли с правилния профил или се върнете към началната страница.",
    admin: "Панел на администратора",
    protected: "Телефон на защитения човек",
    placeholderNote: "Временна страница. Истинският дизайн предстои.",
    forbiddenTitle: "Нямате достъп",
    forbiddenText: "Тази страница не е предназначена за вашия профил.",
  },
  help: {
    link: "Помощ",
    back: "Обратно към началния екран",
    guides: {
      protected: {
        title: "Проверка на обаждане",
        screenshotAlt: "Началният екран с бутоните за текущо и приключило обаждане.",
        steps: [
          "При съмнително обаждане затворете и започнете проверка.",
          "Отговорете на въпросите на екрана. Ако желаете, напишете какво ви казаха по телефона.",
          "Прочетете резултата. Ако има бутон за обаждане на близък, можете да го използвате.",
        ],
      },
      family: {
        title: "Помощ за близки",
        screenshotAlt: "Списъкът с хората, които пазите, и бутонът „Добави човек“.",
        steps: [
          "От началния екран добавете човека, когото искате да защитите.",
          "Отворете неговия профил и създайте код за свързване. Въведете кода на телефона му на страницата за свързване.",
          "Отворете „Сигнали“, за да видите проверките. Ако можете да се обадите, потвърдете от екрана на сигнала.",
        ],
      },
      moderator: {
        title: "Помощ за модератори",
        screenshotAlt: "Чакащ сигнал с бутоните „Одобри“ и „Отхвърли“.",
        steps: [
          "Отворете „Сигнали“, за да прегледате чакащите сигнали.",
          "Одобрете сигнала или го отхвърлете, като посочите причина.",
          "От библиотеката със схеми можете да добавяте и редактирате описания и ключови думи.",
        ],
      },
      admin: {
        title: "Помощ за администратори",
        screenshotAlt: "Разделите „Потребители“, „Статистика“ и „Дневник“ в панела.",
        steps: [
          "В раздела за потребители прегледайте профилите и техните роли.",
          "Използвайте статистиката, за да проследите обобщените данни за проверките и сигналите.",
          "Отворете журнала, за да видите записаните административни действия.",
        ],
      },
    },
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
