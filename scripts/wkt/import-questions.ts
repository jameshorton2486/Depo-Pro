#!/usr/bin/env ts-node
/**
 * WKT Question Import Script
 * Imports validated questions into Supabase
 * 
 * Usage: npx ts-node scripts/wkt/import-questions.ts data/wkt/questions.json
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { WKTQuestion, WKTCategory } from '@/types/wkt';

interface ImportQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'fill_blank' | 'true_false';
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

async function validateAndImport() {
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

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  // Get Supabase admin client
  const supabase = getSupabaseAdmin();

  // Transform questions to database format
  const questionsToImport: ImportQuestion[] = questions.map((q: unknown) => {
    const question = q as Record<string, unknown>;
    return {
      question_text: question.question_text as string,
      question_type: question.question_type as 'multiple_choice' | 'fill_blank' | 'true_false',
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
    const { data: existingQuestions } = await supabase
      .from('wkt_questions')
      .select('question_text')
      .in('question_text', questionTexts);

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
      console.error(`   ❌ Error inserting batch: ${error.message}`);
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
