# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single Lovelace custom card (`custom:smartfan-xiaomi`) for Home Assistant that controls Xiaomi/Smartmi fans, with a CSS-animated fan blade visualization. Distributed via HACS. There is no test suite; correctness is verified by loading the built bundle into a running Home Assistant instance (see Development).

## Commands

```bash
npm install          # install deps
npm run build        # lint + rollup → outputs to dist/
npm run rollup       # rollup only (no lint)
npm run lint         # eslint src/*.ts
npm run start        # watch build + serve dist/ at http://127.0.0.1:8234/xiaomi-fan-card.js
npm run start -- --https   # same, over https (generates a dev cert via devcert)
```

There is no per-test command — the project has no automated tests.

### Development inner loop

Run `npm run start`, then register the served URL as a Lovelace resource (`type: module`) in a live Home Assistant install. Use `--https` if HA runs on https. Set `PORT` to override 8234.

## Architecture

### The two-platform model — the central concept

The card supports two different backend integrations, selected by the `platform` config key. Almost every control method branches on this, so understand it before touching control logic:

- **`platform: "default"`** — the native **Xiaomi Miio** integration. The card discovers _companion entities_ on the same HA device (oscillation angle `number.`, timer `number.`, child lock `switch.`, LED `number`/`select`/`switch`, temperature/humidity `sensor.`, power `binary_sensor.`) by registry lookup in `findDeviceEntities()`, matched via the `entityFilters` prefix/suffix table in `xiaomi-fan-card.ts`. Controls call standard HA domains (`number.set_value`, `switch.turn_on`, etc.).
- **`platform: "xiaomi_miio_fan"`** — the community [syssi/xiaomi_fan](https://github.com/syssi/xiaomi_fan) integration. No companion entities; controls call custom services on that platform (`fan_set_oscillation_angle`, `fan_set_delay_off`, `fan_set_child_lock_on`, etc.) against the single fan entity.

Each getter/setter (`setAngle`/`getAngle`, `setTimer`, `setChildLock`, LED methods…) implements both branches: prefer the discovered companion entity when present, else fall back to the platform service call.

### Capability detection → `supportedAttributes`

`supportedAttributes` (a `SupportedAttributes` struct on the element) drives which UI controls render and their ranges (speed levels, supported oscillation angles, sleep/LED/natural-mode availability). It is populated in `configureAsync()`:

- For `default`: feature flags are derived from the entity's attributes (`checkFanFeatures`) and discovered companion entities (`checkFanAuxFeatures`), including building the angle list from the angle entity's min/max/step.
- For `xiaomi_miio_fan`: capabilities are hardcoded per fan **model string** (e.g. `dmaker.fan.p5/p15/p18/p33`, `zhimi.fan.fa1`, `dmaker.fan.1c`, `leshow.fan.ss4`). **Adding support for a new model here means adding/adjusting one of these model-string blocks.** `force_sleep_mode_support` is an escape hatch that forces the sleep control on for any fan.

`configureAsync()` is async (registry WS calls); `shouldUpdate()` gates the first render on `isConfigureAsyncFinished` and also re-renders when any tracked companion entity's state changes.

### Files

- `src/xiaomi-fan-card.ts` — the entire card: `FanXiaomiCard` LitElement, control logic, render, and all CSS (including the 72-blade fan animation built by `createFanBladeHtml`). This is where almost all work happens.
- `src/xiaomi-fan-card-editor.ts` — the visual config editor (`smartfan-xiaomi-card-editor`), lazily imported via `getConfigElement()`. Built on HA's native `ha-form` driven by a `SCHEMA` of HA selectors (text / select / entity / boolean) — do not reintroduce `mwc-*` components here; the old Material Web components were the cause of the broken selectors on HA 2026.
- `src/config.ts` — `FanXiaomiCardConfig`, `defaultConfig`, and the `platforms` tuple (the source of truth for valid platform values).
- `src/action-handler-directive.ts` — Lit directive for tap/hold/double-tap actions.

### Build/naming note

Rollup input is `src/xiaomi-fan-card.ts` → `dist/`. HACS serves `xiaomi-fan-card.js` (per `hacs.json`). The README's manual-install instructions still reference the older `fan-xiaomi.js` name — prefer the `hacs.json`/rollup name (`xiaomi-fan-card.js`) when in doubt.
