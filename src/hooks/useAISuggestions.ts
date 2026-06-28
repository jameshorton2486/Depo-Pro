import { useCallback, useEffect, useState } from "react";

import { workspaceApi } from "../api/workspaceService";
import type { PendingAISuggestion } from "../api/client";

type MutationState = {
  isPending: boolean;
};

export async function loadAISuggestions(transcriptId: string): Promise<PendingAISuggestion[]> {
  return workspaceApi.getAISuggestions(transcriptId);
}

export async function acceptAISuggestion(transcriptId: string, wordId: string): Promise<void> {
  await workspaceApi.resolveAISuggestion(transcriptId, wordId, { action: "accept" });
}

export async function rejectAISuggestion(transcriptId: string, wordId: string): Promise<void> {
  await workspaceApi.resolveAISuggestion(transcriptId, wordId, { action: "reject" });
}

export async function acceptAllAISuggestions(transcriptId: string): Promise<void> {
  await workspaceApi.acceptAllAISuggestions(transcriptId);
}

export function useAISuggestions(transcriptId: string) {
  const [data, setData] = useState<PendingAISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const suggestions = await loadAISuggestions(transcriptId);
        if (!cancelled) {
          setData(suggestions);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, transcriptId]);

  const refresh = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  return { data, isLoading, refresh };
}

function useAsyncMutation<TArg>(
  action: (arg: TArg) => Promise<void>,
): {
  mutate: (arg: TArg) => Promise<void>;
  isPending: boolean;
} {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (arg: TArg) => {
    setIsPending(true);
    try {
      await action(arg);
    } finally {
      setIsPending(false);
    }
  }, [action]);

  return { mutate, isPending };
}

export function useAcceptAISuggestion(transcriptId: string, onSuccess?: () => void) {
  return useAsyncMutation(async (wordId: string) => {
    await acceptAISuggestion(transcriptId, wordId);
    onSuccess?.();
  });
}

export function useRejectAISuggestion(transcriptId: string, onSuccess?: () => void) {
  return useAsyncMutation(async (wordId: string) => {
    await rejectAISuggestion(transcriptId, wordId);
    onSuccess?.();
  });
}

export function useAcceptAllAISuggestions(transcriptId: string, onSuccess?: () => void): MutationState & {
  mutate: () => Promise<void>;
} {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async () => {
    setIsPending(true);
    try {
      await acceptAllAISuggestions(transcriptId);
      onSuccess?.();
    } finally {
      setIsPending(false);
    }
  }, [onSuccess, transcriptId]);

  return { mutate, isPending };
}
