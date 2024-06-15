const promises: Record<string, Promise<any> | undefined> = {};
const setToPromise = <PromiseType>(key: string, value: () => Promise<PromiseType>) => {
  const promise = value();
  promises[key] = promise;
  return promise;
};

export const getFromPromise = <PromiseType>(key: string, fn: () => Promise<PromiseType>) => {
  if (promises[key]) return promises[key] as Promise<PromiseType>;
  return setToPromise(key, fn);
};
