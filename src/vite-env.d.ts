/// <reference types="vite/client" />

declare module "@qpdf-engine" {
  const factory: (opts?: {
    noInitialRun?: boolean;
    locateFile?: (path: string) => string;
  }) => Promise<{
    printErr?: (line: string) => void;
    FS: {
      writeFile: (path: string, data: Uint8Array | string) => void;
      readFile: (path: string) => Uint8Array | string;
      unlink?: (path: string) => void;
    };
    callMain: (args: string[]) => number | Promise<number>;
  }>;
  export default factory;
}

declare module "@jspawn/qpdf-wasm" {
  export default function createModule(opts?: {
    locateFile?: (path: string) => string;
  }): Promise<{
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      unlink?: (path: string) => void;
    };
    callMain: (args: string[]) => number;
  }>;
}
