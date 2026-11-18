export interface GofileUploadResult {
  downloadPage: string;
  fileId: string;
  fileName: string;
  md5: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export async function uploadBlobToGofile(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<GofileUploadResult> {
  const base64Data = await blobToBase64(blob);
  const response = await fetch('/api/export-gofile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, mimeType, base64Data }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Gofile upload failed (${response.status})`);
  }
  return data as GofileUploadResult;
}
