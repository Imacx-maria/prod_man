// Utility to parse a date string as a local date (YYYY-MM-DD)
export const parseDateFromYYYYMMDD = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

// Utility to format a Date as 'YYYY-MM-DD' in local time
export const formatDateToYYYYMMDD = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}; 