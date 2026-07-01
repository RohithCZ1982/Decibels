import { NextRequest } from "next/server";

export function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init));
}

export function makeJsonRequest(
  url: string,
  method: string,
  body: unknown
): NextRequest {
  return makeRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function makeParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}
