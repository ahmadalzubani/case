---
name: CASE persistence boundary
description: Durable guidance for the local-only investigation state stored in browser localStorage.
---

Persisted investigation data must be treated as untrusted input: parsing alone is not enough. Normalize missing fields, reject unexpected top-level shapes, preserve valid legacy notebook content where possible, and fall back to a clean state for malformed values.

**Why:** Older or partially written browser state previously caused the investigation notebook to throw during render, blocking the game even though the case data was valid.

**How to apply:** Any future change to investigation persistence should keep malformed arrays, notebook fields, connections, accusations, and results from reaching React as unchecked values.