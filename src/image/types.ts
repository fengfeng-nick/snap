export type PhotoStyle = "classic" | "warm" | "night" | "aged";

export type ExportFormat = "image/jpeg" | "image/png";

export type PhotoSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  name: string;
  close: () => void;
};

export type CropTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

export type RenderOptions = {
  style: PhotoStyle;
  intensity: number;
  transform: CropTransform;
  captionEnabled: boolean;
  captionText: string;
};

