---
name: AniGraph
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  label-mono:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1440px
---

## Brand & Style
The design system is built on a **Cyberpunk-Minimalist** aesthetic, prioritizing data density and high-speed interaction for an anime discovery platform. The personality is "Neon-Technical"—it feels like a high-end data terminal from a near-future setting, yet remains functional and uncluttered.

The visual direction combines a deep, light-absorbing foundation with vibrant, high-energy accents. Key characteristics include:
- **Glassmorphism:** Layers use backdrop blurs to maintain context within the graph visualization.
- **Data-Driven:** Information is presented with technical precision, using monospaced accents where appropriate to lean into the "terminal" feel.
- **Immersive:** A dark-first approach ensures the colorful anime artwork and neon "spider web" connections remain the focal point.

## Colors
The palette is centered on a deep charcoal base to provide maximum contrast for neon accents and vibrant anime key art.

- **Backgrounds:** The core surface uses `#0f172a`. Overlays and cards use translucent variants of `#1e293b` with backdrop filters.
- **Neon Violet (#8b5cf6):** Used for primary actions, active node states, and core branding elements. It represents the "energy" of the graph.
- **Cyan (#06b6d4):** Used for secondary information, interactive secondary nodes, and data visualizations.
- **Success/Emerald (#10b981):** A tertiary accent for positive status indicators or "Completed" series tags.
- **Gradients:** Use linear gradients from Primary to Secondary at 135 degrees for high-impact interactive elements.

## Typography
The typography strategy balances geometric personality with technical utility.

- **Sora** handles headlines and large display text, providing a futuristic, wide-set aesthetic that feels modern and approachable.
- **Inter** is used for all body copy and long-form descriptions to ensure maximum legibility at smaller sizes.
- **Geist** (or an equivalent monospace-leaning sans) is used for "meta-data" labels, technical specs, and graph node counts to reinforce the data-terminal theme.
- **Contrast:** Always use pure white (#ffffff) for headlines and a slightly dimmed grey (#94a3b8) for secondary body text to manage visual hierarchy.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model with high-density spacing.

- **The Graph Canvas:** The discovery visualization is a full-bleed, edge-to-edge interactive canvas. UI overlays (Search, Filters, Info Panels) float above this canvas.
- **Overlays:** Use a 12-column grid for the dashboard view. Side panels for anime details should occupy 4 columns on desktop and 100% width on mobile.
- **Rhythm:** Spacing is strictly based on a 4px baseline. Use 16px (4 units) for standard padding and 24px (6 units) for section gaps.
- **Mobile:** All glassmorphic panels become bottom-sheets or full-screen overlays to maximize the touch area.

## Elevation & Depth
Depth is created through **Glassmorphism and Luminance** rather than traditional shadows.

- **Base Layer:** The deepest layer is the dark `#0f172a` canvas.
- **Mid Layer (Cards/Panels):** Surfaces use a semi-transparent fill (`rgba(30, 41, 59, 0.7)`) with a `20px` backdrop-blur. 
- **Edges:** Instead of shadows, use a 1px inner stroke (border) with a low-opacity white or primary color to define the edges of floating elements.
- **Glow:** Interactive nodes and primary buttons utilize an "Ambient Glow"—a drop shadow with a large blur radius (12px+) and low opacity (30%) using the Primary Neon color, giving the effect of light emitting from the element.

## Shapes
The shape language is **Soft-Technical**. We avoid perfectly round circles (except for graph nodes) to maintain a more structured, architectural feel.

- **Corners:** Standard UI components use a `4px` (Soft) radius to maintain a precise, engineered appearance.
- **Large Panels:** Detail cards and sidebars use `8px` or `12px` to feel slightly more integrated into the "app" experience.
- **Nodes:** Graph nodes are circular but feature a pulsing outer ring to indicate activity.

## Components
- **Glassmorphic Cards:** Used for anime previews. Feature a high-contrast image, a cyan "Match Score" label in Geist Mono, and a subtle neon-violet border on hover.
- **Interactive Nodes:** Circular elements in the graph. Primary nodes (Current Search) glow intensely; secondary nodes (Recommendations) are slightly dimmed until hovered.
- **Action Buttons:** Primary buttons are solid Neon Violet with white text. Secondary buttons are "Ghost" style (transparent with a 1px Cyan border).
- **Search Terminal:** A top-mounted, wide input bar with a backdrop blur and a monospaced "CMD + K" prompt.
- **Status Chips:** Small, rectangular tags for "Genre" or "Studio" using a dark fill and high-contrast borders.
- **Connection Lines:** The "Spider Web" lines are thin (1px), using a gradient transition from Primary to Secondary, with animated "data pulses" moving along the lines toward related nodes.