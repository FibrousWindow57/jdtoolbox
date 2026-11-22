const assert = require("node:assert/strict");
const { test } = require("node:test");
const { normalizeUrl, isSameOrigin } = require("../lib/url");

test("Adresse: Schema wird ergänzt, Pfad und Suchteil entfallen", () => {
  assert.deepEqual(normalizeUrl("jd-toolbox.max.workers.dev"), { ok: true, origin: "https://jd-toolbox.max.workers.dev" });
  assert.deepEqual(normalizeUrl("  https://toolbox.example.de/darlehen?x=1#a  "), { ok: true, origin: "https://toolbox.example.de" });
  assert.deepEqual(normalizeUrl("HTTPS://Toolbox.Example.DE:8443/"), { ok: true, origin: "https://toolbox.example.de:8443" });
});

test("Adresse: http nur für localhost", () => {
  assert.deepEqual(normalizeUrl("http://localhost:8787"), { ok: true, origin: "http://localhost:8787" });
  const r = normalizeUrl("http://toolbox.example.de");
  assert.equal(r.ok, false);
  assert.match(r.error, /https:\/\//);
});

test("Adresse: leere und ungültige Eingaben geben verständliche Fehler", () => {
  assert.match(normalizeUrl("").error, /Bitte die Adresse/);
  assert.match(normalizeUrl("   ").error, /Bitte die Adresse/);
  assert.match(normalizeUrl("toolbox").error, /Internetadresse/);
  assert.match(normalizeUrl("ftp://x.de").error, /https:\/\//);
  assert.equal(normalizeUrl("https://").ok, false);
  assert.equal(normalizeUrl(null).ok, false);
});

test("Navigation: nur dieselbe Herkunft bleibt in der App", () => {
  const o = "https://toolbox.example.de";
  assert.equal(isSameOrigin("https://toolbox.example.de/darlehen", o), true);
  assert.equal(isSameOrigin("https://evil.example.com/", o), false);
  assert.equal(isSameOrigin("http://toolbox.example.de/", o), false);
  assert.equal(isSameOrigin("javascript:alert(1)", o), false);
  assert.equal(isSameOrigin("kaputt", o), false);
});
