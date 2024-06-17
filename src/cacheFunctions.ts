const promises: Record<string, Promise<any> | undefined> = {};
const setToPromise = <PromiseType>(key: string, value: () => Promise<PromiseType>) => {
  const promise = value();
  promises[key] = promise;
  return promise;
};

export const getFromPromise = <PromiseType>(
  model: string,
  field: string,
  fn: () => Promise<PromiseType>,
  forceChangeFn = false,
) => {
  const key = `${model} - ${field}`;
  if (forceChangeFn) return setToPromise(key, fn);
  if (promises[key]) return promises[key] as Promise<PromiseType>;
  return setToPromise(key, fn);
};
export const clearPromises = () => Object.keys(promises).forEach((k) => delete promises[k]);
