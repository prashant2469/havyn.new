export function parsePhoneNumber(phone: string): string[] {
  if (!phone) return [];
  
  // Remove all non-numeric characters
  const numbers = phone.match(/\d+/g);
  if (!numbers) return [];

  // Join all numbers and split into groups of 10 digits
  const allDigits = numbers.join('');
  const phoneNumbers: string[] = [];
  
  for (let i = 0; i < allDigits.length; i += 10) {
    const tenDigits = allDigits.slice(i, i + 10);
    if (tenDigits.length === 10) {
      phoneNumbers.push(`${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`);
    }
  }

  return phoneNumbers;
}

export function parseEmails(emailStr: string): string[] {
  if (!emailStr) return [];
  
  // Match email pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return emailStr.match(emailRegex) || [];
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}