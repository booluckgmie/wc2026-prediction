import { useState, useEffect, useMemo } from "react";

// ── DATA SOURCE — raw JSON from GitHub (public, no auth, no CORS) ─────────────

const RAW = "https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/";

async function loadAllData() {
  const [teams, matches, stadiums, tables] = await Promise.all([
    fetch(RAW + "football.teams.json").then(r => r.json()),
    fetch(RAW + "football.matches.json").then(r => r.json()),
    fetch(RAW + "football.stadiums.json").then(r => r.json()),
    fetch(RAW + "football.matchtables.json").then(r => r.json()),
  ]);
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

function calcMatch(hn, an, refC="UEFA", cap=70000) {
  const h=PROFILE[hn], a=PROFILE[an];
  if (!h||!a) return null;
  const capB = cap>80000?1.03:1.0;
  const rb   = REF_BIAS[refC]||{};
  const pw   = x=>(x.k*.20+x.q*.20+x.ro*.15+x.b*.15+x.kn*.15+x.p*.15)/100;
  let hXg = h.xgOff*(1-a.xgDef/3)*capB*(1+(rb[CONF[hn]]||0))*(0.85+pw(h.r)*.3);
  let aXg = a.xgOff*(1-h.xgDef/3)    *(1+(rb[CONF[an]]||0))*(0.85+pw(a.r)*.3);
  hXg=Math.max(0.1,hXg); aXg=Math.max(0.1,aXg);
  const mat=[]; let W=0,D=0,L=0;
  for(let i=0;i<=5;i++){mat[i]=[];for(let j=0;j<=5;j++){
    const p=poisson(hXg,i)*poisson(aXg,j)*100;
    mat[i][j]=p; if(i>j)W+=p; else if(i===j)D+=p; else L+=p;
  }}
  return {W,D,L,hXg,aXg,score:`${Math.round(hXg)}–${Math.round(aXg)}`,mat};
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

function MatchDetail({game,tMap,sMap,onClose,mob}) {
  const home=tMap[game.home_team_id], away=tMap[game.away_team_id];
  const stadium=sMap[game.stadium_id];
  const hn=home?.name_en||game.home_team_label||"TBD";
  const an=away?.name_en||game.away_team_label||"TBD";
  const done=game.finished==="TRUE";
  const live=game.time_elapsed&&game.time_elapsed!=="notstarted"&&!done;
  const res=!done?calcMatch(hn,an,"UEFA",stadium?.capacity):null;

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
              {done||live?(
                <div style={{fontSize:mob?28:36,fontWeight:900,color:C.hi,letterSpacing:2,lineHeight:1}}>{game.home_score}–{game.away_score}</div>
              ):res?(
                <div style={{fontSize:mob?24:30,fontWeight:900,color:"#334155",letterSpacing:2,lineHeight:1}}>{res.score}</div>
              ):(
                <div style={{fontSize:mob?20:24,color:C.muted}}>vs</div>
              )}
              <div style={{fontSize:9,marginTop:4,fontWeight:600,
                color:done?C.green:live?C.amber:C.blue}}>
                {done?"Full Time":live?`${game.time_elapsed}'`:"Predicted"}
              </div>
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

        {/* Prediction */}
        {res&&!done&&(
          <div style={{background:C.card,borderRadius:8,padding:10,marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6}}>PREDICTION</div>
            <WinBar W={res.W} D={res.D} L={res.L}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,marginTop:3}}>
              <span>Home {res.W.toFixed(0)}%</span><span>Draw {res.D.toFixed(0)}%</span><span>Away {res.L.toFixed(0)}%</span>
            </div>
            <div style={{marginTop:10}}><ScoreGrid mat={res.mat} hn={hn} an={an} hXg={res.hXg} aXg={res.aXg}/></div>
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

function FixturesTab({matches,tMap,sMap,mob}) {
  const [sel,setSel]=useState(null);
  const [stage,setStage]=useState("group");
  const [grp,setGrp]=useState("ALL");

  const stages=[{id:"group",l:"Group"},{id:"r32",l:"R32"},{id:"r16",l:"R16"},{id:"qf",l:"QF"},{id:"sf",l:"SF"},{id:"third",l:"3rd"},{id:"final",l:"Final"}];

  const shown=useMemo(()=>matches.filter(g=>{
    if(g.type!==stage)return false;
    if(stage==="group"&&grp!=="ALL"&&g.group!==grp)return false;
    return true;
  }),[matches,stage,grp]);

  return (
    <div>
      {sel&&<MatchDetail game={sel} tMap={tMap} sMap={sMap} onClose={()=>setSel(null)} mob={mob}/>}

      {/* Stage pills */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {stages.map(s=>(
          <button key={s.id} onClick={()=>{setStage(s.id);setGrp("ALL");}}
            style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
              background:stage===s.id?C.blue:"#1a2744",color:stage===s.id?"#fff":C.dim}}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Group filter */}
      {stage==="group"&&(
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
            const res=!done&&!live?calcMatch(hn,an,"UEFA",sMap[g.stadium_id]?.capacity):null;

            return (
              <div key={g.id} onClick={()=>setSel(g)}
                style={{background:C.card,borderRadius:8,padding:mob?"9px 10px":"10px 14px",cursor:"pointer",border:live?`1px solid ${C.amber}`:"1px solid transparent"}}
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
                    <span style={{fontSize:mob?12:13,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hn}</span>
                    <FlagImg url={home?.flag} name={hn} size={16}/>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:44}}>
                    {done||live?(
                      <div style={{fontSize:mob?16:18,fontWeight:900,color:done?C.hi:C.amber}}>
                        {g.home_score}–{g.away_score}
                      </div>
                    ):(
                      <>
                        <div style={{fontSize:mob?13:15,fontWeight:700,color:"#334155"}}>{res?.score||"–"}</div>
                        <div style={{fontSize:8,color:C.blue}}>pred</div>
                      </>
                    )}
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-start",gap:5,minWidth:0}}>
                    <FlagImg url={away?.flag} name={an} size={16}/>
                    <span style={{fontSize:mob?12:13,fontWeight:700,color:C.hi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{an}</span>
                  </div>
                </div>

                {/* Odds or status */}
                {res&&<div style={{marginTop:5}}><WinBar W={res.W} D={res.D} L={res.L}/></div>}
                {done&&<div style={{marginTop:4,textAlign:"center"}}><span style={{fontSize:9,color:C.green,background:"#22c55e11",borderRadius:8,padding:"1px 7px"}}>Full Time</span></div>}
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

function GroupsTab({tables,tMap,mob}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {tables.map(grp=>(
        <div key={grp.group} style={{background:C.card,borderRadius:8,padding:mob?10:12}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:8,color:"#93c5fd"}}>Group {grp.group}</div>
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
            <tbody>{grp.teams.map((e,i)=>{
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
      ))}
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

function SimulateTab({tMap,sMap,mob}) {
  const profiledTeams=useMemo(()=>Object.keys(PROFILE).sort(),[]);
  const [hn,setHn]=useState("Brazil");
  const [an,setAn]=useState("France");
  const [refC,setRefC]=useState("UEFA");
  const [stadId,setStadId]=useState("");

  const cap=stadId&&sMap[stadId]?sMap[stadId].capacity:70000;
  const res=calcMatch(hn,an,refC,cap);
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

function GuideTab({mob}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:C.card,borderRadius:8,padding:mob?12:16}}>
        <div style={{fontWeight:700,fontSize:14,color:"#93c5fd",marginBottom:10}}>Position Ratings</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
          {ROLES.map(({key,icon,label,color})=>(
            <div key={key} style={{background:C.deep,borderRadius:6,padding:10}}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:12,fontWeight:700,color}}>{label}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                {key==="k"?"Last line — distribution & positioning"
                :key==="q"?"Goal threat — creativity & finishing"
                :key==="ro"?"Width, crosses, overlapping runs"
                :key==="b"?"Diagonals, vision, through-balls"
                :key==="kn"?"Duels, link play, transitions"
                :"Pressing triggers, set-pieces"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:C.card,borderRadius:8,padding:mob?12:16}}>
        <div style={{fontWeight:700,fontSize:14,color:"#93c5fd",marginBottom:10}}>How Predictions Work</div>
        {[["🏟","Crowd Boost",">80k capacity gives home team ×1.03 xG"],
          ["⚖️","Referee Bias","±4% xG when referee's confederation matches a team's"],
          ["♟","Position Ratings","Weighted average of 6 role ratings scales base xG"],
          ["📐","Poisson Model","P(k goals) = e^−λ × λ^k / k! — shown as 6×6 score grid"],
          ["📂","Data Source","All team, match, stadium & group data from github.com/rezarahiminia/worldcup2026"],
        ].map(([ic,t,d])=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
            <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
            <div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{t}</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{d}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

const TABS=[
  {id:"fixtures",l:"Fixtures",ic:"📅"},
  {id:"groups",  l:"Groups",  ic:"🏆"},
  {id:"teams",   l:"Teams",   ic:"🌍"},
  {id:"simulate",l:"Simulate",ic:"🎯"},
  {id:"stadiums",l:"Venues",  ic:"🏟"},
  {id:"guide",   l:"Guide",   ic:"📐"},
];

export default function App() {
  const [tab,setTab]=useState("fixtures");
  const [mob,setMob]=useState(window.innerWidth<768);

  const [tMap,setTMap]=useState({});
  const [matches,setMatches]=useState([]);
  const [sMap,setSMap]=useState({});
  const [tables,setTables]=useState([]);
  const [st,setSt]=useState("loading");
  const [err,setErr]=useState("");

  useEffect(()=>{
    const h=()=>setMob(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{
    (async()=>{
      try {
        setSt("loading");
        const {teams,matches:m,stadiums,tables:tb}=await loadAllData();
        const tm={},sm={};
        teams.forEach(t=>{tm[t.id]=t;});
        stadiums.forEach(s=>{sm[s.id]=s;});
        setTMap(tm);
        setMatches(m);
        setSMap(sm);
        setTables(tb);
        setSt("live");
      } catch(e) {
        setErr(e.message);
        setSt("error");
      }
    })();
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
          {tab==="fixtures"&&<FixturesTab matches={matches} tMap={tMap} sMap={sMap} mob={mob}/>}
          {tab==="groups"  &&<GroupsTab   tables={tables} tMap={tMap} mob={mob}/>}
          {tab==="teams"   &&<TeamsTab    tMap={tMap} mob={mob}/>}
          {tab==="simulate"&&<SimulateTab tMap={tMap} sMap={sMap} mob={mob}/>}
          {tab==="stadiums"&&<StadiumsTab sMap={sMap} matches={matches} mob={mob}/>}
          {tab==="guide"   &&<GuideTab    mob={mob}/>}
        </main>
      )}
    </div>
  );
}
