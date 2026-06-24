## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2026-06-18 - High-Frequency Canvas Analysis
**Learning:** Real-time color analysis in Electron/Browser using `sharp` or base64 roundtrips (Canvas -> DataURL -> Buffer) is extremely CPU-heavy due to repeated encoding/decoding and IPC overhead.
**Action:** Use a persistent Canvas with `{ willReadFrequently: true }` and `getImageData()` for synchronous, zero-copy pixel access in high-frequency loops (e.g., 10Hz video sync). Re-implement auxiliary methods (like `crop()`) using the Canvas API to remove native dependencies like `sharp` from critical paths.
