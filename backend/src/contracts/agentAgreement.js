const agreements = new Map()

export const AGREEMENT_STATES = [
  "pending",
  "negotiating",
  "executing",
  "completed",
  "settled",
  "failed"
]

export function createAgreement({ taskId, provider, service, price }) {
  const agreement = {
    agreementId: `agreement_${taskId}`,
    taskId,
    provider,
    service,
    price,
    status: "pending",
    createdAt: Date.now()
  }
  agreements.set(agreement.agreementId, agreement)
  return agreement
}

export function updateAgreementStatus(agreementId, status) {
  const agreement = agreements.get(agreementId)
  if (!agreement) return null
  if (AGREEMENT_STATES.includes(status)) {
    agreement.status = status
    if (status === "executing" || status === "completed" || status === "settled") {
      agreement.updatedAt = Date.now()
    }
  }
  return agreement
}

export function completeAgreement(agreement) {
  if (!agreement) return null
  agreement.status = "completed"
  agreement.completedAt = Date.now()
  return agreement
}

export function failAgreement(agreement) {
  if (!agreement) return null
  agreement.status = "failed"
  agreement.failedAt = Date.now()
  return agreement
}

export function settleAgreement(agreement) {
  if (!agreement) return null
  agreement.status = "settled"
  agreement.settledAt = Date.now()
  return agreement
}

export function getAgreement(agreementId) {
  return agreements.get(agreementId) || null
}

export function getAllAgreements() {
  return Array.from(agreements.values())
}

