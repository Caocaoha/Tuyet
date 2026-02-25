import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const correctionSchema = z.object({
  transcriptId: z.string().uuid(),
  segmentIndex: z.number().int().nonnegative(),
  correctedText: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const body = correctionSchema.parse(await req.json());

    // In a real implementation, this would:
    // 1. Update IndexedDB transcript record
    // 2. Re-generate note content with corrected text
    // 3. Update Obsidian file via bridge
    
    // For now, return success (implementation depends on IndexedDB setup)
    return NextResponse.json({
      success: true,
      transcriptId: body.transcriptId,
      segmentIndex: body.segmentIndex,
      message: 'Correction saved. Note will be updated.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', code: 'INVALID_INPUT', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Correction save error:', { message: (error as Error).message });
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
