// Shared by UpgradePrompt (modal) and EliteAcademyCard (Promotion Center
// inline card) — both trigger the same Buddy Pro checkout, just from
// different UI shells. See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export async function startCheckout(session) {
  if (!session) return { ok: false, message: 'Something went wrong starting checkout. Please try again.' }
  try {
    const res = await fetch('/api/payfast-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        firstName: session.user.user_metadata?.full_name?.split(' ')[0] || 'Parent',
      }),
    })
    const { paymentUrl, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = paymentUrl
    return { ok: true }
  } catch (err) {
    console.error('Upgrade error:', err)
    return { ok: false, message: 'Something went wrong starting checkout. Please try again.' }
  }
}
