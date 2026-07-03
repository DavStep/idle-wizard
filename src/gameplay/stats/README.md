# Gameplay Stats

Stats owns lifetime production and coin-source counters. It observes successful gameplay events from `GameplayFacade` and persists only stable item keys plus coin totals.

Keep page code read-only: pages may render the stats snapshot, but counting belongs here.
