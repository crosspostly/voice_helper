# Project Icons

This folder contains the project icons for Voice Helper.

## Files

### `icon.svg` (512×512)
Main project icon with animated sound waves and microphone.
- **Features:** Full-size icon with gradient background, animated AI waves, detailed microphone design
- **Usage:** App icon, social media, large displays
- **Colors:** Indigo gradient (#6366f1 to #8b5cf6), white microphone, red indicator

### `favicon.svg` (32×32)
Simplified favicon for browser tabs.
- **Features:** Compact design optimized for small sizes, no animations
- **Usage:** Browser favicon, PWA icon
- **Colors:** Solid indigo (#6366f1) background, white microphone

## Design Elements

- **Microphone:** Represents voice input functionality
- **Sound Waves:** Symbolize AI processing and audio interaction
- **Red Indicator:** Shows active recording state
- **Purple/Indigo Theme:** Modern, tech-forward color palette

## Implementation

Icons are referenced in `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/public/favicon.svg" />
<link rel="icon" type="image/svg+xml" sizes="any" href="/public/icon.svg" />
<link rel="apple-touch-icon" href="/public/icon.svg" />
```
