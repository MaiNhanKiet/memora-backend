import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

export interface HealthReadiness {
  pingPostgres(): Promise<boolean>;
  pingRedis(): Promise<boolean>;
}

export function startHealthHttpServer(
  host: string,
  port: number,
  readiness: HealthReadiness,
): Server {
  const server = createServer((request, response) => {
    void handleHealthRequest(request, response, readiness);
  });
  server.listen(port, host);
  return server;
}

export async function handleHealthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  readiness: HealthReadiness,
): Promise<void> {
  const path = request.url?.split('?')[0] ?? '';
  if (request.method === 'GET' && path === '/health/live') {
    writeJson(response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'GET' && path === '/health/ready') {
    const postgres = await readiness.pingPostgres();
    const redis = await readiness.pingRedis();
    if (!postgres || !redis) {
      writeJson(response, 503, {
        status: 'error',
        checks: {
          postgres: postgres ? 'up' : 'down',
          redis: redis ? 'up' : 'down',
        },
      });
      return;
    }
    writeJson(response, 200, {
      status: 'ok',
      checks: { postgres: 'up', redis: 'up' },
    });
    return;
  }
  writeJson(response, 404, { status: 'error' });
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}
