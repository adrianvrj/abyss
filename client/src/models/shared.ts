import { shortString } from "starknet";

export interface PrimitiveValue<T = string> {
  value: T;
  key?: boolean;
  type?: string;
  type_name?: string;
}

type RawValue<T> = PrimitiveValue<T> | T | undefined | null;

export function rawValue<T>(field: RawValue<T>) {
  if (field && typeof field === "object" && "value" in field) {
    return field.value as T;
  }
  return field as T | undefined | null;
}

export function toNumber(field: RawValue<string | number | boolean>) {
  const value = rawValue(field);
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return Number(value);
}

export function toBigInt(field: RawValue<string | number | bigint>) {
  const value = rawValue(field);
  if (value === undefined || value === null || value === "") {
    return 0n;
  }
  return BigInt(value);
}

export function toBoolean(field: RawValue<string | number | boolean>) {
  const value = rawValue(field);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "0x1";
  }
  return false;
}

export function toAddress(field: RawValue<string | bigint>) {
  const value = rawValue(field);
  if (!value) {
    return "0x0";
  }
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }
  return value;
}

export function decodeShortStringField(field: RawValue<string>) {
  const value = rawValue(field);
  if (!value) {
    return "";
  }

  try {
    const hex = value.startsWith("0x")
      ? value
      : `0x${BigInt(value).toString(16)}`;
    return shortString.decodeShortString(hex);
  } catch {
    return value;
  }
}

export function dedupeBy<T>(
  items: T[],
  getKey: (item: T) => string | number | bigint,
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = String(getKey(item));
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

