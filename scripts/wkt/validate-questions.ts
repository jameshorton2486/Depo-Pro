/**
 * WKT Question Validation Script
 * Validates JSON question files before import
 * 
 * Usage: npx tsx scripts/wkt/validate-questions.ts data/wkt/questions.json
 */

import * as fs from 'fs';
import * as path from 'path';
import type { WKTCategory, WKTQuestionType } from '@/types/wkt';

const VALID_CATEGORIES: WKTCategory[] = [
  'medical_terminology',
  'legal_terminology',
  'grammar_usage',
  'spelling',
  'texas_rules',
  'reporter_duties',
];

const VALID_QUESTION_TYPES: WKTQuestionType[] = [
  'multiple_choice',
  'fill_blank',
  'true_false',
];

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

function validateQuestion(question: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof question !== 'object' || question === null) {
    return [{ index, field: 'root', message: 'Question must be an object' }];
  }

  const q = question as Record<string, unknown>;

  // Validate question_text
  if (!q.question_text || typeof q.question_text !== 'string' || q.question_text.trim() === '') {
    errors.push({ index, field: 'question_text', message: 'question_text is required and must be a non-empty string' });
  }

  // Validate question_type
  if (!q.question_type || !VALID_QUESTION_TYPES.includes(q.question_type as WKTQuestionType)) {
    errors.push({
      index,
      field: 'question_type',
      message: `question_type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`,
    });
  }

  // Validate correct_answer
  if (!q.correct_answer || typeof q.correct_answer !== 'string' || q.correct_answer.trim() === '') {
    errors.push({ index, field: 'correct_answer', message: 'correct_answer is required and must be a non-empty string' });
  }

  // Validate category
  if (!q.category || !VALID_CATEGORIES.includes(q.category as WKTCategory)) {
    errors.push({
      index,
      field: 'category',
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  // Validate options for multiple_choice
  if (q.question_type === 'multiple_choice') {
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
      errors.push({
        index,
        field: 'options',
        message: 'multiple_choice questions must have options array with 2-4 items',
      });
    } else {
      // Validate each option is a string
      q.options.forEach((option, optIndex) => {
        if (typeof option !== 'string' || option.trim() === '') {
          errors.push({
            index,
            field: `options[${optIndex}]`,
            message: 'Each option must be a non-empty string',
          });
        }
      });

      // Validate correct_answer is in options
      if (q.correct_answer && Array.isArray(q.options) && !q.options.includes(q.correct_answer as string)) {
        errors.push({
          index,
          field: 'correct_answer',
          message: 'correct_answer must be one of the options for multiple_choice questions',
        });
      }
    }
  }

  // Validate difficulty (optional, but if present must be 1-5)
  if (q.difficulty !== undefined) {
    const difficulty = Number(q.difficulty);
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push({
        index,
        field: 'difficulty',
        message: 'difficulty must be an integer between 1 and 5',
      });
    }
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: JSON file path is required');
    console.error('Usage: npx ts-node scripts/wkt/validate-questions.ts <path-to-json>');
    process.exit(1);
  }

  const filePath = args[0];
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📋 Validating questions from: ${absolutePath}\n`);

  let questions: unknown[];
  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    questions = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Error reading or parsing JSON file:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!Array.isArray(questions)) {
    console.error('❌ Error: JSON file must contain an array of questions');
    process.exit(1);
  }

  console.log(`📊 Total questions: ${questions.length}\n`);

  const allErrors: ValidationError[] = [];
  let validCount = 0;

  questions.forEach((question, index) => {
    const errors = validateQuestion(question, index);
    if (errors.length === 0) {
      validCount++;
    } else {
      allErrors.push(...errors);
    }
  });

  // Report results
  if (allErrors.length === 0) {
    console.log('✅ All questions are valid!');
    console.log(`   Valid: ${validCount}/${questions.length}`);
    process.exit(0);
  } else {
    console.log(`❌ Validation failed:`);
    console.log(`   Valid: ${validCount}/${questions.length}`);
    console.log(`   Invalid: ${questions.length - validCount}/${questions.length}`);
    console.log(`   Total errors: ${allErrors.length}\n`);

    console.log('📝 Error details:');
    allErrors.forEach((error) => {
      console.log(`   Question ${error.index}: ${error.field} - ${error.message}`);
    });

    process.exit(1);
  }
}

main();
