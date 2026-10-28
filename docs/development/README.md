# Development documentation

This directory is the durable home for engineering plans, audits, decision records, test notes, and implementation follow-ups for donutcat.org.

## Contents

- `plans/`: phased implementation plans and future work.
- `audits/`: point-in-time reviews of the repository and deployed-site architecture.
- `decisions/`: short architecture decision records when a choice needs lasting context.

## Current planning set

- `audits/2026-10-27-baseline.md`: the pre-implementation audit.
- `audits/2026-10-27-post-implementation.md`: the fresh audit after phases 0, 1, 2, 3, and 5.
- `plans/implementation-roadmap.md`: the original phased roadmap.
- `plans/remaining-phases.md`: sequencing and constraints for deferred work.
- `plans/phase-4-content-and-design.md`: content, assets, and visual-system work.
- `plans/phase-6-quality-automation.md`: browser, accessibility, validation, and performance automation.
- `plans/phase-7-operational-resilience.md`: monitoring, external contracts, incidents, and domain operations.
- `plans/post-implementation-priorities.md`: release gate and prioritized next-work queue.

Keep visitor-facing documentation in the repository root or the site itself. Keep temporary tool output and generated reports out of version control.

## Working convention

1. Capture broad work in a dated or clearly named plan.
2. Link implementation commits or follow-up plans from the document.
3. Record material architecture decisions in `decisions/`.
4. After a large implementation, perform a fresh audit rather than silently editing the original baseline.
