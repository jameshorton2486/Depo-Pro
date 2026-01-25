/**
 * WKT Question Import Script
 * Imports validated questions into Supabase
 * 
 * Usage: npx tsx scripts/wkt/import-questions.ts data/wkt/questions.json
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { WKTCategory, WKTQuestionType } from '@/types/wkt';

interface ImportQuestion {
  question_text: string;
  question_type: WKTQuestionType;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  category: WKTCategory;
  subcategory: string | null;
  difficulty: number;
  source_reference: string | null;
  ai_generated: boolean;
  verified: boolean;
}

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

  if (!q.question_text || typeof q.question_text !== 'string' || q.question_text.trim() === '') {
    errors.push({ index, field: 'question_text', message: 'question_text is required and must be a non-empty string' });
  }

  if (!q.question_type || !VALID_QUESTION_TYPES.includes(q.question_type as WKTQuestionType)) {
    errors.push({
      index,
      field: 'question_type',
      message: `question_type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`,
    });
  }

  if (!q.correct_answer || typeof q.correct_answer !== 'string' || q.correct_answer.trim() === '') {
    errors.push({ index, field: 'correct_answer', message: 'correct_answer is required and must be a non-empty string' });
  }

  if (!q.category || !VALID_CATEGORIES.includes(q.category as WKTCategory)) {
    errors.push({
      index,
      field: 'category',
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  if (q.question_type === 'multiple_choice') {
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
      errors.push({
        index,
        field: 'options',
        message: 'multiple_choice questions must have options array with 2-4 items',
      });
    } else {
      q.options.forEach((option, optIndex) => {
        if (typeof option !== 'string' || option.trim() === '') {
          errors.push({
            index,
            field: `options[${optIndex}]`,
            message: 'Each option must be a non-empty string',
          });
        }
      });

      if (q.correct_answer && Array.isArray(q.options) && !q.options.includes(q.correct_answer as string)) {
        errors.push({
          index,
          field: 'correct_answer',
          message: 'correct_answer must be one of the options for multiple_choice questions',
        });
      }
    }
  }

  return errors;
}

function validateQuestions(questions: unknown[]): ValidationError[] {
  const allErrors: ValidationError[] = [];

  questions.forEach((question, index) => {
    const errors = validateQuestion(question, index);
    if (errors.length > 0) {
      allErrors.push(...errors);
    }
  });

  return allErrors;
}

async function validateAndImport() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: JSON file path is required');
    console.error('Usage: npx ts-node scripts/wkt/import-questions.ts <path-to-json>');
    process.exit(1);
  }

  const filePath = args[0];
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📋 Importing questions from: ${absolutePath}\n`);

  // Read and parse JSON
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

  console.log(`📊 Total questions to import: ${questions.length}\n`);

  const validationErrors = validateQuestions(questions);
  if (validationErrors.length > 0) {
    console.log('❌ Validation failed:');
    console.log(`   Invalid: ${validationErrors.length} issues\n`);
    validationErrors.forEach((error) => {
      console.log(`   Question ${error.index}: ${error.field} - ${error.message}`);
    });
    process.exit(1);
  }

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('❌ Error: SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  // Get Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Transform questions to database format
  const questionsToImport: ImportQuestion[] = questions.map((q: unknown) => {
    const question = q as Record<string, unknown>;
    return {
      question_text: question.question_text as string,
      question_type: question.question_type as WKTQuestionType,
      options: Array.isArray(question.options) ? (question.options as string[]) : null,
      correct_answer: question.correct_answer as string,
      explanation: (question.explanation as string | null) || null,
      category: question.category as WKTCategory,
      subcategory: (question.subcategory as string | null) || null,
      difficulty: question.difficulty ? Number(question.difficulty) : 2,
      source_reference: (question.source_reference as string | null) || null,
      ai_generated: Boolean(question.ai_generated || false),
      verified: Boolean(question.verified || false),
    };
  });

  // Import in batches of 50
  const BATCH_SIZE = 50;
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < questionsToImport.length; i += BATCH_SIZE) {
    const batch = questionsToImport.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(questionsToImport.length / BATCH_SIZE);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);

    // Check for duplicates first (by question_text)
    const questionTexts = batch.map((q) => q.question_text);
    const { data: existingQuestions, error: existingError } = await supabase
      .from('wkt_questions')
      .select('question_text')
      .in('question_text', questionTexts);

    if (existingError) {
      const errorDetails = JSON.stringify(existingError, null, 2);
      console.error(`   ❌ Error checking duplicates: ${existingError.message}`);
      console.error(`   🧾 Supabase error details: ${errorDetails}`);
      errorCount += batch.length;
      continue;
    }

    const existingTexts = new Set(existingQuestions?.map((q) => q.question_text) || []);

    // Filter out duplicates
    const newQuestions = batch.filter((q) => !existingTexts.has(q.question_text));
    const skippedInBatch = batch.length - newQuestions.length;
    skippedCount += skippedInBatch;

    if (newQuestions.length === 0) {
      console.log(`   ⏭️  All ${skippedInBatch} questions in this batch already exist (skipped)`);
      continue;
    }

    // Insert new questions
    const { data, error } = await supabase
      .from('wkt_questions')
      .insert(newQuestions)
      .select();

    if (error) {
      const errorDetails = JSON.stringify(error, null, 2);
      console.error(`   ❌ Error inserting batch: ${error.message}`);
      console.error(`   🧾 Supabase error details: ${errorDetails}`);
      errorCount += newQuestions.length;
    } else {
      const inserted = data?.length || 0;
      importedCount += inserted;
      console.log(`   ✅ Imported ${inserted} questions`);
      if (skippedInBatch > 0) {
        console.log(`   ⏭️  Skipped ${skippedInBatch} duplicates`);
      }
    }
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${importedCount}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${questions.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some questions failed to import. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✨ Import complete!');
    process.exit(0);
  }
}

validateAndImport().catch((error) => {
  console.error('❌ Fatal error:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
