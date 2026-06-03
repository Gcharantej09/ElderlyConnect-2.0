# Senior Tech App - Design Guidelines

## Design Approach: Senior-Optimized Material Design

**Rationale:** Material Design provides excellent accessibility patterns, clear hierarchy, and consistent interactions. We'll customize it with warmer colors and gentler styling specifically optimized for senior citizens.

**Core Principle:** Every design decision prioritizes clarity, comfort, and confidence-building for elderly users learning technology.

---

## Typography

**Font Family:** 
- Primary: Inter or Roboto (excellent readability)
- Fallback: System UI fonts

**Font Sizes:**
- Headings: 32px (h1), 24px (h2), 20px (h3)
- Body text: 20px (minimum - never smaller)
- Button text: 22px
- Helper text/captions: 18px (minimum)
- Navigation: 20px

**Font Weights:**
- Headings: 600 (semi-bold)
- Body: 400 (regular)
- Emphasis: 500 (medium)
- Buttons: 500

**Line Height:** 1.6-1.8 for all text (generous spacing for easy reading)

---

## Layout System

**Spacing Scale:** Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistency
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-20
- Button padding: px-8 py-4
- Card padding: p-8
- Gap between elements: gap-6 to gap-8

**Container Widths:**
- Maximum content width: max-w-7xl
- Form containers: max-w-2xl
- Card grids: Grid with large gaps (gap-8)

**Grid System:**
- Desktop: 2-3 column layouts maximum
- Tablet: 1-2 columns
- Mobile: Always single column
- Generous gutters (gap-8 minimum)

---

## Component Library

### Navigation
- **Persistent top navigation bar:** Large text (20px), high contrast, sticky positioning
- **Menu items:** Widely spaced (gap-8), icon + text labels
- **Active state:** Bold indicator with gentle background color
- **SOS Help Button:** Fixed position, highly visible, large (60px circle), always accessible

### Authentication Screen
- **Multiple login options displayed as large cards:** Google, Email, Username options
- Each option: 200px minimum height, clear icon + descriptive text
- Guest mode: Prominent "Explore Without Logging In" button at bottom
- Gentle background with welcoming illustration

### Dashboard (Post-Login)
- **Health Metrics Cards:** 2-column grid on desktop, stacked mobile
  - Large numerical displays (48px font)
  - Simple icon representations
  - Color-coded (green = good, yellow = attention, never red)
  - Trend arrows with descriptive text
  
- **Reminder Cards:** List view with generous spacing
  - Time displayed prominently (24px)
  - Clear action buttons
  - Checkmark completion states

- **Progress Section:** Visual progress bars with percentage text
  - Achievement badges (large, colorful)
  - Celebratory micro-animations on completion

### AI Tutorial Bot Interface
- **Chat-style layout:** Message bubbles with generous padding (p-6)
- Bot messages: Soft blue background, left-aligned
- User messages: Soft green background, right-aligned
- **Voice button:** Large floating button (80px) for voice input
- Step-by-step visuals embedded in chat
- "Need help?" prompt always visible

### Tutorial Slides Module
- **Full-screen immersive mode option**
- Large screenshot/illustration taking 60% of screen
- Clear instruction text (24px) below
- Navigation: Extra-large "Previous" and "Next" buttons (minimum 120px wide)
- Progress indicator: Visual dots or "Step 3 of 8" text

### Learning Module Cards
- **App tutorial cards:** Grid layout (2 columns desktop, 1 mobile)
- Each card: 300px minimum height
- Large app icon (80px)
- App name (24px)
- Brief description (18px)
- "Start Learning" button (full width within card)

### Privacy Education Sections
- **Visual metaphors:** Lock icons, shield graphics
- Side-by-side comparisons (encrypted vs non-encrypted)
- Color coding: Green for safe, gray for neutral
- Simple infographics with minimal text
- Interactive "tap to reveal" elements

### Settings/Setup Wizard
- **One step per screen** - never overwhelm
- Large input fields (minimum 60px height)
- Voice command option clearly indicated
- Progress stepper at top (current step highlighted)
- "Skip for now" options available

### Forms & Inputs
- **Text inputs:** Minimum 60px height, 20px text, high contrast borders
- **Buttons:** Minimum 60px height, 140px width, rounded corners (8px)
- **Toggle switches:** Large (80px wide), clear on/off labels
- **Dropdowns:** Extra padding, large touch targets

### Health Dashboard
- **Smartwatch connection status:** Prominent indicator at top
- **Real-time metrics:** Large number displays with units
- **Graphs:** Simple line charts with thick lines (4px), limited data points
- **AI suggestions card:** Distinct background, icon, actionable text

---

## Visual Treatment

**Color Palette (Warm & Approachable):**
- Primary: Soft Blue (#4A90E2 or similar warm blue)
- Secondary: Gentle Green (#67C23A)
- Accent: Warm Orange for alerts/encouragement (#F59E0B)
- Background: Off-white (#FAFBFC)
- Surface: Pure white (#FFFFFF)
- Text: Near-black (#1F2937) - never pure black
- Success: Soft Green
- Warning: Warm Yellow (never harsh red for errors)

**Borders & Shadows:**
- Border radius: 12px for cards, 8px for buttons
- Borders: 2px solid for clarity
- Shadows: Gentle elevation (0 2px 8px rgba(0,0,0,0.08))
- No harsh drop shadows

**Spacing & Whitespace:**
- Generous breathing room between all elements
- Never cramped layouts
- Minimum 24px between distinct sections
- Comfortable padding inside all containers

---

## Interaction Patterns

**Button States:**
- Default: Clear background color, distinct border
- Hover: Slight scale (1.02), subtle background darken
- Active: Gentle press effect
- Disabled: Reduced opacity with clear disabled text

**Animations:**
- Minimal and purposeful only
- Loading states: Simple spinner (no elaborate animations)
- Success feedback: Gentle checkmark animation
- Page transitions: Subtle fade (300ms)
- Achievement unlocks: Confetti effect (encouragement)

**Navigation Patterns:**
- Consistent back buttons (top-left, large)
- Breadcrumbs for location awareness
- No hamburger menus - visible navigation always

---

## Accessibility Features

- **High contrast mode toggle** in settings
- **Text-to-speech indicators** on interactive elements
- **Focus states:** Thick (4px) visible outlines
- **Touch targets:** Minimum 60px × 60px
- **Error messages:** Icon + text, never color alone
- **Alt text** on all images with descriptive context

---

## Images

**Hero Image (Landing/Guest Mode):**
- Warm, authentic photo of diverse seniors using technology happily
- Image placement: Top of guest landing page, 50% screen height
- Overlay: Subtle gradient for text readability
- Text overlay: "Learn Technology at Your Pace" (large, white text with shadow)

**Tutorial Visuals:**
- Annotated screenshots of actual app interfaces
- Arrows and highlights pointing to specific features
- Simplified mockups, not cluttered real interfaces

**Empty States:**
- Friendly illustrations (not photos) showing encouragement
- "Start your first lesson" with welcoming character

---

## Responsive Behavior

- **Desktop (1024px+):** Multi-column layouts, sidebar navigation
- **Tablet (768px-1023px):** 1-2 columns, simplified navigation
- **Mobile (<768px):** Strict single column, bottom navigation bar for core features
- All touch targets increase by 20% on mobile