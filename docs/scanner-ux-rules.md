# Quick Scanner UX Rules & Logic

## 1. Audio Feedback (The "Single Beep" Rule)
* **BarcodeScanner Component:** Must be SILENT. It should NEVER trigger audio. Its only job is to detect strings.
* **QuickScanButton (Parent):** Is the ONLY component allowed to trigger sounds.
* **Trigger Logic:**
    * ✅ **Success Beep:** Play ONLY when a product is successfully saved/updated or successfully identified as "Not Found" (before redirect).
    * ❌ **Silence:** Do NOT beep on duplicate scans (cooldown block). Do NOT beep on "processing".

## 2. Quantity Logic ("+1" Feedback)
* **New Product:** If the product is created for the first time -> Badge: "NOVI PROIZVOD", Color: Green.
* **Existing Product:** If the product exists and stock is incremented -> Badge: "+1", Color: Blue (Distinct).
* **Visual Priority:** The "+1" must be the most prominent visual element in the toast for repeat scans.

## 3. Scan Validation (The "Ghost" Filter)
* **Continuous Mode:** The scanner must implement a "2-Frame Consistency Check".
* **Logic:** A barcode is considered "read" only if the camera detects the *exact same string* in 2 consecutive frames (or within a 100ms buffer). This prevents motion blur from generating wrong numbers.

## 4. Notification Hierarchy (Silent Mode)
* **Allowed Toasts:**
    1.  Success (Product Image + Badge).
    2.  Error ("Not Found" / "Save Failed").
* **Forbidden Toasts:** "Processing...", "Duplicate scan prevented", "Hold steady".

## 5. Repeat Scans of the Same Barcode
* **Single constant:** `SAME_CODE_COOLDOWN_MS` in `src/lib/scan-gate.ts` (700ms). While a code stays in frame it counts at most once per cooldown, so holding it steady gives one "+1" roughly every 0.7–0.9s.
* **Leaving the frame re-arms the code:** no validated reads for `FRAME_EXIT_MS` (and at least twice the observed read cadence) means the code left; showing it again counts immediately.
* **Never wait on the network:** the cooldown is decided at read time. Repeat reads of a product already saved in this scanner session show the "+N" toast at once; the save runs in a serialized background queue.
* **Idempotency per scan event:** every scan gets its own `Idempotency-Key`, persisted before sending and resent unchanged on lost responses, so retries never double-count. After the "Greška pri čuvanju" toast, rescanning the same barcode confirms the unconfirmed scan instead of adding another unit.
