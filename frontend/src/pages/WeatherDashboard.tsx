import { useEffect, useRef } from "react";
import stormBg from "../assets/storm-background.jpg";

const HOURS = [
  { t: "Now", i: "i-storm", d: "27°" },
  { t: "13:00", i: "i-rain", d: "26°" },
  { t: "14:00", i: "i-rain", d: "26°" },
  { t: "15:00", i: "i-cloudsun", d: "28°" },
  { t: "16:00", i: "i-cloudsun", d: "29°" },
  { t: "17:00", i: "i-sun", d: "28°" },
];

const DAYS = [
  { d: "Today", i: "i-storm", c: "Thunderstorm", hi: 29, lo: 24 },
  { d: "Monday", i: "i-rain", c: "Heavy rain", hi: 28, lo: 24 },
  { d: "Tuesday", i: "i-rain", c: "Showers", hi: 30, lo: 25 },
  { d: "Wednesday", i: "i-cloudsun", c: "Partly cloudy", hi: 32, lo: 26 },
  { d: "Thursday", i: "i-sun", c: "Sunny", hi: 34, lo: 27 },
  { d: "Friday", i: "i-cloudsun", c: "Partly cloudy", hi: 33, lo: 26 },
  { d: "Saturday", i: "i-storm", c: "Thunderstorm", hi: 30, lo: 25 },
];

const CONDS = [
  { i: "i-thermo", k: "Real feel", v: "31°" },
  { i: "i-wind", k: "Wind", v: "18 km/h" },
  { i: "i-drop", k: "Chance of rain", v: "84%" },
  { i: "i-uv", k: "UV index", v: "3 (Low)" },
];

function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

export default function WeatherDashboard() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = stageRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="wx-root">
      <style>{CSS}</style>
      <Sprite />

      <div className="stage" ref={stageRef} style={{ backgroundImage: `url(${stormBg})` }}>
        {/* ── SIDEBAR ── */}
        <aside className="sidebar" data-reveal>
          <div className="brand">
            <Icon id="i-bolt" className="ic brand-ic" />
          </div>
          <nav className="nav">
            {[
              ["i-home", "Overview", true],
              ["i-calendar", "Forecast"],
              ["i-map", "Radar map"],
              ["i-chart", "Analytics"],
              ["i-city", "Cities"],
            ].map(([id, label, active]) => (
              <button
                key={id as string}
                className={`navbtn${active ? " is-active" : ""}`}
                aria-label={label as string}
                title={label as string}
              >
                <Icon id={id as string} className="ic" />
              </button>
            ))}
          </nav>
          <button className="navbtn navbtn-foot" aria-label="Settings" title="Settings">
            <Icon id="i-gear" className="ic" />
          </button>
        </aside>

        {/* ── TOP BAR ── */}
        <header className="topbar" data-reveal>
          <div className="chip glass-chip">
            <Icon id="i-search" className="ic ic-sm" />
            <span>Search city…</span>
          </div>
          <div className="tools">
            <button className="tool" aria-label="Notifications">
              <Icon id="i-bell" className="ic ic-sm" />
            </button>
            <button className="tool" aria-label="Units">
              <Icon id="i-units" className="ic ic-sm" />
            </button>
            <div className="who">
              <span className="avatar">
                <img
                  src="https://diff.vn/wp-content/uploads/2025/06/Copy-of-MU-team.jpg?w=160&h=160&fit=crop&crop=faces&q=80&auto=format"
                  alt="Calfin Danang"
                  loading="eager"
                  decoding="async"
                  width={50}
                  height={50}
                  onError={(e) => e.currentTarget.remove()}
                />
                <Icon id="i-avatar" className="ic avatar-fb" />
              </span>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero" data-reveal>
          <p className="eyebrow">
            <Icon id="i-pin" className="ic ic-xs" />
            Viet Nam · Live now
          </p>
          <h1>Ha Noi Capital</h1>
          <p className="sub">Sunday, 16 August · 12:22 ICT</p>

          <div className="temp">
            <span className="deg">27</span>
            <span className="unit">°C</span>
            <span className="cond">
              <Icon id="i-storm" className="ic ic-lg" />
              Thunderstorm
            </span>
          </div>

          <p className="range">
            H 29° &nbsp;·&nbsp; L 24° &nbsp;·&nbsp; Feels like 31°
          </p>

          <div className="pills">
            {["Air quality 62 · Moderate", "Humidity 86%", "Visibility 6 km"].map((p) => (
              <span className="pill" key={p}>
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* ── RIGHT RAIL ── */}
        <div className="rail">
          <article className="card" data-reveal>
            <header className="card-h">
              <h2>Today&apos;s forecast</h2>
              <span className="card-note">Hourly</span>
            </header>
            <div className="hours">
              {HOURS.map((h) => (
                <div className={`hour${h.t === "Now" ? " is-now" : ""}`} key={h.t}>
                  <span className="hour-t">{h.t}</span>
                  <Icon id={h.i} className="ic ic-md" />
                  <span className="hour-d">{h.d}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card" data-reveal>
            <header className="card-h">
              <h2>Air conditions</h2>
              <span className="card-note">See all</span>
            </header>
            <div className="conds">
              {CONDS.map((c) => (
                <div className="cond-i" key={c.k}>
                  <Icon id={c.i} className="ic ic-sm" />
                  <div>
                    <span className="cond-k">{c.k}</span>
                    <span className="cond-v">{c.v}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card card-big" data-reveal>
            <header className="card-h">
              <h2>7-day forecast</h2>
              <span className="card-note">Ha Noi</span>
            </header>
            <ul className="days">
              {DAYS.map((d) => (
                <li className="day" key={d.d}>
                  <span className="day-n">{d.d}</span>
                  <Icon id={d.i} className="ic ic-sm day-ic" />
                  <span className="day-c">{d.c}</span>
                  <span className="day-t">
                    <b>{d.hi}°</b>
                    <i>{d.lo}°</i>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}

function Sprite() {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="i-bolt" viewBox="0 0 24 24">
        <path {...s} d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </symbol>
      <symbol id="i-home" viewBox="0 0 24 24">
        <path {...s} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
      </symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24">
        <rect {...s} x="3" y="5" width="18" height="16" rx="3" />
        <path {...s} d="M3 10h18M8 3v4M16 3v4" />
      </symbol>
      <symbol id="i-map" viewBox="0 0 24 24">
        <path {...s} d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Zm0 0v14m6-12v14" />
      </symbol>
      <symbol id="i-chart" viewBox="0 0 24 24">
        <path {...s} d="M4 20V10m5 10V4m5 16v-7m5 7V8" />
      </symbol>
      <symbol id="i-city" viewBox="0 0 24 24">
        <path {...s} d="M3 21h18M5 21V8l6-4v17M11 21V11h8v10M8 11h0M8 14h0M15 15h0" />
      </symbol>
      <symbol id="i-gear" viewBox="0 0 24 24">
        <circle {...s} cx="12" cy="12" r="3.2" />
        <path {...s} d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle {...s} cx="11" cy="11" r="6.5" />
        <path {...s} d="m16 16 4.5 4.5" />
      </symbol>
      <symbol id="i-bell" viewBox="0 0 24 24">
        <path {...s} d="M6.5 9a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 13 6.5 9Z" />
        <path {...s} d="M10 18a2 2 0 0 0 4 0" />
      </symbol>
      <symbol id="i-units" viewBox="0 0 24 24">
        <path {...s} d="M10 5.5a2.5 2.5 0 1 1 5 0v9a3.5 3.5 0 1 1-5 0v-9Z" />
        <path {...s} d="M5 8h3M5 12h3" />
      </symbol>
      <symbol id="i-pin" viewBox="0 0 24 24">
        <path {...s} d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
        <circle {...s} cx="12" cy="10" r="2.4" />
      </symbol>
      <symbol id="i-avatar" viewBox="0 0 24 24">
        <circle {...s} cx="12" cy="9" r="3.6" />
        <path {...s} d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
      </symbol>
      <symbol id="i-sun" viewBox="0 0 24 24">
        <circle {...s} cx="12" cy="12" r="4.2" />
        <path {...s} d="M12 2.6v2.6M12 18.8v2.6M3.6 12h2.6M17.8 12h2.6M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M5.6 18.4l1.9-1.9M16.5 7.5l1.9-1.9" />
      </symbol>
      <symbol id="i-cloudsun" viewBox="0 0 24 24">
        <path {...s} d="M6.5 8.2a3.6 3.6 0 0 1 5.6-2.6M4 5.4V3.6M2 8h1.8M6.9 4l1.2-1.2" />
        <path {...s} d="M8.4 19.5A4 4 0 0 1 8.7 11.6a5 5 0 0 1 9.5 1.2 3.4 3.4 0 0 1-.6 6.7H8.4Z" />
      </symbol>
      <symbol id="i-rain" viewBox="0 0 24 24">
        <path {...s} d="M7.6 16.4A3.9 3.9 0 0 1 8 8.6a5 5 0 0 1 9.5 1.2 3.4 3.4 0 0 1-.6 6.6H7.6Z" />
        <path {...s} d="M9 19l-1 2.4M13 19l-1 2.4M17 19l-1 2.4" />
      </symbol>
      <symbol id="i-storm" viewBox="0 0 24 24">
        <path {...s} d="M7.6 15.6A3.9 3.9 0 0 1 8 7.8a5 5 0 0 1 9.5 1.2 3.4 3.4 0 0 1-.6 6.6H7.6Z" />
        <path {...s} d="M13 17l-3 4h3l-1 3" />
      </symbol>
      <symbol id="i-wind" viewBox="0 0 24 24">
        <path {...s} d="M3 8.5h10a2.8 2.8 0 1 0-2.8-2.8M3 13h14a3 3 0 1 1-3 3M3 17.5h7" />
      </symbol>
      <symbol id="i-drop" viewBox="0 0 24 24">
        <path {...s} d="M12 3.2s5.6 6 5.6 9.6a5.6 5.6 0 1 1-11.2 0C6.4 9.2 12 3.2 12 3.2Z" />
      </symbol>
      <symbol id="i-thermo" viewBox="0 0 24 24">
        <path {...s} d="M10 14.4V5.5a2 2 0 1 1 4 0v8.9a4 4 0 1 1-4 0Z" />
      </symbol>
      <symbol id="i-uv" viewBox="0 0 24 24">
        <path {...s} d="M4 17h16M6.5 13.5a5.5 5.5 0 0 1 11 0" />
        <path {...s} d="M12 4.2v2M4.8 7l1.5 1.5M19.2 7l-1.5 1.5" />
      </symbol>
    </svg>
  );
}

const CSS = `
.wx-root{
  --u: min(100vw / 1357, 100dvh / 871);
  --ink:#ffffff;
  --glass: rgba(255,255,255,.155);
  --glass-line: rgba(255,255,255,.20);
  --e-out: cubic-bezier(.16,1,.3,1);
  --e-soft: cubic-bezier(.22,.61,.36,1);
  --e-pen: cubic-bezier(.37,.01,.2,1);
  color: var(--ink);
  background:#04121b;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-feature-settings:"kern" 1;
  -webkit-font-smoothing:antialiased;
}
@supports not (height: 100dvh){ .wx-root{ --u: min(100vw / 1357, 100vh / 871); } }

.wx-root .stage{
  position:fixed; inset:0; overflow:hidden;
  background-size:cover; background-position:center 25%; background-repeat:no-repeat;
}
.wx-root .stage::after{
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(105deg, rgba(4,16,24,.34) 0%, rgba(4,16,24,.20) 40%, rgba(4,16,24,.06) 78%, transparent 100%),
    linear-gradient(180deg, rgba(4,16,24,.12) 0%, transparent 22%),
    linear-gradient(0deg, rgba(4,16,24,.07), rgba(4,16,24,.07));
}
.wx-root .ic{ width:calc(22*var(--u)); height:calc(22*var(--u)); display:block; }
.wx-root .ic-xs{ width:calc(14*var(--u)); height:calc(14*var(--u)); }
.wx-root .ic-sm{ width:calc(18*var(--u)); height:calc(18*var(--u)); }
.wx-root .ic-md{ width:calc(26*var(--u)); height:calc(26*var(--u)); }
.wx-root .ic-lg{ width:calc(34*var(--u)); height:calc(34*var(--u)); }

[data-reveal]{ opacity:0; transform: translate3d(0, calc(18*var(--u)), 0); transition: opacity .9s var(--e-out), transform .9s var(--e-out); }
[data-reveal].is-in{ opacity:1; transform:none; }

/* ── SIDEBAR ── */
.wx-root .sidebar{
  position:absolute; left:calc(24*var(--u)); top:calc(24*var(--u));
  width:calc(88*var(--u)); height:calc(823*var(--u));
  z-index:3; border-radius:calc(26*var(--u));
  border:1px solid var(--glass-line);
  background:linear-gradient(180deg, rgba(255,255,255,.125) 0%, rgba(255,255,255,.135) 13%, rgba(255,255,255,.098) 34%, rgba(255,255,255,.092) 100%);
  backdrop-filter: blur(calc(18*var(--u))) saturate(115%);
  display:flex; flex-direction:column; align-items:center;
  padding:calc(22*var(--u)) 0;
}
.wx-root .brand{
  width:calc(44*var(--u)); height:calc(44*var(--u)); border-radius:calc(15*var(--u));
  display:grid; place-items:center; background:rgba(255,255,255,.22);
  border:1px solid var(--glass-line);
}
.wx-root .brand-ic{ width:calc(20*var(--u)); height:calc(20*var(--u)); }
.wx-root .nav{ margin-top:calc(34*var(--u)); display:flex; flex-direction:column; gap:calc(14*var(--u)); }
.wx-root .navbtn{
  width:calc(48*var(--u)); height:calc(48*var(--u)); border-radius:calc(16*var(--u));
  display:grid; place-items:center; color:rgba(255,255,255,.72);
  background:transparent; border:1px solid transparent;
  transition: background .35s var(--e-soft), color .35s var(--e-soft), transform .35s var(--e-out);
}
.wx-root .navbtn:hover{ background:rgba(255,255,255,.14); color:#fff; transform:translateY(calc(-1*var(--u))); }
.wx-root .navbtn.is-active{ background:rgba(255,255,255,.24); border-color:var(--glass-line); color:#fff; }
.wx-root .navbtn-foot{ margin-top:auto; }

/* ── TOP BAR ── */
.wx-root .topbar{
  position:absolute; left:calc(140*var(--u)); right:calc(28*var(--u)); top:calc(30*var(--u));
  z-index:3; display:flex; align-items:center; justify-content:space-between;
}
.wx-root .chip{
  height:calc(36*var(--u)); border-radius:calc(18*var(--u)); padding:0 calc(15*var(--u));
  display:inline-flex; align-items:center; gap:calc(9*var(--u));
  font-size:calc(13*var(--u)); color:rgba(255,255,255,.86);
  background:rgba(255,255,255,.175); border:1px solid var(--glass-line);
  backdrop-filter: blur(calc(16*var(--u))) saturate(115%);
  position:relative; overflow:hidden;
}
.wx-root .tools{ display:flex; align-items:center; gap:calc(12*var(--u)); }
.wx-root .tool{
  width:calc(52*var(--u)); height:calc(52*var(--u)); border-radius:50%;
  display:grid; place-items:center; color:#fff;
  background:rgba(255,255,255,.15); border:1px solid var(--glass-line);
  backdrop-filter: blur(calc(16*var(--u))) saturate(115%);
  transition: background .35s var(--e-soft), transform .35s var(--e-out);
}
.wx-root .tool:hover{ background:rgba(255,255,255,.26); transform:translateY(calc(-1.5*var(--u))); }
.wx-root .avatar{
  position:relative; display:grid; place-items:center;
  width:calc(55*var(--u)); height:calc(55*var(--u)); border-radius:50%; overflow:hidden;
  border:1px solid rgba(255,255,255,.4); background:rgba(255,255,255,.18);
}
.wx-root .avatar img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.wx-root .avatar-fb{ width:calc(26*var(--u)); height:calc(26*var(--u)); }

/* ── HERO ── */
.wx-root .hero{ position:absolute; left:calc(150*var(--u)); top:calc(150*var(--u)); width:calc(600*var(--u)); z-index:2; }
.wx-root .eyebrow{
  display:inline-flex; align-items:center; gap:calc(7*var(--u));
  font-size:calc(13*var(--u)); font-weight:500; letter-spacing:calc(.6*var(--u));
  text-transform:uppercase; color:rgba(255,255,255,.78);
}
.wx-root h1{
  font-family:'Inter Tight','Inter',sans-serif; font-weight:500;
  font-size:calc(63*var(--u)); line-height:calc(78*var(--u)); letter-spacing:calc(.25*var(--u));
  margin-top:calc(10*var(--u));
}
.wx-root .sub{ margin-top:calc(4*var(--u)); font-size:calc(15*var(--u)); color:rgba(255,255,255,.78); }
.wx-root .temp{ margin-top:calc(26*var(--u)); display:flex; align-items:flex-start; gap:calc(6*var(--u)); }
.wx-root .deg{
  font-family:'Inter Tight','Inter',sans-serif; font-weight:500;
  font-size:calc(150*var(--u)); line-height:calc(150*var(--u)); letter-spacing:calc(-3*var(--u));
}
.wx-root .unit{ font-size:calc(38*var(--u)); font-weight:500; margin-top:calc(16*var(--u)); color:rgba(255,255,255,.85); }
.wx-root .cond{
  margin-left:calc(24*var(--u)); margin-top:calc(52*var(--u));
  display:inline-flex; align-items:center; gap:calc(10*var(--u));
  font-size:calc(20*var(--u)); font-weight:500; color:rgba(255,255,255,.92);
}
.wx-root .range{ margin-top:calc(6*var(--u)); font-size:calc(15*var(--u)); color:rgba(255,255,255,.8); }
.wx-root .pills{ margin-top:calc(22*var(--u)); display:flex; gap:calc(10*var(--u)); flex-wrap:wrap; }
.wx-root .pill{
  height:calc(34*var(--u)); border-radius:calc(17*var(--u)); padding:0 calc(15*var(--u));
  display:inline-flex; align-items:center; font-size:calc(12.5*var(--u)); font-weight:500;
  background:rgba(255,255,255,.15); border:1px solid var(--glass-line);
  backdrop-filter: blur(calc(16*var(--u))) saturate(115%);
}

/* ── RIGHT RAIL ── */
.wx-root .rail{
  position:absolute; right:calc(28*var(--u)); top:calc(104*var(--u));
  width:calc(400*var(--u)); z-index:2;
  display:flex; flex-direction:column; gap:calc(16*var(--u));
}
.wx-root .card{
  position:relative; overflow:hidden;
  border-radius:calc(24*var(--u)); padding:calc(18*var(--u)) calc(20*var(--u));
  border:1px solid var(--glass-line);
  background:linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.258) 24%, rgba(255,255,255,.252) 78%, rgba(255,255,255,.232) 100%);
  backdrop-filter: blur(calc(26*var(--u))) saturate(118%);
}
.wx-root .card-big{ border-radius:calc(26*var(--u)); }
.wx-root .card::after, .wx-root .chip::after{
  content:""; position:absolute; top:0; bottom:0; left:0; width:38%;
  background:linear-gradient(100deg, transparent 0%, rgba(255,255,255,.17) 50%, transparent 100%);
  transform:translate3d(-150%,0,0) skewX(-18deg);
  animation: wx-sheen 1.15s var(--e-soft) 2.55s 1 both;
  pointer-events:none;
}
@keyframes wx-sheen{
  from{ transform:translate3d(-150%,0,0) skewX(-18deg); }
  to{ transform:translate3d(260%,0,0) skewX(-18deg); }
}
.wx-root .card-h{ display:flex; align-items:baseline; justify-content:space-between; }
.wx-root .card-h h2{ font-size:calc(14*var(--u)); font-weight:600; letter-spacing:calc(.3*var(--u)); }
.wx-root .card-note{ font-size:calc(11.5*var(--u)); color:rgba(255,255,255,.72); }

.wx-root .hours{ margin-top:calc(14*var(--u)); display:grid; grid-template-columns:repeat(6,1fr); gap:calc(6*var(--u)); }
.wx-root .hour{
  display:flex; flex-direction:column; align-items:center; gap:calc(8*var(--u));
  padding:calc(10*var(--u)) 0; border-radius:calc(16*var(--u));
  transition: background .35s var(--e-soft);
}
.wx-root .hour:hover{ background:rgba(255,255,255,.14); }
.wx-root .hour.is-now{ background:rgba(255,255,255,.22); border:1px solid var(--glass-line); }
.wx-root .hour-t{ font-size:calc(11*var(--u)); color:rgba(255,255,255,.8); }
.wx-root .hour-d{ font-size:calc(14*var(--u)); font-weight:600; }

.wx-root .conds{ margin-top:calc(14*var(--u)); display:grid; grid-template-columns:1fr 1fr; gap:calc(14*var(--u)) calc(10*var(--u)); }
.wx-root .cond-i{ display:flex; align-items:flex-start; gap:calc(10*var(--u)); }
.wx-root .cond-i div{ display:flex; flex-direction:column; }
.wx-root .cond-k{ font-size:calc(11.5*var(--u)); color:rgba(255,255,255,.76); }
.wx-root .cond-v{ font-size:calc(17*var(--u)); font-weight:600; margin-top:calc(2*var(--u)); }

.wx-root .days{ margin-top:calc(8*var(--u)); }
.wx-root .day{
  display:grid; grid-template-columns:calc(88*var(--u)) calc(26*var(--u)) 1fr auto;
  align-items:center; gap:calc(8*var(--u));
  padding:calc(9*var(--u)) 0; border-bottom:1px solid rgba(255,255,255,.14);
}
.wx-root .day:last-child{ border-bottom:0; }
.wx-root .day-n{ font-size:calc(13*var(--u)); font-weight:500; }
.wx-root .day-c{ font-size:calc(12.5*var(--u)); color:rgba(255,255,255,.78); }
.wx-root .day-t{ font-size:calc(13*var(--u)); }
.wx-root .day-t b{ font-weight:600; }
.wx-root .day-t i{ font-style:normal; color:rgba(255,255,255,.66); margin-left:calc(8*var(--u)); }
`;