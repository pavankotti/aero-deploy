const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const { Kafka } = require('kafkajs')

const PROJECT_ID = process.env.PROJECT_ID
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID

const kafka = new Kafka({
    clientId: `docker-build-server-${DEPLOYMENT_ID}`,
    brokers: ['localhost:19092'],
    ssl: false,
    sasl: undefined
})

const producer = kafka.producer();

async function publishLog(log) {
    await producer.send({ topic: `container-logs`, messages: [{ key: 'log', value: JSON.stringify({ PROJECT_ID, DEPLOYMENT_ID, log }) }] })
}

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

async function init() {
    await producer.connect();

    console.log("Executing script.js");
    await publishLog('Build started');
    const outDirPath = path.join(__dirname, "output");

    const p = exec(`cd ${outDirPath} && npm install && npm run build`);

    p.stdout.on('data', async function (data) {
        console.log(data.toString());
        await publishLog(data.toString());
    });

    p.stderr.on('data', async function (data) {
        console.error("Error:", data.toString());
        await publishLog(`Error: ${data.toString()}`);
    });

    p.on('close', async function () {
        console.log('Build complete');
        await publishLog('Build complete');

        const distPath = path.join(__dirname, 'output', 'dist');
        const buildPath = path.join(__dirname, 'output', 'build');
        const folderToUpload = fs.existsSync(distPath) ? distPath : (fs.existsSync(buildPath) ? buildPath : null);

        if (!folderToUpload) {
            await publishLog("Error: Could not find build folder");
            process.exit(1);
        }

        const distFolderContents = fs.readdirSync(folderToUpload, { recursive: true });
        await publishLog('Started to upload files');

        for (const relativePath of distFolderContents) {
            const fullPath = path.join(folderToUpload, relativePath);
            if (fs.lstatSync(fullPath).isDirectory()) continue;

            console.log("Uploading", relativePath);
            await publishLog(`Uploading ${relativePath}`);

            const command = new PutObjectCommand({
                Bucket: 'vercel-clone-pavankotti',
                Key: `__outputs/${DEPLOYMENT_ID}/${relativePath}`,
                Body: fs.createReadStream(fullPath),
                ContentType: mime.lookup(fullPath) || 'application/octet-stream'
            });

            await s3Client.send(command);
            await publishLog(`Uploaded ${relativePath}`);
        }
        await publishLog('All files uploaded successfully');
        console.log("All files uploaded successfully");
        process.exit(0);
    });
}

init();