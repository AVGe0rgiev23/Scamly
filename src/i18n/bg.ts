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
    comingSoon: "Скоро: проверка на обаждане, семеен щит и карта на измамите.",
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
  },
  // Temporary pages of the logged-in areas (designed later in Session F).
  areas: {
    forbiddenHelp:
      "Проверете дали сте влезли с правилния профил или се върнете към началната страница.",
    family: "Семеен панел",
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
