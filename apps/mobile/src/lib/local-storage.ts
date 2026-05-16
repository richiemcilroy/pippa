import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryStorage = new Map<string, string>();

export async function getLocalItem(key: string) {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(key) ?? memoryStorage.get(key) ?? null;
  }

  if (await SecureStore.isAvailableAsync()) {
    return SecureStore.getItemAsync(key);
  }

  return memoryStorage.get(key) ?? null;
}

export async function setLocalItem(key: string, value: string) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(key, value);
    memoryStorage.set(key, value);
    return;
  }

  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return;
  }

  memoryStorage.set(key, value);
}

export async function deleteLocalItem(key: string) {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(key);
    memoryStorage.delete(key);
    return;
  }

  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  memoryStorage.delete(key);
}

function getWebStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
