/**
 * Format a number as Euro currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a percentage number
 */
export const formatPercent = (percent: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(percent / 100);
};

/**
 * Format a date in Italian locale
 */
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

/**
 * Format a date to show just time
 */
export const formatTime = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Get a friendly relative date string (today, yesterday, etc.)
 */
export const getRelativeDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  
  if (dateToCheck.getTime() === today.getTime()) {
    return "Oggi";
  } else if (dateToCheck.getTime() === yesterday.getTime()) {
    return "Ieri";
  } else {
    // Get day of week for dates within the last week
    const diffTime = Math.abs(today.getTime() - dateToCheck.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date);
    } else {
      return formatDate(date);
    }
  }
};

/**
 * Calculate remaining days message
 */
export const getRemainingDaysMessage = (targetDate: string | Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(target.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return "Manca 1 giorno";
  } else {
    return `Mancano ${diffDays} giorni`;
  }
};

/**
 * Convert currency string to number
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbol, thousand separators and replace comma with dot
  const cleanValue = value
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue);
};
