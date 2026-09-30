import type { ImageHandoffArtifact, StoredImageHandoff } from "./types";

const DATABASE_NAME = "toolkit-handoffs";
const DATABASE_VERSION = 1;
const STORE_NAME = "artifacts";
const PENDING_IMAGE_KEY = "pending-image";
const MAX_HANDOFF_AGE_MS = 15 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeImageHandoff(
  artifact: ImageHandoffArtifact,
): Promise<void> {
  if (!artifact.blob.type.startsWith("image/")) {
    throw new Error("Only image artifacts can be handed to another tool.");
  }

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const stored: StoredImageHandoff = {
      ...artifact,
      createdAt: Date.now(),
      version: 1,
    };
    await runRequest(
      transaction.objectStore(STORE_NAME).put(stored, PENDING_IMAGE_KEY),
    );
  } finally {
    database.close();
  }
}

export async function readImageHandoff(): Promise<ImageHandoffArtifact | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const stored = await runRequest(
      store.get(PENDING_IMAGE_KEY) as IDBRequest<
        StoredImageHandoff | undefined
      >,
    );
    if (!stored) return null;

    if (
      stored.version !== 1 ||
      Date.now() - stored.createdAt > MAX_HANDOFF_AGE_MS ||
      !stored.blob.type.startsWith("image/")
    ) {
      return null;
    }

    return {
      blob: stored.blob,
      filename: stored.filename,
      sourceHref: stored.sourceHref,
    };
  } finally {
    database.close();
  }
}

export async function clearImageHandoff(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await runRequest(
      transaction.objectStore(STORE_NAME).delete(PENDING_IMAGE_KEY),
    );
  } finally {
    database.close();
  }
}

export async function takeImageHandoff(): Promise<ImageHandoffArtifact | null> {
  const artifact = await readImageHandoff();
  if (artifact) await clearImageHandoff();
  return artifact;
}
