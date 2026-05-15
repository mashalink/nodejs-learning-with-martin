export async function GET() {
  const supabase_url = process.env.SUPABASE_URL;
  const supabase_anon_key = process.env.SUPABASE_ANON_KEY;

  if (!supabase_url || !supabase_anon_key) {
    return new Response('Missing Supabase env variables', { status: 500 });
  }

  const response = await fetch(`${supabase_url}/rest/v1/products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabase_anon_key,
      'Authorization': `Bearer ${supabase_anon_key}`,
    },
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
