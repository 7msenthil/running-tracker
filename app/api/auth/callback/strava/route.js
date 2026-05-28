import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=NoCodeProvided', request.url))
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  const host = request.headers.get('host')
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/strava`

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  const tokenData = await tokenRes.json()

  if (tokenData.errors) {
    console.error('Strava token error:', tokenData)
    return NextResponse.redirect(new URL('/?error=StravaTokenFailed', request.url))
  }

  const athleteId = tokenData.athlete.id
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token

  const cookieStore = await cookies()
  
  cookieStore.set('strava_athlete_id', athleteId.toString(), { httpOnly: true, secure: true, path: '/' })
  cookieStore.set('strava_access_token', accessToken, { httpOnly: true, secure: true, path: '/' })
  cookieStore.set('strava_refresh_token', refreshToken, { httpOnly: true, secure: true, path: '/' })

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
