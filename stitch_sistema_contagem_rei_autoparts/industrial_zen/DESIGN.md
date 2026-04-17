# Design System: Industrial Zen

## 1. Overview & Creative North Star: "The Silent Inspector"
In the high-stakes environment of automotive casting, where precision is measured in microns and heat, the digital interface must be a sanctuary of clarity. Our Creative North Star, **"The Silent Inspector,"** rejects the cluttered, alarmist aesthetics of traditional industrial software. 

This design system moves beyond "standard" minimalism into a bespoke editorial experience. By utilizing intentional asymmetry, expansive whitespace, and tonal depth, we create a tool that feels more like a premium architectural journal than a factory dashboard. We break the "template" look by treating the UI as a series of floating, monolithic layers—evoking the weight of forged steel balanced with the lightness of air.

## 2. Color & Surface Philosophy
The palette is a sophisticated interplay of `Deep Slate Grays` and `Muted Teals`, designed to reduce cognitive load during long shifts.

### The "No-Line" Rule
To achieve a high-end, seamless feel, **1px solid borders for sectioning are strictly prohibited.** Boundaries must be defined exclusively through background color shifts or tonal transitions.
- Use `surface-container-low` for large layout regions.
- Use `surface-container-lowest` to define active workspace cards.
- This creates a "molded" look, as if the UI was cast from a single piece of material.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of industrial glass and polished metal.
- **Base Layer:** `surface` (#f8f9fa)
- **Primary Containers:** `surface-container` (#eaeff1)
- **Nested Detail Work:** `surface-container-high` (#e3e9ec)
- **Active Focus:** `surface-container-lowest` (#ffffff) for a "lifted" appearance.

### The "Glass & Gradient" Rule
Floating elements (such as inspection overlays or tooltips) should employ **Glassmorphism**. Use `surface` colors at 80% opacity with a `24px backdrop-blur`. Main CTAs should avoid flat fills; instead, use a subtle vertical gradient from `primary` (#516169) to `primary_dim` (#45555d) to provide a "machined" satin finish.

## 3. Typography: Precision Editorial
We pair the technical rigor of **Inter** with the architectural character of **Manrope**.

*   **Display & Headlines (Manrope):** These are our "Statement" levels. Use `display-lg` and `headline-md` with generous letter spacing to provide an authoritative, editorial feel. These are used for factory stats and high-level status.
*   **Body & Labels (Inter):** The "Workhorse" levels. `body-md` and `label-sm` provide maximum legibility for technical specifications and sensor data. 
*   **Hierarchy Note:** High contrast in size, but low contrast in weight. We prefer `Light` or `Regular` weights even for headers to maintain the "Zen" atmosphere.

## 4. Elevation & Depth
In this system, depth is felt, not seen. We move away from heavy drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card atop a `surface-container-low` background. This creates a natural, soft lift that mimics the way light hits a machined surface.
*   **Ambient Shadows:** If an element must float (e.g., a critical alert), use a shadow with a `40px blur` at `6% opacity`, tinted with `on_surface` (#2b3437). This mimics natural ambient occlusion rather than a "web shadow."
*   **The Ghost Border Fallback:** If accessibility requires a stroke, use a "Ghost Border"—the `outline_variant` (#abb3b7) at **15% opacity**. Never use 100% opaque lines.

## 5. Components
Each component is designed to feel like a tactile part of a precision instrument.

### Buttons & Chips
*   **Primary Action:** A satin-finish gradient using `primary`. Roundedness: `md` (0.375rem).
*   **Secondary/Tertiary:** No background. Use `label-md` in `primary` text. The interaction is signaled by a subtle shift to `primary_container` on hover.
*   **Filter Chips:** Use `secondary_container` (#c1ebdf) with `on_secondary_container` (#325950) text. These should feel like soft teal highlights in a gray world.

### Input Fields & Data
*   **Text Inputs:** No bottom line or box. Use a subtle background fill of `surface_container_high`. Upon focus, transition the background to `surface_container_lowest`.
*   **Cards & Lists:** **Strictly forbid dividers.** Separate list items using `12px` of vertical whitespace. If separation is visually required, use a alternating background tint of 2% difference.

### Specialist Industrial Components
*   **Inspection Points:** Use `surface_tint` circles with a subtle `primary_fixed` pulse for points of interest on a casting model.
*   **The "Silent" Alert:** For non-critical errors, avoid bright reds. Use `error_container` (#fe8983) with `on_error_container` text, but keep the saturation muted to prevent operator fatigue.

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts for dashboard summaries to create visual interest.
*   **Do** use "Negative Space" as a functional tool to separate high-density technical data.
*   **Do** apply `rounded-xl` (0.75rem) to large containers to soften the "industrial" edge.

### Don’t
*   **Don’t** use pure black (#000) or high-contrast borders. It breaks the "Zen" immersion.
*   **Don’t** use standard "Material Design" shadows. They feel too generic for this premium context.
*   **Don’t** clutter the screen. If a piece of data isn't vital for the current inspection step, hide it in a "Layered Surface" accessible via hover or tap.