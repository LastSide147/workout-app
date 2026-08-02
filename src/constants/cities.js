// Список городов для автодополнения при выборе в профиле. Состоит из:
// столицы каждой страны (кроме России — см. ниже) + вручную
// добавленные города СНГ. Украина намеренно не включена.
//
// РОССИЯ — единственная страна с ПОЛНЫМ покрытием: здесь все города с
// населением от 50 000 человек (325 штук, источник — открытые данные
// по переписи/текущим оценкам Росстата, свод по состоянию на 2026
// год). Именно этот порог даёт лучший баланс: попадают все города,
// где реально может набраться сравнимая группа пользователей для
// статистики, а список остаётся компактным (полный список всех 1117
// городов РФ включал бы много посёлков, о которых никто не будет
// вводить в поиске "город с населением 5000").
//
// Единственное совпадение названий во всём российском списке — два
// разных Железногорска (Курская область и Красноярский край), поэтому
// у них в name регион указан прямо в скобках, у остальных городов —
// нет (не нужно, названий с 2026 населением от 50к достаточно, чтобы
// быть уникальными).
//
// Для ВСЕХ ОСТАЛЬНЫХ стран список пока не полный (только столица) —
// такого источника с точным населением по каждой стране не нашлось в
// открытом доступе оттуда, куда есть доступ сейчас. Приложение
// доступно и пользователям из других стран (Google Play), которых
// этот список пока не покрывает.
//
// ВАЖНО ДЛЯ БУДУЩИХ ПРАВОК: чтобы полноценно добавить ещё одну страну
// (например, Казахстан) — 1) допишите её города сюда тем же форматом
// {name, countryCode}, 2) добавьте код страны в ENABLED_COUNTRY_CODES
// в src/utils/location.js, где страна становится доступной для выбора
// в профиле. Сам этот файл и остальной код (поиск, фильтрация) не
// завязаны на то, откуда взялись данные, — им нужен только формат
// {name, countryCode}.
const cities = [
  {
    "name": "Andorra la Vella",
    "countryCode": "AD"
  },
  {
    "name": "Abu Dhabi",
    "countryCode": "AE"
  },
  {
    "name": "Kabul",
    "countryCode": "AF"
  },
  {
    "name": "St. John's",
    "countryCode": "AG"
  },
  {
    "name": "The Valley",
    "countryCode": "AI"
  },
  {
    "name": "Tirana",
    "countryCode": "AL"
  },
  {
    "name": "Yerevan",
    "countryCode": "AM"
  },
  {
    "name": "Гюмри",
    "countryCode": "AM"
  },
  {
    "name": "Luanda",
    "countryCode": "AO"
  },
  {
    "name": "Buenos Aires",
    "countryCode": "AR"
  },
  {
    "name": "Pago Pago",
    "countryCode": "AS"
  },
  {
    "name": "Vienna",
    "countryCode": "AT"
  },
  {
    "name": "Canberra",
    "countryCode": "AU"
  },
  {
    "name": "Oranjestad",
    "countryCode": "AW"
  },
  {
    "name": "Mariehamn",
    "countryCode": "AX"
  },
  {
    "name": "Baku",
    "countryCode": "AZ"
  },
  {
    "name": "Гянджа",
    "countryCode": "AZ"
  },
  {
    "name": "Сумгаит",
    "countryCode": "AZ"
  },
  {
    "name": "Sarajevo",
    "countryCode": "BA"
  },
  {
    "name": "Bridgetown",
    "countryCode": "BB"
  },
  {
    "name": "Dhaka",
    "countryCode": "BD"
  },
  {
    "name": "Brussels",
    "countryCode": "BE"
  },
  {
    "name": "Ouagadougou",
    "countryCode": "BF"
  },
  {
    "name": "Sofia",
    "countryCode": "BG"
  },
  {
    "name": "Manama",
    "countryCode": "BH"
  },
  {
    "name": "Bujumbura",
    "countryCode": "BI"
  },
  {
    "name": "Porto-Novo",
    "countryCode": "BJ"
  },
  {
    "name": "Gustavia",
    "countryCode": "BL"
  },
  {
    "name": "Hamilton",
    "countryCode": "BM"
  },
  {
    "name": "Bandar Seri Begawan",
    "countryCode": "BN"
  },
  {
    "name": "Sucre",
    "countryCode": "BO"
  },
  {
    "name": "Kralendijk",
    "countryCode": "BQ"
  },
  {
    "name": "Brasilia",
    "countryCode": "BR"
  },
  {
    "name": "Nassau",
    "countryCode": "BS"
  },
  {
    "name": "Thimphu",
    "countryCode": "BT"
  },
  {
    "name": "Gaborone",
    "countryCode": "BW"
  },
  {
    "name": "Minsk",
    "countryCode": "BY"
  },
  {
    "name": "Брест",
    "countryCode": "BY"
  },
  {
    "name": "Витебск",
    "countryCode": "BY"
  },
  {
    "name": "Гомель",
    "countryCode": "BY"
  },
  {
    "name": "Гродно",
    "countryCode": "BY"
  },
  {
    "name": "Могилёв",
    "countryCode": "BY"
  },
  {
    "name": "Belmopan",
    "countryCode": "BZ"
  },
  {
    "name": "Ottawa",
    "countryCode": "CA"
  },
  {
    "name": "West Island",
    "countryCode": "CC"
  },
  {
    "name": "Kinshasa",
    "countryCode": "CD"
  },
  {
    "name": "Bangui",
    "countryCode": "CF"
  },
  {
    "name": "Brazzaville",
    "countryCode": "CG"
  },
  {
    "name": "Bern",
    "countryCode": "CH"
  },
  {
    "name": "Yamoussoukro",
    "countryCode": "CI"
  },
  {
    "name": "Avarua",
    "countryCode": "CK"
  },
  {
    "name": "Santiago",
    "countryCode": "CL"
  },
  {
    "name": "Yaounde",
    "countryCode": "CM"
  },
  {
    "name": "Beijing",
    "countryCode": "CN"
  },
  {
    "name": "Bogotá",
    "countryCode": "CO"
  },
  {
    "name": "San Jose",
    "countryCode": "CR"
  },
  {
    "name": "Havana",
    "countryCode": "CU"
  },
  {
    "name": "Praia",
    "countryCode": "CV"
  },
  {
    "name": "Willemstad",
    "countryCode": "CW"
  },
  {
    "name": "Flying Fish Cove",
    "countryCode": "CX"
  },
  {
    "name": "Nicosia",
    "countryCode": "CY"
  },
  {
    "name": "Prague",
    "countryCode": "CZ"
  },
  {
    "name": "Berlin",
    "countryCode": "DE"
  },
  {
    "name": "Djibouti",
    "countryCode": "DJ"
  },
  {
    "name": "Copenhagen",
    "countryCode": "DK"
  },
  {
    "name": "Roseau",
    "countryCode": "DM"
  },
  {
    "name": "Santo Domingo",
    "countryCode": "DO"
  },
  {
    "name": "Algiers",
    "countryCode": "DZ"
  },
  {
    "name": "Quito",
    "countryCode": "EC"
  },
  {
    "name": "Tallinn",
    "countryCode": "EE"
  },
  {
    "name": "Cairo",
    "countryCode": "EG"
  },
  {
    "name": "El-Aaiun",
    "countryCode": "EH"
  },
  {
    "name": "Asmara",
    "countryCode": "ER"
  },
  {
    "name": "Madrid",
    "countryCode": "ES"
  },
  {
    "name": "Addis Ababa",
    "countryCode": "ET"
  },
  {
    "name": "Helsinki",
    "countryCode": "FI"
  },
  {
    "name": "Suva",
    "countryCode": "FJ"
  },
  {
    "name": "Stanley",
    "countryCode": "FK"
  },
  {
    "name": "Palikir",
    "countryCode": "FM"
  },
  {
    "name": "Torshavn",
    "countryCode": "FO"
  },
  {
    "name": "Paris",
    "countryCode": "FR"
  },
  {
    "name": "Libreville",
    "countryCode": "GA"
  },
  {
    "name": "London",
    "countryCode": "GB"
  },
  {
    "name": "St. George's",
    "countryCode": "GD"
  },
  {
    "name": "Tbilisi",
    "countryCode": "GE"
  },
  {
    "name": "Батуми",
    "countryCode": "GE"
  },
  {
    "name": "Кутаиси",
    "countryCode": "GE"
  },
  {
    "name": "Cayenne",
    "countryCode": "GF"
  },
  {
    "name": "St Peter Port",
    "countryCode": "GG"
  },
  {
    "name": "Accra",
    "countryCode": "GH"
  },
  {
    "name": "Gibraltar",
    "countryCode": "GI"
  },
  {
    "name": "Nuuk",
    "countryCode": "GL"
  },
  {
    "name": "Banjul",
    "countryCode": "GM"
  },
  {
    "name": "Conakry",
    "countryCode": "GN"
  },
  {
    "name": "Basse-Terre",
    "countryCode": "GP"
  },
  {
    "name": "Malabo",
    "countryCode": "GQ"
  },
  {
    "name": "Athens",
    "countryCode": "GR"
  },
  {
    "name": "Grytviken",
    "countryCode": "GS"
  },
  {
    "name": "Guatemala City",
    "countryCode": "GT"
  },
  {
    "name": "Hagatna",
    "countryCode": "GU"
  },
  {
    "name": "Bissau",
    "countryCode": "GW"
  },
  {
    "name": "Georgetown",
    "countryCode": "GY"
  },
  {
    "name": "Hong Kong",
    "countryCode": "HK"
  },
  {
    "name": "Tegucigalpa",
    "countryCode": "HN"
  },
  {
    "name": "Zagreb",
    "countryCode": "HR"
  },
  {
    "name": "Port-au-Prince",
    "countryCode": "HT"
  },
  {
    "name": "Budapest",
    "countryCode": "HU"
  },
  {
    "name": "Jakarta",
    "countryCode": "ID"
  },
  {
    "name": "Dublin",
    "countryCode": "IE"
  },
  {
    "name": "Jerusalem",
    "countryCode": "IL"
  },
  {
    "name": "Douglas, Isle of Man",
    "countryCode": "IM"
  },
  {
    "name": "New Delhi",
    "countryCode": "IN"
  },
  {
    "name": "Diego Garcia",
    "countryCode": "IO"
  },
  {
    "name": "Baghdad",
    "countryCode": "IQ"
  },
  {
    "name": "Tehran",
    "countryCode": "IR"
  },
  {
    "name": "Reykjavik",
    "countryCode": "IS"
  },
  {
    "name": "Rome",
    "countryCode": "IT"
  },
  {
    "name": "Saint Helier",
    "countryCode": "JE"
  },
  {
    "name": "Kingston",
    "countryCode": "JM"
  },
  {
    "name": "Amman",
    "countryCode": "JO"
  },
  {
    "name": "Tokyo",
    "countryCode": "JP"
  },
  {
    "name": "Nairobi",
    "countryCode": "KE"
  },
  {
    "name": "Bishkek",
    "countryCode": "KG"
  },
  {
    "name": "Ош",
    "countryCode": "KG"
  },
  {
    "name": "Phnom Penh",
    "countryCode": "KH"
  },
  {
    "name": "Tarawa",
    "countryCode": "KI"
  },
  {
    "name": "Moroni",
    "countryCode": "KM"
  },
  {
    "name": "Basseterre",
    "countryCode": "KN"
  },
  {
    "name": "Pyongyang",
    "countryCode": "KP"
  },
  {
    "name": "Seoul",
    "countryCode": "KR"
  },
  {
    "name": "Kuwait City",
    "countryCode": "KW"
  },
  {
    "name": "George Town",
    "countryCode": "KY"
  },
  {
    "name": "Astana",
    "countryCode": "KZ"
  },
  {
    "name": "Актобе",
    "countryCode": "KZ"
  },
  {
    "name": "Алматы",
    "countryCode": "KZ"
  },
  {
    "name": "Караганда",
    "countryCode": "KZ"
  },
  {
    "name": "Павлодар",
    "countryCode": "KZ"
  },
  {
    "name": "Тараз",
    "countryCode": "KZ"
  },
  {
    "name": "Усть-Каменогорск",
    "countryCode": "KZ"
  },
  {
    "name": "Шымкент",
    "countryCode": "KZ"
  },
  {
    "name": "Vientiane",
    "countryCode": "LA"
  },
  {
    "name": "Beirut",
    "countryCode": "LB"
  },
  {
    "name": "Castries",
    "countryCode": "LC"
  },
  {
    "name": "Vaduz",
    "countryCode": "LI"
  },
  {
    "name": "Colombo",
    "countryCode": "LK"
  },
  {
    "name": "Monrovia",
    "countryCode": "LR"
  },
  {
    "name": "Maseru",
    "countryCode": "LS"
  },
  {
    "name": "Vilnius",
    "countryCode": "LT"
  },
  {
    "name": "Luxembourg",
    "countryCode": "LU"
  },
  {
    "name": "Riga",
    "countryCode": "LV"
  },
  {
    "name": "Tripolis",
    "countryCode": "LY"
  },
  {
    "name": "Rabat",
    "countryCode": "MA"
  },
  {
    "name": "Monaco",
    "countryCode": "MC"
  },
  {
    "name": "Chisinau",
    "countryCode": "MD"
  },
  {
    "name": "Бельцы",
    "countryCode": "MD"
  },
  {
    "name": "Тирасполь",
    "countryCode": "MD"
  },
  {
    "name": "Podgorica",
    "countryCode": "ME"
  },
  {
    "name": "Marigot",
    "countryCode": "MF"
  },
  {
    "name": "Antananarivo",
    "countryCode": "MG"
  },
  {
    "name": "Majuro",
    "countryCode": "MH"
  },
  {
    "name": "Skopje",
    "countryCode": "MK"
  },
  {
    "name": "Bamako",
    "countryCode": "ML"
  },
  {
    "name": "Nay Pyi Taw",
    "countryCode": "MM"
  },
  {
    "name": "Ulan Bator",
    "countryCode": "MN"
  },
  {
    "name": "Macao",
    "countryCode": "MO"
  },
  {
    "name": "Saipan",
    "countryCode": "MP"
  },
  {
    "name": "Fort-de-France",
    "countryCode": "MQ"
  },
  {
    "name": "Nouakchott",
    "countryCode": "MR"
  },
  {
    "name": "Plymouth",
    "countryCode": "MS"
  },
  {
    "name": "Valletta",
    "countryCode": "MT"
  },
  {
    "name": "Port Louis",
    "countryCode": "MU"
  },
  {
    "name": "Male",
    "countryCode": "MV"
  },
  {
    "name": "Lilongwe",
    "countryCode": "MW"
  },
  {
    "name": "Ciudad de México",
    "countryCode": "MX"
  },
  {
    "name": "Kuala Lumpur",
    "countryCode": "MY"
  },
  {
    "name": "Maputo",
    "countryCode": "MZ"
  },
  {
    "name": "Windhoek",
    "countryCode": "NA"
  },
  {
    "name": "Noumea",
    "countryCode": "NC"
  },
  {
    "name": "Niamey",
    "countryCode": "NE"
  },
  {
    "name": "Kingston",
    "countryCode": "NF"
  },
  {
    "name": "Abuja",
    "countryCode": "NG"
  },
  {
    "name": "Managua",
    "countryCode": "NI"
  },
  {
    "name": "Amsterdam",
    "countryCode": "NL"
  },
  {
    "name": "Oslo",
    "countryCode": "NO"
  },
  {
    "name": "Kathmandu",
    "countryCode": "NP"
  },
  {
    "name": "Yaren",
    "countryCode": "NR"
  },
  {
    "name": "Alofi",
    "countryCode": "NU"
  },
  {
    "name": "Wellington",
    "countryCode": "NZ"
  },
  {
    "name": "Muscat",
    "countryCode": "OM"
  },
  {
    "name": "Panama City",
    "countryCode": "PA"
  },
  {
    "name": "Lima",
    "countryCode": "PE"
  },
  {
    "name": "Papeete",
    "countryCode": "PF"
  },
  {
    "name": "Port Moresby",
    "countryCode": "PG"
  },
  {
    "name": "Manila",
    "countryCode": "PH"
  },
  {
    "name": "Islamabad",
    "countryCode": "PK"
  },
  {
    "name": "Warsaw",
    "countryCode": "PL"
  },
  {
    "name": "Saint-Pierre",
    "countryCode": "PM"
  },
  {
    "name": "Adamstown",
    "countryCode": "PN"
  },
  {
    "name": "San Juan",
    "countryCode": "PR"
  },
  {
    "name": "East Jerusalem",
    "countryCode": "PS"
  },
  {
    "name": "Lisbon",
    "countryCode": "PT"
  },
  {
    "name": "Melekeok",
    "countryCode": "PW"
  },
  {
    "name": "Asunción",
    "countryCode": "PY"
  },
  {
    "name": "Doha",
    "countryCode": "QA"
  },
  {
    "name": "Saint-Denis",
    "countryCode": "RE"
  },
  {
    "name": "Bucharest",
    "countryCode": "RO"
  },
  {
    "name": "Belgrade",
    "countryCode": "RS"
  },
  {
    "name": "Абакан",
    "countryCode": "RU"
  },
  {
    "name": "Азов",
    "countryCode": "RU"
  },
  {
    "name": "Александров",
    "countryCode": "RU"
  },
  {
    "name": "Алексин",
    "countryCode": "RU"
  },
  {
    "name": "Альметьевск",
    "countryCode": "RU"
  },
  {
    "name": "Анапа",
    "countryCode": "RU"
  },
  {
    "name": "Ангарск",
    "countryCode": "RU"
  },
  {
    "name": "Анжеро-Судженск",
    "countryCode": "RU"
  },
  {
    "name": "Апатиты",
    "countryCode": "RU"
  },
  {
    "name": "Арзамас",
    "countryCode": "RU"
  },
  {
    "name": "Армавир",
    "countryCode": "RU"
  },
  {
    "name": "Арсеньев",
    "countryCode": "RU"
  },
  {
    "name": "Артём",
    "countryCode": "RU"
  },
  {
    "name": "Архангельск",
    "countryCode": "RU"
  },
  {
    "name": "Асбест",
    "countryCode": "RU"
  },
  {
    "name": "Астрахань",
    "countryCode": "RU"
  },
  {
    "name": "Ачинск",
    "countryCode": "RU"
  },
  {
    "name": "Балаково",
    "countryCode": "RU"
  },
  {
    "name": "Балахна",
    "countryCode": "RU"
  },
  {
    "name": "Балашиха",
    "countryCode": "RU"
  },
  {
    "name": "Балашов",
    "countryCode": "RU"
  },
  {
    "name": "Барнаул",
    "countryCode": "RU"
  },
  {
    "name": "Батайск",
    "countryCode": "RU"
  },
  {
    "name": "Белгород",
    "countryCode": "RU"
  },
  {
    "name": "Белебей",
    "countryCode": "RU"
  },
  {
    "name": "Белово",
    "countryCode": "RU"
  },
  {
    "name": "Белогорск",
    "countryCode": "RU"
  },
  {
    "name": "Белорецк",
    "countryCode": "RU"
  },
  {
    "name": "Белореченск",
    "countryCode": "RU"
  },
  {
    "name": "Бердск",
    "countryCode": "RU"
  },
  {
    "name": "Березники",
    "countryCode": "RU"
  },
  {
    "name": "Берёзовский",
    "countryCode": "RU"
  },
  {
    "name": "Бийск",
    "countryCode": "RU"
  },
  {
    "name": "Биробиджан",
    "countryCode": "RU"
  },
  {
    "name": "Благовещенск",
    "countryCode": "RU"
  },
  {
    "name": "Бор",
    "countryCode": "RU"
  },
  {
    "name": "Борисоглебск",
    "countryCode": "RU"
  },
  {
    "name": "Боровичи",
    "countryCode": "RU"
  },
  {
    "name": "Братск",
    "countryCode": "RU"
  },
  {
    "name": "Брянск",
    "countryCode": "RU"
  },
  {
    "name": "Бугульма",
    "countryCode": "RU"
  },
  {
    "name": "Бугуруслан",
    "countryCode": "RU"
  },
  {
    "name": "Будённовск",
    "countryCode": "RU"
  },
  {
    "name": "Бузулук",
    "countryCode": "RU"
  },
  {
    "name": "Буйнакск",
    "countryCode": "RU"
  },
  {
    "name": "Великие Луки",
    "countryCode": "RU"
  },
  {
    "name": "Великий Новгород",
    "countryCode": "RU"
  },
  {
    "name": "Верхняя Пышма",
    "countryCode": "RU"
  },
  {
    "name": "Видное",
    "countryCode": "RU"
  },
  {
    "name": "Владивосток",
    "countryCode": "RU"
  },
  {
    "name": "Владикавказ",
    "countryCode": "RU"
  },
  {
    "name": "Владимир",
    "countryCode": "RU"
  },
  {
    "name": "Волгоград",
    "countryCode": "RU"
  },
  {
    "name": "Волгодонск",
    "countryCode": "RU"
  },
  {
    "name": "Волжск",
    "countryCode": "RU"
  },
  {
    "name": "Волжский",
    "countryCode": "RU"
  },
  {
    "name": "Вологда",
    "countryCode": "RU"
  },
  {
    "name": "Вольск",
    "countryCode": "RU"
  },
  {
    "name": "Воркута",
    "countryCode": "RU"
  },
  {
    "name": "Воронеж",
    "countryCode": "RU"
  },
  {
    "name": "Воскресенск",
    "countryCode": "RU"
  },
  {
    "name": "Воткинск",
    "countryCode": "RU"
  },
  {
    "name": "Всеволожск",
    "countryCode": "RU"
  },
  {
    "name": "Выборг",
    "countryCode": "RU"
  },
  {
    "name": "Выкса",
    "countryCode": "RU"
  },
  {
    "name": "Вышний Волочёк",
    "countryCode": "RU"
  },
  {
    "name": "Вязьма",
    "countryCode": "RU"
  },
  {
    "name": "Гатчина",
    "countryCode": "RU"
  },
  {
    "name": "Геленджик",
    "countryCode": "RU"
  },
  {
    "name": "Георгиевск",
    "countryCode": "RU"
  },
  {
    "name": "Глазов",
    "countryCode": "RU"
  },
  {
    "name": "Горно-Алтайск",
    "countryCode": "RU"
  },
  {
    "name": "Грозный",
    "countryCode": "RU"
  },
  {
    "name": "Губкин",
    "countryCode": "RU"
  },
  {
    "name": "Гуково",
    "countryCode": "RU"
  },
  {
    "name": "Гусь-Хрустальный",
    "countryCode": "RU"
  },
  {
    "name": "Дербент",
    "countryCode": "RU"
  },
  {
    "name": "Дзержинск",
    "countryCode": "RU"
  },
  {
    "name": "Димитровград",
    "countryCode": "RU"
  },
  {
    "name": "Дмитров",
    "countryCode": "RU"
  },
  {
    "name": "Долгопрудный",
    "countryCode": "RU"
  },
  {
    "name": "Домодедово",
    "countryCode": "RU"
  },
  {
    "name": "Донецк",
    "countryCode": "RU"
  },
  {
    "name": "Донской",
    "countryCode": "RU"
  },
  {
    "name": "Дубна",
    "countryCode": "RU"
  },
  {
    "name": "Евпатория",
    "countryCode": "RU"
  },
  {
    "name": "Егорьевск",
    "countryCode": "RU"
  },
  {
    "name": "Ейск",
    "countryCode": "RU"
  },
  {
    "name": "Екатеринбург",
    "countryCode": "RU"
  },
  {
    "name": "Елабуга",
    "countryCode": "RU"
  },
  {
    "name": "Елец",
    "countryCode": "RU"
  },
  {
    "name": "Ессентуки",
    "countryCode": "RU"
  },
  {
    "name": "Железногорск (Красноярский край)",
    "countryCode": "RU"
  },
  {
    "name": "Железногорск (Курская область)",
    "countryCode": "RU"
  },
  {
    "name": "Жигулёвск",
    "countryCode": "RU"
  },
  {
    "name": "Жуковский",
    "countryCode": "RU"
  },
  {
    "name": "Заречный",
    "countryCode": "RU"
  },
  {
    "name": "Зеленогорск",
    "countryCode": "RU"
  },
  {
    "name": "Зеленодольск",
    "countryCode": "RU"
  },
  {
    "name": "Златоуст",
    "countryCode": "RU"
  },
  {
    "name": "Иваново",
    "countryCode": "RU"
  },
  {
    "name": "Ивантеевка",
    "countryCode": "RU"
  },
  {
    "name": "Ижевск",
    "countryCode": "RU"
  },
  {
    "name": "Избербаш",
    "countryCode": "RU"
  },
  {
    "name": "Иркутск",
    "countryCode": "RU"
  },
  {
    "name": "Искитим",
    "countryCode": "RU"
  },
  {
    "name": "Ишим",
    "countryCode": "RU"
  },
  {
    "name": "Ишимбай",
    "countryCode": "RU"
  },
  {
    "name": "Йошкар-Ола",
    "countryCode": "RU"
  },
  {
    "name": "Казань",
    "countryCode": "RU"
  },
  {
    "name": "Калининград",
    "countryCode": "RU"
  },
  {
    "name": "Калуга",
    "countryCode": "RU"
  },
  {
    "name": "Каменск-Уральский",
    "countryCode": "RU"
  },
  {
    "name": "Каменск-Шахтинский",
    "countryCode": "RU"
  },
  {
    "name": "Камышин",
    "countryCode": "RU"
  },
  {
    "name": "Канск",
    "countryCode": "RU"
  },
  {
    "name": "Каспийск",
    "countryCode": "RU"
  },
  {
    "name": "Кемерово",
    "countryCode": "RU"
  },
  {
    "name": "Керчь",
    "countryCode": "RU"
  },
  {
    "name": "Кинешма",
    "countryCode": "RU"
  },
  {
    "name": "Кириши",
    "countryCode": "RU"
  },
  {
    "name": "Киров",
    "countryCode": "RU"
  },
  {
    "name": "Кирово-Чепецк",
    "countryCode": "RU"
  },
  {
    "name": "Киселёвск",
    "countryCode": "RU"
  },
  {
    "name": "Кисловодск",
    "countryCode": "RU"
  },
  {
    "name": "Клин",
    "countryCode": "RU"
  },
  {
    "name": "Клинцы",
    "countryCode": "RU"
  },
  {
    "name": "Ковров",
    "countryCode": "RU"
  },
  {
    "name": "Когалым",
    "countryCode": "RU"
  },
  {
    "name": "Коломна",
    "countryCode": "RU"
  },
  {
    "name": "Комсомольск-на-Амуре",
    "countryCode": "RU"
  },
  {
    "name": "Копейск",
    "countryCode": "RU"
  },
  {
    "name": "Королёв",
    "countryCode": "RU"
  },
  {
    "name": "Кострома",
    "countryCode": "RU"
  },
  {
    "name": "Котлас",
    "countryCode": "RU"
  },
  {
    "name": "Красногорск",
    "countryCode": "RU"
  },
  {
    "name": "Краснодар",
    "countryCode": "RU"
  },
  {
    "name": "Краснокаменск",
    "countryCode": "RU"
  },
  {
    "name": "Краснокамск",
    "countryCode": "RU"
  },
  {
    "name": "Краснотурьинск",
    "countryCode": "RU"
  },
  {
    "name": "Красноярск",
    "countryCode": "RU"
  },
  {
    "name": "Кропоткин",
    "countryCode": "RU"
  },
  {
    "name": "Крымск",
    "countryCode": "RU"
  },
  {
    "name": "Кстово",
    "countryCode": "RU"
  },
  {
    "name": "Кузнецк",
    "countryCode": "RU"
  },
  {
    "name": "Кумертау",
    "countryCode": "RU"
  },
  {
    "name": "Кунгур",
    "countryCode": "RU"
  },
  {
    "name": "Курган",
    "countryCode": "RU"
  },
  {
    "name": "Курск",
    "countryCode": "RU"
  },
  {
    "name": "Кызыл",
    "countryCode": "RU"
  },
  {
    "name": "Лабинск",
    "countryCode": "RU"
  },
  {
    "name": "Лениногорск",
    "countryCode": "RU"
  },
  {
    "name": "Ленинск-Кузнецкий",
    "countryCode": "RU"
  },
  {
    "name": "Лесной",
    "countryCode": "RU"
  },
  {
    "name": "Лесосибирск",
    "countryCode": "RU"
  },
  {
    "name": "Ливны",
    "countryCode": "RU"
  },
  {
    "name": "Липецк",
    "countryCode": "RU"
  },
  {
    "name": "Лиски",
    "countryCode": "RU"
  },
  {
    "name": "Лобня",
    "countryCode": "RU"
  },
  {
    "name": "Лысьва",
    "countryCode": "RU"
  },
  {
    "name": "Лыткарино",
    "countryCode": "RU"
  },
  {
    "name": "Люберцы",
    "countryCode": "RU"
  },
  {
    "name": "Магадан",
    "countryCode": "RU"
  },
  {
    "name": "Магнитогорск",
    "countryCode": "RU"
  },
  {
    "name": "Майкоп",
    "countryCode": "RU"
  },
  {
    "name": "Махачкала",
    "countryCode": "RU"
  },
  {
    "name": "Междуреченск",
    "countryCode": "RU"
  },
  {
    "name": "Мелеуз",
    "countryCode": "RU"
  },
  {
    "name": "Миасс",
    "countryCode": "RU"
  },
  {
    "name": "Минеральные Воды",
    "countryCode": "RU"
  },
  {
    "name": "Минусинск",
    "countryCode": "RU"
  },
  {
    "name": "Михайловка",
    "countryCode": "RU"
  },
  {
    "name": "Михайловск",
    "countryCode": "RU"
  },
  {
    "name": "Мичуринск",
    "countryCode": "RU"
  },
  {
    "name": "Москва",
    "countryCode": "RU"
  },
  {
    "name": "Мурманск",
    "countryCode": "RU"
  },
  {
    "name": "Муром",
    "countryCode": "RU"
  },
  {
    "name": "Мытищи",
    "countryCode": "RU"
  },
  {
    "name": "Набережные Челны",
    "countryCode": "RU"
  },
  {
    "name": "Назарово",
    "countryCode": "RU"
  },
  {
    "name": "Назрань",
    "countryCode": "RU"
  },
  {
    "name": "Нальчик",
    "countryCode": "RU"
  },
  {
    "name": "Наро-Фоминск",
    "countryCode": "RU"
  },
  {
    "name": "Находка",
    "countryCode": "RU"
  },
  {
    "name": "Невинномысск",
    "countryCode": "RU"
  },
  {
    "name": "Нерюнгри",
    "countryCode": "RU"
  },
  {
    "name": "Нефтекамск",
    "countryCode": "RU"
  },
  {
    "name": "Нефтеюганск",
    "countryCode": "RU"
  },
  {
    "name": "Нижневартовск",
    "countryCode": "RU"
  },
  {
    "name": "Нижнекамск",
    "countryCode": "RU"
  },
  {
    "name": "Нижний Новгород",
    "countryCode": "RU"
  },
  {
    "name": "Нижний Тагил",
    "countryCode": "RU"
  },
  {
    "name": "Новоалтайск",
    "countryCode": "RU"
  },
  {
    "name": "Новокузнецк",
    "countryCode": "RU"
  },
  {
    "name": "Новокуйбышевск",
    "countryCode": "RU"
  },
  {
    "name": "Новомосковск",
    "countryCode": "RU"
  },
  {
    "name": "Новороссийск",
    "countryCode": "RU"
  },
  {
    "name": "Новосибирск",
    "countryCode": "RU"
  },
  {
    "name": "Новотроицк",
    "countryCode": "RU"
  },
  {
    "name": "Новоуральск",
    "countryCode": "RU"
  },
  {
    "name": "Новочебоксарск",
    "countryCode": "RU"
  },
  {
    "name": "Новочеркасск",
    "countryCode": "RU"
  },
  {
    "name": "Новошахтинск",
    "countryCode": "RU"
  },
  {
    "name": "Новый Уренгой",
    "countryCode": "RU"
  },
  {
    "name": "Ногинск",
    "countryCode": "RU"
  },
  {
    "name": "Норильск",
    "countryCode": "RU"
  },
  {
    "name": "Ноябрьск",
    "countryCode": "RU"
  },
  {
    "name": "Нягань",
    "countryCode": "RU"
  },
  {
    "name": "Обнинск",
    "countryCode": "RU"
  },
  {
    "name": "Одинцово",
    "countryCode": "RU"
  },
  {
    "name": "Озёрск",
    "countryCode": "RU"
  },
  {
    "name": "Октябрьский",
    "countryCode": "RU"
  },
  {
    "name": "Омск",
    "countryCode": "RU"
  },
  {
    "name": "Орёл",
    "countryCode": "RU"
  },
  {
    "name": "Оренбург",
    "countryCode": "RU"
  },
  {
    "name": "Орехово-Зуево",
    "countryCode": "RU"
  },
  {
    "name": "Орск",
    "countryCode": "RU"
  },
  {
    "name": "Павлово",
    "countryCode": "RU"
  },
  {
    "name": "Павловский Посад",
    "countryCode": "RU"
  },
  {
    "name": "Пенза",
    "countryCode": "RU"
  },
  {
    "name": "Первоуральск",
    "countryCode": "RU"
  },
  {
    "name": "Пермь",
    "countryCode": "RU"
  },
  {
    "name": "Петрозаводск",
    "countryCode": "RU"
  },
  {
    "name": "Петропавловск-Камчатский",
    "countryCode": "RU"
  },
  {
    "name": "Подольск",
    "countryCode": "RU"
  },
  {
    "name": "Полевской",
    "countryCode": "RU"
  },
  {
    "name": "Прокопьевск",
    "countryCode": "RU"
  },
  {
    "name": "Прохладный",
    "countryCode": "RU"
  },
  {
    "name": "Псков",
    "countryCode": "RU"
  },
  {
    "name": "Пушкино",
    "countryCode": "RU"
  },
  {
    "name": "Пятигорск",
    "countryCode": "RU"
  },
  {
    "name": "Раменское",
    "countryCode": "RU"
  },
  {
    "name": "Ревда",
    "countryCode": "RU"
  },
  {
    "name": "Реутов",
    "countryCode": "RU"
  },
  {
    "name": "Ржев",
    "countryCode": "RU"
  },
  {
    "name": "Рославль",
    "countryCode": "RU"
  },
  {
    "name": "Россошь",
    "countryCode": "RU"
  },
  {
    "name": "Ростов-на-Дону",
    "countryCode": "RU"
  },
  {
    "name": "Рубцовск",
    "countryCode": "RU"
  },
  {
    "name": "Рыбинск",
    "countryCode": "RU"
  },
  {
    "name": "Рязань",
    "countryCode": "RU"
  },
  {
    "name": "Салават",
    "countryCode": "RU"
  },
  {
    "name": "Сальск",
    "countryCode": "RU"
  },
  {
    "name": "Самара",
    "countryCode": "RU"
  },
  {
    "name": "Санкт-Петербург",
    "countryCode": "RU"
  },
  {
    "name": "Саранск",
    "countryCode": "RU"
  },
  {
    "name": "Сарапул",
    "countryCode": "RU"
  },
  {
    "name": "Саратов",
    "countryCode": "RU"
  },
  {
    "name": "Саров",
    "countryCode": "RU"
  },
  {
    "name": "Свободный",
    "countryCode": "RU"
  },
  {
    "name": "Севастополь",
    "countryCode": "RU"
  },
  {
    "name": "Северодвинск",
    "countryCode": "RU"
  },
  {
    "name": "Североморск",
    "countryCode": "RU"
  },
  {
    "name": "Северск",
    "countryCode": "RU"
  },
  {
    "name": "Сергиев Посад",
    "countryCode": "RU"
  },
  {
    "name": "Серов",
    "countryCode": "RU"
  },
  {
    "name": "Серпухов",
    "countryCode": "RU"
  },
  {
    "name": "Сибай",
    "countryCode": "RU"
  },
  {
    "name": "Симферополь",
    "countryCode": "RU"
  },
  {
    "name": "Славянск-на-Кубани",
    "countryCode": "RU"
  },
  {
    "name": "Смоленск",
    "countryCode": "RU"
  },
  {
    "name": "Соликамск",
    "countryCode": "RU"
  },
  {
    "name": "Солнечногорск",
    "countryCode": "RU"
  },
  {
    "name": "Сосновый Бор",
    "countryCode": "RU"
  },
  {
    "name": "Сочи",
    "countryCode": "RU"
  },
  {
    "name": "Ставрополь",
    "countryCode": "RU"
  },
  {
    "name": "Старый Оскол",
    "countryCode": "RU"
  },
  {
    "name": "Стерлитамак",
    "countryCode": "RU"
  },
  {
    "name": "Ступино",
    "countryCode": "RU"
  },
  {
    "name": "Сунжа",
    "countryCode": "RU"
  },
  {
    "name": "Сургут",
    "countryCode": "RU"
  },
  {
    "name": "Сызрань",
    "countryCode": "RU"
  },
  {
    "name": "Сыктывкар",
    "countryCode": "RU"
  },
  {
    "name": "Таганрог",
    "countryCode": "RU"
  },
  {
    "name": "Тамбов",
    "countryCode": "RU"
  },
  {
    "name": "Тверь",
    "countryCode": "RU"
  },
  {
    "name": "Тимашёвск",
    "countryCode": "RU"
  },
  {
    "name": "Тихвин",
    "countryCode": "RU"
  },
  {
    "name": "Тихорецк",
    "countryCode": "RU"
  },
  {
    "name": "Тобольск",
    "countryCode": "RU"
  },
  {
    "name": "Тольятти",
    "countryCode": "RU"
  },
  {
    "name": "Томск",
    "countryCode": "RU"
  },
  {
    "name": "Троицк",
    "countryCode": "RU"
  },
  {
    "name": "Туапсе",
    "countryCode": "RU"
  },
  {
    "name": "Туймазы",
    "countryCode": "RU"
  },
  {
    "name": "Тула",
    "countryCode": "RU"
  },
  {
    "name": "Тюмень",
    "countryCode": "RU"
  },
  {
    "name": "Узловая",
    "countryCode": "RU"
  },
  {
    "name": "Улан-Удэ",
    "countryCode": "RU"
  },
  {
    "name": "Ульяновск",
    "countryCode": "RU"
  },
  {
    "name": "Усолье-Сибирское",
    "countryCode": "RU"
  },
  {
    "name": "Уссурийск",
    "countryCode": "RU"
  },
  {
    "name": "Усть-Илимск",
    "countryCode": "RU"
  },
  {
    "name": "Уфа",
    "countryCode": "RU"
  },
  {
    "name": "Ухта",
    "countryCode": "RU"
  },
  {
    "name": "Феодосия",
    "countryCode": "RU"
  },
  {
    "name": "Фрязино",
    "countryCode": "RU"
  },
  {
    "name": "Хабаровск",
    "countryCode": "RU"
  },
  {
    "name": "Ханты-Мансийск",
    "countryCode": "RU"
  },
  {
    "name": "Хасавюрт",
    "countryCode": "RU"
  },
  {
    "name": "Химки",
    "countryCode": "RU"
  },
  {
    "name": "Чайковский",
    "countryCode": "RU"
  },
  {
    "name": "Чапаевск",
    "countryCode": "RU"
  },
  {
    "name": "Чебоксары",
    "countryCode": "RU"
  },
  {
    "name": "Челябинск",
    "countryCode": "RU"
  },
  {
    "name": "Черемхово",
    "countryCode": "RU"
  },
  {
    "name": "Череповец",
    "countryCode": "RU"
  },
  {
    "name": "Черкесск",
    "countryCode": "RU"
  },
  {
    "name": "Черногорск",
    "countryCode": "RU"
  },
  {
    "name": "Чехов",
    "countryCode": "RU"
  },
  {
    "name": "Чистополь",
    "countryCode": "RU"
  },
  {
    "name": "Чита",
    "countryCode": "RU"
  },
  {
    "name": "Шадринск",
    "countryCode": "RU"
  },
  {
    "name": "Шахты",
    "countryCode": "RU"
  },
  {
    "name": "Шуя",
    "countryCode": "RU"
  },
  {
    "name": "Щёкино",
    "countryCode": "RU"
  },
  {
    "name": "Щёлково",
    "countryCode": "RU"
  },
  {
    "name": "Электросталь",
    "countryCode": "RU"
  },
  {
    "name": "Элиста",
    "countryCode": "RU"
  },
  {
    "name": "Энгельс",
    "countryCode": "RU"
  },
  {
    "name": "Южно-Сахалинск",
    "countryCode": "RU"
  },
  {
    "name": "Юрга",
    "countryCode": "RU"
  },
  {
    "name": "Якутск",
    "countryCode": "RU"
  },
  {
    "name": "Ялта",
    "countryCode": "RU"
  },
  {
    "name": "Ярославль",
    "countryCode": "RU"
  },
  {
    "name": "Kigali",
    "countryCode": "RW"
  },
  {
    "name": "Riyadh",
    "countryCode": "SA"
  },
  {
    "name": "Honiara",
    "countryCode": "SB"
  },
  {
    "name": "Victoria",
    "countryCode": "SC"
  },
  {
    "name": "Khartoum",
    "countryCode": "SD"
  },
  {
    "name": "Stockholm",
    "countryCode": "SE"
  },
  {
    "name": "Singapur",
    "countryCode": "SG"
  },
  {
    "name": "Jamestown",
    "countryCode": "SH"
  },
  {
    "name": "Ljubljana",
    "countryCode": "SI"
  },
  {
    "name": "Longyearbyen",
    "countryCode": "SJ"
  },
  {
    "name": "Bratislava",
    "countryCode": "SK"
  },
  {
    "name": "Freetown",
    "countryCode": "SL"
  },
  {
    "name": "San Marino",
    "countryCode": "SM"
  },
  {
    "name": "Dakar",
    "countryCode": "SN"
  },
  {
    "name": "Mogadishu",
    "countryCode": "SO"
  },
  {
    "name": "Paramaribo",
    "countryCode": "SR"
  },
  {
    "name": "Juba",
    "countryCode": "SS"
  },
  {
    "name": "Sao Tome",
    "countryCode": "ST"
  },
  {
    "name": "San Salvador",
    "countryCode": "SV"
  },
  {
    "name": "Philipsburg",
    "countryCode": "SX"
  },
  {
    "name": "Damascus",
    "countryCode": "SY"
  },
  {
    "name": "Mbabane",
    "countryCode": "SZ"
  },
  {
    "name": "Cockburn Town",
    "countryCode": "TC"
  },
  {
    "name": "N'Djamena",
    "countryCode": "TD"
  },
  {
    "name": "Port-aux-Francais",
    "countryCode": "TF"
  },
  {
    "name": "Lome",
    "countryCode": "TG"
  },
  {
    "name": "Bangkok",
    "countryCode": "TH"
  },
  {
    "name": "Dushanbe",
    "countryCode": "TJ"
  },
  {
    "name": "Dili",
    "countryCode": "TL"
  },
  {
    "name": "Ashgabat",
    "countryCode": "TM"
  },
  {
    "name": "Tunis",
    "countryCode": "TN"
  },
  {
    "name": "Nuku'alofa",
    "countryCode": "TO"
  },
  {
    "name": "Ankara",
    "countryCode": "TR"
  },
  {
    "name": "Port of Spain",
    "countryCode": "TT"
  },
  {
    "name": "Funafuti",
    "countryCode": "TV"
  },
  {
    "name": "Taipei",
    "countryCode": "TW"
  },
  {
    "name": "Dodoma",
    "countryCode": "TZ"
  },
  {
    "name": "Kampala",
    "countryCode": "UG"
  },
  {
    "name": "Washington",
    "countryCode": "US"
  },
  {
    "name": "Montevideo",
    "countryCode": "UY"
  },
  {
    "name": "Tashkent",
    "countryCode": "UZ"
  },
  {
    "name": "Андижан",
    "countryCode": "UZ"
  },
  {
    "name": "Бухара",
    "countryCode": "UZ"
  },
  {
    "name": "Наманган",
    "countryCode": "UZ"
  },
  {
    "name": "Самарканд",
    "countryCode": "UZ"
  },
  {
    "name": "Vatican City",
    "countryCode": "VA"
  },
  {
    "name": "Kingstown",
    "countryCode": "VC"
  },
  {
    "name": "Caracas",
    "countryCode": "VE"
  },
  {
    "name": "Road Town",
    "countryCode": "VG"
  },
  {
    "name": "Charlotte Amalie",
    "countryCode": "VI"
  },
  {
    "name": "Hanoi",
    "countryCode": "VN"
  },
  {
    "name": "Port Vila",
    "countryCode": "VU"
  },
  {
    "name": "Mata Utu",
    "countryCode": "WF"
  },
  {
    "name": "Apia",
    "countryCode": "WS"
  },
  {
    "name": "Pristina",
    "countryCode": "XK"
  },
  {
    "name": "Sanaa",
    "countryCode": "YE"
  },
  {
    "name": "Mamoudzou",
    "countryCode": "YT"
  },
  {
    "name": "Pretoria",
    "countryCode": "ZA"
  },
  {
    "name": "Lusaka",
    "countryCode": "ZM"
  },
  {
    "name": "Harare",
    "countryCode": "ZW"
  }
];

export default cities;
