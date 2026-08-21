import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ImageIcon, LoaderCircle } from "lucide-react";
import { renderPolaroid } from "../image/render-polaroid";
import type { CropTransform, PhotoSource, RenderOptions } from "../image/types";

export type MachineState =
  | "loading"
  | "editing"
  | "processing"
  | "ejecting"
  | "developing"
  | "complete"
  | "error";

type CameraStageProps = {
  photo: PhotoSource | null;
  options: RenderOptions;
  state: MachineState;
  onPanChange: (transform: CropTransform) => void;
  onPickPhoto: () => void;
};

const STATE_LABELS: Record<MachineState, string> = {
  loading: "读取底片",
  editing: "构图预览",
  processing: "冲洗底片",
  ejecting: "相纸出片",
  developing: "正在显影",
  complete: "显影完成",
  error: "等待底片",
};

function clamp(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function CameraStage({
  photo,
  options,
  state,
  onPanChange,
  onPickPhoto,
}: CameraStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const editable = state === "editing" || state === "complete";

  useEffect(() => {
    if (!photo || !canvasRef.current) return;
    renderPolaroid(canvasRef.current, photo, options, 720);
  }, [options, photo]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || !photo) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: options.transform.panX,
      panY: options.transform.panY,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const movementScale = 2.2 / options.transform.zoom;
    const panX = clamp(
      drag.panX - ((event.clientX - drag.x) / bounds.width) * movementScale,
    );
    const panY = clamp(
      drag.panY - ((event.clientY - drag.y) / bounds.height) * movementScale,
    );
    onPanChange({ ...options.transform, panX, panY });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <section
      className="camera-stage relative flex min-h-[530px] min-w-0 flex-col items-center overflow-hidden px-4 pb-8 pt-8 sm:min-h-[620px] sm:px-8 lg:min-h-[calc(100vh-72px)] lg:justify-center lg:py-10"
      data-screen-label="拍立得工作台"
    >
      <div className="stage-grid" aria-hidden="true"></div>
      <div className="stage-index" aria-hidden="true">
        <span>01</span>
        <span>05</span>
        <span>10</span>
      </div>

      <div
        className="camera-rig relative z-10 w-full max-w-[620px]"
        data-state={state}
      >
        <div className="camera-body relative z-20 mx-auto w-full max-w-[540px]">
          <div className="flex h-[116px] items-center justify-between px-6 sm:h-[142px] sm:px-9">
            <div className="self-start pt-6 sm:pt-8">
              <div className="camera-brand font-display text-[16px] font-semibold sm:text-[18px]">
                INSTANT LAB
              </div>
              <div className="camera-brand-sub mt-1 font-mono text-[9px]">
                TYPE 600 / LOCAL PROCESS
              </div>
              <div className="camera-rainbow" aria-hidden="true"></div>
            </div>

            <div className="camera-lens" aria-hidden="true">
              <span></span>
            </div>

            <div className="flex flex-col items-end gap-3">
              <span className="camera-counter">1</span>
              <span className="camera-led" aria-hidden="true"></span>
            </div>
          </div>
          <div className="camera-slot-wrap">
            <div className="camera-slot"></div>
          </div>
        </div>

        <div className="photo-viewport">
          <div
            className="photo-track"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {photo ? (
              <div
                className={`photo-print ${editable ? "is-editable" : ""}`}
                aria-label="拍立得成片预览"
              >
                <canvas ref={canvasRef} role="img" aria-label="处理后的拍立得照片"></canvas>
                <div className="development-wash" aria-hidden="true"></div>
                <div className="development-bloom" aria-hidden="true"></div>
              </div>
            ) : (
              <button
                type="button"
                className="photo-empty"
                onClick={onPickPhoto}
              >
                {state === "loading" ? (
                  <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageIcon className="h-7 w-7" aria-hidden="true" />
                )}
                <span>{state === "loading" ? "读取中" : "选择照片"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="stage-status relative z-20 mt-5 flex w-full max-w-[540px] items-center justify-between"
        data-state={state}
      >
        <span className="flex items-center gap-2 font-mono text-[10px]">
          <span
            className={`status-pip ${state === "developing" || state === "processing" ? "is-active" : ""}`}
            aria-hidden="true"
          ></span>
          <span aria-live="polite">{STATE_LABELS[state]}</span>
        </span>
        <div className="development-scale" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="status-time font-mono text-[10px]">05 SEC</span>
      </div>

      <div
        className={`flash-layer ${state === "processing" ? "is-active" : ""}`}
        aria-hidden="true"
      ></div>
    </section>
  );
}
