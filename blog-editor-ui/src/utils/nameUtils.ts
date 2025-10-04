/**
 * Extracts the first name from a full name string
 * @param fullName - The full name string to extract from
 * @returns The first name or empty string if extraction fails
 */
export const extractFirstName = (fullName: string | undefined): string => {
  // Handle undefined, null, or empty string cases
  if (!fullName?.trim()) {
    return '';
  }

  // Split by whitespace and take the first part
  const nameParts = fullName.trim().split(/\s+/);

  // Return the first part (first name)
  return nameParts[0] || '';
};
