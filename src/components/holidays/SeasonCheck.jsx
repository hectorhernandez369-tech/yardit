// Holiday season utilities
export function isHolidaySeason() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  
  // Nov 1 (month 10) to Jan 2 (month 0)
  return (month === 10 && day >= 1) || (month === 11) || (month === 0 && day <= 2);
}

export function getCurrentSeasonYear() {
  const now = new Date();
  const month = now.getMonth();
  // If in Jan 1-2, use previous year
  return month === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

export function isWithinViewingHours(startTime, endTime) {
  if (!startTime || !endTime) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentTime >= startMinutes && currentTime <= endMinutes;
}

export const BANNED_SALE_TERMS = [
  'yard sale', 'garage sale', 'rummage', 'estate sale', 'moving sale', 
  'swap meet', 'selling', 'for sale', 'priced', '$', 'dollars'
];

export function containsSaleTerms(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_SALE_TERMS.some(term => lowerText.includes(term));
}