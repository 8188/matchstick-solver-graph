# Changelog

All notable changes to matchstick-solver-graph are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [v0.2] - 2026-02-19

### Added
- Three new 2-match transformation strategies:
  - `moveSubThenAdd`: Move 1 + Remove 1 + Add 1 (net -1 match)
  - `moveAddThenSub`: Move 1 + Add 1 + Remove 1 (net +1 match)
  - `removeRemoveAdd2`: Remove 2 + Add 2 (net 0 matches)
- Frontend search limit input (1000-500000 nodes)
- Frontend filter signs button to filter solutions with leading +/- signs
- Rules page (2-match mode) now shows two additional columns:
  - "Move 1 & Remove 1 to get..." (moveSub)
  - "Move 1 & Add 1 to get..." (moveAdd)
- New test cases: 94-35=48 and 1+7=8+8

### Improved
- Optimized filter logic to only filter leading signs (beginning or after =)
- Repositioned filter button to search limit row
- Updated i18n translations (moveSub, moveAdd, filterSigns)
- parse-rules.ts now parses columns 9 and 10 from markdown tables
- graph-builder.ts creates MOVE_SUB and MOVE_ADD directed edges

### Fixed
- Fixed filter button incorrectly filtering all equations with +/- operators

---

## [v0.1] - 2026-02-18
