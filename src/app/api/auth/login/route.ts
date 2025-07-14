import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/utils/supabase'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const cookieStore = cookies()
    const supabase = await createServerClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Ocorreu um erro inesperado. Tente novamente.' },
      { status: 500 },
    )
  }
}
