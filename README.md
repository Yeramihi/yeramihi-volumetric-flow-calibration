# Yeramihi Volumetric Flow Calibration

A simple browser-based G-code generator for testing maximum volumetric flow rate of a filament / nozzle / printer combination.

## What this does

This tool generates a stepped-speed calibration pattern using consistent extrusion geometry.

Each segment increases speed → which increases volumetric flow:

> Volumetric flow = speed × line area

This allows you to identify the practical flow limit of your setup.

---

## Method

The calibration uses long horizontal extrusion passes to stabilise flow and provide consistent measurement.

Short vertical segments are only connectors and should not be used for evaluation.

This approach focuses on:
- sustained extrusion
- pressure stability
- real-world printing behaviour

---

## Intended users

This tool is for **experienced users only**.

You should understand:
- G-code basics
- extrusion behaviour
- printer limits
- risks of running custom machine code

---

## Assumptions

- Filament is already loaded
- Bed mesh / levelling is complete
- Z offset is calibrated
- Safe starting position is valid
- A 10mm margin is applied from safe position

---

## Z-offset note

Some setups (e.g. textured plates) may require an additional Z lift (~0.1mm) in start G-code.

Use the optional Z-offset adjustment only for small corrections.

---

## Warning

This tool generates raw G-code that directly controls your printer.

Improper use may cause:
- print failure
- collisions
- hardware damage

**You are responsible for reviewing the generated file before printing.**

The tool is provided *as-is* with no guarantees.

---

## Usage

Use the hosted version:

👉 https://tools.yeramihi.com/

Or run locally:
- download repo
- open `index.html` in browser

---

## Attribution

If you use or adapt this tool or method, please include a reference to this repository.

MIT License applies.
