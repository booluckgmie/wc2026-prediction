import { useState, useEffect, useCallback, useRef } from "react";

// ── API ───────────────────────────────────────────────────────────────────────

const BASE   = "https://worldcup26.ir";
const PROXY  = "https://corsproxy.io/?url=";
const LS_TOKEN = "wc26_token";
const LS_CREDS = "wc26_creds";

// Try direct first, fall back to CORS proxy
async function smartFetch(url, opts={}) {
  try {
    const r = await fetch(url, opts);
    if (r.ok || r.status === 400) return r; // 400 on register = already exists, fine
    throw new Error(`HTTP ${r.status}`);
  } catch {
    // retry through CORS proxy (GET only — proxy can't forward auth POST bodies reliably)
    if (!opts.method || opts.method === "GET") {
      const proxyUrl = PROXY + encodeURIComponent(url);
      const r2 = await fetch(proxyUrl, opts);
      return r2;
    }
    throw new Error("Network unreachable");
  }
}

async function apiToken() {
  const stored = localStorage.getItem(LS_TOKEN);
  if (stored) return stored;

  const uid = Math.random().toString(36).slice(2,10);
  const email = `anon_${uid}@wc26dash.dev`;
  const password = `Wc_${uid}_2026!`;
  localStorage.setItem(LS_CREDS, JSON.stringify({email,password}));

  // Register (ignore errors — account may already exist)
  await fetch(`${BASE}/auth/register`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name:"WC26 User", email, password})
  }).catch(()=>{});

  // Authenticate — try direct, then proxy
  let data;
  try {
    const r = await fetch(`${BASE}/auth/authenticate`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    if (!r.ok) throw new Error("direct auth failed");
    data = await r.json();
  } catch {
    // proxy POST via encoded query param trick (allorigins)
    const r2 = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(BASE+"/auth/authenticate")}`,
      { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({email,password}) }
    );
    if (!r2.ok) throw new Error("Auth failed — API unreachable");
    data = await r2.json();
  }

  const token = data.token;
  if (!token) throw new Error("No token in auth response");
  localStorage.setItem(LS_TOKEN, token);
  return token;
}

async function apiFetch(path, token) {
  const url = `${BASE}${path}`;
  const headers = { "Authorization":`Bearer ${token}` };
  let r;
  try {
    r = await fetch(url, { headers });
    if (r.status === 401) { localStorage.removeItem(LS_TOKEN); throw new Error("Token expired"); }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch(e) {
    if (e.message === "Token expired") throw e;
    // CORS fallback
    r = await fetch(PROXY + encodeURIComponent(url), { headers });
    if (r.status === 401) { localStorage.removeItem(LS_TOKEN); throw new Error("Token expired"); }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  }
  return r.json();
}

// ── STATIC CHESS / xG DATA ────────────────────────────────────────────────────

const CHESS = {
  "Brazil":      {xgOff:2.4,xgDef:0.7,style:"Total Football",   color:"#009c3b",pieces:{king:88,queen:91,rooks:86,bishops:89,knights:84,pawns:82},players:["Vinicius Jr. ★5.0","Endrick ★4.5","Rodrygo ★4.2","Casemiro ★4.3"]},
  "France":      {xgOff:2.2,xgDef:0.8,style:"Counter-Attack",   color:"#002395",pieces:{king:87,queen:93,rooks:88,bishops:85,knights:86,pawns:84},players:["Mbappé ★5.0","Griezmann ★4.6","Camavinga ★4.3","Saliba ★4.4"]},
  "Argentina":   {xgOff:2.0,xgDef:0.9,style:"Tiki-Counter",     color:"#74acdf",pieces:{king:85,queen:94,rooks:84,bishops:86,knights:83,pawns:81},players:["Messi ★5.0","J.Álvarez ★4.5","Mac Allister ★4.3","Otamendi ★4.2"]},
  "England":     {xgOff:2.1,xgDef:0.9,style:"High Press",       color:"#cf111b",pieces:{king:86,queen:88,rooks:87,bishops:84,knights:87,pawns:89},players:["Bellingham ★4.8","Saka ★4.6","Kane ★4.7","Alexander-Arnold ★4.4"]},
  "Spain":       {xgOff:2.0,xgDef:0.8,style:"Possession",       color:"#c60b1e",pieces:{king:85,queen:87,rooks:86,bishops:91,knights:88,pawns:87},players:["Pedri ★4.7","Yamal ★4.6","Morata ★4.3","Rodri ★4.8"]},
  "Germany":     {xgOff:1.9,xgDef:1.0,style:"Pressing",         color:"#555555",pieces:{king:84,queen:86,rooks:85,bishops:84,knights:87,pawns:88},players:["Musiala ★4.7","Wirtz ★4.6","Havertz ★4.4","Rüdiger ★4.3"]},
  "Portugal":    {xgOff:2.1,xgDef:1.0,style:"Wing Dominance",   color:"#006600",pieces:{king:84,queen:90,rooks:88,bishops:83,knights:84,pawns:82},players:["Ronaldo ★4.5","B.Fernandes ★4.6","Leão ★4.4","Dias ★4.5"]},
  "Netherlands": {xgOff:1.9,xgDef:1.0,style:"Total Football",   color:"#ff6600",pieces:{king:85,queen:87,rooks:86,bishops:85,knights:86,pawns:83},players:["Gakpo ★4.5","De Jong ★4.4","Dumfries ★4.2","Van Dijk ★4.6"]},
  "Italy":       {xgOff:1.7,xgDef:0.9,style:"Catenaccio+",      color:"#003d99",pieces:{king:88,queen:82,rooks:83,bishops:86,knights:85,pawns:84},players:["Chiesa ★4.4","Barella ★4.5","Donnarumma ★4.6","Bastoni ★4.3"]},
  "Mexico":      {xgOff:1.5,xgDef:1.2,style:"Counter + Block",  color:"#006847",pieces:{king:83,queen:80,rooks:82,bishops:79,knights:81,pawns:85},players:["Lozano ★4.2","Guardado ★3.9","Ochoa ★4.3","Herrera ★4.0"]},
  "United States":{xgOff:1.6,xgDef:1.1,style:"Athletic Press",  color:"#b22234",pieces:{king:82,queen:83,rooks:84,bishops:79,knights:85,pawns:86},players:["Pulisic ★4.4","McKennie ★4.1","Musah ★4.2","Turner ★4.0"]},
  "Canada":      {xgOff:1.5,xgDef:1.2,style:"High Line",        color:"#ff0000",pieces:{king:80,queen:82,rooks:81,bishops:78,knights:82,pawns:83},players:["Davies ★4.6","David ★4.4","Buchanan ★4.1","Borjan ★3.9"]},
  "Japan":       {xgOff:1.5,xgDef:1.1,style:"Gegenpress",       color:"#003087",pieces:{king:82,queen:80,rooks:81,bishops:82,knights:83,pawns:84},players:["Doan ★4.2","Kubo ★4.4","Mitoma ★4.3","Endo ★4.2"]},
  "Morocco":     {xgOff:1.4,xgDef:1.0,style:"Counter-Press",    color:"#c1272d",pieces:{king:84,queen:79,rooks:83,bishops:78,knights:82,pawns:84},players:["Ziyech ★4.3","En-Nesyri ★4.2","Hakimi ★4.5","Aguerd ★4.1"]},
  "Uruguay":     {xgOff:1.5,xgDef:1.0,style:"Garra Charrúa",    color:"#5aaae7",pieces:{king:83,queen:82,rooks:81,bishops:79,knights:82,pawns:83},players:["Núñez ★4.4","Valverde ★4.5","Bentancur ★4.2","Araújo ★4.4"]},
  "Colombia":    {xgOff:1.7,xgDef:1.1,style:"Transition",       color:"#ffd700",pieces:{king:81,queen:84,rooks:82,bishops:83,knights:82,pawns:81},players:["L.Díaz ★4.5","J.Cuadrado ★4.1","R.Uribe ★4.0","Cuesta ★4.1"]},
  "Belgium":     {xgOff:1.8,xgDef:1.1,style:"Individual Qual.", color:"#000000",pieces:{king:83,queen:85,rooks:82,bishops:83,knights:84,pawns:80},players:["De Bruyne ★4.7","Lukaku ★4.4","Tielemans ★4.2","Courtois ★4.5"]},
  "Croatia":     {xgOff:1.6,xgDef:1.1,style:"Midfield Control", color:"#ff0000",pieces:{king:82,queen:80,rooks:81,bishops:86,knights:85,pawns:80},players:["Modrić ★4.5","Kovačić ★4.3","Kramarić ★4.2","Gvardiol ★4.4"]},
  "Serbia":      {xgOff:1.5,xgDef:1.2,style:"Physical Block",   color:"#c6363c",pieces:{king:82,queen:81,rooks:79,bishops:78,knights:80,pawns:83},players:["Mitrović ★4.3","Tadić ★4.2","Lukić ★3.9","Milenković ★4.1"]},
  "Denmark":     {xgOff:1.6,xgDef:1.0,style:"Solid Structure",  color:"#c60c30",pieces:{king:84,queen:80,rooks:82,bishops:81,knights:83,pawns:82},players:["Eriksen ★4.4","Hojlund ★4.3","Christensen ★4.2","Schmeichel ★4.1"]},
  "South Korea": {xgOff:1.4,xgDef:1.1,style:"Wing Speed",       color:"#c60c30",pieces:{king:80,queen:81,rooks:82,bishops:79,knights:82,pawns:84},players:["Son ★4.7","Lee Jae-sung ★4.1","Kim Min-jae ★4.4","Hwang ★4.2"]},
  "Australia":   {xgOff:1.3,xgDef:1.2,style:"Direct Play",      color:"#00843d",pieces:{king:80,queen:78,rooks:79,bishops:77,knights:79,pawns:82},players:["Leckie ★4.0","Duke ★3.9","Irvine ★3.8","Ryan ★4.0"]},
  "Switzerland": {xgOff:1.5,xgDef:1.0,style:"Organised Block",  color:"#ff0000",pieces:{king:83,queen:79,rooks:80,bishops:81,knights:81,pawns:82},players:["Shaqiri ★4.1","Embolo ★4.0","Xhaka ★4.3","Sommer ★4.2"]},
  "Poland":      {xgOff:1.4,xgDef:1.2,style:"Counter-Attack",   color:"#dc143c",pieces:{king:80,queen:82,rooks:79,bishops:78,knights:79,pawns:81},players:["Lewandowski ★4.5","Zieliński ★4.1","Szymański ★3.9","Szczęsny ★4.2"]},
  "Senegal":     {xgOff:1.5,xgDef:1.1,style:"Athletic Press",   color:"#00853f",pieces:{king:81,queen:82,rooks:81,bishops:78,knights:80,pawns:82},players:["Mané ★4.4","Gueye ★4.1","Diatta ★3.9","Koulibaly ★4.3"]},
  "Ecuador":     {xgOff:1.4,xgDef:1.2,style:"Press+Counter",    color:"#ffd100",pieces:{king:78,queen:79,rooks:78,bishops:77,knights:78,pawns:80},players:["V.Caicedo ★4.2","Plata ★3.9","Preciado ★3.8","Hincapié ★4.0"]},
  "Nigeria":     {xgOff:1.4,xgDef:1.2,style:"Express Football", color:"#008751",pieces:{king:79,queen:81,rooks:80,bishops:77,knights:80,pawns:81},players:["Osimhen ★4.5","Lookman ★4.2","Iwobi ★3.9","Ekwah ★3.8"]},
  "Iran":        {xgOff:1.1,xgDef:1.3,style:"Low Block",        color:"#239f40",pieces:{king:79,queen:76,rooks:77,bishops:75,knights:77,pawns:79},players:["Taremi ★4.1","Jahanbakhsh ★3.9","Pouraliganji ★3.8","Beiranvand ★3.9"]},
  "Saudi Arabia":{xgOff:1.2,xgDef:1.3,style:"Counter-Attack",   color:"#006c35",pieces:{king:79,queen:77,rooks:77,bishops:76,knights:77,pawns:79},players:["Al-Dawsari ★4.0","Al-Shehri ★3.9","Al-Malki ★3.7","Al-Owais ★4.0"]},
  "Cameroon":    {xgOff:1.3,xgDef:1.2,style:"Physical Press",   color:"#007a5e",pieces:{king:79,queen:78,rooks:78,bishops:76,knights:79,pawns:80},players:["Aboubakar ★4.1","Mbeumo ★4.2","Anguissa ★4.2","Onana ★4.1"]},
  "Chile":       {xgOff:1.4,xgDef:1.2,style:"Gegenpressing",    color:"#d52b1e",pieces:{king:79,queen:79,rooks:78,bishops:79,knights:79,pawns:81},players:["Alexis ★4.1","Vidal ★3.8","Medel ★3.8","Bravo ★3.9"]},
  "Ghana":       {xgOff:1.3,xgDef:1.2,style:"Energetic Press",  color:"#006b3f",pieces:{king:78,queen:79,rooks:78,bishops:76,knights:78,pawns:80},players:["Kudus ★4.3","J.Ayew ★3.9","Partey ★4.1","Amartey ★3.8"]},
  "Ivory Coast": {xgOff:1.4,xgDef:1.2,style:"Counter-Press",    color:"#f77f00",pieces:{king:79,queen:80,rooks:79,bishops:77,knights:79,pawns:81},players:["Haller ★4.0","Zaha ★4.1","Kessié ★4.2","Diallo ★3.9"]},
  "Tunisia":     {xgOff:1.1,xgDef:1.2,style:"Compact Block",    color:"#e70013",pieces:{king:79,queen:76,rooks:77,bishops:75,knights:76,pawns:79},players:["Msakni ★3.9","Khazri ★3.8","Ben Romdhane ★3.8","Dahmen ★3.9"]},
  "Qatar":       {xgOff:1.1,xgDef:1.3,style:"High Press",       color:"#8d1b3d",pieces:{king:78,queen:76,rooks:76,bishops:75,knights:76,pawns:78},players:["Afif ★4.0","Boudiaf ★3.8","Al-Rawi ★3.7","Al-Sheeb ★3.8"]},
  "Costa Rica":  {xgOff:1.1,xgDef:1.2,style:"Defensive Block",  color:"#002b7f",pieces:{king:79,queen:75,rooks:76,bishops:74,knights:75,pawns:78},players:["Campbell ★3.9","Ruiz ★3.8","Tejeda ★3.7","Navas ★4.2"]},
  "Panama":      {xgOff:1.1,xgDef:1.2,style:"Compact Defence",  color:"#d90000",pieces:{king:77,queen:74,rooks:75,bishops:73,knights:74,pawns:77},players:["Davis ★3.9","Fajardo ★3.7","Murillo ★3.8","Mosquera ★3.7"]},
  "New Zealand": {xgOff:1.0,xgDef:1.3,style:"Direct Play",      color:"#000000",pieces:{king:76,queen:73,rooks:74,bishops:72,knights:73,pawns:76},players:["Wood ★3.8","Boxall ★3.7","Woud ★3.7","Garbett ★3.6"]},
  "South Africa":{xgOff:1.2,xgDef:1.2,style:"Counter",          color:"#007a4d",pieces:{king:78,queen:76,rooks:77,bishops:75,knights:76,pawns:78},players:["Tau ★4.0","Zwane ★3.9","Mothobi ★3.8","Williams ★3.8"]},
  "Algeria":     {xgOff:1.3,xgDef:1.2,style:"Counter-Attack",   color:"#006233",pieces:{king:79,queen:78,rooks:77,bishops:76,knights:77,pawns:79},players:["Mahrez ★4.2","Bennacer ★4.1","Slimani ★3.8","M'Bolhi ★3.8"]},
  "Indonesia":   {xgOff:0.9,xgDef:1.4,style:"Defensive",        color:"#ce1126",pieces:{king:73,queen:70,rooks:71,bishops:69,knights:70,pawns:73},players:["Struijk ★3.5","Rashford (INA) ★3.4","Ivar R. ★3.4","Maarten P. ★3.3"]},
  "Egypt":       {xgOff:1.2,xgDef:1.2,style:"Counter",          color:"#c8102e",pieces:{king:79,queen:78,rooks:77,bishops:76,knights:77,pawns:79},players:["Salah ★4.9","Elneny ★3.9","El-Shahat ★3.8","El-Hadary ★3.7"]},
  "Sweden":      {xgOff:1.4,xgDef:1.1,style:"Organised Block",  color:"#006aa7",pieces:{king:82,queen:79,rooks:80,bishops:79,knights:80,pawns:81},players:["Isak ★4.4","Kulusevski ★4.3","Ekdal ★4.0","Olsen ★4.0"]},
  "Peru":        {xgOff:1.2,xgDef:1.2,style:"Pass & Move",      color:"#d91023",pieces:{king:78,queen:76,rooks:77,bishops:76,knights:77,pawns:79},players:["Lapadula ★3.9","Cueva ★3.8","Tapia ★3.9","Gallese ★3.9"]},
  "Czechia":     {xgOff:1.3,xgDef:1.1,style:"Organised Press",  color:"#d7141a",pieces:{king:80,queen:78,rooks:79,bishops:78,knights:79,pawns:80},players:["Schick ★4.2","Soucek ★4.1","Kral ★3.9","Vaclik ★3.9"]},
  "Turkey":      {xgOff:1.5,xgDef:1.1,style:"Energetic Press",  color:"#e30a17",pieces:{king:81,queen:80,rooks:79,bishops:79,knights:80,pawns:82},players:["Calhanoglu ★4.4","Yilmaz ★4.0","Demiral ★4.1","Cakir ★3.9"]},
  "Zambia":      {xgOff:1.0,xgDef:1.3,style:"Physical Block",   color:"#198a00",pieces:{king:74,queen:71,rooks:72,bishops:70,knights:71,pawns:74},players:["Daka ★4.2","Musonda ★3.7","Sakala ★3.6","Mweene ★3.6"]},
};

const CONF = {
  "Mexico":"CONCACAF","South Africa":"CAF","Poland":"UEFA","Saudi Arabia":"AFC",
  "United States":"CONCACAF","Panama":"CONCACAF","Algeria":"CAF","New Zealand":"OFC",
  "Canada":"CONCACAF","Morocco":"CAF","Croatia":"UEFA","Belgium":"UEFA",
  "Brazil":"CONMEBOL","Japan":"AFC","Switzerland":"UEFA","Cameroon":"CAF",
  "Argentina":"CONMEBOL","Australia":"AFC","Serbia":"UEFA","Nigeria":"CAF",
  "France":"UEFA","England":"UEFA","Senegal":"CAF","Ecuador":"CONMEBOL",
  "Spain":"UEFA","Germany":"UEFA","Uruguay":"CONMEBOL","South Korea":"AFC",
  "Portugal":"UEFA","Netherlands":"UEFA","Colombia":"CONMEBOL","Iran":"AFC",
  "Italy":"UEFA","Chile":"CONMEBOL","Ivory Coast":"CAF","Tunisia":"CAF",
  "Denmark":"UEFA","Egypt":"CAF","Indonesia":"AFC","Ghana":"CAF",
  "Qatar":"AFC","Sweden":"UEFA","Costa Rica":"CONCACAF",
  "Turkey":"UEFA","Peru":"CONMEBOL","Czechia":"UEFA","Zambia":"CAF",
  "Uruguay":"CONMEBOL","Colombia":"CONMEBOL",
};

const REF_BIAS = {
  "CONCACAF":{CONCACAF:0.04,CONMEBOL:0.01,UEFA:-0.02,CAF:0.00,AFC:0.00,OFC:0.00},
  "CONMEBOL":{CONMEBOL:0.04,CONCACAF:0.01,UEFA:-0.01,CAF:0.00,AFC:0.00,OFC:0.00},
  "UEFA":    {UEFA:0.04,CONMEBOL:-0.01,CONCACAF:-0.02,CAF:0.01,AFC:0.00,OFC:0.00},
  "CAF":     {CAF:0.04,UEFA:-0.01,CONMEBOL:0.00,CONCACAF:0.00,AFC:0.00,OFC:0.00},
  "AFC":     {AFC:0.04,UEFA:-0.01,CAF:0.00,CONMEBOL:0.00,CONCACAF:0.00,OFC:0.00},
};

const PI = {king:"♔",queen:"♕",rooks:"♖",bishops:"♗",knights:"♘",pawns:"♙"};
const PL = {king:"GK/CB",queen:"Striker",rooks:"Wingbacks",bishops:"Creative MF",knights:"Box-2-Box",pawns:"Press"};
const PC = {king:"#ef4444",queen:"#a855f7",rooks:"#3b82f6",bishops:"#22c55e",knights:"#f59e0b",pawns:"#6b7280"};

// ── ENGINE ────────────────────────────────────────────────────────────────────

function poisson(lambda, k) {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function weatherMod(w="") {
  if (/3[4-9]°|[4-9]\d°/.test(w)) return 0.93;
  if (/cool|rain/i.test(w)) return 0.97;
  return 1.0;
}

function calcMatch(homeTeam, awayTeam, refC="UEFA", weather="Normal", cap=70000) {
  const h = CHESS[homeTeam], a = CHESS[awayTeam];
  if (!h || !a) return null;
  const wm = weatherMod(weather);
  const capB = cap > 80000 ? 1.03 : 1.0;
  const hConf = CONF[homeTeam] || "UEFA";
  const aConf = CONF[awayTeam] || "UEFA";
  const rb = REF_BIAS[refC] || {};
  const hRef = rb[hConf] || 0;
  const aRef = rb[aConf] || 0;
  const pw = (p) => (p.king*0.20+p.queen*0.20+p.rooks*0.15+p.bishops*0.15+p.knights*0.15+p.pawns*0.15)/100;
  const hStr = pw(h.pieces), aStr = pw(a.pieces);
  let hXg = h.xgOff*(1-a.xgDef/3)*wm*capB*(1+hRef)*(0.85+hStr*0.3);
  let aXg = a.xgOff*(1-h.xgDef/3)*wm*(1+aRef)*(0.85+aStr*0.3);
  hXg = Math.max(0.1, hXg); aXg = Math.max(0.1, aXg);
  const matrix = [];
  let winP=0, drawP=0, lossP=0;
  for (let i=0;i<=5;i++){matrix[i]=[];for(let j=0;j<=5;j++){
    const p=poisson(hXg,i)*poisson(aXg,j)*100;
    matrix[i][j]=p;
    if(i>j) winP+=p; else if(i===j) drawP+=p; else lossP+=p;
  }}
  return {winP,drawP,lossP,hXg,aXg,score:`${Math.round(hXg)}–${Math.round(aXg)}`,matrix};
}

// ── SHARED UI ────────────────────────────────────────────────────────────────

const S = {
  card:   {background:"#1e293b",borderRadius:8},
  sub:    {background:"#0f172a",borderRadius:6},
  muted:  {color:"#64748b"},
  accent: {color:"#94a3b8"},
};

function Skeleton({h=16,w="100%",r=4}) {
  return <div style={{height:h,width:w,borderRadius:r,background:"linear-gradient(90deg,#1e293b 25%,#243447 50%,#1e293b 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}} />;
}

function Radar({data, color="#3b82f6", size=100}) {
  const keys = Object.keys(data);
  const n = keys.length;
  const cx=size/2, cy=size/2, r=size*0.36;
  const pts = keys.map((_,i) => {
    const angle=(i/n)*2*Math.PI-Math.PI/2;
    const v=(data[keys[i]]-60)/40;
    return [cx+r*v*Math.cos(angle), cy+r*v*Math.sin(angle)];
  });
  const web = keys.map((_,i)=>{
    const angle=(i/n)*2*Math.PI-Math.PI/2;
    return [cx+r*Math.cos(angle), cy+r*Math.sin(angle)];
  });
  return (
    <svg width={size} height={size} style={{overflow:"visible",flexShrink:0}}>
      {[0.33,0.66,1].map(s=>(
        <polygon key={s} points={web.map(([x,y])=>`${cx+(x-cx)*s},${cy+(y-cy)*s}`).join(" ")} fill="none" stroke="#334155" strokeWidth="0.5"/>
      ))}
      {web.map(([x,y],i)=><line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth="0.5"/>)}
      <polygon points={pts.map(([x,y])=>`${x},${y}`).join(" ")} fill={color+"44"} stroke={color} strokeWidth="1.5"/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={color}/>)}
      {web.map(([x,y],i)=>{
        const lx=cx+(x-cx)*1.28, ly=cy+(y-cy)*1.22;
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#64748b">{PI[keys[i]]}</text>;
      })}
    </svg>
  );
}

function PieceBars({pieces, compact=false}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      {Object.entries(pieces).map(([k,v])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
          <span style={{width:compact?14:16,textAlign:"center",fontSize:compact?9:10,flexShrink:0}}>{PI[k]}</span>
          {!compact && <span style={{width:58,fontSize:9,...S.muted,whiteSpace:"nowrap",flexShrink:0}}>{PL[k]}</span>}
          <div style={{flex:1,height:5,background:"#0f172a",borderRadius:3,minWidth:0}}>
            <div style={{width:`${v}%`,height:"100%",background:PC[k],borderRadius:3}}/>
          </div>
          <span style={{fontSize:9,...S.accent,width:22,textAlign:"right",flexShrink:0}}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function OddsBar({win,draw,loss}) {
  const t=win+draw+loss;
  const wp=win/t*100, dp=draw/t*100, lp=loss/t*100;
  const seg = (pct,bg,label) => pct>4 && (
    <div style={{width:`${pct}%`,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",overflow:"hidden"}}>
      {pct>10 ? label : ""}
    </div>
  );
  return (
    <div style={{borderRadius:4,overflow:"hidden",display:"flex",height:18}}>
      {seg(wp,"#22c55e",`${wp.toFixed(0)}%`)}
      {seg(dp,"#f59e0b",`${dp.toFixed(0)}%`)}
      {seg(lp,"#ef4444",`${lp.toFixed(0)}%`)}
    </div>
  );
}

function Matrix({matrix,homeTeam,awayTeam,hXg,aXg}) {
  const max=Math.max(...matrix.flat());
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{fontSize:10,...S.accent,marginBottom:4}}>
        xG → {homeTeam}: <b style={{color:"#22c55e"}}>{hXg.toFixed(2)}</b> &nbsp;
        {awayTeam}: <b style={{color:"#ef4444"}}>{aXg.toFixed(2)}</b>
      </div>
      <table style={{borderCollapse:"collapse",fontSize:9}}>
        <thead>
          <tr>
            <td style={{padding:"2px 4px",...S.muted}}>H\A</td>
            {[0,1,2,3,4,5].map(j=><td key={j} style={{padding:"2px 4px",textAlign:"center",...S.accent}}>{j}</td>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row,i)=>(
            <tr key={i}>
              <td style={{padding:"2px 4px",...S.accent}}>{i}</td>
              {row.map((v,j)=>{
                const alpha=v/max;
                const bg=i>j?`rgba(34,197,94,${alpha*0.55})`:i===j?`rgba(245,158,11,${alpha*0.55})`:`rgba(239,68,68,${alpha*0.55})`;
                return <td key={j} style={{padding:"2px 4px",textAlign:"center",background:bg,borderRadius:2}}>{v.toFixed(1)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlagImg({url, name, size=28}) {
  if (url) return <img src={url} alt={name} style={{width:size,height:size*0.67,objectFit:"cover",borderRadius:2,flexShrink:0}} onError={e=>{e.target.style.display="none";}}/>;
  return null;
}

function TeamCard({name, flagUrl, isMobile}) {
  const t = CHESS[name];
  if (!t) return (
    <div style={{...S.card,padding:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {flagUrl && <FlagImg url={flagUrl} name={name} size={24}/>}
        <span style={{fontSize:14,fontWeight:600}}>{name}</span>
      </div>
      <div style={{fontSize:11,...S.muted,marginTop:6}}>No profile data available</div>
    </div>
  );
  return (
    <div style={{...S.card,padding:isMobile?10:12,borderLeft:`3px solid ${t.color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:6}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            {flagUrl && <FlagImg url={flagUrl} name={name} size={20}/>}
            <span style={{fontSize:isMobile?13:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
          </div>
          <div style={{fontSize:10,...S.muted}}>{t.style}</div>
          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,background:"#0f172a",borderRadius:3,padding:"1px 5px",color:"#22c55e"}}>Off {t.xgOff}</span>
            <span style={{fontSize:9,background:"#0f172a",borderRadius:3,padding:"1px 5px",color:"#ef4444"}}>Def {t.xgDef}</span>
          </div>
        </div>
        <Radar data={t.pieces} color={t.color} size={isMobile?68:84}/>
      </div>
      <PieceBars pieces={t.pieces} compact={isMobile}/>
      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
        {t.players.map(p=>(
          <span key={p} style={{...S.sub,padding:"2px 5px",fontSize:9,...S.accent,whiteSpace:"nowrap"}}>{p}</span>
        ))}
      </div>
    </div>
  );
}

// ── MATCH DETAIL OVERLAY ─────────────────────────────────────────────────────

function MatchDetail({game, teams, stadiums, onClose, isMobile}) {
  const home = teams[game.home_team_id];
  const away = teams[game.away_team_id];
  const stadium = stadiums[game.stadium_id];
  const homeName = home?.name_en || game.home_team_label || "TBD";
  const awayName = away?.name_en || game.away_team_label || "TBD";
  const cap = stadium?.capacity || 70000;
  const finished = game.finished === "TRUE";

  const res = calcMatch(homeName, awayName, "UEFA", "Normal", cap);

  const dateStr = game.local_date ? game.local_date.replace(/(\d+)\/(\d+)\/(\d+) (.+)/,"$1/$2 $4") : "";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"8px":"20px"}}
      onClick={onClose}>
      <div style={{background:"#0f172a",borderRadius:12,padding:isMobile?12:20,maxWidth:680,width:"100%",maxHeight:"92vh",overflowY:"auto",border:"1px solid #1e293b"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,...S.accent}}>
            {game.type?.toUpperCase()} · Group {game.group} · {dateStr}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",...S.muted,cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>
        </div>

        {/* Score row */}
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",marginBottom:16,gap:8}}>
          <div style={{textAlign:"center",flex:1,minWidth:0}}>
            {home?.flag && <FlagImg url={home.flag} name={homeName} size={isMobile?28:40}/>}
            <div style={{fontSize:isMobile?12:14,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeName}</div>
            {home?.fifa_code && <div style={{fontSize:10,...S.muted}}>{home.fifa_code}</div>}
          </div>
          <div style={{textAlign:"center",flexShrink:0}}>
            {finished ? (
              <div style={{fontSize:isMobile?28:38,fontWeight:900,color:"#f8fafc",letterSpacing:4}}>
                {game.home_score} – {game.away_score}
              </div>
            ) : (
              <div>
                {res && <div style={{fontSize:isMobile?24:32,fontWeight:900,color:"#f8fafc",letterSpacing:4}}>{res.score}</div>}
                <div style={{fontSize:9,color:"#3b82f6",marginTop:2}}>xG prediction</div>
              </div>
            )}
          </div>
          <div style={{textAlign:"center",flex:1,minWidth:0}}>
            {away?.flag && <FlagImg url={away.flag} name={awayName} size={isMobile?28:40}/>}
            <div style={{fontSize:isMobile?12:14,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{awayName}</div>
            {away?.fifa_code && <div style={{fontSize:10,...S.muted}}>{away.fifa_code}</div>}
          </div>
        </div>

        {/* Status badge */}
        {finished && (
          <div style={{textAlign:"center",marginBottom:12}}>
            <span style={{background:"#22c55e22",color:"#22c55e",borderRadius:12,padding:"3px 10px",fontSize:11,fontWeight:600}}>Final</span>
          </div>
        )}

        {/* Odds + matrix (only if chess data available) */}
        {res && !finished && (
          <>
            <div style={{marginBottom:10}}>
              <OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,...S.muted,marginTop:3}}>
                <span>Home {res.winP.toFixed(0)}%</span>
                <span>Draw {res.drawP.toFixed(0)}%</span>
                <span>Away {res.lossP.toFixed(0)}%</span>
              </div>
            </div>
            <div style={{...S.card,padding:10,marginBottom:12}}>
              <Matrix matrix={res.matrix} homeTeam={homeName} awayTeam={awayName} hXg={res.hXg} aXg={res.aXg}/>
            </div>
          </>
        )}

        {/* Venue info */}
        {stadium && (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,marginBottom:12}}>
            {[
              ["🏟",stadium.fifa_name || stadium.name_en],
              ["📍",`${stadium.city_en}, ${stadium.country_en}`],
              ["👥",`${(stadium.capacity/1000).toFixed(0)}k capacity`],
              ["🗓",game.local_date],
            ].map(([icon,val],i)=>(
              <div key={i} style={{...S.card,padding:"6px 10px",fontSize:11,...S.accent,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {icon} {val}
              </div>
            ))}
          </div>
        )}

        {/* Team profiles */}
        {(CHESS[homeName] || CHESS[awayName]) && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <TeamCard name={homeName} flagUrl={home?.flag} isMobile={true}/>
            <TeamCard name={awayName} flagUrl={away?.flag} isMobile={true}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────

function FixturesTab({games, teams, stadiums, loading, isMobile}) {
  const [sel, setSel] = useState(null);
  const [stageFilter, setStageFilter] = useState("group");
  const [grpFilter, setGrpFilter] = useState("ALL");

  const stages = [{id:"group",label:"Group"},{id:"r32",label:"R32"},{id:"r16",label:"R16"},{id:"qf",label:"QF"},{id:"sf",label:"SF"},{id:"third",label:"3rd"},{id:"final",label:"Final"}];
  const groups = ["ALL","A","B","C","D","E","F","G","H","I","J","K","L"];

  const filtered = games.filter(g => {
    if (g.type !== stageFilter) return false;
    if (stageFilter === "group" && grpFilter !== "ALL" && g.group !== grpFilter) return false;
    return true;
  });

  return (
    <div>
      {sel && <MatchDetail game={sel} teams={teams} stadiums={stadiums} onClose={()=>setSel(null)} isMobile={isMobile}/>}

      {/* Stage selector */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
        {stages.map(s=>(
          <button key={s.id} onClick={()=>{setStageFilter(s.id);setGrpFilter("ALL");}}
            style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
              background:stageFilter===s.id?"#3b82f6":"#1e293b",color:stageFilter===s.id?"#fff":"#94a3b8"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Group sub-filter */}
      {stageFilter==="group" && (
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:10}}>
          {groups.map(g=>(
            <button key={g} onClick={()=>setGrpFilter(g)}
              style={{padding:"3px 8px",borderRadius:5,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,
                background:grpFilter===g?"#1d4ed8":"#0f172a",color:grpFilter===g?"#fff":"#64748b"}}>
              {g}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[...Array(6)].map((_,i)=><Skeleton key={i} h={72} r={8}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:40,...S.muted}}>No matches found</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtered.map(g=>{
            const home = teams[g.home_team_id];
            const away = teams[g.away_team_id];
            const homeName = home?.name_en || g.home_team_label || "TBD";
            const awayName = away?.name_en || g.away_team_label || "TBD";
            const finished = g.finished === "TRUE";
            const res = !finished ? calcMatch(homeName, awayName, "UEFA", "Normal", stadiums[g.stadium_id]?.capacity || 70000) : null;
            const dateStr = g.local_date ? g.local_date.replace(/(\d+)\/(\d+)\/(\d+) (.+)/,"$1/$2 $4") : "";

            return (
              <div key={g.id} onClick={()=>setSel(g)}
                style={{...S.card,padding:isMobile?"10px":"12px 14px",cursor:"pointer",transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#243447"}
                onMouseLeave={e=>e.currentTarget.style.background="#1e293b"}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:10,...S.muted}}>
                  <span>Grp {g.group} · {dateStr}</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:isMobile?110:200,fontSize:10}}>
                    {stadiums[g.stadium_id]?.city_en || ""}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:isMobile?8:10,minWidth:0}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,minWidth:0}}>
                    {home?.flag && <FlagImg url={home.flag} name={homeName} size={18}/>}
                    <span style={{fontSize:isMobile?12:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeName}</span>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:isMobile?48:56}}>
                    {finished ? (
                      <div style={{fontSize:isMobile?15:18,fontWeight:900,color:"#f8fafc"}}>{g.home_score}–{g.away_score}</div>
                    ) : (
                      <div>
                        {res && <div style={{fontSize:isMobile?14:16,fontWeight:900,color:"#475569"}}>{res.score}</div>}
                        <div style={{fontSize:8,color:"#3b82f6"}}>pred</div>
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-start",gap:6,minWidth:0}}>
                    <span style={{fontSize:isMobile?12:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{awayName}</span>
                    {away?.flag && <FlagImg url={away.flag} name={awayName} size={18}/>}
                  </div>
                </div>
                {res && !finished && (
                  <div style={{marginTop:5}}><OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/></div>
                )}
                {finished && (
                  <div style={{marginTop:5,textAlign:"center"}}>
                    <span style={{fontSize:9,color:"#22c55e",background:"#22c55e11",borderRadius:8,padding:"1px 6px"}}>Final</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SimulateTab({teams, stadiums, isMobile}) {
  const teamNames = Object.values(teams).map(t=>t.name_en).filter(n=>CHESS[n]).sort();
  const [home, setHome] = useState("Brazil");
  const [away, setAway] = useState("France");
  const [refC, setRefC] = useState("UEFA");
  const [weather, setWeather] = useState("Normal 22°C");
  const [stadiumId, setStadiumId] = useState("");

  const cap = stadiumId && stadiums[stadiumId] ? stadiums[stadiumId].capacity : 70000;
  const res = calcMatch(home, away, refC, weather, cap);

  const sel = {background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",borderRadius:6,padding:"6px 10px",fontSize:12,width:"100%"};
  const hData = Object.values(teams).find(t=>t.name_en===home);
  const aData = Object.values(teams).find(t=>t.name_en===away);

  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <label style={{fontSize:11,...S.muted}}>HOME TEAM
          <select value={home} onChange={e=>setHome(e.target.value)} style={{...sel,marginTop:4}}>
            {teamNames.map(t=><option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{fontSize:11,...S.muted}}>AWAY TEAM
          <select value={away} onChange={e=>setAway(e.target.value)} style={{...sel,marginTop:4}}>
            {teamNames.map(t=><option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{fontSize:11,...S.muted}}>REFEREE CONFEDERATION
          <select value={refC} onChange={e=>setRefC(e.target.value)} style={{...sel,marginTop:4}}>
            {["UEFA","CONMEBOL","CONCACAF","CAF","AFC"].map(c=><option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{fontSize:11,...S.muted}}>WEATHER
          <select value={weather} onChange={e=>setWeather(e.target.value)} style={{...sel,marginTop:4}}>
            {["Normal 22°C","Hot 34°C","Hot 36°C","Cool 17°C","Rain 15°C","Warm 26°C","Humid 30°C"].map(w=><option key={w}>{w}</option>)}
          </select>
        </label>
        <label style={{fontSize:11,...S.muted}}>STADIUM
          <select value={stadiumId} onChange={e=>setStadiumId(e.target.value)} style={{...sel,marginTop:4}}>
            <option value="">— default 70k —</option>
            {Object.values(stadiums).map(s=>(
              <option key={s.id} value={s.id}>{s.name_en} ({(s.capacity/1000).toFixed(0)}k)</option>
            ))}
          </select>
        </label>
      </div>

      {res && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{...S.card,padding:14,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",marginBottom:10}}>
              <div style={{minWidth:0}}>
                {hData?.flag && <FlagImg url={hData.flag} name={home} size={32}/>}
                <div style={{fontSize:13,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{home}</div>
              </div>
              <div style={{fontSize:isMobile?26:34,fontWeight:900,letterSpacing:4,color:"#f8fafc"}}>{res.score}</div>
              <div style={{minWidth:0}}>
                {aData?.flag && <FlagImg url={aData.flag} name={away} size={32}/>}
                <div style={{fontSize:13,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{away}</div>
              </div>
            </div>
            <OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,...S.muted,marginTop:3}}>
              <span>Win {res.winP.toFixed(0)}%</span>
              <span>Draw {res.drawP.toFixed(0)}%</span>
              <span>Win {res.lossP.toFixed(0)}%</span>
            </div>
          </div>
          <div style={{...S.card,padding:10}}>
            <Matrix matrix={res.matrix} homeTeam={home} awayTeam={away} hXg={res.hXg} aXg={res.aXg}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <TeamCard name={home} flagUrl={hData?.flag} isMobile={true}/>
            <TeamCard name={away} flagUrl={aData?.flag} isMobile={true}/>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupsTab({groups, teams, loading, isMobile}) {
  if (loading) {
    return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {[...Array(12)].map((_,i)=><Skeleton key={i} h={140} r={8}/>)}
    </div>;
  }

  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {groups.map(grp=>(
        <div key={grp.group} style={{...S.card,padding:isMobile?10:12}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:8,color:"#93c5fd"}}>Group {grp.group}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:isMobile?10:11}}>
            <thead>
              <tr style={{...S.muted}}>
                <td style={{paddingBottom:4,fontSize:9}}>Team</td>
                <td style={{textAlign:"center",fontSize:9}}>Pts</td>
                <td style={{textAlign:"center",fontSize:9}}>GF</td>
                <td style={{textAlign:"center",fontSize:9}}>GA</td>
              </tr>
            </thead>
            <tbody>
              {grp.teams.map((entry,i)=>{
                const team = teams[entry.team_id];
                const name = team?.name_en || entry.team_id;
                const chess = CHESS[name];
                return (
                  <tr key={entry.team_id} style={{borderTop:"1px solid #0f172a"}}>
                    <td style={{padding:"4px 0",display:"flex",alignItems:"center",gap:5,minWidth:0}}>
                      <span style={{fontSize:10,color:"#475569",width:12,flexShrink:0}}>{i+1}</span>
                      {team?.flag && <FlagImg url={team.flag} name={name} size={16}/>}
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:isMobile?9:10}}>{name}</span>
                    </td>
                    <td style={{textAlign:"center",fontWeight:700,color:"#f8fafc"}}>{entry.pts}</td>
                    <td style={{textAlign:"center",...S.accent}}>{entry.gf}</td>
                    <td style={{textAlign:"center",...S.accent}}>{entry.ga}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({teams, loading, isMobile}) {
  const [search, setSearch] = useState("");
  const list = Object.values(teams)
    .filter(t=>t.name_en.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>a.name_en.localeCompare(b.name_en));

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search teams..."
        style={{width:"100%",boxSizing:"border-box",background:"#1e293b",border:"1px solid #334155",
          borderRadius:6,padding:"8px 12px",color:"#e2e8f0",fontSize:13,marginBottom:12}}/>
      {loading ? (
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
          {[...Array(8)].map((_,i)=><Skeleton key={i} h={160} r={8}/>)}
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
          {list.map(t=>(
            <div key={t.id} style={{...S.card,padding:10,borderLeft:CHESS[t.name_en]?`3px solid ${CHESS[t.name_en].color}`:"3px solid #334155"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:CHESS[t.name_en]?8:0}}>
                {t.flag && <FlagImg url={t.flag} name={t.name_en} size={24}/>}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name_en}</div>
                  <div style={{fontSize:10,...S.muted}}>{t.fifa_code} · Group {t.groups}</div>
                </div>
              </div>
              {CHESS[t.name_en] && (
                <>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:10,...S.muted}}>{CHESS[t.name_en].style}</div>
                    <Radar data={CHESS[t.name_en].pieces} color={CHESS[t.name_en].color} size={60}/>
                  </div>
                  <PieceBars pieces={CHESS[t.name_en].pieces} compact={true}/>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StadiumsTab({stadiums, loading, isMobile}) {
  const list = Object.values(stadiums).sort((a,b)=>b.capacity-a.capacity);
  const maxCap = list[0]?.capacity || 1;

  if (loading) return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
      {[...Array(8)].map((_,i)=><Skeleton key={i} h={100} r={8}/>)}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {list.map(s=>(
        <div key={s.id} style={{...S.card,padding:isMobile?10:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name_en}</div>
              <div style={{fontSize:10,...S.muted}}>{s.city_en}, {s.country_en}</div>
              {s.fifa_name && s.fifa_name !== s.name_en && (
                <div style={{fontSize:9,color:"#3b82f6",marginTop:2}}>FIFA: {s.fifa_name}</div>
              )}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:15,fontWeight:800,color:"#f8fafc"}}>{(s.capacity/1000).toFixed(0)}k</div>
              <div style={{fontSize:9,...S.muted}}>capacity</div>
            </div>
          </div>
          <div style={{height:6,background:"#0f172a",borderRadius:3}}>
            <div style={{width:`${(s.capacity/maxCap)*100}%`,height:"100%",background:s.capacity>80000?"#a855f7":s.capacity>60000?"#3b82f6":"#22c55e",borderRadius:3}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendTab({isMobile}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{...S.card,padding:isMobile?12:16}}>
        <div style={{fontWeight:700,marginBottom:10,fontSize:14,color:"#93c5fd"}}>Position × Football Roles</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
          {Object.entries(PI).map(([k,icon])=>(
            <div key={k} style={{...S.sub,padding:10}}>
              <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:PC[k]}}>{PL[k]}</div>
              <div style={{fontSize:10,...S.muted,marginTop:2}}>
                {k==="king"?"Last line — distribution & positioning"
                :k==="queen"?"Goal threat — creativity & finishing"
                :k==="rooks"?"Width, crosses, overlapping runs"
                :k==="bishops"?"Diagonals, vision, through-balls"
                :k==="knights"?"Duels, link play, transitions"
                :"Pressing triggers, set-pieces"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...S.card,padding:isMobile?12:16}}>
        <div style={{fontWeight:700,marginBottom:10,fontSize:14,color:"#93c5fd"}}>Simulation Modifiers</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["🌡","Weather","Hot (34°C+) ×0.93 · Cool/Rain ×0.97 · Normal ×1.0"],
            ["🏟","Stadium Crowd",">80k grants home team ×1.03 xG boost"],
            ["⚖️","Referee Bias","±4% xG if referee shares confederation with a team"],
            ["♟","Piece Ratings","Weighted avg across 6 position roles scales base xG"],
            ["📐","Poisson Model","P(k) = e^−λ × λ^k / k! — 6×6 score probability matrix"],
            ["🌐","Live Data","Teams, fixtures, stadiums & standings via worldcup26.ir API"],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{title}</div>
                <div style={{fontSize:10,...S.muted}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

const TABS = [
  {id:"fixtures", label:"Fixtures", icon:"📅"},
  {id:"simulate", label:"Simulate", icon:"🎯"},
  {id:"groups",   label:"Groups",   icon:"🏆"},
  {id:"teams",    label:"Teams",    icon:"♟"},
  {id:"stadiums", label:"Venues",   icon:"🏟"},
  {id:"legend",   label:"Guide",    icon:"📐"},
];

export default function App() {
  const [tab, setTab] = useState("fixtures");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // API state
  const [teams, setTeams] = useState({});       // keyed by id
  const [games, setGames] = useState([]);
  const [stadiums, setStadiums] = useState({}); // keyed by id
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState("connecting");

  useEffect(()=>{
    const handle=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",handle);
    return ()=>window.removeEventListener("resize",handle);
  },[]);

  useEffect(()=>{
    let cancelled=false;
    async function load() {
      try {
        setLoading(true); setError(null); setApiStatus("authenticating");
        const token = await apiToken();
        if (cancelled) return;
        setApiStatus("loading");

        const [teamsArr, gamesArr, stadiumsArr, groupsArr] = await Promise.all([
          apiFetch("/get/teams", token),
          apiFetch("/get/games", token),
          apiFetch("/get/stadiums", token),
          apiFetch("/get/groups", token),
        ]);
        if (cancelled) return;

        // index by id
        const tMap={}, sMap={};
        (teamsArr||[]).forEach(t=>{ tMap[t.id]=t; });
        (stadiumsArr||[]).forEach(s=>{ sMap[s.id]=s; });

        setTeams(tMap);
        setGames((gamesArr||[]).filter(g=>g.type==="group"||g.type==="r32"||g.type==="r16"||g.type==="qf"||g.type==="sf"||g.type==="third"||g.type==="final"));
        setStadiums(sMap);
        setGroups(groupsArr||[]);
        setApiStatus("live");
      } catch(e) {
        if (!cancelled) { setError(e.message); setApiStatus("error"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return ()=>{ cancelled=true; };
  },[]);

  const statusColor = {live:"#22c55e",error:"#ef4444",connecting:"#f59e0b",authenticating:"#f59e0b",loading:"#3b82f6"}[apiStatus]||"#64748b";
  const statusLabel = {live:"Live",error:"Offline",connecting:"…",authenticating:"Auth",loading:"Loading"}[apiStatus]||apiStatus;

  return (
    <div style={{minHeight:"100dvh",background:"#0f172a",color:"#e2e8f0",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{background:"#020617",borderBottom:"1px solid #1e293b",padding:isMobile?"10px 14px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <span style={{fontSize:isMobile?20:22,flexShrink:0}}>♚</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:isMobile?14:17,fontWeight:800,letterSpacing:-0.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>WC 2026 Analytics</div>
            <div style={{fontSize:9,...S.muted,whiteSpace:"nowrap"}}>FIFA World Cup · Poisson Prediction Engine</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:statusColor,display:"inline-block",flexShrink:0}}/>
          <span style={{fontSize:10,color:statusColor,fontWeight:600}}>{statusLabel}</span>
          {error && (
            <button onClick={()=>{localStorage.removeItem(LS_TOKEN);window.location.reload();}}
              style={{background:"none",border:"1px solid #334155",borderRadius:4,padding:"2px 6px",fontSize:9,color:"#94a3b8",cursor:"pointer",marginLeft:4}}>
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{background:"#450a0a",borderBottom:"1px solid #7f1d1d",padding:"8px 16px",fontSize:12,color:"#fca5a5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>⚠ API error: {error}. Using static data fallback.</span>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{background:"#020617",borderBottom:"1px solid #1e293b",display:"flex",overflowX:"auto",flexShrink:0,scrollbarWidth:"none"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:isMobile?"9px 11px":"9px 14px",background:"none",border:"none",cursor:"pointer",
              color:tab===t.id?"#f8fafc":"#64748b",
              borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",
              fontSize:isMobile?10:12,fontWeight:600,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"10px":"16px",paddingBottom:`calc(20px + env(safe-area-inset-bottom,0px))`}}>
        {tab==="fixtures" && <FixturesTab games={games} teams={teams} stadiums={stadiums} loading={loading} isMobile={isMobile}/>}
        {tab==="simulate" && <SimulateTab teams={teams} stadiums={stadiums} isMobile={isMobile}/>}
        {tab==="groups"   && <GroupsTab groups={groups} teams={teams} loading={loading} isMobile={isMobile}/>}
        {tab==="teams"    && <TeamsTab teams={teams} loading={loading} isMobile={isMobile}/>}
        {tab==="stadiums" && <StadiumsTab stadiums={stadiums} loading={loading} isMobile={isMobile}/>}
        {tab==="legend"   && <LegendTab isMobile={isMobile}/>}
      </div>
    </div>
  );
}
