import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Storage } from '@google-cloud/storage';
import * as multer from 'multer';
export function UploadFiles(
  folder: string,
  fieldName = 'pictures',
  maxCount = 10,
) {
  const storage = multer.memoryStorage();
  const gcStorage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  });

  const bucket = gcStorage.bucket(process.env.GCS_BUCKET_NAME);

  const uploadHandler = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }).array(fieldName, maxCount);

  return applyDecorators(
    UseInterceptors({
      intercept: async (context, next) => {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        return new Promise((resolve, reject) => {
          uploadHandler(req, res, async (err) => {
            if (err) return reject(err);
            if (!req.files?.length) return resolve(next.handle());

            try {
              const uploadPromises = req.files.map((file) => {
                const uniqueFileName = `${folder}/${Date.now()}-${
                  file.originalname
                }`;
                const blob = bucket.file(uniqueFileName);
                const blobStream = blob.createWriteStream({
                  resumable: false,
                });

                return new Promise((resolve, reject) => {
                  blobStream.on('error', reject);
                  blobStream.on('finish', async () => {
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                    resolve(publicUrl);
                  });
                  blobStream.end(file.buffer);
                });
              });

              const urls = await Promise.all(uploadPromises);
              req.files = urls.map((url) => ({ location: url }));
              resolve(next.handle());
            } catch (error) {
              reject(error);
            }
          });
        });
      },
    }),
  );
}
