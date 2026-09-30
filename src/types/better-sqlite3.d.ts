declare module "better-sqlite3" {
  type RunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  interface Statement<TRow = unknown> {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): TRow | undefined;
    all(...params: unknown[]): TRow[];
  }

  type DatabaseOptions = {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message?: unknown, ...optionalParams: unknown[]) => void;
  };

  class Database {
    constructor(filename: string, options?: DatabaseOptions);
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare<TRow = unknown>(source: string): Statement<TRow>;
    transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
    close(): this;
  }

  export = Database;
}
