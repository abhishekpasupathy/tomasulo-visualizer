"use client";

import React from "react";

interface ControlsProps {
  cycle: number;
  done: boolean;
  started: boolean;
  playing: boolean;
  speed: number; // ms per step
  onStep: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeedChange: (ms: number) => void;
}

const SPEED_MARKS = [
  { label: "0.25×", ms: 2000 },
  { label: "0.5×", ms: 1000 },
  { label: "1×", ms: 500 },
  { label: "2×", ms: 250 },
  { label: "4×", ms: 125 },
];

export default function Controls({
  cycle,
  done,
  started,
  playing,
  speed,
  onStep,
  onTogglePlay,
  onReset,
  onSpeedChange,
}: ControlsProps) {
  const speedIndex = SPEED_MARKS.findIndex((m) => m.ms === speed);
  const currentSpeedLabel =
    speedIndex >= 0 ? SPEED_MARKS[speedIndex].label : "1×";

  return (
    <div className="flex flex-wrap items-center gap-3 bg-[#0f1117] border border-[#1e2535] rounded-xl px-5 py-3">
      {/* Cycle counter */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-[#8b9ab8] text-sm font-medium">Cycle</span>
        <span className="text-2xl font-bold font-mono text-white tabular-nums min-w-[3ch] text-center">
          {cycle}
        </span>
      </div>

      <div className="w-px h-8 bg-[#1e2535]" />

      {/* Step */}
      <button
        id="btn-step"
        onClick={onStep}
        disabled={done || playing}
        className="btn-primary"
        title="Advance one cycle"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M5.25 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 5.75 3h-.5ZM10.05 4.18a.75.75 0 0 0-1.05.683v10.274a.75.75 0 0 0 1.154.632l7.25-5.137a.75.75 0 0 0 0-1.264l-7.25-5.137a.75.75 0 0 0-.104-.051Z" />
        </svg>
        Step
      </button>

      {/* Play / Pause */}
      <button
        id="btn-play"
        onClick={onTogglePlay}
        disabled={done}
        className={playing ? "btn-secondary" : "btn-primary"}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Zm4 0a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Z"
                clipRule="evenodd"
              />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z"
                clipRule="evenodd"
              />
            </svg>
            Play
          </>
        )}
      </button>

      {/* Reset */}
      <button
        id="btn-reset"
        onClick={onReset}
        className="btn-ghost"
        title="Reset simulation"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H5.498a.75.75 0 0 0-.75.75v3.222a.75.75 0 0 0 1.5 0v-1.675l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.26-3.673a.75.75 0 0 0-1.061 0l-.312.311-.309-.31A7 7 0 0 0 3.168 10.6a.75.75 0 1 0 1.449.388 5.5 5.5 0 0 1 9.196-2.465l.312.31H11.692a.75.75 0 0 0 0 1.5h3.433a.75.75 0 0 0 .75-.75V6.06a.75.75 0 0 0-1.5 0v1.674l-.311-.31-.492.327Z"
            clipRule="evenodd"
          />
        </svg>
        Reset
      </button>

      <div className="w-px h-8 bg-[#1e2535]" />

      {/* Speed */}
      <div className="flex items-center gap-3">
        <span className="text-[#8b9ab8] text-sm whitespace-nowrap">Speed</span>
        <input
          id="slider-speed"
          type="range"
          min={0}
          max={SPEED_MARKS.length - 1}
          step={1}
          value={speedIndex >= 0 ? speedIndex : 2}
          onChange={(e) => onSpeedChange(SPEED_MARKS[Number(e.target.value)].ms)}
          className="slider w-28"
        />
        <span className="text-[#6ee7b7] text-sm font-mono font-semibold w-10">
          {currentSpeedLabel}
        </span>
      </div>

      {done && (
        <span className="ml-auto text-[#6ee7b7] text-sm font-semibold flex items-center gap-1">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          Complete in {cycle} cycles
        </span>
      )}

      {!started && (
        <span className="ml-auto text-[#8b9ab8] text-xs">
          Edit instructions below, then Step ▶
        </span>
      )}
    </div>
  );
}
