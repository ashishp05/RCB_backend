// Money is stored as integer paise. The API speaks rupees (may carry paise as decimals).
export const toRupees = (paise: number): number => Math.round(paise) / 100;

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

// Rate stored in basis points (1800) <-> percent in the API (18).
export const bpsToPercent = (bps: number): number => bps / 100;

export const percentToBps = (percent: number): number => Math.round(percent * 100);

export const formatRupees = (paise: number): string =>
  `Rs ${toRupees(paise).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
