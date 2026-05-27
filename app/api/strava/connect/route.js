import { NextResponse } from 'next/server'

export async function GET(request) {
  const clientId = process.env.STRAVA_CLIENT_ID
  const redirectUri = process.env.STRAVA_REDIRECT_URI
  
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=activity:read_all,profile:read_all`
  
  return NextResponse.redirect(stravaAuthUrl)
}
