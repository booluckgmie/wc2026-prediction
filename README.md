# WC 2026 Prediction Dashboard

A real-time FIFA World Cup 2026 analytics and match prediction dashboard built with **Vite + React**. Tracks live results, simulates the full tournament using Poisson statistics, and shows Malaysia Time (MYT) for every kickoff.

🔗 **Live:** [wc2026-myprediction.netlify.app](https://wc2026-myprediction.netlify.app)

---

## Features

### 7 Tabs

| Tab | What it shows |
|---|---|
| 📅 Fixtures | All 104 matches — real scores for played games, predicted scores for upcoming ones |
| 🏆 Groups | Live group standings (real results + simulated remaining matches) |
| 🌍 Teams | All 48 teams with style, xG ratings, radar chart, and key players |
| 🎯 Simulate | Head-to-head match predictor — pick any two teams |
| 🎲 Bracket | Full tournament simulation from group stage to Final |
| 🏟 Venues | All 16 stadiums across USA, Canada, and Mexico |
| 📐 Guide | How the prediction engine works — position ratings, Poisson math, score grid |

---

### 3 Prediction Scenarios

Toggle between three scenarios on every prediction tab. Current early results most closely match the **Optimistic** scenario.

| Scenario | Multiplier | Character |
|---|---|---|
| ⚖ Base | ×1.00 | Expected, balanced outcomes |
| 🔥 Optimistic | ×1.70 | Open, high-scoring matches |
| 🧱 Pessimistic | ×0.48 | Defensive, low-scoring games |

Switching scenario instantly recalculates all predicted scores, win probabilities, and the full bracket simulation.

---

### Prediction Engine

Each match is modelled using a **Poisson distribution** on expected goals (xG):

```
xG (home) = xgOff × (1 − opp.xgDef/3) × stadiumBonus × refBias × powerScore × scenarioScale
```

**Inputs per team:**
- `xgOff` — attacking xG output (1.0–2.4)
- `xgDef` — defensive xG conceded rate (0.7–1.3)
- Position ratings across 6 roles (GK/CB, Striker, Wingbacks, Creative MF, Box-to-Box, Press/Set) → combined into a power score
- Confederation referee bias (±1–4%)
- Stadium capacity bonus (>80k: +3%)
- Scenario scale multiplier

A 6×6 score probability matrix (0–0 through 5–5) is computed from the Poisson PMF. Win/Draw/Loss percentages are derived from the matrix. The modal score from the matrix is displayed as the predicted result.

---

### Real-Time Data

Two live data sources fetched in parallel on every load, with a **3-minute auto-refresh**:

| Source | Used for |
|---|---|
| `rezarahiminia/worldcup2026` (GitHub) | Fixture structure, team metadata, flags, stadiums |
| `openfootball/world-cup.json` (GitHub) | Live match results & goalscorers |

All fetches use `?t=Date.now()` cache-busting and `cache: "no-store"` so the CDN never serves stale data. Real scores from openfootball are merged into the fixture list by team name matching. Finished matches lock in their real score across all tabs — the simulation then predicts only remaining unplayed games.

---

### Group Standings Logic

1. Check if official API standings have real data (pts > 0)
2. If yes — display API standings directly
3. If no (API is stale) — apply all real finished match scores from openfootball, then simulate remaining fixtures with Poisson

This means Group standings are always meaningful from day one of the tournament.

---

### Malaysia Time (MYT)

Every match kickoff is shown in both **local venue time** and **Malaysia Time (UTC+8)**, accounting for the correct timezone per venue:

| Region | UTC offset | MYT offset |
|---|---|---|
| Mexico (no DST since 2022) | UTC−6 | +14 h |
| US/Canada Central (CDT) | UTC−5 | +13 h |
| US/Canada Eastern (EDT) | UTC−4 | +12 h |
| US/Canada Pacific (PDT) | UTC−7 | +15 h |

---

### Full Tournament Bracket (🎲)

- Simulates group stage → Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final + 3rd place
- Real results lock in automatically — simulation only fills unplayed games
- Best 8 third-place teams advance correctly per WC26 rules
- Predicted winner shown with flag at the top
- All knockout rounds are collapsible; played matches are badged "played"

---

## Tech Stack

- **Framework:** React 18 + Vite 6
- **Styling:** Inline styles (no CSS framework)
- **Charts:** Hand-drawn SVG radar charts, canvas-free
- **Deployment:** Netlify (auto-deploy from `main`)
- **Data:** Two public GitHub raw JSON endpoints, no API key required

---

## Local Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
```

---

## Data Sources

- Fixture/team/stadium metadata: [rezarahiminia/worldcup2026](https://github.com/rezarahiminia/worldcup2026)
- Live match results: [openfootball/world-cup.json](https://github.com/openfootball/world-cup.json)

> The original fixture API stopped updating after the draw. openfootball is the active live score source maintained by the community.
