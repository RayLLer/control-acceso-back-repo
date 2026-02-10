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
  const cfg = loadConfig();
  const keyFromJson = cfg?.client?.[0]?.api_key?.[0]?.current_key;
  return keyFromJson || process.env.FCM_SERVER_KEY || '';
}

export async function sendToTokens(tokens: string[], title: string, body: string, data: any = {}) {
  const serverKey = await getServerKey();
  if (!serverKey) {
    throw new Error('FCM server key not found. Set FCM_SERVER_KEY env or include api_key in google-services-control-acceso.json');
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
    throw new Error(`FCM error: ${res.status} ${text}`);
  }
  return text;
}

export default {
  sendToTokens,
};
