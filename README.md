# Tomasulo Visualizer

> An interactive, cycle-accurate simulator of **Tomasulo's Algorithm** — the dynamic scheduling technique that powers out-of-order execution in every modern CPU.

Built with **Next.js**, **React**, and **TypeScript**, with a fully pure, unit-testable simulation engine at its core.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

**[Source](https://github.com/abhishekpasupathy/tomasulo-visualizer)**

---

## Why This Project

Tomasulo's Algorithm (IBM 360/91, 1967) is the foundation of dynamic instruction scheduling — the reason a modern CPU can execute instructions out of program order without ever producing an incorrect result. It's a core topic in every Computer Architecture course, and notoriously easy to implement incorrectly.

This project doesn't just animate the textbook example — it implements the actual scheduling logic from scratch: reservation stations, register renaming, a common data bus (CDB) with structural-hazard arbitration, and correct handling of all three data hazard types (RAW, WAR, WAW).

## Features

- **Cycle-by-cycle stepping** — watch issue, execute, and writeback unfold one cycle at a time
- **Configurable functional units** — Add/Sub, Multiply, Divide, and Load/Store, each with independent latency
- **Live Gantt timeline** — visual issue/exec/writeback spans per instruction
- **Reservation station table** — see Vj, Vk, Qj, Qk update in real time as the CDB broadcasts
- **Cycle-by-cycle event log** — a full audit trail of every issue, exec-start, exec-end, and writeback event
- **Correct hazard handling**:
  - RAW (Read-After-Write) — instructions stall on Qj/Qk tags until the producing RS broadcasts
  - WAR (Write-After-Read) — resolved via register renaming at issue time, not by stalling
  - WAW (Write-After-Write) — register file only accepts a broadcast if its tag still matches the broadcaster
  - Structural hazards — only one CDB broadcast per cycle, with FIFO/program-order arbitration when multiple functional units finish simultaneously

## Architecture

```mermaid
flowchart LR
    IQ["Instruction Queue"] -->|Issue| RS

    subgraph RS["Reservation Stations"]
        direction TB
        ADD["Add1 / Add2 / Add3 (ADD, SUB)"]
        MUL["Mult1 / Mult2 (MUL, DIV)"]
        LD["Load1 / Load2 / Load3 (LOAD, STORE)"]
    end

    RS -->|Operands ready| EX["Execute (latency countdown)"]
    EX -->|Result computed| CDB["Common Data Bus (1 broadcast per cycle)"]
    CDB -->|Value + tag| RF["Register File"]
    CDB -->|Resolves Qj / Qk / Qbase| RS
```

## One Simulation Cycle

Each STEP action runs the three Tomasulo phases in strict order — each phase sees the results of the one before it, matching real hardware timing:

```mermaid
sequenceDiagram
    participant Queue as Instruction Queue
    participant RS as Reservation Station
    participant FU as Functional Unit
    participant CDB as Common Data Bus
    participant RF as Register File

    Queue->>RS: Issue (if RS free in pool)
    RS->>RF: Rename destination register to RS tag
    Note over RS,FU: Operands ready? (Qj, Qk, Qbase all null)
    RS->>FU: Begin execution (latency cycles)
    FU-->>CDB: Result ready (1 cycle after latency ends)
    CDB->>RF: Broadcast value, resolve pending register
    CDB->>RS: Broadcast value, resolve waiting Qj/Qk/Qbase
    CDB->>RS: Free broadcasting station
```

## Reservation Station Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Free
    Free --> Issued: instruction assigned
    Issued --> Waiting: operand(s) pending (RAW)
    Issued --> Executing: operands already ready
    Waiting --> Executing: CDB resolves Qj/Qk/Qbase
    Executing --> ResultReady: latency countdown hits 0
    ResultReady --> Broadcasting: CDB free this cycle
    ResultReady --> Queued: CDB busy (structural hazard)
    Queued --> Broadcasting: CDB free on later cycle
    Broadcasting --> Free: RS reset
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Simulation engine | Pure functions + reducer pattern (no side effects, fully unit-testable) |
| Deployment | Vercel |

## Project Structure
tomasulo-visualizer/
app/ Next.js App Router pages
components/ UI components (Gantt chart, RS table, register view, etc.)
lib/
types.ts Core type definitions (Instruction, ReservationStation, SimulatorState)
defaults.ts RS pools, latencies, default 6-instruction demo program
simulator.ts The engine: issue / execute / writeback reducer logic
public/

## Functional Unit Latencies

| Operation | Latency (cycles) |
|---|---|
| ADD / SUB | 2 |
| MUL | 10 |
| DIV | 20 |
| LOAD / STORE | 2 |

## Getting Started

```bash
git clone https://github.com/abhishekpasupathy/tomasulo-visualizer.git
cd tomasulo-visualizer
npm install
npm run dev
```

Open http://localhost:3000 to try it.

## Example Program

The default program is the classic Patterson & Hennessy example that deliberately exercises all three hazard types:
LOAD F6, 34(R2) independent
LOAD F2, 45(R3) independent
MUL F0, F2, F4 RAW on F2
SUB F8, F6, F2 RAW on F6, F2
DIV F10, F0, F6 RAW on F0, F6
ADD F6, F8, F2 WAR on F6 - resolved via renaming, not stalling

## License

MIT — feel free to fork and extend.

---

Built by [Abhishek Pasupathy](https://github.com/abhishekpasupathy) as a deep-dive into out-of-order execution and dynamic instruction scheduling.
