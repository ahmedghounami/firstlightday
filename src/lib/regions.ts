import type { Region } from "./types";

const TABLE: Record<Region, string> = {
  Africa: "Algeria,Angola,Benin,Botswana,Burkina Faso,Burundi,Cameroon,Cape Verde,Central African Republic,Chad,Comoros,Democratic Republic of the Congo,Republic of the Congo,Djibouti,Egypt,Equatorial Guinea,Eritrea,Eswatini,Ethiopia,Gabon,The Gambia,Gambia,Ghana,Guinea,Guinea-Bissau,Ivory Coast,Kenya,Lesotho,Liberia,Libya,Madagascar,Malawi,Mali,Mauritania,Mauritius,Morocco,Mozambique,Namibia,Niger,Nigeria,Rwanda,Senegal,Seychelles,Sierra Leone,Somalia,South Africa,South Sudan,Sudan,Tanzania,Togo,Tunisia,Uganda,Zambia,Zimbabwe",
  Asia: "Afghanistan,Armenia,Azerbaijan,Bahrain,Bangladesh,Bhutan,Brunei,Cambodia,China,People's Republic of China,Hong Kong,Taiwan,Georgia,India,Indonesia,Iran,Iraq,Israel,Palestine,Japan,Jordan,Kazakhstan,Kuwait,Kyrgyzstan,Laos,Lebanon,Malaysia,Maldives,Mongolia,Myanmar,Nepal,North Korea,South Korea,Oman,Pakistan,Philippines,Qatar,Saudi Arabia,Singapore,Sri Lanka,Syria,Tajikistan,Thailand,Timor-Leste,East Timor,Turkey,Turkmenistan,United Arab Emirates,Uzbekistan,Vietnam,Yemen",
  Europe: "Albania,Andorra,Austria,Belarus,Belgium,Bosnia and Herzegovina,Bulgaria,Croatia,Cyprus,Czech Republic,Czechia,Czechoslovakia,Denmark,England,Estonia,Finland,France,Germany,West Germany,East Germany,Greece,Hungary,Iceland,Ireland,Italy,Kosovo,Latvia,Liechtenstein,Lithuania,Luxembourg,Malta,Moldova,Monaco,Montenegro,Netherlands,Kingdom of the Netherlands,North Macedonia,Northern Ireland,Norway,Poland,Portugal,Romania,Russia,San Marino,Scotland,Serbia,Slovakia,Slovenia,Soviet Union,Spain,Sweden,Switzerland,Ukraine,United Kingdom,Vatican City,Wales,Yugoslavia",
  "North America": "Antigua and Barbuda,Bahamas,The Bahamas,Barbados,Belize,Canada,Costa Rica,Cuba,Dominica,Dominican Republic,El Salvador,Grenada,Guatemala,Haiti,Honduras,Jamaica,Mexico,Nicaragua,Panama,Puerto Rico,Saint Kitts and Nevis,Saint Lucia,Saint Vincent and the Grenadines,Trinidad and Tobago,United States,United States of America",
  "South America": "Argentina,Bolivia,Brazil,Chile,Colombia,Ecuador,Guyana,Paraguay,Peru,Suriname,Uruguay,Venezuela",
  Oceania: "Australia,Fiji,Kiribati,Marshall Islands,Micronesia,Nauru,New Zealand,Palau,Papua New Guinea,Samoa,Solomon Islands,Tonga,Tuvalu,Vanuatu",
  Worldwide: "",
};

const byCountry = new Map<string, Region>();
for (const [region, list] of Object.entries(TABLE) as [Region, string][]) {
  for (const name of list.split(",")) if (name) byCountry.set(name.toLowerCase(), region);
}

export function regionOf(country: string | undefined): Region | undefined {
  return country ? byCountry.get(country.toLowerCase()) : undefined;
}
