import { NextRequest, NextResponse } from 'next/server'
import { appendFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const logPath = join(process.cwd(), '.cursor', 'debug.log')
    
    // Append NDJSON line to log file
    const logLine = JSON.stringify(body) + '\n'
    await appendFile(logPath, logLine, 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Debug log error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
