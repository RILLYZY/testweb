const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const { Octokit } = require("@octokit/rest");

const app = express();
const port = 3000;

// GitHub config
const GITHUB_TOKEN = "YOUR_GITHUB_TOKEN"; // Ganti ini
const REPO_OWNER = "YOUR_GITHUB_USERNAME"; // Ganti ini
const REPO_NAME = "YOUR_REPO_NAME"; // Ganti ini
const FILE_PATH = "database.json"; // Ganti ini kalau beda

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const databaseURL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve file static
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/style.css", (req, res) => {
    res.sendFile(__dirname + "/style.css");
});

// Endpoint untuk login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const database = await fetchDatabase();

    const user = database.users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Endpoint untuk add database
app.post("/add", async (req, res) => {
    const { username, password, nomor } = req.body;
    const database = await fetchDatabase();

    // Cek nomor duplikat
    const isExist = database.dbnya.some(user => user.nomor === nomor);
    if (isExist) {
        return res.json({ success: false, message: "Nomor sudah terdaftar!" });
    }

    database.dbnya.push({ username, password, nomor });

    const success = await updateDatabase(database);

    if (success) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Gagal update database!" });
    }
});

// Fungsi ambil database
async function fetchDatabase() {
    try {
        const response = await fetch(databaseURL);
        if (!response.ok) throw new Error("Gagal mengambil database");
        const data = await response.json();
        return data && Array.isArray(data.dbnya) ? data : { dbnya: [], users: [] };
    } catch (error) {
        console.error("Error fetching database:", error);
        return { dbnya: [], users: [] };
    }
}

// Fungsi update database
async function updateDatabase(newData) {
    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH
        });

        const sha = fileData.sha;
        const newContent = Buffer.from(JSON.stringify(newData, null, 2)).toString("base64");

        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: "Update database via website",
            content: newContent,
            sha
        });

        return true;
    } catch (error) {
        console.error("Error updating database:", error);
        return false;
    }
}

app.listen(port, () => {
    console.log(`Server jalan di http://localhost:${port}`);
});
