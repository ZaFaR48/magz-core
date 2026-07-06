import { NextResponse } from "next/server";

const maxDownloadBytes = 1024 * 1024;

function requestedBytes(request: Request) {
  const { searchParams } = new URL(request.url);
  const bytes = Number(searchParams.get("bytes") ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 0;
  }

  return Math.min(Math.floor(bytes), maxDownloadBytes);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const bytes = requestedBytes(request);
  const payload = bytes ? "m".repeat(bytes) : "";
  const serverDurationMs = Math.round(performance.now() - startedAt);

  return NextResponse.json({
    ok: true,
    serverTime: new Date().toISOString(),
    serverDurationMs,
    bytes,
    payload,
  });
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const body = await request.arrayBuffer();
  const serverDurationMs = Math.round(performance.now() - startedAt);

  return NextResponse.json({
    ok: true,
    serverTime: new Date().toISOString(),
    serverDurationMs,
    receivedBytes: body.byteLength,
  });
}
