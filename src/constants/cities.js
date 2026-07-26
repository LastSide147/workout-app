// СТАРТОВЫЙ список городов для автодополнения при выборе в профиле.
// Пока состоит из: столицы каждой страны (настоящие данные, не
// вручную) + вручную добавленные крупные города России и части стран
// СНГ. Украина намеренно не включена.
//
// Это НЕ полный список городов мира и не финальная версия — такого
// источника с точным населением не нашлось в открытом доступе оттуда,
// куда есть доступ сейчас. Приложение доступно и пользователям из
// других стран (Google Play), которых этот список пока не покрывает.
// Файл специально сделан так, чтобы его было легко расширить позже —
// либо дополнить прямо здесь, либо целиком заменить на другой
// источник (например, полноценную базу городов с фильтром по
// населению) — остальной код (поиск, фильтрация) не завязан на то,
// откуда взялись данные, ему нужен только формат
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
    "name": "Moscow",
    "countryCode": "RU"
  },
  {
    "name": "Астрахань",
    "countryCode": "RU"
  },
  {
    "name": "Балашиха",
    "countryCode": "RU"
  },
  {
    "name": "Барнаул",
    "countryCode": "RU"
  },
  {
    "name": "Белгород",
    "countryCode": "RU"
  },
  {
    "name": "Брянск",
    "countryCode": "RU"
  },
  {
    "name": "Владивосток",
    "countryCode": "RU"
  },
  {
    "name": "Волгоград",
    "countryCode": "RU"
  },
  {
    "name": "Воронеж",
    "countryCode": "RU"
  },
  {
    "name": "Екатеринбург",
    "countryCode": "RU"
  },
  {
    "name": "Иваново",
    "countryCode": "RU"
  },
  {
    "name": "Ижевск",
    "countryCode": "RU"
  },
  {
    "name": "Иркутск",
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
    "name": "Кемерово",
    "countryCode": "RU"
  },
  {
    "name": "Киров",
    "countryCode": "RU"
  },
  {
    "name": "Краснодар",
    "countryCode": "RU"
  },
  {
    "name": "Красноярск",
    "countryCode": "RU"
  },
  {
    "name": "Курск",
    "countryCode": "RU"
  },
  {
    "name": "Липецк",
    "countryCode": "RU"
  },
  {
    "name": "Магнитогорск",
    "countryCode": "RU"
  },
  {
    "name": "Махачкала",
    "countryCode": "RU"
  },
  {
    "name": "Набережные Челны",
    "countryCode": "RU"
  },
  {
    "name": "Нижний Новгород",
    "countryCode": "RU"
  },
  {
    "name": "Новокузнецк",
    "countryCode": "RU"
  },
  {
    "name": "Новосибирск",
    "countryCode": "RU"
  },
  {
    "name": "Омск",
    "countryCode": "RU"
  },
  {
    "name": "Оренбург",
    "countryCode": "RU"
  },
  {
    "name": "Пенза",
    "countryCode": "RU"
  },
  {
    "name": "Пермь",
    "countryCode": "RU"
  },
  {
    "name": "Ростов-на-Дону",
    "countryCode": "RU"
  },
  {
    "name": "Рязань",
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
    "name": "Саратов",
    "countryCode": "RU"
  },
  {
    "name": "Севастополь",
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
    "name": "Тверь",
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
    "name": "Тула",
    "countryCode": "RU"
  },
  {
    "name": "Тюмень",
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
    "name": "Уфа",
    "countryCode": "RU"
  },
  {
    "name": "Хабаровск",
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
