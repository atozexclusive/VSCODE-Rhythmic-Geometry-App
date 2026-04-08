export function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

type RequestLike = Request | {
  method?: string;
  url?: string;
  headers?: Headers | Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, listener: (chunk: unknown) => void) => void;
};

export function getRequestHeader(request: RequestLike, name: string): string | null {
  const normalizedName = name.toLowerCase();
  const headers = request.headers;

  if (!headers) {
    return null;
  }

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }

  const value = (headers as Record<string, string | string[] | undefined>)[normalizedName]
    ?? (headers as Record<string, string | string[] | undefined>)[name];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getRequestText(request: RequestLike): Promise<string> {
  if (typeof (request as Request).text === 'function') {
    return (request as Request).text();
  }

  if (typeof request.body === 'string') {
    return request.body;
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(request.body)) {
    return request.body.toString('utf8');
  }

  if (request.body && typeof request.body === 'object') {
    return JSON.stringify(request.body);
  }

  if (typeof request.on === 'function') {
    const chunks: Uint8Array[] = [];

    await new Promise<void>((resolve, reject) => {
      request.on?.('data', (chunk) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
          return;
        }
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
          return;
        }
        if (chunk instanceof Uint8Array) {
          chunks.push(chunk);
        }
      });
      request.on?.('end', () => resolve());
      request.on?.('error', (error) => reject(error));
    });

    return Buffer.concat(chunks).toString('utf8');
  }

  return '';
}

export function getAppBaseUrl(request: RequestLike): string {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const forwardedProto = getRequestHeader(request, 'x-forwarded-proto') ?? 'https';
  const forwardedHost = getRequestHeader(request, 'x-forwarded-host') ?? getRequestHeader(request, 'host');
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  const url = new URL(request.url ?? 'http://localhost');
  return `${url.protocol}//${url.host}`;
}
