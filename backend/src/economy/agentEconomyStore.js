const agentEconomy = {}

export function getAgentEconomy(agent) {
  if (!agentEconomy[agent]) {
    agentEconomy[agent] = {
      revenue: 0,
      expenses: 0,
      profit: 0
    }
  }

  return agentEconomy[agent]
}

export function recordRevenue(agent, amount) {
  const econ = getAgentEconomy(agent)

  econ.revenue += Number(amount)
  econ.profit = econ.revenue - econ.expenses
}

export function recordExpense(agent, amount) {
  const econ = getAgentEconomy(agent)

  econ.expenses += Number(amount)
  econ.profit = econ.revenue - econ.expenses
}

export function getAllAgentEconomy() {
  return agentEconomy
}

