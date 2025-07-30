# Source Health Check Results - [DATE]

## Summary
- Total sources checked: 16
- 🟢 Working: X
- 🟡 Stale: X
- 🟠 Low Activity: X
- 🔴 Not Working: X

## Query 1: Expected Sources Status
```
| source               | unique_words | total_words | last_updated               | status                   |
| -------------------- | ------------ | ----------- | -------------------------- | ------------------------ |
| CNN Top Stories      | 0            | 0           | Never                      | 🔴 Not working - No data |
| CNN World            | 0            | 0           | Never                      | 🔴 Not working - No data |
| CNN                  | 0            | 0           | Never                      | 🔴 Not working - No data |
| O'Reilly Radar       | 0            | 0           | Never                      | 🔴 Not working - No data |
| Wired                | 3671         | 4062        | 2025-07-29 22:32:09.888+00 | 🟢 Working               |
| Reddit r/worldnews   | 4034         | 4073        | 2025-07-29 23:02:09.273+00 | 🟢 Working               |
| TechCrunch           | 3964         | 4613        | 2025-07-30 00:04:37.81+00  | 🟢 Working               |
| Hacker News          | 5201         | 5242        | 2025-07-30 01:34:05.645+00 | 🟢 Working               |
| NPR Main News        | 5527         | 6211        | 2025-07-30 00:04:37.81+00  | 🟢 Working               |
| Reddit Tech Combined | 6846         | 7290        | 2025-07-29 22:32:09.888+00 | 🟢 Working               |
| Reddit r/popular     | 8032         | 8557        | 2025-07-29 23:02:09.273+00 | 🟢 Working               |
| Reddit r/all         | 8334         | 8971        | 2025-07-29 23:02:09.273+00 | 🟢 Working               |
| The Guardian US      | 8409         | 9225        | 2025-07-30 01:34:05.645+00 | 🟢 Working               |
| BBC News             | 8921         | 9837        | 2025-07-30 01:34:05.645+00 | 🟢 Working               |
| The Guardian World   | 12597        | 13952       | 2025-07-30 01:34:05.645+00 | 🟢 Working               |
| The Guardian UK      | 20662        | 22521       | 2025-07-30 01:34:05.645+00 | 🟢 Working               |
```

### Sources to Investigate:
- [ ] Source Name - Issue description

## Query 2: Unprocessed Posts Check
```
Success. No rows returned

```

## Query 3: Current Activity Baseline
```
| source               | unique_words | total_word_count | last_updated               |
| -------------------- | ------------ | ---------------- | -------------------------- |
| The Guardian UK      | 20662        | 22521            | 2025-07-30 01:34:05.645+00 |
| The Guardian World   | 12597        | 13952            | 2025-07-30 01:34:05.645+00 |
| BBC News             | 8921         | 9837             | 2025-07-30 01:34:05.645+00 |
| The Guardian US      | 8409         | 9225             | 2025-07-30 01:34:05.645+00 |
| Reddit r/all         | 8334         | 8971             | 2025-07-29 23:02:09.273+00 |
| Reddit r/popular     | 8032         | 8557             | 2025-07-29 23:02:09.273+00 |
| Reddit Tech Combined | 6846         | 7290             | 2025-07-29 22:32:09.888+00 |
| NPR Main News        | 5527         | 6211             | 2025-07-30 00:04:37.81+00  |
| Hacker News          | 5201         | 5242             | 2025-07-30 01:34:05.645+00 |
| TechCrunch           | 3964         | 4613             | 2025-07-30 00:04:37.81+00  |
| Reddit r/worldnews   | 4034         | 4073             | 2025-07-29 23:02:09.273+00 |
| Wired                | 3671         | 4062             | 2025-07-29 22:32:09.888+00 |
```

## Query 4: Recent Post Activity
```
| source               | posts_last_24h | processed | unprocessed | oldest_post                | newest_post                |
| -------------------- | -------------- | --------- | ----------- | -------------------------- | -------------------------- |
| The Guardian UK      | 192            | 192       | 0           | 2025-07-29 02:01:52.07+00  | 2025-07-30 01:33:49.484+00 |
| The Guardian World   | 134            | 134       | 0           | 2025-07-29 02:01:52.07+00  | 2025-07-30 01:33:49.485+00 |
| Reddit r/all         | 128            | 128       | 0           | 2025-07-29 02:01:52.071+00 | 2025-07-29 23:01:44.181+00 |
| BBC News             | 113            | 113       | 0           | 2025-07-29 02:01:52.07+00  | 2025-07-30 01:33:49.483+00 |
| Hacker News          | 102            | 102       | 0           | 2025-07-29 02:31:34.504+00 | 2025-07-30 01:33:49.483+00 |
| Reddit r/popular     | 90             | 90        | 0           | 2025-07-29 02:01:52.071+00 | 2025-07-29 23:01:44.181+00 |
| The Guardian US      | 58             | 58        | 0           | 2025-07-29 02:01:52.07+00  | 2025-07-30 01:33:49.485+00 |
| Reddit Tech Combined | 57             | 57        | 0           | 2025-07-29 02:01:52.071+00 | 2025-07-29 22:31:45.347+00 |
| Reddit r/worldnews   | 46             | 46        | 0           | 2025-07-29 02:01:52.071+00 | 2025-07-29 23:01:44.181+00 |
| TechCrunch           | 33             | 33        | 0           | 2025-07-29 11:04:37.009+00 | 2025-07-30 00:04:32.252+00 |
| NPR Main News        | 32             | 32        | 0           | 2025-07-29 03:31:34.113+00 | 2025-07-30 00:04:32.253+00 |
| Wired                | 22             | 22        | 0           | 2025-07-29 05:31:34.989+00 | 2025-07-29 22:31:45.345+00 |
```

## Query 5: Processing Errors
```
Success. No rows returned

```

## Action Items
1. Check logs for: [list sources]
2. Test RSS feeds manually for: [list sources]
3. Review word processing for: [list sources]

## Notes
[Add any additional observations or findings]
