import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Supabase request failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const products = await response.json();

    return NextResponse.json(products);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch products from Supabase" },
      { status: 500 },
    );
  }
}
