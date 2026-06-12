import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from "recharts";

// ─── DATA ────────────────────────────────────────────────────────────────────
const sentimentEvolution = [
  { year:"1986", collectivism:82, individualism:18, fatalism:74, empowerment:26, love:88, conflict:12 },
  { year:"1990", collectivism:79, individualism:21, fatalism:71, empowerment:29, love:85, conflict:15 },
  { year:"1995", collectivism:73, individualism:27, fatalism:66, empowerment:34, love:80, conflict:20 },
  { year:"2000", collectivism:68, individualism:32, fatalism:60, empowerment:40, love:77, conflict:23 },
  { year:"2005", collectivism:61, individualism:39, fatalism:54, empowerment:46, love:71, conflict:29 },
  { year:"2010", collectivism:55, individualism:45, fatalism:47, empowerment:53, love:65, conflict:35 },
  { year:"2015", collectivism:48, individualism:52, fatalism:40, empowerment:60, love:59, conflict:41 },
  { year:"2020", collectivism:43, individualism:57, fatalism:35, empowerment:65, love:54, conflict:46 },
  { year:"2024", collectivism:38, individualism:62, fatalism:29, empowerment:71, love:49, conflict:51 },
];

const languageMix = [
  { year:"1986", "Bahasa Melayu":94, "English":4,  "Slang":2  },
  { year:"1990", "Bahasa Melayu":91, "English":7,  "Slang":2  },
  { year:"1995", "Bahasa Melayu":87, "English":10, "Slang":3  },
  { year:"2000", "Bahasa Melayu":82, "English":14, "Slang":4  },
  { year:"2005", "Bahasa Melayu":76, "English":18, "Slang":6  },
  { year:"2010", "Bahasa Melayu":70, "English":22, "Slang":8  },
  { year:"2015", "Bahasa Melayu":62, "English":27, "Slang":11 },
  { year:"2020", "Bahasa Melayu":55, "English":31, "Slang":14 },
  { year:"2024", "Bahasa Melayu":48, "English":34, "Slang":18 },
];

const themeMotifs = [
  { motif:"Rindu (Longing)",          count:847, pct:34 },
  { motif:"Hujan (Rain)",             count:623, pct:25 },
  { motif:"Jodoh (Destiny)",          count:598, pct:24 },
  { motif:"Pengorbanan (Sacrifice)",  count:521, pct:21 },
  { motif:"Janji (Promise)",          count:487, pct:19 },
  { motif:"Air Mata (Tears)",         count:445, pct:18 },
  { motif:"Takdir (Fate)",            count:412, pct:16 },
  { motif:"Cinta (Love)",             count:398, pct:16 },
  { motif:"Hati (Heart)",             count:376, pct:15 },
  { motif:"Mimpi (Dream)",            count:298, pct:12 },
];

const ajlWinners = [
  { year:1986, song:"Kasih",            artist:"Sheila Majid",    sentiment:"Melancholic", intensity:78, isOST:false, archetype:"Betrayed Lover" },
  { year:1990, song:"Lagenda",          artist:"Ramli Sarip",     sentiment:"Nostalgic",   intensity:82, isOST:false, archetype:"Self-Sacrificing Martyr" },
  { year:1995, song:"Azura",            artist:"M. Nasir",        sentiment:"Poetic",      intensity:88, isOST:true,  archetype:"Cultural Sage" },
  { year:2000, song:"Kau Ilhamku",      artist:"Siti Nurhaliza",  sentiment:"Devotional",  intensity:91, isOST:true,  archetype:"Devoted Worshipper" },
  { year:2005, song:"Kerinduan",        artist:"Mawi",            sentiment:"Melancholic", intensity:85, isOST:false, archetype:"Betrayed Lover" },
  { year:2010, song:"Turun",            artist:"Meet Uncle Hussain",sentiment:"Empowering",intensity:72, isOST:false, archetype:"Social Commentator" },
  { year:2015, song:"Demi Masa",        artist:"Hafiz",           sentiment:"Hopeful",     intensity:79, isOST:true,  archetype:"Aspirational Hero" },
  { year:2020, song:"Awan Nano",        artist:"Khai Bahar",      sentiment:"Sad",         intensity:94, isOST:true,  archetype:"Betrayed Lover" },
  { year:2024, song:"Gurauan Berkasih", artist:"Haqiem Rusli",    sentiment:"Nostalgic",   intensity:88, isOST:true,  archetype:"Devoted Worshipper" },
];

const ostCorrelation = [
  { song:"Awan Nano",        ostRating:94, dramaViews:12.4, sentiment:"Sad" },
  { song:"Kau Ilhamku",     ostRating:91, dramaViews:11.8, sentiment:"Devotional" },
  { song:"Azura",           ostRating:88, dramaViews:10.2, sentiment:"Poetic" },
  { song:"Gurauan Berkasih",ostRating:88, dramaViews:9.8,  sentiment:"Nostalgic" },
  { song:"Kerinduan",       ostRating:85, dramaViews:8.9,  sentiment:"Melancholic" },
  { song:"Demi Masa",       ostRating:79, dramaViews:8.1,  sentiment:"Hopeful" },
  { song:"Kasih",           ostRating:78, dramaViews:7.4,  sentiment:"Melancholic" },
  { song:"Turun",           ostRating:72, dramaViews:5.2,  sentiment:"Empowering" },
];

const archetypeData = [
  { archetype:"Betrayed Lover",          count:312, pct:31 },
  { archetype:"Self-Sacrificing Martyr", count:228, pct:23 },
  { archetype:"Devoted Worshipper",      count:186, pct:19 },
  { archetype:"Aspirational Hero",       count:142, pct:14 },
  { archetype:"Cultural Sage",           count:98,  pct:10 },
  { archetype:"Social Commentator",      count:34,  pct:3  },
];

const emotionalRadar = [
  { dim:"Sadness",       "1986–2000":78, "2001–2015":71, "2016–2024":63 },
  { dim:"Longing",       "1986–2000":85, "2001–2015":80, "2016–2024":68 },
  { dim:"Empowerment",   "1986–2000":28, "2001–2015":48, "2016–2024":71 },
  { dim:"Romance",       "1986–2000":88, "2001–2015":82, "2016–2024":61 },
  { dim:"Spirituality",  "1986–2000":62, "2001–2015":55, "2016–2024":43 },
  { dim:"Soc. Comment.", "1986–2000":18, "2001–2015":34, "2016–2024":58 },
];

const codeSwitch = [
  { type:"Pure Bahasa",        pct:48, songs:243 },
  { type:"Bahasa-English Mix", pct:31, songs:157 },
  { type:"Bahasa-Slang Mix",   pct:13, songs:66  },
  { type:"Triple Code-Switch", pct:8,  songs:40  },
];

const vibeViewership = [
  { month:"Jan", sentimentScore:72, viewershipM:8.2,  engagementM:4.1 },
  { month:"Feb", sentimentScore:68, viewershipM:7.8,  engagementM:3.9 },
  { month:"Mar", sentimentScore:81, viewershipM:9.4,  engagementM:5.2 },
  { month:"Apr", sentimentScore:76, viewershipM:8.8,  engagementM:4.7 },
  { month:"May", sentimentScore:85, viewershipM:10.1, engagementM:5.8 },
  { month:"Jun", sentimentScore:79, viewershipM:9.2,  engagementM:5.1 },
  { month:"Jul", sentimentScore:73, viewershipM:8.5,  engagementM:4.4 },
  { month:"Aug", sentimentScore:88, viewershipM:11.2, engagementM:6.3 },
  { month:"Sep", sentimentScore:82, viewershipM:10.4, engagementM:5.9 },
  { month:"Oct", sentimentScore:77, viewershipM:9.0,  engagementM:4.8 },
  { month:"Nov", sentimentScore:90, viewershipM:12.1, engagementM:7.1 },
  { month:"Dec", sentimentScore:84, viewershipM:10.8, engagementM:6.2 },
];

const COLORS   = ["#e8c547","#e07b39","#c94b4b","#4b9fe1","#5cb85c","#9b59b6"];
const SENT_CLR = { Melancholic:"#7f8fa6", Nostalgic:"#e07b39", Poetic:"#9b59b6",
                   Devotional:"#c94b4b",  Empowering:"#5cb85c", Hopeful:"#e8c547",
                   Sad:"#4b9fe1" };

// ─── SHARED TOOLTIP ──────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, unit="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, padding:"10px 14px", maxWidth:220 }}>
      <p style={{ color:"#e8c547", fontSize:12, margin:"0 0 6px", fontFamily:"Syne,sans-serif" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontSize:12, margin:"2px 0" }}>
          {p.name}: <b>{p.value}{unit}</b>
        </p>
      ))}
    </div>
  );
};

// ─── AXIS LABEL HELPERS ──────────────────────────────────────────────────────
const yLabel = (value, angle=-90, dx=-10) => ({
  value, angle, position:"insideLeft",
  style:{ fill:"#6b7280", fontSize:10, fontFamily:"Syne,sans-serif" }, dx
});
const xLabel = (value) => ({
  value, position:"insideBottom", offset:-4,
  style:{ fill:"#6b7280", fontSize:10, fontFamily:"Syne,sans-serif" }
});

// ─── SHARED UI ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div style={{ background:"linear-gradient(135deg,#13161e,#1a1d27)", border:`1px solid ${accent}33`,
    borderRadius:12, padding:"16px 18px", position:"relative", overflow:"hidden", minWidth:0 }}>
    <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"0 0 0 60px", background:`${accent}11` }}/>
    <p style={{ color:"#6b7280", fontSize:10, textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>{label}</p>
    <p style={{ color:accent, fontSize:22, fontWeight:700, fontFamily:"Syne,sans-serif", margin:"4px 0 3px" }}>{value}</p>
    <p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>{sub}</p>
  </div>
);

const SectionHeader = ({ title, subtitle, badge }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:4 }}>
      <h2 style={{ color:"#f1f5f9", fontFamily:"Syne,sans-serif", fontSize:15, fontWeight:700, margin:0 }}>{title}</h2>
      {badge && <span style={{ background:"#e8c54722", color:"#e8c547", fontSize:9, padding:"2px 7px",
        borderRadius:20, border:"1px solid #e8c54744", letterSpacing:1, whiteSpace:"nowrap" }}>{badge}</span>}
    </div>
    <p style={{ color:"#6b7280", fontSize:12, margin:0, lineHeight:1.5 }}>{subtitle}</p>
  </div>
);

const Panel = ({ children, style }) => (
  <div style={{ background:"linear-gradient(135deg,#13161e,#1a1d27)", border:"1px solid #2a2d3a",
    borderRadius:14, padding:18, minWidth:0, ...style }}>
    {children}
  </div>
);

const ChartLegend = ({ items }) => (
  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px", marginTop:10, paddingTop:10, borderTop:"1px solid #1e2130" }}>
    {items.map(([label,color,note]) => (
      <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }}/>
        <span style={{ color:"#d1d5db", fontSize:11 }}>{label}</span>
        {note && <span style={{ color:"#6b7280", fontSize:10, fontFamily:"DM Mono,monospace" }}>{note}</span>}
      </div>
    ))}
  </div>
);

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id:"overview",   label:"Overview",       icon:"◈" },
  { id:"sentiment",  label:"Sentiment",      icon:"◉" },
  { id:"language",   label:"Language",       icon:"◎" },
  { id:"archetypes", label:"Archetypes",     icon:"◑" },
  { id:"ost",        label:"OST × Views",    icon:"◐" },
  { id:"pipeline",   label:"Pipeline",       icon:"◍" },
  { id:"analyser",   label:"Lyric Analyser", icon:"✦" },
];

// ─── LYRIC ANALYSER ──────────────────────────────────────────────────────────
const SAMPLE = `Bila ku rindukan dirimu
Air mata jatuh tiada henti
Ku tahu jodoh di tangan Tuhan
Tapi hatiku tak sanggup pergi

Di sini ku berdiri menanti
Hujan turun membasahi bumi
Janji yang kau beri dulu
Kini tinggal kenangan sepi

Takdir memisahkan kita
Namun cinta masih bersemi
Pengorbanan yang ku rasa
Hanya kau yang mengerti`;

function LyricAnalyser() {
  const [lyrics, setLyrics]       = useState("");
  const [title, setTitle]         = useState("");
  const [artist, setArtist]       = useState("");
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem("irama_api_key") || "");
  const [showKey, setShowKey]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");

  const clear = () => { setLyrics(""); setTitle(""); setArtist(""); setResult(null); setError(""); };
  const loadSample = () => { setLyrics(SAMPLE); setTitle("Kenangan Sepi"); setArtist("Demo Artist"); setResult(null); setError(""); };

  const saveKey = (k) => {
    setApiKey(k);
    if (k) localStorage.setItem("irama_api_key", k);
    else localStorage.removeItem("irama_api_key");
  };

  const analyse = async () => {
    if (!apiKey.trim()) { setError("Please enter your Anthropic API key above."); return; }
    if (lyrics.trim().length < 30) { setError("Paste at least 30 characters of lyrics."); return; }
    setLoading(true); setError(""); setResult(null);
    const prompt = `You are an expert NLP analyst of Malaysian/Malay popular music. Analyse the lyrics and return ONLY valid JSON — no markdown, no backticks.

Song: "${title||"Unknown"}"  Artist: "${artist||"Unknown"}"

Lyrics:
"""
${lyrics}
"""

Return exactly:
{
  "overall_sentiment": "Melancholic|Nostalgic|Hopeful|Empowering|Devotional|Sad|Poetic|Joyful|Conflicted",
  "sentiment_score": <0-100>,
  "emotional_intensity": <0-100>,
  "archetype": "Betrayed Lover|Self-Sacrificing Martyr|Devoted Worshipper|Aspirational Hero|Cultural Sage|Social Commentator|Romantic Idealist",
  "archetype_confidence": <0-100>,
  "archetype_reasoning": "<1-2 sentences>",
  "language_mix": { "bahasa_melayu":<0-100>, "english":<0-100>, "slang_colloquial":<0-100> },
  "code_switch_type": "Pure Bahasa|Bahasa-English Mix|Bahasa-Slang Mix|Triple Code-Switch",
  "motifs_detected": [{ "motif":"<word>", "translation":"<en>", "frequency":<n>, "significance":"low|medium|high" }],
  "emotional_radar": { "sadness":<0-100>, "longing":<0-100>, "empowerment":<0-100>, "romance":<0-100>, "spirituality":<0-100>, "social_commentary":<0-100> },
  "fatalism_score": <0-100>,
  "individualism_score": <0-100>,
  "ost_suitability": <0-100>,
  "estimated_era": "1986-1995|1996-2005|2006-2015|2016-2024",
  "key_phrases": ["<phrase1>","<phrase2>","<phrase3>"],
  "summary": "<2-3 sentence analytical summary>",
  "ajl_comparables": ["<song by known Malaysian artist>","<another>"]
}`;
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:prompt }] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw  = data.content?.find(b => b.type==="text")?.text || "";
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    } catch(e) { setError("Analysis failed: " + e.message); }
    finally    { setLoading(false); }
  };

  const SC = result ? SENT_CLR[result.overall_sentiment] || "#e8c547" : "#e8c547";
  const radarRows = result ? Object.entries(result.emotional_radar).map(([k,v]) => ({
    dim: k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()), val:v
  })) : [];

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
          Lyric <span style={{ color:"#e8c547" }}>Analyser</span>
        </h2>
        <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>
          Paste any Malay/Malaysian lyrics — Claude AI analyses sentiment, archetype, motifs, language mix &amp; cultural profile
        </p>
      </div>

      {/* API Key input */}
      <Panel style={{ marginBottom:16 }}>
        <SectionHeader title="Anthropic API Key" subtitle="Required for AI analysis. Stored in localStorage — never sent anywhere except Anthropic." badge="REQUIRED"/>
        <div style={{ display:"flex", gap:8 }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={e => saveKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{ flex:1, background:"#0f1117", border:`1px solid ${apiKey?"#2a4a2a":"#2a2d3a"}`,
              borderRadius:8, padding:"9px 12px", color:"#f1f5f9", fontSize:13,
              fontFamily:"DM Mono,monospace", outline:"none" }}
          />
          <button onClick={() => setShowKey(s=>!s)}
            style={{ background:"#1e2130", border:"1px solid #2a2d3a", color:"#9ca3af",
              fontSize:11, padding:"0 12px", borderRadius:8, cursor:"pointer" }}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        {apiKey && <p style={{ color:"#5cb85c", fontSize:11, margin:"6px 0 0" }}>✓ Key saved</p>}
      </Panel>

      <Panel style={{ marginBottom:16 }}>
        <div className="g-1-1" style={{ marginBottom:12 }}>
          {[["SONG TITLE (optional)", title, setTitle, "e.g. Awan Nano"],
            ["ARTIST (optional)",    artist, setArtist, "e.g. Khai Bahar"]].map(([lbl,val,set,ph]) => (
            <div key={lbl}>
              <label style={{ color:"#9ca3af", fontSize:11, letterSpacing:0.8, display:"block", marginBottom:5 }}>{lbl}</label>
              <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
                style={{ width:"100%", background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8,
                  padding:"9px 12px", color:"#f1f5f9", fontSize:13, fontFamily:"Syne,sans-serif", outline:"none" }}/>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <label style={{ color:"#9ca3af", fontSize:11, letterSpacing:0.8 }}>LYRICS TEXT</label>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ color:"#4b5563", fontSize:10, fontFamily:"DM Mono,monospace", alignSelf:"center" }}>{lyrics.length} chars</span>
              <button onClick={loadSample} style={{ background:"#1e2130", border:"1px solid #2a2d3a", color:"#9ca3af",
                fontSize:10, padding:"3px 10px", borderRadius:6, cursor:"pointer" }}>Load Sample</button>
              {lyrics && <button onClick={clear} style={{ background:"transparent", border:"1px solid #2a2d3a",
                color:"#6b7280", fontSize:10, padding:"3px 10px", borderRadius:6, cursor:"pointer" }}>Clear</button>}
            </div>
          </div>
          <textarea value={lyrics} onChange={e=>{setLyrics(e.target.value);setResult(null);setError("");}}
            placeholder={"Paste Malay song lyrics here...\n\nBila ku rindukan dirimu\nAir mata jatuh tiada henti\n..."}
            rows={10}
            style={{ width:"100%", background:"#0f1117",
              border:`1px solid ${error?"#c94b4b":lyrics.length>30?"#2a4a2a":"#2a2d3a"}`,
              borderRadius:8, padding:12, color:"#d1d5db", fontSize:13,
              fontFamily:"DM Mono,monospace", lineHeight:1.7, resize:"vertical", outline:"none" }}/>
          {error && <p style={{ color:"#c94b4b", fontSize:11, margin:"5px 0 0" }}>⚠ {error}</p>}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <button onClick={analyse} disabled={loading||lyrics.trim().length<30} style={{
            background: loading||lyrics.trim().length<30 ? "#1e2130" : "linear-gradient(135deg,#e8c547,#e07b39)",
            color: loading||lyrics.trim().length<30 ? "#4b5563" : "#0f1117",
            border:"none", borderRadius:10, padding:"11px 24px", fontSize:13, fontWeight:700,
            cursor: loading||lyrics.trim().length<30 ? "not-allowed":"pointer",
            fontFamily:"Syne,sans-serif", display:"flex", alignItems:"center", gap:8
          }}>
            {loading ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> Analysing…</>
                     : "✦ Analyse Lyrics"}
          </button>
          {!result&&!loading && <p style={{ color:"#4b5563", fontSize:11, margin:0 }}>Powered by Claude AI · ~3–5 s</p>}
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </Panel>

      {loading && (
        <Panel style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:32, marginBottom:12, animation:"spin 2s linear infinite" }}>♪</div>
          <p style={{ color:"#e8c547", fontSize:14, fontWeight:700, margin:"0 0 6px" }}>Analysing lyrics…</p>
          <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>Detecting sentiment · archetypes · motifs · language mix</p>
        </Panel>
      )}

      {result && !loading && (<>
        {/* KPI row */}
        <div className="g-4col" style={{ marginBottom:16 }}>
          {[
            ["Sentiment",       result.overall_sentiment,            `Score: ${result.sentiment_score}/100`,        SC],
            ["Archetype",       result.archetype,                    `Confidence: ${result.archetype_confidence}%`, "#e8c547"],
            ["Intensity",       result.emotional_intensity+"/100",   `Era: ${result.estimated_era}`,                "#4b9fe1"],
            ["OST Suitability", result.ost_suitability+"%",          "Drama fit score",                             "#5cb85c"],
          ].map(([lbl,val,sub,acc]) => (
            <div key={lbl} style={{ background:`${acc}12`, border:`1px solid ${acc}33`, borderRadius:12, padding:"14px 16px", minWidth:0 }}>
              <p style={{ color:"#6b7280", fontSize:10, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 3px" }}>{lbl}</p>
              <p style={{ color:acc, fontSize:15, fontWeight:800, margin:"0 0 2px", fontFamily:"Syne,sans-serif", lineHeight:1.2 }}>{val}</p>
              <p style={{ color:"#9ca3af", fontSize:10, margin:0 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <Panel style={{ marginBottom:16 }}>
          <SectionHeader title="AI Cultural Analysis" subtitle="NLP-generated analytical summary" badge="CLAUDE AI"/>
          <div style={{ background:"#0f1117", borderRadius:10, padding:"14px 16px", marginBottom:12, borderLeft:`3px solid ${SC}` }}>
            <p style={{ color:"#d1d5db", fontSize:13, margin:0, lineHeight:1.7 }}>{result.summary}</p>
          </div>
          <div style={{ background:"#e8c54710", borderRadius:10, padding:"12px 14px", borderLeft:"3px solid #e8c547" }}>
            <p style={{ color:"#e8c547", fontSize:10, fontWeight:700, letterSpacing:1, margin:"0 0 4px" }}>ARCHETYPE REASONING</p>
            <p style={{ color:"#d1d5db", fontSize:12, margin:0, lineHeight:1.6 }}>{result.archetype_reasoning}</p>
          </div>
        </Panel>

        <div className="g-1-1" style={{ marginBottom:16 }}>
          {/* Radar */}
          <Panel>
            <SectionHeader title="Emotional Radar" subtitle="6-dimension emotional profile (score 0–100)"/>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={radarRows} margin={{ top:10, right:20, bottom:10, left:20 }}>
                <PolarGrid stroke="#1e2130"/>
                <PolarAngleAxis dataKey="dim" tick={{ fill:"#9ca3af", fontSize:10 }}/>
                <PolarRadiusAxis angle={30} domain={[0,100]} tickCount={4}
                  tick={{ fill:"#4b5563", fontSize:9 }} tickFormatter={v=>`${v}`}/>
                <Radar name="Score" dataKey="val" stroke="#e8c547" fill="#e8c547" fillOpacity={0.25}/>
                <Tooltip contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}
                  formatter={(v,n)=>[`${v} / 100`, n]}/>
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {radarRows.map((d,i)=>(
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:2 }}>
                    <span style={{ color:"#9ca3af" }}>{d.dim}</span>
                    <span style={{ color:"#e8c547", fontFamily:"DM Mono,monospace" }}>{d.val} / 100</span>
                  </div>
                  <div style={{ background:"#1e2130", borderRadius:4, height:4 }}>
                    <div style={{ width:`${d.val}%`, background:`hsl(${40+i*30},75%,55%)`, height:"100%", borderRadius:4 }}/>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Language bar */}
            <Panel>
              <SectionHeader title="Language Composition" subtitle="Token-level distribution (%)"/>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart layout="vertical"
                  data={[{ n:"Mix",
                    "Bahasa Melayu": result.language_mix?.bahasa_melayu||0,
                    "English":       result.language_mix?.english||0,
                    "Slang":         result.language_mix?.slang_colloquial||0 }]}
                  margin={{ top:5, right:10, left:0, bottom:5 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={true} horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} stroke="#4b5563" fontSize={10}
                    tickFormatter={v=>`${v}%`} label={xLabel("% of lyric tokens")}/>
                  <YAxis type="category" dataKey="n" hide/>
                  <Tooltip formatter={(v,n)=>[`${v}%`,n]}
                    contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                  <Bar dataKey="Bahasa Melayu" stackId="l" fill="#4b9fe1"/>
                  <Bar dataKey="English"       stackId="l" fill="#e8c547"/>
                  <Bar dataKey="Slang"         stackId="l" fill="#e07b39" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend items={[
                ["Bahasa Melayu","#4b9fe1",`${result.language_mix?.bahasa_melayu}%`],
                ["English","#e8c547",`${result.language_mix?.english}%`],
                ["Slang","#e07b39",`${result.language_mix?.slang_colloquial}%`],
              ]}/>
              <div style={{ marginTop:10, padding:"7px 10px", background:"#0f1117", borderRadius:8, textAlign:"center" }}>
                <span style={{ color:"#6b7280", fontSize:10 }}>Code-switch type: </span>
                <span style={{ color:"#e8c547", fontSize:11, fontWeight:700 }}>{result.code_switch_type}</span>
              </div>
            </Panel>

            {/* Cultural scores */}
            <Panel>
              <SectionHeader title="Cultural Score Breakdown" subtitle="Scores 0–100 per dimension"/>
              {[
                ["Fatalism (takdir/jodoh)", result.fatalism_score,      "#c94b4b"],
                ["Individualism",           result.individualism_score,  "#4b9fe1"],
                ["OST Drama Suitability",   result.ost_suitability,      "#5cb85c"],
                ["Emotional Intensity",     result.emotional_intensity,  "#e8c547"],
              ].map(([lbl,val,col])=>(
                <div key={lbl} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                    <span style={{ color:"#9ca3af" }}>{lbl}</span>
                    <span style={{ color:col, fontFamily:"DM Mono,monospace" }}>{val} / 100</span>
                  </div>
                  <div style={{ background:"#1e2130", borderRadius:4, height:6 }}>
                    <div style={{ width:`${val}%`, background:col, height:"100%", borderRadius:4 }}/>
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>

        <div className="g-1-1" style={{ marginBottom:16 }}>
          {/* Motifs */}
          <Panel>
            <SectionHeader title="Detected Motifs" subtitle="Cultural keywords found in the lyrics"
              badge={`${result.motifs_detected?.length||0} FOUND`}/>
            {result.motifs_detected?.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {result.motifs_detected.map((m,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                    background:"#0f1117", borderRadius:8, border:"1px solid #1e2130" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:2 }}>
                        <span style={{ color:"#e8c547", fontSize:13, fontWeight:700 }}>{m.motif}</span>
                        <span style={{ color:"#6b7280", fontSize:11 }}>{m.translation}</span>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ color:"#4b5563", fontSize:10 }}>×{m.frequency}</span>
                        <span style={{ background: m.significance==="high"?"#e8c54720":m.significance==="medium"?"#4b9fe120":"#2a2d3a",
                          color: m.significance==="high"?"#e8c547":m.significance==="medium"?"#4b9fe1":"#6b7280",
                          fontSize:9, padding:"1px 6px", borderRadius:10 }}>{m.significance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color:"#4b5563", fontSize:12 }}>No significant motifs detected.</p>}
          </Panel>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Panel>
              <SectionHeader title="Key Phrases" subtitle="Emotionally significant lyric fragments"/>
              {result.key_phrases?.map((p,i)=>(
                <div key={i} style={{ padding:"10px 14px", background:"#0f1117", borderRadius:8,
                  borderLeft:"3px solid #e8c547", marginBottom:8 }}>
                  <p style={{ color:"#d1d5db", fontSize:13, margin:0, fontStyle:"italic",
                    fontFamily:"DM Mono,monospace", lineHeight:1.5 }}>"{p}"</p>
                </div>
              ))}
            </Panel>
            <Panel>
              <SectionHeader title="AJL Comparables" subtitle="Similar songs from the AJL corpus"/>
              {result.ajl_comparables?.map((c,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                  background:"#0f1117", borderRadius:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:6, background:"#e8c54720", display:"flex",
                    alignItems:"center", justifyContent:"center", color:"#e8c547", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <span style={{ color:"#d1d5db", fontSize:12 }}>{c}</span>
                </div>
              ))}
            </Panel>
          </div>
        </div>

        {/* Era strip */}
        <Panel>
          <SectionHeader title="Era Positioning" subtitle="Estimated fit within the AJL timeline"/>
          <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
            {["1986–1995","1996–2005","2006–2015","2016–2024"].map((era,i)=>{
              const active = result.estimated_era === era ||
                             result.estimated_era === era.replace("–","-");
              return (
                <div key={i} style={{ flex:1, minWidth:76, textAlign:"center", padding:"12px 8px",
                  background: active?"#e8c54720":"#0f1117",
                  border:`1px solid ${active?"#e8c547":"#1e2130"}`,
                  borderRadius: i===0?"8px 0 0 8px":i===3?"0 8px 8px 0":"0" }}>
                  <p style={{ color:active?"#e8c547":"#4b5563", fontSize:11, fontWeight:active?700:400, margin:"0 0 4px" }}>{era}</p>
                  {active && <div style={{ width:6, height:6, borderRadius:"50%", background:"#e8c547", margin:"0 auto" }}/>}
                </div>
              );
            })}
          </div>
          <p style={{ color:"#6b7280", fontSize:11, margin:"10px 0 0", lineHeight:1.5 }}>
            Estimated fit: <span style={{ color:"#e8c547" }}>{result.estimated_era}</span> — based on vocabulary, code-switching, archetypes, and lyrical structure.
          </p>
        </Panel>
      </>)}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function IramaAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [animKey,   setAnimKey]   = useState(0);
  useEffect(()=>{ setAnimKey(k=>k+1); }, [activeTab]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400&display=swap');
    *,*::before,*::after { box-sizing:border-box; }
    body { margin:0; background:#090b10; }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:#13161e; }
    ::-webkit-scrollbar-thumb { background:#2a2d3a; border-radius:3px; }
    .tb { transition:all 0.2s; cursor:pointer; border:none; background:none; -webkit-tap-highlight-color:transparent; }
    .fade-in { animation:fadeIn 0.35s ease forwards; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .pulse { animation:pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .rh:hover { background:#1a1d27 !important; }

    .g4  { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    .g21 { display:grid; grid-template-columns:1fr; gap:16px; }
    .g11 { display:grid; grid-template-columns:1fr; gap:16px; }
    .g3  { display:grid; grid-template-columns:1fr; gap:16px; }
    .gpl { display:flex; flex-direction:column; gap:12px; }
    .g-1-1 { display:grid; grid-template-columns:1fr; gap:12px; }
    .g-4col { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }

    @media(min-width:600px){
      .g4    { grid-template-columns:repeat(2,1fr); gap:16px; }
      .g21   { grid-template-columns:3fr 2fr; }
      .g11   { grid-template-columns:1fr 1fr; }
      .g3    { grid-template-columns:repeat(2,1fr); }
      .gpl   { flex-direction:row; flex-wrap:wrap; }
      .g-1-1 { grid-template-columns:1fr 1fr; }
      .g-4col{ grid-template-columns:repeat(2,1fr); }
    }
    @media(min-width:900px){
      .g4    { grid-template-columns:repeat(4,1fr); }
      .g3    { grid-template-columns:repeat(3,1fr); }
      .g-4col{ grid-template-columns:repeat(4,1fr); }
    }
    .hdr-r { display:none; }
    @media(min-width:540px){ .hdr-r { display:flex; } }
  `;

  return (
    <><style>{css}</style>
    <div style={{ minHeight:"100vh", background:"#090b10", fontFamily:"Syne,sans-serif" }}>

      {/* HEADER */}
      <div style={{ background:"#0f1117", borderBottom:"1px solid #1e2130", padding:"0 16px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#e8c547,#e07b39)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>♪</div>
            <div>
              <h1 style={{ color:"#f1f5f9", fontSize:14, fontWeight:800, margin:0, letterSpacing:0.5 }}>IRAMA ANALYTICS</h1>
              <p style={{ color:"#6b7280", fontSize:9, margin:0, letterSpacing:1.5, textTransform:"uppercase" }}>Malaysian Music Cultural Barometer</p>
            </div>
          </div>
          <div className="hdr-r" style={{ alignItems:"center", gap:8 }}>
            <div className="pulse" style={{ width:7, height:7, borderRadius:"50%", background:"#5cb85c" }}/>
            <span style={{ color:"#5cb85c", fontSize:10 }}>AJL 1–39 Corpus</span>
            <span style={{ color:"#4b5563", fontSize:10, marginLeft:8 }}>506 Songs</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottom:"1px solid #1e2130", background:"#0b0e16" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
          {TABS.map(t=>(
            <button key={t.id} className="tb" onClick={()=>setActiveTab(t.id)} style={{
              color: activeTab===t.id?"#e8c547":"#6b7280",
              borderBottom: activeTab===t.id?"2px solid #e8c547":"2px solid transparent",
              background: activeTab===t.id?"#e8c54710":"transparent",
              padding:"12px 13px", fontSize:11, whiteSpace:"nowrap", flexShrink:0,
              display:"flex", gap:5, alignItems:"center"
            }}><span>{t.icon}</span>{t.label}</button>
          ))}
        </div>
      </div>

      {/* PAGE */}
      <div key={animKey} className="fade-in" style={{ maxWidth:1400, margin:"0 auto", padding:"20px 16px 40px" }}>

        {/* ══ OVERVIEW ══ */}
        {activeTab==="overview" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              Malaysian Music <span style={{ color:"#e8c547" }}>Cultural Barometer</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12, lineHeight:1.6 }}>
              NLP-driven analysis of AJL corpus 1986–2024 · Lyrical sentiment · Thematic drift · OST-viewership correlation
            </p>
          </div>

          <div className="g4" style={{ marginBottom:16 }}>
            <StatCard label="Songs Analysed"  value="506"  sub="AJL 1986–2024 corpus"     accent="#e8c547"/>
            <StatCard label="Unique Motifs"   value="847"  sub="rindu leads all themes"    accent="#e07b39"/>
            <StatCard label="OST Songs"       value="61%"  sub="drama-linked tracks"       accent="#4b9fe1"/>
            <StatCard label="Cultural Shift"  value="↑62%" sub="individualism 1986→2024"   accent="#5cb85c"/>
          </div>

          <div className="g21" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Emotional Vocabulary Drift" subtitle="Collectivism vs Individualism score (0–100) across 4 decades" badge="KEY METRIC"/>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={sentimentEvolution} margin={{ top:5, right:10, left:10, bottom:20 }}>
                  <defs>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e8c547" stopOpacity={0.3}/><stop offset="95%" stopColor="#e8c547" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4b9fe1" stopOpacity={0.3}/><stop offset="95%" stopColor="#4b9fe1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="year" stroke="#4b5563" fontSize={10} label={xLabel("Year")}/>
                  <YAxis stroke="#4b5563" fontSize={10} width={38} domain={[0,100]}
                    tickFormatter={v=>`${v}`} label={yLabel("Score (0–100)",-90,-4)}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:11, paddingTop:4 }}/>
                  <Area type="monotone" dataKey="collectivism"  stroke="#e8c547" fill="url(#gC)" strokeWidth={2} name="Collectivism"/>
                  <Area type="monotone" dataKey="individualism" stroke="#4b9fe1" fill="url(#gI)" strokeWidth={2} name="Individualism"/>
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <SectionHeader title="Lyrical Archetypes" subtitle="Narrative distribution across 506 songs"/>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={archetypeData} dataKey="count" nameKey="archetype"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={3}
                    label={({ pct }) => `${pct}%`} labelLine={false}>
                    {archetypeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[`${v} songs`,n]}
                    contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend items={archetypeData.map((a,i)=>[a.archetype, COLORS[i%COLORS.length], `${a.pct}%`])}/>
            </Panel>
          </div>

          <div className="g3">
            <Panel>
              <SectionHeader title="Top Motifs" subtitle="Keyword frequency (count out of 506 songs)"/>
              {themeMotifs.slice(0,6).map((m,i)=>(
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:11 }}>
                    <span style={{ color:"#d1d5db" }}>{m.motif}</span>
                    <span style={{ color:"#e8c547", fontFamily:"DM Mono,monospace" }}>{m.count}</span>
                  </div>
                  <div style={{ background:"#1e2130", borderRadius:4, height:5 }}>
                    <div style={{ width:`${(m.count/847)*100}%`, background:`hsl(${200-i*15},70%,60%)`, height:"100%", borderRadius:4 }}/>
                  </div>
                </div>
              ))}
            </Panel>

            <Panel>
              <SectionHeader title="Fatalism → Empowerment" subtitle="Score (0–100) — shift from takdir/jodoh to self-agency"/>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={sentimentEvolution} margin={{ top:5, right:10, left:10, bottom:20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="year" stroke="#4b5563" fontSize={10} label={xLabel("Year")}/>
                  <YAxis stroke="#4b5563" fontSize={10} width={38} domain={[0,100]}
                    tickFormatter={v=>`${v}`} label={yLabel("Score (0–100)",-90,-4)}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:10, paddingTop:4 }}/>
                  <Line type="monotone" dataKey="fatalism"    stroke="#c94b4b" strokeWidth={2} dot={false} name="Fatalism"/>
                  <Line type="monotone" dataKey="empowerment" stroke="#5cb85c" strokeWidth={2} dot={false} name="Empowerment"/>
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <SectionHeader title="Recent AJL Winners" subtitle="Sentiment snapshot 2010–2024"/>
              {ajlWinners.slice(-4).map((w,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                  background:"#0f1117", borderRadius:8, border:"1px solid #1e2130", marginBottom:8 }}>
                  <div style={{ color:"#4b5563", fontFamily:"DM Mono,monospace", fontSize:11, width:32, flexShrink:0 }}>{w.year}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#f1f5f9", fontSize:12, margin:"0 0 1px", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.song}</p>
                    <p style={{ color:"#6b7280", fontSize:10, margin:0 }}>{w.artist}</p>
                  </div>
                  <span style={{ background:`${SENT_CLR[w.sentiment]||"#666"}22`, color:SENT_CLR[w.sentiment]||"#999",
                    fontSize:9, padding:"2px 6px", borderRadius:20, border:`1px solid ${SENT_CLR[w.sentiment]||"#666"}44`,
                    whiteSpace:"nowrap", flexShrink:0 }}>{w.sentiment}</span>
                </div>
              ))}
            </Panel>
          </div>
        </>}

        {/* ══ SENTIMENT ══ */}
        {activeTab==="sentiment" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              Sentiment <span style={{ color:"#e8c547" }}>Evolution Analysis</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>Dynamic Topic Modeling · Emotional vocabulary shifts · Era-based radar profiling</p>
          </div>

          <div className="g11" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Multi-Dimensional Sentiment" subtitle="6 emotional axes tracked 1986–2024 (score 0–100)" badge="DTM ANALYSIS"/>
              <ResponsiveContainer width="100%" height={270}>
                <LineChart data={sentimentEvolution} margin={{ top:5, right:10, left:10, bottom:20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="year" stroke="#4b5563" fontSize={10} label={xLabel("Year")}/>
                  <YAxis stroke="#4b5563" fontSize={10} width={38} domain={[0,100]}
                    tickFormatter={v=>`${v}`} label={yLabel("Score (0–100)",-90,-4)}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:10, paddingTop:4 }}/>
                  <Line type="monotone" dataKey="collectivism"  stroke="#e8c547" strokeWidth={2} dot={false} name="Collectivism"/>
                  <Line type="monotone" dataKey="individualism" stroke="#4b9fe1" strokeWidth={2} dot={false} name="Individualism"/>
                  <Line type="monotone" dataKey="fatalism"      stroke="#c94b4b" strokeWidth={2} dot={false} name="Fatalism"/>
                  <Line type="monotone" dataKey="empowerment"   stroke="#5cb85c" strokeWidth={2} dot={false} name="Empowerment"/>
                  <Line type="monotone" dataKey="love"          stroke="#e07b39" strokeWidth={2} dot={false} name="Love"/>
                  <Line type="monotone" dataKey="conflict"      stroke="#9b59b6" strokeWidth={2} dot={false} name="Conflict"/>
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <SectionHeader title="Era Emotional Radar" subtitle="Comparative 3-era profile (score 0–100 per dimension)" badge="ABSA OUTPUT"/>
              <ResponsiveContainer width="100%" height={270}>
                <RadarChart data={emotionalRadar} margin={{ top:10, right:20, bottom:10, left:20 }}>
                  <PolarGrid stroke="#1e2130"/>
                  <PolarAngleAxis dataKey="dim" tick={{ fill:"#9ca3af", fontSize:10 }}/>
                  <PolarRadiusAxis angle={30} domain={[0,100]} tickCount={4}
                    tick={{ fill:"#4b5563", fontSize:9 }} tickFormatter={v=>`${v}`}/>
                  <Radar name="1986–2000" dataKey="1986–2000" stroke="#e8c547" fill="#e8c547" fillOpacity={0.2}/>
                  <Radar name="2001–2015" dataKey="2001–2015" stroke="#e07b39" fill="#e07b39" fillOpacity={0.2}/>
                  <Radar name="2016–2024" dataKey="2016–2024" stroke="#4b9fe1" fill="#4b9fe1" fillOpacity={0.2}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:10, paddingTop:4 }}/>
                  <Tooltip contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}
                    formatter={(v,n)=>[`${v} / 100`,n]}/>
                </RadarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="g11">
            <Panel>
              <SectionHeader title="Intensity by Song" subtitle="Emotional intensity score (0–100) per AJL winner, coloured by sentiment"/>
              {ajlWinners.map((w,i)=>(
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                    <span style={{ color:"#d1d5db" }}>{w.year} · {w.song}</span>
                    <span style={{ color:"#e8c547", fontFamily:"DM Mono,monospace" }}>{w.intensity} / 100</span>
                  </div>
                  <div style={{ background:"#1e2130", borderRadius:4, height:5 }}>
                    <div style={{ width:`${w.intensity}%`, background:SENT_CLR[w.sentiment]||"#666", height:"100%", borderRadius:4 }}/>
                  </div>
                </div>
              ))}
              <ChartLegend items={Object.entries(SENT_CLR).map(([s,c])=>[s,c])}/>
            </Panel>

            <Panel>
              <SectionHeader title="Vibe × Viewership" subtitle="Left axis: Sentiment score (0–100) · Right axis: Drama viewership & engagement (millions)" badge="PREDICTIVE"/>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={vibeViewership} margin={{ top:5, right:40, left:10, bottom:20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="month" stroke="#4b5563" fontSize={10} label={xLabel("Month")}/>
                  <YAxis yAxisId="l" stroke="#e8c547" fontSize={10} width={36} domain={[50,100]}
                    tickFormatter={v=>`${v}`} label={{ value:"Sentiment (0–100)", angle:-90, position:"insideLeft", style:{fill:"#e8c547",fontSize:10}, dx:-4 }}/>
                  <YAxis yAxisId="r" orientation="right" stroke="#4b9fe1" fontSize={10} width={36}
                    tickFormatter={v=>`${v}M`} label={{ value:"Viewers / Engagement (M)", angle:90, position:"insideRight", style:{fill:"#4b9fe1",fontSize:10}, dx:14 }}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:10, paddingTop:4 }}/>
                  <Line yAxisId="l" type="monotone" dataKey="sentimentScore"  stroke="#e8c547" strokeWidth={2.5} dot={{ r:3 }} name="Sentiment Score"/>
                  <Line yAxisId="r" type="monotone" dataKey="viewershipM"     stroke="#4b9fe1" strokeWidth={2.5} dot={{ r:3 }} name="Viewership (M)"/>
                  <Line yAxisId="r" type="monotone" dataKey="engagementM"     stroke="#5cb85c" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Engagement (M)"/>
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </>}

        {/* ══ LANGUAGE ══ */}
        {activeTab==="language" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              Language &amp; <span style={{ color:"#e8c547" }}>Code-Switching</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>Manglish hybridity · Bahasa Baku erosion · Generational code-switch patterns in AJL corpus</p>
          </div>

          <Panel style={{ marginBottom:16 }}>
            <SectionHeader title="Language Mix Shift 1986–2024"
              subtitle="% of lyric tokens per language category each year (stacked; total = 100%)" badge="CORPUS ANALYSIS"/>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={languageMix} barSize={22} margin={{ top:5, right:10, left:14, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                <XAxis dataKey="year" stroke="#4b5563" fontSize={11} label={xLabel("Year")}/>
                <YAxis stroke="#4b5563" fontSize={11} width={42} domain={[0,100]}
                  tickFormatter={v=>`${v}%`} label={yLabel("% of Tokens",-90,-6)}/>
                <Tooltip formatter={(v,n)=>[`${v}%`,n]}
                  contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                <Bar dataKey="Bahasa Melayu" stackId="l" fill="#4b9fe1"/>
                <Bar dataKey="English"       stackId="l" fill="#e8c547"/>
                <Bar dataKey="Slang"         stackId="l" fill="#e07b39" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[
              ["Bahasa Melayu","#4b9fe1","94% → 48%"],
              ["English","#e8c547","4% → 34%"],
              ["Slang / Colloquial","#e07b39","2% → 18%"],
            ]}/>
          </Panel>

          <div className="g11" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Code-Switch Types" subtitle="Current corpus distribution (506 songs)"/>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={codeSwitch} dataKey="pct" nameKey="type"
                    cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={4}
                    label={({ pct }) => `${pct}%`} labelLine={false}>
                    {codeSwitch.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[`${v}%`,n]}
                    contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend items={codeSwitch.map((c,i)=>[`${c.type} (${c.songs} songs)`, COLORS[i], `${c.pct}%`])}/>
            </Panel>

            <Panel>
              <SectionHeader title="NLP Model Recommendations" subtitle="Best model per lyric type — accuracy on Malay corpus" badge="TECHNICAL"/>
              {[
                { type:"Pure Bahasa Baku",    model:"BERTMalay-Base",      acc:91, color:"#5cb85c" },
                { type:"Bahasa-English Mix",  model:"XLM-RoBERTa",         acc:87, color:"#4b9fe1" },
                { type:"Malay Slang / Gen-Z", model:"mBERT + Custom Dict", acc:74, color:"#e07b39" },
                { type:"Religious / Nasyid",  model:"IndoBERT-fine-tuned", acc:82, color:"#e8c547" },
                { type:"Pantun-style Poetic", model:"GPT-4o + ABSA layer", acc:68, color:"#9b59b6" },
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px",
                  background:"#0f1117", borderRadius:8, marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#d1d5db", fontSize:12, margin:"0 0 2px", fontWeight:600 }}>{r.type}</p>
                    <p style={{ color:"#6b7280", fontSize:10, margin:0, fontFamily:"DM Mono,monospace" }}>{r.model}</p>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ color:r.color, fontSize:14, fontWeight:700, margin:0 }}>{r.acc}%</p>
                    <p style={{ color:"#4b5563", fontSize:9, margin:0 }}>accuracy</p>
                  </div>
                </div>
              ))}
            </Panel>
          </div>

          <Panel>
            <SectionHeader title="Bahasa Baku Erosion Rate" subtitle="Pure Bahasa Melayu token share (%) declining year by year"/>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={languageMix} margin={{ top:5, right:10, left:14, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                <XAxis dataKey="year" stroke="#4b5563" fontSize={11} label={xLabel("Year")}/>
                <YAxis stroke="#4b5563" fontSize={11} width={42} domain={[0,100]}
                  tickFormatter={v=>`${v}%`} label={yLabel("Bahasa Melayu (%)",-90,-6)}/>
                <Tooltip formatter={(v,n)=>[`${v}%`,n]}
                  contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                <Bar dataKey="Bahasa Melayu" name="Bahasa Melayu %" radius={[4,4,0,0]}>
                  {languageMix.map((_,i)=><Cell key={i} fill={`hsl(${210+i*4},70%,${44+i*2}%)`}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </>}

        {/* ══ ARCHETYPES ══ */}
        {activeTab==="archetypes" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              Lyrical <span style={{ color:"#e8c547" }}>Archetype Profiling</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>Narrative character analysis · Cultural trope mapping · Thematic motif frequency</p>
          </div>

          <div className="g11" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Archetype Frequency" subtitle="Number of songs per archetype across AJL 1986–2024" badge="NLP CLASSIFIED"/>
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={archetypeData} layout="vertical" margin={{ top:5, right:20, left:10, bottom:20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" horizontal={false}/>
                  <XAxis type="number" stroke="#4b5563" fontSize={10} label={xLabel("Number of Songs")}/>
                  <YAxis type="category" dataKey="archetype" stroke="#4b5563" fontSize={10} width={148}/>
                  <Tooltip formatter={(v,n)=>[`${v} songs`,n]}
                    contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                  <Bar dataKey="count" name="Songs" radius={[0,4,4,0]}>
                    {archetypeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend items={archetypeData.map((a,i)=>[a.archetype, COLORS[i%COLORS.length], `${a.pct}%`])}/>
            </Panel>

            <Panel>
              <SectionHeader title="Top Lyrical Motifs" subtitle="Recurring keywords — count out of 506 songs"/>
              {themeMotifs.map((m,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                  <span style={{ color:"#4b5563", fontFamily:"DM Mono,monospace", fontSize:11, width:18, textAlign:"right", flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ color:"#d1d5db", fontSize:11, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.motif}</span>
                      <span style={{ color:"#e8c547", fontFamily:"DM Mono,monospace", fontSize:11, marginLeft:8, flexShrink:0 }}>{m.count}</span>
                    </div>
                    <div style={{ background:"#1e2130", borderRadius:4, height:4 }}>
                      <div style={{ width:`${(m.count/847)*100}%`, background:`hsl(${40-i*3},85%,${60-i*2}%)`, height:"100%", borderRadius:4 }}/>
                    </div>
                  </div>
                </div>
              ))}
            </Panel>
          </div>

          <Panel>
            <SectionHeader title="AJL Song × Archetype × Sentiment Matrix" subtitle="Full winner profile 1986–2024" badge="ENRICHED CORPUS"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:560 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #2a2d3a" }}>
                    {["Year","Song","Artist","Archetype","Sentiment","Intensity (0–100)","OST"].map(h=>(
                      <th key={h} style={{ color:"#6b7280", fontWeight:600, padding:"8px 10px", textAlign:"left", fontSize:10, letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ajlWinners.map((w,i)=>(
                    <tr key={i} className="rh" style={{ borderBottom:"1px solid #1e2130", transition:"background 0.15s" }}>
                      <td style={{ padding:"9px 10px", color:"#6b7280", fontFamily:"DM Mono,monospace", fontSize:11 }}>{w.year}</td>
                      <td style={{ padding:"9px 10px", color:"#f1f5f9", fontWeight:600, fontSize:12 }}>{w.song}</td>
                      <td style={{ padding:"9px 10px", color:"#9ca3af", fontSize:11 }}>{w.artist}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{ background:"#e8c54715", color:"#e8c547", padding:"2px 7px", borderRadius:20, fontSize:10 }}>{w.archetype}</span>
                      </td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{ background:`${SENT_CLR[w.sentiment]}22`, color:SENT_CLR[w.sentiment], padding:"2px 7px", borderRadius:20, fontSize:10 }}>{w.sentiment}</span>
                      </td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:44, background:"#1e2130", borderRadius:3, height:4 }}>
                            <div style={{ width:`${w.intensity}%`, background:SENT_CLR[w.sentiment], height:"100%", borderRadius:3 }}/>
                          </div>
                          <span style={{ color:"#e8c547", fontFamily:"DM Mono,monospace", fontSize:11 }}>{w.intensity}</span>
                        </div>
                      </td>
                      <td style={{ padding:"9px 10px", color:w.isOST?"#5cb85c":"#4b5563", fontSize:11 }}>{w.isOST?"✓":"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>}

        {/* ══ OST × VIEWS ══ */}
        {activeTab==="ost" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              OST × <span style={{ color:"#e8c547" }}>Drama Viewership</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>Narrative Congruence Score · Vibe-to-Viewership predictive index</p>
          </div>

          <div className="g3" style={{ marginBottom:16 }}>
            <StatCard label="Avg Correlation"  value="r = 0.84" sub="sentiment vs viewership"     accent="#5cb85c"/>
            <StatCard label="OST in Top 10"    value="8 / 10"   sub="drama hits linked to OST"    accent="#e8c547"/>
            <StatCard label="Sad OST Boost"    value="+34%"     sub="viewership lift vs neutral"   accent="#4b9fe1"/>
          </div>

          <div className="g11" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Vibe-to-Viewership Index" subtitle="Left axis: Sentiment score (0–100) · Right axis: Viewership & Engagement (millions)" badge="PREDICTIVE MODEL"/>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={vibeViewership} margin={{ top:5, right:44, left:14, bottom:20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="month" stroke="#4b5563" fontSize={10} label={xLabel("Month")}/>
                  <YAxis yAxisId="l" stroke="#e8c547" fontSize={10} width={36} domain={[50,100]}
                    tickFormatter={v=>`${v}`}
                    label={{ value:"Sentiment (0–100)", angle:-90, position:"insideLeft", style:{fill:"#e8c547",fontSize:10}, dx:-4 }}/>
                  <YAxis yAxisId="r" orientation="right" stroke="#4b9fe1" fontSize={10} width={36}
                    tickFormatter={v=>`${v}M`}
                    label={{ value:"Viewers / Engagement (M)", angle:90, position:"insideRight", style:{fill:"#4b9fe1",fontSize:10}, dx:16 }}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ color:"#9ca3af", fontSize:10, paddingTop:4 }}/>
                  <Line yAxisId="l" type="monotone" dataKey="sentimentScore" stroke="#e8c547" strokeWidth={2.5} dot={{ r:3 }} name="Sentiment Score"/>
                  <Line yAxisId="r" type="monotone" dataKey="viewershipM"    stroke="#4b9fe1" strokeWidth={2.5} dot={{ r:3 }} name="Viewership (M)"/>
                  <Line yAxisId="r" type="monotone" dataKey="engagementM"    stroke="#5cb85c" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Engagement (M)"/>
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <SectionHeader title="Sentiment × Viewership Scatter" subtitle="X: OST Sentiment Score (0–100) · Y: Drama Viewership (M) · Colour = Sentiment type"/>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top:10, right:20, left:14, bottom:30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="ostRating" name="Sentiment Score" type="number" stroke="#4b5563" fontSize={10}
                    domain={[65,100]} label={{ value:"OST Sentiment Score (0–100)", position:"insideBottom", offset:-14, style:{fill:"#6b7280",fontSize:10} }}/>
                  <YAxis dataKey="dramaViews" name="Drama Views (M)" type="number" stroke="#4b5563" fontSize={10} width={38}
                    label={{ value:"Viewership (M)", angle:-90, position:"insideLeft", style:{fill:"#6b7280",fontSize:10}, dx:-4 }}/>
                  <Tooltip cursor={{ strokeDasharray:"3 3" }}
                    formatter={(v,n)=>[`${v}${n.includes("M")?" M":""}`,n]}
                    contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:11 }}/>
                  <Scatter data={ostCorrelation} name="OST">
                    {ostCorrelation.map((e,i)=><Cell key={i} fill={SENT_CLR[e.sentiment]||"#e8c547"}/>)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <ChartLegend items={[...new Set(ostCorrelation.map(o=>o.sentiment))].map(s=>[s, SENT_CLR[s]||"#e8c547"])}/>
            </Panel>
          </div>

          <Panel>
            <SectionHeader title="OST Narrative Congruence Ranking" subtitle="Ranked by drama viewership (M) · colour = sentiment category"/>
            <div className="g11">
              {ostCorrelation.map((o,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                  background:"#0f1117", borderRadius:10, border:"1px solid #1e2130" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${SENT_CLR[o.sentiment]||"#666"}22`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:SENT_CLR[o.sentiment]||"#999", fontSize:13, fontWeight:700,
                    border:`1px solid ${SENT_CLR[o.sentiment]||"#666"}44`, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#f1f5f9", fontSize:13, fontWeight:700, margin:"0 0 3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.song}</p>
                    <span style={{ background:`${SENT_CLR[o.sentiment]}22`, color:SENT_CLR[o.sentiment], fontSize:10, padding:"1px 6px", borderRadius:20 }}>{o.sentiment}</span>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ color:"#e8c547", fontSize:15, fontWeight:700, margin:"0 0 1px" }}>{o.dramaViews}M</p>
                    <p style={{ color:"#6b7280", fontSize:9, margin:0 }}>viewers</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>}

        {/* ══ PIPELINE ══ */}
        {activeTab==="pipeline" && <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:"0 0 4px" }}>
              Open-Source <span style={{ color:"#e8c547" }}>Data Pipeline</span>
            </h2>
            <p style={{ color:"#6b7280", margin:0, fontSize:12 }}>ELT architecture · Wikipedia AJL scraper → DuckDB → XLM-RoBERTa → Dashboard</p>
          </div>

          <Panel style={{ marginBottom:16 }}>
            <SectionHeader title="Pipeline Architecture" subtitle="From raw AJL corpus to cultural insight" badge="OPEN SOURCE"/>
            <div className="gpl">
              {[
                { stage:"EXTRACT",   icon:"⬇", lines:["Wikipedia AJL Tables","LirikLagu.com scraper","YouTube metadata API"],  color:"#4b9fe1" },
                { stage:"LOAD",      icon:"🗄", lines:["DuckDB staging","Raw JSON + Parquet","S3 / local fallback"],             color:"#e8c547" },
                { stage:"TRANSFORM", icon:"⚙", lines:["dbt normalisation","Lang detection","Chorus/Verse tagging"],             color:"#e07b39" },
                { stage:"NLP",       icon:"🧠", lines:["XLM-RoBERTa","ABSA sentiment","Dynamic Topic Model"],                   color:"#9b59b6" },
                { stage:"ENRICH",    icon:"🔗", lines:["Drama viewership join","Social sentiment","MalayMoji dict"],             color:"#c94b4b" },
                { stage:"SERVE",     icon:"📊", lines:["React dashboard","Streamlit reports","CSV/Excel export"],                color:"#5cb85c" },
              ].map((s,i)=>(
                <div key={i} style={{ flex:"1 1 130px", minWidth:0, textAlign:"center", padding:"14px 10px",
                  background:`${s.color}11`, border:`1px solid ${s.color}33`, borderRadius:12 }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <p style={{ color:s.color, fontSize:10, fontWeight:700, letterSpacing:1, margin:"0 0 6px" }}>{s.stage}</p>
                  {s.lines.map((l,j)=><p key={j} style={{ color:"#9ca3af", fontSize:10, margin:"1px 0", lineHeight:1.4 }}>{l}</p>)}
                </div>
              ))}
            </div>
          </Panel>

          <div className="g11" style={{ marginBottom:16 }}>
            <Panel>
              <SectionHeader title="Open-Source Data Sources" subtitle="No paid API key required" badge="FREE TIER"/>
              {[
                ["Wikipedia AJL Pages",    "Structured HTML",     "506 songs",          "✓","#5cb85c"],
                ["LirikLagu.com",          "Web scrape",          "2,400+ lyrics",      "✓","#5cb85c"],
                ["YouTube Data API v3",    "REST (free quota)",   "Views + metadata",   "✓","#5cb85c"],
                ["RTM Viewership Reports", "PDF scrape",          "Annual ratings",     "⚠","#e07b39"],
                ["Spotify Web API",        "OAuth REST",          "Audio features",     "✓","#5cb85c"],
                ["Twitter/X API v2",       "Basic tier",          "Social sentiment",   "⚠","#e07b39"],
              ].map(([src,type,rec,st,col],i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  background:"#0f1117", borderRadius:8, marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#d1d5db", fontSize:12, fontWeight:600, margin:"0 0 1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src}</p>
                    <p style={{ color:"#6b7280", fontSize:10, margin:0 }}>{type} · {rec}</p>
                  </div>
                  <span style={{ color:col, fontSize:11, flexShrink:0 }}>{st}</span>
                </div>
              ))}
            </Panel>

            <Panel>
              <SectionHeader title="DuckDB Schema" subtitle="Core table powering the analytics layer" badge="SQL"/>
              <div style={{ background:"#0b0e16", borderRadius:8, padding:14, fontFamily:"DM Mono,monospace", fontSize:11, lineHeight:1.75, overflowX:"auto" }}>
                {[
                  ["#9b59b6","-- songs table"],
                  ["#4b9fe1","CREATE TABLE songs ("],
                  ["#9ca3af","  song_id     UUID PRIMARY KEY,"],
                  ["#9ca3af","  title       TEXT NOT NULL,"],
                  ["#9ca3af","  artist      TEXT,"],
                  ["#9ca3af","  ajl_year    INTEGER,"],
                  ["#9ca3af","  ctx_type    TEXT,   -- OST|Indie|Pop"],
                  ["#9ca3af","  lyrics_raw  TEXT,"],
                  ["#9ca3af","  lyrics_clean TEXT,"],
                  ["#9ca3af","  lang_mix    STRUCT("],
                  ["#9ca3af","    bahasa FLOAT, english FLOAT,"],
                  ["#9ca3af","    slang  FLOAT),"],
                  ["#9ca3af","  sentiment   FLOAT,  -- 0-100"],
                  ["#9ca3af","  archetype   TEXT,"],
                  ["#9ca3af","  segment_map JSON,"],
                  ["#9ca3af","  created_at  TIMESTAMP"],
                  ["#4b9fe1",");"],
                ].map(([col,txt],i)=><div key={i} style={{ color:col }}>{txt||" "}</div>)}
              </div>
            </Panel>
          </div>

          <Panel>
            <SectionHeader title="Python Scraper Starter" subtitle="AJL Wikipedia → DuckDB ingestion template" badge="COPY-READY"/>
            <div style={{ background:"#0b0e16", borderRadius:8, padding:16, fontFamily:"DM Mono,monospace", fontSize:11, lineHeight:1.8, overflowX:"auto" }}>
              {[
                ["#6b7280","# irama_pipeline.py"],
                ["#e07b39","import duckdb, requests, uuid, json"],
                ["#e07b39","from bs4 import BeautifulSoup"],
                ["#e07b39","from langdetect import detect_langs"],
                ["#6b7280",""],
                ["#9b59b6","AJL_WIKI = 'https://en.wikipedia.org/wiki/Anugerah_Juara_Lagu'"],
                ["#6b7280",""],
                ["#4b9fe1","def scrape_ajl_table(url):"],
                ["#9ca3af","    soup  = BeautifulSoup(requests.get(url).text, 'html.parser')"],
                ["#9ca3af","    songs = []"],
                ["#9ca3af","    for tbl in soup.find_all('table', class_='wikitable'):"],
                ["#9ca3af","        for row in tbl.find_all('tr')[1:]:"],
                ["#9ca3af","            cells = [c.text.strip() for c in row.find_all('td')]"],
                ["#9ca3af","            if len(cells) >= 3:"],
                ["#9ca3af","                songs.append({'year':cells[0],"],
                ["#9ca3af","                  'song':cells[1],'artist':cells[2]})"],
                ["#9ca3af","    return songs"],
                ["#6b7280",""],
                ["#4b9fe1","def detect_lang_mix(text):"],
                ["#9ca3af","    return {l.lang:round(l.prob,3) for l in detect_langs(text)}"],
                ["#6b7280",""],
                ["#4b9fe1","def load_to_duckdb(songs):"],
                ["#9ca3af","    con = duckdb.connect('irama.duckdb')"],
                ["#9ca3af","    for s in songs:"],
                ["#9ca3af","        s['song_id']  = str(uuid.uuid4())"],
                ["#9ca3af","        s['lang_mix'] = json.dumps("],
                ["#9ca3af","            detect_lang_mix(s.get('lyrics_raw','')))"],
                ["#9ca3af","    print(f'Loaded {len(songs)} songs ✓')"],
              ].map(([col,txt],i)=><div key={i} style={{ color:col }}>{txt||" "}</div>)}
            </div>
          </Panel>
        </>}

        {/* ══ LYRIC ANALYSER ══ */}
        {activeTab==="analyser" && <LyricAnalyser/>}

      </div>

      {/* FOOTER */}
      <div style={{ borderTop:"1px solid #1e2130", padding:"14px 16px", background:"#0b0e16", textAlign:"center" }}>
        <p style={{ color:"#4b5563", fontSize:10, margin:0, letterSpacing:0.8 }}>
          IRAMA ANALYTICS · AJL Corpus 1986–2024 · Dummy data — production via DuckDB + XLM-RoBERTa
        </p>
      </div>
    </div>
    </>
  );
}
