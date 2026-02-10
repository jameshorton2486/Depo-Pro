import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { POST as providerPost } from '../[provider]/route';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    return await providerPost(request, { params: Promise.resolve({ provider: 'deepgram' }) });
  } catch (error) {
    logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
