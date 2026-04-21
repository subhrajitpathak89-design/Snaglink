// Snaglink — main app
const { useState, useEffect, useMemo, useRef } = React;

// ============================================================
// Platform detection + simulated metadata
// ============================================================
const PLATFORMS = {
  youtube: {
    id: "youtube",
    label: "YouTube",
    chipClass: "yt",
    icon: "ph-youtube-logo",
    hosts: ["youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"],
    placeholder: "https://www.youtube.com/watch?v=…",
    kind: "video",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    chipClass: "ig",
    icon: "ph-instagram-logo",
    hosts: ["instagram.com", "www.instagram.com"],
    placeholder: "https://www.instagram.com/reel/…",
    kind: "video",
  },
  pinterest: {
    id: "pinterest",
    label: "Pinterest",
    chipClass: "pin",
    icon: "ph-pinterest-logo",
    hosts: ["pinterest.com", "pin.it", "www.pinterest.com"],
    placeholder: "https://pin.it/…",
    kind: "image",
  },
};

function detectPlatform(url) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    for (const p of Object.values(PLATFORMS)) {
      if (p.hosts.some(h => host === h || host.endsWith("." + h) || host === h.replace("www.", ""))) {
        return p.id;
      }
    }
  } catch {}
  return null;
}

// Deterministic pseudo-random from a string
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

const YT_TITLES = [
  { t: "Lofi beats to focus / study to", a: "Chillhop Music", d: 8742 },
  { t: "How we built the fastest image pipeline on the web", a: "Vercel", d: 1845 },
  { t: "I ran 100 miles in the Alps — full documentary", a: "Salomon TV", d: 3620 },
  { t: "React Server Components, explained from first principles", a: "Dan Abramov", d: 2748 },
  { t: "The real reason modern cities feel the same", a: "Not Just Bikes", d: 812 },
];
const IG_TITLES = [
  { t: "Sunset at Horseshoe Bend — 4K", a: "@arizona.skies", d: 58 },
  { t: "Pasta carbonara, the proper way", a: "@pasta.grammar", d: 47 },
  { t: "Street photography in Tokyo at night", a: "@tokyo.nights", d: 92 },
  { t: "Golden retriever meets snow for the first time", a: "@daily.doggo", d: 31 },
];
const PIN_TITLES = [
  { t: "Minimal workspace setup", a: "Design · Interiors" },
  { t: "Scandinavian kitchen inspiration", a: "Home · Kitchen" },
  { t: "Sage green bedroom moodboard", a: "Interiors · Bedroom" },
  { t: "Japandi living room layout", a: "Design · Living" },
];

function makeMeta(platform, url) {
  const rng = seed(url + platform);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  if (platform === "youtube") {
    const m = pick(YT_TITLES);
    return {
      platform,
      kind: "video",
      title: m.t,
      author: m.a,
      duration: m.d,
      views: Math.floor(rng() * 50_000_000) + 50_000,
      tags: ["1080p", "60fps", "Stereo"],
      thumbColor: `oklch(${0.3 + rng()*0.2} ${0.05 + rng()*0.1} ${rng()*360})`,
    };
  }
  if (platform === "instagram") {
    const m = pick(IG_TITLES);
    return {
      platform,
      kind: "video",
      title: m.t,
      author: m.a,
      duration: m.d,
      views: Math.floor(rng() * 2_000_000) + 10_000,
      tags: ["Reel", "Vertical", "1080x1920"],
      thumbColor: `oklch(${0.35 + rng()*0.2} ${0.08 + rng()*0.12} ${rng()*360})`,
    };
  }
  if (platform === "pinterest") {
    const m = pick(PIN_TITLES);
    return {
      platform,
      kind: "image",
      title: m.t,
      author: m.a,
      duration: 0,
      views: Math.floor(rng() * 200_000) + 500,
      tags: ["Image", "Hi-res", "JPEG"],
      thumbColor: `oklch(${0.4 + rng()*0.2} ${0.06 + rng()*0.1} ${rng()*360})`,
    };
  }
}

function fmtDuration(s) {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h) return `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  return `${m}:${String(ss).padStart(2,"0")}`;
}
function fmtViews(n) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n/1_000).toFixed(1) + "K";
  return String(n);
}
function fmtMB(bytes) {
  if (bytes >= 1000) return (bytes/1000).toFixed(2) + " GB";
  return bytes.toFixed(1) + " MB";
}

// ============================================================
// Format generation
// ============================================================
function buildFormats(meta) {
  const rng = seed(meta.title + meta.author);
  const durMin = Math.max(meta.duration / 60, 0.5);

  const video = [];
  const audio = [];
  const image = [];

  if (meta.kind === "video") {
    const qualities = [
      { label: "4K 2160p", h: 2160, bitrate: 35, badge: "ULTRA" },
      { label: "1440p",    h: 1440, bitrate: 16 },
      { label: "1080p",    h: 1080, bitrate: 8, badge: "HD", recommended: true },
      { label: "720p",     h: 720,  bitrate: 5 },
      { label: "480p",     h: 480,  bitrate: 2.5 },
      { label: "360p",     h: 360,  bitrate: 1.2 },
    ];
    // YouTube gets 4K; Instagram tops at 1080
    const max = meta.platform === "instagram" ? 1080 : 2160;
    qualities.filter(q => q.h <= max).forEach(q => {
      const mb = (q.bitrate * durMin * 60 * 0.125) * (0.9 + rng()*0.2);
      video.push({
        id: `video-${q.h}`,
        label: q.label,
        container: "MP4",
        codec: q.h >= 1440 ? "H.265" : "H.264",
        fps: q.h >= 1080 ? 60 : 30,
        size: mb,
        badge: q.badge,
        recommended: q.recommended,
      });
    });

    const bitrates = [
      { label: "320 kbps", k: 320, badge: "BEST" },
      { label: "256 kbps", k: 256 },
      { label: "192 kbps", k: 192, recommended: true },
      { label: "128 kbps", k: 128 },
      { label: "96 kbps",  k: 96 },
    ];
    bitrates.forEach(b => {
      const mb = (b.k / 8) * durMin * 60 / 1024;
      audio.push({
        id: `audio-${b.k}`,
        label: b.label,
        container: "MP3",
        codec: "MPEG-1",
        size: mb,
        badge: b.badge,
        recommended: b.recommended,
        stereo: true,
      });
    });
    audio.push({
      id: "audio-m4a",
      label: "Original AAC",
      container: "M4A",
      codec: "AAC-LC",
      size: (128/8) * durMin * 60 / 1024,
      stereo: true,
    });
    // GIF option for short clips
    if (meta.duration <= 120) {
      image.push({
        id: "gif",
        label: "GIF (looped)",
        container: "GIF",
        codec: "15fps",
        size: Math.min(durMin * 8, 35),
      });
    }
  } else if (meta.kind === "image") {
    image.push(
      { id: "img-orig", label: "Original", container: "JPG", codec: "2048×2048", size: 2.4, recommended: true, badge: "BEST" },
      { id: "img-1080", label: "1080p", container: "JPG", codec: "1080×1080", size: 0.9 },
      { id: "img-720",  label: "720p", container: "JPG", codec: "720×720", size: 0.4 },
      { id: "img-webp", label: "WebP", container: "WEBP", codec: "2048×2048", size: 1.1 },
    );
  }

  return { video, audio, image };
}

// ============================================================
// UI primitives
// ============================================================
function PlatformIcon({ id, size = 28 }) {
  const cls = { youtube: "yt", instagram: "ig", pinterest: "pin" }[id] || "yt";
  const ic = { youtube: "ph-youtube-logo", instagram: "ph-instagram-logo", pinterest: "ph-pinterest-logo" }[id];
  return (
    <div className={`platform-icon ${cls}`} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      <i className={`ph-fill ${ic}`} />
    </div>
  );
}

function Thumb({ meta }) {
  const gradient = `linear-gradient(135deg, ${meta.thumbColor}, oklch(0.2 0 0))`;
  return (
    <div className="thumb" data-kind={meta.kind} style={{ background: gradient }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage:
          "radial-gradient(circle at 20% 30%, oklch(1 0 0 / 0.12), transparent 40%)," +
          "radial-gradient(circle at 80% 70%, oklch(1 0 0 / 0.08), transparent 40%)",
      }} />
      <div className="thumb-play"><i className="ph-fill ph-play-circle" /></div>
      <div className="thumb-duration">{fmtDuration(meta.duration)}</div>
    </div>
  );
}

function Chip({ platform, active, onClick, auto }) {
  const cls = auto ? "auto" : platform.chipClass;
  return (
    <button className={`chip ${cls} ${active ? "active" : ""}`} onClick={onClick}>
      {auto ? <i className="ph ph-magic-wand" /> : <i className={`ph-fill ${platform.icon}`} />}
      {auto ? "Auto" : platform.label}
    </button>
  );
}

// ============================================================
// Downloader
// ============================================================
function Downloader() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("auto"); // "auto" | id
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [meta, setMeta] = useState(null);
  const [activeTab, setActiveTab] = useState("video");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const autoDetected = useMemo(() => detectPlatform(url), [url]);
  const resolved = platform === "auto" ? autoDetected : platform;

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        // let browser handle; just focus
        if (document.activeElement !== inputRef.current) inputRef.current?.focus();
      }
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function fetchMedia() {
    if (!url.trim()) return;
    if (!resolved) {
      setError("Unsupported URL. Paste a YouTube, Instagram, or Pinterest link.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("loading");
    setMeta(null);
    setTimeout(() => {
      const m = makeMeta(resolved, url);
      setMeta(m);
      setActiveTab(m.kind === "image" ? "image" : "video");
      setStatus("ready");
    }, 900 + Math.random() * 500);
  }

  function handleSubmit(e) {
    e?.preventDefault();
    fetchMedia();
  }

  function loadSample(p) {
    const samples = {
      youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      instagram: "https://www.instagram.com/reel/C7kNq9fMa0P/",
      pinterest: "https://www.pinterest.com/pin/182465349827364512/",
    };
    setUrl(samples[p]);
    setPlatform("auto");
    setStatus("idle");
    setError("");
    setTimeout(() => fetchMediaWith(samples[p], p), 50);
  }

  function fetchMediaWith(u, p) {
    setStatus("loading");
    setMeta(null);
    setTimeout(() => {
      const m = makeMeta(p, u);
      setMeta(m);
      setActiveTab(m.kind === "image" ? "image" : "video");
      setStatus("ready");
    }, 900);
  }

  const formats = useMemo(() => (meta ? buildFormats(meta) : null), [meta]);
  const tabList = useMemo(() => {
    if (!formats) return [];
    const out = [];
    if (formats.video.length) out.push({ id: "video", label: "Video", icon: "ph-video", count: formats.video.length });
    if (formats.audio.length) out.push({ id: "audio", label: "Audio", icon: "ph-music-notes", count: formats.audio.length });
    if (formats.image.length) out.push({ id: "image", label: "Image / GIF", icon: "ph-image", count: formats.image.length });
    return out;
  }, [formats]);

  const currentFormats = formats ? formats[activeTab] || [] : [];
  const placeholder = resolved ? PLATFORMS[resolved].placeholder : "Paste a YouTube, Instagram, or Pinterest link…";

  return (
    <div className="downloader" role="region" aria-label="Downloader">
      <div className="platform-row">
        <Chip auto active={platform === "auto"} onClick={() => setPlatform("auto")} platform={{}} />
        {Object.values(PLATFORMS).map(p => (
          <Chip key={p.id} platform={p} active={platform === p.id} onClick={() => setPlatform(p.id)} />
        ))}
        <div style={{ flex: 1 }} />
        {platform === "auto" && autoDetected && (
          <div className="chip active" style={{ cursor: "default", fontSize: 12, color: "var(--muted-foreground)" }}>
            <i className="ph ph-check-circle" />
            Detected: {PLATFORMS[autoDetected].label}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-shell">
        <div className="input-wrap">
          <i className="input-icon ph ph-link-simple" />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus("idle"); setError(""); }}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck="false"
          />
          {url && (
            <button type="button" className="input-clear" onClick={() => { setUrl(""); setStatus("idle"); inputRef.current?.focus(); }}>
              <i className="ph ph-x" />
            </button>
          )}
        </div>
        <button type="submit" className="fetch-btn" disabled={!url.trim() || status === "loading"}>
          {status === "loading" ? (<><i className="ph ph-circle-notch" style={{ animation: "spin 0.8s linear infinite" }} /> Fetching</>)
          : (<><i className="ph-bold ph-arrow-right" /> Fetch</>)}
        </button>
      </form>

      <div className="hint-row">
        <div className="sample-links">
          <span style={{ marginRight: 4 }}>Try:</span>
          <button type="button" onClick={() => loadSample("youtube")}>YouTube demo</button>
          <button type="button" onClick={() => loadSample("instagram")}>Instagram Reel</button>
          <button type="button" onClick={() => loadSample("pinterest")}>Pinterest pin</button>
        </div>
        <div>Press <kbd>/</kbd> to focus · <kbd>⏎</kbd> to fetch</div>
      </div>

      {status === "error" && (
        <div className="error">
          <i className="ph-fill ph-warning-circle" />
          <div>{error}</div>
        </div>
      )}

      {status === "loading" && <Skeleton />}

      {status === "ready" && meta && (
        <Result
          meta={meta}
          tabList={tabList}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          formats={currentFormats}
        />
      )}
    </div>
  );
}

// ============================================================
// Result card
// ============================================================
function Skeleton() {
  return (
    <div className="skeleton">
      <div className="sk-box" style={{ aspectRatio: "16/9" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
        <div className="sk-box sk-line" style={{ width: "80%" }} />
        <div className="sk-box sk-line" style={{ width: "55%" }} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="sk-box sk-line" style={{ width: 60 }} />
          <div className="sk-box sk-line" style={{ width: 60 }} />
          <div className="sk-box sk-line" style={{ width: 60 }} />
        </div>
      </div>
    </div>
  );
}

function Result({ meta, tabList, activeTab, setActiveTab, formats }) {
  return (
    <div className="result">
      <div className="result-head">
        <Thumb meta={meta} />
        <div>
          <PlatformBadge platform={meta.platform} />
          <h2 className="meta-title">{meta.title}</h2>
          <div className="meta-sub">
            <span><i className="ph ph-user-circle" style={{ marginRight: 4 }} />{meta.author}</span>
            {meta.duration > 0 && <span><i className="ph ph-clock" style={{ marginRight: 4 }} />{fmtDuration(meta.duration)}</span>}
            <span><i className="ph ph-eye" style={{ marginRight: 4 }} />{fmtViews(meta.views)} views</span>
          </div>
          <div className="meta-tags">
            {meta.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabList.map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <i className={`ph ${t.icon}`} />
            {t.label}
            <span className="tab-badge">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="formats">
        {formats.map(f => <FormatRow key={f.id} fmt={f} tab={activeTab} />)}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }) {
  const p = PLATFORMS[platform];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10,
      fontSize: 11, padding: "3px 8px 3px 3px", borderRadius: 999,
      background: "var(--secondary)", border: "1px solid var(--border)",
      color: "var(--muted-foreground)", fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em" }}>
      <PlatformIcon id={platform} size={18} />
      {p.label.toUpperCase()}
    </div>
  );
}

function FormatRow({ fmt, tab }) {
  const [state, setState] = useState("idle"); // idle | progress | done
  const [pct, setPct] = useState(0);
  const rafRef = useRef();

  const iconMap = {
    video: "ph-film-slate",
    audio: "ph-music-notes",
    image: fmt.container === "GIF" ? "ph-gif" : "ph-image",
  };

  function start() {
    if (state === "progress") return;
    if (state === "done") { setState("idle"); setPct(0); return; }
    setState("progress");
    setPct(0);
    const total = 900 + Math.random() * 1400;
    const t0 = performance.now();
    function step() {
      const e = performance.now() - t0;
      const p = Math.min(1, e / total);
      setPct(p * 100);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setTimeout(() => setState("done"), 120);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className={`format-row ${fmt.recommended ? "recommended" : ""}`}>
      <div className="fmt-icon"><i className={`ph ${iconMap[tab] || "ph-file"}`} /></div>
      <div className="fmt-main">
        <div className="fmt-label">
          {fmt.label}
          {fmt.recommended && <span className="pill">Recommended</span>}
          {fmt.badge && !fmt.recommended && <span className="pill" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{fmt.badge}</span>}
        </div>
        <div className="fmt-desc">
          {fmt.codec}{fmt.fps ? ` · ${fmt.fps}fps` : ""}{fmt.stereo ? " · Stereo" : ""}
        </div>
      </div>
      <div className="fmt-container">{fmt.container}</div>
      <div className="fmt-size">{fmtMB(fmt.size)}</div>
      <button className="dl-btn" data-state={state} onClick={start}>
        {state === "idle" && <><i className="ph-bold ph-download-simple" /> Download</>}
        {state === "progress" && <><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{Math.round(pct)}%</span></>}
        {state === "done" && <><i className="ph-bold ph-check" /> Saved</>}
        {state === "progress" && (
          <div className="dl-progress" style={{ transform: `scaleX(${pct/100})` }} />
        )}
      </button>
    </div>
  );
}

// ============================================================
// Static sections
// ============================================================
function Nav() {
  return (
    <div className="nav">
      <div className="container nav-inner">
        <a className="logo" href="#">
          <div className="logo-mark"><i className="ph-bold ph-download-simple" /></div>
          Snaglink
        </a>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#formats">Formats</a>
          <a href="#faq">FAQ</a>
          <a href="#" className="btn btn-outline btn-sm">Sign in</a>
        </nav>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="grid-bg" />
      <div className="glow" />
      <div className="container-narrow" style={{ position: "relative", textAlign: "center" }}>
        {window.__TWEAKS__?.showBadge && (
          <div className="eyebrow">
            <span className="dot"><i className="ph-bold ph-sparkle" /></span>
            <strong>Now supporting</strong>
            <span>YouTube · Instagram · Pinterest</span>
          </div>
        )}
        <h1 className="title">
          Download from the web,<br />
          <span className="dim">without the noise.</span>
        </h1>
        <p className="lead-copy">
          Paste a link from YouTube, Instagram, or Pinterest. Pick the format.
          Keep the file. No sign-up, no watermarks, no ads in your face.
        </p>
      </div>
      <div className="container-narrow" style={{ position: "relative", marginTop: 8 }}>
        <Downloader />
        <TrustRow />
      </div>
    </section>
  );
}

function TrustRow() {
  return (
    <div className="trust">
      <span><i className="ph ph-shield-check" /> No data stored</span>
      <span><i className="ph ph-lightning" /> Up to 4K, 60fps</span>
      <span><i className="ph ph-headphones" /> 320kbps audio</span>
      <span><i className="ph ph-infinity" /> Unlimited, free</span>
    </div>
  );
}

function Steps() {
  const steps = [
    { n: "01", icon: "ph-link-simple", t: "Paste any link", p: "Grab a URL from your browser, the YouTube share sheet, or Instagram's copy-link menu. We auto-detect the platform." },
    { n: "02", icon: "ph-sliders-horizontal", t: "Pick your format", p: "Choose video quality up to 4K, audio bitrate up to 320kbps, or grab a high-res image. Recommended defaults are one click away." },
    { n: "03", icon: "ph-download-simple", t: "Save the file", p: "Files download directly to your device. No server-side storage, no watermark, no account required." },
  ];
  return (
    <section className="section" id="how">
      <div className="container">
        <span className="section-eyebrow">How it works</span>
        <h2 className="section-title">Three steps from link to file.</h2>
        <p className="section-lead">
          No funnels, no ten-second timers before the download button unlocks. Paste, pick, save.
        </p>
        <div className="steps">
          {steps.map(s => (
            <div className="step" key={s.n}>
              <div className="step-num">{s.n}</div>
              <div className="step-icon"><i className={`ph ${s.icon}`} /></div>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormatMatrix() {
  const rows = [
    { p: "youtube", label: "YouTube", v: "Up to 4K 60fps", a: "320 kbps MP3", i: "Thumbnail only", g: true },
    { p: "instagram", label: "Instagram", v: "1080p reels & posts", a: "256 kbps MP3", i: "Cover image", g: true },
    { p: "pinterest", label: "Pinterest", v: "Pin videos", a: "—", i: "Full-res JPG / WebP", g: false },
  ];
  return (
    <section className="section" id="formats">
      <div className="container">
        <span className="section-eyebrow">Format support</span>
        <h2 className="section-title">What you can pull from each platform.</h2>
        <p className="section-lead">
          Available formats depend on what the source provides. We never re-encode above the original quality.
        </p>
        <div className="matrix">
          <table>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Platform</th>
                <th>Video</th>
                <th>Audio</th>
                <th>Image</th>
                <th>GIF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.p}>
                  <td><PlatformIcon id={r.p} size={26} /> {r.label}</td>
                  <td className={r.v === "—" ? "no" : "yes"}>{r.v}</td>
                  <td className={r.a === "—" ? "no" : "yes"}>{r.a}</td>
                  <td className={r.i === "—" ? "no" : "yes"}>{r.i}</td>
                  <td className={r.g ? "yes" : "no"}>{r.g ? <i className="ph-bold ph-check" /> : <i className="ph ph-minus" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Is this free to use?", a: "Yes. Unlimited downloads, no account, no paywall. We don't run display ads in the flow either." },
    { q: "Where are the files stored?", a: "They're not. Everything is processed in-flight and streamed straight to your device. We don't keep a copy and we don't log URLs." },
    { q: "What's the maximum video quality?", a: "We deliver whatever the source exposes — typically up to 4K 60fps on YouTube and 1080p on Instagram. Pinterest video pins download at their native resolution." },
    { q: "Can I download private or login-gated content?", a: "No. If the post requires an account or is private, we can't access it. This is a deliberate limit, not a bug." },
    { q: "Is this legal?", a: "Downloading your own content, public-domain material, or content covered by fair use is generally fine. Respect the creator and the platform's terms — you're responsible for how you use the file." },
    { q: "Do you support other platforms?", a: "Right now it's YouTube, Instagram, and Pinterest. TikTok, Twitter/X, and SoundCloud are on the roadmap." },
  ];
  return (
    <section className="section" id="faq">
      <div className="container-narrow">
        <span className="section-eyebrow">Frequently asked</span>
        <h2 className="section-title">Answers, up front.</h2>
        <div className="faq">
          {items.map((it, i) => (
            <details key={i} open={i === 0}>
              <summary>{it.q}<i className="ph-bold ph-plus" /></summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <a className="logo" href="#" style={{ marginBottom: 10, display: "inline-flex" }}>
              <div className="logo-mark"><i className="ph-bold ph-download-simple" /></div>
              Snaglink
            </a>
            <p style={{ maxWidth: 280, margin: "12px 0 0" }}>
              The calmest way to save media from the web.
            </p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#">Downloader</a>
              <a href="#">Browser extension</a>
              <a href="#">API</a>
              <a href="#">Changelog</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">DMCA</a>
            </div>
          </div>
        </div>
        <div className="footer-legal">
          <span>© 2026 Snaglink. All trademarks are property of their respective owners.</span>
          <span>Made with restraint.</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <div className="page">
      <Nav />
      <main>
        <Hero />
        <Steps />
        <FormatMatrix />
        <FAQ />
      </main>
      <Footer />
      <TweaksMount />
    </div>
  );
}

Object.assign(window, { App, Downloader, Hero, Steps, FormatMatrix, FAQ, Footer, Nav });
