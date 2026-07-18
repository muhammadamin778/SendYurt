/**
 * Country dial codes for the phone top-up picker. Flag is derived from the
 * ISO-3166 alpha-2 code (regional-indicator emoji) so we don't ship images.
 * Uzbekistan (+998) is the intended default. Ordered roughly by relevance to
 * the Uzbek migration corridors, then the rest alphabetically.
 */
export interface Country {
  name: string;
  iso: string;
  dial: string;
}

/** Convert a 2-letter ISO code into its flag emoji. */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const COUNTRIES: Country[] = [
  { name: "Uzbekistan", iso: "UZ", dial: "+998" },
  { name: "Russia", iso: "RU", dial: "+7" },
  { name: "Kazakhstan", iso: "KZ", dial: "+7" },
  { name: "Kyrgyzstan", iso: "KG", dial: "+996" },
  { name: "Tajikistan", iso: "TJ", dial: "+992" },
  { name: "Turkmenistan", iso: "TM", dial: "+993" },
  { name: "Turkey", iso: "TR", dial: "+90" },
  { name: "United States", iso: "US", dial: "+1" },
  { name: "United Kingdom", iso: "GB", dial: "+44" },
  { name: "South Korea", iso: "KR", dial: "+82" },
  { name: "United Arab Emirates", iso: "AE", dial: "+971" },
  { name: "Germany", iso: "DE", dial: "+49" },
  { name: "Afghanistan", iso: "AF", dial: "+93" },
  { name: "Albania", iso: "AL", dial: "+355" },
  { name: "Algeria", iso: "DZ", dial: "+213" },
  { name: "Argentina", iso: "AR", dial: "+54" },
  { name: "Armenia", iso: "AM", dial: "+374" },
  { name: "Australia", iso: "AU", dial: "+61" },
  { name: "Austria", iso: "AT", dial: "+43" },
  { name: "Azerbaijan", iso: "AZ", dial: "+994" },
  { name: "Bahrain", iso: "BH", dial: "+973" },
  { name: "Bangladesh", iso: "BD", dial: "+880" },
  { name: "Belarus", iso: "BY", dial: "+375" },
  { name: "Belgium", iso: "BE", dial: "+32" },
  { name: "Brazil", iso: "BR", dial: "+55" },
  { name: "Bulgaria", iso: "BG", dial: "+359" },
  { name: "Canada", iso: "CA", dial: "+1" },
  { name: "China", iso: "CN", dial: "+86" },
  { name: "Croatia", iso: "HR", dial: "+385" },
  { name: "Cyprus", iso: "CY", dial: "+357" },
  { name: "Czechia", iso: "CZ", dial: "+420" },
  { name: "Denmark", iso: "DK", dial: "+45" },
  { name: "Egypt", iso: "EG", dial: "+20" },
  { name: "Estonia", iso: "EE", dial: "+372" },
  { name: "Finland", iso: "FI", dial: "+358" },
  { name: "France", iso: "FR", dial: "+33" },
  { name: "Georgia", iso: "GE", dial: "+995" },
  { name: "Greece", iso: "GR", dial: "+30" },
  { name: "Hungary", iso: "HU", dial: "+36" },
  { name: "India", iso: "IN", dial: "+91" },
  { name: "Indonesia", iso: "ID", dial: "+62" },
  { name: "Iran", iso: "IR", dial: "+98" },
  { name: "Iraq", iso: "IQ", dial: "+964" },
  { name: "Ireland", iso: "IE", dial: "+353" },
  { name: "Israel", iso: "IL", dial: "+972" },
  { name: "Italy", iso: "IT", dial: "+39" },
  { name: "Japan", iso: "JP", dial: "+81" },
  { name: "Jordan", iso: "JO", dial: "+962" },
  { name: "Kuwait", iso: "KW", dial: "+965" },
  { name: "Latvia", iso: "LV", dial: "+371" },
  { name: "Lithuania", iso: "LT", dial: "+370" },
  { name: "Malaysia", iso: "MY", dial: "+60" },
  { name: "Moldova", iso: "MD", dial: "+373" },
  { name: "Mongolia", iso: "MN", dial: "+976" },
  { name: "Morocco", iso: "MA", dial: "+212" },
  { name: "Netherlands", iso: "NL", dial: "+31" },
  { name: "Norway", iso: "NO", dial: "+47" },
  { name: "Oman", iso: "OM", dial: "+968" },
  { name: "Pakistan", iso: "PK", dial: "+92" },
  { name: "Philippines", iso: "PH", dial: "+63" },
  { name: "Poland", iso: "PL", dial: "+48" },
  { name: "Portugal", iso: "PT", dial: "+351" },
  { name: "Qatar", iso: "QA", dial: "+974" },
  { name: "Romania", iso: "RO", dial: "+40" },
  { name: "Saudi Arabia", iso: "SA", dial: "+966" },
  { name: "Serbia", iso: "RS", dial: "+381" },
  { name: "Singapore", iso: "SG", dial: "+65" },
  { name: "Slovakia", iso: "SK", dial: "+421" },
  { name: "Slovenia", iso: "SI", dial: "+386" },
  { name: "Spain", iso: "ES", dial: "+34" },
  { name: "Sweden", iso: "SE", dial: "+46" },
  { name: "Switzerland", iso: "CH", dial: "+41" },
  { name: "Thailand", iso: "TH", dial: "+66" },
  { name: "Ukraine", iso: "UA", dial: "+380" },
  { name: "Vietnam", iso: "VN", dial: "+84" },
];
