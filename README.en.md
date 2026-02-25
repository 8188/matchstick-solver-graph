# Matchstick Equation Solver - Graph Edition 

[ 中文](./README.md) | [ English](#)

**Version: v0.2**

---

A high-performance matchstick equation solver powered by **FalkorDB graph database**  the next generation of [matchstick-puzzle-solver](https://github.com/8188/matchstick-puzzle-solver). Character transformation rules are modeled as a graph, with Cypher queries replacing brute-force enumeration for better efficiency and scalability.

## Features

-  🗄️  **Graph Database Powered**: All character transformation rules stored in FalkorDB, queried via Cypher
-  🔀  **Dual Modes**: Standard seven-segment mode + handwritten mode (`(n)H` syntax)
-  ✏️  **Custom Rules**: Online rule editing with persistence to the graph
-  ↔️  **Move Selection**: Supports solving with 1 or 2 matchstick moves
-  🎨  **SVG Live Preview**: Real-time matchstick equation rendering as you type
-  ⚙️  **Advanced Syntax**: Supports `=+`, `=-`, leading sign expressions

## Quick Start

### Prerequisites

- Node.js 18+
- [FalkorDB](https://github.com/FalkorDB/FalkorDB)

```bash
# Start FalkorDB
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

### Install & Run

```bash
git clone <repo-url>
cd matchstick-solver-graph

# Install dependencies
npm install

# Initialize graph data (first time only)
npm run init-graph

# Start backend server (default port 8080)
npm run dev

# Frontend: open frontend/index.html directly, or serve statically
npx http-server frontend -p 3000
```

Then visit: `http://localhost:3000/index.html`

## Project Structure

```
matchstick-solver-graph/
 backend/
    src/
        solver.ts          # Core solver (graph query + validation + dedup)
        index.ts           # Express API server
        graph-builder.ts   # Graph initialization (writes transformation rules)
        parse-rules.ts     # Rule parsing utility
 frontend/
    index.html             # Main page
    rules.html             # Rules viewer page
    js/
       app.js             # Main app controller
       i18n.js            # Internationalization
       ...
    styles/
        main.css           # Global styles (dual theme variables)
        components.css     # Component styles
        animations.css     # Animations
 test/
    test-solver.ts         # Integration tests (30 test cases)
    check-graph.ts         # Graph data validation
 package.json
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/solve` | Solve equation |
| `GET` | `/api/rules/:mode` | Get transformation rules |
| `POST` | `/api/cache/clear` | Clear server-side cache |
| `GET` | `/api/cache/stats` | View cache statistics |

**Solve request example:**

```json
POST /api/solve
{
  "equation": "8+3-4=0",
  "mode": "standard",
  "moveCount": 1,
  "maxSolutions": 100
}
```

## Testing

>  Tests require the backend service and FalkorDB running simultaneously

```bash
npm test

# Test with cache cleared (measures real query speed)
npm test -- --no-cache
```

## Comparison with matchstick-puzzle-solver

| Feature | matchstick-puzzle-solver | matchstick-solver-graph |
|---------|--------------------------|-------------------------|
| Architecture | Pure frontend, in-memory rules | Frontend/backend separated, graph DB |
| Rule Storage | JS objects | FalkorDB graph nodes/edges |
| Query Method | Brute-force + pruning | Cypher graph queries |
| Scalability | Limited | High (dynamic rule addition) |
| Deploy Complexity | Very low (static page) | Medium (requires Docker) |
| Testing | Pure frontend node script | HTTP API integration tests |

##  TODO List

- [ ] **Puzzle Generator**: Automatically generate matchstick puzzles of varying difficulty
- [ ] **Hint System**: Provide step-by-step hints
- [ ] **Difficulty Ratings**: Auto-evaluate difficulty based on moves and solution count
- [ ] **Share Function**: Generate puzzle links for sharing
- [ ] **Add test cases**: Expand integration and edge-case coverage
- [ ] **Explore new gameplay**: New puzzle variants and rule-sets
- [ ] **Polish UI**: Improve visuals and responsiveness
- [ ] **Consider an App version**: Mobile/desktop packaged release

## Changelog

See changelog: [doc/CHANGELOG.en.md](doc/CHANGELOG.en.md)

## Screenshots

![index screenshot](frontend/assets/images/index.en.png)

## License

MIT License

## Acknowledgments

- Graph database: [FalkorDB](https://github.com/FalkorDB/FalkorDB)

---
