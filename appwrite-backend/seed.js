require('dotenv').config();
const { Client, Users, Databases, Storage, ID, Permission, Role, Query } = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');
const fs = require('fs');
const path = require('path');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const TABLE_ID = process.env.APPWRITE_FILES_TABLE_ID;
const BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

const testUsers = [
  { email: 'alice@example.com', password: 'Password123!', name: 'Alice Nakamura' },
  { email: 'bob@example.com', password: 'Password123!', name: 'Bob Alvarez' },
  { email: 'carol@example.com', password: 'Password123!', name: 'Carol Whitfield' },
];

async function createDummyFile(fileName, content) {
  const tmpPath = path.join(__dirname, fileName);
  fs.writeFileSync(tmpPath, content);
  return tmpPath;
}

async function seed() {
  for (const u of testUsers) {
    console.log(`\n--- Creating user: ${u.email} ---`);

    let user;
    try {
      user = await users.create(ID.unique(), u.email, undefined, u.password, u.name);
      console.log(`Created user ${user.$id}`);
    } catch (err) {
      if (err.code === 409) {
        console.log(`User ${u.email} already exists, fetching...`);
               const list = await users.list([Query.equal('email', u.email)]);
        user = list.users[0];
      } else {
        throw err;
      }
    }

    // Create 2 dummy files per user
    for (let i = 1; i <= 2; i++) {
      const fileName = `${u.name.split(' ')[0].toLowerCase()}_file${i}.txt`;
      const tmpPath = await createDummyFile(fileName, `This is a sample file for ${u.name}, file #${i}.`);

      const uploadedFile = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        InputFile.fromPath(tmpPath, fileName),
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

            const fileSize = fs.statSync(tmpPath).size;
      fs.unlinkSync(tmpPath); // clean up local temp file

      await databases.createDocument(
        DATABASE_ID,
        TABLE_ID,
        ID.unique(),
        {
          owner_id: user.$id,
          file_name: fileName,
          mime_type: 'text/plain',
          size_bytes: fileSize,
          storage_file_id: uploadedFile.$id,
        },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

      console.log(`  Uploaded and recorded: ${fileName}`);
    }
  }

  console.log('\n✅ Seeding complete!');
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});