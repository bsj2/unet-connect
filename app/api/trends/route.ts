import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  if (!category) {
    return NextResponse.json({ error: "Missing 'category' parameter" }, { status: 400 })
  }

  try {
    if (category.toLowerCase() === 'clips') {
      const { data, error } = await supabase
        .from('clips')
        .select(`
          id,
          content,
          video_url,
          created_at,
          shares_count,
          users (id, nombre, apellido, avatar_url),
          clip_likes (id),
          clip_comments (id)
        `)

      if (error) throw error

      const scoredClips = data.map(clip => {
        const L = clip.clip_likes?.length || 0
        const C = clip.clip_comments?.length || 0
        const S = clip.shares_count || 0
        
        const createdTime = new Date(clip.created_at).getTime()
        const currentTime = new Date().getTime()
        const deltaT = (currentTime - createdTime) / (1000 * 60 * 60)

        const engagementScore = (L * 2) + (C * 3) + (S * 5) - (deltaT * 1.5)

        return {
          id: clip.id,
          content: clip.content,
          video_url: clip.video_url,
          author: clip.users,
          metrics: {
            likes: L,
            comments: C,
            shares: S
          },
          engagement_score: Number(engagementScore.toFixed(2))
        }
      })

      scoredClips.sort((a, b) => b.engagement_score - a.engagement_score)

      return NextResponse.json({
        success: true,
        category: 'clips',
        count: scoredClips.length,
        data: scoredClips
      })
    }

    return NextResponse.json({ error: "Category not supported for trending algorithm yet" }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}