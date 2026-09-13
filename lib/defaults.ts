import type {
  Instruction,
  Opcode,
  ReservationStation,
  RSPool,
  RegisterFile,
  SimulatorState,
} from "./types";

// ─── RS Pool Definitions ──────────────────────────────────────────────────────

export const RS_NAMES: Record<RSPool, string[]> = {
  ADD: ["Add1", "Add2", "Add3"],
  MULT: ["Mult1", "Mult2"],
  LOAD: ["Load1", "Load2", "Load3"],
};

export const OPCODE_TO_POOL: Record<Opcode, RSPool> = {
  ADD: "ADD",
  SUB: "ADD",
  MUL: "MULT",
  DIV: "MULT",
  LOAD: "LOAD",
  STORE: "LOAD", // stores share the load buffer pool for simplicity
};

export const LATENCY: Record<Opcode, number> = {
  ADD: 2,
  SUB: 2,
  MUL: 10,
  DIV: 20,
  LOAD: 2,
  STORE: 2,
};

// ─── Initial Register File ────────────────────────────────────────────────────

export const DEFAULT_REGISTER_FILE: RegisterFile = {
  R2: { kind: "value", value: 100 },
  R3: { kind: "value", value: 200 },
  F0: { kind: "value", value: 0 },
  F2: { kind: "value", value: 0 },
  F4: { kind: "value", value: 6.0 },
  F6: { kind: "value", value: 0 },
  F8: { kind: "value", value: 0 },
  F10: { kind: "value", value: 0 },
};

// ─── Default 6-Instruction Program ───────────────────────────────────────────

export const DEFAULT_INSTRUCTIONS: Instruction[] = [
  {
    id: 0,
    opcode: "LOAD",
    dest: "F6",
    src1: "34",
    src2: "R2",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
  {
    id: 1,
    opcode: "LOAD",
    dest: "F2",
    src1: "45",
    src2: "R3",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
  {
    id: 2,
    opcode: "MUL",
    dest: "F0",
    src1: "F2",
    src2: "F4",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
  {
    id: 3,
    opcode: "SUB",
    dest: "F8",
    src1: "F6",
    src2: "F2",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
  {
    id: 4,
    opcode: "DIV",
    dest: "F10",
    src1: "F0",
    src2: "F6",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
  {
    id: 5,
    opcode: "ADD",
    dest: "F6",
    src1: "F8",
    src2: "F2",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  },
];

// ─── Build initial RS array ───────────────────────────────────────────────────

export function buildInitialRS(): ReservationStation[] {
  const stations: ReservationStation[] = [];
  for (const [pool, names] of Object.entries(RS_NAMES) as [RSPool, string[]][]) {
    for (const name of names) {
      stations.push({
        name,
        pool,
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
    }
  }
  return stations;
}

// ─── Build initial SimulatorState ─────────────────────────────────────────────

export function buildInitialState(
  instructions: Instruction[] = DEFAULT_INSTRUCTIONS,
  registerFile: RegisterFile = DEFAULT_REGISTER_FILE
): SimulatorState {
  return {
    instructions: instructions.map((i) => ({ ...i })),
    reservationStations: buildInitialRS(),
    registerFile: { ...registerFile },
    cycle: 0,
    issuePointer: 0,
    cdbQueue: [],
    log: [],
    done: false,
    started: false,
  };
}
