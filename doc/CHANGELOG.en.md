# Changelog

All notable changes to matchstick-solver-graph are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [v0.3] - 2026-02-28

### Added
- ✨ **Multi-Database Support**: Added AuraDB (Neo4j) as an optional graph database
  - Implemented database abstraction layer (`IGraphDatabase` interface)
  - Created `FalkorDBAdapter` and `AuraDBAdapter` adapters
  - Support database type configuration via `.env` file
- 📝 **Environment Variable Configuration**: Added `.env` file support
  - Supports `DB_TYPE`, `GRAPH_NAME`, `PORT`, etc.
  - FalkorDB config: `FALKORDB_URL`
  - AuraDB config: `AURADB_URI`, `AURADB_USERNAME`, `AURADB_PASSWORD`, `AURADB_DATABASE`
- 📦 **New Dependencies**
  - `neo4j-driver`: Official Neo4j driver (for AuraDB)
  - `dotenv`: Environment variable loader

### Improved
- 🏗️ **Architecture Refactoring**
  - Refactored `GraphBuilder` and `MatchstickSolver` to use database adapters instead of direct Redis client
  - Unified database query interface for better maintainability and testability
  - Updated test file `check-graph.ts` to support configurable database selection
- 📖 **Documentation Updates**
  - Updated README (both Chinese and English) with database selection guide
  - Created `.env.example` template file

### Fixed
- 🐛 **AuraDB Concurrent Query Issue**
  - Fixed incomplete query results caused by Neo4j Session not supporting concurrent transactions
  - Each query now creates an independent session, ensuring `Promise.all` parallel queries work correctly
- 🐛 **Neo4j Integer Type Conversion**
  - Fixed Neo4j Integer objects (`{low, high}`) not being properly converted to JavaScript numbers
  - Added `convertNeo4jValue` method to handle Neo4j special types (Integer, Date, DateTime, Point, etc.)

### Technical Details
- Database adapters return unified format: `{ data: any[][], metadata?: any }`
- Configuration validation: Clear error messages when AuraDB config is incomplete
- Configuration display: Shows current database type and connection info on startup (sensitive data masked)

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
