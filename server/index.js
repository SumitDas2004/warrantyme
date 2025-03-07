const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const HTMLtoDOCX = require("html-to-docx");
const fs = require("fs");
const mammoth = require("mammoth");
const { randomUUID } = require("crypto");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const { google } = require("googleapis");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors({ allowedHeaders: "*", origin: "*" }));
app.use(cookieParser());
app.use(bodyParser.json());

if (!fs.existsSync("htmlToDocx")) fs.mkdirSync("htmlToDocx");
if (!fs.existsSync("docxToHtml")) fs.mkdirSync("docxToHtml");

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization;
    if (!token) res.status(401).json({ message: "Please login." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    console.log(e);
    res.status(401).json({ message: "Please login." });
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.SERVER_URL+"/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/drive.file"],
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const port = process.env.PORT;


async function downloadFile(fileId, accessToken) {
  try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
      );

      const filePath = `./docxToHtml/${fileId}.docx`;
      const dest = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
          response.data.pipe(dest);
          response.data.on('end', () => {
              resolve(filePath);
          });
          response.data.on('error', reject);
      });

      return filePath; // Return local file path
  } catch (error) {
      console.error('Error downloading file:', error.message);
      throw new Error('File download failed');
  }
}

app.get('/userdetails', authMiddleware, (req, res)=>{
  res.status(200).send({email: req.user.email, name: req.user.displayName, photo: req.user.photo});
})


app.post("/docx-to-html/:fileId", authMiddleware, async (req, res, next) => {
  const fileName = await downloadFile(req.params.fileId, req.user.accessToken)
  mammoth
    .convertToHtml({ path: fileName })
    .then(function (result) {
      res.status(200).json({ html: result.value });
    })
    .catch(function (error) {
      console.error(error);
    })
    .finally(() => fs.rm(fileName, () => {}));
});

async function createFolderInDrive(auth) {
  const drive = google.drive({ version: "v3", auth });

  const query = `name='warrantyme' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await drive.files.list({ q: query, fields: "files(id)" });

  if (response.data.files.length > 0) {
    return response.data.files[0].id; // Return existing folder ID
  }

  const fileMetadata = {
    name: "warrantyme",
    mimeType: "application/vnd.google-apps.folder",
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });

  return folder.data.id;
}



async function listFiles(auth, folderId) {
  const drive = google.drive({ version: "v3", auth });

  const query = `"${folderId}" in parents and trashed=false`;
  const response = await drive.files.list({ q: query, fields: "files(id, name)" });

  return response.data.files.map(file => ({ id: file.id, name: file.name })).filter(file=>file.name.endsWith('docx'));
}

app.post("/html-to-docx", authMiddleware, async (req, res, next) => {
  const { html } = req.body;
  const localFileName = path.resolve(`./htmlToDocx/${randomUUID()}.docx`);

  try {
    const buffer = await HTMLtoDOCX(
      `<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Document</title>
    </head>
        <body> 
            <div>${html}</div>
        </body>
    </html>`,
      null,
      {
        pageNumber: true,
        footer: true,
        
      }
    );

    await new Promise((res, rej) => {
      fs.writeFile(localFileName, buffer, {}, () => res());
    });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: req.user.accessToken });

    // Creating the folder in google drive
    const folderId = await createFolderInDrive(auth);

    const drive = google.drive({ version: "v3", auth });

    await drive.files.create({
      requestBody: {
        name: `${req.body.name}.docx`,
        parents: [folderId],
      },
      media: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body: fs.createReadStream(localFileName),
      },
      fields: "id",
    });

    res
      .status(201)
      .json({
        message: `Success: file ${req.body.name}.docx has been uploaded to warranty me folder.`,
      });
  } finally {
    fs.rm(localFileName, () => {});
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/drive.file"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_URL+"/login",
  }),
  (req, res) => {
    const token = jwt.sign({id:req.user.id, displayName: req.user.displayName, email: req.user.emails[0].value, photo: req.user.photos[0].value, accessToken: req.user.accessToken}, process.env.JWT_SECRET);
    res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
  }
);



app.get("/list/files", authMiddleware, async (req, res)=>{
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: req.user.accessToken });
  console.log(req.user.accessToken)
  const fileId = await createFolderInDrive(auth);
  app.get('/google/logout', authMiddleware, (req, res)=>{
    
  })
  app.get('/google/logout', authMiddleware, (req, res)=>{
    
  })

  const files = await listFiles(auth, fileId);

  res.status(200).json({files})
})


app.get("/ping", (req, res) => {
  res.status(200).send("Pong");
});

app.listen(port, () => console.log(`App is listening to ${port}.`));
