export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim();
    const service = (body.service || '').trim();
    const msg = (body.msg || '').trim();
    const source = (body.source || 'viking-gym-site').trim();
    const url = (body.url || '').trim();
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
    const ua = request.headers.get('user-agent') || '';

    const line = [
      new Date().toISOString(),
      source,
      name.replace(/\s+/g, ' '),
      phone.replace(/\s+/g, ' '),
      service.replace(/\s+/g, ' '),
      msg.replace(/\r?\n/g, ' ').replace(/\s+/g, ' '),
      url, ip, ua
    ].join(';');

    if (env && env.LEADS_KV) {
      await env.LEADS_KV.put(`lead:${Date.now()}:${crypto.randomUUID()}`, line);
    }

    const botToken = (env && env.TELEGRAM_BOT_TOKEN) || '';
    const chatId = (env && env.TELEGRAM_CHAT_ID) || '';
    let sent = false;
    let tgError = '';
    if (botToken && chatId) {
      const text =
        `Новая заявка (Викинг)\n` +
        `Источник: ${source}\n` +
        `Имя: ${name || '-'}\n` +
        `Телефон: ${phone || '-'}\n` +
        `Интерес: ${service || '-'}\n` +
        `Комментарий: ${msg || '-'}\n` +
        `Ссылка: ${url || '-'}\n` +
        `IP: ${ip || '-'}\n` +
        `UA: ${ua || '-'}`;
      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      try {
        const res = await fetch(tgUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) });
        const data = await res.json().catch(() => null);
        sent = !!(data && data.ok);
        if (!sent) tgError = JSON.stringify(data || res.status);
      } catch (e) { tgError = String(e); }
      if (!sent) console.log('TELEGRAM_SEND_FAILED', tgError);
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
}