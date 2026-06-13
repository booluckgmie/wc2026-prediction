import { useState, useEffect, useMemo } from "react";

// ── DATA SOURCES ──────────────────────────────────────────────────────────────

const RAW = "https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/";
const OFB = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json";

// Normalize team names between openfootball and the base API
const OFB_NAME = {
  "USA":                    "United States",
  "Bosnia & Herzegovina":   "Bosnia and Herzegovina",
  "DR Congo":               "Democratic Republic of the Congo",
  "Turkey":                 "Turkiye",
  "Czechia":                "Czech Republic",
  "Czech Republic":         "Czech Republic",
};
function normName(n) { return OFB_NAME[n] || n; }

async function loadAllData() {
  const bust = `?t=${Date.now()}`;
  const [teams, matches, stadiums, tables, ofbRaw] = await Promise.all([
    fetch(RAW + "football.teams.json"      + bust, {cache:"no-store"}).then(r => r.json()),
    fetch(RAW + "football.matches.json"    + bust, {cache:"no-store"}).then(r => r.json()),
    fetch(RAW + "football.stadiums.json"   + bust, {cache:"no-store"}).then(r => r.json()),
    fetch(RAW + "football.matchtables.json"+ bust, {cache:"no-store"}).then(r => r.json()),
    fetch(OFB + bust, {cache:"no-store"}).then(r => r.json()).catch(()=>({matches:[]})),
  ]);

  // Build name→id lookup from teams
  const nameToId = {};
  teams.forEach(t => { nameToId[t.name_en] = t.id; });

  // Merge openfootball real scores into matches array
  const ofbPlayed = (ofbRaw.matches||[]).filter(m => m.score?.ft);
  if (ofbPlayed.length > 0) {
    // Build a fast lookup: "homeId_awayId" → match index
    const matchIdx = {};
    matches.forEach((m, i) => { matchIdx[`${m.home_team_id}_${m.away_team_id}`] = i; });

    ofbPlayed.forEach(om => {
      const hName = normName(om.team1);
      const aName = normName(om.team2);
      const hId = nameToId[hName];
      const aId = nameToId[aName];
      if (!hId || !aId) return;
      const key = `${hId}_${aId}`;
      const idx = matchIdx[key];
      if (idx == null) return;
      matches[idx] = {
        ...matches[idx],
        finished:    "TRUE",
        home_score:  String(om.score.ft[0]),
        away_score:  String(om.score.ft[1]),
        home_scorers: (om.goals1||[]).map(g=>`${g.name} ${g.minute}'`).join(", ") || "null",
        away_scorers: (om.goals2||[]).map(g=>`${g.name} ${g.minute}'`).join(", ") || "null",
      };
    });
  }

  return { teams, matches, stadiums, tables };
}

// ── STATIC PROFILE DATA (xG + position ratings for Poisson simulation) ────────

const PROFILE = {
  "Brazil":        {xgOff:2.4,xgDef:0.7,style:"Total Football",   col:"#009c3b",r:{k:88,q:91,ro:86,b:89,kn:84,p:82},pl:["Vinicius Jr ★5.0","Endrick ★4.5","Rodrygo ★4.2","Casemiro ★4.3"]},
  "France":        {xgOff:2.2,xgDef:0.8,style:"Counter-Attack",   col:"#002395",r:{k:87,q:93,ro:88,b:85,kn:86,p:84},pl:["Mbappé ★5.0","Griezmann ★4.6","Camavinga ★4.3","Saliba ★4.4"]},
  "Argentina":     {xgOff:2.0,xgDef:0.9,style:"Tiki-Counter",     col:"#74acdf",r:{k:85,q:94,ro:84,b:86,kn:83,p:81},pl:["Messi ★5.0","J.Álvarez ★4.5","Mac Allister ★4.3","Otamendi ★4.2"]},
  "England":       {xgOff:2.1,xgDef:0.9,style:"High Press",       col:"#cf111b",r:{k:86,q:88,ro:87,b:84,kn:87,p:89},pl:["Bellingham ★4.8","Saka ★4.6","Kane ★4.7","Alexander-Arnold ★4.4"]},
  "Spain":         {xgOff:2.0,xgDef:0.8,style:"Possession",       col:"#c60b1e",r:{k:85,q:87,ro:86,b:91,kn:88,p:87},pl:["Pedri ★4.7","Yamal ★4.6","Morata ★4.3","Rodri ★4.8"]},
  "Germany":       {xgOff:1.9,xgDef:1.0,style:"Pressing",         col:"#555",   r:{k:84,q:86,ro:85,b:84,kn:87,p:88},pl:["Musiala ★4.7","Wirtz ★4.6","Havertz ★4.4","Rüdiger ★4.3"]},
  "Portugal":      {xgOff:2.1,xgDef:1.0,style:"Wing Dominance",   col:"#006600",r:{k:84,q:90,ro:88,b:83,kn:84,p:82},pl:["Ronaldo ★4.5","B.Fernandes ★4.6","Leão ★4.4","Dias ★4.5"]},
  "Netherlands":   {xgOff:1.9,xgDef:1.0,style:"Total Football",   col:"#ff6600",r:{k:85,q:87,ro:86,b:85,kn:86,p:83},pl:["Gakpo ★4.5","De Jong ★4.4","Dumfries ★4.2","Van Dijk ★4.6"]},
  "Belgium":       {xgOff:1.8,xgDef:1.1,style:"Individual Quality",col:"#222",  r:{k:83,q:85,ro:82,b:83,kn:84,p:80},pl:["De Bruyne ★4.7","Lukaku ★4.4","Tielemans ★4.2","Courtois ★4.5"]},
  "Mexico":        {xgOff:1.5,xgDef:1.2,style:"Counter + Block",  col:"#006847",r:{k:83,q:80,ro:82,b:79,kn:81,p:85},pl:["Lozano ★4.2","Guardado ★3.9","Ochoa ★4.3","Herrera ★4.0"]},
  "United States": {xgOff:1.6,xgDef:1.1,style:"Athletic Press",   col:"#b22234",r:{k:82,q:83,ro:84,b:79,kn:85,p:86},pl:["Pulisic ★4.4","McKennie ★4.1","Musah ★4.2","Turner ★4.0"]},
  "Canada":        {xgOff:1.5,xgDef:1.2,style:"High Line",        col:"#ff0000",r:{k:80,q:82,ro:81,b:78,kn:82,p:83},pl:["Davies ★4.6","David ★4.4","Buchanan ★4.1","Borjan ★3.9"]},
  "Japan":         {xgOff:1.5,xgDef:1.1,style:"Gegenpress",       col:"#003087",r:{k:82,q:80,ro:81,b:82,kn:83,p:84},pl:["Doan ★4.2","Kubo ★4.4","Mitoma ★4.3","Endo ★4.2"]},
  "Morocco":       {xgOff:1.4,xgDef:1.0,style:"Counter-Press",    col:"#c1272d",r:{k:84,q:79,ro:83,b:78,kn:82,p:84},pl:["Ziyech ★4.3","En-Nesyri ★4.2","Hakimi ★4.5","Aguerd ★4.1"]},
  "Uruguay":       {xgOff:1.5,xgDef:1.0,style:"Garra Charrúa",   col:"#5aaae7",r:{k:83,q:82,ro:81,b:79,kn:82,p:83},pl:["Núñez ★4.4","Valverde ★4.5","Bentancur ★4.2","Araújo ★4.4"]},
  "Colombia":      {xgOff:1.7,xgDef:1.1,style:"Transition",       col:"#ffd700",r:{k:81,q:84,ro:82,b:83,kn:82,p:81},pl:["L.Díaz ★4.5","J.Cuadrado ★4.1","Arias ★4.0","Cuesta ★4.1"]},
  "Croatia":       {xgOff:1.6,xgDef:1.1,style:"Midfield Control", col:"#cc0000",r:{k:82,q:80,ro:81,b:86,kn:85,p:80},pl:["Modrić ★4.5","Kovačić ★4.3","Kramarić ★4.2","Gvardiol ★4.4"]},
  "Senegal":       {xgOff:1.5,xgDef:1.1,style:"Athletic Press",   col:"#00853f",r:{k:81,q:82,ro:81,b:78,kn:80,p:82},pl:["Mané ★4.4","Gueye ★4.1","Diatta ★3.9","Koulibaly ★4.3"]},
  "Ecuador":       {xgOff:1.4,xgDef:1.2,style:"Press + Counter",  col:"#ffd100",r:{k:78,q:79,ro:78,b:77,kn:78,p:80},pl:["V.Caicedo ★4.2","Plata ★3.9","Preciado ★3.8","Hincapié ★4.0"]},
  "Iran":          {xgOff:1.1,xgDef:1.3,style:"Low Block",        col:"#239f40",r:{k:79,q:76,ro:77,b:75,kn:77,p:79},pl:["Taremi ★4.1","Jahanbakhsh ★3.9","Pouraliganji ★3.8","Beiranvand ★3.9"]},
  "Saudi Arabia":  {xgOff:1.2,xgDef:1.3,style:"Counter-Attack",   col:"#006c35",r:{k:79,q:77,ro:77,b:76,kn:77,p:79},pl:["Al-Dawsari ★4.0","Al-Shehri ★3.9","Al-Malki ★3.7","Al-Owais ★4.0"]},
  "Ghana":         {xgOff:1.3,xgDef:1.2,style:"Energetic Press",  col:"#006b3f",r:{k:78,q:79,ro:78,b:76,kn:78,p:80},pl:["Kudus ★4.3","J.Ayew ★3.9","Partey ★4.1","Amartey ★3.8"]},
  "Ivory Coast":   {xgOff:1.4,xgDef:1.2,style:"Counter-Press",    col:"#f77f00",r:{k:79,q:80,ro:79,b:77,kn:79,p:81},pl:["Haller ★4.0","Zaha ★4.1","Kessié ★4.2","Diallo ★3.9"]},
  "Tunisia":       {xgOff:1.1,xgDef:1.2,style:"Compact Block",    col:"#e70013",r:{k:79,q:76,ro:77,b:75,kn:76,p:79},pl:["Msakni ★3.9","Khazri ★3.8","Ben Romdhane ★3.8","Dahmen ★3.9"]},
  "Qatar":         {xgOff:1.1,xgDef:1.3,style:"High Press",       col:"#8d1b3d",r:{k:78,q:76,ro:76,b:75,kn:76,p:78},pl:["Afif ★4.0","Boudiaf ★3.8","Al-Rawi ★3.7","Al-Sheeb ★3.8"]},
  "Panama":        {xgOff:1.1,xgDef:1.2,style:"Compact Defence",  col:"#d90000",r:{k:77,q:74,ro:75,b:73,kn:74,p:77},pl:["Davis ★3.9","Fajardo ★3.7","Murillo ★3.8","Mosquera ★3.7"]},
  "New Zealand":   {xgOff:1.0,xgDef:1.3,style:"Direct Play",      col:"#333",   r:{k:76,q:73,ro:74,b:72,kn:73,p:76},pl:["Wood ★3.8","Boxall ★3.7","Woud ★3.7","Garbett ★3.6"]},
  "South Africa":  {xgOff:1.2,xgDef:1.2,style:"Counter",          col:"#007a4d",r:{k:78,q:76,ro:77,b:75,kn:76,p:78},pl:["Tau ★4.0","Zwane ★3.9","Mothobi ★3.8","Williams ★3.8"]},
  "Algeria":       {xgOff:1.3,xgDef:1.2,style:"Counter-Attack",   col:"#006233",r:{k:79,q:78,ro:77,b:76,kn:77,p:79},pl:["Mahrez ★4.2","Bennacer ★4.1","Slimani ★3.8","M'Bolhi ★3.8"]},
  "Egypt":         {xgOff:1.2,xgDef:1.2,style:"Counter",          col:"#c8102e",r:{k:79,q:78,ro:77,b:76,kn:77,p:79},pl:["Salah ★4.9","Elneny ★3.9","El-Shahat ★3.8","El-Hadary ★3.7"]},
  "Sweden":        {xgOff:1.4,xgDef:1.1,style:"Organised Block",  col:"#006aa7",r:{k:82,q:79,ro:80,b:79,kn:80,p:81},pl:["Isak ★4.4","Kulusevski ★4.3","Ekdal ★4.0","Olsen ★4.0"]},
  "South Korea":   {xgOff:1.4,xgDef:1.1,style:"Wing Speed",       col:"#c60c30",r:{k:80,q:81,ro:82,b:79,kn:82,p:84},pl:["Son ★4.7","Lee Jae-sung ★4.1","Kim Min-jae ★4.4","Hwang ★4.2"]},
  "Australia":     {xgOff:1.3,xgDef:1.2,style:"Direct Play",      col:"#00843d",r:{k:80,q:78,ro:79,b:77,kn:79,p:82},pl:["Leckie ★4.0","Duke ★3.9","Irvine ★3.8","Ryan ★4.0"]},
  "Switzerland":   {xgOff:1.5,xgDef:1.0,style:"Organised Block",  col:"#ff0000",r:{k:83,q:79,ro:80,b:81,kn:81,p:82},pl:["Shaqiri ★4.1","Embolo ★4.0","Xhaka ★4.3","Sommer ★4.2"]},
  "Czech Republic":{xgOff:1.3,xgDef:1.1,style:"Organised Press",  col:"#d7141a",r:{k:80,q:78,ro:79,b:78,kn:79,p:80},pl:["Schick ★4.2","Soucek ★4.1","Kral ★3.9","Vaclik ★3.9"]},
  "Bosnia and Herzegovina":{xgOff:1.2,xgDef:1.2,style:"Counter",  col:"#003da5",r:{k:78,q:77,ro:77,b:76,kn:77,p:79},pl:["Džeko ★4.1","Pjanić ★4.0","Gojak ★3.8","Šehić ★3.7"]},
  "Scotland":      {xgOff:1.3,xgDef:1.1,style:"High Press",       col:"#003366",r:{k:79,q:77,ro:78,b:77,kn:79,p:81},pl:["Robertson ★4.3","McGinn ★4.1","Adams ★3.9","Tierney ★4.0"]},
  "Haiti":         {xgOff:0.9,xgDef:1.4,style:"Defensive Block",  col:"#003087",r:{k:74,q:71,ro:72,b:70,kn:72,p:74},pl:["Martino ★3.5","Angella ★3.4","Dorvil ★3.3","Joseph ★3.5"]},
  "Paraguay":      {xgOff:1.2,xgDef:1.2,style:"Physical Block",   col:"#d52b1e",r:{k:78,q:76,ro:77,b:75,kn:76,p:78},pl:["Almirón ★4.2","Enciso ★4.0","Alonso ★3.8","Silva ★3.8"]},
  "Turkiye":       {xgOff:1.5,xgDef:1.1,style:"Energetic Press",  col:"#e30a17",r:{k:81,q:80,ro:79,b:79,kn:80,p:82},pl:["Calhanoglu ★4.4","Yilmaz ★4.0","Demiral ★4.1","Güler ★4.2"]},
  "Curaçao":       {xgOff:1.0,xgDef:1.3,style:"Counter",          col:"#002b7f",r:{k:74,q:72,ro:73,b:71,kn:72,p:74},pl:["Dos Santos ★3.8","Fer ★3.6","Martina ★3.5","Kwidama ★3.4"]},
  "Norway":        {xgOff:1.5,xgDef:1.1,style:"Counter-Attack",   col:"#ef2b2d",r:{k:81,q:83,ro:80,b:78,kn:80,p:81},pl:["Haaland ★5.0","Ødegaard ★4.6","Ajer ★4.0","Nyland ★3.9"]},
  "Iraq":          {xgOff:1.0,xgDef:1.3,style:"Defensive Block",  col:"#007a3d",r:{k:75,q:73,ro:74,b:72,kn:73,p:75},pl:["Ameen ★3.7","Al-Shammari ★3.6","Al-Haydos ★3.5","Basim ★3.5"]},
  "Austria":       {xgOff:1.4,xgDef:1.1,style:"High Press",       col:"#ed2939",r:{k:80,q:79,ro:78,b:79,kn:80,p:81},pl:["Sabitzer ★4.2","Arnautović ★4.1","Baumgartner ★4.0","Alaba ★4.3"]},
  "Jordan":        {xgOff:0.9,xgDef:1.3,style:"Defensive Counter",col:"#007a3d",r:{k:74,q:71,ro:72,b:70,kn:71,p:73},pl:["Al-Naimat ★3.6","Sharbini ★3.5","Bani Yaseen ★3.4","Abu Zema ★3.5"]},
  "Uzbekistan":    {xgOff:1.1,xgDef:1.2,style:"Organised Press",  col:"#1eb53a",r:{k:76,q:74,ro:75,b:73,kn:74,p:76},pl:["Shomurodov ★3.9","Turgunboev ★3.7","Ergashev ★3.6","Nishonov ★3.6"]},
  "Congo DR":      {xgOff:1.1,xgDef:1.2,style:"Physical Press",   col:"#007fff",r:{k:75,q:73,ro:74,b:72,kn:73,p:75},pl:["Mbemba ★3.8","Bope ★3.6","Kayembe ★3.6","Kasangu ★3.5"]},
  "Cape Verde":    {xgOff:1.1,xgDef:1.2,style:"Counter",          col:"#003893",r:{k:76,q:74,ro:74,b:73,kn:74,p:76},pl:["Tavares ★3.9","Andrade ★3.7","Carvalho ★3.6","Mendes ★3.7"]},
};

const CONF = {
  "Mexico":"CONCACAF","South Africa":"CAF","South Korea":"AFC","Czech Republic":"UEFA",
  "Canada":"CONCACAF","Switzerland":"UEFA","Qatar":"AFC","Bosnia and Herzegovina":"UEFA",
  "Brazil":"CONMEBOL","Morocco":"CAF","Haiti":"CONCACAF","Scotland":"UEFA",
  "United States":"CONCACAF","Paraguay":"CONMEBOL","Australia":"AFC","Turkiye":"UEFA",
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
  CONCACAF:{CONCACAF:0.04,CONMEBOL:0.01,UEFA:-0.02,CAF:0.00,AFC:0.00,OFC:0.00},
  CONMEBOL:{CONMEBOL:0.04,CONCACAF:0.01,UEFA:-0.01,CAF:0.00,AFC:0.00,OFC:0.00},
  UEFA:    {UEFA:0.04,CONMEBOL:-0.01,CONCACAF:-0.02,CAF:0.01,AFC:0.00,OFC:0.00},
  CAF:     {CAF:0.04,UEFA:-0.01,CONMEBOL:0.00,CONCACAF:0.00,AFC:0.00,OFC:0.00},
  AFC:     {AFC:0.04,UEFA:-0.01,CAF:0.00,CONMEBOL:0.00,CONCACAF:0.00,OFC:0.00},
};

// ── SCENARIO MODIFIERS ────────────────────────────────────────────────────────
// hScale/aScale multiply final xG after all modifiers — keeps differences visible
const SCENARIOS = {
  base:  {label:"Base",        icon:"⚖",  desc:"Expected outcomes",           col:"#3b82f6", hScale:1.00, aScale:1.00},
  best:  {label:"Optimistic",  icon:"🔥", desc:"Open, high-scoring match",    col:"#22c55e", hScale:1.70, aScale:1.70},
  worst: {label:"Pessimistic", icon:"🧱", desc:"Defensive, low-scoring game", col:"#ef4444", hScale:0.48, aScale:0.48},
};

// Position role labels / colours
const ROLES = [
  {key:"k", icon:"♔", label:"GK/CB",       color:"#ef4444"},
  {key:"q", icon:"♕", label:"Striker",      color:"#a855f7"},
  {key:"ro",icon:"♖", label:"Wingbacks",    color:"#3b82f6"},
  {key:"b", icon:"♗", label:"Creative MF",  color:"#22c55e"},
  {key:"kn",icon:"♘", label:"Box-to-Box",   color:"#f59e0b"},
  {key:"p", icon:"♙", label:"Press/Set",    color:"#6b7280"},
];

// ── POISSON ENGINE ────────────────────────────────────────────────────────────

function poisson(λ, k) { let p=Math.exp(-λ); for(let i=1;i<=k;i++) p*=λ/i; return p; }

// Map API team names → PROFILE keys where they differ
const TEAM_ALIAS = {
  "Turkey":                           "Turkiye",
  "Democratic Republic of the Congo": "Congo DR",
};
function profileName(n) { return TEAM_ALIAS[n] || n; }

function calcMatch(hn, an, refC="UEFA", cap=70000, scenario="base") {
  const h=PROFILE[profileName(hn)], a=PROFILE[profileName(an)];
  if (!h||!a) return null;
  const sc = SCENARIOS[scenario] || SCENARIOS.base;
  const capB = cap>80000?1.03:1.0;
  const rb   = REF_BIAS[refC]||{};
  const pw   = x=>(x.k*.20+x.q*.20+x.ro*.15+x.b*.15+x.kn*.15+x.p*.15)/100;
  // Base xG first, then apply scenario scale directly
  let hXg = h.xgOff*(1-a.xgDef/3)*capB*(1+(rb[CONF[profileName(hn)]]||0))*(0.85+pw(h.r)*.3) * sc.hScale;
  let aXg = a.xgOff*(1-h.xgDef/3)     *(1+(rb[CONF[profileName(an)]]||0))*(0.85+pw(a.r)*.3) * sc.aScale;
  hXg=Math.max(0.05,hXg); aXg=Math.max(0.05,aXg);
  const mat=[]; let W=0,D=0,L=0;
  for(let i=0;i<=5;i++){mat[i]=[];for(let j=0;j<=5;j++){
    const p=poisson(hXg,i)*poisson(aXg,j)*100;
    mat[i][j]=p; if(i>j)W+=p; else if(i===j)D+=p; else L+=p;
  }}
  return {W,D,L,hXg,aXg,score:`${Math.round(hXg)}–${Math.round(aXg)}`,mat,scenario};
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function fmtDate(s="") {
  // "06/11/2026 13:00" → "Jun 11 · 13:00"
  const m=s.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+:\d+)/);
  if(!m)return s;
  const months=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m[1]]} ${+m[2]} · ${m[4]}`;
}

const STAGE_LABEL = {group:"Group Stage",r32:"Round of 32",r16:"Round of 16",qf:"Quarterfinal",sf:"Semifinal",third:"3rd Place",final:"Final"};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

const C = {
  page:  "#0f172a",
  card:  "#1e293b",
  deep:  "#0a1628",
  line:  "#1e293b",
  muted: "#64748b",
  dim:   "#94a3b8",
  text:  "#e2e8f0",
  hi:    "#f8fafc",
  blue:  "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red:   "#ef4444",
};

function Shimmer({h=60,r=8}) {
  return <div style={{height:h,borderRadius:r,background:"linear-gradient(90deg,#1e293b 25%,#243447 50%,#1e293b 75%)",backgroundSize:"200%",animation:"sh 1.4s infinite"}}/>;
}

function FlagImg({url,name,size=22}) {
  if(!url)return null;
  return <img src={url} alt={name} width={size} height={Math.round(size*.66)} style={{objectFit:"cover",borderRadius:2,flexShrink:0,display:"block"}} onError={e=>e.target.style.display="none"}/>;
}

function RadarChart({r,col,size=90}) {
  const n=ROLES.length;
  const cx=size/2,cy=size/2,R=size*.36;
  const web=ROLES.map((_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return[cx+R*Math.cos(a),cy+R*Math.sin(a)];});
  const pts=ROLES.map(({key},i)=>{const a=(i/n)*2*Math.PI-Math.PI/2,v=(r[key]-60)/40;return[cx+R*v*Math.cos(a),cy+R*v*Math.sin(a)];});
  return (
    <svg width={size} height={size} style={{overflow:"visible",flexShrink:0}}>
      {[.33,.66,1].map(s=><polygon key={s} points={web.map(([x,y])=>`${cx+(x-cx)*s},${cy+(y-cy)*s}`).join(" ")} fill="none" stroke="#334155" strokeWidth=".5"/>)}
      {web.map(([x,y],i)=><line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth=".5"/>)}
      <polygon points={pts.map(([x,y])=>`${x},${y}`).join(" ")} fill={col+"44"} stroke={col} strokeWidth="1.5"/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={col}/>)}
      {web.map(([x,y],i)=><text key={i} x={cx+(x-cx)*1.3} y={cy+(y-cy)*1.24} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={C.muted}>{ROLES[i].icon}</text>)}
    </svg>
  );
}

function RatingBars({r,compact=false}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      {ROLES.map(({key,icon,label,color})=>(
        <div key={key} style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
          <span style={{width:compact?14:16,textAlign:"center",fontSize:compact?9:10,flexShrink:0}}>{icon}</span>
          {!compact&&<span style={{width:66,fontSize:9,color:C.muted,flexShrink:0,whiteSpace:"nowrap"}}>{label}</span>}
          <div style={{flex:1,height:5,background:C.deep,borderRadius:3,minWidth:0}}>
            <div style={{width:`${r[key]}%`,height:"100%",background:color,borderRadius:3}}/>
          </div>
          <span style={{fontSize:9,color:C.dim,width:22,textAlign:"right",flexShrink:0}}>{r[key]}</span>
        </div>
      ))}
    </div>
  );
}

function WinBar({W,D,L}) {
  const t=W+D+L;
  const seg=(p,bg)=>{const pct=p/t*100;return pct>4&&<div style={{width:`${pct}%`,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",overflow:"hidden"}}>{pct>12?`${pct.toFixed(0)}%`:""}</div>;};
  return <div style={{display:"flex",borderRadius:4,overflow:"hidden",height:18}}>{seg(W,C.green)}{seg(D,C.amber)}{seg(L,C.red)}</div>;
}

function ScoreGrid({mat,hn,an,hXg,aXg}) {
  const max=Math.max(...mat.flat());
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{fontSize:10,color:C.dim,marginBottom:4}}>
        xG → <span style={{color:C.green,fontWeight:600}}>{hn.split(" ")[0]} {hXg.toFixed(2)}</span>
        {" · "}
        <span style={{color:C.red,fontWeight:600}}>{an.split(" ")[0]} {aXg.toFixed(2)}</span>
      </div>
      <table style={{borderCollapse:"collapse",fontSize:9}}>
        <thead><tr>
          <td style={{padding:"2px 4px",color:C.muted}}>H╲A</td>
          {[0,1,2,3,4,5].map(j=><td key={j} style={{padding:"2px 5px",textAlign:"center",color:C.dim}}>{j}</td>)}
        </tr></thead>
        <tbody>{mat.map((row,i)=>(
          <tr key={i}>
            <td style={{padding:"2px 4px",color:C.dim}}>{i}</td>
            {row.map((v,j)=>{
              const a=v/max;
              const bg=i>j?`rgba(34,197,94,${a*.55})`:i===j?`rgba(245,158,11,${a*.55})`:`rgba(239,68,68,${a*.55})`;
              return <td key={j} style={{padding:"2px 5px",textAlign:"center",background:bg,borderRadius:2,minWidth:26}}>{v.toFixed(1)}</td>;
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ProfileCard({name,flag,compact=false}) {
  const p=PROFILE[name];
  if(!p) return (
    <div style={{background:C.card,borderRadius:8,padding:10,display:"flex",alignItems:"center",gap:8}}>
      <FlagImg url={flag} name={name} size={20}/>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{name}</div>
        <div style={{fontSize:10,color:C.muted,marginTop:1}}>No profile data</div>
      </div>
    </div>
  );
  return (
    <div style={{background:C.card,borderRadius:8,padding:compact?10:12,borderLeft:`3px solid ${p.col}`}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:6,marginBottom:8}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <FlagImg url={flag} name={name} size={18}/>
            <span style={{fontSize:compact?12:14,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
          </div>
          <div style={{fontSize:10,color:C.muted}}>{p.style}</div>
          <div style={{display:"flex",gap:5,marginTop:4}}>
            <span style={{fontSize:9,background:C.deep,borderRadius:3,padding:"1px 5px",color:C.green}}>Off {p.xgOff}</span>
            <span style={{fontSize:9,background:C.deep,borderRadius:3,padding:"1px 5px",color:C.red}}>Def {p.xgDef}</span>
          </div>
        </div>
        <RadarChart r={p.r} col={p.col} size={compact?60:76}/>
      </div>
      <RatingBars r={p.r} compact={compact}/>
      <div style={{marginTop:7,display:"flex",flexWrap:"wrap",gap:3}}>
        {p.pl.map(pl=><span key={pl} style={{background:C.deep,borderRadius:4,padding:"2px 5px",fontSize:9,color:C.dim,whiteSpace:"nowrap"}}>{pl}</span>)}
      </div>
    </div>
  );
}

// ── MATCH DETAIL OVERLAY ─────────────────────────────────────────────────────

function MatchDetail({game,tMap,sMap,onClose,mob,scenario="base"}) {
  const home=tMap[game.home_team_id], away=tMap[game.away_team_id];
  const stadium=sMap[game.stadium_id];
  const hn=home?.name_en||game.home_team_label||"TBD";
  const an=away?.name_en||game.away_team_label||"TBD";
  const done=game.finished==="TRUE";
  const live=game.time_elapsed&&game.time_elapsed!=="notstarted"&&!done;
  const res=calcMatch(hn,an,"UEFA",stadium?.capacity,scenario);
  const sc=SCENARIOS[scenario];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(2,6,23,0.94)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:mob?"8px":"24px",overflowY:"auto",WebkitOverflowScrolling:"touch"}}
      onClick={onClose}>
      <div style={{background:"#0d1f35",border:"1px solid #1e293b",borderRadius:12,padding:mob?12:20,maxWidth:640,width:"100%",marginTop:mob?0:20}}
        onClick={e=>e.stopPropagation()}>

        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <span style={{fontSize:11,color:C.dim,fontWeight:600}}>{STAGE_LABEL[game.type]||game.type}</span>
            {game.group&&game.type==="group"&&<span style={{fontSize:11,color:C.muted}}> · Group {game.group}</span>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #334155",borderRadius:6,color:C.muted,cursor:"pointer",fontSize:16,padding:"2px 8px",lineHeight:1}}>✕</button>
        </div>

        {/* Scoreboard */}
        <div style={{background:C.deep,borderRadius:8,padding:"14px 12px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Home */}
            <div style={{flex:1,textAlign:"right",minWidth:0}}>
              {home?.flag&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}><FlagImg url={home.flag} name={hn} size={mob?24:32}/></div>}
              <div style={{fontSize:mob?12:14,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hn}</div>
              {home?.fifa_code&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{home.fifa_code}</div>}
            </div>
            {/* Score */}
            <div style={{textAlign:"center",flexShrink:0,minWidth:mob?72:90}}>
              {done?(
                <>
                  <div style={{fontSize:mob?28:36,fontWeight:900,color:C.hi,letterSpacing:2,lineHeight:1}}>{game.home_score}–{game.away_score}</div>
                  <div style={{fontSize:9,marginTop:3,fontWeight:600,color:C.green}}>Full Time</div>
                  {res&&<div style={{fontSize:9,marginTop:5,color:C.dim}}>Predicted: <span style={{fontWeight:700,color:"#94a3b8"}}>{res.score}</span></div>}
                </>
              ):live?(
                <>
                  <div style={{fontSize:mob?28:36,fontWeight:900,color:C.amber,letterSpacing:2,lineHeight:1}}>{game.home_score}–{game.away_score}</div>
                  <div style={{fontSize:9,marginTop:3,fontWeight:600,color:C.amber}}>{game.time_elapsed}'</div>
                </>
              ):res?(
                <>
                  <div style={{fontSize:mob?24:30,fontWeight:900,color:"#fff",letterSpacing:2,lineHeight:1}}>{res.score}</div>
                  <div style={{fontSize:9,marginTop:3,fontWeight:600,color:C.blue}}>Predicted</div>
                </>
              ):(
                <div style={{fontSize:mob?20:24,color:C.muted}}>vs</div>
              )}
              {game.local_date&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{fmtDate(game.local_date)}</div>}
            </div>
            {/* Away */}
            <div style={{flex:1,textAlign:"left",minWidth:0}}>
              {away?.flag&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:4}}><FlagImg url={away.flag} name={an} size={mob?24:32}/></div>}
              <div style={{fontSize:mob?12:14,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{an}</div>
              {away?.fifa_code&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{away.fifa_code}</div>}
            </div>
          </div>
          {/* Scorers */}
          {done&&(game.home_scorers||game.away_scorers)&&game.home_scorers!=="null"&&(
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:10,color:C.dim,gap:8}}>
              <div style={{flex:1,textAlign:"right"}}>{game.home_scorers!=="null"?game.home_scorers:""}</div>
              <div style={{fontSize:9,color:C.muted}}>⚽</div>
              <div style={{flex:1}}>{game.away_scorers!=="null"?game.away_scorers:""}</div>
            </div>
          )}
        </div>

        {/* Prediction / Post-match analysis */}
        {res&&(
          <div style={{background:C.card,borderRadius:8,padding:10,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:10,color:C.muted,fontWeight:600}}>{done?"PRE-MATCH PREDICTION":"PREDICTION"}</span>
              <span style={{fontSize:9,background:sc.col,color:"#fff",borderRadius:10,padding:"2px 8px",fontWeight:700}}>{sc.icon} {sc.label}</span>
              <span style={{fontSize:9,color:C.dim}}>{sc.desc}</span>
            </div>
            <WinBar W={res.W} D={res.D} L={res.L}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,marginTop:3}}>
              <span>Home {res.W.toFixed(0)}%</span><span>Draw {res.D.toFixed(0)}%</span><span>Away {res.L.toFixed(0)}%</span>
            </div>
            <div style={{marginTop:10}}><ScoreGrid mat={res.mat} hn={hn} an={an} hXg={res.hXg} aXg={res.aXg}/></div>
            {done&&(
              <div style={{marginTop:8,padding:"5px 8px",background:C.deep,borderRadius:6,fontSize:9,color:C.dim}}>
                ℹ Actual result: <strong style={{color:C.hi}}>{hn} {game.home_score}–{game.away_score} {an}</strong>
              </div>
            )}
          </div>
        )}

        {/* Venue */}
        {stadium&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
            {[["🏟",stadium.fifa_name||stadium.name_en],["📍",`${stadium.city_en}, ${stadium.country_en}`],["👥",`${(stadium.capacity/1000).toFixed(0)}k capacity`],["🗓",game.local_date||"–"]].map(([ic,v],i)=>(
              <div key={i} style={{background:C.deep,borderRadius:6,padding:"6px 8px",fontSize:10,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ic} {v}</div>
            ))}
          </div>
        )}

        {/* Team profiles */}
        {(PROFILE[hn]||PROFILE[an])&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <ProfileCard name={hn} flag={home?.flag} compact/>
            <ProfileCard name={an} flag={away?.flag} compact/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FIXTURES TAB ─────────────────────────────────────────────────────────────

function FixturesTab({matches,tMap,sMap,mob,scenario="base"}) {
  const [sel,setSel]=useState(null);
  const [stage,setStage]=useState("group");
  const [grp,setGrp]=useState("ALL");
  const [teamQ,setTeamQ]=useState("");
  const [teamFilter,setTeamFilter]=useState(null); // {id, name_en, flag}

  const stages=[{id:"group",l:"Group"},{id:"r32",l:"R32"},{id:"r16",l:"R16"},{id:"qf",l:"QF"},{id:"sf",l:"SF"},{id:"third",l:"3rd"},{id:"final",l:"Final"}];

  // Sorted unique teams for suggestions
  const allTeams=useMemo(()=>Object.values(tMap).sort((a,b)=>a.name_en.localeCompare(b.name_en)),[tMap]);
  const suggestions=useMemo(()=>{
    if(!teamQ.trim()) return [];
    const q=teamQ.toLowerCase();
    return allTeams.filter(t=>t.name_en.toLowerCase().includes(q)).slice(0,8);
  },[allTeams,teamQ]);

  function selectTeam(t) {
    setTeamFilter(t);
    setTeamQ("");
  }
  function clearTeam() {
    setTeamFilter(null);
    setTeamQ("");
  }

  const shown=useMemo(()=>matches.filter(g=>{
    // Team filter overrides stage/group
    if(teamFilter) {
      return g.home_team_id===teamFilter.id || g.away_team_id===teamFilter.id;
    }
    if(g.type!==stage) return false;
    if(stage==="group"&&grp!=="ALL"&&g.group!==grp) return false;
    return true;
  }),[matches,stage,grp,teamFilter]);

  return (
    <div>
      {sel&&<MatchDetail game={sel} tMap={tMap} sMap={sMap} onClose={()=>setSel(null)} mob={mob} scenario={scenario}/>}

      {/* ── Team filter ── */}
      <div style={{marginBottom:8,position:"relative"}}>
        {teamFilter ? (
          /* Active filter chip */
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.blue}`,borderRadius:8,padding:"7px 10px"}}>
            <FlagImg url={teamFilter.flag} name={teamFilter.name_en} size={20}/>
            <span style={{fontSize:12,fontWeight:700,color:"#fff",flex:1}}>{teamFilter.name_en}</span>
            <span style={{fontSize:10,color:C.muted}}>{shown.length} match{shown.length!==1?"es":""}</span>
            <button onClick={clearTeam}
              style={{background:"none",border:"1px solid #475569",borderRadius:5,color:C.muted,cursor:"pointer",fontSize:13,padding:"1px 7px",lineHeight:1,flexShrink:0}}>
              ✕
            </button>
          </div>
        ) : (
          /* Search input */
          <div style={{position:"relative"}}>
            <div style={{position:"relative",display:"flex",alignItems:"center"}}>
              <span style={{position:"absolute",left:10,fontSize:14,pointerEvents:"none"}}>🔍</span>
              <input
                value={teamQ}
                onChange={e=>setTeamQ(e.target.value)}
                placeholder="Filter by team…"
                style={{width:"100%",background:C.card,border:"1px solid #334155",borderRadius:8,padding:"8px 10px 8px 32px",
                  color:"#fff",fontSize:12,outline:"none"}}
              />
              {teamQ&&<button onClick={()=>setTeamQ("")}
                style={{position:"absolute",right:8,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>
                ✕
              </button>}
            </div>
            {/* Suggestions dropdown */}
            {suggestions.length>0&&(
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#0d1f35",border:"1px solid #1e293b",borderRadius:8,zIndex:50,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
                {suggestions.map(t=>(
                  <button key={t.id} onClick={()=>selectTeam(t)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <FlagImg url={t.flag} name={t.name_en} size={20}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#fff",flex:1}}>{t.name_en}</span>
                    <span style={{fontSize:9,color:C.muted}}>{t.fifa_code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage pills — hidden when team filter active */}
      {!teamFilter&&(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
          {stages.map(s=>(
            <button key={s.id} onClick={()=>{setStage(s.id);setGrp("ALL");}}
              style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
                background:stage===s.id?C.blue:"#1a2744",color:stage===s.id?"#fff":C.dim}}>
              {s.l}
            </button>
          ))}
        </div>
      )}

      {/* Group filter */}
      {!teamFilter&&stage==="group"&&(
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>
          {["ALL","A","B","C","D","E","F","G","H","I","J","K","L"].map(g=>(
            <button key={g} onClick={()=>setGrp(g)}
              style={{padding:"3px 9px",borderRadius:12,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,
                background:grp===g?"#1d4ed8":C.deep,color:grp===g?"#fff":C.muted}}>
              {g}
            </button>
          ))}
        </div>
      )}

      {shown.length===0?(
        <div style={{textAlign:"center",padding:"50px 0",color:C.muted}}>No matches</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {shown.map(g=>{
            const home=tMap[g.home_team_id], away=tMap[g.away_team_id];
            const hn=home?.name_en||g.home_team_label||"TBD";
            const an=away?.name_en||g.away_team_label||"TBD";
            const done=g.finished==="TRUE";
            const live=g.time_elapsed&&g.time_elapsed!=="notstarted"&&!done;
            const res=!live?calcMatch(hn,an,"UEFA",sMap[g.stadium_id]?.capacity,scenario):null;

            const isHome=teamFilter&&g.home_team_id===teamFilter.id;
            const isAway=teamFilter&&g.away_team_id===teamFilter.id;
            return (
              <div key={g.id} onClick={()=>setSel(g)}
                style={{background:C.card,borderRadius:8,padding:mob?"9px 10px":"10px 14px",cursor:"pointer",
                  border:live?`1px solid ${C.amber}`:teamFilter?`1px solid #334155`:"1px solid transparent"}}
                onMouseEnter={e=>e.currentTarget.style.background="#243447"}
                onMouseLeave={e=>e.currentTarget.style.background=C.card}>

                {/* Meta row */}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:9,color:C.muted}}>
                  <span>{fmtDate(g.local_date)}</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:mob?90:160}}>{sMap[g.stadium_id]?.city_en||""}</span>
                </div>

                {/* Teams + score */}
                <div style={{display:"flex",alignItems:"center",gap:mob?6:10,minWidth:0}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,minWidth:0}}>
                    <span style={{fontSize:mob?12:13,fontWeight:700,
                      color:isHome?"#fff":C.hi,
                      textDecoration:isHome?"underline":"none",
                      textUnderlineOffset:3,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hn}</span>
                    <FlagImg url={home?.flag} name={hn} size={isHome?20:16}/>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:44}}>
                    {done?(
                      <>
                        <div style={{fontSize:mob?16:18,fontWeight:900,color:C.hi}}>{g.home_score}–{g.away_score}</div>
                        <div style={{fontSize:8,color:C.green,fontWeight:600}}>Full Time</div>
                        {res&&<div style={{fontSize:8,color:C.dim,marginTop:2}}>pred {res.score}</div>}
                      </>
                    ):live?(
                      <>
                        <div style={{fontSize:mob?16:18,fontWeight:900,color:C.amber}}>{g.home_score}–{g.away_score}</div>
                        <div style={{fontSize:8,color:C.amber,fontWeight:600}}>LIVE {g.time_elapsed}'</div>
                      </>
                    ):(
                      <>
                        <div style={{fontSize:mob?18:22,fontWeight:900,color:"#fff",letterSpacing:1}}>{res?.score||"–"}</div>
                        <div style={{fontSize:8,color:C.blue,fontWeight:600}}>Predicted</div>
                      </>
                    )}
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-start",gap:5,minWidth:0}}>
                    <FlagImg url={away?.flag} name={an} size={isAway?20:16}/>
                    <span style={{fontSize:mob?12:13,fontWeight:700,
                      color:isAway?"#fff":C.hi,
                      textDecoration:isAway?"underline":"none",
                      textUnderlineOffset:3,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{an}</span>
                  </div>
                </div>

                {/* Odds or status */}
                {!done&&res&&<div style={{marginTop:5}}><WinBar W={res.W} D={res.D} L={res.L}/></div>}
                {live&&<div style={{marginTop:4,textAlign:"center"}}><span style={{fontSize:9,color:C.amber,background:"#f59e0b11",borderRadius:8,padding:"1px 7px"}}>LIVE {g.time_elapsed}'</span></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── GROUPS TAB ────────────────────────────────────────────────────────────────

function GroupsTab({tables,matches,tMap,sMap,mob,scenario="base"}) {
  // Compute standings: uses real API data when available, otherwise simulates
  const computed = useMemo(()=>simGroupStage(matches,tMap,sMap,tables,scenario),[matches,tMap,sMap,tables,scenario]);

  // For display: prefer API table row if it has real data (pts or mp > 0),
  // otherwise fall back to simulated row
  const apiMap = {};
  tables.forEach(g => { apiMap[g.group] = {}; g.teams.forEach(t => { apiMap[g.group][t.team_id] = t; }); });

  const groups = Object.entries(computed).sort(([a],[b])=>a.localeCompare(b));

  return (
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {groups.map(([grpKey, simTeams])=>{
        // Check if API has real standings for this group
        const apiGroup = apiMap[grpKey]||{};
        const apiHasData = Object.values(apiGroup).some(t=>t.pts>0||t.mp>0);
        const displayTeams = apiHasData
          ? Object.values(apiGroup).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf)
          : simTeams;
        const grpMatches = matches.filter(m=>m.type==="group"&&m.group===grpKey);
        const played = grpMatches.filter(m=>m.finished==="TRUE").length;
        const total  = grpMatches.length;

        return (
        <div key={grpKey} style={{background:C.card,borderRadius:8,padding:mob?10:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:14,color:"#93c5fd"}}>Group {grpKey}</span>
            <span style={{fontSize:8,color:apiHasData?C.green:C.blue}}>
              {apiHasData?`${played}/${total} played`:"Simulated"}
            </span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{fontSize:9,color:C.muted}}>
              <td style={{paddingBottom:5}}>#&nbsp;Team</td>
              <td style={{textAlign:"center",paddingBottom:5}}>MP</td>
              <td style={{textAlign:"center",paddingBottom:5}}>W</td>
              <td style={{textAlign:"center",paddingBottom:5}}>D</td>
              <td style={{textAlign:"center",paddingBottom:5}}>L</td>
              <td style={{textAlign:"center",paddingBottom:5}}>GD</td>
              <td style={{textAlign:"center",paddingBottom:5,fontWeight:700,color:C.blue}}>Pts</td>
            </tr></thead>
            <tbody>{displayTeams.map((e,i)=>{
              const t=tMap[e.team_id];
              const name=t?.name_en||e.team_id;
              return (
                <tr key={e.team_id} style={{borderTop:"1px solid #0f172a"}}>
                  <td style={{padding:"4px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                      <span style={{fontSize:9,color:i<2?C.green:C.muted,width:10,flexShrink:0,fontWeight:i<2?700:400}}>{i+1}</span>
                      <FlagImg url={t?.flag} name={name} size={13}/>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:mob?9:10,color:C.text}}>{name}</span>
                    </div>
                  </td>
                  {[e.mp,e.w,e.d,e.l,e.gd].map((v,idx)=><td key={idx} style={{textAlign:"center",fontSize:10,color:C.dim}}>{v}</td>)}
                  <td style={{textAlign:"center",fontWeight:700,fontSize:11,color:C.hi}}>{e.pts}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        );
      })}
    </div>
  );
}

// ── TEAMS TAB ─────────────────────────────────────────────────────────────────

function TeamsTab({tMap,mob}) {
  const [q,setQ]=useState("");
  const list=useMemo(()=>Object.values(tMap).filter(t=>t.name_en.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name_en.localeCompare(b.name_en)),[tMap,q]);

  return (
    <div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search all 48 teams…"
        style={{width:"100%",background:C.card,border:"1px solid #334155",borderRadius:6,padding:"9px 12px",color:C.text,fontSize:13,marginBottom:12,outline:"none"}}/>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:8}}>
        {list.map(t=>{
          const p=PROFILE[t.name_en];
          return (
            <div key={t.id} style={{background:C.card,borderRadius:8,padding:10,borderLeft:`3px solid ${p?.col||"#334155"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:p?8:0}}>
                <FlagImg url={t.flag} name={t.name_en} size={26}/>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name_en}</div>
                  <div style={{fontSize:10,color:C.muted}}>{t.fifa_code} · Group {t.groups}</div>
                </div>
                {p&&<RadarChart r={p.r} col={p.col} size={52}/>}
              </div>
              {p&&(
                <>
                  <div style={{fontSize:10,color:C.muted,marginBottom:5}}>{p.style}</div>
                  <RatingBars r={p.r} compact/>
                  <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:3}}>
                    {p.pl.map(pl=><span key={pl} style={{background:C.deep,borderRadius:3,padding:"2px 5px",fontSize:9,color:C.dim,whiteSpace:"nowrap"}}>{pl}</span>)}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STADIUMS TAB ──────────────────────────────────────────────────────────────

function StadiumsTab({sMap,matches,mob}) {
  const list=useMemo(()=>Object.values(sMap).sort((a,b)=>b.capacity-a.capacity),[sMap]);
  const maxCap=list[0]?.capacity||1;

  // count matches per stadium
  const matchCount=useMemo(()=>{
    const m={};
    matches.forEach(g=>{m[g.stadium_id]=(m[g.stadium_id]||0)+1;});
    return m;
  },[matches]);

  const countryFlag={Mexico:"🇲🇽","United States":"🇺🇸",Canada:"🇨🇦"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {list.map(s=>{
        const barColor=s.capacity>80000?"#a855f7":s.capacity>60000?C.blue:C.green;
        return (
          <div key={s.id} style={{background:C.card,borderRadius:8,padding:mob?10:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:6}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {countryFlag[s.country_en]||""} {s.name_en}
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:1}}>{s.city_en}, {s.country_en}</div>
                {s.fifa_name&&s.fifa_name!==s.name_en&&<div style={{fontSize:9,color:C.blue,marginTop:1}}>{s.fifa_name}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:800,color:C.hi}}>{(s.capacity/1000).toFixed(0)}k</div>
                <div style={{fontSize:9,color:C.muted}}>{matchCount[s.id]||0} matches</div>
              </div>
            </div>
            <div style={{height:5,background:C.deep,borderRadius:3}}>
              <div style={{width:`${(s.capacity/maxCap)*100}%`,height:"100%",background:barColor,borderRadius:3}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SIMULATE TAB ─────────────────────────────────────────────────────────────

function SimulateTab({tMap,sMap,mob,scenario="base"}) {
  const profiledTeams=useMemo(()=>Object.keys(PROFILE).sort(),[]);
  const [hn,setHn]=useState("Brazil");
  const [an,setAn]=useState("France");
  const [refC,setRefC]=useState("UEFA");
  const [stadId,setStadId]=useState("");

  const cap=stadId&&sMap[stadId]?sMap[stadId].capacity:70000;
  const res=calcMatch(hn,an,refC,cap,scenario);
  const sc=SCENARIOS[scenario];
  const hd=Object.values(tMap).find(t=>t.name_en===hn);
  const ad=Object.values(tMap).find(t=>t.name_en===an);
  const stadList=useMemo(()=>Object.values(sMap).sort((a,b)=>b.capacity-a.capacity),[sMap]);

  const inp={background:C.card,color:C.text,border:"1px solid #334155",borderRadius:6,padding:"7px 10px",fontSize:12,width:"100%",outline:"none"};

  return (
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"280px 1fr",gap:14}}>
      {/* Controls */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[["HOME TEAM",hn,setHn],["AWAY TEAM",an,setAn]].map(([lbl,val,set])=>(
          <label key={lbl} style={{fontSize:10,color:C.muted,fontWeight:600,display:"flex",flexDirection:"column",gap:4}}>{lbl}
            <select value={val} onChange={e=>set(e.target.value)} style={inp}>
              {profiledTeams.map(t=><option key={t}>{t}</option>)}
            </select>
          </label>
        ))}
        <label style={{fontSize:10,color:C.muted,fontWeight:600,display:"flex",flexDirection:"column",gap:4}}>REFEREE CONFEDERATION
          <select value={refC} onChange={e=>setRefC(e.target.value)} style={inp}>
            {["UEFA","CONMEBOL","CONCACAF","CAF","AFC"].map(c=><option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{fontSize:10,color:C.muted,fontWeight:600,display:"flex",flexDirection:"column",gap:4}}>VENUE (capacity affects home boost)
          <select value={stadId} onChange={e=>setStadId(e.target.value)} style={inp}>
            <option value="">— default 70k —</option>
            {stadList.map(s=><option key={s.id} value={s.id}>{s.name_en} · {(s.capacity/1000).toFixed(0)}k</option>)}
          </select>
        </label>
        {stadId&&sMap[stadId]&&(
          <div style={{background:C.deep,borderRadius:6,padding:"6px 10px",fontSize:10,color:C.dim}}>
            📍 {sMap[stadId].city_en}, {sMap[stadId].country_en}
            {sMap[stadId].capacity>80000&&<span style={{color:"#a855f7",marginLeft:6}}>★ Crowd boost ×1.03</span>}
          </div>
        )}
      </div>

      {/* Results */}
      {res&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Score card */}
          <div style={{background:C.deep,borderRadius:8,padding:14}}>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:10,background:sc.col,color:"#fff",borderRadius:10,padding:"3px 12px",fontWeight:700}}>{sc.icon} {sc.label} — {sc.desc}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{textAlign:"center",minWidth:0}}>
                <FlagImg url={hd?.flag} name={hn} size={34}/>
                <div style={{fontSize:mob?11:13,fontWeight:700,color:C.hi,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{hn}</div>
              </div>
              <div style={{fontSize:mob?28:38,fontWeight:900,letterSpacing:4,color:C.hi,flexShrink:0}}>{res.score}</div>
              <div style={{textAlign:"center",minWidth:0}}>
                <FlagImg url={ad?.flag} name={an} size={34}/>
                <div style={{fontSize:mob?11:13,fontWeight:700,color:C.hi,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{an}</div>
              </div>
            </div>
            <WinBar W={res.W} D={res.D} L={res.L}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,marginTop:3}}>
              <span>Win {res.W.toFixed(0)}%</span><span>Draw {res.D.toFixed(0)}%</span><span>Win {res.L.toFixed(0)}%</span>
            </div>
          </div>
          {/* Matrix */}
          <div style={{background:C.card,borderRadius:8,padding:10}}>
            <ScoreGrid mat={res.mat} hn={hn} an={an} hXg={res.hXg} aXg={res.aXg}/>
          </div>
          {/* Profiles */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <ProfileCard name={hn} flag={hd?.flag} compact/>
            <ProfileCard name={an} flag={ad?.flag} compact/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GUIDE TAB ─────────────────────────────────────────────────────────────────

// Example Poisson matrix for Guide (Brazil vs France, base scenario)
const GUIDE_EXAMPLE = (()=>{
  const hXg=1.76, aXg=1.05;
  const mat=[]; let W=0,D=0,L=0;
  for(let i=0;i<=5;i++){mat[i]=[];for(let j=0;j<=5;j++){
    const p=poisson(hXg,i)*poisson(aXg,j)*100;
    mat[i][j]=p; if(i>j)W+=p; else if(i===j)D+=p; else L+=p;
  }}
  return {mat,W,D,L,hXg,aXg};
})();

// ── TOURNAMENT SIMULATION ENGINE ─────────────────────────────────────────────

function simGroupStage(matches, tMap, sMap, tables, scenario) {
  const st = {};

  // 1. Seed every team in every group with blank stats
  matches.filter(m => m.type==="group").forEach(m => {
    if (!m.group) return;
    if (!st[m.group]) st[m.group] = {};
    [m.home_team_id, m.away_team_id].forEach(tid => {
      if (tid && !st[m.group][tid])
        st[m.group][tid] = {team_id:tid,mp:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0};
    });
  });

  // 2. Determine per-group whether the official API table has real data
  const apiHasData = {};
  tables.forEach(g => {
    apiHasData[g.group] = g.teams.some(t => t.pts > 0 || t.mp > 0);
  });

  // 3a. If official API has data for a group, use it directly
  tables.forEach(g => {
    if (apiHasData[g.group]) {
      if (!st[g.group]) st[g.group] = {};
      g.teams.forEach(t => { st[g.group][t.team_id] = {...t}; });
    }
  });

  // 3b. For groups where API is stale (all zeros), apply real finished match
  //     scores from the matches array (which has openfootball results merged in).
  //     Check allZero ONCE per group before the loop so multiple matches in the
  //     same group all get applied (fixes the previous per-match check bug).
  const staleGroups = new Set(
    Object.keys(st).filter(g => !apiHasData[g])
  );
  const upd = (grp, tid, gf, ga) => {
    const e = st[grp]?.[tid]; if (!e) return;
    e.mp++; e.gf+=gf; e.ga+=ga; e.gd=e.gf-e.ga;
    if (gf>ga){e.w++;e.pts+=3;} else if(gf===ga){e.d++;e.pts+=1;} else e.l++;
  };
  matches.filter(m =>
    m.type==="group" && m.finished==="TRUE" &&
    m.home_score!=null && m.away_score!=null &&
    staleGroups.has(m.group)
  ).forEach(m => {
    upd(m.group, m.home_team_id, +m.home_score, +m.away_score);
    upd(m.group, m.away_team_id, +m.away_score, +m.home_score);
  });

  // 4. Simulate every unplayed match to complete the standings
  matches.filter(m => m.type==="group" && m.finished!=="TRUE").forEach(m => {
    const grp = m.group;
    if (!grp || !st[grp]) return;
    const ht = tMap[m.home_team_id], at = tMap[m.away_team_id];
    if (!ht || !at) return;
    const res = calcMatch(ht.name_en, at.name_en, "UEFA", sMap[m.stadium_id]?.capacity, scenario);
    if (!res) return;
    let hg, ag;
    if (res.W > res.L && res.W > res.D) {
      hg = Math.max(Math.round(res.hXg),1); ag = Math.round(res.aXg);
      if (hg<=ag) ag = hg-1;
    } else if (res.L > res.W && res.L > res.D) {
      hg = Math.round(res.hXg); ag = Math.max(Math.round(res.aXg),1);
      if (ag<=hg) hg = ag-1;
    } else {
      hg = ag = Math.max(Math.round((res.hXg+res.aXg)/2), 0);
    }
    hg = Math.max(hg,0); ag = Math.max(ag,0);
    upd(grp, m.home_team_id, hg, ag);
    upd(grp, m.away_team_id, ag, hg);
  });

  const sorted = {};
  Object.entries(st).forEach(([g,obj]) => {
    sorted[g] = Object.values(obj).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  });
  return sorted;
}

function runTournamentSim(matches, tMap, sMap, tables, scenario) {
  if (!matches.length) return null;

  const groupResults = simGroupStage(matches, tMap, sMap, tables, scenario);
  const thirds = Object.entries(groupResults)
    .map(([g,teams])=>({...teams[2],group:g}))
    .filter(t=>t?.team_id)
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  const thirdsUsed = new Set();
  const matchWinners = {};

  function nextThird(groups) {
    for (const t of thirds) {
      if (!thirdsUsed.has(t.team_id) && (!groups||groups.includes(t.group))) {
        thirdsUsed.add(t.team_id); return t.team_id;
      }
    }
    for (const t of thirds) {
      if (!thirdsUsed.has(t.team_id)) { thirdsUsed.add(t.team_id); return t.team_id; }
    }
    return null;
  }

  function resolve(label, knownId) {
    // knownId must be a non-empty truthy value (not 0 / null / "")
    if (knownId && knownId !== "0") return knownId;
    if (!label) return null;
    let m;
    // "1A" or "1 A" or "Winner Group A" or "Winner A"
    m = label.match(/^1([A-L])$/i) || label.match(/(?:winner|1st?)[^M]*\b([A-L])\b/i);
    if (m) return groupResults[m[1].toUpperCase()]?.[0]?.team_id ?? null;
    // "2A" or "Runner-up Group A"
    m = label.match(/^2([A-L])$/i) || label.match(/(?:runner.?up|2nd?)[^M]*\b([A-L])\b/i);
    if (m) return groupResults[m[1].toUpperCase()]?.[1]?.team_id ?? null;
    // "3rd" / "Best 3rd" — with optional group letters
    if (/3rd|third|best/i.test(label)) {
      const gs = (label.match(/\b([A-L])\b/g)||[]).map(s=>s.toUpperCase());
      return nextThird(gs.length ? gs : null);
    }
    // "Winner 37" or "Winner of match 37"
    m = label.match(/winner.*?(\d+)/i);
    if (m) return matchWinners[m[1]] ?? null;
    // "Loser 37"
    m = label.match(/loser.*?(\d+)/i);
    if (m) return matchWinners[`L${m[1]}`] ?? null;
    return null;
  }

  const roundResults = {};
  ["r32","r16","qf","sf","third","final"].forEach(rnd => {
    const rndMatches = matches.filter(m=>m.type===rnd)
      .sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
    roundResults[rnd] = rndMatches.map(m => {
      const hid = resolve(m.home_team_label, m.home_team_id);
      const aid = resolve(m.away_team_label, m.away_team_id);
      const ht=tMap[hid], at=tMap[aid];
      const hn=ht?.name_en||m.home_team_label||"TBD";
      const an=at?.name_en||m.away_team_label||"TBD";
      let hg=0,ag=0,winner_id,pens=false,real=false;
      if (m.finished==="TRUE") {
        hg=+m.home_score; ag=+m.away_score; real=true;
        winner_id = hg>ag?hid:ag>hg?aid:hid;
      } else {
        const res=(hid&&aid)?calcMatch(hn,an,"UEFA",sMap[m.stadium_id]?.capacity,scenario):null;
        if (res) {
          hg=Math.round(res.hXg); ag=Math.round(res.aXg);
          if(hg>ag) winner_id=hid;
          else if(ag>hg) winner_id=aid;
          else { pens=true; winner_id=res.W>=res.L?hid:aid; }
        } else { winner_id=hid||aid; }
      }
      matchWinners[String(m.id)]=winner_id;
      matchWinners[`L${String(m.id)}`]=winner_id===hid?aid:hid;
      const wt=tMap[winner_id];
      return {id:m.id,hn,an,hid,aid,hg,ag,winner_id,winner:wt?.name_en||hn,winnerFlag:wt?.flag,pens,real};
    });
  });

  const champion_id = roundResults.final?.[0]?.winner_id;
  return {groupResults,thirds,roundResults,champion_id,championTeam:tMap[champion_id]};
}

// ── TOURNAMENT TAB ─────────────────────────────────────────────────────────────

const ROUND_META=[
  {id:"r32",   label:"Round of 32",  cols:2},
  {id:"r16",   label:"Round of 16",  cols:2},
  {id:"qf",    label:"Quarterfinals",cols:2},
  {id:"sf",    label:"Semifinals",   cols:2},
  {id:"third", label:"3rd Place",    cols:1},
  {id:"final", label:"⚽ Final",      cols:1},
];

function MatchPill({r,tMap}) {
  const hWin=r.winner_id===r.hid, aWin=r.winner_id===r.aid;
  return (
    <div style={{background:"#0a1628",borderRadius:8,padding:"8px 10px",
      border:`1px solid ${r.real?"#1e3a5f":r.pens?"#f59e0b33":"#1e3a8a"}`}}>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,minWidth:0}}>
          <span style={{fontSize:10,fontWeight:hWin?800:500,color:hWin?"#fff":C.muted,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.hn}</span>
          <FlagImg url={tMap[r.hid]?.flag} name={r.hn} size={hWin?18:14}/>
        </div>
        <div style={{textAlign:"center",flexShrink:0,minWidth:32}}>
          <div style={{fontSize:14,fontWeight:900,color:"#fff",lineHeight:1}}>{r.hg}–{r.ag}</div>
          {r.pens&&<div style={{fontSize:7,color:C.amber,fontWeight:600}}>pens</div>}
          {r.real&&<div style={{fontSize:7,color:C.green,fontWeight:600}}>FT</div>}
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-start",gap:5,minWidth:0}}>
          <FlagImg url={tMap[r.aid]?.flag} name={r.an} size={aWin?18:14}/>
          <span style={{fontSize:10,fontWeight:aWin?800:500,color:aWin?"#fff":C.muted,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.an}</span>
        </div>
      </div>
      <div style={{textAlign:"center",fontSize:9,color:r.real?C.green:C.blue,marginTop:3,fontWeight:600}}>
        {r.real?`✓ ${r.winner}`:`⇒ ${r.winner}${r.pens?" (pens)":""}`}
      </div>
    </div>
  );
}

function TournamentTab({matches,tMap,sMap,tables,mob,scenario}) {
  // R32 collapsed by default (lots of matches); others open
  const [collapsed,setCollapsed]=useState({r32:true,r16:false,qf:false,sf:false,third:false,final:false});
  const toggle=id=>setCollapsed(p=>({...p,[id]:!p[id]}));

  const sim=useMemo(()=>runTournamentSim(matches,tMap,sMap,tables,scenario),
    [matches,tMap,sMap,tables,scenario]);

  if(!sim||!matches.length) return (
    <div style={{padding:40,textAlign:"center",color:C.muted}}>
      <div style={{fontSize:24,marginBottom:8}}>⏳</div>
      Loading match data…
    </div>
  );

  const sc=SCENARIOS[scenario];
  const champ=sim.championTeam;
  const cp=champ?PROFILE[champ.name_en]:null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>

      {/* Champion */}
      <div style={{
        background:cp?`linear-gradient(135deg,${cp.col}44 0%,#0d1f35 65%)`:"#0d1f35",
        border:`2px solid ${cp?.col||C.blue}`,borderRadius:12,padding:mob?14:20,textAlign:"center",
      }}>
        <div style={{fontSize:34,lineHeight:1,marginBottom:4}}>🏆</div>
        <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>
          PREDICTED CHAMPION · {sc.icon} {sc.label.toUpperCase()}
        </div>
        {champ?(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:6}}>
              <FlagImg url={champ.flag} name={champ.name_en} size={mob?36:52}/>
              <div style={{fontSize:mob?22:30,fontWeight:900,color:"#fff"}}>{champ.name_en}</div>
            </div>
            {cp&&<div style={{fontSize:10,color:C.muted}}>{cp.style} · Off {cp.xgOff} · Def {cp.xgDef}</div>}
          </>
        ):(
          <div style={{fontSize:16,color:C.muted}}>TBD</div>
        )}
        <div style={{marginTop:10,fontSize:9,color:C.muted}}>
          Switches scenario → recalculates all rounds instantly · Real results lock in on match day
        </div>
      </div>

      {/* Knockout rounds */}
      {ROUND_META.map(({id,label,cols})=>{
        const rnd=sim.roundResults[id];
        if(!rnd?.length) return null;
        const open=!collapsed[id];
        const realN=rnd.filter(r=>r.real).length;
        return (
          <section key={id} style={{background:C.card,borderRadius:10,overflow:"hidden"}}>
            <button onClick={()=>toggle(id)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",
              padding:"10px 14px",display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:800,color:"#93c5fd",flex:1}}>{label}</span>
              <span style={{fontSize:9,color:C.muted}}>{rnd.length} match{rnd.length!==1?"es":""}</span>
              {realN>0&&<span style={{fontSize:9,color:C.green,background:"#22c55e11",borderRadius:10,padding:"1px 7px",fontWeight:600}}>{realN} played</span>}
              <span style={{fontSize:10,color:C.muted}}>{open?"▲":"▼"}</span>
            </button>
            {open&&(
              <div style={{padding:"0 10px 10px",
                display:"grid",gridTemplateColumns:cols===1||mob?"1fr":"1fr 1fr",gap:6}}>
                {rnd.map(r=><MatchPill key={r.id} r={r} tMap={tMap}/>)}
              </div>
            )}
          </section>
        );
      })}

      {/* Group standings */}
      <section style={{background:C.card,borderRadius:10,padding:mob?12:16}}>
        <div style={{fontWeight:800,fontSize:13,color:"#93c5fd",marginBottom:3}}>Simulated Group Standings</div>
        <div style={{fontSize:9,color:C.muted,marginBottom:10}}>
          Green = qualified (top 2) · * = best 3rd place · Updates when real results arrive
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
          {Object.entries(sim.groupResults).sort().map(([g,teams])=>{
            const grpMatches = matches.filter(m=>m.type==="group"&&m.group===g);
            const played = grpMatches.filter(m=>m.finished==="TRUE").length;
            const total  = grpMatches.length;
            return (
              <div key={g} style={{background:C.deep,borderRadius:8,padding:"8px 10px"}}>
                {/* Group header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:11,fontWeight:800,color:"#93c5fd"}}>Group {g}</span>
                  <span style={{fontSize:8,color:C.muted}}>{played}/{total} played</span>
                </div>
                {/* Mini standings table */}
                <div style={{fontSize:8,color:C.muted,display:"grid",
                  gridTemplateColumns:"12px 14px 1fr 18px 18px 18px 22px",
                  columnGap:2,marginBottom:3,paddingBottom:3,borderBottom:"1px solid #0f172a"}}>
                  <span/><span/><span>Team</span>
                  <span style={{textAlign:"center"}}>W</span>
                  <span style={{textAlign:"center"}}>D</span>
                  <span style={{textAlign:"center"}}>L</span>
                  <span style={{textAlign:"center",fontWeight:700}}>Pts</span>
                </div>
                {teams.map((t,i)=>{
                  const team=tMap[t.team_id];
                  const is3q=i===2&&sim.thirds.slice(0,8).some(x=>x.team_id===t.team_id);
                  const q=i<2||is3q;
                  return (
                    <div key={t.team_id} style={{display:"grid",
                      gridTemplateColumns:"12px 14px 1fr 18px 18px 18px 22px",
                      columnGap:2,alignItems:"center",padding:"3px 0",
                      borderBottom:i<teams.length-1?"1px solid #0f172a":"none",
                      background:q?"#0f2040":"transparent",borderRadius:3}}>
                      <span style={{fontSize:8,color:q?C.green:C.muted,fontWeight:q?700:400,textAlign:"center"}}>
                        {i+1}{is3q?"*":""}
                      </span>
                      <FlagImg url={team?.flag} name={team?.name_en||""} size={12}/>
                      <span style={{fontSize:9,color:q?"#fff":C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {team?.name_en||t.team_id}
                      </span>
                      <span style={{fontSize:9,textAlign:"center",color:C.dim}}>{t.w}</span>
                      <span style={{fontSize:9,textAlign:"center",color:C.dim}}>{t.d}</span>
                      <span style={{fontSize:9,textAlign:"center",color:C.dim}}>{t.l}</span>
                      <span style={{fontSize:9,fontWeight:800,textAlign:"center",color:q?"#fff":C.dim}}>
                        {t.pts}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{marginTop:8,fontSize:9,color:C.muted}}>
          Green rows qualify · * = best 3rd place · Predicted results shown; real results override on match day
        </div>
      </section>

    </div>
  );
}

// ── GUIDE TAB ─────────────────────────────────────────────────────────────────

function GuideTab({mob}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* ── Position Ratings ── */}
      <section style={{background:C.card,borderRadius:10,padding:mob?14:18}}>
        <div style={{fontWeight:800,fontSize:14,color:"#93c5fd",marginBottom:12,letterSpacing:.3}}>Position Ratings</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
          {ROLES.map(({key,icon,label,color})=>(
            <div key={key} style={{background:C.deep,borderRadius:8,padding:"10px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color,marginBottom:2}}>{label}</div>
                <div style={{fontSize:10,color:C.muted,lineHeight:1.5}}>
                  {key==="k"?"Last line — distribution & aerial dominance"
                  :key==="q"?"Goal threat — movement, creativity & finishing"
                  :key==="ro"?"Width, overlapping runs & delivery"
                  :key==="b"?"Diagonals, vision & through-balls"
                  :key==="kn"?"Duels, link play & transitions"
                  :"Pressing triggers, work-rate & set-pieces"}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,background:C.deep,borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4,fontWeight:600}}>HOW RATINGS AFFECT xG</div>
          <div style={{fontSize:10,color:C.dim,lineHeight:1.7}}>
            Each role is weighted and averaged into a <span style={{color:"#f8fafc"}}>power score</span>: GK/CB &amp; Striker carry <span style={{color:"#f8fafc"}}>20%</span> each, Wingbacks, Creative MF, Box-to-Box &amp; Press carry <span style={{color:"#f8fafc"}}>15%</span> each.
            A team rated <span style={{color:C.green}}>90 overall</span> boosts xG by <span style={{color:C.green}}>~+10%</span> over a team rated <span style={{color:C.red}}>70 overall</span>.
          </div>
        </div>
      </section>

      {/* ── How Predictions Work ── */}
      <section style={{background:C.card,borderRadius:10,padding:mob?14:18}}>
        <div style={{fontWeight:800,fontSize:14,color:"#93c5fd",marginBottom:12,letterSpacing:.3}}>How Predictions Work</div>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {[
            ["🏟","Crowd Boost",    ">80k capacity adds ×1.03 to home xG. Bigger crowds lift the home side."],
            ["⚖️","Referee Bias",   "±4% xG modifier when referee's confederation matches a team's own."],
            ["♟", "Position Ratings","6 role ratings (weighted avg) scale base xG up or down by ±10%."],
            ["📐","Poisson Model",  "P(k goals) = e⁻λ × λᵏ / k!  where λ = xG. Each grid cell = P(home=row) × P(away=col)."],
            ["🎯","Scenarios",      "Base = raw xG.  🔥 Optimistic = ×1.7.  🧱 Pessimistic = ×0.48."],
            ["📂","Data Source",    "github.com/rezarahiminia/worldcup2026"],
          ].map(([ic,title,desc],idx,arr)=>(
            <div key={title} style={{display:"grid",gridTemplateColumns:"28px 1fr",columnGap:10,rowGap:2,padding:"9px 0",borderBottom:idx<arr.length-1?"1px solid #0f172a":"none",alignItems:"start"}}>
              {/* icon — top-left, vertically centred with title */}
              <span style={{fontSize:17,lineHeight:"20px",textAlign:"center"}}>{ic}</span>
              {/* title */}
              <span style={{fontSize:11,fontWeight:700,color:"#f8fafc",lineHeight:"20px"}}>{title}</span>
              {/* empty cell to keep grid aligned */}
              <span/>
              {/* description indented under title */}
              <span style={{fontSize:10,color:C.muted,lineHeight:1.6}}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reading the Prediction Example ── */}
      <section style={{background:C.card,borderRadius:10,padding:mob?14:18}}>
        <div style={{fontWeight:800,fontSize:14,color:"#93c5fd",marginBottom:4,letterSpacing:.3}}>Example: Reading a Prediction</div>
        <div style={{fontSize:10,color:C.muted,marginBottom:14}}>Brazil vs France · Base scenario · 70k stadium</div>

        {/* Win bar example */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:C.dim,fontWeight:600,marginBottom:6}}>① WIN PROBABILITY BAR</div>
          <WinBar W={GUIDE_EXAMPLE.W} D={GUIDE_EXAMPLE.D} L={GUIDE_EXAMPLE.L}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginTop:5,gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:10,height:10,borderRadius:2,background:C.green,display:"inline-block",flexShrink:0}}/>
              <span style={{color:C.text,fontWeight:600}}>Brazil win</span>
              <span style={{color:C.muted}}>{GUIDE_EXAMPLE.W.toFixed(0)}%</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:10,height:10,borderRadius:2,background:C.amber,display:"inline-block",flexShrink:0}}/>
              <span style={{color:C.text,fontWeight:600}}>Draw</span>
              <span style={{color:C.muted}}>{GUIDE_EXAMPLE.D.toFixed(0)}%</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:10,height:10,borderRadius:2,background:C.red,display:"inline-block",flexShrink:0}}/>
              <span style={{color:C.text,fontWeight:600}}>France win</span>
              <span style={{color:C.muted}}>{GUIDE_EXAMPLE.L.toFixed(0)}%</span>
            </div>
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:8,lineHeight:1.6,background:C.deep,borderRadius:6,padding:"8px 10px"}}>
            The bar width = probability. Green = home win, amber = draw, red = away win. Percentages sum to ~100%.
          </div>
        </div>

        {/* Score grid example */}
        <div>
          <div style={{fontSize:10,color:C.dim,fontWeight:600,marginBottom:8}}>② 6×6 POISSON SCORE GRID</div>

          {/* xG legend */}
          <div style={{display:"flex",gap:16,marginBottom:8,fontSize:10}}>
            <span><span style={{color:C.muted}}>xG </span><span style={{color:C.green,fontWeight:700}}>BRA {GUIDE_EXAMPLE.hXg.toFixed(2)}</span></span>
            <span><span style={{color:C.muted}}>xG </span><span style={{color:C.red,fontWeight:700}}>FRA {GUIDE_EXAMPLE.aXg.toFixed(2)}</span></span>
          </div>

          {/* Axis labels */}
          <div style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
            <span style={{fontSize:9,color:C.muted,width:36,flexShrink:0,textAlign:"right"}}>BRA →</span>
            <span style={{fontSize:9,color:C.muted}}>goals scored (rows) &nbsp;|&nbsp; FRA goals scored (cols) ↓</span>
          </div>

          {/* Grid */}
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{borderCollapse:"separate",borderSpacing:2,tableLayout:"fixed",minWidth:0}}>
              <thead>
                <tr>
                  <td style={{width:36,fontSize:9,color:C.muted,fontWeight:700,textAlign:"center",padding:"2px 0",whiteSpace:"nowrap"}}>BRA╲FRA</td>
                  {[0,1,2,3,4,5].map(j=>(
                    <td key={j} style={{width:42,fontSize:9,fontWeight:700,textAlign:"center",color:C.dim,padding:"2px 0"}}>{j}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GUIDE_EXAMPLE.mat.map((row,i)=>{
                  const maxV=Math.max(...GUIDE_EXAMPLE.mat.flat());
                  return (
                    <tr key={i}>
                      <td style={{fontSize:9,fontWeight:700,textAlign:"center",color:C.dim,padding:"2px 0"}}>{i}</td>
                      {row.map((v,j)=>{
                        const alpha=v/maxV;
                        const bg=i>j?`rgba(34,197,94,${alpha*.65})`:i===j?`rgba(245,158,11,${alpha*.65})`:`rgba(239,68,68,${alpha*.65})`;
                        const top=(i===2&&j===1);
                        return (
                          <td key={j} style={{
                            fontSize:top?10:9,fontWeight:top?900:400,textAlign:"center",
                            background:bg,borderRadius:4,padding:"4px 2px",color:"#fff",
                            border:top?"2px solid #fff":"2px solid transparent",
                            width:42,
                          }}>
                            {v.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{marginTop:10,background:C.deep,borderRadius:8,padding:"10px 12px",fontSize:10,lineHeight:1.7,color:C.muted}}>
            <div style={{fontWeight:700,color:"#f8fafc",marginBottom:6}}>How to read this grid</div>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",columnGap:8,rowGap:4}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:12,borderRadius:2,background:"rgba(34,197,94,.6)",flexShrink:0,display:"inline-block"}}/>
                <span style={{color:"#f8fafc",fontWeight:600}}>Green</span>
              </span>
              <span>Row &gt; Col → Brazil win</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:12,borderRadius:2,background:"rgba(245,158,11,.6)",flexShrink:0,display:"inline-block"}}/>
                <span style={{color:"#f8fafc",fontWeight:600}}>Amber</span>
              </span>
              <span>Row = Col → Draw</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:12,borderRadius:2,background:"rgba(239,68,68,.6)",flexShrink:0,display:"inline-block"}}/>
                <span style={{color:"#f8fafc",fontWeight:600}}>Red</span>
              </span>
              <span>Row &lt; Col → France win</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:12,borderRadius:2,border:"2px solid #fff",flexShrink:0,display:"inline-block"}}/>
                <span style={{color:"#f8fafc",fontWeight:600}}>Border</span>
              </span>
              <span>Most likely scoreline — Brazil 2–1 France ({GUIDE_EXAMPLE.mat[2][1].toFixed(1)}%)</span>
            </div>
            <div style={{marginTop:8,borderTop:"1px solid #1e293b",paddingTop:8}}>
              Each cell = P(BRA scores row) × P(FRA scores col). Brighter = higher probability.
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

const TABS=[
  {id:"fixtures",  l:"Fixtures",   ic:"📅"},
  {id:"groups",    l:"Groups",     ic:"🏆"},
  {id:"teams",     l:"Teams",      ic:"🌍"},
  {id:"simulate",  l:"Simulate",   ic:"🎯"},
  {id:"tournament",l:"Bracket",    ic:"🎲"},
  {id:"stadiums",  l:"Venues",     ic:"🏟"},
  {id:"guide",     l:"Guide",      ic:"📐"},
];

export default function App() {
  const [tab,setTab]=useState("fixtures");
  const [mob,setMob]=useState(window.innerWidth<768);

  const [scenario,setScenario]=useState("base");
  const [tMap,setTMap]=useState({});
  const [matches,setMatches]=useState([]);
  const [sMap,setSMap]=useState({});
  const [tables,setTables]=useState([]);
  const [st,setSt]=useState("loading");
  const [err,setErr]=useState("");
  const [lastUpdated,setLastUpdated]=useState(null);

  useEffect(()=>{
    const h=()=>setMob(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);

  async function fetchData(silent=false) {
    try {
      if (!silent) setSt("loading");
      const {teams,matches:m,stadiums,tables:tb}=await loadAllData();
      const tm={},sm={};
      teams.forEach(t=>{tm[t.id]=t;});
      stadiums.forEach(s=>{sm[s.id]=s;});
      setTMap(tm); setMatches(m); setSMap(sm); setTables(tb);
      setSt("live");
      setLastUpdated(new Date());
    } catch(e) {
      setErr(e.message); setSt("error");
    }
  }

  useEffect(()=>{
    fetchData();
    // Re-fetch every 3 min to pick up live API updates on match day
    const id = setInterval(()=>fetchData(true), 3*60*1000);
    return()=>clearInterval(id);
  },[]);

  const dotColor={live:C.green,error:C.red,loading:C.amber}[st];
  const dotLabel={live:"Live",error:"Error",loading:"Loading…"}[st];
  const loading=st==="loading";

  return (
    <div style={{height:"100dvh",background:C.page,color:C.text,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.page}}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        select,input,button{font-family:inherit}
      `}</style>

      {/* Header */}
      <header style={{background:"#020617",borderBottom:"1px solid #1e293b",padding:mob?"9px 12px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <span style={{fontSize:mob?20:22,flexShrink:0}}>⚽</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:mob?14:17,fontWeight:800,letterSpacing:-.5,color:C.hi,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>WC 2026 Analytics</div>
            <div style={{fontSize:9,color:C.muted}}>FIFA World Cup · 48 Teams · 104 Matches</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:dotColor,display:"inline-block",flexShrink:0}}/>
          <span style={{fontSize:10,color:dotColor,fontWeight:600}}>{dotLabel}</span>
          {st==="error"&&(
            <button onClick={()=>window.location.reload()}
              style={{marginLeft:4,background:"none",border:"1px solid #334155",borderRadius:4,padding:"2px 7px",fontSize:9,color:C.dim,cursor:"pointer"}}>
              Retry
            </button>
          )}
        </div>
      </header>

      {/* Error */}
      {st==="error"&&(
        <div style={{background:"#450a0a",borderBottom:"1px solid #7f1d1d",padding:"7px 16px",fontSize:11,color:"#fca5a5",flexShrink:0}}>
          ⚠ Failed to load data: {err}
        </div>
      )}

      {/* Tabs */}
      <nav style={{background:"#020617",borderBottom:"1px solid #1e293b",display:"flex",overflowX:"auto",flexShrink:0,scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:mob?"8px 11px":"9px 16px",background:"none",border:"none",cursor:"pointer",
              color:tab===t.id?C.hi:C.muted,
              borderBottom:tab===t.id?`2px solid ${C.blue}`:"2px solid transparent",
              fontSize:mob?10:12,fontWeight:600,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
            <span style={{fontSize:mob?13:15}}>{t.ic}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </nav>

      {/* Scenario toggle bar */}
      <div style={{background:"#020617",borderBottom:"1px solid #1e293b",padding:"6px 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,flexWrap:"wrap"}}>
        <span style={{fontSize:9,color:"#fff",fontWeight:700,marginRight:2,opacity:.7}}>SCENARIO</span>
        {Object.entries(SCENARIOS).map(([k,s])=>(
          <button key={k} onClick={()=>setScenario(k)}
            style={{padding:"4px 14px",borderRadius:20,border:`1px solid ${scenario===k?s.col:"#475569"}`,cursor:"pointer",fontSize:10,fontWeight:700,
              background:scenario===k?s.col:"#1e293b",
              color:"#fff",
              transition:"all .15s",
              boxShadow:scenario===k?`0 0 8px ${s.col}66`:"none"}}>
            {s.icon} {s.label}
          </button>
        ))}
        <span style={{fontSize:9,color:"#fff",marginLeft:4,opacity:.6}}>{SCENARIOS[scenario].desc}</span>
      </div>

      {/* Loading screen */}
      {loading&&(
        <div style={{flex:1,overflowY:"auto",padding:mob?"10px":"16px 20px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[...Array(6)].map((_,i)=><Shimmer key={i} h={68} r={8}/>)}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading&&(
        <main style={{flex:1,overflowY:"auto",padding:mob?"10px":"14px 20px",paddingBottom:`calc(16px + env(safe-area-inset-bottom,0px))`}}>
          {tab==="fixtures"  &&<FixturesTab   matches={matches} tMap={tMap} sMap={sMap} mob={mob} scenario={scenario}/>}
          {tab==="groups"    &&<GroupsTab     tables={tables} matches={matches} tMap={tMap} sMap={sMap} mob={mob} scenario={scenario}/>}
          {tab==="teams"     &&<TeamsTab      tMap={tMap} mob={mob}/>}
          {tab==="simulate"  &&<SimulateTab   tMap={tMap} sMap={sMap} mob={mob} scenario={scenario}/>}
          {tab==="tournament"&&<TournamentTab matches={matches} tMap={tMap} sMap={sMap} tables={tables} mob={mob} scenario={scenario}/>}
          {tab==="stadiums"  &&<StadiumsTab   sMap={sMap} matches={matches} mob={mob}/>}
          {tab==="guide"     &&<GuideTab      mob={mob}/>}
        </main>
      )}
    </div>
  );
}
