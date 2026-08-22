import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CameraStage, type MachineState } from "./components/CameraStage";
import { ControlPanel } from "./components/ControlPanel";
import { decodePhotoFile, loadSamplePhoto } from "./image/decode-image";
import { renderPolaroidBlob, DEFAULT_CAPTION } from "./image/render-polaroid";
import type {
  CropTransform,
  ExportFormat,
  PhotoSource,
  PhotoStyle,
  RenderOptions,
} from "./image/types";

function delay(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

const DEFAULT_TRANSFORM: CropTransform = { zoom: 1, panX: 0, panY: 0 };

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<PhotoSource | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const [photo, setPhoto] = useState<PhotoSource | null>(null);
  const [isSample, setIsSample] = useState(true);
  const [state, setState] = useState<MachineState>("loading");
  const [style, setStyle] = useState<PhotoStyle>("classic");
  const [intensity, setIntensity] = useState(72);
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_TRANSFORM);
  const [captionEnabled, setCaptionEnabled] = useState(true);
  const [captionText, setCaptionText] = useState(DEFAULT_CAPTION);
  const [format, setFormat] = useState<ExportFormat>("image/jpeg");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const renderOptions = useMemo<RenderOptions>(
    () => ({ style, intensity, transform, captionEnabled, captionText }),
    [captionEnabled, captionText, intensity, style, transform],
  );

  const clearResult = () => {
    setResultBlob(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  };

  const returnToEditing = () => {
    sequenceRef.current += 1;
    clearResult();
    if (photo) setState("editing");
  };

  useEffect(() => {
    let cancelled = false;

    loadSamplePhoto()
      .then((source) => {
        if (cancelled) {
          source.close();
          return;
        }
        sourceRef.current = source;
        setPhoto(source);
        setState("editing");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "示例照片加载失败。" );
        setState("error");
      });

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const handlePhotoFile = async (file: File) => {
    sequenceRef.current += 1;
    clearResult();
    setError(null);
    setState("loading");

    try {
      const nextPhoto = await decodePhotoFile(file);
      sourceRef.current?.close();
      sourceRef.current = nextPhoto;
      setPhoto(nextPhoto);
      setIsSample(false);
      setTransform(DEFAULT_TRANSFORM);
      setState("editing");
    } catch (decodeError) {
      setError(
        decodeError instanceof Error ? decodeError.message : "照片读取失败，请重试。",
      );
      setState(photo ? "editing" : "error");
    }
  };

  const openPicker = () => inputRef.current?.click();

  const startRevealSequence = async (runId: number, retractFirst = false) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setState("complete");
      return;
    }

    if (retractFirst) {
      setState("processing");
      await delay(780);
      if (sequenceRef.current !== runId) return;
    }
    setState("ejecting");
    await delay(1_600);
    if (sequenceRef.current !== runId) return;
    setState("developing");
    await delay(3_700);
    if (sequenceRef.current !== runId) return;
    setState("complete");
  };

  const handleGenerate = async () => {
    if (!photo) return;
    const runId = ++sequenceRef.current;
    clearResult();
    setError(null);
    setState("processing");

    try {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
      );
      if (sequenceRef.current !== runId) return;
      const [blob] = await Promise.all([
        renderPolaroidBlob(photo, renderOptions, format, 1800),
        delay(780),
      ]);
      if (sequenceRef.current !== runId) return;
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      await startRevealSequence(runId);
    } catch (renderError) {
      if (sequenceRef.current !== runId) return;
      setError(
        renderError instanceof Error ? renderError.message : "照片生成失败，请重试。",
      );
      setState("editing");
    }
  };

  const handleReplay = async () => {
    if (!resultBlob) return;
    const runId = ++sequenceRef.current;
    await startRevealSequence(runId, true);
  };

  const handleSkip = () => {
    sequenceRef.current += 1;
    if (resultBlob) setState("complete");
    else if (photo) setState("editing");
  };

  const handleDownload = () => {
    if (!resultBlob || !resultUrlRef.current) return;
    const extension = format === "image/png" ? "png" : "jpg";
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
    const anchor = document.createElement("a");
    anchor.href = resultUrlRef.current;
    anchor.download = `snap-see-${stamp}.${extension}`;
    anchor.click();
  };

  const updateStyle = (nextStyle: PhotoStyle) => {
    returnToEditing();
    setStyle(nextStyle);
  };

  const updateIntensity = (value: number) => {
    returnToEditing();
    setIntensity(value);
  };

  const updateTransform = (value: CropTransform) => {
    returnToEditing();
    setTransform(value);
  };

  const updateCaptionEnabled = (value: boolean) => {
    returnToEditing();
    setCaptionEnabled(value);
  };

  const updateCaptionText = (value: string) => {
    returnToEditing();
    setCaptionText(value);
  };

  const updateFormat = (value: ExportFormat) => {
    returnToEditing();
    setFormat(value);
  };

  return (
    <div className="min-h-screen bg-bench text-ink">
      <header className="app-header flex h-[64px] items-center justify-between px-4 sm:h-[72px] sm:px-7">
        <div className="flex min-w-0 items-baseline gap-3 sm:pl-5">
          <h1 className="font-display text-[19px] font-semibold sm:text-[22px]">
            一拍即显
          </h1>
          <span className="header-sub hidden font-mono text-[9px] sm:inline">
            SNAP &amp; SEE / 01
          </span>
        </div>
      </header>

      <main className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <CameraStage
          photo={photo}
          options={renderOptions}
          state={state}
          onPanChange={updateTransform}
          onPickPhoto={openPicker}
        />
        <ControlPanel
          sourceName={photo?.name ?? ""}
          isSample={isSample}
          style={style}
          intensity={intensity}
          transform={transform}
          captionEnabled={captionEnabled}
          captionText={captionText}
          format={format}
          state={state}
          hasPhoto={Boolean(photo)}
          onPickPhoto={openPicker}
          onStyleChange={updateStyle}
          onIntensityChange={updateIntensity}
          onTransformChange={updateTransform}
          onCaptionEnabledChange={updateCaptionEnabled}
          onCaptionTextChange={updateCaptionText}
          onFormatChange={updateFormat}
          onGenerate={handleGenerate}
          onSkip={handleSkip}
          onReplay={handleReplay}
          onDownload={handleDownload}
        />
      </main>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handlePhotoFile(file);
          event.currentTarget.value = "";
        }}
      />

      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="toast-close"
            title="关闭提示"
            aria-label="关闭提示"
            onClick={() => setError(null)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
