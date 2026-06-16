---
name: idle-wizard-tutorial-ui
description: Use for Idle Wizard tutorial and FTUE UI work, including Elara guide boxes, objective panels, target hints, tutorial overlays, intro dialogs, action reminders, pointer cues, data-tutorial-id placement, tutorial box sizing, and tutorial screenshot QA. Use with impeccable for any tutorial UI, UX, layout, visual, popup, dialog, label, or flow change or review.
---

# Idle Wizard Tutorial UI

## Workflow

1. Read `experience.md`, `PRODUCT.md`, `DESIGN.md`, `docs/style.md`, and `docs/ui-patterns.md` before editing.
2. Use `impeccable` too when the task changes tutorial UI/UX/layout/visual flow.
3. Identify the tutorial surface: intro dialog, objective panel, target hint, action reminder, pointer cue, or popup.
4. Reuse the closest documented box, popup, border-label, tab, and row pattern.
5. Place tutorial UI around the live control, then verify with browser screenshots.

## Hard Rules

- Keep one main guide surface visible at a time. Never stack a target hint box with an objective box.
- A pointer cue may coexist with an open objective panel only when the objective asks for target guidance.
- Tutorial UI must not cover the current target, the CTA needed to continue, relevant resource values, page tabs, the top status panel, or the Elara objective button.
- Hide guidance during timer waits. Resume when the next actionable control is ready.
- Press-to-advance prompts stay visible until pressed. Action reminders may auto-hide.
- Use pointer-only target cues. Do not draw rectangular target frames, cloned target DOM, or under-row marks.
- Do not add skip controls unless the user explicitly requests them.
- Only guide body and objective copy typewrite. Names, step labels, and action labels appear immediately.
- When hiding terminal/tutorial UI, clear inner prompt, objective, and button state so stale content cannot flash later.
- Keep Elara's visible image size stable between guide portraits and the objective button. Enlarge hit area separately if needed.

## Style Rules

- Follow the project style: black text, white surfaces, compact source UI, no decoration.
- Keep source typography at the project scale: body text `13px`, dialog title `14px`, border label `11px`.
- Use lowercase player-facing labels.
- Use embedded border labels with a white surface mask over the border.
- Ordinary tutorial hints use the simple room-box feel. Reserve `2px` border, `20px` padding, and bottom-right shadow for real popup/dialog panels.
- Do not add gradients, rounded cards, icons, textures, colorful panels, oversized text, or decorative shadows.
- Keep intro dialog sizing separate from target hint and objective sizing. Do not apply long-copy dialog dimensions to all tutorial boxes.

## Target Placement

- Put `data-tutorial-id` on the real actionable control, not a parent row, fake overlay, decorative wrapper, or price/value span.
- For task opening, target the `expand` toggle.
- For NPC market item guidance, target stand or item name spans so the pointer avoids demand and price controls.
- For level-up guidance, target the full completion row when gold/progress context must stay visible.
- Measure live target rects after layout settles; wait a frame after opening hidden panels or changing tutorial state.
- Prefer collision checks against visible controls over hard-coded slots. In particular, Elara objective placement must avoid the level-3 Workshop secondary button band by checking visible controls.
- If target guidance cannot fit without blocking the target, use pointer-only cue or move the objective panel before adding another box.

## QA Checklist

- Reuse the shared dev server at `http://127.0.0.1:55173/`; check `npm run dev:status` before starting it.
- Verify at mobile portrait and desktop fitted views when the tutorial UI changed.
- Screenshot the tutorial state and inspect overlap: target visible, CTA tappable, relevant resource text readable, top/bottom chrome coherent, no cropped box.
- Click through at least the edited tutorial step and the next step.
- Check CSS for forbidden treatment: large font bumps, rounded cards, decorative color, ordinary-box shadows, or dialog styles leaking onto non-dialog hints.
- If screenshot or click QA is not possible, say exactly what remains unverified.

## Boundaries

- Ask before changing unclear tutorial gameplay behavior, progression order, auto-advance rules, or reward/economy behavior.
- Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code unless the user explicitly asks.
