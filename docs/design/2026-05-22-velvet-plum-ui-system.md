# Velvet Plum UI System

## Purpose

This document is the source of truth for the confirmed Couple Memory dashboard style.
It captures the final visual direction established in:

- [dashboard-editorial-mockup-velvet-plum.html](/Users/user/Documents/codes/work/docs/design/dashboard-editorial-mockup-velvet-plum.html)

Use this document when designing or implementing:

- New dashboard pages
- New UI components
- Form controls such as inputs, selects, date pickers, time pickers
- Modal, drawer, table, filter, toolbar, and settings surfaces

The goal is consistency, not one-off visual imitation.

## Quick Trigger

For day-to-day collaboration, use this short directive:

- `酒红色风格`

Meaning:

- Follow the approved Couple Memory visual system in this document
- Reuse the same compact editorial density
- Reuse the same romantic nocturne palette and control language
- Apply the same rules to pages, cards, forms, inputs, date pickers, time pickers, modals, and other UI surfaces

Recommended shorthand prompts:

```text
把这个页面改成酒红色风格。
```

```text
这个时间选择器要用酒红色风格来做。
```

```text
新的设置页继续沿用酒红色风格。
```

## Design Intent

This system should feel like:

- Romantic, editorial, and quietly dramatic
- Intimate and memory-oriented, not SaaS-generic
- Compact and screen-efficient, not oversized or presentation-like
- Premium and calm, with controlled ornament instead of loud decoration

This system should not feel like:

- Generic AI product UI
- Purple gradient startup marketing
- Wedding-invitation sweetness
- Corporate blue productivity software
- Oversized airy mockup layouts that do not fit real product density

## Core Principles

1. Keep the emotional tone warm and intimate, but never cute.
2. Use editorial hierarchy: strong headings, soft body text, elegant numbers.
3. Favor compact rhythm over large empty space.
4. Let gradients act like material or atmosphere, not like decoration pasted on top.
5. Active states should feel inset and refined, not neon or glowy.
6. Surfaces should be layered and restrained: panel, strong panel, accent wash.
7. Every component should feel like it belongs in the same photographic workspace.

## Source Tokens

These are the visual foundations taken from the final HTML mockup.

### Typography

Use these stacks unless the project later adopts self-hosted fonts:

```css
--font-display: "Baskerville", "Times New Roman", "Georgia", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif;
--font-sans: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif;
```

Rules:

- Display font is for major page titles, large metrics, and editorial callouts.
- Sans font is for navigation, labels, controls, helper text, and body copy.
- Do not mix in unrelated playful or geometric fonts.
- Avoid bold-heavy interfaces. Contrast should come from scale and spacing first.

### Light Theme Tokens

```css
--bg: #f1eded;
--bg-2: #faf7f7;
--panel: rgba(255, 251, 253, 0.78);
--panel-strong: rgba(255, 255, 255, 0.9);
--sidebar-bg: rgba(244, 238, 241, 0.84);
--text: #20171c;
--text-soft: rgba(32, 23, 28, 0.64);
--text-faint: rgba(32, 23, 28, 0.36);
--line: rgba(32, 23, 28, 0.1);
--accent: #6f4f66;
--accent-2: #c9a2a1;
--accent-3: #edd9d5;
--accent-soft: rgba(111, 79, 102, 0.12);
--accent-glow: rgba(111, 79, 102, 0.2);
--hero-gradient: linear-gradient(135deg, #4a2f42 0%, #8f607a 42%, #d7bbb7 100%);
--active-gradient: linear-gradient(135deg, #5b3a52 0%, #c9a2a1 100%);
--surface-gradient: linear-gradient(135deg, rgba(111, 79, 102, 0.12), rgba(201, 162, 161, 0.08));
```

### Dark Theme Tokens

```css
--bg: #161116;
--bg-2: #211820;
--panel: rgba(35, 24, 33, 0.72);
--panel-strong: rgba(42, 28, 39, 0.9);
--sidebar-bg: rgba(28, 20, 27, 0.88);
--text: #f7edf3;
--text-soft: rgba(247, 237, 243, 0.68);
--text-faint: rgba(247, 237, 243, 0.38);
--line: rgba(247, 237, 243, 0.1);
--accent: #d5a6b5;
--accent-2: #8b657e;
--accent-3: #33202e;
--accent-soft: rgba(213, 166, 181, 0.12);
--accent-glow: rgba(213, 166, 181, 0.16);
--hero-gradient: linear-gradient(135deg, #2c1625 0%, #5a3550 38%, #a97684 100%);
--active-gradient: linear-gradient(135deg, #70455f 0%, #b78795 100%);
--surface-gradient: linear-gradient(135deg, rgba(213, 166, 181, 0.1), rgba(91, 53, 80, 0.18));
```

### Shape and Elevation

```css
--radius-xl: 24px;
--radius-lg: 18px;
--radius-md: 14px;
--shadow-soft: 0 14px 38px rgba(40, 24, 34, 0.08);
--shadow-card: 0 8px 22px rgba(40, 24, 34, 0.06);
```

Rules:

- Use rounded corners generously, but keep them controlled.
- Avoid sharp corners unless the component is extremely small and dense.
- Shadows should be soft and low-contrast, never hard or high blur with dark halos.

## Layout Rules

The approved layout direction is `compact editorial dashboard`.

Rules:

- Prioritize fitting the primary information skeleton into one screen whenever possible.
- Compress vertical spacing before compressing typography too aggressively.
- Sidebar should feel like a compact contents column, not a large marketing rail.
- Hero sections should be short and decisive, not tall banners.
- Metric cards should read quickly and avoid excess description.
- Large summary cards should feel like product modules, not presentation slides.

Recommended rhythm:

- App shell gap: tight
- Surface padding: medium-tight
- Intra-card spacing: tight-medium
- Section-to-section spacing: tight

## Motion Rules

Use motion sparingly and purposefully.

Allowed:

- Small hover lift
- Gentle color or border transition
- Soft active-state glow
- Theme transition

Avoid:

- Bouncy movement
- Long page-load choreography
- Overly glossy shimmer
- Large blur pulses

Recommended timing:

- 160ms to 220ms for most UI transitions
- Easing should feel calm and controlled

## Component Standards

### Navigation

Use editorial compact navigation with:

- Small circular index token on the left
- Main Chinese label
- Small uppercase English label below
- Optional right-side serif marker

Active state rules:

- Use `--active-gradient`
- Use a subtle inner highlight and thin inner border
- Keep glow controlled
- Do not use thick outlines or loud shadows

### Top Bar

Keep it minimal:

- Small uppercase context label
- Optional compact badge on the right

No giant toolbars unless the page truly needs complex controls.

### Hero

Hero is a short editorial summary, not a landing-page hero.

Include:

- Small eyebrow
- Large title
- One concise paragraph
- Optional supporting side panel

Avoid:

- Huge illustrations
- Multi-row CTA clusters
- Overly tall compositions

### Metric Cards

Each stat card should contain:

- Uppercase English label
- Large serif number
- Small unit
- One short line of supporting text at most

Rules:

- Keep height low
- Keep copy short
- Maintain one accent divider near the bottom

### Summary Cards

For readiness, overview, or narrative summary cards:

- Use two-part composition when useful
- Left side for narrative or explanation
- Right side for large numeric emphasis

Keep both halves compact.

### Buttons

Default button direction:

- Filled primary buttons use active gradient or accent gradient
- Secondary buttons use panel background plus line border
- Radius should match surrounding system

Rules:

- Avoid generic blue
- Avoid high-saturation pink
- Avoid oversized pill buttons unless context explicitly calls for it

### Inputs

Inputs should feel calm and tactile, not default browser gray.

Recommended style:

- Panel-like background
- Thin border in `--line`
- Soft focus ring using accent glow
- Slightly rounded corners, usually `--radius-md`
- Tight but comfortable height

Rules:

- Placeholder text should use `--text-faint`
- Body text should use `--text`
- Focus state should be subtle and premium, not bright neon

### Selects and Dropdowns

Use the same surface language as inputs.

Rules:

- Dropdown menu should use `--panel-strong`
- Hover rows should use `--surface-gradient` or a low-opacity accent wash
- Selected row should feel inset or gently highlighted

### Date Picker and Time Picker

These controls must feel native to the system, not imported from a random library theme.

Rules:

- Calendar surface should use panel tokens
- Today and selected states should use accent language
- Range selection or hover selection should use low-opacity accent wash
- Month and time controls should inherit the same compact button/input shape system

If using a third-party picker:

- Override default blues and default shadows
- Override default radii
- Override typography to match system stacks

### Modals and Drawers

Rules:

- Background surface should use `--panel-strong`
- Title uses display font only if the modal is editorial or summary-oriented
- Form-oriented modal titles can stay sans
- Backdrop should be darkened gently, not fully opaque

### Tables and Dense Data

If the page becomes data-heavy:

- Keep the overall palette
- Reduce decorative gradients
- Increase clarity before adding flourish
- Use subtle row separators and compact spacing

## Do / Do Not

Do:

- Reuse the same token language across pages
- Keep components compact
- Preserve the romantic nocturne tone
- Use serif contrast for key titles and numbers
- Test both light and dark mode when relevant

Do not:

- Introduce unrelated color accents
- Revert to generic default component library styles
- Make new pages taller and looser than the approved dashboard
- Use excessively rounded toy-like inputs
- Use purple-on-white startup gradients

## Implementation Workflow

When building a new page or component, use this order:

1. Read this document.
2. Open [dashboard-editorial-mockup-velvet-plum.html](/Users/user/Documents/codes/work/docs/design/dashboard-editorial-mockup-velvet-plum.html).
3. Identify which existing approved patterns apply.
4. Reuse tokens and component rules instead of inventing new visual language.
5. Validate light/dark behavior if the component supports both.

## Reuse Checklist

Before considering a new page or component finished, verify:

- The page still feels like the same product as the Velvet Plum dashboard
- Spacing is compact enough for real product density
- Accent colors stay within the approved palette
- Controls do not look like default third-party widgets
- Hover, active, and focus states are subtle and premium
- Typography hierarchy matches the approved editorial tone

## How To Use

For future design or implementation requests, reference both files explicitly:

- [2026-05-22-velvet-plum-ui-system.md](/Users/user/Documents/codes/work/docs/design/2026-05-22-velvet-plum-ui-system.md)
- [dashboard-editorial-mockup-velvet-plum.html](/Users/user/Documents/codes/work/docs/design/dashboard-editorial-mockup-velvet-plum.html)

Recommended prompt patterns:

```text
按 Velvet Plum UI System 规范，为相册页做一个新布局。先遵循 docs/design/2026-05-22-velvet-plum-ui-system.md，再参考 docs/design/dashboard-editorial-mockup-velvet-plum.html。
```

```text
为这个表单组件做视觉改造，要求完全遵循 Velvet Plum UI System，尤其是输入框、按钮、间距和亮暗主题。
```

```text
基于 Velvet Plum UI System 实现一个时间选择控件，不能出现默认蓝色、默认圆角和第三方库原生皮肤感。
```

You can also use the shorthand trigger:

```text
按酒红色风格实现这个页面。
```

## Why This Is Stored As A Document

This repo document is the most stable source of truth because:

- It lives with the project
- It is versionable
- It is easy to update alongside UI work
- It can be referenced by future implementation tasks directly

For automated or skill-based reuse, see the companion skill source folder:

- [velvet-plum-ui-system/SKILL.md](/Users/user/Documents/codes/work/docs/design/velvet-plum-ui-system/SKILL.md)
- [velvet-plum-ui-system/component-tokens.md](/Users/user/Documents/codes/work/docs/design/velvet-plum-ui-system/component-tokens.md)
