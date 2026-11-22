import 'express';

declare global {
  namespace Express {
    type MulterFile = Multer.File;
    interface Request {
      // Signed-in customer (visitor guard).
      visitor?: { id: string; name: string; phone: string };
      uploadedFileKeys?: string[];
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    visitor?: { id: string; name: string; phone: string };
    uploadedFileKeys?: string[];
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  }
}
