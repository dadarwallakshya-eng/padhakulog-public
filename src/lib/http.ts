import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin, type CurrentUser } from './session';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

type UserHandler = (user: CurrentUser) => Promise<Response>;

export async function withUser(handler: UserHandler, { requireOnboarded = true } = {}): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return fail('Not signed in', 401);
  if (requireOnboarded && !user.onboarded) return fail('Finish your profile first', 403);
  return handler(user);
}

export async function withAdmin(handler: () => Promise<Response>): Promise<Response> {
  if (!(await isAdmin())) return fail('Not authorized', 401);
  return handler();
}

export const pairKey = (a: string, b: string) => (a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a });
