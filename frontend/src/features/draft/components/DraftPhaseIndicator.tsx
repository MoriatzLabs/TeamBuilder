import { useDraftStore } from '../store/draftStore';
import { getPhaseLabel, getProgressPercentage, TOTAL_STEPS } from '../utils/draftSequence';

export function DraftPhaseIndicator() {
  const { currentStep, isComplete, selectedChampion, hoveredChampion } = useDraftStore();
  const currentStepData = useDraftStore((state) => state.getCurrentStep());

  const progress = getProgressPercentage(currentStep);
  const phaseLabel = currentStepData ? getPhaseLabel(currentStepData.phase) : 'Draft Complete';
  const teamLabel = currentStepData?.team === 'blue' ? 'Blue Team' : 'Red Team';
  const actionLabel = currentStepData?.type === 'ban' ? 'Ban' : 'Pick';

  // Show hovered or selected champion preview
  const previewChampion = hoveredChampion || selectedChampion;

  return (
    <div className="draft-phase-indicator">
      <div className="draft-phase-indicator__progress-container">
        <div
          className="draft-phase-indicator__progress-bar"
          style={{ width: `${progress}%` }}
        />
        <span className="draft-phase-indicator__progress-text">
          {currentStep} / {TOTAL_STEPS}
        </span>
      </div>

      <div className="draft-phase-indicator__info">
        {isComplete ? (
          <div className="draft-phase-indicator__complete">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span>Draft Complete!</span>
          </div>
        ) : (
          <>
            <div className="draft-phase-indicator__phase">
              <span className="draft-phase-indicator__phase-label">{phaseLabel}</span>
            </div>
            <div className={`draft-phase-indicator__turn draft-phase-indicator__turn--${currentStepData?.team}`}>
              <span className="draft-phase-indicator__team">{teamLabel}</span>
              <span className="draft-phase-indicator__action">{actionLabel}</span>
            </div>
          </>
        )}
      </div>

      {previewChampion && !isComplete && (
        <div className="draft-phase-indicator__preview">
          <span className="draft-phase-indicator__preview-label">Selected:</span>
          <span className="draft-phase-indicator__preview-champion">{previewChampion.name}</span>
        </div>
      )}
    </div>
  );
}
