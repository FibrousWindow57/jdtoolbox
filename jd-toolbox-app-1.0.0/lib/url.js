// Prüft und vereinheitlicht die Adresse der JD Toolbox (Cloudflare-Worker). Reine Funktionen, ohne Electron testbar.

/**
 * Macht aus einer Eingabe wie "jd-toolbox.name.workers.dev" oder "https://toolbox.example.de/darlehen" die Herkunft
 * "https://jd-toolbox.name.workers.dev". Erlaubt ist nur https; http nur für localhost (Entwicklung).
 * Rückgabe: { ok: true, origin } oder { ok: false, error } mit verständlicher Meldung.
 */
function normalizeUrl(input) {
  const raw = String(input ?? "").trim();
  if (raw === "") return { ok: false, error: "Bitte die Adresse der JD Toolbox eingeben, z. B. https://jd-toolbox.dein-name.workers.dev" };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: `„${raw}“ ist keine gültige Adresse.` };
  }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) {
    return { ok: false, error: "Die Adresse muss mit https:// beginnen (http:// ist nur für localhost erlaubt)." };
  }
  if (!u.hostname.includes(".") && !local) {
    return { ok: false, error: `„${u.hostname}“ sieht nicht wie eine Internetadresse aus (es fehlt z. B. „.workers.dev“).` };
  }
  return { ok: true, origin: u.origin };
}

/** Darf eine Navigation im App-Fenster bleiben? Nur dieselbe Herkunft; alles andere öffnet der Standardbrowser. */
function isSameOrigin(target, origin) {
  try {
    return new URL(target).origin === origin;
  } catch {
    return false;
  }
}

module.exports = { normalizeUrl, isSameOrigin };
