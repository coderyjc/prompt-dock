const dbName = "prompt-dock-assets";
const storeName = "editor-background-images";

type StoredEditorBackgroundImage = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  updatedAt: string;
};

const openBackgroundDb = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(dbName, 1);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("failed to open background image store")));
  });
};

const runStoreOperation = async <T,>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const db = await openBackgroundDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("background image store operation failed")));
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("abort", () => {
      db.close();
      reject(transaction.error ?? new Error("background image store transaction aborted"));
    });
  });
};

export const saveEditorBackgroundImage = async (file: File) => {
  const id = `bg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const item: StoredEditorBackgroundImage = {
    id,
    name: file.name,
    type: file.type,
    blob: file,
    updatedAt: new Date().toISOString()
  };

  await runStoreOperation("readwrite", (store) => store.put(item));
  return { id, name: item.name };
};

export const loadEditorBackgroundImageUrl = async (id: string) => {
  if (!id) return "";

  try {
    const item = await runStoreOperation<StoredEditorBackgroundImage | undefined>("readonly", (store) => store.get(id));
    return item?.blob ? URL.createObjectURL(item.blob) : "";
  } catch {
    return "";
  }
};

export const deleteEditorBackgroundImage = async (id: string) => {
  if (!id) return;

  try {
    await runStoreOperation("readwrite", (store) => store.delete(id));
  } catch {
    return;
  }
};
