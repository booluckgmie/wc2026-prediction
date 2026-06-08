import { useState, useEffect } from "react";

// ── API ───────────────────────────────────────────────────────────────────────
// Swagger confirms all GET endpoints require Bearer JWT.
// Auth POST endpoints are public (no lock icon in Swagger UI).

const BASE  = "https://worldcup26.ir";
const PROXY = "https://corsproxy.io/?url=";
const LS_JWT  = "wc26_jwt";
const LS_CRED = "wc26_cred";

// POST helper: try direct, fall back to CORS proxy
async function postJSON(path, body) {
  const url = BASE + path;
  const opts = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  let r;
  try {
    r = await fetch(url, opts);
  } catch (_) {
    // Network/CORS blocked — try proxy (corsproxy.io supports POST)
    r = await fetch(PROXY + encodeURIComponent(url), opts);
  }
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (r.ok || r.status === 400) return data; // 400 = "user already exists", still useful
  throw new Error(data?.message || `HTTP ${r.status}`);
}

// GET helper: try direct (with token), fall back to CORS proxy
async function getJSON(path, token) {
  const url = BASE + path;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let r;
  try {
    r = await fetch(url, { headers });
  } catch (_) {
    r = await fetch(PROXY + encodeURIComponent(url), { headers });
  }
  if (r.status === 401) { localStorage.removeItem(LS_JWT); throw new Error("EXPIRED"); }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Get (or create) a valid JWT — cached up to 80 days
async function getToken() {
  const cached = localStorage.getItem(LS_JWT);
  if (cached) {
    try {
      const { exp } = JSON.parse(atob(cached.split(".")[1]));
      if (exp * 1000 > Date.now() + 60_000) return cached;
    } catch (_) {}
    localStorage.removeItem(LS_JWT);
  }

  // Create or reuse credentials
  let cred = null;
  try { cred = JSON.parse(localStorage.getItem(LS_CRED)); } catch (_) {}
  if (!cred) {
    const id = Math.random().toString(36).slice(2, 10);
    cred = { name: "WC26 Dash", email: `wc26_${id}@predict.app`, password: `P_${id}_26!` };
    localStorage.setItem(LS_CRED, JSON.stringify(cred));
  }

  // Register (may 400 "already exists" — that's fine)
  await postJSON("/auth/register", cred).catch(() => {});

  // Authenticate
  const data = await postJSON("/auth/authenticate", { email: cred.email, password: cred.password });
  if (!data?.token) throw new Error("Auth failed — no token returned");
  localStorage.setItem(LS_JWT, data.token);
  return data.token;
}

async function loadAllData() {
  const token = await getToken();
  const [ta, ga, sa, grpa] = await Promise.all([
    getJSON("/get/teams",   token),
    getJSON("/get/games",   token),
    getJSON("/get/stadiums",token),
    getJSON("/get/groups",  token),
  ]);
  return { ta, ga, sa, grpa };
}

// ── STATIC PROFILE / xG DATA ─────────────────────────────────────────────────
// Real groups per README:
// A: Mexico, South Africa, South Korea, Czech Republic
// B: Canada, Switzerland, Qatar, Bosnia and Herzegovina
// C: Brazil, Morocco, Haiti, Scotland
// D: USA, Paraguay, Australia, Turkiye
// E: Germany, Curaçao, Ivory Coast, Ecuador
// F: Netherlands, Japan, Tunisia, Sweden
// G: Belgium, Egypt, Iran, New Zealand
// H: Spain, Cape Verde, Saudi Arabia, Uruguay
// I: France, Senegal, Norway, Iraq
// J: Argentina, Algeria, Austria, Jordan
// K: Portugal, Colombia, Uzbekistan, Congo DR
// L: England, Croatia, Ghana, Panama

const PROFILE = {
  // Top contenders
  "Brazil":             {xgOff:2.4,xgDef:0.7,style:"Total Football",   color:"#009c3b",pieces:{king:88,queen:91,rooks:86,bishops:89,knights:84,pawns:82},players:["Vinicius Jr ★5.0","Endrick ★4.5","Rodrygo ★4.2","Casemiro ★4.3"]},
  "France":             {xgOff:2.2,xgDef:0.8,style:"Counter-Attack",   color:"#002395",pieces:{king:87,queen:93,rooks:88,bishops:85,knights:86,pawns:84},players:["Mbappé ★5.0","Griezmann ★4.6","Camavinga ★4.3","Saliba ★4.4"]},
  "Argentina":          {xgOff:2.0,xgDef:0.9,style:"Tiki-Counter",     color:"#74acdf",pieces:{king:85,queen:94,rooks:84,bishops:86,knights:83,pawns:81},players:["Messi ★5.0","J.Álvarez ★4.5","Mac Allister ★4.3","Otamendi ★4.2"]},
  "England":            {xgOff:2.1,xgDef:0.9,style:"High Press",       color:"#cf111b",pieces:{king:86,queen:88,rooks:87,bishops:84,knights:87,pawns:89},players:["Bellingham ★4.8","Saka ★4.6","Kane ★4.7","Alexander-Arnold ★4.4"]},
  "Spain":              {xgOff:2.0,xgDef:0.8,style:"Possession",       color:"#c60b1e",pieces:{king:85,queen:87,rooks:86,bishops:91,knights:88,pawns:87},players:["Pedri ★4.7","Yamal ★4.6","Morata ★4.3","Rodri ★4.8"]},
  "Germany":            {xgOff:1.9,xgDef:1.0,style:"Pressing",         color:"#555555",pieces:{king:84,queen:86,rooks:85,bishops:84,knights:87,pawns:88},players:["Musiala ★4.7","Wirtz ★4.6","Havertz ★4.4","Rüdiger ★4.3"]},
  "Portugal":           {xgOff:2.1,xgDef:1.0,style:"Wing Dominance",   color:"#006600",pieces:{king:84,queen:90,rooks:88,bishops:83,knights:84,pawns:82},players:["Ronaldo ★4.5","B.Fernandes ★4.6","Leão ★4.4","Dias ★4.5"]},
  "Netherlands":        {xgOff:1.9,xgDef:1.0,style:"Total Football",   color:"#ff6600",pieces:{king:85,queen:87,rooks:86,bishops:85,knights:86,pawns:83},players:["Gakpo ★4.5","De Jong ★4.4","Dumfries ★4.2","Van Dijk ★4.6"]},
  "Belgium":            {xgOff:1.8,xgDef:1.1,style:"Individual Quality",color:"#1a1a1a",pieces:{king:83,queen:85,rooks:82,bishops:83,knights:84,pawns:80},players:["De Bruyne ★4.7","Lukaku ★4.4","Tielemans ★4.2","Courtois ★4.5"]},
  "Mexico":             {xgOff:1.5,xgDef:1.2,style:"Counter + Block",  color:"#006847",pieces:{king:83,queen:80,rooks:82,bishops:79,knights:81,pawns:85},players:["Lozano ★4.2","Guardado ★3.9","Ochoa ★4.3","Herrera ★4.0"]},
  "United States":      {xgOff:1.6,xgDef:1.1,style:"Athletic Press",   color:"#b22234",pieces:{king:82,queen:83,rooks:84,bishops:79,knights:85,pawns:86},players:["Pulisic ★4.4","McKennie ★4.1","Musah ★4.2","Turner ★4.0"]},
  "Canada":             {xgOff:1.5,xgDef:1.2,style:"High Line",        color:"#ff0000",pieces:{king:80,queen:82,rooks:81,bishops:78,knights:82,pawns:83},players:["Davies ★4.6","David ★4.4","Buchanan ★4.1","Borjan ★3.9"]},
  "Japan":              {xgOff:1.5,xgDef:1.1,style:"Gegenpress",       color:"#003087",pieces:{king:82,queen:80,rooks:81,bishops:82,knights:83,pawns:84},players:["Doan ★4.2","Kubo ★4.4","Mitoma ★4.3","Endo ★4.2"]},
  "Morocco":            {xgOff:1.4,xgDef:1.0,style:"Counter-Press",    color:"#c1272d",pieces:{king:84,queen:79,rooks:83,bishops:78,knights:82,pawns:84},players:["Ziyech ★4.3","En-Nesyri ★4.2","Hakimi ★4.5","Aguerd ★4.1"]},
  "Uruguay":            {xgOff:1.5,xgDef:1.0,style:"Garra Charrúa",    color:"#5aaae7",pieces:{king:83,queen:82,rooks:81,bishops:79,knights:82,pawns:83},players:["Núñez ★4.4","Valverde ★4.5","Bentancur ★4.2","Araújo ★4.4"]},
  "Colombia":           {xgOff:1.7,xgDef:1.1,style:"Transition",       color:"#ffd700",pieces:{king:81,queen:84,rooks:82,bishops:83,knights:82,pawns:81},players:["L.Díaz ★4.5","J.Cuadrado ★4.1","R.Uribe ★4.0","Cuesta ★4.1"]},
  "Croatia":            {xgOff:1.6,xgDef:1.1,style:"Midfield Control", color:"#cc0000",pieces:{king:82,queen:80,rooks:81,bishops:86,knights:85,pawns:80},players:["Modrić ★4.5","Kovačić ★4.3","Kramarić ★4.2","Gvardiol ★4.4"]},
  "Senegal":            {xgOff:1.5,xgDef:1.1,style:"Athletic Press",   color:"#00853f",pieces:{king:81,queen:82,rooks:81,bishops:78,knights:80,pawns:82},players:["Mané ★4.4","Gueye ★4.1","Diatta ★3.9","Koulibaly ★4.3"]},
  "Ecuador":            {xgOff:1.4,xgDef:1.2,style:"Press + Counter",  color:"#ffd100",pieces:{king:78,queen:79,rooks:78,bishops:77,knights:78,pawns:80},players:["V.Caicedo ★4.2","Plata ★3.9","Preciado ★3.8","Hincapié ★4.0"]},
  "Iran":               {xgOff:1.1,xgDef:1.3,style:"Low Block",        color:"#239f40",pieces:{king:79,queen:76,rooks:77,bishops:75,knights:77,pawns:79},players:["Taremi ★4.1","Jahanbakhsh ★3.9","Pouraliganji ★3.8","Beiranvand ★3.9"]},
  "Saudi Arabia":       {xgOff:1.2,xgDef:1.3,style:"Counter-Attack",   color:"#006c35",pieces:{king:79,queen:77,rooks:77,bishops:76,knights:77,pawns:79},players:["Al-Dawsari ★4.0","Al-Shehri ★3.9","Al-Malki ★3.7","Al-Owais ★4.0"]},
  "Ghana":              {xgOff:1.3,xgDef:1.2,style:"Energetic Press",  color:"#006b3f",pieces:{king:78,queen:79,rooks:78,bishops:76,knights:78,pawns:80},players:["Kudus ★4.3","J.Ayew ★3.9","Partey ★4.1","Amartey ★3.8"]},
  "Ivory Coast":        {xgOff:1.4,xgDef:1.2,style:"Counter-Press",    color:"#f77f00",pieces:{king:79,queen:80,rooks:79,bishops:77,knights:79,pawns:81},players:["Haller ★4.0","Zaha ★4.1","Kessié ★4.2","Diallo ★3.9"]},
  "Tunisia":            {xgOff:1.1,xgDef:1.2,style:"Compact Block",    color:"#e70013",pieces:{king:79,queen:76,rooks:77,bishops:75,knights:76,pawns:79},players:["Msakni ★3.9","Khazri ★3.8","Ben Romdhane ★3.8","Dahmen ★3.9"]},
  "Qatar":              {xgOff:1.1,xgDef:1.3,style:"High Press",       color:"#8d1b3d",pieces:{king:78,queen:76,rooks:76,bishops:75,knights:76,pawns:78},players:["Afif ★4.0","Boudiaf ★3.8","Al-Rawi ★3.7","Al-Sheeb ★3.8"]},
  "Panama":             {xgOff:1.1,xgDef:1.2,style:"Compact Defence",  color:"#d90000",pieces:{king:77,queen:74,rooks:75,bishops:73,knights:74,pawns:77},players:["Davis ★3.9","Fajardo ★3.7","Murillo ★3.8","Mosquera ★3.7"]},
  "New Zealand":        {xgOff:1.0,xgDef:1.3,style:"Direct Play",      color:"#333333",pieces:{king:76,queen:73,rooks:74,bishops:72,knights:73,pawns:76},players:["Wood ★3.8","Boxall ★3.7","Woud ★3.7","Garbett ★3.6"]},
  "South Africa":       {xgOff:1.2,xgDef:1.2,style:"Counter",          color:"#007a4d",pieces:{king:78,queen:76,rooks:77,bishops:75,knights:76,pawns:78},players:["Tau ★4.0","Zwane ★3.9","Mothobi ★3.8","Williams ★3.8"]},
  "Algeria":            {xgOff:1.3,xgDef:1.2,style:"Counter-Attack",   color:"#006233",pieces:{king:79,queen:78,rooks:77,bishops:76,knights:77,pawns:79},players:["Mahrez ★4.2","Bennacer ★4.1","Slimani ★3.8","M'Bolhi ★3.8"]},
  "Egypt":              {xgOff:1.2,xgDef:1.2,style:"Counter",          color:"#c8102e",pieces:{king:79,queen:78,rooks:77,bishops:76,knights:77,pawns:79},players:["Salah ★4.9","Elneny ★3.9","El-Shahat ★3.8","El-Hadary ★3.7"]},
  "Sweden":             {xgOff:1.4,xgDef:1.1,style:"Organised Block",  color:"#006aa7",pieces:{king:82,queen:79,rooks:80,bishops:79,knights:80,pawns:81},players:["Isak ★4.4","Kulusevski ★4.3","Ekdal ★4.0","Olsen ★4.0"]},
  "South Korea":        {xgOff:1.4,xgDef:1.1,style:"Wing Speed",       color:"#c60c30",pieces:{king:80,queen:81,rooks:82,bishops:79,knights:82,pawns:84},players:["Son ★4.7","Lee Jae-sung ★4.1","Kim Min-jae ★4.4","Hwang ★4.2"]},
  "Australia":          {xgOff:1.3,xgDef:1.2,style:"Direct Play",      color:"#00843d",pieces:{king:80,queen:78,rooks:79,bishops:77,knights:79,pawns:82},players:["Leckie ★4.0","Duke ★3.9","Irvine ★3.8","Ryan ★4.0"]},
  "Switzerland":        {xgOff:1.5,xgDef:1.0,style:"Organised Block",  color:"#ff0000",pieces:{king:83,queen:79,rooks:80,bishops:81,knights:81,pawns:82},players:["Shaqiri ★4.1","Embolo ★4.0","Xhaka ★4.3","Sommer ★4.2"]},
  // New teams from README groups
  "Czech Republic":     {xgOff:1.3,xgDef:1.1,style:"Organised Press",  color:"#d7141a",pieces:{king:80,queen:78,rooks:79,bishops:78,knights:79,pawns:80},players:["Schick ★4.2","Soucek ★4.1","Kral ★3.9","Vaclik ★3.9"]},
  "Czechia":            {xgOff:1.3,xgDef:1.1,style:"Organised Press",  color:"#d7141a",pieces:{king:80,queen:78,rooks:79,bishops:78,knights:79,pawns:80},players:["Schick ★4.2","Soucek ★4.1","Kral ★3.9","Vaclik ★3.9"]},
  "Bosnia and Herzegovina":{xgOff:1.2,xgDef:1.2,style:"Counter-Attack",color:"#003da5",pieces:{king:78,queen:77,rooks:77,bishops:76,knights:77,pawns:79},players:["Džeko ★4.1","Pjanić ★4.0","Gojak ★3.8","Šehić ★3.7"]},
  "Scotland":           {xgOff:1.3,xgDef:1.1,style:"High Energy Press",color:"#003366",pieces:{king:79,queen:77,rooks:78,bishops:77,knights:79,pawns:81},players:["Robertson ★4.3","McGinn ★4.1","Adams ★3.9","Tierney ★4.0"]},
  "Haiti":              {xgOff:0.9,xgDef:1.4,style:"Defensive Block",  color:"#003087",pieces:{king:74,queen:71,rooks:72,bishops:70,knights:72,pawns:74},players:["Martino ★3.5","Angella ★3.4","Dorvil ★3.3","Joseph ★3.5"]},
  "Paraguay":           {xgOff:1.2,xgDef:1.2,style:"Physical Block",   color:"#d52b1e",pieces:{king:78,queen:76,rooks:77,bishops:75,knights:76,pawns:78},players:["Almirón ★4.2","Enciso ★4.0","Alonso ★3.8","Silva ★3.8"]},
  "Turkiye":            {xgOff:1.5,xgDef:1.1,style:"Energetic Press",  color:"#e30a17",pieces:{king:81,queen:80,rooks:79,bishops:79,knights:80,pawns:82},players:["Calhanoglu ★4.4","Yilmaz ★4.0","Demiral ★4.1","Güler ★4.2"]},
  "Turkey":             {xgOff:1.5,xgDef:1.1,style:"Energetic Press",  color:"#e30a17",pieces:{king:81,queen:80,rooks:79,bishops:79,knights:80,pawns:82},players:["Calhanoglu ★4.4","Yilmaz ★4.0","Demiral ★4.1","Güler ★4.2"]},
  "Curaçao":            {xgOff:1.0,xgDef:1.3,style:"Counter",          color:"#002b7f",pieces:{king:74,queen:72,rooks:73,bishops:71,knights:72,pawns:74},players:["Dos Santos ★3.8","Fer ★3.6","Martina ★3.5","Stekelenburg ★3.4"]},
  "Norway":             {xgOff:1.5,xgDef:1.1,style:"Counter-Attack",   color:"#ef2b2d",pieces:{king:81,queen:83,rooks:80,bishops:78,knights:80,pawns:81},players:["Haaland ★5.0","Ødegaard ★4.6","Ajer ★4.0","Nyland ★3.9"]},
  "Iraq":               {xgOff:1.0,xgDef:1.3,style:"Defensive Block",  color:"#007a3d",pieces:{king:75,queen:73,rooks:74,bishops:72,knights:73,pawns:75},players:["Ameen ★3.7","Al-Shammari ★3.6","Al-Haydos ★3.5","Basim ★3.5"]},
  "Austria":            {xgOff:1.4,xgDef:1.1,style:"High Press",       color:"#ed2939",pieces:{king:80,queen:79,rooks:78,bishops:79,knights:80,pawns:81},players:["Sabitzer ★4.2","Arnautović ★4.1","Baumgartner ★4.0","Alaba ★4.3"]},
  "Jordan":             {xgOff:0.9,xgDef:1.3,style:"Defensive Counter",color:"#007a3d",pieces:{king:74,queen:71,rooks:72,bishops:70,knights:71,pawns:73},players:["Al-Naimat ★3.6","Sharbini ★3.5","Bani Yaseen ★3.4","Abu Zema ★3.5"]},
  "Uzbekistan":         {xgOff:1.1,xgDef:1.2,style:"Organised Press",  color:"#1eb53a",pieces:{king:76,queen:74,rooks:75,bishops:73,knights:74,pawns:76},players:["Shomurodov ★3.9","Turgunboev ★3.7","Ergashev ★3.6","Nishonov ★3.6"]},
  "Congo DR":           {xgOff:1.1,xgDef:1.2,style:"Physical Press",   color:"#007fff",pieces:{king:75,queen:73,rooks:74,bishops:72,knights:73,pawns:75},players:["Mbemba ★3.8","Bope ★3.6","Kayembe ★3.6","Kasangu ★3.5"]},
  "Cape Verde":         {xgOff:1.1,xgDef:1.2,style:"Counter",          color:"#003893",pieces:{king:76,queen:74,rooks:74,bishops:73,knights:74,pawns:76},players:["Tavares ★3.9","Andrade ★3.7","Carvalho ★3.6","Mendes ★3.7"]},
};

const CONF = {
  "Mexico":"CONCACAF","South Africa":"CAF","South Korea":"AFC","Czech Republic":"UEFA","Czechia":"UEFA",
  "Canada":"CONCACAF","Switzerland":"UEFA","Qatar":"AFC","Bosnia and Herzegovina":"UEFA",
  "Brazil":"CONMEBOL","Morocco":"CAF","Haiti":"CONCACAF","Scotland":"UEFA",
  "United States":"CONCACAF","Paraguay":"CONMEBOL","Australia":"AFC","Turkiye":"UEFA","Turkey":"UEFA",
  "Germany":"UEFA","Curaçao":"CONCACAF","Ivory Coast":"CAF","Ecuador":"CONMEBOL",
  "Netherlands":"UEFA","Japan":"AFC","Tunisia":"CAF","Sweden":"UEFA",
  "Belgium":"UEFA","Egypt":"CAF","Iran":"AFC","New Zealand":"OFC",
  "Spain":"UEFA","Cape Verde":"CAF","Saudi Arabia":"AFC","Uruguay":"CONMEBOL",
  "France":"UEFA","Senegal":"CAF","Norway":"UEFA","Iraq":"AFC",
  "Argentina":"CONMEBOL","Algeria":"CAF","Austria":"UEFA","Jordan":"AFC",
  "Portugal":"UEFA","Colombia":"CONMEBOL","Uzbekistan":"AFC","Congo DR":"CAF",
  "England":"UEFA","Croatia":"UEFA","Ghana":"CAF","Panama":"CONCACAF",
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

function calcMatch(homeTeam, awayTeam, refC="UEFA", cap=70000) {
  const h = PROFILE[homeTeam], a = PROFILE[awayTeam];
  if (!h || !a) return null;
  const capB = cap > 80000 ? 1.03 : 1.0;
  const hConf = CONF[homeTeam] || "UEFA";
  const aConf = CONF[awayTeam] || "UEFA";
  const rb = REF_BIAS[refC] || {};
  const pw = p => (p.king*0.20+p.queen*0.20+p.rooks*0.15+p.bishops*0.15+p.knights*0.15+p.pawns*0.15)/100;
  let hXg = h.xgOff*(1-a.xgDef/3)*capB*(1+(rb[hConf]||0))*(0.85+pw(h.pieces)*0.3);
  let aXg = a.xgOff*(1-h.xgDef/3)*(1+(rb[aConf]||0))*(0.85+pw(a.pieces)*0.3);
  hXg = Math.max(0.1,hXg); aXg = Math.max(0.1,aXg);
  const matrix=[];let winP=0,drawP=0,lossP=0;
  for(let i=0;i<=5;i++){matrix[i]=[];for(let j=0;j<=5;j++){
    const p=poisson(hXg,i)*poisson(aXg,j)*100;
    matrix[i][j]=p;
    if(i>j)winP+=p;else if(i===j)drawP+=p;else lossP+=p;
  }}
  return {winP,drawP,lossP,hXg,aXg,score:`${Math.round(hXg)}–${Math.round(aXg)}`,matrix};
}

// ── SHARED UI ────────────────────────────────────────────────────────────────

const S = {
  card:  {background:"#1e293b",borderRadius:8},
  sub:   {background:"#0f172a",borderRadius:6},
  muted: {color:"#64748b"},
  dim:   {color:"#94a3b8"},
};

function Skeleton({h=16,r=4}) {
  return <div style={{height:h,borderRadius:r,background:"linear-gradient(90deg,#1e293b 25%,#243447 50%,#1e293b 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}} />;
}

function Radar({data,color="#3b82f6",size=100}) {
  const keys=Object.keys(data),n=keys.length;
  const cx=size/2,cy=size/2,r=size*0.36;
  const web=keys.map((_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];});
  const pts=keys.map((k,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2,v=(data[k]-60)/40;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
  return (
    <svg width={size} height={size} style={{overflow:"visible",flexShrink:0}}>
      {[.33,.66,1].map(s=><polygon key={s} points={web.map(([x,y])=>`${cx+(x-cx)*s},${cy+(y-cy)*s}`).join(" ")} fill="none" stroke="#334155" strokeWidth=".5"/>)}
      {web.map(([x,y],i)=><line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth=".5"/>)}
      <polygon points={pts.map(([x,y])=>`${x},${y}`).join(" ")} fill={color+"44"} stroke={color} strokeWidth="1.5"/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={color}/>)}
      {web.map(([x,y],i)=><text key={i} x={cx+(x-cx)*1.28} y={cy+(y-cy)*1.22} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#475569">{PI[keys[i]]}</text>)}
    </svg>
  );
}

function RatingBars({pieces,compact=false}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      {Object.entries(pieces).map(([k,v])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
          <span style={{width:compact?14:16,textAlign:"center",fontSize:compact?9:10,flexShrink:0}}>{PI[k]}</span>
          {!compact&&<span style={{width:60,fontSize:9,...S.muted,whiteSpace:"nowrap",flexShrink:0}}>{PL[k]}</span>}
          <div style={{flex:1,height:5,background:"#0f172a",borderRadius:3,minWidth:0}}>
            <div style={{width:`${v}%`,height:"100%",background:PC[k],borderRadius:3}}/>
          </div>
          <span style={{fontSize:9,...S.dim,width:22,textAlign:"right",flexShrink:0}}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function OddsBar({win,draw,loss}) {
  const t=win+draw+loss;
  const [wp,dp,lp]=[win/t*100,draw/t*100,loss/t*100];
  const seg=(pct,bg)=>pct>4&&<div style={{width:`${pct}%`,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",overflow:"hidden"}}>{pct>12?`${pct.toFixed(0)}%`:""}</div>;
  return <div style={{borderRadius:4,overflow:"hidden",display:"flex",height:18}}>{seg(wp,"#22c55e")}{seg(dp,"#f59e0b")}{seg(lp,"#ef4444")}</div>;
}

function ScoreMatrix({matrix,homeTeam,awayTeam,hXg,aXg}) {
  const max=Math.max(...matrix.flat());
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{fontSize:10,...S.dim,marginBottom:4}}>
        xG → {homeTeam.split(" ")[0]}: <b style={{color:"#22c55e"}}>{hXg.toFixed(2)}</b> &nbsp;
        {awayTeam.split(" ")[0]}: <b style={{color:"#ef4444"}}>{aXg.toFixed(2)}</b>
      </div>
      <table style={{borderCollapse:"collapse",fontSize:9}}>
        <thead><tr>
          <td style={{padding:"2px 4px",...S.muted}}>H\A</td>
          {[0,1,2,3,4,5].map(j=><td key={j} style={{padding:"2px 4px",textAlign:"center",...S.dim}}>{j}</td>)}
        </tr></thead>
        <tbody>{matrix.map((row,i)=>(
          <tr key={i}>
            <td style={{padding:"2px 4px",...S.dim}}>{i}</td>
            {row.map((v,j)=>{
              const alpha=v/max;
              const bg=i>j?`rgba(34,197,94,${alpha*.55})`:i===j?`rgba(245,158,11,${alpha*.55})`:`rgba(239,68,68,${alpha*.55})`;
              return <td key={j} style={{padding:"2px 5px",textAlign:"center",background:bg,borderRadius:2}}>{v.toFixed(1)}</td>;
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Flag({url,name,size=24}) {
  if(!url) return null;
  return <img src={url} alt={name} width={size} height={Math.round(size*.67)} style={{objectFit:"cover",borderRadius:2,flexShrink:0}} onError={e=>e.target.style.display="none"}/>;
}

function ProfileCard({name,flagUrl,isMobile}) {
  const p=PROFILE[name];
  if(!p) return (
    <div style={{...S.card,padding:10,display:"flex",alignItems:"center",gap:8}}>
      <Flag url={flagUrl} name={name} size={22}/>
      <div>
        <div style={{fontSize:13,fontWeight:600}}>{name}</div>
        <div style={{fontSize:10,...S.muted,marginTop:2}}>No profile data</div>
      </div>
    </div>
  );
  return (
    <div style={{...S.card,padding:isMobile?10:12,borderLeft:`3px solid ${p.color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:6}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <Flag url={flagUrl} name={name} size={20}/>
            <span style={{fontSize:isMobile?12:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
          </div>
          <div style={{fontSize:10,...S.muted}}>{p.style}</div>
          <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,...S.sub,padding:"1px 5px",color:"#22c55e"}}>Off {p.xgOff}</span>
            <span style={{fontSize:9,...S.sub,padding:"1px 5px",color:"#ef4444"}}>Def {p.xgDef}</span>
          </div>
        </div>
        <Radar data={p.pieces} color={p.color} size={isMobile?64:80}/>
      </div>
      <RatingBars pieces={p.pieces} compact={isMobile}/>
      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
        {p.players.map(pl=><span key={pl} style={{...S.sub,padding:"2px 5px",fontSize:9,...S.dim,whiteSpace:"nowrap"}}>{pl}</span>)}
      </div>
    </div>
  );
}

// ── MATCH DETAIL OVERLAY ─────────────────────────────────────────────────────

function MatchDetail({game,teams,stadiums,onClose,isMobile}) {
  const home=teams[game.home_team_id], away=teams[game.away_team_id];
  const stadium=stadiums[game.stadium_id];
  const homeName=home?.name_en||game.home_team_label||"TBD";
  const awayName=away?.name_en||game.away_team_label||"TBD";
  const finished=game.finished==="TRUE";
  const res=!finished?calcMatch(homeName,awayName,"UEFA",stadium?.capacity||70000):null;
  const dateStr=game.local_date?game.local_date.replace(/(\d+)\/(\d+)\/(\d+) (.+)/,"$1/$2 $4"):"";
  const stageLabel={group:"Group Stage",r32:"Round of 32",r16:"Round of 16",qf:"Quarterfinal",sf:"Semifinal",third:"3rd Place",final:"Final"}[game.type]||game.type;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"6px":"20px",overflowY:"auto"}}
      onClick={onClose}>
      <div style={{background:"#0f172a",borderRadius:12,padding:isMobile?12:20,maxWidth:660,width:"100%",border:"1px solid #1e293b"}}
        onClick={e=>e.stopPropagation()}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,...S.dim}}>{stageLabel} · {dateStr}</div>
          <button onClick={onClose} style={{background:"none",border:"none",...S.muted,cursor:"pointer",fontSize:22,lineHeight:1,padding:"0 4px"}}>×</button>
        </div>

        {/* Teams & score */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{flex:1,textAlign:"center",minWidth:0}}>
            <Flag url={home?.flag} name={homeName} size={isMobile?28:36}/>
            <div style={{fontSize:isMobile?11:13,fontWeight:700,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeName}</div>
            {home?.fifa_code&&<div style={{fontSize:9,...S.muted}}>{home.fifa_code}</div>}
          </div>
          <div style={{textAlign:"center",flexShrink:0,padding:"0 4px"}}>
            {finished
              ? <div style={{fontSize:isMobile?26:36,fontWeight:900,color:"#f8fafc",letterSpacing:2}}>{game.home_score}–{game.away_score}</div>
              : res
                ? <><div style={{fontSize:isMobile?22:30,fontWeight:900,color:"#475569",letterSpacing:2}}>{res.score}</div><div style={{fontSize:9,color:"#3b82f6"}}>predicted</div></>
                : <div style={{fontSize:16,...S.muted}}>vs</div>
            }
            {finished&&<span style={{fontSize:9,color:"#22c55e",background:"#22c55e11",borderRadius:8,padding:"2px 8px",marginTop:4,display:"inline-block"}}>FT</span>}
          </div>
          <div style={{flex:1,textAlign:"center",minWidth:0}}>
            <Flag url={away?.flag} name={awayName} size={isMobile?28:36}/>
            <div style={{fontSize:isMobile?11:13,fontWeight:700,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{awayName}</div>
            {away?.fifa_code&&<div style={{fontSize:9,...S.muted}}>{away.fifa_code}</div>}
          </div>
        </div>

        {/* Odds + Poisson matrix */}
        {res&&(
          <div style={{marginBottom:12}}>
            <OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,...S.muted,marginTop:3}}>
              <span>Home {res.winP.toFixed(0)}%</span><span>Draw {res.drawP.toFixed(0)}%</span><span>Away {res.lossP.toFixed(0)}%</span>
            </div>
            <div style={{...S.card,padding:10,marginTop:8}}>
              <ScoreMatrix matrix={res.matrix} homeTeam={homeName} awayTeam={awayName} hXg={res.hXg} aXg={res.aXg}/>
            </div>
          </div>
        )}

        {/* Venue */}
        {stadium&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
            {[["🏟",stadium.fifa_name||stadium.name_en],["📍",`${stadium.city_en}, ${stadium.country_en}`],["👥",`${(stadium.capacity/1000).toFixed(0)}k capacity`],["🗓",game.local_date]].map(([icon,val],i)=>(
              <div key={i} style={{...S.card,padding:"6px 8px",fontSize:10,...S.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{icon} {val}</div>
            ))}
          </div>
        )}

        {/* Team profiles */}
        {(PROFILE[homeName]||PROFILE[awayName])&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <ProfileCard name={homeName} flagUrl={home?.flag} isMobile={true}/>
            <ProfileCard name={awayName} flagUrl={away?.flag} isMobile={true}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────

function FixturesTab({games,teams,stadiums,loading,isMobile}) {
  const [sel,setSel]=useState(null);
  const [stage,setStage]=useState("group");
  const [grp,setGrp]=useState("ALL");

  const stages=[{id:"group",label:"Group"},{id:"r32",label:"R32"},{id:"r16",label:"R16"},{id:"qf",label:"QF"},{id:"sf",label:"SF"},{id:"third",label:"3rd"},{id:"final",label:"Final"}];
  const filtered=games.filter(g=>{
    if(g.type!==stage)return false;
    if(stage==="group"&&grp!=="ALL"&&g.group!==grp)return false;
    return true;
  });

  return (
    <div>
      {sel&&<MatchDetail game={sel} teams={teams} stadiums={stadiums} onClose={()=>setSel(null)} isMobile={isMobile}/>}

      {/* Stage pills */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {stages.map(s=>(
          <button key={s.id} onClick={()=>{setStage(s.id);setGrp("ALL");}}
            style={{padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
              background:stage===s.id?"#3b82f6":"#1e293b",color:stage===s.id?"#fff":"#94a3b8"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Group sub-filter */}
      {stage==="group"&&(
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>
          {["ALL","A","B","C","D","E","F","G","H","I","J","K","L"].map(g=>(
            <button key={g} onClick={()=>setGrp(g)}
              style={{padding:"3px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,
                background:grp===g?"#1d4ed8":"#0f172a",color:grp===g?"#fff":"#64748b"}}>
              {g}
            </button>
          ))}
        </div>
      )}

      {loading?(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[...Array(6)].map((_,i)=><Skeleton key={i} h={68} r={8}/>)}
        </div>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",...S.muted,fontSize:13}}>No matches for this stage</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtered.map(g=>{
            const home=teams[g.home_team_id],away=teams[g.away_team_id];
            const hn=home?.name_en||g.home_team_label||"TBD";
            const an=away?.name_en||g.away_team_label||"TBD";
            const done=g.finished==="TRUE";
            const res=!done?calcMatch(hn,an,"UEFA",stadiums[g.stadium_id]?.capacity||70000):null;
            const dateStr=g.local_date?g.local_date.replace(/(\d+)\/(\d+)\/(\d+) (.+)/,"$1/$2 $4"):"";
            return (
              <div key={g.id} onClick={()=>setSel(g)}
                style={{...S.card,padding:isMobile?"9px 10px":"10px 14px",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#243447"}
                onMouseLeave={e=>e.currentTarget.style.background="#1e293b"}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:9,...S.muted}}>
                  <span>Grp {g.group} · {dateStr}</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:isMobile?100:180}}>{stadiums[g.stadium_id]?.city_en||""}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:isMobile?6:10,minWidth:0}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,minWidth:0}}>
                    <span style={{fontSize:isMobile?12:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hn}</span>
                    <Flag url={home?.flag} name={hn} size={16}/>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:44}}>
                    {done
                      ? <div style={{fontSize:isMobile?15:17,fontWeight:900,color:"#f8fafc"}}>{g.home_score}–{g.away_score}</div>
                      : <><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#334155"}}>{res?.score||"–"}</div><div style={{fontSize:8,color:"#3b82f6"}}>pred</div></>
                    }
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-start",gap:5,minWidth:0}}>
                    <Flag url={away?.flag} name={an} size={16}/>
                    <span style={{fontSize:isMobile?12:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{an}</span>
                  </div>
                </div>
                {res&&!done&&<div style={{marginTop:5}}><OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/></div>}
                {done&&<div style={{marginTop:4,textAlign:"center"}}><span style={{fontSize:9,color:"#22c55e",background:"#22c55e11",borderRadius:8,padding:"1px 6px"}}>Full Time</span></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SimulateTab({teams,stadiums,isMobile}) {
  const allTeams=Object.keys(PROFILE).filter(n=>!["Czechia","Turkey"].includes(n)).sort();
  const [home,setHome]=useState("Brazil");
  const [away,setAway]=useState("France");
  const [refC,setRefC]=useState("UEFA");
  const [stadId,setStadId]=useState("");

  const cap=stadId&&stadiums[stadId]?stadiums[stadId].capacity:70000;
  const res=calcMatch(home,away,refC,cap);
  const hd=Object.values(teams).find(t=>t.name_en===home);
  const ad=Object.values(teams).find(t=>t.name_en===away);

  const sel={background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",fontSize:12,width:"100%"};

  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"300px 1fr",gap:14}}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[["HOME TEAM",home,setHome,allTeams],["AWAY TEAM",away,setAway,allTeams]].map(([label,val,setter,opts])=>(
          <label key={label} style={{fontSize:11,...S.muted,display:"flex",flexDirection:"column",gap:4}}>{label}
            <select value={val} onChange={e=>setter(e.target.value)} style={sel}>
              {opts.map(t=><option key={t}>{t}</option>)}
            </select>
          </label>
        ))}
        <label style={{fontSize:11,...S.muted,display:"flex",flexDirection:"column",gap:4}}>REFEREE CONFEDERATION
          <select value={refC} onChange={e=>setRefC(e.target.value)} style={sel}>
            {["UEFA","CONMEBOL","CONCACAF","CAF","AFC"].map(c=><option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{fontSize:11,...S.muted,display:"flex",flexDirection:"column",gap:4}}>STADIUM
          <select value={stadId} onChange={e=>setStadId(e.target.value)} style={sel}>
            <option value="">— default 70k —</option>
            {Object.values(stadiums).sort((a,b)=>b.capacity-a.capacity).map(s=>(
              <option key={s.id} value={s.id}>{s.name_en} ({(s.capacity/1000).toFixed(0)}k)</option>
            ))}
          </select>
        </label>
      </div>

      {res&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{...S.card,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",marginBottom:10,gap:8}}>
              <div style={{textAlign:"center",minWidth:0}}>
                <Flag url={hd?.flag} name={home} size={32}/>
                <div style={{fontSize:12,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{home}</div>
              </div>
              <div style={{fontSize:isMobile?28:36,fontWeight:900,letterSpacing:4,color:"#f8fafc",flexShrink:0}}>{res.score}</div>
              <div style={{textAlign:"center",minWidth:0}}>
                <Flag url={ad?.flag} name={away} size={32}/>
                <div style={{fontSize:12,fontWeight:700,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{away}</div>
              </div>
            </div>
            <OddsBar win={res.winP} draw={res.drawP} loss={res.lossP}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,...S.muted,marginTop:3}}>
              <span>Win {res.winP.toFixed(0)}%</span><span>Draw {res.drawP.toFixed(0)}%</span><span>Win {res.lossP.toFixed(0)}%</span>
            </div>
          </div>
          <div style={{...S.card,padding:10}}>
            <ScoreMatrix matrix={res.matrix} homeTeam={home} awayTeam={away} hXg={res.hXg} aXg={res.aXg}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <ProfileCard name={home} flagUrl={hd?.flag} isMobile={true}/>
            <ProfileCard name={away} flagUrl={ad?.flag} isMobile={true}/>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupsTab({groups,teams,loading,isMobile}) {
  if(loading) return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>{[...Array(12)].map((_,i)=><Skeleton key={i} h={150} r={8}/>)}</div>;
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {groups.map(grp=>(
        <div key={grp.group} style={{...S.card,padding:isMobile?10:12}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:8,color:"#93c5fd"}}>Group {grp.group}</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{fontSize:9,...S.muted}}>
              <td style={{paddingBottom:4}}>Team</td>
              <td style={{textAlign:"center",paddingBottom:4}}>Pts</td>
              <td style={{textAlign:"center",paddingBottom:4}}>GF</td>
              <td style={{textAlign:"center",paddingBottom:4}}>GA</td>
            </tr></thead>
            <tbody>{grp.teams.map((entry,i)=>{
              const team=teams[entry.team_id];
              const name=team?.name_en||entry.team_id;
              return (
                <tr key={entry.team_id} style={{borderTop:"1px solid #0f172a"}}>
                  <td style={{padding:"4px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
                      <span style={{fontSize:9,...S.muted,width:10,flexShrink:0}}>{i+1}</span>
                      <Flag url={team?.flag} name={name} size={14}/>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:isMobile?9:10}}>{name}</span>
                    </div>
                  </td>
                  <td style={{textAlign:"center",fontWeight:700,fontSize:11,color:"#f8fafc"}}>{entry.pts}</td>
                  <td style={{textAlign:"center",fontSize:10,...S.dim}}>{entry.gf}</td>
                  <td style={{textAlign:"center",fontSize:10,...S.dim}}>{entry.ga}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({teams,loading,isMobile}) {
  const [q,setQ]=useState("");
  const list=Object.values(teams).filter(t=>t.name_en.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name_en.localeCompare(b.name_en));
  return (
    <div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search all 48 teams…"
        style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"8px 12px",color:"#e2e8f0",fontSize:13,marginBottom:12,outline:"none"}}/>
      {loading?(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>{[...Array(8)].map((_,i)=><Skeleton key={i} h={150} r={8}/>)}</div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          {list.map(t=>(
            <div key={t.id} style={{...S.card,padding:10,borderLeft:PROFILE[t.name_en]?`3px solid ${PROFILE[t.name_en].color}`:"3px solid #334155"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:PROFILE[t.name_en]?8:0}}>
                <Flag url={t.flag} name={t.name_en} size={24}/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name_en}</div>
                  <div style={{fontSize:10,...S.muted}}>{t.fifa_code} · Group {t.groups}</div>
                </div>
                {PROFILE[t.name_en]&&<Radar data={PROFILE[t.name_en].pieces} color={PROFILE[t.name_en].color} size={52}/>}
              </div>
              {PROFILE[t.name_en]&&<RatingBars pieces={PROFILE[t.name_en].pieces} compact={true}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StadiumsTab({stadiums,loading,isMobile}) {
  const list=Object.values(stadiums).sort((a,b)=>b.capacity-a.capacity);
  const maxCap=list[0]?.capacity||1;
  if(loading) return <div style={{display:"flex",flexDirection:"column",gap:8}}>{[...Array(8)].map((_,i)=><Skeleton key={i} h={80} r={8}/>)}</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {list.map(s=>(
        <div key={s.id} style={{...S.card,padding:isMobile?10:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name_en}</div>
              <div style={{fontSize:10,...S.muted}}>{s.city_en}, {s.country_en}</div>
              {s.fifa_name&&s.fifa_name!==s.name_en&&<div style={{fontSize:9,color:"#3b82f6",marginTop:1}}>{s.fifa_name}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:800,color:"#f8fafc"}}>{(s.capacity/1000).toFixed(0)}k</div>
              <div style={{fontSize:9,...S.muted}}>seats</div>
            </div>
          </div>
          <div style={{height:5,background:"#0f172a",borderRadius:3}}>
            <div style={{width:`${(s.capacity/maxCap)*100}%`,height:"100%",background:s.capacity>80000?"#a855f7":s.capacity>60000?"#3b82f6":"#22c55e",borderRadius:3}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function GuideTab({isMobile}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{...S.card,padding:isMobile?12:16}}>
        <div style={{fontWeight:700,marginBottom:10,fontSize:14,color:"#93c5fd"}}>Position Ratings</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
          {Object.entries(PI).map(([k,icon])=>(
            <div key={k} style={{...S.sub,padding:10}}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
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
        <div style={{fontWeight:700,marginBottom:10,fontSize:14,color:"#93c5fd"}}>How Predictions Work</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            ["🏟","Crowd Boost",">80k capacity gives home team ×1.03 xG"],
            ["⚖️","Referee Bias","±4% xG when referee's confederation matches a team's"],
            ["♟","Position Ratings","Weighted average of 6 role ratings scales base xG"],
            ["📐","Poisson Model","P(k goals) = e^−λ × λ^k / k! — displayed as 6×6 score matrix"],
            ["🌐","Live Data","Teams, fixtures, stadiums & standings — worldcup26.ir API"],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{title}</div>
                <div style={{fontSize:10,...S.muted,marginTop:1}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

const TABS=[
  {id:"fixtures",label:"Fixtures",icon:"📅"},
  {id:"simulate",label:"Simulate",icon:"🎯"},
  {id:"groups",  label:"Groups",  icon:"🏆"},
  {id:"teams",   label:"Teams",   icon:"🌍"},
  {id:"stadiums",label:"Venues",  icon:"🏟"},
  {id:"guide",   label:"Guide",   icon:"📐"},
];

export default function App() {
  const [tab,setTab]=useState("fixtures");
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [teams,setTeams]=useState({});
  const [games,setGames]=useState([]);
  const [stadiums,setStadiums]=useState({});
  const [groups,setGroups]=useState([]);
  const [status,setStatus]=useState("loading"); // loading | live | error
  const [error,setError]=useState(null);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{
    let dead=false;
    (async()=>{
      try {
        setStatus("loading");
        let result;
        try {
          result = await loadAllData();
        } catch(e) {
          if (e.message === "EXPIRED") {
            localStorage.removeItem(LS_JWT);
            result = await loadAllData(); // retry with fresh token
          } else throw e;
        }
        if(dead)return;
        const {ta,ga,sa,grpa}=result;
        const tMap={},sMap={};
        (ta||[]).forEach(t=>{tMap[t.id]=t;});
        (sa||[]).forEach(s=>{sMap[s.id]=s;});
        setTeams(tMap);
        setGames(ga||[]);
        setStadiums(sMap);
        setGroups(grpa||[]);
        setStatus("live");
      } catch(e) {
        if(!dead){setError(e.message);setStatus("error");}
      }
    })();
    return()=>{dead=true;};
  },[]);

  const dot={live:"#22c55e",error:"#ef4444",loading:"#f59e0b"}[status];
  const label={live:"Live",error:"Offline",loading:"Loading…"}[status];

  return (
    <div style={{height:"100dvh",background:"#0f172a",color:"#e2e8f0",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        select,input{outline:none}
      `}</style>

      {/* Header */}
      <div style={{background:"#020617",borderBottom:"1px solid #1e293b",padding:isMobile?"9px 12px":"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          <span style={{fontSize:isMobile?18:20,flexShrink:0}}>⚽</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:isMobile?13:16,fontWeight:800,letterSpacing:-.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>WC 2026 Analytics</div>
            <div style={{fontSize:9,...S.muted,whiteSpace:"nowrap"}}>FIFA World Cup · Poisson Prediction Engine</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:dot,display:"inline-block"}}/>
          <span style={{fontSize:10,color:dot,fontWeight:600}}>{label}</span>
          {status==="error"&&(
            <button onClick={()=>{localStorage.removeItem(LS_JWT);window.location.reload();}}
              style={{marginLeft:4,background:"none",border:"1px solid #334155",borderRadius:4,padding:"2px 7px",fontSize:9,color:"#94a3b8",cursor:"pointer"}}>
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {status==="error"&&(
        <div style={{background:"#450a0a",borderBottom:"1px solid #7f1d1d",padding:"7px 14px",fontSize:11,color:"#fca5a5"}}>
          ⚠ API unavailable ({error}) — showing prediction engine with built-in data.
        </div>
      )}

      {/* Tab bar */}
      <div style={{background:"#020617",borderBottom:"1px solid #1e293b",display:"flex",overflowX:"auto",flexShrink:0,scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:isMobile?"8px 10px":"8px 14px",background:"none",border:"none",cursor:"pointer",
              color:tab===t.id?"#f8fafc":"#64748b",
              borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",
              fontSize:isMobile?10:12,fontWeight:600,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
            <span style={{fontSize:isMobile?13:14}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"10px":"14px 18px",paddingBottom:`calc(16px + env(safe-area-inset-bottom,0px))`}}>
        {tab==="fixtures"&&<FixturesTab games={games} teams={teams} stadiums={stadiums} loading={status==="loading"} isMobile={isMobile}/>}
        {tab==="simulate"&&<SimulateTab teams={teams} stadiums={stadiums} isMobile={isMobile}/>}
        {tab==="groups"  &&<GroupsTab   groups={groups} teams={teams} loading={status==="loading"} isMobile={isMobile}/>}
        {tab==="teams"   &&<TeamsTab    teams={teams} loading={status==="loading"} isMobile={isMobile}/>}
        {tab==="stadiums"&&<StadiumsTab stadiums={stadiums} loading={status==="loading"} isMobile={isMobile}/>}
        {tab==="guide"   &&<GuideTab    isMobile={isMobile}/>}
      </div>
    </div>
  );
}
