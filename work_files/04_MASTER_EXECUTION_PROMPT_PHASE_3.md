# 🚀 MASTER EXECUTION PROMPT - PHASE 3 CLEANUP + IMPLEMENTATION

**Project:** Kollect-It Marketplace - AI-Powered Product Creation System  
**Phase:** 3 of 4  
**Estimated Time:** 16-20 hours  
**Status:** Ready for AI Agent Execution  

---

## ⚡ CRITICAL INSTRUCTIONS

This prompt is designed for an AI agent (Claude, ChatGPT, Claude Code). Read all instructions before beginning.

### Execution Rules (FOLLOW EXACTLY)

1. **TypeScript First**: Every file uses strict TypeScript. No `any` types.
2. **Production Ready**: All code includes error handling, input validation, logging.
3. **Structured Approach**: Complete each step fully before moving to next.
4. **After Each Step**: Provide files created, issues encountered, ready status.
5. **Environment**: Windows PowerShell, VS Code, Node.js 18+

---

## 🎯 PHASE 3 GOAL

Implement complete AI-powered product creation system with:
- Admin approval queue for AI-generated listings
- Three-source pricing engine with confidence scores
- Hybrid Claude + GPT-4V image analysis
- Database schema for AI products
- Complete API endpoints for approval workflows

---

## 📋 DELIVERABLES CHECKLIST

By end of Phase 3, you'll have:

- [x] Prisma migration with AIGeneratedProduct model
- [x] `/lib/pricing/engineWithConfidence.ts` 
- [x] `/lib/ai/productGeneration.ts` (hybrid Claude + OpenAI)
- [x] `/app/admin/dashboard/` enhancements (approval queue)
- [x] 5 new API endpoints in `/api/admin/products/`
- [x] Complete TypeScript interfaces
- [x] Error handling & logging
- [x] `.env.example` with new variables
- [x] `IMPLEMENTATION_NOTES.md` documenting decisions

---

## 🔧 ENVIRONMENT SETUP

### Required Environment Variables

Add to `.env.local`:

```env
# AI Services
CLAUDE_API_KEY=sk_live_xxxxxx
OPENAI_API_KEY=sk-xxxxxx

# Existing but verify
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=xxx
IMAGEKIT_PRIVATE_KEY=xxx
GOOGLE_DRIVE_FOLDER_ID=xxx

# Optional but recommended
LOG_LEVEL=info
NODE_ENV=development
```

### Verify Setup

Before beginning, run:

```powershell
npm run type-check              # TypeScript check
npx prisma generate            # Prisma setup
npm list | head -20            # Verify packages
```

---

## ✅ EXECUTION STEPS (IN ORDER)

## STEP 1: DATABASE SCHEMA UPDATE (2 HOURS)

### Task 1.1: Create Prisma Migration

**File:** `prisma/schema.prisma` - Add this model:

```prisma
model AIGeneratedProduct {
  id           String   @id @default(cuid())
  googleDriveId String
  
  // AI Generated Data
  aiTitle      String   @db.VarChar(500)
  aiDescription String  @db.Text
  category     Category @relation(fields: [categoryId], references: [id])
  categoryId   String
  condition    String   @default("GOOD") // EXCELLENT, VERY_GOOD, GOOD, FAIR
  estimatedAge String?
  
  // Pricing
  suggestedPrice    Float
  priceLowRange     Float
  priceHighRange    Float
  priceConfidence   Float // 0-100
  pricingAnalysis   Json  // Stores detailed breakdown
  
  // Status & Review
  status       String   @default("PENDING") // PENDING, APPROVED, REJECTED, PUBLISHED
  reviewedBy   User?    @relation(fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedById String?
  reviewedAt   DateTime?
  rejectionReason String?
  
  // AI Service Data
  claudeAnalysis Json?
  openaiAnalysis Json?
  
  // Image
  imagePath    String
  imageUrl     String   // ImageKit URL
  
  // Metadata
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  approvedAt   DateTime?
  publishedAt  DateTime? // When added to marketplace
  
  @@index([status])
  @@index([categoryId])
  @@index([createdAt])
  @@index([reviewedById])
}

// Add relation to User model
model User {
  // ... existing fields ...
  reviewedProducts AIGeneratedProduct[] @relation("ReviewedBy")
}

// Add relation to Category model
model Category {
  // ... existing fields ...
  aiProducts AIGeneratedProduct[]
}
```

**Command:**

```powershell
npx prisma migrate dev --name add_ai_generated_products
```

**Expected Output:**
```
✓ Created migration folder
✓ Generated Prisma Client
✓ Migration applied successfully
```

### Task 1.2: Verify Migration

```powershell
npx prisma db push
npx prisma studio  # View in browser
```

**Validation:**
- [ ] Can see `AIGeneratedProduct` table in Prisma Studio
- [ ] All fields created correctly
- [ ] Indexes applied
- [ ] No constraint errors

---

## STEP 2: PRICING ENGINE (4 HOURS)

### Task 2.1: Create Pricing Types

**File:** `src/lib/pricing/types.ts`

```typescript
export interface HistoricalData {
  averagePrice: number;
  priceRange: { min: number; max: number };
  itemsAnalyzed: number;
  velocity: 'FAST' | 'NORMAL' | 'SLOW';
  confidence: number; // 0-100
}

export interface MarketBenchmark {
  price: number;
  source: string; // 'CHRISTIE', 'SOTHEBY', 'HINDMAN', 'PUBLIC'
  description: string;
  confidence: number;
}

export interface CategoryRuleResult {
  basePrice: number;
  adjustments: {
    rarity: number;
    condition: number;
    provenance: number;
    completeness: number;
  };
  finalPrice: number;
  factors: string[];
  confidence: number;
}

export interface PricingAnalysis {
  suggestedPrice: number;
  lowRange: number;
  highRange: number;
  confidence: number; // Weighted 0-100
  sources: {
    historical: HistoricalData & { price: number };
    market: MarketBenchmark & { price: number };
    rules: CategoryRuleResult;
  };
  reasoning: string;
  autoApproveThreshold: boolean; // confidence > 85
  flagForReview: boolean; // 70-85 confidence
  requiresManualPricing: boolean; // < 70 confidence
}
```

### Task 2.2: Create Pricing Engine

**File:** `src/lib/pricing/engineWithConfidence.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { PricingAnalysis, HistoricalData, MarketBenchmark, CategoryRuleResult } from './types';
import { logger } from '@/lib/logger';

interface PricingInput {
  productName: string;
  category: string;
  condition: string;
  estimatedAge?: string;
  rarity?: string;
  provenance?: string;
  completeness?: number;
}

export class PricingEngine {
  /**
   * Get historical pricing data from database
   */
  private async getHistoricalData(
    category: string,
    productName: string
  ): Promise<HistoricalData> {
    try {
      // Query similar sold products from last 6 months
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      
      const similarProducts = await prisma.product.findMany({
        where: {
          category: {
            name: category,
          },
          name: {
            contains: productName.split(' ')[0], // First word match
            mode: 'insensitive',
          },
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          price: true,
          createdAt: true,
        },
      });

      if (similarProducts.length === 0) {
        return {
          averagePrice: 0,
          priceRange: { min: 0, max: 0 },
          itemsAnalyzed: 0,
          velocity: 'SLOW',
          confidence: 0,
        };
      }

      const prices = similarProducts.map(p => p.price);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Calculate velocity (how fast items sell)
      const daysSpan = (Date.now() - sixMonthsAgo.getTime()) / (24 * 60 * 60 * 1000);
      const itemsPerDay = similarProducts.length / daysSpan;
      const velocity = itemsPerDay > 0.5 ? 'FAST' : itemsPerDay > 0.1 ? 'NORMAL' : 'SLOW';

      // Confidence based on sample size
      const confidence = Math.min(100, similarProducts.length * 5);

      logger.info(`Historical data found: ${similarProducts.length} items, avg price: $${avgPrice}`);

      return {
        averagePrice: avgPrice,
        priceRange: { min: minPrice, max: maxPrice },
        itemsAnalyzed: similarProducts.length,
        velocity,
        confidence,
      };
    } catch (error) {
      logger.error('Error fetching historical data:', error);
      return {
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        itemsAnalyzed: 0,
        velocity: 'SLOW',
        confidence: 0,
      };
    }
  }

  /**
   * Get market benchmark data (can integrate with external APIs later)
   */
  private getMarketBenchmark(category: string): MarketBenchmark {
    // Mock market data - replace with real API integration
    const benchmarks: Record<string, MarketBenchmark> = {
      'Antique Books': {
        price: 150,
        source: 'CHRISTIE',
        description: 'Average antique book auction price',
        confidence: 75,
      },
      'Fine Art': {
        price: 2500,
        source: 'SOTHEBY',
        description: 'Mid-range fine art piece',
        confidence: 80,
      },
      'Collectibles': {
        price: 450,
        source: 'HINDMAN',
        description: 'Average collectible item',
        confidence: 70,
      },
      'Militaria': {
        price: 800,
        source: 'PUBLIC',
        description: 'Typical militaria piece',
        confidence: 65,
      },
    };

    return benchmarks[category] || {
      price: 100,
      source: 'DEFAULT',
      description: 'Default benchmark',
      confidence: 50,
    };
  }

  /**
   * Apply category-specific rules
   */
  private applyRules(input: PricingInput, basePrice: number): CategoryRuleResult {
    const adjustments = {
      rarity: 1.0,
      condition: 1.0,
      provenance: 1.0,
      completeness: 1.0,
    };

    const factors: string[] = [];

    // Rarity multiplier
    if (input.rarity === 'EXTREMELY_RARE') {
      adjustments.rarity = 2.5;
      factors.push('Extremely rare item (+250%)');
    } else if (input.rarity === 'RARE') {
      adjustments.rarity = 1.8;
      factors.push('Rare item (+80%)');
    } else if (input.rarity === 'UNCOMMON') {
      adjustments.rarity = 1.3;
      factors.push('Uncommon item (+30%)');
    }

    // Condition multiplier
    const conditionMap: Record<string, number> = {
      EXCELLENT: 1.2,
      VERY_GOOD: 1.0,
      GOOD: 0.8,
      FAIR: 0.6,
      RESTORATION_CANDIDATE: 0.4,
    };
    adjustments.condition = conditionMap[input.condition] || 0.8;
    factors.push(`Condition: ${input.condition} (${(adjustments.condition * 100).toFixed(0)}%)`);

    // Provenance multiplier
    if (input.provenance) {
      adjustments.provenance = 1.5;
      factors.push('Documented provenance (+50%)');
    }

    // Completeness multiplier
    if (input.completeness !== undefined) {
      adjustments.completeness = 0.5 + (input.completeness / 100) * 0.5;
      factors.push(`Completeness: ${input.completeness}%`);
    }

    const finalPrice =
      basePrice *
      adjustments.rarity *
      adjustments.condition *
      adjustments.provenance *
      adjustments.completeness;

    return {
      basePrice,
      adjustments,
      finalPrice,
      factors,
      confidence: 75,
    };
  }

  /**
   * Main pricing calculation
   */
  async calculatePrice(input: PricingInput): Promise<PricingAnalysis> {
    try {
      logger.info(`Calculating price for: ${input.productName}`);

      // Get data from all three sources
      const historical = await this.getHistoricalData(input.category, input.productName);
      const market = this.getMarketBenchmark(input.category);
      
      const basePrice = historical.averagePrice > 0 ? historical.averagePrice : market.price;
      const rules = this.applyRules(input, basePrice);

      // Weighted confidence calculation
      const weights = {
        historical: 0.4,
        market: 0.35,
        rules: 0.25,
      };

      const confidence = Math.round(
        historical.confidence * weights.historical +
        market.confidence * weights.market +
        rules.confidence * weights.rules
      );

      // Calculate range (±20% from suggested price)
      const suggestedPrice = Math.round(rules.finalPrice * 100) / 100;
      const lowRange = Math.round(suggestedPrice * 0.8 * 100) / 100;
      const highRange = Math.round(suggestedPrice * 1.2 * 100) / 100;

      // Create reasoning
      const reasoning = `
        Historical Analysis: ${historical.itemsAnalyzed} similar items sold, avg $${historical.averagePrice.toFixed(2)} (${historical.velocity} velocity)
        Market Benchmark: ${market.source} - $${market.price.toFixed(2)}
        Category Rules Applied: ${rules.factors.join('; ')}
        Final Suggested Price: $${suggestedPrice.toFixed(2)}
      `.trim();

      const analysis: PricingAnalysis = {
        suggestedPrice,
        lowRange,
        highRange,
        confidence,
        sources: {
          historical: { ...historical, price: historical.averagePrice },
          market: { ...market, price: market.price },
          rules: rules,
        },
        reasoning,
        autoApproveThreshold: confidence > 85,
        flagForReview: confidence >= 70 && confidence <= 85,
        requiresManualPricing: confidence < 70,
      };

      logger.info(`Price calculated: $${suggestedPrice} (${confidence}% confidence)`);
      return analysis;
    } catch (error) {
      logger.error('Error in pricing calculation:', error);
      throw error;
    }
  }
}

export const pricingEngine = new PricingEngine();
```

### Task 2.3: Test Pricing Engine

**File:** `src/lib/pricing/__tests__/engine.test.ts`

```typescript
import { PricingEngine } from '../engineWithConfidence';

const engine = new PricingEngine();

async function testPricing() {
  console.log('Testing Pricing Engine...\n');

  const test1 = await engine.calculatePrice({
    productName: 'First Edition Book',
    category: 'Antique Books',
    condition: 'EXCELLENT',
    rarity: 'RARE',
    provenance: 'Sotheby Documentation',
  });

  console.log('Test 1 - Rare Book:');
  console.log(`Suggested: $${test1.suggestedPrice}`);
  console.log(`Range: $${test1.lowRange} - $${test1.highRange}`);
  console.log(`Confidence: ${test1.confidence}%`);
  console.log(`Auto Approve: ${test1.autoApproveThreshold}\n`);

  const test2 = await engine.calculatePrice({
    productName: 'Military Artifact',
    category: 'Militaria',
    condition: 'FAIR',
    rarity: 'UNCOMMON',
  });

  console.log('Test 2 - Fair Condition Militaria:');
  console.log(`Suggested: $${test2.suggestedPrice}`);
  console.log(`Confidence: ${test2.confidence}%`);
  console.log(`Flag for Review: ${test2.flagForReview}\n`);
}

testPricing().catch(console.error);
```

**Run test:**

```powershell
npx ts-node src/lib/pricing/__tests__/engine.test.ts
```

**Validation:**
- [ ] Prices calculated between $0-5000
- [ ] Confidence scores 0-100
- [ ] Reasoning strings populated
- [ ] Auto-approve flags working correctly

---

## STEP 3: AI SERVICE INTEGRATION (5 HOURS)

### Task 3.1: Claude Analyzer

**File:** `src/lib/ai/claude-product-analyzer.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

interface ClaudeAnalysisResult {
  title: string;
  description: string;
  category: 'ANTIQUE_BOOKS' | 'FINE_ART' | 'COLLECTIBLES' | 'MILITARIA';
  condition: string;
  estimatedAge: string;
  keyAttributes: string[];
  rarity: string;
  provenance: string;
  rawResponse: string;
}

const client = new Anthropic();

export async function analyzeProductWithClaude(
  imageUrl: string,
  context?: string
): Promise<ClaudeAnalysisResult> {
  try {
    logger.info(`Claude analyzing image: ${imageUrl}`);

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Analyze this antique/collectible item image for a luxury marketplace. Provide JSON response with:
              {
                "title": "exact product name",
                "description": "detailed 2-3 sentence description focusing on authenticity and value",
                "category": "ANTIQUE_BOOKS|FINE_ART|COLLECTIBLES|MILITARIA",
                "condition": "EXCELLENT|VERY_GOOD|GOOD|FAIR|RESTORATION_CANDIDATE",
                "estimatedAge": "approximate age/era",
                "keyAttributes": ["list", "of", "identifying", "features"],
                "rarity": "EXTREMELY_RARE|RARE|UNCOMMON|COMMON",
                "provenance": "any visible provenance markers or documentation",
                "analysis": "2-3 sentences about market significance"
              }
              
              ${context ? `Additional context: ${context}` : ''}
              
              Be specific and professional. This is for high-end collectors.`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: ClaudeAnalysisResult = {
      title: parsed.title || 'Untitled Item',
      description: parsed.description || '',
      category: parsed.category || 'COLLECTIBLES',
      condition: parsed.condition || 'GOOD',
      estimatedAge: parsed.estimatedAge || 'Unknown',
      keyAttributes: parsed.keyAttributes || [],
      rarity: parsed.rarity || 'UNCOMMON',
      provenance: parsed.provenance || 'None visible',
      rawResponse: responseText,
    };

    logger.info(`Claude analysis complete: ${result.title}`);
    return result;
  } catch (error) {
    logger.error('Claude analysis failed:', error);
    throw error;
  }
}
```

### Task 3.2: GPT-4V Validator

**File:** `src/lib/ai/gpt4v-image-analyzer.ts`

```typescript
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

interface GPT4VValidationResult {
  isAuthentic: number; // 0-100 confidence
  qualityScore: number; // 0-100
  category: string;
  conditionMatch: boolean;
  observations: string[];
  confidence: number;
  rawResponse: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function validateWithGPT4V(
  imageUrl: string,
  claudeAnalysis: any
): Promise<GPT4VValidationResult> {
  try {
    logger.info(`GPT-4V validating: ${claudeAnalysis.title}`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Validate this antique/collectible item. Cross-reference with Claude analysis:
              Title: ${claudeAnalysis.title}
              Condition: ${claudeAnalysis.condition}
              Category: ${claudeAnalysis.category}
              
              Respond with JSON:
              {
                "isAuthentic": 0-100,
                "qualityScore": 0-100,
                "categoryMatch": true/false,
                "conditionAccurate": true/false,
                "observations": ["list of observations"],
                "confidence": 0-100
              }
              
              Be critical and identify any concerns.`,
            },
          ],
        },
      ],
    });

    const responseText =
      response.choices[0].message.content || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in GPT response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: GPT4VValidationResult = {
      isAuthentic: parsed.isAuthentic || 75,
      qualityScore: parsed.qualityScore || 75,
      category: claudeAnalysis.category,
      conditionMatch: parsed.conditionAccurate !== false,
      observations: parsed.observations || [],
      confidence: parsed.confidence || 70,
      rawResponse: responseText,
    };

    logger.info(`GPT-4V validation complete: ${result.confidence}% confidence`);
    return result;
  } catch (error) {
    logger.error('GPT-4V validation failed:', error);
    throw error;
  }
}
```

### Task 3.3: Product Generator

**File:** `src/lib/ai/productGeneration.ts`

```typescript
import { analyzeProductWithClaude } from './claude-product-analyzer';
import { validateWithGPT4V } from './gpt4v-image-analyzer';
import { pricingEngine } from '@/lib/pricing/engineWithConfidence';
import { logger } from '@/lib/logger';

export interface GeneratedProduct {
  title: string;
  description: string;
  category: string;
  condition: string;
  estimatedAge: string;
  keyAttributes: string[];
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  priceConfidence: number;
  authenticityScore: number;
  qualityScore: number;
  combinedConfidence: number;
  readyForApproval: boolean;
  claudeAnalysis: any;
  gpt4vAnalysis: any;
  pricingAnalysis: any;
}

export async function generateProductFromImage(
  imageUrl: string,
  imageId: string
): Promise<GeneratedProduct> {
  try {
    logger.info(`Starting product generation for: ${imageId}`);

    // Step 1: Claude Analysis
    logger.info('Step 1: Claude analysis...');
    const claudeAnalysis = await analyzeProductWithClaude(imageUrl);

    // Step 2: GPT-4V Validation
    logger.info('Step 2: GPT-4V validation...');
    const gpt4vAnalysis = await validateWithGPT4V(imageUrl, claudeAnalysis);

    // Step 3: Pricing Calculation
    logger.info('Step 3: Pricing calculation...');
    const pricingAnalysis = await pricingEngine.calculatePrice({
      productName: claudeAnalysis.title,
      category: claudeAnalysis.category,
      condition: claudeAnalysis.condition,
      estimatedAge: claudeAnalysis.estimatedAge,
      rarity: claudeAnalysis.rarity,
      provenance: claudeAnalysis.provenance,
    });

    // Calculate combined confidence
    const combinedConfidence = Math.round(
      gpt4vAnalysis.confidence * 0.4 +
      pricingAnalysis.confidence * 0.3 +
      gpt4vAnalysis.isAuthentic * 0.3
    );

    const product: GeneratedProduct = {
      title: claudeAnalysis.title,
      description: claudeAnalysis.description,
      category: claudeAnalysis.category,
      condition: claudeAnalysis.condition,
      estimatedAge: claudeAnalysis.estimatedAge,
      keyAttributes: claudeAnalysis.keyAttributes,
      suggestedPrice: pricingAnalysis.suggestedPrice,
      priceRange: {
        min: pricingAnalysis.lowRange,
        max: pricingAnalysis.highRange,
      },
      priceConfidence: pricingAnalysis.confidence,
      authenticityScore: gpt4vAnalysis.isAuthentic,
      qualityScore: gpt4vAnalysis.qualityScore,
      combinedConfidence,
      readyForApproval: combinedConfidence > 75,
      claudeAnalysis,
      gpt4vAnalysis,
      pricingAnalysis,
    };

    logger.info(`Product generated: ${product.title} (${combinedConfidence}% confidence)`);
    return product;
  } catch (error) {
    logger.error(`Error generating product for ${imageId}:`, error);
    throw error;
  }
}
```

**Validation:**
- [ ] Claude analyzer returns structured data
- [ ] GPT-4V validator provides authenticity scores
- [ ] Pricing engine integrates correctly
- [ ] Combined confidence calculated
- [ ] Error handling for API failures

---

## STEP 4: ADMIN DASHBOARD (6 HOURS)

### Task 4.1: Approval Queue Component

**File:** `src/components/admin/ApprovalQueue.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface QueueItem {
  id: string;
  aiTitle: string;
  imagePath: string;
  suggestedPrice: number;
  priceConfidence: number;
  category: string;
  condition: string;
  combinedConfidence: number;
  createdAt: string;
}

export function ApprovalQueue() {
  const { data: session } = useSession();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/admin/products/queue?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id }),
      });

      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error approving product:', error);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/admin/products/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, reason }),
      });

      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
    }
  };

  if (!session?.user) return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Product Approval Queue</h2>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded border border-gold"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400">No items in queue</div>
      ) : (
        <div className="grid gap-6">
          {items.map(item => (
            <div
              key={item.id}
              className="border border-gold bg-gray-900 rounded-lg p-6 flex gap-6"
            >
              <div className="relative w-32 h-32 flex-shrink-0">
                <Image
                  src={item.imagePath}
                  alt={item.aiTitle}
                  fill
                  className="object-cover rounded"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{item.aiTitle}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gold">Category:</span> {item.category}
                  </div>
                  <div>
                    <span className="text-gold">Condition:</span> {item.condition}
                  </div>
                  <div>
                    <span className="text-gold">Price:</span> ${item.suggestedPrice}
                  </div>
                  <div>
                    <span className="text-gold">Confidence:</span> {item.priceConfidence}%
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id, 'Manual rejection')}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {}}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Task 4.2: Update Admin Dashboard Page

**File:** `src/app/admin/dashboard/page.tsx` - Add to existing file:

```typescript
import { ApprovalQueue } from '@/components/admin/ApprovalQueue';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Existing dashboard content */}
      
      {/* Phase 3 Addition */}
      <section className="border-t border-gold pt-8">
        <ApprovalQueue />
      </section>
    </div>
  );
}
```

---

## STEP 5: API ENDPOINTS (2 HOURS)

### Task 5.1: Approval Endpoint

**File:** `src/app/api/admin/products/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface ApprovalRequest {
  productId: string;
  finalPrice?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ApprovalRequest = await request.json();
    const { productId, finalPrice, notes } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // Update product status
    const updated = await prisma.aIGeneratedProduct.update({
      where: { id: productId },
      data: {
        status: 'APPROVED',
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        ...(finalPrice && { suggestedPrice: finalPrice }),
      },
    });

    logger.info(`Product approved: ${productId} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 5.2: Other Endpoints

Create similar files for:
- `/reject/route.ts` - Reject with reason
- `/queue/route.ts` - Get pending items
- `/bulk-approve/route.ts` - Bulk operations
- `/history/route.ts` - Approval history

---

## STEP 6: TESTING & VALIDATION (1 HOUR)

### Task 6.1: Type Check

```powershell
npm run type-check
```

Expected: ✅ No errors

### Task 6.2: Test Database

```powershell
npx prisma db push
npx prisma studio
```

### Task 6.3: Start Development

```powershell
npm run dev
```

Visit: http://localhost:3000/admin/dashboard

---

## ✅ COMPLETION CHECKLIST

- [ ] Prisma migration created and applied
- [ ] Pricing engine calculates correctly
- [ ] Claude API integration working
- [ ] GPT-4V integration working
- [ ] All 5 API endpoints created
- [ ] Admin dashboard updated
- [ ] TypeScript compilation passes
- [ ] No console errors
- [ ] Database queries working
- [ ] Environment variables confirmed

---

## 📝 FINAL DELIVERABLES

Before marking complete, provide:

1. **Files Created** - List of all new files
2. **Files Modified** - List of changes
3. **Issues Encountered** - Any problems and solutions
4. **Test Results** - Validation output
5. **Ready for Next Phase?** - YES/NO

---

## 🎯 SUCCESS CRITERIA

Phase 3 is complete when:

✅ Dashboard loads with approval queue  
✅ Can approve/reject products  
✅ Pricing calculates 70-95% confidence  
✅ AI processes images correctly  
✅ All endpoints respond properly  
✅ No TypeScript errors  
✅ Database operations working  
✅ Complete documentation

---

## 📞 CRITICAL REMINDERS

1. **Every file** uses TypeScript strictly - no `any` types
2. **Every endpoint** has error handling and logging
3. **Every component** uses current styling (dark + gold)
4. **Every integration** follows existing patterns
5. **Every step** is tested before moving forward

---

**READY TO EXECUTE?**

Copy this entire prompt into Claude/ChatGPT and begin with STEP 1.

Good luck! 🚀
