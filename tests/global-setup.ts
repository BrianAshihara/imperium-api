import { rmSync } from "fs";
import path from "path";

/** Every run starts from an empty database. */
export default function setup(): void {
  const testDb = path.resolve(process.cwd(), "tmp/test.db");

  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${testDb}${suffix}`, { force: true });
  }
}
