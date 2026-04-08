# Bundle Decode Notes

This document describes how a future JS decoder should unpack the response from `loadBundle.php`.

## Purpose

The PHP endpoint sends one JSON envelope that already contains:

- bundle metadata
- one package record per bundle entry
- the package manifest payload
- the asset payloads
- the module payloads

The decoder should unpack that response into objects the bootstrapper can use without fetching the files again.

## Top-Level Envelope

The response starts with a single object:

- `version`
  - Must be `1` for this format.
- `compression`
  - `none` for the current version.
  - If a future response uses compression, decode it before JSON parsing.
- `meta`
  - Bundle-wide information only.
  - `count` is the number of package items in `packages`.
  - `base` is the bundle base path.
  - `url` is the bundle endpoint path.
- `packages`
  - Array of bundle package records.

## Package Record

Each item in `packages` represents one package bundle.

Required fields:

- `meta`
  - Package-scoped metadata.
  - `base` is the canonical base path for relative asset and module URLs.
- `package`
  - Singular package payload.
  - `url` is the canonical manifest path.
  - `data` is the manifest body.
- `assets`
  - List of asset payload records.
- `modules`
  - List of module payload records.

## Decode Order

1. Parse the outer JSON response.
2. Confirm `version === 1`.
3. Confirm `compression === "none"` for the current format.
4. Iterate `packages`.
5. For each package record:
   - Read `meta.base`.
   - Read `package.url`.
   - Parse `package.data` as JSON manifest text.
   - Match the manifest's asset and module definitions with the bundled `assets` and `modules` arrays by `id`.
   - Keep the bundled `data` values as the source of truth.
6. Return a JS object ready for the bootstrap loader.

## Field Rules

- `id` values are the stable keys.
- `url` values are source references.
- `data` values are the captured file contents.
- `meta.base` is used to resolve relative asset and module URLs if needed.
- The decoder should not perform repo lookup or file fetching.

## Data Handling

- Text data is UTF-8.
- Unicode is allowed.
- Binary is not part of v1.
- If binary is introduced later, it should carry an explicit encoding marker before decode.

## Expected Output Shape

The decoder should reconstruct a package object that still keeps the bundle structure:

- `meta`
- `package`
- `assets`
- `modules`

The `package.data` field should become the parsed manifest object, while the bundled asset and module entries should preserve the captured content.

## Notes For Later JS Work

- Use `meta.base` when relative URLs need to be rebuilt.
- Keep `package.url` untouched so the original source path stays visible.
- Do not refetch `layout.html`, `style.css`, or module files once they are inside the bundle.
- Treat the bundle as a transport format, not as a second source of truth.
