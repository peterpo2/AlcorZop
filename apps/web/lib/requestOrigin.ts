export const getRequestOrigin = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host')?.trim();
  const proto =
    forwardedProto || (request.url.startsWith('https:') ? 'https' : request.url.startsWith('http:') ? 'http' : 'http');

  if (host) {
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
};

export const isSecureRequest = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto) {
    return forwardedProto === 'https';
  }
  return request.url.startsWith('https:');
};
