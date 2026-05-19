import { callHub } from '@/lib/hub-api';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return callHub(`/api/admin/tx/${encodeURIComponent(id)}/mark-resolved`, {
    method: 'POST',
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return callHub(`/api/admin/tx/${encodeURIComponent(id)}/mark-resolved`, {
    method: 'DELETE',
  });
}
