export const getDenominations = (currency) => {
  // Common denominations based on currency
  const denominations = {
    AED: [0.25, 0.50, 1, 5, 10, 20, 50, 100, 500, 1000],
    USD: [0.01, 0.05, 0.10, 0.25, 1, 2, 5, 10, 20, 50, 100],
    EUR: [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1, 2, 5, 10, 20, 50, 100, 200, 500],
    GBP: [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1, 2, 5, 10, 20, 50],
    INR: [1, 2, 5, 10, 20, 50, 100, 200, 500],
  };

  return denominations[currency] || denominations['AED']; // Default to AED if not found
};

export const formatDenominationLabel = (value, currency) => {
  if (currency === 'AED') {
    if (value < 1) {
      return `${value * 100} Fils`;
    }
  } else if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    if (value < 1) {
      return `${value * 100} Cents`; // simplified
    }
  }
  return `${value} ${currency}`;
};
