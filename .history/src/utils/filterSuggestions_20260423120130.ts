// Filter Suggestion Utilities for Faculty Dashboard
// Provides enhanced autocomplete and typing suggestions

/**
 * Typing Suggestions Generator
 * Provides intelligent suggestions for filter inputs
 */

export interface SuggestionConfig {
  minimumMatches: number;
  showCustomEntries: boolean;
  highlightMatches: boolean;
  sortByFrequency: boolean;
}

/**
 * Generate filtered suggestions with better matching
 */
export const generateSuggestions = (
  input: string,
  allOptions: string[],
  config: Partial<SuggestionConfig> = {}
): string[] => {
  const settings = {
    minimumMatches: 0,
    showCustomEntries: true,
    highlightMatches: true,
    sortByFrequency: false,
    ...config
  };

  if (!input.trim()) {
    return allOptions;
  }

  const searchValue = input.toLowerCase().trim();
  
  // Exact match first
  const exactMatch = allOptions.find(
    option => option.toLowerCase() === searchValue
  );

  // Partial matches
  const partialMatches = allOptions.filter(option => 
    option.toLowerCase().includes(searchValue) &&
    option.toLowerCase() !== searchValue
  );

  // Sort by relevance (starts with > contains)
  const startsWith = partialMatches.filter(option =>
    option.toLowerCase().startsWith(searchValue)
  );
  
  const others = partialMatches.filter(option =>
    !option.toLowerCase().startsWith(searchValue)
  );

  const results = [
    ...(exactMatch ? [exactMatch] : []),
    ...startsWith,
    ...others
  ];

  // Add custom entry if no exact match and input is not empty
  if (!exactMatch && settings.showCustomEntries && input.trim()) {
    return [input.trim(), ...results.slice(0, 9)];
  }

  return results.slice(0, 10);
};

/**
 * Branch-specific suggestions with proper formatting
 */
export const getBranchSuggestions = (input: string, availableBranches: string[]): string[] => {
  const normalized = input.toUpperCase();
  const suggestions = availableBranches.filter(branch =>
    branch.toUpperCase().includes(normalized)
  );
  return suggestions.length > 0 ? suggestions : availableBranches;
};

/**
 * Designation suggestions with normalization
 * Normalizes input to proper case
 */
export const getDesignationSuggestions = (
  input: string,
  availableDesignations: string[]
): string[] => {
  if (!input.trim()) {
    return availableDesignations;
  }

  const searchValue = input.toLowerCase();
  const matches = availableDesignations.filter(designation =>
    designation.toLowerCase().includes(searchValue)
  );

  // If matches found, return them
  if (matches.length > 0) {
    return matches.slice(0, 10);
  }

  // If no matches, show input as custom option first, then suggestions
  return [input.trim()];
};

/**
 * City suggestions with autocorrection for common typos
 */
export const getCitySuggestions = (
  input: string,
  availableCities: string[]
): string[] => {
  const typoMap: { [key: string]: string } = {
    'banglore': 'Bangalore',
    'bangalor': 'Bangalore',
    'bengaluru': 'Bangalore',
    'bombay': 'Mumbai',
    'calcutta': 'Kolkata',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'hyderabad': 'Hyderabad',
    'chenai': 'Chennai',
    'madras': 'Chennai',
    'pune': 'Pune',
    'coimbatore': 'Coimbatore'
  };

  if (!input.trim()) {
    return availableCities;
  }

  const searchValue = input.toLowerCase().trim();
  const correctedCity = typoMap[searchValue];

  // If it's a known typo, suggest the corrected version first
  if (correctedCity) {
    const othersMatching = availableCities.filter(city =>
      city.toLowerCase().includes(searchValue) && city !== correctedCity
    );
    return [correctedCity, ...othersMatching.slice(0, 9)];
  }

  // Otherwise, return matching cities
  const matches = availableCities.filter(city =>
    city.toLowerCase().includes(searchValue)
  );

  if (matches.length > 0) {
    return matches.slice(0, 10);
  }

  // No match found, show custom input
  return [input.trim()];
};

/**
 * Section suggestions (usually A, B, C, D, etc.)
 */
export const getSectionSuggestions = (
  input: string,
  availableSections: string[]
): string[] => {
  if (!input.trim()) {
    return availableSections;
  }

  const searchValue = input.toUpperCase();
  const matches = availableSections.filter(section =>
    section.toUpperCase().includes(searchValue)
  );

  return matches.length > 0 ? matches : availableSections;
};

/**
 * Format suggestion with highlighting
 * Highlights the matched portion
 */
export const formatSuggestion = (suggestion: string, searchInput: string): string => {
  if (!searchInput.trim()) {
    return suggestion;
  }

  const regex = new RegExp(`(${searchInput.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return suggestion.replace(regex, '<mark>$1</mark>');
};

/**
 * Get suggestion count for display
 * Shows how many options are available
 */
export const getSuggestionCountLabel = (
  filteredCount: number,
  totalCount: number
): string => {
  if (filteredCount === 0) {
    return 'No matches found';
  }
  if (filteredCount === 1) {
    return '1 option';
  }
  return `${filteredCount} option${filteredCount > 1 ? 's' : ''} (${totalCount} total)`;
};

/**
 * Validate filter input
 * Returns true if input meets criteria
 */
export const isValidFilterInput = (
  input: string,
  type: 'branch' | 'section' | 'designation' | 'city' | 'search',
  minLength: number = 1
): boolean => {
  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return false;
  }

  const validationRules: { [key: string]: (val: string) => boolean } = {
    branch: (val) => /^[A-Z0-9\s]+$/.test(val),
    section: (val) => /^[A-Za-z0-9\s]+$/.test(val),
    designation: (val) => /^[A-Za-z0-9\s\-,&()/]+$/.test(val),
    city: (val) => /^[A-Za-z0-9\s\-,&()/]+$/.test(val),
    search: (val) => /^[A-Za-z0-9\s\-.,@]+$/.test(val)
  };

  const validator = validationRules[type];
  return validator ? validator(trimmed) : true;
};

/**
 * Normalize designation to proper case
 */
export const normalizeDesignation = (designation: string): string => {
  return designation
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Get typing suggestion message
 * Provides helpful hints during typing
 */
export const getTypingSuggestion = (
  inputValue: string,
  type: 'branch' | 'section' | 'designation' | 'city',
  availableOptions: string[]
): string => {
  const suggestions: { [key: string]: string } = {
    branch: 'Type a branch code (CSE, ECE, EEE, etc.) or leave blank to see all',
    section: 'Type a section letter (A, B, C, D, etc.) or leave blank to see all',
    designation: 'Start typing a job title and we'll suggest matches. New entries are supported',
    city: 'Type a city name. We correct common typos automatically'
  };

  if (!inputValue) {
    return `${suggestions[type]}`;
  }

  const matches = generateSuggestions(inputValue, availableOptions);
  
  if (matches.length === 0) {
    return `No matches. Press Enter to add "${inputValue}" as a custom entry`;
  }

  if (matches.length === 1) {
    return `Found 1 match: ${matches[0]}`;
  }

  return `Found ${matches.length} matches. Showing top 10`;
};

/**
 * Batch suggestions for all filters
 * Returns all available options for each filter type
 */
export const getAllFilterOptions = (
  students: any[],
  type: 'branch' | 'section' | 'designation' | 'city' | 'year'
): string[] => {
  const options = new Set<string>();

  switch (type) {
    case 'branch':
      students.forEach(s => {
        if (s.branch) options.add(s.branch);
      });
      break;

    case 'section':
      students.forEach(s => {
        if (s.section) options.add(s.section);
      });
      break;

    case 'designation':
      students.forEach(s => {
        if (s.parents?.father?.designation) 
          options.add(normalizeDesignation(s.parents.father.designation));
        if (s.parents?.mother?.designation) 
          options.add(normalizeDesignation(s.parents.mother.designation));
        if (s.siblings?.length)
          s.siblings.forEach((sib: any) => {
            if (sib.designation) 
              options.add(normalizeDesignation(sib.designation));
          });
        if (s.relativesInIT?.length)
          s.relativesInIT.forEach((rel: any) => {
            if (rel.designation) 
              options.add(normalizeDesignation(rel.designation));
          });
      });
      break;

    case 'city':
      students.forEach(s => {
        if (s.relativesInIT?.length)
          s.relativesInIT.forEach((rel: any) => {
            if (rel.workCity) options.add(rel.workCity);
          });
        if (s.siblings?.length)
          s.siblings.forEach((sib: any) => {
            if (sib.city) options.add(sib.city);
          });
      });
      break;

    case 'year':
      students.forEach(s => {
        if (s.year) options.add(s.year);
      });
      break;
  }

  return Array.from(options).sort();
};

/**
 * Get unique values with frequency count
 * Useful for sorting suggestions by popularity
 */
export const getFrequentOptions = (
  students: any[],
  type: 'branch' | 'section' | 'designation' | 'city'
): Array<[string, number]> => {
  const frequency = new Map<string, number>();
  const allOptions = getAllFilterOptions(students, type);

  allOptions.forEach(option => {
    frequency.set(option, frequency.get(option) || 0);
  });

  // Count occurrences
  students.forEach(student => {
    switch (type) {
      case 'branch':
        if (student.branch) {
          frequency.set(student.branch, (frequency.get(student.branch) || 0) + 1);
        }
        break;
      case 'section':
        if (student.section) {
          frequency.set(student.section, (frequency.get(student.section) || 0) + 1);
        }
        break;
      // Add more cases as needed
    }
  });

  return Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
};
