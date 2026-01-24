// Comprehensive Validation Utilities
// Provides type-safe validation for all data structures

import { ValidationErrorCollector, ErrorCode } from './error-handling';
import type { 
  PatternSequence, 
  EmojiCell, 
  UserLevel,
  PatternActionType,
  PatternPermissionLevel
} from '@/db/types';

// Base validator interface
interface Validator<T> {
  validate(value: any): { isValid: boolean; data?: T; errors: string[] };
}

// String validation utilities
export const stringValidators = {
  required: (value: any): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  username: (value: string): boolean => {
    // Allow alphanumeric, underscore, hyphen, 3-30 chars
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(value);
  },

  hexColor: (value: string): boolean => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    return hexRegex.test(value);
  },

  uuid: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  sanitize: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  }
};

// Number validation utilities
export const numberValidators = {
  required: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },

  integer: (value: number): boolean => {
    return Number.isInteger(value);
  },

  positive: (value: number): boolean => {
    return value > 0;
  },

  nonNegative: (value: number): boolean => {
    return value >= 0;
  },

  range: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  min: (value: number, min: number): boolean => {
    return value >= min;
  },

  max: (value: number, max: number): boolean => {
    return value <= max;
  }
};

// Array validation utilities
export const arrayValidators = {
  required: (value: any): value is any[] => {
    return Array.isArray(value);
  },

  nonEmpty: (value: any[]): boolean => {
    return value.length > 0;
  },

  maxLength: (value: any[], max: number): boolean => {
    return value.length <= max;
  },

  minLength: (value: any[], min: number): boolean => {
    return value.length >= min;
  },

  unique: (value: any[]): boolean => {
    return new Set(value).size === value.length;
  },

  allStrings: (value: any[]): value is string[] => {
    return value.every(item => typeof item === 'string');
  },

  allNumbers: (value: any[]): value is number[] => {
    return value.every(item => typeof item === 'number');
  }
};

// Object validation utilities
export const objectValidators = {
  required: (value: any): boolean => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  hasKeys: (value: object, keys: string[]): boolean => {
    return keys.every(key => key in value);
  },

  onlyKeys: (value: object, allowedKeys: string[]): boolean => {
    const objectKeys = Object.keys(value);
    return objectKeys.every(key => allowedKeys.includes(key));
  }
};

// Enum validation utilities
export const enumValidators = {
  userLevel: (value: any): value is UserLevel => {
    return ['beginner', 'intermediate', 'advanced', 'expert'].includes(value);
  },

  patternAction: (value: any): value is PatternActionType => {
    return ['view', 'like', 'share', 'copy', 'download', 'edit'].includes(value);
  },

  permissionLevel: (value: any): value is PatternPermissionLevel => {
    return ['view', 'edit', 'admin'].includes(value);
  }
};

// Pattern-specific validators
export class PatternSequenceValidator implements Validator<PatternSequence> {
  validate(value: any): { isValid: boolean; data?: PatternSequence; errors: string[] } {
    const errors: string[] = [];

    if (!objectValidators.required(value)) {
      errors.push('Pattern sequence must be an object');
      return { isValid: false, errors };
    }

    // Validate emojis array
    if (!arrayValidators.required(value.emojis)) {
      errors.push('Pattern sequence must have an emojis array');
    } else {
      // Validate each emoji cell
      value.emojis.forEach((cell: any, index: number) => {
        const cellErrors = this.validateEmojiCell(cell);
        cellErrors.forEach(error => errors.push(`Emoji cell ${index}: ${error}`));
      });
    }

    // Validate metadata
    if (!objectValidators.required(value.metadata)) {
      errors.push('Pattern sequence must have metadata');
    } else {
      if (!numberValidators.required(value.metadata.version) || 
          !numberValidators.positive(value.metadata.version)) {
        errors.push('Metadata version must be a positive number');
      }

      if (!stringValidators.required(value.metadata.created_with)) {
        errors.push('Metadata created_with is required');
      }

      if (!value.metadata.last_modified || !(value.metadata.last_modified instanceof Date)) {
        errors.push('Metadata last_modified must be a valid date');
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? value as PatternSequence : undefined,
      errors
    };
  }

  private validateEmojiCell(cell: any): string[] {
    const errors: string[] = [];

    if (!objectValidators.required(cell)) {
      errors.push('must be an object');
      return errors;
    }

    // Validate emoji
    if (!stringValidators.required(cell.emoji)) {
      errors.push('emoji is required');
    } else {
      // Basic emoji validation (can be enhanced)
      if (cell.emoji.length > 10) { // Most emojis are 1-4 chars
        errors.push('emoji appears invalid');
      }
    }

    // Validate position
    if (!objectValidators.required(cell.position)) {
      errors.push('position is required');
    } else {
      if (!numberValidators.required(cell.position.row) || 
          !numberValidators.nonNegative(cell.position.row)) {
        errors.push('position.row must be a non-negative number');
      }

      if (!numberValidators.required(cell.position.col) || 
          !numberValidators.nonNegative(cell.position.col)) {
        errors.push('position.col must be a non-negative number');
      }
    }

    // Validate optional metadata
    if (cell.metadata) {
      if (cell.metadata.added_at && !(cell.metadata.added_at instanceof Date)) {
        errors.push('metadata.added_at must be a date');
      }

      if (cell.metadata.source && 
          !['user', 'ai', 'preset'].includes(cell.metadata.source)) {
        errors.push('metadata.source must be user, ai, or preset');
      }
    }

    return errors;
  }
}

// Pattern data validator
export class PatternValidator {
  validate(data: any): { isValid: boolean; errors: string[] } {
    const collector = new ValidationErrorCollector();

    // Name validation
    if (!stringValidators.required(data.name)) {
      collector.addRequired('name');
    } else {
      if (!stringValidators.maxLength(data.name, 100)) {
        collector.addRange('name', undefined, 100, data.name.length);
      }
    }

    // Sequence validation
    if (!data.sequence) {
      collector.addRequired('sequence');
    } else {
      const sequenceValidator = new PatternSequenceValidator();
      const sequenceResult = sequenceValidator.validate(data.sequence);
      if (!sequenceResult.isValid) {
        sequenceResult.errors.forEach(error => {
          collector.add(ErrorCode.INVALID_FORMAT, error, 'sequence');
        });
      }
    }

    // Palette ID validation
    if (!stringValidators.required(data.palette_id)) {
      collector.addRequired('palette_id');
    } else if (data.palette_id.length > 50) {
      collector.addRange('palette_id', undefined, 50);
    }

    // Size validation
    if (!numberValidators.required(data.size)) {
      collector.addRequired('size');
    } else {
      if (!numberValidators.positive(data.size)) {
        collector.add(ErrorCode.VALIDATION_ERROR, 'size must be positive', 'size');
      }
      if (data.size > 1000) {
        collector.addRange('size', undefined, 1000);
      }
    }

    // Optional fields validation
    if (data.tags !== undefined) {
      if (!arrayValidators.required(data.tags)) {
        collector.addFormat('tags', 'an array');
      } else {
        if (!arrayValidators.allStrings(data.tags)) {
          collector.add(ErrorCode.VALIDATION_ERROR, 'all tags must be strings', 'tags');
        }
        if (!arrayValidators.maxLength(data.tags, 10)) {
          collector.addRange('tags', undefined, 10);
        }
      }
    }

    if (data.difficulty_rating !== undefined) {
      if (!numberValidators.required(data.difficulty_rating) ||
          !numberValidators.range(data.difficulty_rating, 1, 5)) {
        collector.addRange('difficulty_rating', 1, 5);
      }
    }

    if (data.complexity_score !== undefined) {
      if (!numberValidators.required(data.complexity_score) ||
          !numberValidators.range(data.complexity_score, 0, 10)) {
        collector.addRange('complexity_score', 0, 10);
      }
    }

    if (data.estimated_time_minutes !== undefined) {
      if (!numberValidators.required(data.estimated_time_minutes) ||
          !numberValidators.positive(data.estimated_time_minutes)) {
        collector.add(ErrorCode.VALIDATION_ERROR, 'estimated_time_minutes must be positive', 'estimated_time_minutes');
      }
      if (data.estimated_time_minutes > 10080) { // 1 week in minutes
        collector.addRange('estimated_time_minutes', undefined, 10080);
      }
    }

    if (data.generation_prompt !== undefined && data.generation_prompt !== null) {
      if (!stringValidators.required(data.generation_prompt)) {
        collector.add(ErrorCode.VALIDATION_ERROR, 'generation_prompt must be a string', 'generation_prompt');
      } else if (data.generation_prompt.length > 1000) {
        collector.addRange('generation_prompt', undefined, 1000);
      }
    }

    if (data.parent_pattern_id !== undefined && data.parent_pattern_id !== null) {
      if (!stringValidators.uuid(data.parent_pattern_id)) {
        collector.addFormat('parent_pattern_id', 'a valid UUID');
      }
    }

    return {
      isValid: !collector.hasErrors(),
      errors: collector.getErrors().map(e => e.message)
    };
  }
}

// Collection validator
export class PatternCollectionValidator {
  validate(data: any): { isValid: boolean; errors: string[] } {
    const collector = new ValidationErrorCollector();

    // Name validation
    if (!stringValidators.required(data.name)) {
      collector.addRequired('name');
    } else {
      if (!stringValidators.maxLength(data.name, 100)) {
        collector.addRange('name', undefined, 100);
      }
    }

    // Optional description validation
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        collector.addFormat('description', 'a string');
      } else if (data.description.length > 500) {
        collector.addRange('description', undefined, 500);
      }
    }

    // Color validation
    if (data.color !== undefined) {
      if (!stringValidators.hexColor(data.color)) {
        collector.addFormat('color', 'a valid hex color (e.g., #6366f1)');
      }
    }

    // Public flag validation
    if (data.is_public !== undefined && typeof data.is_public !== 'boolean') {
      collector.addFormat('is_public', 'a boolean');
    }

    return {
      isValid: !collector.hasErrors(),
      errors: collector.getErrors().map(e => e.message)
    };
  }
}

// User data validator
export class UserValidator {
  validate(data: any): { isValid: boolean; errors: string[] } {
    const collector = new ValidationErrorCollector();

    // Email validation
    if (!stringValidators.required(data.email)) {
      collector.addRequired('email');
    } else if (!stringValidators.email(data.email)) {
      collector.addFormat('email', 'a valid email address');
    }

    // Username validation (optional but if provided must be valid)
    if (data.username !== undefined && data.username !== null) {
      if (!stringValidators.username(data.username)) {
        collector.addFormat('username', 'alphanumeric characters, underscore, or hyphen (3-30 chars)');
      }
    }

    // Full name validation (optional)
    if (data.full_name !== undefined && data.full_name !== null) {
      if (typeof data.full_name !== 'string' || !stringValidators.maxLength(data.full_name, 100)) {
        collector.addRange('full_name', undefined, 100);
      }
    }

    // User level validation
    if (data.user_level !== undefined) {
      if (!enumValidators.userLevel(data.user_level)) {
        collector.addFormat('user_level', 'beginner, intermediate, advanced, or expert');
      }
    }

    // Language preference validation
    if (data.language_preference !== undefined) {
      if (!['en', 'fr'].includes(data.language_preference)) {
        collector.addFormat('language_preference', 'en or fr');
      }
    }

    return {
      isValid: !collector.hasErrors(),
      errors: collector.getErrors().map(e => e.message)
    };
  }
}

// Request validation helpers
export function validatePaginationParams(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
  errors: string[];
} {
  const errors: string[] = [];
  let limit = 20;
  let offset = 0;

  const limitParam = searchParams.get('limit');
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      errors.push('limit must be a positive number');
    } else if (parsedLimit > 100) {
      errors.push('limit cannot exceed 100');
    } else {
      limit = parsedLimit;
    }
  }

  const offsetParam = searchParams.get('offset');
  if (offsetParam) {
    const parsedOffset = parseInt(offsetParam, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('offset must be a non-negative number');
    } else {
      offset = parsedOffset;
    }
  }

  return { limit, offset, errors };
}

export function validateSortParams(searchParams: URLSearchParams): {
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  errors: string[];
} {
  const errors: string[] = [];
  const validSortFields = ['created_at', 'updated_at', 'name', 'view_count', 'like_count', 'difficulty_rating', 'complexity_score'];
  
  let sortBy = 'created_at';
  let sortDirection: 'asc' | 'desc' = 'desc';

  const sortByParam = searchParams.get('sort_by');
  if (sortByParam) {
    if (!validSortFields.includes(sortByParam)) {
      errors.push(`sort_by must be one of: ${validSortFields.join(', ')}`);
    } else {
      sortBy = sortByParam;
    }
  }

  const sortDirectionParam = searchParams.get('sort_direction');
  if (sortDirectionParam) {
    if (!['asc', 'desc'].includes(sortDirectionParam)) {
      errors.push('sort_direction must be asc or desc');
    } else {
      sortDirection = sortDirectionParam as 'asc' | 'desc';
    }
  }

  return { sortBy, sortDirection, errors };
}

// Export validator instances
export const patternValidator = new PatternValidator();
export const collectionValidator = new PatternCollectionValidator();
export const userValidator = new UserValidator();
export const patternSequenceValidator = new PatternSequenceValidator();