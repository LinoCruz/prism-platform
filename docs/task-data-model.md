# Task Data Model

## Overview

Every "touch" of a task — whether by a trainer, reviewer, or auditor — produces structured records across several tables. This document describes what is captured at each level, plus the design for `task_time`, a time-tracking table that supports pause/resume.

---

## Data Captured Per Level

### Level 1 — Attempt (`task_attempts`)

One row per trainer submission cycle. Created when a trainer claims a task; updated when they submit.

| Column | Type | Description |
|---|---|---|
| `attempt_id` | uuid PK | Unique identifier |
| `task_id` | uuid FK | The task being worked on |
| `trainer_id` | uuid FK | The trainer doing the work |
| `attempt_number` | int | 1 for first attempt, increments on each rework |
| `claimed_at` | timestamptz | When the trainer opened the task |
| `submitted_at` | timestamptz \| null | When the trainer submitted (null while in progress) |
| `version_id` | uuid FK \| null | The `task_versions` row created on submit |
| `rework_due_to_review_id` | uuid FK \| null | Non-null on attempt_number > 1; links to the review that triggered the rework |

**Lifecycle:** `claimed_at` is set on claim → `submitted_at` + `version_id` are set on submit.

---

### Level 2 — Review (`task_reviews`)

One row per review cycle. Created when a reviewer picks up the task; updated when they submit.

| Column | Type | Description |
|---|---|---|
| `review_id` | uuid PK | Unique identifier |
| `task_id` | uuid FK | The task being reviewed |
| `reviewer_id` | uuid FK | The reviewer |
| `review_number` | int | Increments with each review cycle |
| `started_at` | timestamptz | When the reviewer opened the task |
| `completed_at` | timestamptz \| null | When the reviewer submitted their decision |
| `decision` | enum \| null | `approved`, `rework`, or `fixed_and_approved` |
| `score` | int \| null | Quality score (1–5) |
| `feedback` | text \| null | Written feedback for the trainer |
| `version_id` | uuid FK \| null | The `task_versions` snapshot created on submit |

**Lifecycle:** `started_at` is set on pick-up → all other fields are set on submit.

#### Review Fix (`review_fixes`)

When a reviewer must address audit feedback (`reviewer_fixing` status), a `review_fixes` row is created instead of a new `task_reviews` row.

| Column | Type | Description |
|---|---|---|
| `fix_id` | uuid PK | Unique identifier |
| `review_id` | uuid FK | The review being corrected |
| `reviewer_id` | uuid FK | The reviewer doing the fix |
| `new_version_id` | uuid FK \| null | The new `task_versions` row created after the fix |
| `created_at` | timestamptz | When the fix was submitted |

---

### Level 3 — Audit (`review_audits`)

One row per audit. Created when an auditor picks up the task; updated when they submit.

| Column | Type | Description |
|---|---|---|
| `audit_id` | uuid PK | Unique identifier |
| `review_id` | uuid FK | The review being audited |
| `auditor_id` | uuid FK | The auditor |
| `started_at` | timestamptz | When the auditor opened the task |
| `completed_at` | timestamptz \| null | When the auditor submitted their decision |
| `decision` | enum \| null | `approved` or `needs_changes` |
| `action` | enum \| null | `approve`, `send_back_to_reviewer`, or `fix_themselves` |
| `score` | int \| null | Quality score (1–5) |
| `feedback` | text \| null | Written feedback |

**Lifecycle:** `started_at` is set on pick-up → all other fields are set on submit.

---

## Time Tracking — `task_time`

### Problem

A simple `(completed_at - started_at)` duration is wrong when an expert pauses mid-work or the browser/PC crashes. We need to track **active segments** — each continuous working session is one row. Total active time = sum of all segment durations for a given reference.

Additionally, if the browser or PC crashes while the expert is working, the open segment (`segment_end = null`) would stay open forever. To handle this accurately for payment purposes, the client sends a **heartbeat every 1 minute** while the task is open. `last_heartbeat_at` stores the last known moment the expert was actively working. On crash + resume, the segment is closed at `last_heartbeat_at` instead of `now()`, limiting overpayment to a 1-minute window at most.

### Design

```
task_time
─────────────────────────────────────────────────────
time_id              uuid PK
task_id              uuid FK → tasks.task_id
expert_id            uuid FK → users.user_id
role                 enum (trainer | reviewer | auditor)
reference_type       enum (attempt | review | audit | review_fix)
reference_id         uuid   -- points to the relevant row in the table above
segment_start        timestamptz   -- when work began / resumed
segment_end          timestamptz | null  -- null = currently active
last_heartbeat_at    timestamptz | null  -- updated every 1 minute by the client
```

### How it works

| Event | Action on `task_time` |
|---|---|
| Expert opens task (claim / pick-up) | INSERT a new row: `segment_start = now()`, `segment_end = null` |
| Every 1 minute while open | UPDATE active row: `last_heartbeat_at = now()` |
| Expert pauses (closes modal without submitting) | UPDATE active row: `segment_end = now()` |
| Expert resumes (explicit) | INSERT a new row: `segment_start = now()`, `segment_end = null` |
| Expert submits | UPDATE active row: `segment_end = now()` |
| Crash detected on resume | UPDATE open row: `segment_end = last_heartbeat_at`, then INSERT new row |

### Crash + Resume flow

When an expert opens a task that has an open segment (`segment_end = null`), the app knows a crash occurred:

```
1. Detect open segment for reference_id where segment_end IS NULL
2. Close it: UPDATE segment_end = last_heartbeat_at
             (falls back to segment_start if heartbeat never fired)
3. Show the expert a "Resume" button with a note that their session was recovered
4. On resume click: INSERT new segment with segment_start = now()
```

### Querying total active time

```sql
-- Total active seconds for a specific attempt
SELECT
  COALESCE(SUM(
    EXTRACT(EPOCH FROM (COALESCE(segment_end, now()) - segment_start))
  ), 0) AS total_seconds
FROM task_time
WHERE reference_type = 'attempt'
  AND reference_id = '<attempt_id>';

-- Total active seconds per expert per task (all levels)
SELECT
  expert_id,
  role,
  reference_type,
  reference_id,
  SUM(EXTRACT(EPOCH FROM (COALESCE(segment_end, now()) - segment_start))) AS total_seconds
FROM task_time
WHERE task_id = '<task_id>'
GROUP BY expert_id, role, reference_type, reference_id;
```

### Example — one rework cycle with pauses and one crash

```
attempt 1 (trainer)
  task_time row 1: segment_start=09:00, segment_end=09:45, last_heartbeat_at=09:44:30  ← 45 min
  task_time row 2: segment_start=10:00, segment_end=10:30, last_heartbeat_at=10:29:30  ← 30 min
  → total attempt time: 75 min

review 1 (reviewer → rework)
  task_time row 1: segment_start=11:00, segment_end=null,  last_heartbeat_at=11:19:30  ← browser crashed
  (on resume → segment_end set to 11:19:30, new segment inserted)
  task_time row 2: segment_start=11:25, segment_end=11:35, last_heartbeat_at=11:34:30  ← 10 min
  → total review time: ~29.5 min (19.5 min recovered + 10 min)

attempt 2 / rework (trainer)
  task_time row 1: segment_start=13:00, segment_end=13:40, last_heartbeat_at=13:39:30
  → total rework time: 40 min

review 2 (reviewer → approved)
  task_time row 1: segment_start=14:00, segment_end=14:15, last_heartbeat_at=14:14:30
  → total review time: 15 min

audit 1 (auditor → approved)
  task_time row 1: segment_start=15:00, segment_end=15:10, last_heartbeat_at=15:09:30
  → total audit time: 10 min
```

### `reference_type` mapping

| `reference_type` | `reference_id` points to |
|---|---|
| `attempt` | `task_attempts.attempt_id` |
| `review` | `task_reviews.review_id` |
| `audit` | `review_audits.audit_id` |
| `review_fix` | `review_fixes.fix_id` |

### Invariants

- There must be **at most one row** with `segment_end = null` per `reference_id` at any time (the active segment).
- `segment_end` must always be `≥ segment_start`.
- When closing a crashed segment, `segment_end = COALESCE(last_heartbeat_at, segment_start)`.
- `task_id` is stored directly on `task_time` for efficient querying without joins.
- `role` is redundant with `reference_type` but stored explicitly to simplify reporting queries.
