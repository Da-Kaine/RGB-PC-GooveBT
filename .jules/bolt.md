## 2026-06-15 - Optimized video sync bottleneck
**Learning:** The video synchronization loop was extremely inefficient due to per-frame canvas creation, expensive `toDataURL` base64 encoding, and the use of the `sharp` native module for simple color extraction. These operations caused high CPU usage and significant latency.
**Action:** Use a persistent canvas with `willReadFrequently: true`, switch to `getImageData` for direct pixel access, and implement native JavaScript color averaging to eliminate `sharp` in the hot path.
