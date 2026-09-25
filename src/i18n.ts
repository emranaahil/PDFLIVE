import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/translation.json";
import hi from "./locales/hi/translation.json";
import mr from "./locales/mr/translation.json";
import bn from "./locales/bn/translation.json";
import te from "./locales/te/translation.json";
import ta from "./locales/ta/translation.json";
import es from "./locales/es/translation.json";
import id from "./locales/id/translation.json";
import ptBR from "./locales/pt-BR/translation.json";
import vi from "./locales/vi/translation.json";
import tl from "./locales/tl/translation.json";

function detectRegionLanguage(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Kolkata") || tz.includes("Calcutta")) {
      if (typeof navigator !== "undefined") {
        const nav = (navigator.languages || [navigator.language]).join(",").toLowerCase();
        if (nav.includes("mr")) return "mr";
        if (nav.includes("bn")) return "bn";
        if (nav.includes("te")) return "te";
        if (nav.includes("ta")) return "ta";
      }
      return "hi";
    }
    if (tz.includes("Jakarta") || tz.includes("Makassar") || tz.includes("Jayapura")) {
      return "id";
    }
    if (
      tz.includes("Sao_Paulo") ||
      tz.includes("Fortaleza") ||
      tz.includes("Manaus") ||
      tz.includes("Recife") ||
      tz.includes("Belem") ||
      tz.includes("Cuiaba")
    ) {
      return "pt-BR";
    }
    if (tz.includes("Ho_Chi_Minh") || tz.includes("Saigon") || tz.includes("Hanoi")) {
      return "vi";
    }
    if (tz.includes("Manila")) {
      return "tl";
    }
    if (
      tz.includes("Madrid") ||
      tz.includes("Canary") ||
      tz.includes("Mexico") ||
      tz.includes("Bogota") ||
      tz.includes("Buenos_Aires") ||
      tz.includes("Santiago") ||
      tz.includes("Lima") ||
      tz.includes("Caracas") ||
      tz.includes("Montevideo") ||
      tz.includes("Asuncion") ||
      tz.includes("La_Paz") ||
      tz.includes("Guayaquil") ||
      tz.includes("Tegucigalpa") ||
      tz.includes("Guatemala") ||
      tz.includes("Managua") ||
      tz.includes("San_Jose") ||
      tz.includes("San_Salvador") ||
      tz.includes("Panama") ||
      tz.includes("Santo_Domingo") ||
      tz.includes("Havana")
    ) {
      return "es";
    }
  } catch {
    /* fallback to browser language */
  }

  if (typeof navigator !== "undefined") {
    const langs = navigator.languages || [navigator.language];
    for (const l of langs) {
      const code = l?.toLowerCase();
      if (code.startsWith("hi")) return "hi";
      if (code.startsWith("mr")) return "mr";
      if (code.startsWith("bn")) return "bn";
      if (code.startsWith("te")) return "te";
      if (code.startsWith("ta")) return "ta";
      if (code.startsWith("id")) return "id";
      if (code.startsWith("pt")) return "pt-BR";
      if (code.startsWith("es")) return "es";
      if (code.startsWith("vi")) return "vi";
      if (code.startsWith("tl") || code.startsWith("fil")) return "tl";
      if (code.startsWith("en")) return "en";
    }
  }

  return "en";
}

const detector = new LanguageDetector();
detector.addDetector({
  name: "regionDetector",
  lookup() {
    return detectRegionLanguage();
  },
});

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      bn: { translation: bn },
      te: { translation: te },
      ta: { translation: ta },
      es: { translation: es },
      id: { translation: id },
      "pt-BR": { translation: ptBR },
      vi: { translation: vi },
      tl: { translation: tl },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "regionDetector", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
