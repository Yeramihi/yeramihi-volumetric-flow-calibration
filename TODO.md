# TODO – Yeramihi Volumetric Flow Calibration

## 🔴 Core Missing Features

### 1. Print speed / flow labels on the bed
- Currently: spacing gap is used to indicate segments
- Problem: user must manually track which line = which speed
- Solution:
  - Generate small embossed/extruded numbers next to each rectangle
  - Show either:
    - Speed (mm/s) → preferred for usability
    - OR volumetric flow (mm³/s)
  - Placement:
    - Left side of each rectangle row
    - Offset enough to avoid interference with measurement area
  - Requirements:
    - Same layer height as print
    - Legible at small scale (likely 5–8mm height)
    - No retractions explosion

---

## 🟠 Important Improvements

### 2. Copy to clipboard button
- Allow users to copy G-code without downloading
- Simple UX win

---

### 3. G-code preview (basic)
- Even simple 2D SVG preview would help:
  - Show rectangles
  - Show spacing
  - Show labels (once implemented)

---

### 4. Validation improvements
- Current geometry validation is good
- Extend with:
  - Max printable height check (Y direction)
  - Ensure all rectangles fit vertically
  - Detect impossible combinations early

---

### 5. Smarter prime line extrusion
- Currently uses fixed extrusion value
- Improve:
  - Calculate based on:
    - line width
    - layer height
    - prime line length
  - Make consistent across setups

---

## 🟡 Nice-to-Have Features

### 6. Optional second pass (fine calibration auto-generation)
- After coarse run:
  - Auto suggest:
    - start = best result - small range
    - step = 0.1 mm³/s equivalent
- Could generate second file automatically

---

### 7. Save / load presets
- Store multiple setups:
  - PLA / PETG / TPU profiles
- Uses localStorage (only if cookies accepted)

---

### 8. Export settings with file
- Embed full config in G-code header (already partly done)
- Option to export JSON config alongside G-code

---

### 9. Dynamic fan recommendations
- Suggest default fan per filament:
  - PLA → 100%
  - PETG → 30–50%
  - TPU → 0–30%
- Still user editable

---

### 10. Visual warnings (UI)
- Highlight risky configs:
  - Very high speeds
  - Very high temps
  - Large Z offset

---

## 🟢 Future Ideas (Advanced)

### 11. Automatic result interpretation
- User inputs:
  - "best line number"
- Tool calculates:
  - recommended max volumetric flow

---

### 12. Multi-material / AMS awareness
- Handle purge / transitions
- Less critical for this tool, but possible

---

### 13. Adaptive geometry
- Adjust rectangle length automatically based on:
  - speed
  - acceleration assumptions
- Ensure steady-state extrusion always reached

---

## 🧠 Notes

- Tool assumes:
  - steady-state extrusion reached on long segments
- Label printing is highest priority next step
- Keep tool simple — avoid turning it into a slicer

---

## ✔️ Current Strengths (Do NOT break)

- Strong geometry validation
- Safe margins logic
- Prime line included
- Clean G-code structure
- No dependency on slicer

---
