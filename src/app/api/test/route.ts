import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';

export async function GET() {
  try {
    const session = await auth();
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.accessToken,
      sessionError: session?.error ?? null,
      userEmail: session?.user?.email ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}