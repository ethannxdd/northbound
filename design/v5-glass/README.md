# Northbound v5 "glass" mockups (23 Nov 2026)

Design references for REBUILD.md. Each file is one screen, written as a Design Component:
plain HTML with inline styles, plus a small `<script type="text/x-dc">` block whose
`renderVals()` holds the sample data. `{{name}}` marks a value from that block, and
`<sc-for>` / `<sc-if>` are loops and conditions.

Read the styles and copy from these files, but don't ship them. Rebuild the screens in React.

| File | Screen |
|---|---|
| Main.dc.html | Trip (home) |
| Map.dc.html | Map + stop panel |
| Costs.dc.html | Money: baseline vs my quotes |
| AddCost.dc.html | Add my quote sheet |
| Progress.dc.html | How far you've come |
| Paperwork.dc.html | Document tracker |
| Life.dc.html | Life once you're paid |
| Compare.dc.html | Compare scenarios |
| Settlement.dc.html | Settling in the UK |
| Settings.dc.html | Profile + Settings (Rules and sources open) |
| Editor.dc.html | Scenario editor |
| FirstRun.dc.html | First run |
| Auth.dc.html | Sign in |

Striped boxes are photo slots: use the Unsplash photos already in shared/cities.ts.
Sample figures: baseline numbers come from Northbound's engine for Manchester, studio, solo,
30-night let, 3-month job hunt at £1 = R21.80. Saved amounts, Loot deposits and quotes are made up.
