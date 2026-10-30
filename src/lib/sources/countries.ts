/** FIFA codes as used by Wikipedia's football templates, with English and Arabic names. */
export const TEAMS: Record<string, [string, string]> = {
  MAR: ["Morocco", "المغرب"], ALG: ["Algeria", "الجزائر"], TUN: ["Tunisia", "تونس"], EGY: ["Egypt", "مصر"], LBY: ["Libya", "ليبيا"], MTN: ["Mauritania", "موريتانيا"],
  SEN: ["Senegal", "السنغال"], CIV: ["Ivory Coast", "كوت ديفوار"], NGA: ["Nigeria", "نيجيريا"], GHA: ["Ghana", "غانا"], CMR: ["Cameroon", "الكاميرون"], MLI: ["Mali", "مالي"],
  RSA: ["South Africa", "جنوب أفريقيا"], COD: ["DR Congo", "الكونغو الديمقراطية"], CGO: ["Congo", "الكونغو"], GUI: ["Guinea", "غينيا"], BFA: ["Burkina Faso", "بوركينا فاسو"], GAB: ["Gabon", "الغابون"],
  ANG: ["Angola", "أنغولا"], ZAM: ["Zambia", "زامبيا"], KEN: ["Kenya", "كينيا"], TAN: ["Tanzania", "تنزانيا"], UGA: ["Uganda", "أوغندا"], ETH: ["Ethiopia", "إثيوبيا"], SUD: ["Sudan", "السودان"],
  KSA: ["Saudi Arabia", "السعودية"], QAT: ["Qatar", "قطر"], UAE: ["United Arab Emirates", "الإمارات"], JOR: ["Jordan", "الأردن"], IRQ: ["Iraq", "العراق"], KUW: ["Kuwait", "الكويت"], BHR: ["Bahrain", "البحرين"],
  OMA: ["Oman", "عمان"], SYR: ["Syria", "سوريا"], LBN: ["Lebanon", "لبنان"], PLE: ["Palestine", "فلسطين"], YEM: ["Yemen", "اليمن"], IRN: ["Iran", "إيران"], JPN: ["Japan", "اليابان"], KOR: ["South Korea", "كوريا الجنوبية"], CHN: ["China", "الصين"],
  FRA: ["France", "فرنسا"], ESP: ["Spain", "إسبانيا"], POR: ["Portugal", "البرتغال"], GER: ["Germany", "ألمانيا"], ITA: ["Italy", "إيطاليا"], ENG: ["England", "إنجلترا"], NED: ["Netherlands", "هولندا"], BEL: ["Belgium", "بلجيكا"],
  CRO: ["Croatia", "كرواتيا"], SUI: ["Switzerland", "سويسرا"], POL: ["Poland", "بولندا"], SWE: ["Sweden", "السويد"], DEN: ["Denmark", "الدنمارك"], NOR: ["Norway", "النرويج"], GRE: ["Greece", "اليونان"], TUR: ["Turkey", "تركيا"], RUS: ["Russia", "روسيا"], SCO: ["Scotland", "اسكتلندا"], IRL: ["Ireland", "أيرلندا"], SRB: ["Serbia", "صربيا"],
  BRA: ["Brazil", "البرازيل"], ARG: ["Argentina", "الأرجنتين"], URU: ["Uruguay", "الأوروغواي"], CHI: ["Chile", "تشيلي"], COL: ["Colombia", "كولومبيا"], PER: ["Peru", "البيرو"], PAR: ["Paraguay", "باراغواي"], ECU: ["Ecuador", "الإكوادور"], USA: ["United States", "الولايات المتحدة"], MEX: ["Mexico", "المكسيك"], CAN: ["Canada", "كندا"], AUS: ["Australia", "أستراليا"],
};

export function teamFrom(cell: string): { code?: string; name?: string; ar?: string } {
  const code = /\{\{\s*(?:fb|fb-rt|flagdeco|fbu|flagicon|flag)\s*\|\s*([A-Z]{3})/i.exec(cell)?.[1]?.toUpperCase();
  const known = code ? TEAMS[code] : undefined;
  if (known) return { code, name: known[0], ar: known[1] };
  const text = /\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/.exec(cell)?.[1] ?? cell.replace(/\{\{[^}]*\}\}/g, "").trim();
  return { code, name: text || code };
}
