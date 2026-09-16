import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

// JWT validation is performed against Auth below, including asymmetric signing
// keys. No request body can choose the account to delete.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'Method not allowed' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return response(401, { error: 'Sign in required' });
  let body: unknown;
  try { body = await request.json(); } catch { return response(400, { error: 'Invalid request' }); }
  if (typeof body !== 'object' || body === null || !('confirmation' in body) || body.confirmation !== 'DELETE_MY_ACCOUNT') {
    return response(400, { error: 'Deletion confirmation required' });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return response(503, { error: 'Account deletion is not configured' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: { user }, error } = await admin.auth.getUser(authorization.slice(7));
    if (error || !user) return response(401, { error: 'Session expired. Sign in again.' });

    // Enable this secret before distributing a build with RevenueCat billing.
    // Delete provider identity first; a failure keeps the login account available
    // so the user can retry. The route is idempotent for already absent customers.
    const revenueCatKey = Deno.env.get('REVENUECAT_SECRET_KEY');
    if (Deno.env.get('REVENUECAT_ENABLED') === 'true' && !revenueCatKey) {
      return response(503, { error: 'Billing account deletion is not configured' });
    }
    if (revenueCatKey) {
      const result = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${revenueCatKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!result.ok && result.status !== 404) return response(502, { error: 'Billing account deletion failed. Please retry.' });
    }
    // This release stores no projects/photos/profile rows on Supabase and creates
    // no Storage bucket, so there are no customer-owned storage objects to remove.
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) return response(500, { error: 'Account deletion failed. Please retry.' });
    return response(200, { deleted: true });
  } catch {
    return response(503, { error: 'Account deletion is temporarily unavailable' });
  }
});
