// Tweaks panel — accent, radius, density, badge
const { useState: useTState, useEffect: useTEffect } = React;

function TweaksMount() {
  const [visible, setVisible] = useTState(false);
  const [tweaks, setTweaks] = useTState(window.__TWEAKS__);

  // Apply tweaks to <html>
  useTEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-accent", tweaks.accent);
    html.setAttribute("data-radius", tweaks.radius);
    html.setAttribute("data-density", tweaks.density);
  }, [tweaks]);

  useTEffect(() => {
    function onMsg(e) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setVisible(true);
      if (e.data.type === "__deactivate_edit_mode") setVisible(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function update(patch) {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  }

  if (!visible) return null;

  const accents = [
    { id: "mono", color: "oklch(0.87 0 0)" },
    { id: "blue", color: "oklch(0.72 0.17 250)" },
    { id: "violet", color: "oklch(0.72 0.19 295)" },
    { id: "green", color: "oklch(0.78 0.17 155)" },
    { id: "orange", color: "oklch(0.78 0.16 55)" },
  ];

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span><i className="ph ph-sliders-horizontal" style={{ marginRight: 6 }} />Tweaks</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setVisible(false)}>
          <i className="ph ph-x" />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-group">
          <label>Accent</label>
          <div className="swatch-row">
            {accents.map(a => (
              <div
                key={a.id}
                className={`swatch ${tweaks.accent === a.id ? "active" : ""}`}
                style={{ background: a.color }}
                onClick={() => update({ accent: a.id })}
                title={a.id}
              />
            ))}
          </div>
        </div>
        <div className="tweak-group">
          <label>Corner radius</label>
          <div className="seg">
            {["square", "default", "round"].map(r => (
              <button
                key={r}
                className={tweaks.radius === r ? "active" : ""}
                onClick={() => update({ radius: r })}
              >{r}</button>
            ))}
          </div>
        </div>
        <div className="tweak-group">
          <label>Density</label>
          <div className="seg">
            {["compact", "comfortable"].map(d => (
              <button
                key={d}
                className={tweaks.density === d ? "active" : ""}
                onClick={() => update({ density: d })}
              >{d}</button>
            ))}
          </div>
        </div>
        <div className="tweak-group">
          <label>Show hero badge</label>
          <div className="seg">
            {[true, false].map(b => (
              <button
                key={String(b)}
                className={tweaks.showBadge === b ? "active" : ""}
                onClick={() => { update({ showBadge: b }); setTimeout(() => window.location.reload(), 100); }}
              >{b ? "On" : "Off"}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.TweaksMount = TweaksMount;
