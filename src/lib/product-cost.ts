export type CostWriteInput = {
  costPrice?: number | null
  costPriceZeroReason?: string | null
}

/** Persist purchase cost + zero-reason together. Omit both when the client did not send a cost. */
export function productCostWriteFields(input: CostWriteInput) {
  if (input.costPrice === undefined) {
    return {}
  }

  if (input.costPrice === null) {
    return { costPrice: null, costPriceZeroReason: null }
  }

  return {
    costPrice: input.costPrice,
    costPriceZeroReason: input.costPrice === 0 ? input.costPriceZeroReason?.trim() || null : null,
  }
}
