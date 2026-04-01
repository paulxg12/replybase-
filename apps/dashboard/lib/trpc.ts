"use client";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

async function getAuthToken() {
  const session = await getSession();
  if (!session?.user) return "token";
  return "token";
}

const client: any = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
      async headers() {
        const token = await getAuthToken();
        return {
          authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});

function createProxy(path: string[] = []): any {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const propName = String(prop);
        const procedurePath = path.join(".");

        if (propName === "query") {
          return (input?: unknown) => client.query(procedurePath, input as any);
        }

        if (propName === "mutate") {
          return (input?: unknown) => client.mutation(procedurePath, input as any);
        }

        if (propName === "useQuery") {
          return (
            input?: unknown,
            options?: {
              enabled?: boolean;
            }
          ) => {
            const enabled = options?.enabled ?? true;
            const [data, setData] = useState<any>(undefined);
            const [error, setError] = useState<unknown>(null);
            const [isLoading, setIsLoading] = useState<boolean>(enabled);
            const inputKey = JSON.stringify(input ?? null);

            const refetch = async () => {
              if (!enabled) {
                return data;
              }

              setIsLoading(true);
              setError(null);
              try {
                const result = await client.query(procedurePath, input as any);
                setData(result);
                return result;
              } catch (err) {
                setError(err);
                throw err;
              } finally {
                setIsLoading(false);
              }
            };

            useEffect(() => {
              if (!enabled) {
                setIsLoading(false);
                return;
              }
              void refetch();
              // Re-run when input/options or procedure path changes.
            }, [enabled, inputKey, procedurePath]);

            return {
              data,
              error,
              isLoading,
              refetch,
            };
          };
        }

        if (propName === "useMutation") {
          return () => {
            const [isPending, setIsPending] = useState(false);
            const [error, setError] = useState<unknown>(null);
            const [data, setData] = useState<any>(undefined);

            const mutateAsync = async (input?: unknown) => {
              setIsPending(true);
              setError(null);
              try {
                const result = await client.mutation(procedurePath, input as any);
                setData(result);
                return result;
              } catch (err) {
                setError(err);
                throw err;
              } finally {
                setIsPending(false);
              }
            };

            const mutate = (input?: unknown) => {
              void mutateAsync(input);
            };

            return {
              mutate,
              mutateAsync,
              isPending,
              error,
              data,
            };
          };
        }

        return createProxy([...path, propName]);
      },
    }
  );
}

export const trpc = createProxy();
export type TRPCClient = typeof trpc;
