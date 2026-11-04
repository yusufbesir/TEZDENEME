// Only a secret_ref ever leaves this module (database, logs, API). Values stay inside a SecretStore.
const REF_PATTERN = /^secret:[a-z0-9][a-z0-9._-]{0,63}$/;

export function isSecretRef(value: string): boolean {
  return REF_PATTERN.test(value);
}

export interface SecretStore {
  put(ref: string, value: string): void;
  get(ref: string): string | undefined;
  has(ref: string): boolean;
  list(): string[];
  remove(ref: string): boolean;
}

export class MemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  put(ref: string, value: string): void {
    if (!isSecretRef(ref)) throw new Error("invalid secret_ref");
    if (value.length === 0) throw new Error("empty secret value");
    this.values.set(ref, value);
  }

  get(ref: string): string | undefined {
    if (!isSecretRef(ref)) throw new Error("invalid secret_ref");
    return this.values.get(ref);
  }

  has(ref: string): boolean {
    return this.values.has(ref);
  }

  list(): string[] {
    return [...this.values.keys()].sort();
  }

  remove(ref: string): boolean {
    return this.values.delete(ref);
  }

  toJSON(): unknown {
    return { refs: this.list() };
  }
}
