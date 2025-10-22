/**
 * Versioning utilities for content management
 * Implements semantic versioning with major.minor format
 */

/**
 * Parse a version string into major and minor components
 * @param {string|number} version - Version string (e.g., "1.2") or legacy number (e.g., 1)
 * @returns {Object} Object with major and minor properties
 */
export const parseVersion = (version) => {
  if (typeof version === 'number') {
    // Legacy integer version - treat as major version with minor 0
    return { major: version, minor: 0 };
  }

  if (typeof version === 'string') {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    return { major, minor };
  }

  // Default fallback
  return { major: 1, minor: 0 };
};

/**
 * Format version components into a version string
 * @param {number} major - Major version number
 * @param {number} minor - Minor version number
 * @returns {string} Formatted version string (e.g., "1.2")
 */
export const formatVersion = (major, minor) => {
  return `${major}.${minor}`;
};

/**
 * Increment minor version
 * @param {string|number} currentVersion - Current version
 * @returns {string} New version string with incremented minor version
 */
export const incrementMinorVersion = (currentVersion) => {
  const { major, minor } = parseVersion(currentVersion);
  return formatVersion(major, minor + 1);
};

/**
 * Increment major version (resets minor to 0)
 * @param {string|number} currentVersion - Current version
 * @returns {string} New version string with incremented major version
 */
export const incrementMajorVersion = (currentVersion) => {
  const { major } = parseVersion(currentVersion);
  return formatVersion(major + 1, 0);
};

/**
 * Get initial version for new content
 * @returns {string} Initial version string
 */
export const getInitialVersion = () => {
  return formatVersion(1, 0);
};

/**
 * Compare two versions
 * @param {string|number} version1 - First version
 * @param {string|number} version2 - Second version
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export const compareVersions = (version1, version2) => {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  if (v1.major !== v2.major) {
    return v1.major < v2.major ? -1 : 1;
  }

  if (v1.minor !== v2.minor) {
    return v1.minor < v2.minor ? -1 : 1;
  }

  return 0;
};
