const STANDARD_TTL_IN_MILLISECONDS = 3000;

const dataLoaderCache: Record<
  string,
  { value: any; createdAt: number; ttl: number }
> = {};

export const setToCache = (key: string, value: any, ttl?: number) => {
  dataLoaderCache[key] = {
    ttl: typeof ttl === "undefined" ? STANDARD_TTL_IN_MILLISECONDS : ttl,
    createdAt: new Date().valueOf(),
    value,
  };
};

export const getFromCache = (key: string) => {
  const isInCache = dataLoaderCache[key];
  if (!isInCache) return;
  const now = new Date().valueOf();
  const expired = now - isInCache.createdAt > isInCache.ttl;
  if (expired) {
    delete dataLoaderCache[key];
    return;
  }
  return isInCache.value;
};
