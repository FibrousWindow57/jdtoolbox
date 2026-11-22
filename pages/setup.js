const form = document.getElementById("f");
const input = document.getElementById("url");
const err = document.getElementById("err");
const btn = document.getElementById("go");

window.jdApp.info().then((i) => {
  if (!i) return;
  input.value = i.url;
  document.getElementById("ver").textContent = `Version ${i.version}`;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  btn.disabled = true;
  btn.textContent = "Prüfe …";
  try {
    const r = await window.jdApp.saveUrl(input.value);
    if (!r.ok) err.textContent = r.error;
  } catch {
    err.textContent = "Unerwarteter Fehler. Bitte die App neu starten.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Verbinden";
  }
});
