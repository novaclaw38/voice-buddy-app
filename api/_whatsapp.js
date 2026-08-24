// Meta WhatsApp Cloud API send helper. `_`-prefixed so Vercel doesn't treat
// it as a routable function (stays under the Hobby-plan 12-function cap).
// Only template messages are supported — outside the 24h customer-service
// window, Meta requires a pre-approved template for any business-initiated
// message, which is what the weekly digest always is.

export async function sendWhatsAppTemplateMessage(phoneNumber, templateName, bodyParams = []) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: bodyParams.length
            ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }]
            : [],
        },
      }),
    })
  } catch (err) {
    console.error('whatsapp: request failed', err)
    return { ok: false, error: 'Could not reach WhatsApp' }
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('whatsapp: send failed', response.status, body)
    return { ok: false, error: body?.error?.message || 'WhatsApp send failed' }
  }

  return { ok: true, messageId: body?.messages?.[0]?.id || null }
}
