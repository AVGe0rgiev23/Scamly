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
    family: "Семеен панел",
    moderator: "Панел на модератора",
    admin: "Панел на администратора",
    protected: "Телефон на защитения човек",
    placeholderNote: "Временна страница. Истинският дизайн предстои.",
    forbiddenTitle: "Нямате достъп",
    forbiddenText: "Тази страница не е предназначена за вашия профил.",
  },
} as const;
