// Mount
(function() {
  // Apply tweaks immediately from inline config
  const html = document.documentElement;
  const t = window.__TWEAKS__ || {};
  html.setAttribute("data-accent", t.accent || "mono");
  html.setAttribute("data-radius", t.radius || "default");
  html.setAttribute("data-density", t.density || "comfortable");

  // Add keyframes for spinner
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
})();
