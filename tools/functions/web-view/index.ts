import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    console.log('Request URL:', req.url)
    console.log('Pathname:', url.pathname)
    console.log('Search params:', url.search)

    const path = url.pathname.replace(/^\/functions\/v1\/[^\/]+/, '') || '/'
    console.log('Normalized path:', path)

    // Redirect to public HTML stored in Storage
    if (req.method === 'GET' && (path === '/' || path === '/favorites' || path === 'favorites')) {
      const publicWebViewUrl = Deno.env.get('PUBLIC_WEBVIEW_URL')?.trim()
      if (!publicWebViewUrl) {
        console.log('Missing PUBLIC_WEBVIEW_URL env')
        return new Response(JSON.stringify({
          error: 'Missing configuration',
          message: 'Set PUBLIC_WEBVIEW_URL to the public HTML URL in Storage.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Redirecting to public HTML:', publicWebViewUrl)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: publicWebViewUrl
        }
      })
    }

    // API endpoint
    if (req.method === 'GET' && path === '/favorites/api/favorites') {
      console.log('API endpoint called')
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        console.log('No authorization header')
        return new Response(JSON.stringify({
          error: 'Authorization required',
          message: 'Please login first to access your favorites data'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Authorization header present:', authHeader.substring(0, 20) + '...')

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
      if (userError || !user) {
        console.log('User authentication failed:', userError?.message)
        return new Response(JSON.stringify({
          error: 'User not authenticated',
          message: 'Invalid or expired token. Please login again.',
          details: userError?.message
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('User authenticated:', user.email)

      const { data: favorites, error: favError } = await supabaseClient
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: categories, error: catError } = await supabaseClient
        .from('categories')
        .select('name')
        .eq('user_id', user.id)

      if (favError || catError) {
        console.log('Database error:', favError?.message || catError?.message)
        return new Response(JSON.stringify({
          error: 'Database error',
          details: favError?.message || catError?.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const formattedFavorites = favorites?.map((fav) => ({
        id: fav.id.toString(),
        title: fav.title,
        url: fav.url,
        imageUrl: fav.image_url,
        category: fav.category,
        tags: fav.tags || [],
        timestamp: fav.created_at,
      })) || []

      const allCategories = categories?.map((cat) => cat.name) || []
      const allTags = [...new Set(formattedFavorites.flatMap((fav) => fav.tags))]

      console.log('Returning data:', {
        favorites: formattedFavorites.length,
        categories: allCategories.length,
        tags: allTags.length,
      })

      return new Response(JSON.stringify({
        success: true,
        data: {
          favorites: formattedFavorites,
          categories: allCategories,
          allTags: allTags,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('No route matched, returning 404')
    return new Response(JSON.stringify({
      error: 'Not Found',
      path: path,
      availableRoutes: ['/', '/favorites', '/api/favorites']
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
