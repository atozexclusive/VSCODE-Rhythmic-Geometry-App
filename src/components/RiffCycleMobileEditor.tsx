import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { StudyShellButton } from './StudyInstrumentShell';
import type { LandingOverrideState, RiffCycleStudy } from '../lib/riffCycleStudy';

type EditorMode = 'phrase' | 'landing';

interface RiffCycleMobileEditorProps {
  study: RiffCycleStudy;
  mode: EditorMode;
  selectedStep: number | null;
  onSelectStep: (stepIndex: number | null) => void;
  onSetStepActive: (stepIndex: number, active: boolean) => void;
  onToggleAccent: (stepIndex: number) => void;
  onSetLandingStepActive: (slotIndex: number, active: boolean) => void;
  onToggleLandingAccent: (slotIndex: number) => void;
}

interface PendingPress {
  pointerId: number;
  index: number;
  landing: boolean;
  nextActive: boolean;
  longPressed: boolean;
}

const LONG_PRESS_MS = 280;

function getLandingTone(state: LandingOverrideState): {
  background: string;
  border: string;
  color: string;
} {
  switch (state) {
    case 'accent':
      return {
        background: 'rgba(255,209,102,0.16)',
        border: 'rgba(255,209,102,0.3)',
        color: '#FFD166',
      };
    case 'on':
      return {
        background: 'rgba(127,215,255,0.16)',
        border: 'rgba(127,215,255,0.28)',
        color: '#7FD7FF',
      };
    case 'rest':
      return {
        background: 'rgba(255,70,110,0.12)',
        border: 'rgba(255,70,110,0.24)',
        color: 'rgba(255,170,190,0.92)',
      };
    case 'inherit':
    default:
      return {
        background: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.48)',
      };
  }
}

export default function RiffCycleMobileEditor({
  study,
  mode,
  selectedStep,
  onSelectStep,
  onSetStepActive,
  onToggleAccent,
  onSetLandingStepActive,
  onToggleLandingAccent,
}: RiffCycleMobileEditorProps) {
  const [selectedLandingSlot, setSelectedLandingSlot] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingPressRef = useRef<PendingPress | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);

  const clearPendingPress = () => {
    if (longPressTimeoutRef.current != null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    pendingPressRef.current = null;
  };

  useEffect(() => () => clearPendingPress(), []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const index = mode === 'phrase' ? selectedStep : selectedLandingSlot;
    if (index == null) {
      return;
    }
    const target = container.querySelector<HTMLElement>(`[data-mobile-editor-index="${index}"]`);
    target?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [mode, selectedLandingSlot, selectedStep]);

  useEffect(() => {
    if (mode === 'phrase') {
      setSelectedLandingSlot(null);
    }
  }, [mode]);

  const startPress = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
    landing: boolean,
    nextActive: boolean,
  ) => {
    event.preventDefault();
    clearPendingPress();
    pendingPressRef.current = {
      pointerId: event.pointerId,
      index,
      landing,
      nextActive,
      longPressed: false,
    };
    longPressTimeoutRef.current = window.setTimeout(() => {
      const pending = pendingPressRef.current;
      if (!pending || pending.pointerId !== event.pointerId) {
        return;
      }
      pending.longPressed = true;
      if (landing) {
        onToggleLandingAccent(index);
        setSelectedLandingSlot(index);
      } else {
        onToggleAccent(index);
        onSelectStep(index);
      }
    }, LONG_PRESS_MS);
  };

  const finishPress = (pointerId: number) => {
    const pending = pendingPressRef.current;
    if (!pending || pending.pointerId !== pointerId) {
      clearPendingPress();
      return;
    }
    if (!pending.longPressed) {
      if (pending.landing) {
        onSetLandingStepActive(pending.index, pending.nextActive);
        setSelectedLandingSlot(pending.index);
      } else {
        onSetStepActive(pending.index, pending.nextActive);
        onSelectStep(pending.index);
      }
    }
    clearPendingPress();
  };

  const helperText =
    mode === 'phrase'
      ? 'Tap hit · hold accent'
      : 'Tap on/rest · hold accent';
  const isLandscapeHelpful =
    mode === 'phrase' ? study.riff.stepCount > 20 : study.landingLength > 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/46">
            {mode === 'phrase' ? 'Lane Editor' : 'Ending Editor'}
          </div>
          <div className="mt-1 text-[11px] text-white/42">{helperText}</div>
        </div>
        {isLandscapeHelpful ? (
          <div className="rounded-full border border-white/8 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/42">
            Better In Landscape
          </div>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        <div className="flex gap-2 px-1">
          {mode === 'phrase'
            ? study.riff.activeSteps.map((active, index) => {
                const accented = Boolean(study.riff.accents[index]);
                const selected = selectedStep === index;
                return (
                  <button
                    key={index}
                    type="button"
                    data-mobile-editor-index={index}
                    onPointerDown={(event) => startPress(event, index, false, !active)}
                    onPointerUp={(event) => finishPress(event.pointerId)}
                    onPointerCancel={() => clearPendingPress()}
                    onPointerLeave={() => clearPendingPress()}
                    className="relative shrink-0 rounded-2xl border px-0 py-0"
                    style={{
                      width: 46,
                      height: 82,
                      background: active ? `${study.riff.color}${accented ? '22' : '18'}` : 'rgba(255,255,255,0.04)',
                      borderColor: selected ? 'rgba(255,255,255,0.82)' : active ? `${study.riff.color}44` : 'rgba(255,255,255,0.08)',
                      color: active ? study.riff.color : 'rgba(255,255,255,0.46)',
                      boxShadow: accented ? `inset 0 3px 0 rgba(255,209,102,0.92)` : 'none',
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: accented ? 'rgba(255,209,102,0.9)' : 'transparent' }} />
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <div className="text-[11px] font-mono uppercase tracking-[0.12em]">{index + 1}</div>
                      <div
                        className="h-7 w-7 rounded-full border"
                        style={{
                          background: active ? `${study.riff.color}${accented ? 'AA' : '66'}` : 'rgba(255,255,255,0.06)',
                          borderColor: active ? `${study.riff.color}${accented ? 'EE' : '8A'}` : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    </div>
                  </button>
                );
              })
            : study.landingOverrides.map((override, index) => {
                const selected = selectedLandingSlot === index;
                const tone = getLandingTone(override);
                return (
                  <button
                    key={index}
                    type="button"
                    data-mobile-editor-index={index}
                    onPointerDown={(event) =>
                      startPress(event, index, true, override === 'rest' || override === 'inherit')
                    }
                    onPointerUp={(event) => finishPress(event.pointerId)}
                    onPointerCancel={() => clearPendingPress()}
                    onPointerLeave={() => clearPendingPress()}
                    className="relative shrink-0 rounded-2xl border px-0 py-0"
                    style={{
                      width: 46,
                      height: 82,
                      background: tone.background,
                      borderColor: selected ? 'rgba(255,255,255,0.82)' : tone.border,
                      color: tone.color,
                    }}
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <div className="text-[11px] font-mono uppercase tracking-[0.12em]">{index + 1}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em]">
                        {override === 'inherit'
                          ? 'Base'
                          : override === 'rest'
                            ? 'Rest'
                            : override === 'accent'
                              ? 'Acc'
                              : 'Hit'}
                      </div>
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {mode === 'phrase' && selectedStep != null ? (
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
            Step {selectedStep + 1}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StudyShellButton
              size="compact"
              tone="red"
              highlighted={!study.riff.activeSteps[selectedStep]}
              onClick={() => onSetStepActive(selectedStep, false)}
            >
              Rest
            </StudyShellButton>
            <StudyShellButton
              size="compact"
              tone="blue"
              highlighted={study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep]}
              onClick={() => onSetStepActive(selectedStep, true)}
            >
              Hit
            </StudyShellButton>
            <StudyShellButton
              size="compact"
              tone="amber"
              highlighted={Boolean(study.riff.accents[selectedStep])}
              onClick={() => {
                if (!study.riff.accents[selectedStep]) {
                  onToggleAccent(selectedStep);
                }
              }}
            >
              Accent
            </StudyShellButton>
          </div>
        </div>
      ) : null}

      {mode === 'landing' && selectedLandingSlot != null ? (
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
            Ending Slot {selectedLandingSlot + 1}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StudyShellButton
              size="compact"
              tone="red"
              highlighted={study.landingOverrides[selectedLandingSlot] === 'rest'}
              onClick={() => onSetLandingStepActive(selectedLandingSlot, false)}
            >
              Rest
            </StudyShellButton>
            <StudyShellButton
              size="compact"
              tone="blue"
              highlighted={
                study.landingOverrides[selectedLandingSlot] === 'on' ||
                study.landingOverrides[selectedLandingSlot] === 'inherit'
              }
              onClick={() => onSetLandingStepActive(selectedLandingSlot, true)}
            >
              Hit
            </StudyShellButton>
            <StudyShellButton
              size="compact"
              tone="amber"
              highlighted={study.landingOverrides[selectedLandingSlot] === 'accent'}
              onClick={() => {
                if (study.landingOverrides[selectedLandingSlot] !== 'accent') {
                  onToggleLandingAccent(selectedLandingSlot);
                }
              }}
            >
              Accent
            </StudyShellButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
