// Список стран для выбора в профиле (код ISO2, название по-русски и
// по-английски — английское не используется в интерфейсе сейчас, но
// пригодится, если понадобится сортировка/поиск иначе). Сформирован
// один раз из открытой базы стран (dr5hn/countries-states-cities-database,
// MIT), редактировать вручную не нужно.
const countries = [
  {
    "code": "AU",
    "nameRu": "Австралия",
    "nameEn": "Australia"
  },
  {
    "code": "AT",
    "nameRu": "Австрия",
    "nameEn": "Austria"
  },
  {
    "code": "AZ",
    "nameRu": "Азербайджан",
    "nameEn": "Azerbaijan"
  },
  {
    "code": "AX",
    "nameRu": "Аландские острова",
    "nameEn": "Aland Islands"
  },
  {
    "code": "AL",
    "nameRu": "Албания",
    "nameEn": "Albania"
  },
  {
    "code": "DZ",
    "nameRu": "Алжир",
    "nameEn": "Algeria"
  },
  {
    "code": "AS",
    "nameRu": "Американское Самоа",
    "nameEn": "American Samoa"
  },
  {
    "code": "AI",
    "nameRu": "Ангилья",
    "nameEn": "Anguilla"
  },
  {
    "code": "AO",
    "nameRu": "Ангола",
    "nameEn": "Angola"
  },
  {
    "code": "AD",
    "nameRu": "Андорра",
    "nameEn": "Andorra"
  },
  {
    "code": "AQ",
    "nameRu": "Антарктида",
    "nameEn": "Antarctica"
  },
  {
    "code": "AG",
    "nameRu": "Антигуа и Барбуда",
    "nameEn": "Antigua and Barbuda"
  },
  {
    "code": "AR",
    "nameRu": "Аргентина",
    "nameEn": "Argentina"
  },
  {
    "code": "AM",
    "nameRu": "Армения",
    "nameEn": "Armenia"
  },
  {
    "code": "AW",
    "nameRu": "Аруба",
    "nameEn": "Aruba"
  },
  {
    "code": "AF",
    "nameRu": "Афганистан",
    "nameEn": "Afghanistan"
  },
  {
    "code": "BS",
    "nameRu": "Багамы",
    "nameEn": "The Bahamas"
  },
  {
    "code": "BD",
    "nameRu": "Бангладеш",
    "nameEn": "Bangladesh"
  },
  {
    "code": "BB",
    "nameRu": "Барбадос",
    "nameEn": "Barbados"
  },
  {
    "code": "BH",
    "nameRu": "Бахрейн",
    "nameEn": "Bahrain"
  },
  {
    "code": "BY",
    "nameRu": "Беларусь",
    "nameEn": "Belarus"
  },
  {
    "code": "BZ",
    "nameRu": "Белиз",
    "nameEn": "Belize"
  },
  {
    "code": "BE",
    "nameRu": "Бельгия",
    "nameEn": "Belgium"
  },
  {
    "code": "BJ",
    "nameRu": "Бенин",
    "nameEn": "Benin"
  },
  {
    "code": "BM",
    "nameRu": "Бермуды",
    "nameEn": "Bermuda"
  },
  {
    "code": "BG",
    "nameRu": "Болгария",
    "nameEn": "Bulgaria"
  },
  {
    "code": "BO",
    "nameRu": "Боливия",
    "nameEn": "Bolivia"
  },
  {
    "code": "BQ",
    "nameRu": "Бонайре, Синт-Эстатиус и Саба",
    "nameEn": "Bonaire, Sint Eustatius and Saba"
  },
  {
    "code": "BA",
    "nameRu": "Босния и Герцеговина",
    "nameEn": "Bosnia and Herzegovina"
  },
  {
    "code": "BW",
    "nameRu": "Ботсвана",
    "nameEn": "Botswana"
  },
  {
    "code": "BR",
    "nameRu": "Бразилия",
    "nameEn": "Brazil"
  },
  {
    "code": "IO",
    "nameRu": "Британская территория в Индийском океане",
    "nameEn": "British Indian Ocean Territory"
  },
  {
    "code": "BN",
    "nameRu": "Бруней",
    "nameEn": "Brunei"
  },
  {
    "code": "BF",
    "nameRu": "Буркина-Фасо",
    "nameEn": "Burkina Faso"
  },
  {
    "code": "BI",
    "nameRu": "Бурунди",
    "nameEn": "Burundi"
  },
  {
    "code": "BT",
    "nameRu": "Бутан",
    "nameEn": "Bhutan"
  },
  {
    "code": "VU",
    "nameRu": "Вануату",
    "nameEn": "Vanuatu"
  },
  {
    "code": "GB",
    "nameRu": "Великобритания",
    "nameEn": "United Kingdom"
  },
  {
    "code": "HU",
    "nameRu": "Венгрия",
    "nameEn": "Hungary"
  },
  {
    "code": "VE",
    "nameRu": "Венесуэла",
    "nameEn": "Venezuela"
  },
  {
    "code": "VG",
    "nameRu": "Виргинские острова (Британские)",
    "nameEn": "Virgin Islands (British)"
  },
  {
    "code": "VI",
    "nameRu": "Виргинские острова (США)",
    "nameEn": "Virgin Islands (US)"
  },
  {
    "code": "RE",
    "nameRu": "Воссоединение",
    "nameEn": "Reunion"
  },
  {
    "code": "VN",
    "nameRu": "Вьетнам",
    "nameEn": "Vietnam"
  },
  {
    "code": "GA",
    "nameRu": "Габон",
    "nameEn": "Gabon"
  },
  {
    "code": "HT",
    "nameRu": "Гаити",
    "nameEn": "Haiti"
  },
  {
    "code": "GY",
    "nameRu": "Гайана",
    "nameEn": "Guyana"
  },
  {
    "code": "GM",
    "nameRu": "Гамбия",
    "nameEn": "The Gambia"
  },
  {
    "code": "GH",
    "nameRu": "Гана",
    "nameEn": "Ghana"
  },
  {
    "code": "GP",
    "nameRu": "Гваделупа",
    "nameEn": "Guadeloupe"
  },
  {
    "code": "GT",
    "nameRu": "Гватемала",
    "nameEn": "Guatemala"
  },
  {
    "code": "GN",
    "nameRu": "Гвинея",
    "nameEn": "Guinea"
  },
  {
    "code": "GW",
    "nameRu": "Гвинея-Бисау",
    "nameEn": "Guinea-Bissau"
  },
  {
    "code": "DE",
    "nameRu": "Германия",
    "nameEn": "Germany"
  },
  {
    "code": "GG",
    "nameRu": "Гернси и Олдерни",
    "nameEn": "Guernsey"
  },
  {
    "code": "GI",
    "nameRu": "Гибралтар",
    "nameEn": "Gibraltar"
  },
  {
    "code": "HN",
    "nameRu": "Гондурас",
    "nameEn": "Honduras"
  },
  {
    "code": "HK",
    "nameRu": "Гонконг С.А.Р.",
    "nameEn": "Hong Kong S.A.R."
  },
  {
    "code": "VA",
    "nameRu": "Город-государство Ватикан (Святой Престол)",
    "nameEn": "Vatican City State (Holy See)"
  },
  {
    "code": "GD",
    "nameRu": "Гренада",
    "nameEn": "Grenada"
  },
  {
    "code": "GL",
    "nameRu": "Гренландия",
    "nameEn": "Greenland"
  },
  {
    "code": "GR",
    "nameRu": "Греция",
    "nameEn": "Greece"
  },
  {
    "code": "GU",
    "nameRu": "Гуам",
    "nameEn": "Guam"
  },
  {
    "code": "DK",
    "nameRu": "Дания",
    "nameEn": "Denmark"
  },
  {
    "code": "CD",
    "nameRu": "Демократическая Республика Конго",
    "nameEn": "Democratic Republic of the Congo"
  },
  {
    "code": "JE",
    "nameRu": "Джерси",
    "nameEn": "Jersey"
  },
  {
    "code": "DJ",
    "nameRu": "Джибути",
    "nameEn": "Djibouti"
  },
  {
    "code": "JO",
    "nameRu": "Джордан",
    "nameEn": "Jordan"
  },
  {
    "code": "GE",
    "nameRu": "Джорджия",
    "nameEn": "Georgia"
  },
  {
    "code": "DM",
    "nameRu": "Доминика",
    "nameEn": "Dominica"
  },
  {
    "code": "DO",
    "nameRu": "Доминиканская Республика",
    "nameEn": "Dominican Republic"
  },
  {
    "code": "EG",
    "nameRu": "Египет",
    "nameEn": "Egypt"
  },
  {
    "code": "ZM",
    "nameRu": "Замбия",
    "nameEn": "Zambia"
  },
  {
    "code": "EH",
    "nameRu": "Западная Сахара",
    "nameEn": "Western Sahara"
  },
  {
    "code": "ZW",
    "nameRu": "Зимбабве",
    "nameEn": "Zimbabwe"
  },
  {
    "code": "IL",
    "nameRu": "Израиль",
    "nameEn": "Israel"
  },
  {
    "code": "IN",
    "nameRu": "Индия",
    "nameEn": "India"
  },
  {
    "code": "ID",
    "nameRu": "Индонезия",
    "nameEn": "Indonesia"
  },
  {
    "code": "IQ",
    "nameRu": "Ирак",
    "nameEn": "Iraq"
  },
  {
    "code": "IR",
    "nameRu": "Иран",
    "nameEn": "Iran"
  },
  {
    "code": "IE",
    "nameRu": "Ирландия",
    "nameEn": "Ireland"
  },
  {
    "code": "IS",
    "nameRu": "Исландия",
    "nameEn": "Iceland"
  },
  {
    "code": "ES",
    "nameRu": "Испания",
    "nameEn": "Spain"
  },
  {
    "code": "IT",
    "nameRu": "Италия",
    "nameEn": "Italy"
  },
  {
    "code": "YE",
    "nameRu": "Йемен",
    "nameEn": "Yemen"
  },
  {
    "code": "CV",
    "nameRu": "Кабо-Верде",
    "nameEn": "Cape Verde"
  },
  {
    "code": "KZ",
    "nameRu": "Казахстан",
    "nameEn": "Kazakhstan"
  },
  {
    "code": "KY",
    "nameRu": "Каймановы острова",
    "nameEn": "Cayman Islands"
  },
  {
    "code": "KH",
    "nameRu": "Камбоджа",
    "nameEn": "Cambodia"
  },
  {
    "code": "CM",
    "nameRu": "Камерун",
    "nameEn": "Cameroon"
  },
  {
    "code": "CA",
    "nameRu": "Канада",
    "nameEn": "Canada"
  },
  {
    "code": "QA",
    "nameRu": "Катар",
    "nameEn": "Qatar"
  },
  {
    "code": "KE",
    "nameRu": "Кения",
    "nameEn": "Kenya"
  },
  {
    "code": "CY",
    "nameRu": "Кипр",
    "nameEn": "Cyprus"
  },
  {
    "code": "KI",
    "nameRu": "Кирибати",
    "nameEn": "Kiribati"
  },
  {
    "code": "CN",
    "nameRu": "Китай",
    "nameEn": "China"
  },
  {
    "code": "CC",
    "nameRu": "Кокосовые (Килинг) острова",
    "nameEn": "Cocos (Keeling) Islands"
  },
  {
    "code": "CO",
    "nameRu": "Колумбия",
    "nameEn": "Colombia"
  },
  {
    "code": "KM",
    "nameRu": "Коморские острова",
    "nameEn": "Comoros"
  },
  {
    "code": "CG",
    "nameRu": "Конго",
    "nameEn": "Congo"
  },
  {
    "code": "XK",
    "nameRu": "Косово",
    "nameEn": "Kosovo"
  },
  {
    "code": "CR",
    "nameRu": "Коста-Рика",
    "nameEn": "Costa Rica"
  },
  {
    "code": "CI",
    "nameRu": "Кот-д'Ивуар (Берег Слоновой Кости)",
    "nameEn": "Ivory Coast"
  },
  {
    "code": "CU",
    "nameRu": "Куба",
    "nameEn": "Cuba"
  },
  {
    "code": "KW",
    "nameRu": "Кувейт",
    "nameEn": "Kuwait"
  },
  {
    "code": "KG",
    "nameRu": "Кыргызстан",
    "nameEn": "Kyrgyzstan"
  },
  {
    "code": "CW",
    "nameRu": "Кюрасао",
    "nameEn": "Curaçao"
  },
  {
    "code": "LA",
    "nameRu": "Лаос",
    "nameEn": "Laos"
  },
  {
    "code": "LV",
    "nameRu": "Латвия",
    "nameEn": "Latvia"
  },
  {
    "code": "LS",
    "nameRu": "Лесото",
    "nameEn": "Lesotho"
  },
  {
    "code": "LR",
    "nameRu": "Либерия",
    "nameEn": "Liberia"
  },
  {
    "code": "LB",
    "nameRu": "Ливан",
    "nameEn": "Lebanon"
  },
  {
    "code": "LY",
    "nameRu": "Ливия",
    "nameEn": "Libya"
  },
  {
    "code": "LT",
    "nameRu": "Литва",
    "nameEn": "Lithuania"
  },
  {
    "code": "LI",
    "nameRu": "Лихтенштейн",
    "nameEn": "Liechtenstein"
  },
  {
    "code": "LU",
    "nameRu": "Люксембург",
    "nameEn": "Luxembourg"
  },
  {
    "code": "MU",
    "nameRu": "Маврикий",
    "nameEn": "Mauritius"
  },
  {
    "code": "MR",
    "nameRu": "Мавритания",
    "nameEn": "Mauritania"
  },
  {
    "code": "MG",
    "nameRu": "Мадагаскар",
    "nameEn": "Madagascar"
  },
  {
    "code": "YT",
    "nameRu": "Майотта",
    "nameEn": "Mayotte"
  },
  {
    "code": "MO",
    "nameRu": "Макао С.А.Р.",
    "nameEn": "Macau S.A.R."
  },
  {
    "code": "MW",
    "nameRu": "Малави",
    "nameEn": "Malawi"
  },
  {
    "code": "MY",
    "nameRu": "Малайзия",
    "nameEn": "Malaysia"
  },
  {
    "code": "ML",
    "nameRu": "Мали",
    "nameEn": "Mali"
  },
  {
    "code": "UM",
    "nameRu": "Малые отдаленные острова Соединенных Штатов",
    "nameEn": "United States Minor Outlying Islands"
  },
  {
    "code": "MV",
    "nameRu": "Мальдивы",
    "nameEn": "Maldives"
  },
  {
    "code": "MT",
    "nameRu": "Мальта",
    "nameEn": "Malta"
  },
  {
    "code": "MA",
    "nameRu": "Марокко",
    "nameEn": "Morocco"
  },
  {
    "code": "MQ",
    "nameRu": "Мартиника",
    "nameEn": "Martinique"
  },
  {
    "code": "MH",
    "nameRu": "Маршалловы острова",
    "nameEn": "Marshall Islands"
  },
  {
    "code": "MX",
    "nameRu": "Мексика",
    "nameEn": "Mexico"
  },
  {
    "code": "FM",
    "nameRu": "Микронезия",
    "nameEn": "Micronesia"
  },
  {
    "code": "MZ",
    "nameRu": "Мозамбик",
    "nameEn": "Mozambique"
  },
  {
    "code": "MD",
    "nameRu": "Молдова",
    "nameEn": "Moldova"
  },
  {
    "code": "MC",
    "nameRu": "Монако",
    "nameEn": "Monaco"
  },
  {
    "code": "MN",
    "nameRu": "Монголия",
    "nameEn": "Mongolia"
  },
  {
    "code": "MS",
    "nameRu": "Монтсеррат",
    "nameEn": "Montserrat"
  },
  {
    "code": "MM",
    "nameRu": "Мьянма",
    "nameEn": "Myanmar"
  },
  {
    "code": "IM",
    "nameRu": "Мэн (остров)",
    "nameEn": "Man (Isle of)"
  },
  {
    "code": "NA",
    "nameRu": "Намибия",
    "nameEn": "Namibia"
  },
  {
    "code": "NR",
    "nameRu": "Науру",
    "nameEn": "Nauru"
  },
  {
    "code": "NP",
    "nameRu": "Непал",
    "nameEn": "Nepal"
  },
  {
    "code": "NE",
    "nameRu": "Нигер",
    "nameEn": "Niger"
  },
  {
    "code": "NG",
    "nameRu": "Нигерия",
    "nameEn": "Nigeria"
  },
  {
    "code": "NL",
    "nameRu": "Нидерланды",
    "nameEn": "Netherlands"
  },
  {
    "code": "NI",
    "nameRu": "Никарагуа",
    "nameEn": "Nicaragua"
  },
  {
    "code": "NU",
    "nameRu": "Ниуэ",
    "nameEn": "Niue"
  },
  {
    "code": "NZ",
    "nameRu": "Новая Зеландия",
    "nameEn": "New Zealand"
  },
  {
    "code": "NC",
    "nameRu": "Новая Каледония",
    "nameEn": "New Caledonia"
  },
  {
    "code": "NO",
    "nameRu": "Норвегия",
    "nameEn": "Norway"
  },
  {
    "code": "AE",
    "nameRu": "Объединенные Арабские Эмираты",
    "nameEn": "United Arab Emirates"
  },
  {
    "code": "PS",
    "nameRu": "Оккупированная палестинская территория",
    "nameEn": "Palestinian Territory Occupied"
  },
  {
    "code": "OM",
    "nameRu": "Оман",
    "nameEn": "Oman"
  },
  {
    "code": "BV",
    "nameRu": "Остров Буве",
    "nameEn": "Bouvet Island"
  },
  {
    "code": "NF",
    "nameRu": "Остров Норфолк",
    "nameEn": "Norfolk Island"
  },
  {
    "code": "PN",
    "nameRu": "Остров Питкэрн",
    "nameEn": "Pitcairn Island"
  },
  {
    "code": "CX",
    "nameRu": "Остров Рождества",
    "nameEn": "Christmas Island"
  },
  {
    "code": "HM",
    "nameRu": "Остров Херд и острова Макдональд",
    "nameEn": "Heard Island and McDonald Islands"
  },
  {
    "code": "CK",
    "nameRu": "Острова Кука",
    "nameEn": "Cook Islands"
  },
  {
    "code": "TC",
    "nameRu": "Острова Теркс и Кайкос",
    "nameEn": "Turks and Caicos Islands"
  },
  {
    "code": "WF",
    "nameRu": "Острова Уоллис и Футуна",
    "nameEn": "Wallis and Futuna Islands"
  },
  {
    "code": "FJ",
    "nameRu": "Острова Фиджи",
    "nameEn": "Fiji Islands"
  },
  {
    "code": "PK",
    "nameRu": "Пакистан",
    "nameEn": "Pakistan"
  },
  {
    "code": "PW",
    "nameRu": "Палау",
    "nameEn": "Palau"
  },
  {
    "code": "PA",
    "nameRu": "Панама",
    "nameEn": "Panama"
  },
  {
    "code": "PG",
    "nameRu": "Папуа - Новая Гвинея",
    "nameEn": "Papua New Guinea"
  },
  {
    "code": "PY",
    "nameRu": "Парагвай",
    "nameEn": "Paraguay"
  },
  {
    "code": "PE",
    "nameRu": "Перу",
    "nameEn": "Peru"
  },
  {
    "code": "PL",
    "nameRu": "Польша",
    "nameEn": "Poland"
  },
  {
    "code": "PT",
    "nameRu": "Португалия",
    "nameEn": "Portugal"
  },
  {
    "code": "PR",
    "nameRu": "Пуэрто-Рико",
    "nameEn": "Puerto Rico"
  },
  {
    "code": "RU",
    "nameRu": "Россия",
    "nameEn": "Russia"
  },
  {
    "code": "RW",
    "nameRu": "Руанда",
    "nameEn": "Rwanda"
  },
  {
    "code": "RO",
    "nameRu": "Румыния",
    "nameEn": "Romania"
  },
  {
    "code": "SV",
    "nameRu": "Сальвадор",
    "nameEn": "El Salvador"
  },
  {
    "code": "WS",
    "nameRu": "Самоа",
    "nameEn": "Samoa"
  },
  {
    "code": "SM",
    "nameRu": "Сан-Марино",
    "nameEn": "San Marino"
  },
  {
    "code": "ST",
    "nameRu": "Сан-Томе и Принсипи",
    "nameEn": "Sao Tome and Principe"
  },
  {
    "code": "SA",
    "nameRu": "Саудовская Аравия",
    "nameEn": "Saudi Arabia"
  },
  {
    "code": "SH",
    "nameRu": "Святая Елена",
    "nameEn": "Saint Helena"
  },
  {
    "code": "KP",
    "nameRu": "Северная Корея",
    "nameEn": "North Korea"
  },
  {
    "code": "MK",
    "nameRu": "Северная Македония",
    "nameEn": "North Macedonia"
  },
  {
    "code": "MP",
    "nameRu": "Северные Марианские острова",
    "nameEn": "Northern Mariana Islands"
  },
  {
    "code": "SC",
    "nameRu": "Сейшельские острова",
    "nameEn": "Seychelles"
  },
  {
    "code": "BL",
    "nameRu": "Сен-Бартелеми",
    "nameEn": "Saint-Barthelemy"
  },
  {
    "code": "MF",
    "nameRu": "Сен-Мартен (французская часть)",
    "nameEn": "Saint-Martin (French part)"
  },
  {
    "code": "PM",
    "nameRu": "Сен-Пьер и Микелон",
    "nameEn": "Saint Pierre and Miquelon"
  },
  {
    "code": "SN",
    "nameRu": "Сенегал",
    "nameEn": "Senegal"
  },
  {
    "code": "VC",
    "nameRu": "Сент-Винсент и Гренадины",
    "nameEn": "Saint Vincent and the Grenadines"
  },
  {
    "code": "KN",
    "nameRu": "Сент-Китс и Невис",
    "nameEn": "Saint Kitts and Nevis"
  },
  {
    "code": "LC",
    "nameRu": "Сент-Люсия",
    "nameEn": "Saint Lucia"
  },
  {
    "code": "RS",
    "nameRu": "Сербия",
    "nameEn": "Serbia"
  },
  {
    "code": "SG",
    "nameRu": "Сингапур",
    "nameEn": "Singapore"
  },
  {
    "code": "SX",
    "nameRu": "Синт-Мартен (голландская часть)",
    "nameEn": "Sint Maarten (Dutch part)"
  },
  {
    "code": "SY",
    "nameRu": "Сирия",
    "nameEn": "Syria"
  },
  {
    "code": "SK",
    "nameRu": "Словакия",
    "nameEn": "Slovakia"
  },
  {
    "code": "SI",
    "nameRu": "Словения",
    "nameEn": "Slovenia"
  },
  {
    "code": "US",
    "nameRu": "Соединенные Штаты",
    "nameEn": "United States"
  },
  {
    "code": "SB",
    "nameRu": "Соломоновы острова",
    "nameEn": "Solomon Islands"
  },
  {
    "code": "SO",
    "nameRu": "Сомали",
    "nameEn": "Somalia"
  },
  {
    "code": "SD",
    "nameRu": "Судан",
    "nameEn": "Sudan"
  },
  {
    "code": "SR",
    "nameRu": "Суринам",
    "nameEn": "Suriname"
  },
  {
    "code": "SL",
    "nameRu": "Сьерра-Леоне",
    "nameEn": "Sierra Leone"
  },
  {
    "code": "TJ",
    "nameRu": "Таджикистан",
    "nameEn": "Tajikistan"
  },
  {
    "code": "TH",
    "nameRu": "Таиланд",
    "nameEn": "Thailand"
  },
  {
    "code": "TW",
    "nameRu": "Тайвань",
    "nameEn": "Taiwan"
  },
  {
    "code": "TZ",
    "nameRu": "Танзания",
    "nameEn": "Tanzania"
  },
  {
    "code": "TL",
    "nameRu": "Тимор-Лешти",
    "nameEn": "Timor-Leste"
  },
  {
    "code": "TG",
    "nameRu": "Того",
    "nameEn": "Togo"
  },
  {
    "code": "TK",
    "nameRu": "Токелау",
    "nameEn": "Tokelau"
  },
  {
    "code": "TO",
    "nameRu": "Тонга",
    "nameEn": "Tonga"
  },
  {
    "code": "TT",
    "nameRu": "Тринидад и Тобаго",
    "nameEn": "Trinidad and Tobago"
  },
  {
    "code": "TV",
    "nameRu": "Тувалу",
    "nameEn": "Tuvalu"
  },
  {
    "code": "TN",
    "nameRu": "Тунис",
    "nameEn": "Tunisia"
  },
  {
    "code": "TM",
    "nameRu": "Туркменистан",
    "nameEn": "Turkmenistan"
  },
  {
    "code": "TR",
    "nameRu": "Турция",
    "nameEn": "Turkey"
  },
  {
    "code": "UG",
    "nameRu": "Уганда",
    "nameEn": "Uganda"
  },
  {
    "code": "UZ",
    "nameRu": "Узбекистан",
    "nameEn": "Uzbekistan"
  },
  {
    "code": "UA",
    "nameRu": "Украина",
    "nameEn": "Ukraine"
  },
  {
    "code": "UY",
    "nameRu": "Уругвай",
    "nameEn": "Uruguay"
  },
  {
    "code": "FO",
    "nameRu": "Фарерские острова",
    "nameEn": "Faroe Islands"
  },
  {
    "code": "PH",
    "nameRu": "Филиппины",
    "nameEn": "Philippines"
  },
  {
    "code": "FI",
    "nameRu": "Финляндия",
    "nameEn": "Finland"
  },
  {
    "code": "FK",
    "nameRu": "Фолклендские острова",
    "nameEn": "Falkland Islands"
  },
  {
    "code": "FR",
    "nameRu": "Франция",
    "nameEn": "France"
  },
  {
    "code": "GF",
    "nameRu": "Французская Гвиана",
    "nameEn": "French Guiana"
  },
  {
    "code": "PF",
    "nameRu": "Французская Полинезия",
    "nameEn": "French Polynesia"
  },
  {
    "code": "TF",
    "nameRu": "Французские южные территории",
    "nameEn": "French Southern Territories"
  },
  {
    "code": "HR",
    "nameRu": "Хорватия",
    "nameEn": "Croatia"
  },
  {
    "code": "CF",
    "nameRu": "Центральноафриканская Республика",
    "nameEn": "Central African Republic"
  },
  {
    "code": "TD",
    "nameRu": "Чад",
    "nameEn": "Chad"
  },
  {
    "code": "ME",
    "nameRu": "Черногория",
    "nameEn": "Montenegro"
  },
  {
    "code": "CZ",
    "nameRu": "Чешская Республика",
    "nameEn": "Czech Republic"
  },
  {
    "code": "CL",
    "nameRu": "Чили",
    "nameEn": "Chile"
  },
  {
    "code": "CH",
    "nameRu": "Швейцария",
    "nameEn": "Switzerland"
  },
  {
    "code": "SE",
    "nameRu": "Швеция",
    "nameEn": "Sweden"
  },
  {
    "code": "SJ",
    "nameRu": "Шпицберген и острова Ян-Майен",
    "nameEn": "Svalbard and Jan Mayen Islands"
  },
  {
    "code": "LK",
    "nameRu": "Шри-Ланка",
    "nameEn": "Sri Lanka"
  },
  {
    "code": "EC",
    "nameRu": "Эквадор",
    "nameEn": "Ecuador"
  },
  {
    "code": "GQ",
    "nameRu": "Экваториальная Гвинея",
    "nameEn": "Equatorial Guinea"
  },
  {
    "code": "ER",
    "nameRu": "Эритрея",
    "nameEn": "Eritrea"
  },
  {
    "code": "SZ",
    "nameRu": "Эсватини",
    "nameEn": "Eswatini"
  },
  {
    "code": "EE",
    "nameRu": "Эстония",
    "nameEn": "Estonia"
  },
  {
    "code": "ET",
    "nameRu": "Эфиопия",
    "nameEn": "Ethiopia"
  },
  {
    "code": "ZA",
    "nameRu": "Южная Африка",
    "nameEn": "South Africa"
  },
  {
    "code": "GS",
    "nameRu": "Южная Джорджия",
    "nameEn": "South Georgia"
  },
  {
    "code": "KR",
    "nameRu": "Южная Корея",
    "nameEn": "South Korea"
  },
  {
    "code": "SS",
    "nameRu": "Южный Судан",
    "nameEn": "South Sudan"
  },
  {
    "code": "JM",
    "nameRu": "Ямайка",
    "nameEn": "Jamaica"
  },
  {
    "code": "JP",
    "nameRu": "Япония",
    "nameEn": "Japan"
  }
];

export default countries;
