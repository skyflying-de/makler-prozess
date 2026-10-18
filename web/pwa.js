/* Browser-App: Offline-Zwischenspeicher (Service Worker) und Hinweis auf neue Versionen */
"use strict";
(function () {
  if (!("serviceWorker" in navigator) || (window.PLATFORM && PLATFORM.native) || location.protocol === "file:") return;
  const bar = reg => {
    if (document.querySelector(".updbar")) return;
    const d = document.createElement("div"); d.className = "updbar";
    d.innerHTML = `<span>Neue Version von Makler-Prozess verfügbar.</span><button class="btn pri sm">Jetzt aktualisieren</button><button class="btn sm">Später</button>`;
    d.querySelectorAll("button")[0].onclick = async () => { try { if (typeof flush === "function") await flush(); } catch (e) {} if (reg.waiting) reg.waiting.postMessage("skipWaiting"); };
    d.querySelectorAll("button")[1].onclick = () => d.remove();
    document.body.appendChild(d);
  };
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) return; reloading = true; location.reload(); });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) bar(reg);
      reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) bar(reg); }); });
      setInterval(() => reg.update().catch(() => {}), 30 * 60000);
    }).catch(e => console.warn("Service Worker", e));
  });
})();
