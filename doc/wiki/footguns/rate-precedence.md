# Rate precedence

When more than one rate covers a time, the pricing picks by rank:

| Rate | Rank |
|---|---|
| This space, this day | 3 |
| This space, daily | 2 |
| All spaces, this day | 1 |
| All spaces, daily | 0 |

The highest rank wins. If two rates have the same top rank, the booking fails with `RATE_CONFLICT`. The app does not guess.

A rate for one space that is "daily" beats an all-spaces rate for a given day. This can surprise an admin who adds a Saturday discount for all spaces: a space-specific daily rate still wins on Saturday in that space.

A time that no rate covers is closed. The booking fails with `NO_RATE`. In the seed, Sunday has no rate.

Code: `src/server/pricing.ts`.
