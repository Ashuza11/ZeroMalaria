const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function apiError(message: string, status = 400): Response {
  return json({ detail: message }, status);
}

export async function readJson<T>(request: Request): Promise<T> {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Expected JSON request');
  return request.json<T>();
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-headers', 'authorization, content-type');
  headers.set('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function uuid(): string {
  return crypto.randomUUID();
}
