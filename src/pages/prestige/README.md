# Prestige Page

Prestige is a gated room view that replaces the old Workshop prestige popup. It shows milestone resets and prestige point capacity rewards after level 7.

Keep it as sparse page-scroll content with normal `style-box` weight: one description box, same-width milestone boxes, and separate same-width point reward boxes. Put Prestige box titles/status content inside boxes, not as border labels. Do not use popup backdrop, close label, dialog shadow, offset cards, or extra gameplay rules. All prestige completion behavior stays behind `gameplayFacade.completePrestigeMilestone`.
