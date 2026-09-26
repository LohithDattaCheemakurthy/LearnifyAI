/**
 * Learnify AI — Global Automatic Locale, Country & Language System
 *
 * Implements privacy-preserving, zero-GPS automatic localization:
 * 1. Saved authenticated user profile preference
 * 2. Stored local preferences ('learnify-locale', 'learnify-lang')
 * 3. Client timezone inference & navigator.language
 * 4. Safe fallback: Country IN (India), Language 'en', Currency 'INR'
 *
 * NOTE: No GPS is ever requested for locale/currency detection.
 * Razorpay acts as the primary provider handling payment currency conversion.
 */

import { SUPPORTED_LANGUAGES, type LanguageCode, DEFAULT_LANGUAGE } from "@/i18n";
import i18n from "i18next";

export interface UserLocaleContext {
  countryCode: string;
  languageCode: LanguageCode;
  locale: string;
  currencyCode: string;
  timezone: string;
}

const TIMEZONE_COUNTRY_MAP: Record<string, { country: string; lang: LanguageCode; currency: string }> = {
  "Asia/Kolkata": { country: "IN", lang: "en", currency: "INR" },
  "Asia/Calcutta": { country: "IN", lang: "en", currency: "INR" },
  "America/New_York": { country: "US", lang: "en", currency: "INR" },
  "America/Chicago": { country: "US", lang: "en", currency: "INR" },
  "America/Denver": { country: "US", lang: "en", currency: "INR" },
  "America/Los_Angeles": { country: "US", lang: "en", currency: "INR" },
  "Europe/London": { country: "GB", lang: "en", currency: "INR" },
  "Europe/Paris": { country: "FR", lang: "fr", currency: "INR" },
  "Europe/Berlin": { country: "DE", lang: "de", currency: "INR" },
  "Europe/Madrid": { country: "ES", lang: "es", currency: "INR" },
};

const COUNTRY_LANGUAGE_MAP: Record<string, LanguageCode> = {
  IN: "en",
  US: "en",
  GB: "en",
  FR: "fr",
  DE: "de",
  ES: "es",
};

export function detectUserLocale(savedProfile?: { country?: string; language?: string }): UserLocaleContext {
  if (typeof window === "undefined") {
    return {
      countryCode: "IN",
      languageCode: "en",
      locale: "en-IN",
      currencyCode: "INR",
      timezone: "Asia/Kolkata",
    };
  }

  // 1. Saved Profile
  if (savedProfile?.country || savedProfile?.language) {
    const lang = (savedProfile.language as LanguageCode) || "en";
    const country = savedProfile.country || "IN";
    return {
      countryCode: country,
      languageCode: isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE,
      locale: `${lang}-${country}`,
      currencyCode: "INR", // Learnify canonical pricing remains INR
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    };
  }

  // 2. Local Storage explicit preference
  const storedLang = localStorage.getItem("learnify-lang") as LanguageCode | null;
  const storedCountry = localStorage.getItem("learnify-country");

  // 3. Timezone detection
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  const tzMatch = TIMEZONE_COUNTRY_MAP[tz];

  const countryCode = storedCountry || tzMatch?.country || "IN";
  
  // 4. Browser language detection
  const browserLang = (navigator.language || (navigator as any).userLanguage || "en").split("-")[0].toLowerCase();
  
  let languageCode: LanguageCode = DEFAULT_LANGUAGE;
  if (storedLang && isSupportedLanguage(storedLang)) {
    languageCode = storedLang;
  } else if (isSupportedLanguage(browserLang)) {
    languageCode = browserLang as LanguageCode;
  } else if (COUNTRY_LANGUAGE_MAP[countryCode] && isSupportedLanguage(COUNTRY_LANGUAGE_MAP[countryCode])) {
    languageCode = COUNTRY_LANGUAGE_MAP[countryCode];
  }

  return {
    countryCode,
    languageCode,
    locale: `${languageCode}-${countryCode}`,
    currencyCode: "INR", // Canonical prices are INR; Razorpay handles multi-currency at checkout
    timezone: tz,
  };
}

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/**
 * Initializes automatic locale detection without prompting for GPS or rendering header dropdowns.
 */
export function initAutomaticLocale(): UserLocaleContext {
  if (typeof window === "undefined") {
    return detectUserLocale();
  }

  const localeCtx = detectUserLocale();
  
  // Set HTML lang attribute
  document.documentElement.lang = localeCtx.languageCode;

  // Sync i18next without disrupting explicit manual overrides
  const activeLang = i18n.language?.split("-")[0];
  if (activeLang !== localeCtx.languageCode && isSupportedLanguage(localeCtx.languageCode)) {
    i18n.changeLanguage(localeCtx.languageCode);
  }

  return localeCtx;
}
