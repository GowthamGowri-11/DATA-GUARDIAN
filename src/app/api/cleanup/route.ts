import { NextResponse } from 'next/server';
import { cleanupExpiredData } from '@/actions/cleanup';

// This endpoint can be called by a cron job service (e.g., Vercel Cron, external cron)
// Add authorization in production

export async function GET(request: Request) {
    // In production, verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredData();

    if (result.success) {
        return NextResponse.json({
            message: 'Cleanup completed',
            deletedLinks: result.deletedLinks,
            deletedUsers: result.deletedUsers,
        });
    }

    return NextResponse.json({ error: result.error }, { status: 500 });
}
