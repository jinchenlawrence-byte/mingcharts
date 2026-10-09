import { createClient } from '@supabase/supabase-js'

// 客户端组件使用的Supabase客户端（懒加载）
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase配置缺失，请设置NEXT_PUBLIC_SUPABASE_URL和NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}

// 服务端组件使用的Supabase客户端（需走本地代理，因网络环境限制）
export function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase配置缺失')
  }

  // 服务端环境下使用代理（Node.js 默认不走系统代理，直连被墙）
  if (typeof window === 'undefined') {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'
    try {
      const { ProxyAgent, setGlobalDispatcher } = require('undici')
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
    } catch (e) {
      console.warn('[supabase] undici 代理配置失败，将直连:', (e as Error).message)
    }
  }

  return createClient(supabaseUrl, serviceRoleKey)
}
