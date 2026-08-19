# Prestige Page

Prestige is a gated room view that replaces the old Workshop prestige popup. It shows milestone resets and prestige point capacity rewards after level 7.

Use the Market title ribbon for the room identity and owned Prestige Point stars.
Below it, use Research station title plaques for the `Description` and
`Progression` sections. The description and milestone/point rows extend the
Research paper-card composition, including its art well, rank badge, resource
icons, and compact action slot. Project icon-backed `Main` and `Points` into the
alternate bottom HUD instead of rendering a page-local tab row. The same strip
keeps an icon-backed `Workshop` return tab. Prestige is entered from the
Workshop left-side Prestige action and does not appear in normal room tabs.

Prestige remains a normal room page: do not add a popup backdrop, close label,
dialog shadow, or product-local gameplay rules. All prestige completion
behavior stays behind `gameplayFacade.completePrestigeMilestone`.
