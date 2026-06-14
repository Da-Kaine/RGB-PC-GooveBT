## 2026-06-14 - [Optimized Video Sync Performance]
**Learning:** High-frequency image processing in Electron/Vue using 'sharp' with base64/Buffer conversions is extremely inefficient. Browser-native Canvas API with 'willReadFrequently: true' and manual pixel averaging provides a massive performance boost by avoiding format conversions and context switching.
**Action:** Always prefer native Canvas API for real-time video frame analysis over external libraries like 'sharp' when performance is critical.
