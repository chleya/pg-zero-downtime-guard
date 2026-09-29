# PostgreSQL Zero-Downtime Guard

A GitHub Action that blocks migration pull requests when they risk table-wide write locks or lock-queue cascades. It runs with Node 20 and no runtime dependencies.

## Rules

- `INDEX_WITHOUT_CONCURRENTLY`: requires `CREATE INDEX CONCURRENTLY`, avoiding the stronger `SHARE` lock used by a regular index build.
- `ADD_COLUMN_WITH_VOLATILE_DEFAULT`: flags volatile/time- or UUID-generating defaults on `ADD COLUMN`; these can force a table rewrite or long exclusive lock depending on PostgreSQL version and expression.
- `MISSING_LOCK_TIMEOUT`: requires `SET LOCAL lock_timeout = '2s';` so a migration fails fast instead of joining a lock wait queue.

## Safe migration pattern

1. Set the local lock timeout at the top of each transaction.
2. Add nullable columns without a volatile default.
3. Backfill in bounded batches outside a long blocking transaction.
4. Add indexes concurrently in a separate migration.
5. Add a stable default and enforce `NOT NULL` only after the backfill is complete.

```yaml
- uses: chleya/pg-zero-downtime-guard@main
  with:
    path: db/migrations
```

The analyzer writes a Markdown summary with a safe replacement for every finding and exits non-zero by default. A team support plan can add database-specific rules, migration timing telemetry, and policy packs through Polar.sh.
