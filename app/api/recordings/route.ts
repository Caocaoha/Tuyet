// app/api/recordings/route.ts
import { NextResponse } from 'next/server';

// Recordings được lưu trong IndexedDB (client-side)
// API này trả về empty list — data thực tế đọc từ IndexedDB ở client
export async function GET() {
  return NextResponse.json({ recordings: [], message: 'Use IndexedDB on client side' });
}
