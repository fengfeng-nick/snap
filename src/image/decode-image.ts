import type { PhotoSource } from "./types";

const MAX_FILE_SIZE = 40 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadHtmlImage(blob: Blob): Promise<PhotoSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        name: "photo",
        close: () => undefined,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("浏览器无法读取这张照片，请换一张 JPEG、PNG 或 WebP。"));
    };

    image.src = url;
  });
}

async function decodeBlob(blob: Blob, name: string): Promise<PhotoSource> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        name,
        close: () => bitmap.close(),
      };
    } catch {
      // Some Safari builds expose createImageBitmap but reject valid files.
    }
  }

  const image = await loadHtmlImage(blob);
  return { ...image, name };
}

export async function decodePhotoFile(file: File): Promise<PhotoSource> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("当前支持 JPEG、PNG 和 WebP，暂不支持 HEIC / HEIF。" );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("照片文件超过 40MB，请先缩小后再试。" );
  }

  const decoded = await decodeBlob(file, file.name);
  if (decoded.width < 640 || decoded.height < 640) {
    decoded.close();
    throw new Error("照片分辨率过低，请选择宽高至少为 640px 的图片。" );
  }

  return decoded;
}

export async function loadSamplePhoto(): Promise<PhotoSource> {
  const response = await fetch("/sample-photo.jpg");
  if (!response.ok) {
    throw new Error("示例照片加载失败。" );
  }

  return decodeBlob(await response.blob(), "sample-photo.jpg");
}

