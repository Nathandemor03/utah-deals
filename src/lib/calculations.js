/**
 * calcMetrics — core rental property underwriting
 *
 * @param {number} price          - Purchase price
 * @param {number} rent           - Gross monthly rent
 * @param {number} [ltv=0.70]     - Loan-to-value ratio (e.g. 0.70 for 70%)
 * @param {number} [rate=0.065]   - Annual interest rate (e.g. 0.065 for 6.5%)
 * @returns {object}              - Full set of underwriting metrics
 */
export function calcMetrics(price, rent, ltv = 0.70, rate = 0.065) {
  // --- Financing ---
  const loan = price * ltv;
  const equity = price - loan;

  // Annual interest (interest-only approximation for DSC / first-year analysis)
  const annualInterest = loan * rate;

  // Monthly P&I payment (30-year amortizing)
  const monthlyRate = rate / 12;
  const n = 360; // 30 years
  const monthlyPayment =
    loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1);
  const annualDebtService = monthlyPayment * 12;

  // --- Operating expenses ---
  const annualTax = price * 0.01;
  const annualInsurance = price * 0.0025;
  const annualMgmt = rent * 12 * 0.005; // 0.5% of gross annual rent
  const annualCosts = annualTax + annualInsurance + annualMgmt;

  // --- Revenue ---
  const grossRent = rent * 12;
  const vacancy = grossRent * 0.07;
  const effectiveRent = grossRent - vacancy;

  // --- Net Operating Income ---
  const NOI = effectiveRent - annualCosts;

  // --- Returns ---
  const CoCReturn = (NOI - annualDebtService) / equity;
  const capRate = NOI / price;
  const DSCR = NOI / annualDebtService;
  const GRM = price / grossRent;

  // --- Cash flow ---
  const monthlyCashFlow = (NOI - annualDebtService) / 12;

  // --- Break-even occupancy ---
  // Occupancy at which NOI covers debt service
  // (annualCosts + annualDebtService) / grossRent
  const breakEvenOccupancy = (annualCosts + annualDebtService) / grossRent;

  // --- Rent needed for 7% CoC ---
  // Solve: (effectiveRent - annualCosts - annualDebtService) / equity = 0.07
  // effectiveRent = annualDebtService + annualCosts + 0.07 * equity
  // effectiveRent = grossRent * (1 - 0.07)  →  grossRent = effectiveRent / 0.93
  // annualCosts include mgmt which is 0.5% of grossRent, so we need to solve iteratively.
  // annualCosts(r) = price*0.01 + price*0.0025 + r*0.005
  // target = annualDebtService + annualCosts(r) + 0.07 * equity
  // effectiveRent = target  →  r*(1-0.07) = target  →  r = target/(1-0.07) solved algebraically:
  // r*(1-0.07) - r*0.005 = annualDebtService + (price*0.01 + price*0.0025) + 0.07*equity
  // r*(0.93 - 0.005) = annualDebtService + fixedCosts + 0.07*equity
  const fixedCosts = annualTax + annualInsurance;
  const target7 = annualDebtService + fixedCosts + 0.07 * equity;
  const rentNeeded = (target7 / (0.93 - 0.005)) / 12; // monthly rent

  return {
    loan,
    equity,
    annualInterest,
    annualTax,
    annualInsurance,
    annualMgmt,
    annualCosts,
    grossRent,
    vacancy,
    effectiveRent,
    NOI,
    CoCReturn,
    capRate,
    DSCR,
    GRM,
    monthlyCashFlow,
    breakEvenOccupancy,
    rentNeeded,
    // convenience
    monthlyPayment,
    annualDebtService,
  };
}
