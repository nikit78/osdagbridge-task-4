/**
 * appwrite-adapter.js
 * --------------------
 * Connects the test client (index.html) directly to Appwrite using the
 * Appwrite Web SDK, when "Appwrite" mode is selected.
 */

(function () {
  const ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
  const PROJECT_ID = "6a8537a5003ae8d5f452";
  const DATABASE_ID = "6a853864001896403f9e";
  const FILES_TABLE_ID = "files";
  const BUCKET_ID = "6a8540cb001eaa75f111";

  const { Client, Account, Databases, Storage, Query, ID } = Appwrite;

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  const account = new Account(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  function json(status, body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  async function handleRegister(req) {
    const { email, password } = await req.json();
    try {
      const user = await account.create(ID.unique(), email, password);
      return json(201, { id: user.$id, email: user.email });
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      if (err.code === 409) return json(409, { error: "A user with this email already exists" });
      return json(400, { error: "DEBUG: " + err.message });
    }
  }

   async function handleLogin(req) {
    const { email, password } = await req.json();
    try{
      
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      return json(200, { token: session.$id, user: { id: user.$id, email: user.email } });
    } catch (err) {
      console.error("LOGIN ERROR FULL:", err);
      console.error("LOGIN ERROR code:", err.code, "type:", err.type, "message:", err.message);
      return json(401, {
        error: "DEBUG code=" + err.code + " type=" + err.type + " msg=" + err.message,
      });
    }
  }

  async function handleLogout(req) {
    try {
      await account.deleteSession("current");
      return json(200, { message: "Logged out" });
    } catch (err) {
      return json(200, { message: "Logged out" });
    }
  }

  async function handleMe(req) {
    try {
      const user = await account.get();
      return json(200, { id: user.$id, email: user.email, name: user.name });
    } catch (err) {
      console.error("ME ERROR:", err);
      return json(401, { error: "DEBUG: " + err.message });
    }
  }

  async function handleFiles(req) {
    try {
      const user = await account.get();
      const result = await databases.listDocuments(DATABASE_ID, FILES_TABLE_ID, [
        Query.equal("owner_id", user.$id),
      ]);
      return json(200, { files: result.documents });
    } catch (err) {
      console.error("FILES ERROR:", err);
      return json(401, { error: "DEBUG: " + err.message });
    }
  }

  async function handleFileById(req, fileId) {
    try {
      const user = await account.get();
      const doc = await databases.getDocument(DATABASE_ID, FILES_TABLE_ID, fileId);
      if (doc.owner_id !== user.$id) {
        return json(403, { error: "You do not have access to this file" });
      }
      return json(200, { file: doc });
    } catch (err) {
      console.error("FILE BY ID ERROR:", err);
      if (err.code === 404) return json(404, { error: "File not found" });
      if (err.code === 401 || err.code === 403) return json(403, { error: "You do not have access to this file" });
      return json(401, { error: "DEBUG: " + err.message });
    }
  }

  async function handleFileDownload(req, fileId) {
    try {
      const user = await account.get();
      const doc = await databases.getDocument(DATABASE_ID, FILES_TABLE_ID, fileId);
      if (doc.owner_id !== user.$id) {
        return new Response("Forbidden", { status: 403 });
      }
      const result = storage.getFileDownload(BUCKET_ID, doc.storage_file_id);
      return fetch(result);
    } catch (err) {
      return new Response("DEBUG: " + err.message, { status: 401 });
    }
  }

    const realFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const appwriteRadio = document.querySelector('input[name="backendMode"][value="appwrite"]');
    const appwriteEnabled = appwriteRadio && appwriteRadio.checked;

    if (!appwriteEnabled) return realFetch(input, init);

    const url = typeof input === "string" ? input : input.url;

    // IMPORTANT: let the Appwrite SDK's own network calls (to ENDPOINT) pass through
    // untouched. Only intercept OUR app's calls to relative paths like /login, /me, etc.
    if (url.startsWith(ENDPOINT) || url.includes("cloud.appwrite.io")) {
      return realFetch(input, init);
    }

    const { pathname } = new URL(url, window.location.href);
    const req = new Request(url, init);

    if (pathname === "/register" && req.method === "POST") return handleRegister(req);
    if (pathname === "/login" && req.method === "POST") return handleLogin(req);
    if (pathname === "/logout" && req.method === "POST") return handleLogout(req);
    if (pathname === "/me" && req.method === "GET") return handleMe(req);
    if (pathname === "/files" && req.method === "GET") return handleFiles(req);

    let m = pathname.match(/^\/files\/([^/]+)\/download$/);
    if (m && req.method === "GET") return handleFileDownload(req, m[1]);

    m = pathname.match(/^\/files\/([^/]+)$/);
    if (m && req.method === "GET") return handleFileById(req, m[1]);

    return json(404, { error: "No Appwrite route for " + req.method + " " + pathname });
  };

  console.info("[appwrite-adapter] ready — select 'Appwrite' backend mode in the UI to use it");
})();