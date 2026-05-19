import { callHub } from '@/lib/hub-api';

export const runtime = 'nodejs';

export async function GET() {
  return callHub('/api/admin/wallets');
}

export async function POST() {
  // Create a new pool wallet (Friendbot testnet)
  return callHub('/api/admin/wallets', { method: 'POST' });
}

export async function DELETE(request: Request) {
  const body = await request.text();
  return callHub('/api/admin/wallets', { method: 'DELETE', body });
}
