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

/**
 * Compute the effective integer address for LOAD/STORE.
 * src1 = offset (string number), src2 = base register.
 */
function computeAddress(src1: string, src2: string, rf: RegisterFile): number | null {
  const offset = parseInt(src1, 10);
  const base = rf[src2];
  if (!base || base.kind !== "value") return null; // base not ready
  return offset + base.value;
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
    const addr = computeAddress(instr.src1, instr.src2, registerFile);
    rs.address = addr;
    // Vj = effective address value (we use address field separately; Vj unused for LOAD)
    rs.Vj = addr;
    rs.Vk = null;
    rs.Qj = null;
    rs.Qk = null;
  } else if (instr.opcode === "STORE") {
    // STORE: src1 = offset, src2 = base; dest = value register to store
    const addr = computeAddress(instr.src1, instr.src2, registerFile);
    rs.address = addr;
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

  // Determine the earliest-issued store instruction that has NOT yet computed
  // its address — used to enforce simplified store ordering.
  // (Not needed for the default program, but model is correct.)

  for (const rs of s.reservationStations) {
    if (!rs.busy || rs.resultReady) continue;

    const operandsReady = rs.Qj === null && rs.Qk === null;

    if (!operandsReady) continue;

    // ── Textbook constraint: cannot start executing in the same cycle issued ──
    // An RS is "just issued" this cycle if the instruction's issueCycle === cycle.
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
      // Execution done — compute result, but don't mark resultReady until NEXT cycle
      // (textbook: WB cannot happen in the same cycle execution completes on the functional unit)
      // We mark execEndCycle here but set resultReady=true so WB can happen next cycle.
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
      // Simulate a memory load: return a stable value derived from the address
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

  // Collect all RS that have a result ready and are still busy.
  // Textbook constraint: WB cannot happen in the same cycle execution finishes.
  const ready = s.reservationStations
    .filter((rs) => {
      if (!rs.busy || !rs.resultReady) return false;
      // Exclude RS that just finished executing this cycle
      const instr = s.instructions.find((i) => i.id === rs.instructionId);
      if (instr?.execEndCycle === cycle) return false;
      return true;
    })
    .sort((a, b) => {
      // Prefer ones already in cdbQueue, then by instruction order
      const aQueued = s.cdbQueue.includes(a.name);
      const bQueued = s.cdbQueue.includes(b.name);
      if (aQueued && !bQueued) return -1;
      if (!aQueued && bQueued) return 1;
      // Both queued or neither — sort by instruction id (program order)
      return (a.instructionId ?? 999) - (b.instructionId ?? 999);
    });

  if (ready.length === 0) return s;


  // Only one CDB broadcast per cycle
  const broadcaster = ready[0];

  const broadcast: CDBBroadcast = {
    tag: broadcaster.name,
    value: broadcaster.result!,
    instructionId: broadcaster.instructionId!,
  };

  // Track any RS that couldn't broadcast (add to queue)
  const newQueue = ready
    .slice(1)
    .map((rs) => rs.name)
    .filter((name) => !s.cdbQueue.includes(name));

  // ── CDB broadcast: update waiting RS ────────────────────────────────────────
  for (const rs of s.reservationStations) {
    if (rs.Qj === broadcast.tag) {
      rs.Vj = broadcast.value;
      rs.Qj = null;
    }
    if (rs.Qk === broadcast.tag) {
      rs.Vk = broadcast.value;
      rs.Qk = null;
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
    cyclesLeft: null,
    resultReady: false,
    result: null,
    instructionId: null,
  });

  // Remove from queue
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

  // Apply the three phases in order (each sees the results of the previous)
  s = doIssue(s);
  s = doExecute(s);
  s = doWriteback(s);

  // Check done
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
      // Only allowed before simulation starts
      if (state.started) return state;
      return buildInitialState(action.payload, { ...DEFAULT_REGISTER_FILE });

    default:
      return state;
  }
}
