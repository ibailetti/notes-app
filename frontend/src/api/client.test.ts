import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  request,
  setAuthToken,
  setUnauthorizedHandler,
} from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    setAuthToken(null);
    setUnauthorizedHandler(null);
  });

  it('sends the bearer token and a JSON body', async () => {
    setAuthToken('abc');
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1 }));

    await expect(request('POST', '/notes', { title: 'x' })).resolves.toEqual({
      id: 1,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(init?.body).toBe('{"title":"x"}');
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request('DELETE', '/notes/1')).resolves.toBeUndefined();
  });

  it('joins validation messages from the backend into one error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: ['title should not be empty', 'bad id'] }),
    );

    await expect(request('POST', '/notes', {})).rejects.toEqual(
      new ApiError(400, 'title should not be empty, bad id'),
    );
  });

  it('calls the unauthorized handler on 401 when signed in', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAuthToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Expired' }));

    await expect(request('GET', '/notes')).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call the unauthorized handler for a failed login', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Invalid' }));

    await expect(request('POST', '/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Invalid',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports an unreachable server as status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(request('GET', '/notes')).rejects.toMatchObject({
      status: 0,
    });
  });
});
