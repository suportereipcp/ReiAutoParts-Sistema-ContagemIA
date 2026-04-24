import 'dotenv/config';

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CAMERA_1_IP',
  'CAMERA_2_IP',
];

export function loadConfig(env = process.env) {
  for (const key of REQUIRED) {
    if (!env[key]) {
      throw new Error(`variável obrigatória ausente: ${key}`);
    }
  }
  return {
    supabase: {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cameras: [
      { id: 1, ip: env.CAMERA_1_IP, porta: Number(env.CAMERA_1_PORTA ?? 8500) },
      { id: 2, ip: env.CAMERA_2_IP, porta: Number(env.CAMERA_2_PORTA ?? 8500) },
    ],
    camera: {
      programScanMax: Number(env.CAMERA_PROGRAM_SCAN_MAX ?? 32),
      programScanDelayMs: Number(env.CAMERA_PROGRAM_SCAN_DELAY_MS ?? 200),
    },
    http: {
      host: env.HTTP_HOST ?? '127.0.0.1',
      port: Number(env.HTTP_PORT ?? 3000),
    },
    sync: {
      pollerIntervalMs: Number(env.SYNC_POLLER_MS ?? 30000),
      healthcheckIntervalMs: Number(env.SYNC_HEALTHCHECK_MS ?? 30000),
      failureThreshold: Number(env.SYNC_FAILURES_BEFORE_OFFLINE ?? 3),
    },
    db: {
      path: env.SQLITE_PATH ?? './data/contagem.db',
    },
    logs: {
      level: env.LOG_LEVEL ?? 'info',
      path: env.LOG_PATH ?? './logs/app.log',
    },
  };
}

export const config = loadConfig();
