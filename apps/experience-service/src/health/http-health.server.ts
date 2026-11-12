import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { ExperienceHealthReport } from './experience-readiness';

interface HealthResponse {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body: string): void;
}

export interface ExperienceHealthReadiness {
  report(): Promise<ExperienceHealthReport>;
}

export function startHealthHttpServer(
  host: string,
  port: number,
  readiness: ExperienceHealthReadiness,
): Server {
  const server = createServer((request, response) => {
    void handleHealthRequest(request, response, readiness);
  });
  server.listen(port, host);
  return server;
}

export async function handleHealthRequest(
  request: IncomingMessage,
  response: HealthResponse,
  readiness: ExperienceHealthReadiness,
): Promise<void> {
  const path = request.url?.split('?')[0] ?? '';
  if (request.method === 'GET' && path === '/health/live') {
    writeJson(response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'GET' && path === '/health/ready') {
    await writeReadiness(response, readiness);
    return;
  }
  writeJson(response, 404, { status: 'error' });
}

async function writeReadiness(
  response: HealthResponse,
  readiness: ExperienceHealthReadiness,
): Promise<void> {
  try {
    const report = await readiness.report();
    writeJson(response, report.ready ? 200 : 503, {
      status: report.ready ? 'ok' : 'error',
      checks: readinessChecks(report),
    });
  } catch {
    writeJson(response, 503, {
      status: 'error',
      checks: { postgres: 'down' },
    });
  }
}

function readinessChecks(
  report: ExperienceHealthReport,
): Record<string, unknown> {
  const checks: Record<string, unknown> = {
    postgres: report.postgres,
  };
  if (report.database !== undefined) {
    checks.database = report.database;
  }
  if (report.runtimeRole !== undefined) {
    checks.runtimeRole = report.runtimeRole;
  }
  if (report.schemas !== undefined) {
    checks.schemas = report.schemas;
  }
  return checks;
}

function writeJson(
  response: HealthResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}
