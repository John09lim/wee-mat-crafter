# WeeLMat Design System

This file is the product-wide source of truth. Page overrides under `pages/` may change composition and density, but never the brand palette, type families, accessibility baseline, or interaction language.

## Product character

WeeLMat is an institutional education productivity tool for Filipino teachers, school heads, supervisors, learners, and families. The interface should feel calm, trustworthy, editorial, document-led, and practical. It is not a children’s game, a generic blue SaaS dashboard, or a futuristic AI product.

## Brand tokens

| Role | Value | Usage |
| --- | --- | --- |
| Forest | `#173F2A` | Header, strong surfaces, display text |
| Action green | `#236130` | Primary actions, focus, selected state |
| Gold | `#D6A73D` | Active rules, small highlights, secondary CTA |
| Cream | `#F6F0E7` | Main page background |
| Paper | `#FFFCF7` | Cards, forms, tables, documents |
| Ink | `#142019` | Primary body copy |
| Muted ink | `#526159` | Supporting copy |
| Warm border | `#D8D0C4` | Rules, inputs, panels |
| Success | `#17613A` | Approved/complete with icon and text |
| Warning | `#8A5A00` | Pending/attention with icon and text |
| Danger | `#A83224` | Error/returned/destructive with icon and text |
| Info | `#245A73` | Informational notices with icon and text |

Color must never be the only status cue. Do not introduce neon green, generic SaaS blue, black backgrounds, gradient blobs, or multicolor icon tiles.

## Typography

- Display: `Lora`, Georgia, serif. Use for page titles, section titles, selected document/day labels, and important statements.
- UI/body: `Raleway`, system sans-serif. Use deliberately at 14–16px for controls/data and at least 16px for mobile inputs and body copy.
- Body line-height: 1.55–1.7. Long-form measure: 60–75 characters desktop, 35–60 mobile.
- Data columns and dates use tabular numerals.
- Avoid all-caps paragraphs. Small utility labels may use uppercase with generous tracking.

## Spacing and geometry

- 4/8px base rhythm. Primary gaps: 8, 12, 16, 24, 32, 48, 64.
- Responsive gutters: 16px phone, 24px tablet, 32–48px desktop.
- Control height: minimum 44px. Default inputs and buttons: 44–48px.
- Radius scale: 8px controls, 12px panels/tables, 16px featured surfaces, 28–32px only for major marketing moments.
- Shadows remain paper-like and restrained. Prefer borders/rules to nested elevated cards.

## Component language

- Headers are quiet: official brand mark, essential navigation, one primary action.
- Marketing pages use open editorial bands, document imagery, real institutional photography, and varied section rhythm.
- Workspaces use a forest header, clear page title, contextual navigation, open grouped sections, tables/lists, sticky summary rails, and one primary task.
- Forms use visible labels, helper text where necessary, inline errors, `aria-invalid`, focus management, and progressive disclosure.
- Data pages lead with decisions and exceptions. Use tables on desktop and stacked records on mobile, not dashboard card grids.
- Status indicators combine icon, text, and accessible semantic color.
- Dialogs/sheets have a 40–60% scrim, mobile margins, max-height based on `100dvh`, clear close/escape, and visible focus.
- Empty/loading/error states always explain what happened and offer a next action or retry when possible.

## Motion

- Micro-interactions: 150–250ms.
- Page/section entrance: 300–450ms maximum.
- Animate transform and opacity, not width/height/layout properties.
- Use crossfade for state replacement, short slide for drawers, and subtle 0.98 press feedback.
- Never scroll-jack. Respect `prefers-reduced-motion`; smooth scrolling becomes auto.
- Limit each view to one or two meaningful motion cues.

## Accessibility and responsive baseline

- WCAG AA text contrast, visible 2–3px focus ring, keyboard-operable actions, and logical heading order.
- Every page exposes a `main` landmark and supports a skip link.
- Every icon-only action has an accessible name and tooltip where useful.
- No horizontal page overflow at 375px. Tables use controlled overflow or mobile records.
- Touch targets are at least 44×44px with 8px separation.
- Verify 375×812, 768×1024, 1024×768, and 1440×900 plus reduced motion.

## Product-wide anti-patterns

- No fake metrics, invented claims, decorative badges, emoji icons, excessive gradients, glassmorphism, or bento-grid filler.
- No giant stack of indistinguishable cards.
- No placeholder-only labels, toast-only form validation, inert clickable divs, or color-only states.
- Do not bury the main task below profile/account cards.
- Do not duplicate the marketing footer inside workspace pages.
- Do not change the established WeeLMat logo proportions or forest/cream/gold palette.

## Accepted visual references

- `design-references/weelmat-accepted-redesign.png`
- `design-references/weelmat-auth-concept.png`
- `design-references/weelmat-generator-workspace-concept.png`
- `design-references/weelmat-admin-dashboard-concept.png`
- `design-references/weelmat-account-workspace-concept.png`
