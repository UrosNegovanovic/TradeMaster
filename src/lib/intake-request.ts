type Journal = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type IntakeBody = { sku: string; [key: string]: unknown }

/** Persist before sending: a lost response must retry the same operation/body. */
export async function submitIntake(
  userId: string,
  body: IntakeBody,
  journal: Journal,
  send: typeof fetch = fetch
) {
  const storageKey = `trademaster:intake:${userId}:${body.sku}`
  const saved = journal.getItem(storageKey)
  const operation: { key: string; body: IntakeBody } = saved
    ? JSON.parse(saved)
    : { key: crypto.randomUUID(), body }
  if (!operation.key || operation.body?.sku !== body.sku) throw new Error('Invalid pending intake')
  journal.setItem(storageKey, JSON.stringify(operation))
  const response = await send('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operation.key },
    body: JSON.stringify(operation.body),
  })
  if (!response.ok) throw new Error(`Intake failed (${response.status})`)
  const result = await response.json()
  // If removal fails, the next attempt safely replays the same server receipt.
  journal.removeItem(storageKey)
  return result
}
