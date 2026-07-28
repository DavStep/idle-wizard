# Prestige Page

Prestige is a gated room view that replaces the old Workshop prestige popup. It shows milestone resets and prestige point capacity rewards after level 7.

Use the Market title ribbon for the room identity and owned Prestige Point stars.
Below it, use Research station title plaques for the `Description` and
`Progression` sections. The description and milestone/point rows extend the
Research paper-card composition, including its art well, rank badge, resource
icons, and compact action slot. Keep `Main` and `Points` as fixed tabs above
World Chat.

Prestige remains a normal room page: do not add a popup backdrop, close label,
dialog shadow, or product-local gameplay rules. All prestige completion
behavior stays behind `gameplayFacade.completePrestigeMilestone`.
