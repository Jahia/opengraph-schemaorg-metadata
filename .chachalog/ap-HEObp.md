---
# Allowed version bumps: patch, minor, major
structured-data-mapper: minor
---

The mapping form has a switch for Open Graph and a switch for schema.org. A mapping with Open Graph switched off writes no Open Graph tag and no `twitter:card`, so it can write the JSON-LD alone. A mapping saved before keeps its output.
