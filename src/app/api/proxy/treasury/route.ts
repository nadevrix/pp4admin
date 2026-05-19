import { callHub } from '@/lib/hub-api';

export const runtime = 'nodejs';

export async function GET() {
  return callHub('/api/admin/treasury/setup');
}

export async function POST(request: Request) {
  const body = await request.text();
  return callHub('/api/admin/treasury/setup', {
    method: 'POST',
    body: body || undefined,
  });
}
