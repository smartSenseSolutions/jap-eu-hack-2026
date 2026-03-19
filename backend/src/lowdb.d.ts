declare module 'lowdb' {
  function low<T = any>(adapter: any): any;
  export = low;
}

declare module 'lowdb/adapters/FileSync' {
  class FileSync<T = any> {
    constructor(source: string);
  }
  export = FileSync;
}
