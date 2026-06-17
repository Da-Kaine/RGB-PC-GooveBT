## 2025-05-14 - Canvas API vs Sharp for real-time video sync
**Learning:** In an Electron renderer process, using `sharp` (a native Node.js module) for high-frequency video frame processing introduces significant overhead due to base64/Buffer serialization and context switching between the renderer and Node.js. Native Canvas API with `getImageData` and `willReadFrequently: true` is much faster and more efficient as it stays within the browser's optimized paths.
**Action:** Prefer Canvas API for real-time image processing in the renderer. Avoid `toDataURL` in hot loops.
