const q = new URLSearchParams(location.search);
document.getElementById("detail").textContent = `${q.get("url") ?? ""} – ${q.get("reason") ?? ""}`;
document.getElementById("retry").addEventListener("click", () => void window.jdApp.retry());
