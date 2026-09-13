import { describe, it, expect } from "vitest";
import { stepOnce } from "./simulator";
import { buildInitialState, DEFAULT_INSTRUCTIONS, DEFAULT_REGISTER_FILE } from "./defaults";
import type { Instruction, RegisterFile, SimulatorState } from "./types";

function runToCompletion(state: SimulatorState, maxCycles = 200): SimulatorState {
  let s = state;
  let guard = 0;
  while (!s.done && guard < maxCycles) {
    s = stepOnce(s);
    guard++;
  }
  return s;
}

describe("default 6-instruction program", () => {
  it("completes in exactly 37 cycles with correct final register values", () => {
    const initial = buildInitialState(DEFAULT_INSTRUCTIONS, DEFAULT_REGISTER_FILE);
    const final = runToCompletion(initial);

    expect(final.done).toBe(true);
    expect(final.cycle).toBe(37);
    expect((final.registerFile.F0 as { kind: "value"; value: number }).value).toBeCloseTo(2205, 4);
    expect((final.registerFile.F6 as { kind: "value"; value: number }).value).toBeCloseTo(201, 4);
    expect((final.registerFile.F10 as { kind: "value"; value: number }).value).toBeCloseTo(10.9701, 3);
  });

  it("correctly stalls on RAW hazard (MUL waits for LOAD F2's writeback + CDB delay)", () => {
    const initial = buildInitialState(DEFAULT_INSTRUCTIONS, DEFAULT_REGISTER_FILE);
    const final = runToCompletion(initial);

    const loadF2 = final.instructions[1];
    const mul = final.instructions[2];

    expect(loadF2.writebackCycle).not.toBeNull();
    // MUL cannot begin execution until one cycle after its RAW dependency broadcasts on the CDB
    expect(mul.execStartCycle).toBe((loadF2.writebackCycle as number) + 1);
  });
});

describe("WAR hazard via register renaming", () => {
  // instr0: MUL F3, F1, F2   -> slow (10 cycles), writes F3
  // instr1: ADD F4, F1, F2   -> reads F1 (fast, issued right after instr0, but BEFORE instr2 overwrites F1)
  // instr2: SUB F1, F3, F2   -> WAR: overwrites F1, but depends on slow F3 so it finishes long after instr1
  const regs: RegisterFile = {
    F1: { kind: "value", value: 100 },
    F2: { kind: "value", value: 5 },
  };

  const instrs: Instruction[] = [
    { id: 0, opcode: "MUL", dest: "F3", src1: "F1", src2: "F2", issueCycle: null, execStartCycle: null, execEndCycle: null, writebackCycle: null },
    { id: 1, opcode: "ADD", dest: "F4", src1: "F1", src2: "F2", issueCycle: null, execStartCycle: null, execEndCycle: null, writebackCycle: null },
    { id: 2, opcode: "SUB", dest: "F1", src1: "F3", src2: "F2", issueCycle: null, execStartCycle: null, execEndCycle: null, writebackCycle: null },
  ];

  it("resolves instr1's read of F1 at issue time, unaffected by instr2's later write", () => {
    const initial = buildInitialState(instrs, regs);
    const final = runToCompletion(initial);

    // F4 = old F1 + F2 = 100 + 5 = 105, regardless of instr2 later overwriting F1
    expect((final.registerFile.F4 as { kind: "value"; value: number }).value).toBeCloseTo(105, 4);

    // F1 ends up overwritten by instr2: new F1 = F3 - F2 = (100*5) - 5 = 495
    expect((final.registerFile.F1 as { kind: "value"; value: number }).value).toBeCloseTo(495, 4);

    // instr1 must have written back well before instr2 (proves no false stall from the later write)
    const instr1WB = final.instructions[1].writebackCycle as number;
    const instr2WB = final.instructions[2].writebackCycle as number;
    expect(instr1WB).toBeLessThan(instr2WB);
  });
});

describe("LOAD with a pending base register (regression test for the base-register hazard fix)", () => {
  // instr0: ADD R_BASE, X, Y  -> R_BASE = 5 + 7 = 12 (2 cycle latency)
  // instr1: LOAD F1, 10(R_BASE) -> must stall until R_BASE resolves, then address = 10 + 12 = 22, result = 33
  const regs: RegisterFile = {
    X: { kind: "value", value: 5 },
    Y: { kind: "value", value: 7 },
  };

  const instrs: Instruction[] = [
    { id: 0, opcode: "ADD", dest: "R_BASE", src1: "X", src2: "Y", issueCycle: null, execStartCycle: null, execEndCycle: null, writebackCycle: null },
    { id: 1, opcode: "LOAD", dest: "F1", src1: "10", src2: "R_BASE", issueCycle: null, execStartCycle: null, execEndCycle: null, writebackCycle: null },
  ];

  it("stalls the LOAD until the base register is written back, then computes the correct address", () => {
    const initial = buildInitialState(instrs, regs);
    const final = runToCompletion(initial);

    const addBase = final.instructions[0];
    const load = final.instructions[1];

    expect(addBase.writebackCycle).not.toBeNull();
    // LOAD cannot start executing before its base register (R_BASE) has broadcast
    expect(load.execStartCycle as number).toBeGreaterThan(addBase.writebackCycle as number);

    // Correct result: address = 10 + 12 = 22, result = 22 * 1.5 = 33 (NOT 0, which was the old bug's output)
    expect((final.registerFile.F1 as { kind: "value"; value: number }).value).toBeCloseTo(33, 4);
  });
});
