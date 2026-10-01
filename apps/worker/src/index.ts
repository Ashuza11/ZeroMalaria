import { canAccessReferral, createToken, currentUser, publicUser, verifyPassword } from './auth';
import { apiError, json, readJson, uuid, withCors } from './http';
import { pindoAccessMode, speakWithPindo, transcribeWithPindo } from './pindo';
import { generateClinicalBrief } from './claude';
import type { DbUser, Env } from './types';

type ReferralRow = {
  id: string;
  client_uuid: string;
  facility_id: string;
  chw_id: string;
  district: string;
  sector: string;
  age_months: number;
  sex: string;
  decision: string;
  reasons_json: string;
  summary: string;
  status: string;
  created_at: string;
  received_at: string | null;
  arrived_at: string | null;
  treated_at: string | null;
  temperature_c: number | null;
  fever_days: number | null;
  tdr_result: string | null;
  other_symptoms: string;
  triggered_rules_json: string;
  protocol_reference: string;
  ai_brief: string;
};

type ReferralInput = {
  client_uuid: string;
  facility_id: string;
  chw_id?: string;
  district: string;
  sector?: string;
  age_months: number;
  sex: string;
  decision: 'refer' | 'urgent_refer';
  reasons?: string[];
  summary?: string;
  temperature_c?: number;
  fever_days?: number;
  tdr_result?: string;
  other_symptoms?: string;
  triggered_rules?: string[];
  protocol_reference?: string;
  ai_brief?: string;
};

const STATUS_ORDER = ['sent', 'received', 'arrived', 'treated'];

function referralOut(row: ReferralRow, overdueHours = 24) {
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  return {
    ...row,
    reasons: JSON.parse(row.reasons_json || '[]') as string[],
    triggered_rules: JSON.parse(row.triggered_rules_json || '[]') as string[],
    demo_flag: false,
    overdue:
      ['sent', 'received'].includes(row.status) &&
      !row.arrived_at &&
      ageMs >= overdueHours * 60 * 60 * 1000,
  };
}

async function addEvent(env: Env, type: string, payload: unknown) {
  await env.DB.prepare('INSERT INTO events (type, payload_json, created_at) VALUES (?, ?, ?)')
    .bind(type, JSON.stringify(payload), new Date().toISOString())
    .run();
}

async function createReferral(env: Env, body: ReferralInput): Promise<{ row: ReferralRow; duplicate: boolean }> {
  if (!body.client_uuid || !body.facility_id || !body.district) throw new Error('Missing referral fields');
  if (!['refer', 'urgent_refer'].includes(body.decision)) throw new Error('Referral decision is invalid');
  const existing = await env.DB.prepare('SELECT * FROM referrals WHERE client_uuid = ?')
    .bind(body.client_uuid)
    .first<ReferralRow>();
  if (existing) return { row: existing, duplicate: true };
  const id = uuid();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO referrals
      (id, client_uuid, facility_id, chw_id, district, sector, age_months, sex, decision,
       reasons_json, summary, status, created_at, temperature_c, fever_days, tdr_result,
       other_symptoms, triggered_rules_json, protocol_reference, ai_brief)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.client_uuid,
      body.facility_id,
      body.chw_id || 'CHW-BUG-01-01',
      body.district,
      body.sector || '',
      Number(body.age_months),
      body.sex || 'female',
      body.decision,
      JSON.stringify(body.reasons || []),
      body.summary || '',
      createdAt,
      body.temperature_c == null ? null : Number(body.temperature_c),
      body.fever_days == null ? null : Number(body.fever_days),
      body.tdr_result || null,
      body.other_symptoms || '',
      JSON.stringify(body.triggered_rules || []),
      body.protocol_reference || '',
      body.ai_brief || '',
    )
    .run();
  const row = await env.DB.prepare('SELECT * FROM referrals WHERE id = ?').bind(id).first<ReferralRow>();
  if (!row) throw new Error('Referral creation failed');
  await addEvent(env, 'referral.created', referralOut(row));
  return { row, duplicate: false };
}

function requireUser(user: DbUser | null): asserts user is DbUser {
  if (!user) throw new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
}

function requireRole(user: DbUser, roles: DbUser['role'][]) {
  if (!roles.includes(user.role)) {
    throw new Response(JSON.stringify({ detail: 'Not authorized' }), { status: 403 });
  }
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ username?: string; password?: string }>(request);
  const username = body.username?.trim().toLowerCase() || '';
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND active = 1')
    .bind(username)
    .first<DbUser>();
  if (!user || !(await verifyPassword(body.password || '', user.password_hash))) {
    return apiError('Invalid username or password', 401);
  }
  return json({
    access_token: await createToken(user, env),
    token_type: 'bearer',
    user: publicUser(user),
    must_change_password: false,
    password_prompt_status: 'dismissed',
    password_change_policy: 'prompt',
  });
}

async function demoLogin(request: Request, env: Env): Promise<Response> {
  if (env.DEMO_MODE !== 'true') return apiError('Demo login is disabled', 404);
  const body = await readJson<{ role?: string }>(request);
  const username: Record<string, string> = {
    CHW: 'chw.demo',
    HEALTH_CENTER: 'health.center',
    RBC_ADMIN: 'rbc.admin',
    SUPER_ADMIN: 'super.admin',
  };
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND active = 1')
    .bind(username[body.role || 'CHW'] || 'chw.demo')
    .first<DbUser>();
  if (!user) return apiError('Demo account is not seeded', 404);
  return json({
    access_token: await createToken(user, env),
    token_type: 'bearer',
    user: publicUser(user),
    must_change_password: false,
    password_prompt_status: 'dismissed',
    password_change_policy: 'prompt',
  });
}

async function listReferrals(url: URL, env: Env, user: DbUser): Promise<Response> {
  let sql = 'SELECT * FROM referrals';
  const conditions: string[] = [];
  const values: string[] = [];
  const requestedFacility = url.searchParams.get('facility_id');
  const requestedChw = url.searchParams.get('chw_id');

  if (user.role === 'CHW') {
    conditions.push('chw_id = ?');
    values.push(user.chw_code);
  } else if (user.role === 'HEALTH_CENTER') {
    conditions.push('facility_id = ?');
    values.push(user.facility_id);
  } else if (requestedFacility) {
    conditions.push('facility_id = ?');
    values.push(requestedFacility);
  } else if (requestedChw) {
    conditions.push('chw_id = ?');
    values.push(requestedChw);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += " ORDER BY CASE decision WHEN 'urgent_refer' THEN 0 ELSE 1 END, created_at DESC";
  const result = await env.DB.prepare(sql).bind(...values).all<ReferralRow>();
  const hours = Number(env.OVERDUE_HOURS || 24);
  return json(result.results.map((row) => referralOut(row, hours)));
}

async function patchReferralStatus(request: Request, env: Env, user: DbUser, id: string): Promise<Response> {
  requireRole(user, ['HEALTH_CENTER', 'RBC_ADMIN', 'SUPER_ADMIN']);
  const row = await env.DB.prepare('SELECT * FROM referrals WHERE id = ?').bind(id).first<ReferralRow>();
  if (!row) return apiError('Referral not found', 404);
  if (!canAccessReferral(user, row)) return apiError('Outside referral scope', 403);
  const body = await readJson<{ status?: string }>(request);
  const next = body.status || '';
  if (!STATUS_ORDER.includes(next)) return apiError('Invalid status');
  if (STATUS_ORDER.indexOf(next) < STATUS_ORDER.indexOf(row.status)) {
    return apiError('Cannot move status backwards');
  }
  const now = new Date().toISOString();
  const received = ['received', 'arrived', 'treated'].includes(next) ? row.received_at || now : row.received_at;
  const arrived = ['arrived', 'treated'].includes(next) ? row.arrived_at || now : row.arrived_at;
  const treated = next === 'treated' ? row.treated_at || now : row.treated_at;
  await env.DB.prepare(
    'UPDATE referrals SET status = ?, received_at = ?, arrived_at = ?, treated_at = ? WHERE id = ?',
  )
    .bind(next, received, arrived, treated, id)
    .run();
  const updated = await env.DB.prepare('SELECT * FROM referrals WHERE id = ?').bind(id).first<ReferralRow>();
  if (!updated) return apiError('Referral not found', 404);
  await addEvent(env, 'referral.status_changed', {
    ...referralOut(updated),
    previous_status: row.status,
    new_status: next,
  });
  return json(referralOut(updated));
}

async function referralMessages(request: Request, env: Env, user: DbUser, id: string): Promise<Response> {
  const referral = await env.DB.prepare('SELECT * FROM referrals WHERE id = ?').bind(id).first<ReferralRow>();
  if (!referral) return apiError('Referral not found', 404);
  if (!canAccessReferral(user, referral)) return apiError('Outside referral scope', 403);
  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT id, referral_id, sender_id, sender_role, body, created_at, NULL AS read_at FROM referral_messages WHERE referral_id = ? ORDER BY created_at',
    )
      .bind(id)
      .all();
    return json(rows.results);
  }
  const body = await readJson<{ body?: string }>(request);
  const message = body.body?.trim() || '';
  if (!message || message.length > 2000) return apiError('Message must contain 1–2000 characters');
  const messageId = uuid();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO referral_messages (id, referral_id, sender_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(messageId, id, user.id, user.role, message, createdAt)
    .run();
  const output = {
    id: messageId,
    referral_id: id,
    sender_id: user.id,
    sender_role: user.role,
    body: message,
    created_at: createdAt,
    read_at: null,
  };
  await addEvent(env, 'referral.message', output);
  return json(output, 201);
}

async function alerts(env: Env, user: DbUser): Promise<Response> {
  let sql = "SELECT * FROM referrals WHERE status IN ('sent', 'received') AND arrived_at IS NULL";
  const args: string[] = [];
  if (user.role === 'CHW') {
    sql += ' AND chw_id = ?';
    args.push(user.chw_code);
  } else if (user.role === 'HEALTH_CENTER') {
    sql += ' AND facility_id = ?';
    args.push(user.facility_id);
  }
  sql += ' ORDER BY created_at';
  const rows = await env.DB.prepare(sql).bind(...args).all<ReferralRow>();
  const threshold = Number(env.OVERDUE_HOURS || 24) * 60 * 60 * 1000;
  return json(
    rows.results
      .filter((row) => Date.now() - new Date(row.created_at).getTime() >= threshold)
      .map((row) => ({
        type: 'referral_not_arrived',
        message: 'Patient has not arrived, follow up',
        referral: referralOut(row),
      })),
  );
}

async function analytics(path: string, url: URL, env: Env, user: DbUser): Promise<Response> {
  requireRole(user, ['RBC_ADMIN', 'SUPER_ADMIN']);
  const district = url.searchParams.get('district');
  const where = district ? ' WHERE district = ?' : '';
  const args = district ? [district] : [];
  const rows = await env.DB.prepare(`SELECT * FROM referrals${where}`).bind(...args).all<ReferralRow>();
  const referrals = rows.results;
  const referred = referrals.length;
  const received = referrals.filter((r) => ['received', 'arrived', 'treated'].includes(r.status)).length;
  const arrived = referrals.filter((r) => ['arrived', 'treated'].includes(r.status)).length;
  const treated = referrals.filter((r) => r.status === 'treated').length;
  const activeAlerts = referrals.filter(
    (r) => ['sent', 'received'].includes(r.status) && !r.arrived_at && Date.now() - new Date(r.created_at).getTime() >= 86_400_000,
  ).length;
  const delays = referrals
    .filter((r) => r.arrived_at)
    .map((r) => (new Date(r.arrived_at as string).getTime() - new Date(r.created_at).getTime()) / 3_600_000);

  if (path === '/analytics/funnel') {
    return json({ live_referrals: { referred, received, arrived, treated } });
  }
  if (path === '/analytics/kpis') {
    return json({
      cases_today: referred,
      urgent_referrals: referrals.filter((r) => r.decision === 'urgent_refer').length,
      referral_completion_rate: referred ? arrived / referred : 0,
      avg_arrival_delay_hours: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 0,
      active_alerts: activeAlerts,
    });
  }
  if (path === '/analytics/stock') {
    const stock = await env.DB.prepare(
      `SELECT facility_name, commodity, weeks_of_cover, stockout,
       CASE WHEN stockout = 1 THEN 'stockout' WHEN weeks_of_cover < 2 THEN 'low' ELSE 'ok' END AS risk
       FROM stock${where}`,
    )
      .bind(...args)
      .all();
    return json({ cells: stock.results.map((row) => ({ ...row, stockout: Boolean(row.stockout) })) });
  }
  if (path === '/analytics/hotspots') {
    return json({ synthetic: false, signals: [], note: 'Referral operational signals only; not outbreak confirmation.' });
  }
  const byDistrict: Record<string, number> = {};
  for (const row of referrals) byDistrict[row.district] = (byDistrict[row.district] || 0) + 1;
  const today = new Date();
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, cases: referrals.filter((r) => r.created_at.slice(0, 10) === key).length };
  });
  return json({
    cases_today: series.at(-1)?.cases || 0,
    urgent_referrals: referrals.filter((r) => r.decision === 'urgent_refer').length,
    series,
    forecast: [],
    by_district: byDistrict,
  });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (path === '/health') return json({ status: 'ok', runtime: 'cloudflare-worker', synthetic: false });
  if (path === '/auth/login' && request.method === 'POST') return login(request, env);
  if (path === '/auth/demo-login' && request.method === 'POST') return demoLogin(request, env);

  const user = await currentUser(request, env);
  if (path === '/auth/me') {
    requireUser(user);
    return json(publicUser(user));
  }
  if (path === '/auth/logout' && request.method === 'POST') return json({ ok: true });

  requireUser(user);

  if ((path === '/referrals' || path === '/referrals/scoped') && request.method === 'GET') {
    return listReferrals(url, env, user);
  }
  if (path === '/referrals' && request.method === 'POST') {
    requireRole(user, ['CHW', 'RBC_ADMIN', 'SUPER_ADMIN']);
    const body = await readJson<ReferralInput>(request);
    if (user.role === 'CHW') body.chw_id = user.chw_code;
    const created = await createReferral(env, body);
    return json(referralOut(created.row), created.duplicate ? 200 : 201);
  }
  const statusMatch = path.match(/^\/referrals\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'PATCH') {
    return patchReferralStatus(request, env, user, statusMatch[1]);
  }
  const messageMatch = path.match(/^\/referrals\/([^/]+)\/messages$/);
  if (messageMatch && ['GET', 'POST'].includes(request.method)) {
    return referralMessages(request, env, user, messageMatch[1]);
  }
  if (path === '/alerts' && request.method === 'GET') return alerts(env, user);

  if (path === '/sync' && request.method === 'POST') {
    requireRole(user, ['CHW']);
    const body = await readJson<{ items?: Array<{ client_uuid: string; type: string; payload: ReferralInput }> }>(request);
    let accepted = 0;
    let duplicates = 0;
    const results = [];
    for (const item of body.items || []) {
      if (item.type !== 'referral') continue;
      item.payload.client_uuid = item.client_uuid;
      item.payload.chw_id = user.chw_code;
      const created = await createReferral(env, item.payload);
      created.duplicate ? duplicates++ : accepted++;
      results.push({ client_uuid: item.client_uuid, id: created.row.id, duplicate: created.duplicate });
    }
    return json({ accepted, duplicates, results });
  }

  if (path === '/events/poll' && request.method === 'GET') {
    const since = url.searchParams.get('since') || new Date(Date.now() - 60_000).toISOString();
    const events = await env.DB.prepare(
      'SELECT type, payload_json, created_at AS at FROM events WHERE created_at > ? ORDER BY id LIMIT 100',
    )
      .bind(since)
      .all<{ type: string; payload_json: string; at: string }>();
    return json({
      events: events.results.map((event) => ({ type: event.type, payload: JSON.parse(event.payload_json), at: event.at })),
      server_at: new Date().toISOString(),
    });
  }

  if (path === '/voice/status') {
    const accessMode = pindoAccessMode(env);
    return json({
      provider: 'pindo',
      configured: accessMode === 'public' || Boolean(env.PINDO_API_TOKEN),
      access_mode: accessMode,
      supported_languages: ['rw'],
    });
  }
  if (path === '/voice/speak' && request.method === 'POST') {
    const body = await readJson<{ phrase_id?: string; language?: string; text?: string; speech_rate?: number }>(request);
    if (body.language !== 'rw' || !body.text?.trim()) return apiError('Kinyarwanda text is required');
    const audioUrl = await speakWithPindo(env, body.text, Number(body.speech_rate || 1));
    return json({ ok: true, provider_used: 'pindo', phrase_id: body.phrase_id, language: 'rw', audio_url: audioUrl });
  }
  if (path === '/voice/speak-audio' && request.method === 'POST') {
    const body = await readJson<{ phrase_id?: string; language?: string; text?: string; speech_rate?: number }>(request);
    if (body.language !== 'rw' || !body.text?.trim()) return apiError('Kinyarwanda text is required');
    const audioUrl = await speakWithPindo(env, body.text, Number(body.speech_rate || 1));
    const audio = await fetch(audioUrl);
    if (!audio.ok || !audio.body) return apiError('Pindo audio could not be downloaded', 502);
    return new Response(audio.body, {
      status: 200,
      headers: {
        'content-type': audio.headers.get('content-type') || 'audio/wav',
        'cache-control': 'no-store',
        'x-voice-provider': 'pindo',
      },
    });
  }
  if (path === '/voice/transcribe' && request.method === 'POST') {
    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size === 0) return apiError('Audio file is required');
    if (audio.size > 12 * 1024 * 1024) return apiError('Audio file is too large', 413);
    const transcript = await transcribeWithPindo(env, audio);
    return json({ ok: true, provider_used: 'pindo', language: 'rw', transcript });
  }

  if (path === '/ai/visit-summary' && request.method === 'POST') {
    const body = await readJson<{
      answers?: Record<string, unknown>;
      rules_decision?: string;
      decision?: string;
      reasons?: string[];
      triggered_rules?: string[];
      free_text?: string;
      language?: string;
      treatment_plan?: Record<string, unknown> | null;
    }>(request);
    const decision = body.rules_decision || body.decision || 'refer';
    const brief = await generateClinicalBrief(env, {
      answers: body.answers || {},
      rulesDecision: decision,
      reasons: body.reasons || [],
      triggeredRules: body.triggered_rules || [],
      freeText: body.free_text,
      language: body.language,
      treatmentPlan: body.treatment_plan || null,
    });
    return json({
      ok: true,
      task: 'summary',
      data: {
        summary: brief.summary,
        label: 'Generated nurse clinical handoff brief — verify before use',
        needs_native_review: body.language?.startsWith('rw') || false,
      },
      provider_used: brief.provider,
      model: brief.model,
      latency_ms: brief.latencyMs,
      fallback_reason: brief.fallbackReason || null,
    });
  }

  if (path.startsWith('/analytics/')) return analytics(path, url, env, user);
  if (path === '/facilities') {
    const facilities = await env.DB.prepare('SELECT * FROM facilities WHERE active = 1 ORDER BY name').all();
    return json(facilities.results);
  }

  return apiError('Not found', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      return withCors(await route(request, env));
    } catch (error) {
      if (error instanceof Response) return withCors(error);
      const message = error instanceof Error ? error.message : 'Unexpected error';
      return withCors(apiError(message, 500));
    }
  },
} satisfies ExportedHandler<Env>;
