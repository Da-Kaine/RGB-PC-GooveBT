## 2025-05-14 - Replace Sharp with Canvas API for Video Sync
**Learning:** Using `sharp` for real-time video frame processing in an Electron renderer process is highly inefficient due to constant Buffer/base64 conversions and context switching. The native Canvas API with `getImageData` and `willReadFrequently: true` provides a massive performance boost by keeping processing within the browser's optimized paths and making the color extraction synchronous.
**Action:** Always prefer native Canvas API over external image processing libraries for high-frequency frame analysis in the frontend.
