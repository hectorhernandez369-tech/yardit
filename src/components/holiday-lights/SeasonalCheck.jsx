// Utility to check if we're in holiday lights season (Nov 1 - Jan 2)
export function isHolidayLightsSeason() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();
  
  // November (10) or December (11)
  if (month === 10 || month === 11) return true;
  
  // January (0), days 1-2
  if (month === 0 && day <= 2) return true;
  
  return false;
}

export function getCurrentSeasonYear() {
  const now = new Date();
  const month = now.getMonth();
  
  // If in January, season year is previous year
  if (month === 0) return now.getFullYear() - 1;
  
  return now.getFullYear();
}

export function isLightsOnNow(location) {
  if (!location.display_active) return false;
  if (!location.start_date || !location.end_date) return false;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(location.start_date);
  const endDate = new Date(location.end_date);
  
  // Check if today is within the date range
  if (today < startDate || today > endDate) return false;
  
  // Check if current time is within viewing hours
  if (location.viewing_start_time && location.viewing_end_time) {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = location.viewing_start_time.split(':').map(Number);
    const [endHour, endMin] = location.viewing_end_time.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (currentTime < startTime || currentTime > endTime) return false;
  }
  
  return true;
}

export function isWithinViewingDates(location) {
  if (!location.start_date || !location.end_date) return false;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(location.start_date);
  const endDate = new Date(location.end_date);
  
  return today >= startDate && today <= endDate;
}