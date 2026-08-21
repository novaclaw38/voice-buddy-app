import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertedRows = { payfast_webhook_events: [], subscriptions: [], payments: [] }

function makeQueryBuilder(table) {
  return {
    insert: vi.fn((row) => {
      if (table === 'payfast_webhook_events') {
        const dup = insertedRows.payfast_webhook_events.some((r) => r.pf_payment_id === row.pf_payment_id)
        insertedRows.payfast_webhook_events.push(row)
        return Promise.resolve({ error: dup ? { code: '23505' } : null })
      }
      insertedRows[table].push(row)
      return Promise.resolve({ error: null })
    }),
    upsert: vi.fn((row) => {
      insertedRows[table].push(row)
      return Promise.resolve({ error: null })
    }),
  }
}

const mockDb = {
  from: vi.fn((table) => makeQueryBuilder(table)),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockDb,
}))

import handler from './payfast-webhook.js'

function mockRes() {
  const res = { statusCode: 0 }
  res.status = (c) => { res.statusCode = c; return res }
  res.end = () => res
  return res
}

function mockReq(body) {
  return { method: 'POST', body }
}

const crypto = await import('crypto')
function signBody(body, passphrase) {
  const paramString = Object.entries(body)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')
  const signatureInput = `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
  return crypto.createHash('md5').update(signatureInput).digest('hex')
}

describe('payfast-webhook payments ledger', () => {
  const passphrase = 'test-pass'

  beforeEach(() => {
    vi.clearAllMocks()
    insertedRows.payfast_webhook_events = []
    insertedRows.subscriptions = []
    insertedRows.payments = []
    process.env.PAYFAST_PASSPHRASE = passphrase
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
    process.env.PAYFAST_SANDBOX = 'true'
    global.fetch = vi.fn().mockResolvedValue({ text: async () => 'VALID' })
  })

  it('logs a complete recurring charge as a payments row', async () => {
    const body = {
      m_payment_id: 'user-1',
      payment_status: 'COMPLETE',
      token: 'tok-1',
      amount_gross: '149.00',
      pf_payment_id: 'pf-1',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments).toHaveLength(1)
    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-1',
      user_id: 'user-1',
      amount: 149,
      status: 'complete',
      payment_type: 'recurring',
    })
  })

  it('logs a complete trial setup (R0) as trial_setup', async () => {
    const body = {
      m_payment_id: 'user-2',
      payment_status: 'COMPLETE',
      token: 'tok-2',
      amount_gross: '0.00',
      pf_payment_id: 'pf-2',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-2',
      amount: 0,
      status: 'complete',
      payment_type: 'trial_setup',
    })
  })

  it('logs a cancelled notification as status cancelled', async () => {
    const body = {
      m_payment_id: 'user-3',
      payment_status: 'CANCELLED',
      amount_gross: '0.00',
      pf_payment_id: 'pf-3',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-3',
      status: 'cancelled',
    })
  })

  it('does not insert a duplicate payments row for a replayed pf_payment_id', async () => {
    const body = {
      m_payment_id: 'user-1',
      payment_status: 'COMPLETE',
      amount_gross: '149.00',
      pf_payment_id: 'pf-dupe',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments).toHaveLength(1)
  })
})
