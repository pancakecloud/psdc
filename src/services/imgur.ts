function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

export async function uploadImageToImgur(file: File): Promise<string> {
  const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('Missing VITE_IMGUR_CLIENT_ID in environment');
  }

  // Phase 1: try multipart/form-data with type=file
  const tryMultipart = async (): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    form.append('type', 'file');
    let lastError: unknown;
    const maxAttempts = 4;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let res: Response;
      try {
        res = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${clientId}`,
          },
          body: form,
        });
      } catch (e) {
        // Network/HTTP2 error; backoff and retry
        await sleep(Math.min(2000 * 2 ** attempt, 15000));
        lastError = e;
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const link = data?.data?.link as string | undefined;
        if (!link) throw new Error('Imgur response missing link');
        return link;
      }

      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 0;
        const backoffMs = retryAfterMs || Math.min(2000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 250);
        await sleep(backoffMs);
        lastError = new Error('Rate limited by Imgur (429). Retrying...');
        continue;
      }

      // Non-retriable: break to allow base64 fallback
      let message = `Imgur upload failed (${res.status})`;
      try {
        const body = await res.json();
        message = (body && body.data && body.data.error) || message;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }
    throw lastError instanceof Error ? lastError : new Error('Imgur upload failed after retries');
  };

  // Phase 2: fallback to base64 body with type=base64
  const tryBase64 = async (): Promise<string> => {
    const b64 = await fileToBase64(file);
    let lastError: unknown;
    const maxAttempts = 4;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const form = new FormData();
      form.append('image', b64);
      form.append('type', 'base64');
      // Optional: better titles help Imgur identify content type
      form.append('title', file.name || 'upload');

      let res: Response;
      try {
        res = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${clientId}`,
          },
          body: form,
        });
      } catch (e) {
        await sleep(Math.min(2000 * 2 ** attempt, 15000));
        lastError = e;
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const link = data?.data?.link as string | undefined;
        if (!link) throw new Error('Imgur response missing link');
        return link;
      }

      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 0;
        const backoffMs = retryAfterMs || Math.min(2000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 250);
        await sleep(backoffMs);
        lastError = new Error('Rate limited by Imgur (429). Retrying...');
        continue;
      }

      let message = `Imgur upload failed (${res.status})`;
      try {
        const body = await res.json();
        message = (body && body.data && body.data.error) || message;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }
    throw lastError instanceof Error ? lastError : new Error('Imgur upload failed after retries');
  };

  // Try multipart first, then base64 fallback
  try {
    return await tryMultipart();
  } catch {
    return await tryBase64();
  }
}


