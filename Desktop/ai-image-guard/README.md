# AI Image Guard

A Chrome extension that helps identify AI-generated images on the web, designed with an elder-friendly interface.

## Quick Start

1. Open Chrome and go to `chrome://extensions/`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `ai-image-guard` folder
5. Visit any webpage with images — you'll see shield icons on large images
6. Click a shield to check if the image might be AI-generated

## Project Structure

```
ai-image-guard/
  manifest.json   — Extension config (shared, coordinate before editing)
  background.js   — Analysis engine (Person B)
  content.js      — UI and page interaction (Person A)
  styles.css      — Visual styling (Person A)
  icons/          — Extension icons
  README.md       — This file
```

## How It Works

1. `content.js` scans the page for images and adds a shield icon overlay
2. When the user clicks a shield, it sends the image URL to `background.js`
3. `background.js` runs heuristic checks (domain reputation, URL patterns, metadata)
4. Results are sent back and displayed in an elder-friendly tooltip
5. Users can click "Read Aloud" to hear the result or "Check on Google" for reverse image search

## Message Format (API Contract)

Content script sends:
```json
{ "action": "analyze", "imageUrl": "https://example.com/photo.jpg" }
```

Background worker responds:
```json
{
  "score": 72,
  "level": "red",
  "label": "Be careful — this might be made by a computer",
  "reasons": ["Image is from a known AI image website", "No camera data found"]
}
```

## Team Responsibilities

**Person A (UI & Content Script):** `content.js`, `styles.css`
- Image scanning and shield overlay
- Tooltip display and interactions
- Text-to-speech integration
- Elder-friendly styling

**Person B (Analysis & Background):** `background.js`
- Domain reputation checking
- URL pattern analysis
- Image metadata inspection
- Future: API integration (Hive, SightEngine, etc.)

## Next Steps

- [ ] Add EXIF metadata parsing for deeper analysis
- [ ] Integrate Hive Moderation API for real AI detection
- [ ] Add C2PA content credential checking
- [ ] Add ElevenLabs for natural voice warnings
- [ ] Improve Facebook/Instagram DOM handling
- [ ] Add extension popup with settings
