// ─── Instruction ──────────────────────────────────────────────────────────────

export type Opcode = "ADD" | "SUB" | "MUL" | "DIV" | "LOAD" | "STORE";

export interface Instruction {
  id: number; // stable index in program order
  opcode: Opcode;
  dest: string; // e.g. "F0", "F6"
  src1: string; // e.g. "F2", "34" (immediate offset for LOAD/STORE)
  src2: string; // e.g. "F4", "R2" (base register for LOAD/STORE)

  // Filled in as simulation progresses (null = not yet reached that phase)
  issueCycle: number | null;
  execStartCycle: number | null;
  execEndCycle: number | null;
  writebackCycle: number | null;
}

// ─── Reservation Station ──────────────────────────────────────────────────────

export type RSPool = "ADD" | "MULT" | "LOAD";

export interface ReservationStation {
  name: string; // e.g. "Add1", "Mult2", "Load3"
  pool: RSPool;
  busy: boolean;
  op: Opcode | null;
  Vj: number | null; // value of src1 (once known)
  Vk: number | null; // value of src2 (once known)
  Qj: string | null; // RS tag producing src1 (null = ready)
  Qk: string | null; // RS tag producing src2 (null = ready)
  address: number | null; // for LOAD/STORE: effective address once computed
  offset: number | null; // for LOAD/STORE: parsed immediate offset (needed once base resolves)
  Qbase: string | null; // RS tag producing the base register for LOAD/STORE (null = base ready)
  cyclesLeft: number | null; // cycles remaining in execution (null = not started)
  resultReady: boolean;
  result: number | null;
  instructionId: number | null; // which instruction occupies this RS
}

// ─── Register File ─────────────────────────────────────────────────────────────

// Each register is either a concrete value, or waiting on a RS (by tag).
export type RegisterEntry =
  | { kind: "value"; value: number }
  | { kind: "pending"; qi: string };

export type RegisterFile = Record<string, RegisterEntry>;

// ─── CDB ──────────────────────────────────────────────────────────────────────

export interface CDBBroadcast {
  tag: string; // RS name that is broadcasting
  value: number;
  instructionId: number;
}

// ─── Log Entry ────────────────────────────────────────────────────────────────

export type LogEventKind =
  | "issued"
  | "execStart"
  | "execEnd"
  | "writeback"
  | "cdbStall"; // a second RS finished but couldn't broadcast (CDB busy)

export interface LogEntry {
  cycle: number;
  kind: LogEventKind;
  rsName: string;
  instructionId: number;
  detail?: string;
}

// ─── Simulator State ──────────────────────────────────────────────────────────

export interface SimulatorState {
  /** Program — editable before first step, read-only after */
  instructions: Instruction[];

  /** All reservation stations (ordered: Add1-3, Mult1-2, Load1-3) */
  reservationStations: ReservationStation[];

  /** Register file */
  registerFile: RegisterFile;

  /** Current cycle number (starts at 0 = before simulation; 1 after first step) */
  cycle: number;

  /**
   * Index into `instructions` of the next instruction to be issued.
   * Equals instructions.length when all have been issued.
   */
  issuePointer: number;

  /**
   * Queue of RS tags that finished this cycle but couldn't broadcast (CDB structural hazard).
   * They'll broadcast in subsequent cycles.
   */
  cdbQueue: string[];

  /** Event log — appended each cycle */
  log: LogEntry[];

  /** True once all instructions have written back */
  done: boolean;

  /** Whether the simulation has started (first step taken) */
  started: boolean;
}

// ─── Reducer Actions ──────────────────────────────────────────────────────────

export type SimulatorAction =
  | { type: "STEP" }
  | { type: "RESET" }
  | { type: "SET_INSTRUCTIONS"; payload: Instruction[] };
