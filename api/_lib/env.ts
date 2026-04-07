export function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppBaseUrl(request: Request): string {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
