import { NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminSupabaseClient } from '@/lib/auth/server-admin';

export async function POST(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { documentPath } = body;

    if (!documentPath) {
      return NextResponse.json(
        { error: 'Missing required parameter: documentPath.' },
        { status: 400 }
      );
    }

    // If it's already an external HTTP link (e.g. from seed/demo), return as is
    if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
      return NextResponse.json({ success: true, signedUrl: documentPath });
    }

    const supabase = getAdminSupabaseClient(auth.token);
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(documentPath, 300); // 5 minutes validity

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create secure document preview URL.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate signed URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
