import { Gamepad2, Music2, Volume2 } from "lucide-react";

import { Dialog } from "./Dialog";

interface SettingsDialogProps {
  open: boolean;
  midiVolume: number;
  pcmVolume: number;
  dpadOnRight: boolean;
  onMidiVolumeChange: (value: number) => void;
  onPcmVolumeChange: (value: number) => void;
  onDpadOnRightChange: (value: boolean) => void;
  onClose: () => void;
}

export const SettingsDialog = ({
  open,
  midiVolume,
  pcmVolume,
  dpadOnRight,
  onMidiVolumeChange,
  onPcmVolumeChange,
  onDpadOnRightChange,
  onClose,
}: SettingsDialogProps) => (
  <Dialog open={open} title="설정" onClose={onClose}>
    <div className="settings-fields">
      <label>
        <Music2 />
        <span>MIDI</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(midiVolume * 100)}
          onChange={event => onMidiVolumeChange(Number(event.target.value) / 100)}
        />
      </label>
      <label>
        <Volume2 />
        <span>효과음</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(pcmVolume * 100)}
          onChange={event => onPcmVolumeChange(Number(event.target.value) / 100)}
        />
      </label>
      <div className="settings-row">
        <Gamepad2 />
        <span id="keypad-layout-label">방향키</span>
        <div className="segmented" role="group" aria-labelledby="keypad-layout-label">
          <button type="button" aria-pressed={!dpadOnRight} onClick={() => onDpadOnRightChange(false)}>
            왼쪽
          </button>
          <button type="button" aria-pressed={dpadOnRight} onClick={() => onDpadOnRightChange(true)}>
            오른쪽
          </button>
        </div>
      </div>
    </div>
  </Dialog>
);
