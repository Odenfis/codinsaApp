const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const loadImage = (dataUrl: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('No se pudo procesar el logotipo oficial.'));
  image.src = dataUrl;
});

export interface TrimmedLogo {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

const logoResult = (canvas: HTMLCanvasElement): TrimmedLogo => ({
  dataUrl: canvas.toDataURL('image/png'),
  width: canvas.width,
  height: canvas.height,
  aspectRatio: canvas.width / canvas.height
});

export const loadTrimmedLogoDataUrl = async (url: string): Promise<TrimmedLogo> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo cargar el logotipo oficial.');
  const source = await loadImage(await blobToDataUrl(await response.blob()));
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = source.naturalWidth;
  sourceCanvas.height = source.naturalHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('No se pudo preparar el logotipo oficial.');
  sourceContext.drawImage(source, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  let left = sourceCanvas.width;
  let top = sourceCanvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < sourceCanvas.height; y += 1) {
    for (let x = 0; x < sourceCanvas.width; x += 1) {
      if (pixels[(y * sourceCanvas.width + x) * 4 + 3] <= 12) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return logoResult(sourceCanvas);
  const padding = Math.max(4, Math.round(Math.max(right - left, bottom - top) * 0.025));
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(sourceCanvas.width - 1, right + padding);
  bottom = Math.min(sourceCanvas.height - 1, bottom + padding);
  const output = document.createElement('canvas');
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  output.getContext('2d')?.drawImage(sourceCanvas, left, top, output.width, output.height, 0, 0, output.width, output.height);
  return logoResult(output);
};
