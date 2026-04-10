import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.resolve(process.cwd(), 'google-services-control-acceso.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    // ignore, fallback to env
  }
  return null;
}

async function getServerKey() {
  const envKey = process.env.FCM_SERVER_KEY;
  if (envKey && envKey.trim().length > 0) return envKey;

  const cfg = loadConfig();
  const keyFromJson = cfg?.client?.[0]?.api_key?.[0]?.current_key;
  return keyFromJson || '';
}

export async function sendToTokens(tokens: string[], title: string, body: string, data: any = {}) {
  // Prefer HTTP v1 via firebase-admin if service account is available.
  const admin = await initFirebaseAdminIfAvailable();
  

  if (admin) {
    const chunkSize = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += chunkSize) chunks.push(tokens.slice(i, i + chunkSize));

    const results: any[] = [];
    for (const chunk of chunks) {
      // El objeto mensaje ahora se estructura igual, pero usamos el nuevo método
      const message = {
        tokens: chunk,
        notification: { title, body },
        data: Object.entries(data || {}).reduce((acc: any, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
      };

      // CAMBIO AQUÍ: de sendMulticast a sendEachForMulticast
      const resp = await admin.messaging().sendEachForMulticast(message);

      console.log('[fcm] sendEachForMulticast response', {
        successCount: resp.successCount,
        failureCount: resp.failureCount,
        responses: resp.responses,
      });

      results.push({
        successCount: resp.successCount,
        failureCount: resp.failureCount,
        responses: resp.responses
      });
    }
    return { provider: 'http_v1', results };
  }
  // Fallback to legacy HTTP endpoint using server key
  const serverKey = await getServerKey();
  console.debug('[fcm] legacy server key present:', serverKey ? 'yes' : 'no', serverKey ? `len=${serverKey.length}` : '');
  if (!serverKey) {
    throw new Error('FCM server key not found. Set FCM_SERVER_KEY env or provide a service account JSON via `FCM_SERVICE_ACCOUNT`/`FCM_SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`.');
  }

  const payload = {
    registration_ids: tokens,
    notification: {
      title,
      body,
    },
    data,
  };

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    const hint = 'Ensure `FCM_SERVER_KEY` env var is set to your Firebase Server (legacy) key from the Firebase Console (Project Settings → Cloud Messaging), or install/configure `firebase-admin` to use the HTTP v1 API.';
    throw new Error(`FCM error: ${res.status} ${text} - ${hint}`);
  }
  console.log('[fcm] legacy FCM response', { status: res.status, body: text });
  return { provider: 'legacy', text };
}

function normalizeEnvPath(envPath: string) {
  return envPath.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

async function initFirebaseAdminIfAvailable() {
  // Try env vars indicating a service account; if none, skip.
  const hasServiceAccountEnv = !!process.env.FCM_SERVICE_ACCOUNT || !!process.env.FCM_SERVICE_ACCOUNT_PATH || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!hasServiceAccountEnv) return null;

  try {
    // require lazily so the project doesn't need firebase-admin unless used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    if (admin.apps && admin.apps.length > 0) return admin;

    if (process.env.FCM_SERVICE_ACCOUNT) {
      const creds = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
      return admin;
    }

    if (process.env.FCM_SERVICE_ACCOUNT_PATH) {
      const rawPath = normalizeEnvPath(process.env.FCM_SERVICE_ACCOUNT_PATH);
      const p = path.resolve(process.cwd(), rawPath);
      const raw = fs.readFileSync(p, 'utf8');
      const creds = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
      return admin;
    }

    // If GOOGLE_APPLICATION_CREDENTIALS is set, let the SDK pick it up
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      return admin;
    }
  } catch (err: any) {
    throw new Error(`firebase-admin init error: ${err?.message || err}`);
  }
  return null;
}

export default {
  sendToTokens,
};
