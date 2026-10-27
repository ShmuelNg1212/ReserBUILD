# Architecture

This page holds the intent behind the structure. Read the code for the structure itself.

## Rules live in plain functions, not in Next

`src/server/` holds the domain: each function takes a database handle, the actor, the input, and `now`. It checks the role first (`requireRole`), then applies the rules. Tests call these functions directly against `reserbuild_test`. Next is a thin shell: server actions in `src/app/actions/` read the session and call one domain function; pages read data the same way.

Why: the money and booking rules must be testable without a browser, and every Next server action is reachable by a direct POST. An authorization check in the page alone would not protect the action.

## The database is the last guard

The overlap exclusion constraint (`drizzle/0001_reservation_overlap.sql`) stops double bookings even when two requests race past the app check. Payment changes lock the booking row (`SELECT … FOR UPDATE`) so two staff cannot push the paid total past the booking total.

## No background jobs

Expired pay-ahead holds are cancelled by `expireOverdue`, which runs before booking reads and writes. Vercel Hobby has no frequent scheduler, and this keeps the rule in one place.

## Hosting

Production is Vercel with Neon (doc/adr/0004-vercel-neon-hosting.md). Functions suspend between requests, so the run-time pool is small and goes through Neon's pooler. Migrations and the bootstrap use the direct URL. Each build migrates before it compiles, so a failed migration leaves the old version live. Scripts that delete data refuse any non-local database.

## Time and money

All instants are `timestamptz`. Local wall times and dates convert through `src/server/time.ts` with one zone (`APP_TIME_ZONE`). Money is integer cents in code and `numeric(10,2)` in the database. See `footguns/`.

## Pages are dynamic

Every page reads the session, so `cacheComponents` is off. The booking grid works without JavaScript; small client components only apply control changes and scroll the grid to the chosen time.

## Design

The visual direction (Enlistment Grid) is recorded in `.impeccable/surfaces/` and, after the finish review, in `DESIGN.md`. Neutral colors only; red, green, and amber carry state.
