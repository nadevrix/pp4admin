import { callHub } from '@/lib/hub-api';

export const runtime = 'nodejs';

export async function GET() {
  return callHub('/api/admin/dashboard');
}
