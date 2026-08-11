import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const major = searchParams.get('major')

  if (!major) {
    return NextResponse.json({ error: "Missing 'major' parameter" }, { status: 400 })
  }

  try {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        image_url,
        created_at,
        users!inner (id, nombre, apellido, rol, carrera)
      `)
      .gte('created_at', yesterday.toISOString())
      .eq('users.carrera', major)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formattedData = data.map(story => ({
      id: story.id,
      content: story.content,
      media: story.image_url,
      timestamp: story.created_at,
      author: story.users
    }))

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}