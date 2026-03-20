# Task Workflow

## Overview

Tasks move through a defined lifecycle from creation to final delivery. Three expert roles interact with each task — a **trainer** (attempter) works on the content, a **reviewer** evaluates it, and an **auditor** audits the reviewer's work and ultimately delivers the task. Every time an expert submits their work, a content snapshot is saved in `task_versions`.

---

## Status Lifecycle

```
available
  └─► reserved
        └─► claimed
              └─► completed
                    └─► in_review
                          ├─► sent_for_rework        (reviewer rejects → trainer reworks)
                          │     └─► reworking
                          │           └─► fixed
                          │                 └─► in_review   (rework cycle repeats)
                          │
                          └─► approved               (reviewer approves)
                                └─► auditing
                                      ├─► reviewer_fixing   (auditor sends back to reviewer)
                                      │     └─► approved    (reviewer re-submits → back to audit queue)
                                      │           └─► auditing   (audit cycle repeats)
                                      │
                                      └─► signed_off         (auditor approves — auditors/admins only)
                                            └─► delivered    (auditor or admin — TERMINAL)
```

> **Cancel is not a status.** When an expert closes the task modal without submitting, the attempt row is deleted and the task reverts to `reserved`. Nothing is persisted.

---

## Status Rank (low → high)

```
available → reserved → claimed → completed → in_review
  → approved → auditing → reviewer_fixing → signed_off → delivered
```

`delivered` is the maximum possible status and can only be set by an **auditor** or an **admin**.

---

## Status Definitions

| Status | Who sets it | Meaning |
|---|---|---|
| `available` | System / admin | Task exists and is unassigned |
| `reserved` | Admin | Pre-assigned to a specific trainer |
| `claimed` | Trainer | Trainer is actively working on the task (first attempt) |
| `completed` | Trainer | Trainer submitted their first attempt; awaiting reviewer pick-up |
| `in_review` | Reviewer | A reviewer has started evaluating the task |
| `sent_for_rework` | Reviewer | Reviewer rejected; trainer must redo the work |
| `reworking` | Trainer | Trainer has claimed the rework (subsequent attempt) |
| `fixed` | Trainer | Trainer resubmitted after rework; awaiting next review |
| `approved` | Reviewer | Reviewer approved; awaiting auditor pick-up |
| `auditing` | Auditor | Auditor is evaluating the reviewer's work |
| `reviewer_fixing` | Auditor | Auditor sent the task back — reviewer must fix content or redo the review |
| `signed_off` | **Auditor or Admin only** | Auditor approved the quality; awaiting delivery |
| `delivered` | **Auditor or Admin only** | Task has been delivered — no further transitions allowed |

---

## The `reviewer_fixing` State

When an auditor completes an audit and is not satisfied, the task moves to `reviewer_fixing` regardless of whether the audit action is `send_back_to_reviewer` or `fix_themselves`. The distinction between those two actions is recorded in `review_audits.action` for reporting, but both result in the same next status: the reviewer is responsible for addressing the feedback.

After the reviewer addresses the audit feedback, they re-submit and the task returns to `signed_off`, which puts it back in the audit queue.

```
auditing → reviewer_fixing → signed_off → auditing   (repeats until auditor approves)
```

---

## Tables and Their Roles

### `tasks`
The work item itself. Holds current `status`, metadata, QA fields, and `current_version_id` pointing to the latest content snapshot.

### `task_attempts`
One row per trainer submission cycle. Tracks `claimed_at`, `submitted_at`, and `attempt_number`. On rework, a new row is created with `rework_due_to_review_id` linking to the review that triggered it. Trainer-only — reviewers and auditors do not create attempts.

### `task_versions`
Content snapshots. Every time an expert submits their work, a new row is inserted with `data_payload` (full task content as JSONB), `source` (`trainer` or `reviewer`), `parent_version_id`, and an incrementing `version_number` per task.

### `task_reviews`
One row per review cycle. Holds the reviewer's `decision` (`approved`, `fixed_and_approved`, or `rework`), `score`, `feedback`, and `snapshot_version_id` — a FK to the `task_versions` row created when the review was completed.

### `review_audits`
One row per audit. Holds the auditor's `decision` (`approved` or `needs_changes`), `score`, `feedback`, and `action` (`approve`, `send_back_to_reviewer`, or `fix_themselves`).

---

## Snapshot Contract

A `task_versions` row must be created at every "touch" where an expert submits their work:

| Event | Who creates the version | `source` value |
|---|---|---|
| Trainer submits (first attempt or rework) | Application on `submitTask` | `trainer` |
| Reviewer completes a review (approve or rework) | Application on `completeReview` | `reviewer` |

Auditors do not produce a content snapshot — their decision is recorded in `review_audits`. When a reviewer addresses audit feedback and re-submits, a new `task_versions` row is created at that point.

When creating a reviewer snapshot:
- `data_payload` is copied from the task's `current_version_id` version (the content the reviewer evaluated)
- `parent_version_id` is set to that same version
- `task_reviews.snapshot_version_id` and `tasks.current_version_id` are both updated to point to the new version in the same operation

---

## Multiple Rework and Audit Cycles

Both rework and audit cycles can repeat any number of times.

Example — one rework cycle, reviewer approval, one audit rejection (reviewer fixes), then audit approval and delivery:

```
task_attempts:   attempt 1, attempt 2 (rework 1)
task_versions:   v1 trainer, v2 reviewer, v3 trainer, v4 reviewer, v5 reviewer (post-audit fix)
task_reviews:    review 1 (rework), review 2 (approved), review 3 (approved, post-fix)
review_audits:   audit 1 (needs_changes → reviewer_fixing), audit 2 (approved)
tasks.status:    ... → signed_off → delivered
```

---

## Key Invariants

- `sent_for_rework` → only `reworking` (trainer re-claims).
- `reworking` → only `fixed` (trainer submits).
- `approved` → only `auditing` (auditor picks it up).
- `auditing` → only `signed_off` (approved) or `reviewer_fixing` (auditor sends back).
- `reviewer_fixing` → only `approved` (reviewer re-submits after addressing audit feedback).
- `signed_off` → only `delivered` (auditor or admin — no other role may set this).
- `delivered` → no further transitions. It is the highest and final status.
- Cancel is not a status transition. The attempt row is deleted; the task reverts to `reserved`.
- `task_reviews.snapshot_version_id` must always be set when `completed_at` is set.
- `tasks.current_version_id` always points to the latest `task_versions` row.
- `task_attempts.rework_due_to_review_id` is non-null on every attempt with `attempt_number > 1`.
