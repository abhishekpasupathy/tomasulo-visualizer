/**
 * simulator.ts — Pure simulation engine for Tomasulo's algorithm.
 *
 * All functions are pure (no side effects). The reducer is the single entry
 * point for state transitions, making logic fully unit-testable.
 */

import type {
  SimulatorState,
  SimulatorAction,
  ReservationStation,
  RegisterFile,
  LogEntry,
  CDBBroadcast,
} from "./types";
import {
  OPCODE_TO_POOL,
  LATENCY,
  DEFAULT_INSTRUCTIONS,
  DEFAULT_REGISTER_FILE,
  buildInitialState,
} from "./defaults";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deep-clone the simulation state (fast — objects are small & flat). */
function cloneState(s: SimulatorState): SimulatorState {
  return {
    ...s,
    instructions: s.instructions.map((i) => ({ ...i })),
    reservationStations: s.reservationStations.map((rs) => ({ ...rs })),
    registerFile: { ...s.registerFile },
    cdbQueue: [...s.cdbQueue],
    log: [...s.log],
  };
}

/**
 * Resolve an operand name against the register file.
 * Returns { value } if ready, { qi } if pending.
 */
function resolveOperand(
  name: string,
  rf: RegisterFile
): { kind: "value"; value: number } | { kind: "pending"; qi: string } {
  const entry = rf[name];
  if (!entry) {
    // Unknown register — treat as 0
    return { kind: "value", value: 0 };
  }
  return entry;
}

// ─── STEP 1: Issue ────────────────────────────────────────────────────────────

function doIssue(state: SimulatorState): SimulatorState {
  const { issuePointer, instructions, reservationStations, registerFile, cycle } = state;

  if (issuePointer >= instructions.length) return state; // nothing left to issue

  const instr = instructions[issuePointer];
  const pool = OPCODE_TO_POOL[instr.opcode];

  // Find a free RS in the required pool
  const freeRS = reservationStations.find((rs) => rs.pool === pool && !rs.busy);
  if (!freeRS) return state; // structural hazard — stall

  // ── Clone & mutate ──────────────────────────────────────────────────────────
  const s = cloneState(state);
  const rs = s.reservationStations.find((r) => r.name === freeRS.name)!;
  const instrClone = s.instructions[issuePointer];

  // Mark RS busy
  rs.busy = true;
  rs.op = instr.opcode;
  rs.instructionId = instr.id;
  rs.resultReady = false;
  rs.result = null;
  rs.cyclesLeft = null;

  if (instr.opcode === "LOAD") {
    // LOAD: src1 = offset, src2 = base register
    const offset = parseInt(instr.src1, 10);
    const base = resolveOperand(instr.src2, registerFile);
    rs.offset = offset;
    if (base.kind === "value") {
      rs.address = offset + base.value;
      rs.Vj = rs.address; // Vj mirrors address for LOAD (used elsewhere for display)
      rs.Qbase = null;
    } else {
      rs.address = null;
      rs.Vj = null;
      rs.Qbase = base.qi; // stall: base register not ready yet
    }
    rs.Vk = null;
    rs.Qj = null;
    rs.Qk = null;
  } else if (instr.opcode === "STORE") {
    // STORE: src1 = offset, src2 = base; dest = value register to store
    const offset = parseInt(instr.src1, 10);
    const base = resolveOperand(instr.src2, registerFile);
    rs.offset = offset;
    if (base.kind === "value") {
      rs.address = offset + base.value;
      rs.Qbase = null;
    } else {
      rs.address = null;
      rs.Qbase = base.qi; // stall: base register not ready yet
    }

    const valSrc = resolveOperand(instr.dest, registerFile);
    if (valSrc.kind === "value") {
      rs.Vj = valSrc.value;
      rs.Qj = null;
    } else {
      rs.Vj = null;
      rs.Qj = valSrc.qi;
    }
    rs.Vk = null;
    rs.Qk = null;
  } else {
    // Arithmetic: src1 → Vj/Qj, src2 → Vk/Qk
    rs.offset = null;
    rs.Qbase = null;

    const op1 = resolveOperand(instr.src1, registerFile);
    if (op1.kind === "value") {
      rs.Vj = op1.value;
      rs.Qj = null;
    } else {
      rs.Vj = null;
      rs.Qj = op1.qi;
    }

    const op2 = resolveOperand(instr.src2, registerFile);
    if (op2.kind === "value") {
      rs.Vk = op2.value;
      rs.Qk = null;
    } else {
      rs.Vk = null;
      rs.Qk = op2.qi;
    }
  }

  // Update destination register status (STORE has no dest to rename)
  if (instr.opcode !== "STORE") {
    s.registerFile[instr.dest] = { kind: "pending", qi: rs.name };
  }

  // Record issue cycle on instruction
  instrClone.issueCycle = cycle;

  // Advance issue pointer
  s.issuePointer = issuePointer + 1;

  s.log = [
    ...s.log,
    {
      cycle,
      kind: "issued",
      rsName: rs.name,
      instructionId: instr.id,
      detail: `${instr.opcode} ${instr.dest} issued to ${rs.name}`,
    } satisfies LogEntry,
  ];

  return s;
}

// ─── STEP 2: Execute ──────────────────────────────────────────────────────────

function doExecute(state: SimulatorState): SimulatorState {
  const s = cloneState(state);
  const { cycle } = s;
  const newLog: LogEntry[] = [];

  for (const rs of s.reservationStations) {
    if (!rs.busy || rs.resultReady) continue;

    // Operands ready ALSO requires the base register (LOAD/STORE address) to
    // be resolved — Qbase !== null means we're still waiting on a producer.
    const operandsReady = rs.Qj === null && rs.Qk === null && rs.Qbase === null;

    if (!operandsReady) continue;

    // ── Textbook constraint: cannot start executing in the same cycle issued ──
    const instr = s.instructions.find((i) => i.id === rs.instructionId)!;
    if (instr.issueCycle === cycle) continue;

    // Start execution if not yet started
    if (rs.cyclesLeft === null) {
      rs.cyclesLeft = LATENCY[rs.op!];
      instr.execStartCycle = cycle;
      newLog.push({
        cycle,
        kind: "execStart",
        rsName: rs.name,
        instructionId: rs.instructionId!,
        detail: `${rs.name} begins execution (${rs.op}, ${rs.cyclesLeft} cycles)`,
      });
    }

    // Decrement countdown
    rs.cyclesLeft! -= 1;

    if (rs.cyclesLeft! <= 0) {
      rs.cyclesLeft = 0;
      rs.resultReady = true;
      rs.result = computeResult(rs);
      instr.execEndCycle = cycle;
      newLog.push({
        cycle,
        kind: "execEnd",
        rsName: rs.name,
        instructionId: rs.instructionId!,
        detail: `${rs.name} finished execution (result=${rs.result?.toFixed(4)})`,
      });
    }
  }

  s.log = [...s.log, ...newLog];
  return s;
}

/** Compute the arithmetic result for a finished RS. */
function computeResult(rs: ReservationStation): number {
  const { op, Vj, Vk } = rs;
  const j = Vj ?? 0;
  const k = Vk ?? 0;

  switch (op) {
    case "ADD":
      return j + k;
    case "SUB":
      return j - k;
    case "MUL":
      return j * k;
    case "DIV":
      return k !== 0 ? j / k : 0;
    case "LOAD":
      return rs.address !== null ? rs.address * 1.5 : 0;
    case "STORE":
      return Vj ?? 0; // value being stored
    default:
      return 0;
  }
}

// ─── STEP 3: Writeback (CDB) ──────────────────────────────────────────────────

function doWriteback(state: SimulatorState): SimulatorState {
  const s = cloneState(state);
  const { cycle } = s;

  const ready = s.reservationStations
    .filter((rs) => {
      if (!rs.busy || !rs.resultReady) return false;
      const instr = s.instructions.find((i) => i.id === rs.instructionId);
      if (instr?.execEndCycle === cycle) return false;
      return true;
    })
    .sort((a, b) => {
      const aQueued = s.cdbQueue.includes(a.name);
      const bQueued = s.cdbQueue.includes(b.name);
      if (aQueued && !bQueued) return -1;
      if (!aQueued && bQueued) return 1;
      return (a.instructionId ?? 999) - (b.instructionId ?? 999);
    });

  if (ready.length === 0) return s;

  const broadcaster = ready[0];

  const broadcast: CDBBroadcast = {
    tag: broadcaster.name,
    value: broadcaster.result!,
    instructionId: broadcaster.instructionId!,
  };

  const newQueue = ready
    .slice(1)
    .map((rs) => rs.name)
    .filter((name) => !s.cdbQueue.includes(name));

  // ── CDB broadcast: update waiting RS (operands + pending base registers) ────
  for (const rs of s.reservationStations) {
    if (rs.Qj === broadcast.tag) {
      rs.Vj = broadcast.value;
      rs.Qj = null;
    }
    if (rs.Qk === broadcast.tag) {
      rs.Vk = broadcast.value;
      rs.Qk = null;
    }
    if (rs.Qbase === broadcast.tag) {
      const addr = (rs.offset ?? 0) + broadcast.value;
      rs.address = addr;
      if (rs.op === "LOAD") rs.Vj = addr;
      rs.Qbase = null;
    }
  }

  // ── CDB broadcast: update register file ─────────────────────────────────────
  for (const [reg, entry] of Object.entries(s.registerFile)) {
    if (entry.kind === "pending" && entry.qi === broadcast.tag) {
      s.registerFile[reg] = { kind: "value", value: broadcast.value };
    }
  }

  // ── Record writeback cycle on instruction ────────────────────────────────────
  const instr = s.instructions.find((i) => i.id === broadcast.instructionId)!;
  instr.writebackCycle = cycle;

  // ── Free the broadcasting RS ─────────────────────────────────────────────────
  const rsToFree = s.reservationStations.find((r) => r.name === broadcaster.name)!;
  Object.assign(rsToFree, {
    busy: false,
    op: null,
    Vj: null,
    Vk: null,
    Qj: null,
    Qk: null,
    address: null,
    offset: null,
    Qbase: null,
    cyclesLeft: null,
    resultReady: false,
    result: null,
    instructionId: null,
  });

  s.cdbQueue = [
    ...s.cdbQueue.filter((n) => n !== broadcaster.name),
    ...newQueue,
  ];

  s.log = [
    ...s.log,
    {
      cycle,
      kind: "writeback",
      rsName: broadcaster.name,
      instructionId: broadcast.instructionId,
      detail: `CDB: ${broadcaster.name} → ${broadcast.value.toFixed(4)}`,
    } satisfies LogEntry,
  ];

  return s;
}

// ─── One full cycle ───────────────────────────────────────────────────────────

export function stepOnce(state: SimulatorState): SimulatorState {
  let s = cloneState(state);
  s.cycle = state.cycle + 1;
  s.started = true;

  s = doIssue(s);
  s = doExecute(s);
  s = doWriteback(s);

  const allWrittenBack = s.instructions.every(
    (i) => i.writebackCycle !== null || i.issueCycle === null
  );
  const allIssued = s.issuePointer >= s.instructions.length;
  s.done = allIssued && allWrittenBack;

  return s;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction
): SimulatorState {
  switch (action.type) {
    case "STEP":
      if (state.done) return state;
      return stepOnce(state);

    case "RESET":
      return buildInitialState(
        DEFAULT_INSTRUCTIONS.map((i) => ({ ...i })),
        { ...DEFAULT_REGISTER_FILE }
      );

    case "SET_INSTRUCTIONS":
      if (state.started) return state;
      return buildInitialState(action.payload, { ...DEFAULT_REGISTER_FILE });

    default:
      return state;
  }
}
