// /api/push.js — maneja suscripciones y envío de notificaciones push

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Firma JWT para VAPID
async function signVAPID(header, payload, privateKeyBase64url) {
  const encoder = new TextEncoder();
  
  const rawKey = Buffer.from(privateKeyBase64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const key = await crypto.subtle.importKey(
    'raw', rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const data = encoder.encode(
    btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') +
    '.' +
    btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  );

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data);
  const sigB64 = Buffer.from(sig).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return data.toString() + '.' + sigB64;
}

async function sendWebPush(subscription, payload) {
  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@edugestion.app';

  const audience = new URL(subscription.endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  // Construir JWT VAPID
  const header  = { typ: 'JWT', alg: 'ES256' };
  const jwtPayload = { aud: audience, exp: now + 3600, sub: VAPID_SUBJECT };

  const jwt = await signVAPID(header, jwtPayload, VAPID_PRIVATE);

  const body = JSON.stringify(payload);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'TTL': '86400',
    },
    body
  });

  return { status: res.status, ok: res.ok };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/push?action=vapidKey — devuelve la public key
  if (req.method === 'GET') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, subscription, notification } = req.body;

  // Guardar suscripción
  if (action === 'subscribe') {
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Suscripción inválida' });
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      subscription: JSON.stringify(subscription),
      created_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // Eliminar suscripción
  if (action === 'unsubscribe') {
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Endpoint requerido' });
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    return res.status(200).json({ ok: true });
  }

  // Enviar notificación a todos los suscriptores
  if (action === 'notify') {
    const secret = req.headers['x-push-secret'];
    if (secret !== process.env.BACKUP_SECRET) return res.status(401).json({ error: 'Unauthorized' });

    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    if (!subs?.length) return res.status(200).json({ sent: 0 });

    const results = await Promise.allSettled(
      subs.map(s => sendWebPush(JSON.parse(s.subscription), notification || {
        title: '📥 Nueva entrega',
        body: 'Un alumno entregó un trabajo. Entrá a Agenda para corregirlo.',
        icon: '/favicon.ico'
      }))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    return res.status(200).json({ sent, total: subs.length });
  }

  return res.status(400).json({ error: 'Acción no reconocida' });
}
