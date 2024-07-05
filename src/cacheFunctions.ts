const promises: Record<string, Promise<any> | undefined> = {};

type ObjectWithDataLoader<T, D> = T & { __dataLoader: D };
type InputWithDataLoader<T, D> = T extends undefined
  ? undefined
  : T extends null
    ? null
    : T extends Array<infer R>
      ? Array<InputWithDataLoader<R, D>>
      : ObjectWithDataLoader<T, D>;

export const dataLoader = <DataLoaderType>() => {
  const withData = <T>(v: any, dl: DataLoaderType): InputWithDataLoader<T, DataLoaderType> | undefined => {
    if (Array.isArray(v)) {
      return v
        .filter(<V>(value: V | undefined | null): value is V => !!v)
        .map((value) => withData(value, dl)) as InputWithDataLoader<T, DataLoaderType>;
    }
    if (v === null) return;
    if (v === undefined) return;
    if (typeof v === 'object') {
      return {
        ...v,
        __dataLoader: dl,
      };
    }
    return;
  };
  const fromSource = <T>(src: T) => {
    return src as T extends Array<infer R>
      ? Array<ObjectWithDataLoader<R, DataLoaderType>>
      : ObjectWithDataLoader<T, DataLoaderType>;
  };
  return {
    withData,
    fromSource,
  };
};

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
