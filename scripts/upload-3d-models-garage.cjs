/**
 * Script upload 5 mẫu nhẫn 3D (GLB, PNG renders, JSON template)
 * lên Garage Object Storage (S3-compatible) qua Tailscale.
 */
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const BUCKET_NAME = process.env.CATALOG_STORAGE_BUCKET || 'memora-catalog';
const ENDPOINT = process.env.OPERATIONS_OBJECT_STORAGE_ENDPOINT;
const REGION = process.env.OPERATIONS_OBJECT_STORAGE_REGION || 'garage';
const ACCESS_KEY = process.env.OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID;
const SECRET_KEY = process.env.OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY;

if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Lỗi: Thiếu cấu hình Garage S3 trong .env!');
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true,
});

const BASE_DIR = path.resolve(__dirname, '../docs/duypq/3D RING MODEL');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.glb':
      return 'model/gltf-binary';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

async function uploadFile(filePath, s3Key) {
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);
  const sizeKb = (fileBuffer.length / 1024).toFixed(1);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  console.log(`  [OK] Uploaded -> s3://${BUCKET_NAME}/${s3Key} (${sizeKb} KB)`);
}

async function main() {
  console.log('=============================================================================');
  console.log(`Bắt đầu tải 3D Ring Models lên Garage S3 (${ENDPOINT})`);
  console.log(`Bucket đích: ${BUCKET_NAME}`);
  console.log('=============================================================================');

  if (!fs.existsSync(BASE_DIR)) {
    console.error(`Không tìm thấy thư mục: ${BASE_DIR}`);
    process.exit(1);
  }

  const modelFolders = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Tìm thấy ${modelFolders.length} thư mục mẫu nhẫn:`, modelFolders.join(', '));
  console.log('');

  let totalUploaded = 0;

  for (const folder of modelFolders) {
    console.log(`>>> Đang xử lý mẫu nhẫn: ${folder}`);
    const folderPath = path.join(BASE_DIR, folder);
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      // Bỏ qua các file nguồn Blender (.blend, .blend1) vì chỉ phục vụ thiết kế offline
      if (ext === '.blend' || ext === '.blend1') {
        continue;
      }

      const filePath = path.join(folderPath, file);

      let targetKey = '';
      if (ext === '.glb') {
        targetKey = `models/${file}`;
      } else if (ext === '.png') {
        targetKey = `renders/${folder}/${file}`;
      } else if (ext === '.json') {
        targetKey = `templates/${file}`;
      } else {
        targetKey = `misc/${folder}/${file}`;
      }

      try {
        await uploadFile(filePath, targetKey);
        totalUploaded++;
      } catch (err) {
        console.error(`  [FAIL] Lỗi khi upload ${file}:`, err.message);
      }
    }
    console.log('');
  }

  console.log('=============================================================================');
  console.log(`Hoàn thành upload! Tổng số file đã tải lên: ${totalUploaded}`);
  console.log('Đang kiểm tra danh sách file trên Garage S3...');
  console.log('=============================================================================');

  const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));
  const objects = listRes.Contents || [];
  console.log(`Tổng số objects trong bucket '${BUCKET_NAME}': ${objects.length}`);
  objects.forEach(obj => {
    console.log(` - ${obj.Key} (${(obj.Size / 1024).toFixed(1)} KB)`);
  });

  console.log('\n>>> BƯỚC 1 ĐÃ HOÀN TẤT THÀNH CÔNG 100%! <<<');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
