import {
  Camera,
  Check,
  Download,
  ImagePlus,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import type { MachineState } from "./CameraStage";
import type {
  CropTransform,
  ExportFormat,
  PhotoStyle,
} from "../image/types";

type ControlPanelProps = {
  sourceName: string;
  isSample: boolean;
  style: PhotoStyle;
  intensity: number;
  transform: CropTransform;
  dateEnabled: boolean;
  dateValue: string;
  format: ExportFormat;
  state: MachineState;
  hasPhoto: boolean;
  onPickPhoto: () => void;
  onStyleChange: (style: PhotoStyle) => void;
  onIntensityChange: (value: number) => void;
  onTransformChange: (transform: CropTransform) => void;
  onDateEnabledChange: (enabled: boolean) => void;
  onDateValueChange: (value: string) => void;
  onFormatChange: (format: ExportFormat) => void;
  onGenerate: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onDownload: () => void;
};

const STYLE_OPTIONS: Array<{
  id: PhotoStyle;
  label: string;
  swatch: string;
}> = [
  { id: "classic", label: "经典", swatch: "bg-[#9b756a]" },
  { id: "warm", label: "暖日", swatch: "bg-[#cf8b50]" },
  { id: "night", label: "冷夜", swatch: "bg-[#577d83]" },
];

export function ControlPanel({
  sourceName,
  isSample,
  style,
  intensity,
  transform,
  dateEnabled,
  dateValue,
  format,
  state,
  hasPhoto,
  onPickPhoto,
  onStyleChange,
  onIntensityChange,
  onTransformChange,
  onDateEnabledChange,
  onDateValueChange,
  onFormatChange,
  onGenerate,
  onSkip,
  onReplay,
  onDownload,
}: ControlPanelProps) {
  const busy = state === "processing" || state === "ejecting" || state === "developing";
  const complete = state === "complete";
  const controlsDisabled = busy || !hasPhoto;

  return (
    <aside className="control-panel flex min-w-0 flex-col border-t bg-panel lg:min-h-[calc(100vh-72px)] lg:border-l lg:border-t-0">
      <div className="flex-1 px-5 py-6 sm:px-7 lg:overflow-y-auto lg:px-7 lg:py-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="control-eyebrow">底片</p>
            <p className="mt-1 max-w-[220px] truncate text-[13px] font-medium text-ink">
              {sourceName || "未选择照片"}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            title="更换照片"
            aria-label="更换照片"
            onClick={onPickPhoto}
            disabled={busy}
          >
            <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
        {isSample && (
          <div className="sticker-badge mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[9px]">
            <Check className="h-3 w-3" aria-hidden="true" />
            示例底片
          </div>
        )}

        <section className="control-section">
          <div className="mb-3 flex items-center justify-between">
            <label className="control-label">显影配方</label>
            <span className="control-value">03</span>
          </div>
          <div className="segmented-control grid grid-cols-3">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={style === option.id ? "is-selected" : ""}
                onClick={() => onStyleChange(option.id)}
                disabled={controlsDisabled}
                aria-pressed={style === option.id}
              >
                <span className={`h-3 w-3 ${option.swatch}`} aria-hidden="true"></span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="control-section">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="intensity" className="control-label">
              质感强度
            </label>
            <output className="control-value" htmlFor="intensity">
              {String(intensity).padStart(2, "0")}
            </output>
          </div>
          <input
            id="intensity"
            className="range-control"
            type="range"
            min="0"
            max="100"
            step="1"
            value={intensity}
            onChange={(event) => onIntensityChange(Number(event.target.value))}
            disabled={controlsDisabled}
          />
        </section>

        <section className="control-section">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="zoom" className="control-label">
              取景缩放
            </label>
            <div className="flex items-center gap-2">
              <output className="control-value" htmlFor="zoom">
                {transform.zoom.toFixed(1)}x
              </output>
              <button
                type="button"
                className="mini-icon-button"
                title="复位构图"
                aria-label="复位构图"
                disabled={controlsDisabled}
                onClick={() => onTransformChange({ zoom: 1, panX: 0, panY: 0 })}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <input
            id="zoom"
            className="range-control"
            type="range"
            min="1"
            max="2.5"
            step="0.1"
            value={transform.zoom}
            onChange={(event) =>
              onTransformChange({
                ...transform,
                zoom: Number(event.target.value),
              })
            }
            disabled={controlsDisabled}
          />
        </section>

        <section className="control-section">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="date-toggle" className="control-label">
              日期戳
            </label>
            <button
              id="date-toggle"
              type="button"
              role="switch"
              aria-checked={dateEnabled}
              className={`toggle-control ${dateEnabled ? "is-on" : ""}`}
              onClick={() => onDateEnabledChange(!dateEnabled)}
              disabled={controlsDisabled}
            >
              <span></span>
            </button>
          </div>
          {dateEnabled && (
            <input
              className="date-control mt-3"
              type="date"
              value={dateValue}
              onChange={(event) => onDateValueChange(event.target.value)}
              disabled={controlsDisabled}
              aria-label="照片日期"
            />
          )}
        </section>

        <section className="control-section">
          <div className="mb-3 flex items-center justify-between">
            <label className="control-label">导出格式</label>
            <span className="control-value">2400 PX</span>
          </div>
          <div className="segmented-control grid grid-cols-2">
            <button
              type="button"
              className={format === "image/jpeg" ? "is-selected" : ""}
              onClick={() => onFormatChange("image/jpeg")}
              disabled={controlsDisabled}
              aria-pressed={format === "image/jpeg"}
            >
              JPEG
            </button>
            <button
              type="button"
              className={format === "image/png" ? "is-selected" : ""}
              onClick={() => onFormatChange("image/png")}
              disabled={controlsDisabled}
              aria-pressed={format === "image/png"}
            >
              PNG
            </button>
          </div>
        </section>
      </div>

      <div className="control-actions border-t px-5 py-5 sm:px-7">
        {complete ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button type="button" className="primary-button" onClick={onDownload}>
              <Download className="h-[18px] w-[18px]" aria-hidden="true" />
              下载照片
            </button>
            <button
              type="button"
              className="secondary-button aspect-square px-0"
              title="重播显影"
              aria-label="重播显影"
              onClick={onReplay}
            >
              <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        ) : busy ? (
          <button type="button" className="secondary-button w-full" onClick={onSkip}>
            <SkipForward className="h-[18px] w-[18px]" aria-hidden="true" />
            跳过显影
          </button>
        ) : (
          <button
            type="button"
            className="primary-button w-full"
            onClick={onGenerate}
            disabled={!hasPhoto || state === "loading"}
          >
            <Camera className="h-[18px] w-[18px]" aria-hidden="true" />
            生成拍立得
          </button>
        )}
      </div>
    </aside>
  );
}

