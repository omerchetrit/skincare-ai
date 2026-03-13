# יועצת הטיפוח האישית — AI Skincare Advisor

A full-stack web app that analyzes your skin and recommends personalized skincare products using AI vision and your Wix product catalog.

---

## What it does

1. Walks the user through a 4-step Hebrew-language questionnaire (age, skin type, concerns, current routine)
2. The user uploads a photo of their face in natural light
3. Claude's vision model analyzes the photo alongside the questionnaire data
4. The app returns a personalized skin analysis + ranked product recommendations pulled live from a Wix store

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — no frameworks, RTL (Hebrew) |
| Backend | Node.js + Express |
| AI | Anthropic Claude (`claude-opus-4-5` with vision) |
| Product data | Wix Headless API |
| Hosting | Node server (deployable to Railway, Render, etc.) |

---

## Features

- Multi-step form with progress bar and smooth step transitions
- Pill-based single and multi-select inputs
- Photo upload with drag-and-drop and live preview
- AI skin analysis: detects skin type, concerns, and condition from photo
- Product recommendations ranked by priority (must-have / recommended / bonus)
- Personalized morning + evening routine suggestion
- Fully RTL (right-to-left) Hebrew UI
- Mobile-friendly responsive layout

---

## Getting started

### Prerequisites
- Node.js 18+
- Anthropic API key
- Wix API key + site ID

### Install & run

```bash
git clone https://github.com/YOUR_USERNAME/skincare-ai.git
cd skincare-ai
npm install
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_key_here
WIX_API_KEY=your_wix_key
WIX_SITE_ID=your_site_id
```

```bash
node server.js
# → http://localhost:3000
```

---

## Project structure

```
skincare-ai/
├── server.js          # Express server & API route
├── services/
│   ├── claude.js      # Claude vision + recommendation logic
│   └── wix.js         # Wix product catalog fetcher
└── public/
    ├── index.html     # Multi-step form UI (Hebrew/RTL)
    ├── style.css      # Design system & layout
    └── app.js         # Form state, validation, API calls
```

---

## API

### `POST /api/recommend`

Accepts a JSON body:

```json
{
  "age": 28,
  "gender": "female",
  "skinType": "combination",
  "concerns": ["acne", "dark spots"],
  "sensitivities": "retinol",
  "routine": "Morning: vitamin C serum | Evening: retinol",
  "photo": "data:image/jpeg;base64,..."
}
```

Returns:

```json
{
  "skin_analysis": { "skin_type_assessment": "...", "detected_concerns": [...], "overall_condition": "..." },
  "recommendations": [{ "product_name": "...", "priority": "must-have", "reason": "...", "how_to_use": "...", "product_url": "...", "product_image": "..." }],
  "routine_suggestion": "...",
  "general_advice": "..."
}
```

---

## Built by

Omer Chetrit — [omerchetrit1@gmail.com](mailto:omerchetrit1@gmail.com)
