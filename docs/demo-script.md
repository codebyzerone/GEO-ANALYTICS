# 90-Second Demo Script

## Problem
Users need to analyze brand visibility across multiple LLMs but face slow analysis times and no way to cache results or poll for async completion.

## Flow

1. **Type a brand + query** — User enters a brand name and analysis queries into the interface.

2. **Show score, sentiment, benchmark** — The system returns per-query geo-scores, aggregate sentiment across LLM responses, and a benchmark grade. Per-model latency is displayed in the report.

3. **Show history/trend** — The user can view previous analysis runs in a history table, with a trend chart showing score over time.

4. **Cache hit** — If the same brand + queries + model combination was analyzed before, the result loads instantly from cache, marked with a "cached" badge.

## End Line
Analysis is fast (cache), actionable (scores + sentiment), and inspectable (history + job polling).