import type {
  ExportFormat,
  PhotoSource,
  PhotoStyle,
  RenderOptions,
} from "./types";

export const PAPER_ASPECT = 0.82;

type StyleRecipe = {
  saturation: number;
  contrast: number;
  warmth: number;
  green: number;
  lift: number;
  grain: number;
};

const STYLE_RECIPES: Record<PhotoStyle, StyleRecipe> = {
  classic: {
    saturation: 0.9,
    contrast: 0.96,
    warmth: 5,
    green: 1,
    lift: 10,
    grain: 5.2,
  },
  warm: {
    saturation: 0.94,
    contrast: 0.93,
    warmth: 12,
    green: -1,
    lift: 13,
    grain: 4.4,
  },
  night: {
    saturation: 0.78,
    contrast: 1.08,
    warmth: -7,
    green: 3,
    lift: 7,
    grain: 6.2,
  },
};

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

export function calculateSquareCrop(
  imageWidth: number,
  imageHeight: number,
  transform: RenderOptions["transform"],
) {
  const { zoom, panX, panY } = transform;
  const baseSide = Math.min(imageWidth, imageHeight);
  const cropSide = baseSide / zoom;
  const maxX = Math.max(0, (imageWidth - cropSide) / 2);
  const maxY = Math.max(0, (imageHeight - cropSide) / 2);
  const centerX = imageWidth / 2 + panX * maxX;
  const centerY = imageHeight / 2 + panY * maxY;

  return {
    sx: clamp(centerX - cropSide / 2, 0, imageWidth - cropSide),
    sy: clamp(centerY - cropSide / 2, 0, imageHeight - cropSide),
    size: cropSide,
  };
}

function applyFilm(
  imageData: ImageData,
  width: number,
  height: number,
  style: PhotoStyle,
  intensity: number,
) {
  const data = imageData.data;
  const recipe = STYLE_RECIPES[style];
  const mix = clamp(intensity, 0, 100) / 100;
  const saturation = 1 + (recipe.saturation - 1) * mix;
  const contrast = 1 + (recipe.contrast - 1) * mix;
  const lift = recipe.lift * mix;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const sourceR = data[index];
    const sourceG = data[index + 1];
    const sourceB = data[index + 2];
    const luma = sourceR * 0.2126 + sourceG * 0.7152 + sourceB * 0.0722;
    const normalizedLuma = luma / 255;

    let r = luma + (sourceR - luma) * saturation;
    let g = luma + (sourceG - luma) * saturation;
    let b = luma + (sourceB - luma) * saturation;

    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    r = r * (1 - lift / 255) + lift;
    g = g * (1 - lift / 255) + lift;
    b = b * (1 - lift / 255) + lift;

    const highlight = Math.max(0, (normalizedLuma - 0.45) / 0.55);
    const shadow = Math.max(0, (0.55 - normalizedLuma) / 0.55);
    const warmth = recipe.warmth * mix;

    r += warmth * (0.35 + highlight * 0.65) + highlight * 3.5 * mix;
    g += recipe.green * mix + highlight * 1.2 * mix;
    b -= warmth * 0.7;
    b += shadow * (style === "night" ? 7 : 3) * mix;
    g += shadow * (style === "night" ? 2.5 : 1) * mix;

    const dx = (x / width - 0.5) * 2;
    const dy = (y / height - 0.5) * 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const vignette = Math.max(0, distance - 0.48) ** 1.7 * 17 * mix;

    const noiseSeed = (pixel * 1664525 + 1013904223) >>> 0;
    const noise = ((noiseSeed >>> 24) / 255 - 0.5) * recipe.grain * mix;

    data[index] = clamp(r - vignette + noise);
    data[index + 1] = clamp(g - vignette + noise * 0.82);
    data[index + 2] = clamp(b - vignette + noise * 0.68);
  }
}

function addPaperTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const noiseSeed = (pixel * 22695477 + 1) >>> 0;
    const noise = ((noiseSeed >>> 25) / 127 - 0.5) * 2.2;
    data[index] = clamp(data[index] + noise);
    data[index + 1] = clamp(data[index + 1] + noise);
    data[index + 2] = clamp(data[index + 2] + noise * 0.8);
  }

  context.putImageData(imageData, 0, 0);
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

export function renderPolaroid(
  canvas: HTMLCanvasElement,
  photo: PhotoSource,
  options: RenderOptions,
  paperWidth = 720,
) {
  const width = Math.round(paperWidth);
  const height = Math.round(width / PAPER_ASPECT);
  const border = Math.round(width * 0.065);
  const apertureSize = width - border * 2;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("当前浏览器无法创建图片画布。" );
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f1f0e9";
  context.fillRect(0, 0, width, height);

  const crop = calculateSquareCrop(photo.width, photo.height, options.transform);
  context.drawImage(
    photo.source,
    crop.sx,
    crop.sy,
    crop.size,
    crop.size,
    border,
    border,
    apertureSize,
    apertureSize,
  );

  const photoData = context.getImageData(
    border,
    border,
    apertureSize,
    apertureSize,
  );
  applyFilm(
    photoData,
    apertureSize,
    apertureSize,
    options.style,
    options.intensity,
  );
  context.putImageData(photoData, border, border);

  context.strokeStyle = "rgba(26, 31, 30, 0.12)";
  context.lineWidth = Math.max(1, width / 900);
  context.strokeRect(
    border - context.lineWidth / 2,
    border - context.lineWidth / 2,
    apertureSize + context.lineWidth,
    apertureSize + context.lineWidth,
  );

  if (options.dateEnabled && options.dateValue) {
    const date = formatDate(options.dateValue);
    context.save();
    context.fillStyle = "rgba(146, 62, 46, 0.76)";
    context.font = `${Math.round(width * 0.022)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(date, width - border, height - border * 1.25);
    context.restore();
  }

  addPaperTexture(context, width, height);
}

export function renderPolaroidBlob(
  photo: PhotoSource,
  options: RenderOptions,
  format: ExportFormat,
  paperWidth = 1800,
) {
  const canvas = document.createElement("canvas");
  renderPolaroid(canvas, photo, options, paperWidth);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("照片导出失败，请重试。" ));
      },
      format,
      format === "image/jpeg" ? 0.94 : undefined,
    );
  });
}
