import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!user_id) {
    return NextResponse.json(
      { error: "The user_id parameter is missing." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
    id,
    content,
    created_at,
    users (id, nombre, apellido, rol, avatar_url),
    reactions (id)
  `,
      )
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const formattedData = data.map((post) => ({
      id: post.id,
      contenido: post.content,
      fecha: post.created_at,
      autor: post.users,
      total_reacciones: post.reactions.length,
    }));

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
