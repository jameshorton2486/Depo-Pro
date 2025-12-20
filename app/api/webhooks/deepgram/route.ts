import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement later)
    const body = await request.json();

    console.log('Deepgram webhook received:', body);

    // TODO: Process Deepgram webhook
    // Update transcription status in database
    // Handle completion, errors, etc.

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
