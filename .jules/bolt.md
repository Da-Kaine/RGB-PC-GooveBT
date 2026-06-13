## 2026-06-13 - Native Canvas API vs Image Libraries
**Learning:** For high-frequency image processing (e.g., video sync), prefer the native Canvas API with `getImageData` and `willReadFrequently: true` over expensive image encoding (`toDataURL`), base64/buffer conversions, or native modules like `sharp` to minimize CPU and memory overhead.
**Action:** Always check if a persistent canvas can replace repeated image encoding and external library calls in hot paths.
