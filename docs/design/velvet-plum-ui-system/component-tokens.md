# Velvet Plum Component Tokens

## Purpose

This file turns the confirmed Velvet Plum direction into component-level implementation tokens.
Use it together with:

- [../2026-05-22-velvet-plum-ui-system.md](/Users/user/Documents/codes/work/docs/design/2026-05-22-velvet-plum-ui-system.md)
- [../dashboard-editorial-mockup-velvet-plum.html](/Users/user/Documents/codes/work/docs/design/dashboard-editorial-mockup-velvet-plum.html)

This file is for real UI building work:

- Input
- Textarea
- Select
- Date picker
- Time picker
- Button
- Card
- Modal
- Drawer
- Table
- Tabs
- Badge
- Empty state

## Quick Trigger

Shorthand directive for this whole token system:

- `酒红色风格`

If a request says a page, component, or control should use `酒红色风格`, interpret it as:

- Follow the Velvet Plum palette
- Keep compact editorial density
- Reuse the same focus, active, and surface treatment
- Avoid default third-party control styling

## Base Tokens

These tokens should be promoted into the real application design system when implementation starts.

```css
--vp-font-display: "Baskerville", "Times New Roman", "Georgia", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif;
--vp-font-sans: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif;

--vp-radius-xl: 24px;
--vp-radius-lg: 18px;
--vp-radius-md: 14px;
--vp-radius-sm: 12px;
--vp-radius-xs: 10px;

--vp-shadow-soft: 0 14px 38px rgba(40, 24, 34, 0.08);
--vp-shadow-card: 0 8px 22px rgba(40, 24, 34, 0.06);
--vp-shadow-focus-light: 0 0 0 3px rgba(111, 79, 102, 0.16);
--vp-shadow-focus-dark: 0 0 0 3px rgba(213, 166, 181, 0.18);

--vp-border-light: rgba(32, 23, 28, 0.1);
--vp-border-dark: rgba(247, 237, 243, 0.1);

--vp-text-light: #20171c;
--vp-text-soft-light: rgba(32, 23, 28, 0.64);
--vp-text-faint-light: rgba(32, 23, 28, 0.36);

--vp-text-dark: #f7edf3;
--vp-text-soft-dark: rgba(247, 237, 243, 0.68);
--vp-text-faint-dark: rgba(247, 237, 243, 0.38);

--vp-accent-light: #6f4f66;
--vp-accent-2-light: #c9a2a1;
--vp-accent-3-light: #edd9d5;

--vp-accent-dark: #d5a6b5;
--vp-accent-2-dark: #8b657e;
--vp-accent-3-dark: #33202e;

--vp-active-gradient-light: linear-gradient(135deg, #5b3a52 0%, #c9a2a1 100%);
--vp-active-gradient-dark: linear-gradient(135deg, #70455f 0%, #b78795 100%);

--vp-surface-gradient-light: linear-gradient(135deg, rgba(111, 79, 102, 0.12), rgba(201, 162, 161, 0.08));
--vp-surface-gradient-dark: linear-gradient(135deg, rgba(213, 166, 181, 0.1), rgba(91, 53, 80, 0.18));
```

## Density Tokens

Velvet Plum uses compact editorial density, not roomy showcase spacing.

```css
--vp-page-gap: 12px;
--vp-section-gap: 10px;
--vp-card-gap: 8px;

--vp-pad-xl: 18px;
--vp-pad-lg: 16px;
--vp-pad-md: 14px;
--vp-pad-sm: 12px;
--vp-pad-xs: 10px;

--vp-control-height-lg: 44px;
--vp-control-height-md: 40px;
--vp-control-height-sm: 36px;

--vp-icon-size-lg: 18px;
--vp-icon-size-md: 16px;
--vp-icon-size-sm: 14px;
```

Rules:

- Default to `md` heights for common form controls.
- Use `sm` only in dense filter bars or inline editors.
- Avoid `48px+` controls unless touch-first mobile context requires it.

## Typography Tokens

```css
--vp-text-hero: clamp(36px, 4.4vw, 56px);
--vp-text-title: clamp(24px, 2.6vw, 32px);
--vp-text-metric: clamp(34px, 3.6vw, 46px);
--vp-text-score: clamp(58px, 6.8vw, 82px);

--vp-text-body: 13px;
--vp-text-body-line: 1.62;

--vp-text-ui: 14px;
--vp-text-ui-small: 12px;
--vp-text-caption: 11px;
--vp-text-micro: 9px;
```

Rules:

- Use display font only for hero titles, section titles, large metrics, and select editorial callouts.
- All controls, table cells, labels, and helper text remain sans.
- Avoid using display font inside input values or dense interactive controls.

## Surface Tokens

### Light

```css
--vp-bg-light: #f1eded;
--vp-bg-2-light: #faf7f7;
--vp-panel-light: rgba(255, 251, 253, 0.78);
--vp-panel-strong-light: rgba(255, 255, 255, 0.9);
--vp-sidebar-light: rgba(244, 238, 241, 0.84);
```

### Dark

```css
--vp-bg-dark: #161116;
--vp-bg-2-dark: #211820;
--vp-panel-dark: rgba(35, 24, 33, 0.72);
--vp-panel-strong-dark: rgba(42, 28, 39, 0.9);
--vp-sidebar-dark: rgba(28, 20, 27, 0.88);
```

Surface hierarchy:

1. App background
2. Shell or sidebar background
3. Main panel
4. Strong panel for cards and controls
5. Surface gradient for hover, active wash, or grouped utility blocks

## Interaction Tokens

```css
--vp-transition-fast: 160ms ease;
--vp-transition-base: 180ms ease;
--vp-transition-soft: 220ms ease;
```

Active-state treatment:

```css
border-color: rgba(255, 255, 255, 0.18);
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.22),
  inset 0 0 0 1px rgba(255, 255, 255, 0.08),
  0 10px 22px var(--accent-glow);
```

Focus-state treatment:

- Light mode uses a low-opacity plum ring
- Dark mode uses a low-opacity rose ring
- Focus must never revert to browser default blue

## Component Recipes

## Button

### Primary

```css
height: var(--vp-control-height-md);
padding: 0 14px;
border-radius: var(--vp-radius-md);
background: var(--vp-active-gradient-light);
color: #fffafc;
border: 1px solid rgba(255, 255, 255, 0.18);
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.22),
  inset 0 0 0 1px rgba(255, 255, 255, 0.08),
  0 10px 22px var(--vp-accent-glow);
```

Rules:

- Use for main actions only
- Never add blue hover or browser default focus
- Hover may slightly lift or deepen contrast

### Secondary

```css
background: var(--vp-panel-strong);
border: 1px solid var(--vp-border);
color: var(--vp-text);
```

### Ghost

```css
background: transparent;
border: 1px solid transparent;
color: var(--vp-text-soft);
```

Use ghost only inside toolbars, tabs, or table actions.

## Input

```css
height: var(--vp-control-height-md);
padding: 0 12px;
border-radius: var(--vp-radius-md);
border: 1px solid var(--vp-border);
background: var(--vp-panel-strong);
color: var(--vp-text);
font: 14px/1 var(--vp-font-sans);
```

States:

- Placeholder: `--vp-text-faint`
- Hover: slightly stronger border
- Focus: accent ring and subtle border deepening
- Disabled: lower contrast and flatter background

Do not:

- Use filled gray native input backgrounds
- Use overly rounded pill inputs by default

## Textarea

```css
min-height: 104px;
padding: 10px 12px;
border-radius: var(--vp-radius-md);
```

Rules:

- Same border and focus system as input
- Use moderate resize behavior or fixed height based on product need
- Keep helper text small and soft

## Select

Closed state should visually match input.

Rules:

- Right icon should be small and understated
- Menu panel uses `panel-strong`
- Selected option uses accent wash or active gradient depending on importance
- Avoid browser-native arrow if custom styling is possible
- Menu panel should be visually opaque in both themes; underlying page content should not read through the surface
- Selected option must be explicitly tested in light theme for text contrast, not inferred from dark-theme success
- Prefer shared semantic surface classes for panel and selected-row states instead of per-component inline arbitrary-value gradients

## Date Picker

Date picker styling rules:

- Outer surface uses `panel-strong`
- Calendar cell radius: `10px` or `12px`
- Default day text stays sans
- Month label may remain sans unless the picker is editorial showcase oriented
- Selected day may use active gradient
- Hover day uses surface gradient
- Today state uses thin accent outline or low-opacity fill
- Picker surface should read as a solid premium panel, not a translucent haze over the page
- Selected day must maintain strong text contrast in light theme and dark theme independently

Third-party overrides to require:

- Remove default blue selected cell
- Remove default heavy drop shadow
- Match border, radius, background, and text hierarchy

Implementation guidance for both select and date picker:

- Treat `floating panel`, `selected row`, and `selected day` as system states with reusable global styles
- Avoid encoding key visual states only inside long inline utility strings
- If a state is important enough to appear across multiple controls, promote it into a named global class or token-backed component style

## Time Picker

Rules:

- Same closed-field styling as input/select
- Dropdown or wheel surface must use panel tokens
- Active time option uses accent wash or refined gradient
- Focus ring follows Velvet Plum focus logic

If using segmented time controls:

- Each segment should feel like a small secondary control
- Avoid sharp separators and default OS chrome

## Search Field

Search is a denser input variant:

```css
height: var(--vp-control-height-sm);
padding: 0 12px 0 34px;
border-radius: var(--vp-radius-sm);
```

Rules:

- Prefix icon should be muted
- Use this in toolbars, tables, and filter strips

## Card

```css
border-radius: var(--vp-radius-lg);
padding: 12px 13px 13px;
background: var(--vp-panel-strong);
border: 1px solid var(--vp-border);
box-shadow: var(--vp-shadow-card);
```

Rules:

- Card should feel compact
- Use short labels and concise body copy
- Add one subtle accent divider if the card represents a metric or summary

## Modal

Rules:

- Radius: `24px`
- Padding: `16px` to `18px`
- Background: `panel-strong`
- Backdrop: soft dark veil, not heavy black overlay
- Primary action aligns with primary button tokens

Modal title guidance:

- Use display font only for narrative or showcase modals
- Use sans for operational dialogs and forms

## Drawer

Rules:

- Same panel hierarchy as modal
- Keep toolbar and footer compact
- Do not let drawer internals become visually looser than the dashboard

## Tabs

Tabs should feel closer to compact navigation than to marketing pills.

Rules:

- Use low-height segmented containers
- Active tab may use refined inner-highlight treatment
- Keep labels short

## Table

Rules:

- Compact row height
- Minimal separators
- No striped default admin-table look unless needed
- Headers use small uppercase or small sans with soft emphasis
- Actions use ghost or secondary mini-buttons

## Badge and Tag

Rules:

- Radius: `999px`
- Height: visually compact
- Use accent wash or panel background
- Avoid loud semantic colors unless status meaning is critical

Semantic palette guidance:

- Success: muted sage, not bright green
- Warning: dusty amber, not saturated orange
- Error: wine or mulberry red, not default red

## Empty State

Rules:

- Use one short title
- One calm paragraph
- Optional single primary action
- Avoid cartoon illustrations by default

## Control State Matrix

All controls should explicitly define:

- default
- hover
- focus-visible
- active
- disabled
- error
- success if applicable

If a third-party component cannot be styled across all of these states, it is not visually complete.

## How To Use In Development

When asking an LLM or coding agent to build something, reference this file directly.

Examples:

```text
基于 Velvet Plum UI System 和 component-tokens.md，做一个表单页。输入框、select、时间选择器都要遵循这里的 token 和状态规则。
```

```text
实现一个 date picker，先遵循 docs/design/velvet-plum-ui-system/component-tokens.md，再参考 dashboard-editorial-mockup-velvet-plum.html 的色彩与密度。
```

```text
把这个第三方时间选择器改造成 Velvet Plum 风格，重点覆盖默认、hover、focus、active、disabled 状态。
```

```text
把这个表单改成酒红色风格，尤其看 input、select、button、date picker。
```

## Skill Discovery Note

This file lives inside the repository and is not automatically installed as a global Codex skill.

That means:

- It can always be read when explicitly referenced by path or by project context.
- It will not automatically appear in Codex's globally installed skill list unless you install it into `~/.codex/skills`.

For this project, explicit repo-based referencing is usually enough.
