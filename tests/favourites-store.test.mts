import assert from "node:assert/strict";
import test from "node:test";

import {
  createFavouritesStore,
  parseFavourites,
  FAVOURITES_STORAGE_KEY,
} from "../lib/shared/favourites-store.ts";

test("corrupt values are safe and valid entries survive mixed arrays", () => {
  for (const raw of ["broken", "{}", "null", "42"])
    assert.deepEqual(parseFavourites(raw), []);
  assert.deepEqual(
    parseFavourites('["/tools/a",null,3,{},"/tools/a","/tools/b"]'),
    ["/tools/a", "/tools/b"],
  );
});

test("read/write failure keeps toggles in session memory", () => {
  for (const failRead of [false, true]) {
    const store = createFavouritesStore(() => ({
      getItem: () => {
        if (failRead) throw new Error("blocked");
        return '["old"]';
      },
      setItem: () => {
        throw new Error("blocked");
      },
    }));
    store.toggle("new");
    assert.deepEqual(
      parseFavourites(store.getSnapshot()),
      failRead ? ["new"] : ["old", "new"],
    );
    store.toggle("new");
    assert.deepEqual(
      parseFavourites(store.getSnapshot()),
      failRead ? [] : ["old"],
    );
  }
  const denied = createFavouritesStore(() => {
    throw new Error("getter blocked");
  });
  denied.toggle("x");
  assert.equal(denied.getSnapshot(), '["x"]');
});

test("same-tab updates, cross-tab changes and clear notify; unrelated keys do not", () => {
  let saved: string | null = null;
  let notifications = 0;
  const store = createFavouritesStore(() => ({
    getItem: () => saved,
    setItem: (_key, value) => {
      saved = value;
    },
  }));
  const stop = store.subscribe(() => {
    notifications++;
  });
  store.toggle("a");
  assert.equal(saved, '["a"]');
  saved = '["b"]';
  store.storageChanged(FAVOURITES_STORAGE_KEY);
  assert.equal(store.getSnapshot(), '["b"]');
  saved = null;
  store.storageChanged(null);
  assert.equal(store.getSnapshot(), "[]");
  store.storageChanged("other");
  assert.equal(notifications, 3);
  stop();
  store.toggle("a");
  assert.equal(notifications, 3);
});
