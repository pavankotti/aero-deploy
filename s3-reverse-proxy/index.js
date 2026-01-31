const express = require('express');
const httpProxy = require('http-proxy');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
app.use(cors());
const prisma = new PrismaClient();

const PORT = 8000;
const BASE_PATH = 'https://vercel-clone-pavankotti.s3.ap-south-1.amazonaws.com/__outputs';

const proxy = httpProxy.createProxy();

app.use(async (req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];

    console.log(`\n Lookup for subdomain: ${subdomain}`);

    const project = await prisma.project.findFirst({
        where: { subDomain: subdomain }
    });

    if (!project) {
        console.log("Project not found");
        return res.status(404).send("Project not found");
    }

    const deployment = await prisma.deployment.findFirst({
        where: { projectId: project.id, status: 'READY' },
        orderBy: { createdAt: 'desc' }
    });

    if (!deployment) {
        console.log("No active deployment");
        return res.status(404).send("No active deployment found");
    }

    if (req.url === '/') {
        req.url = '/index.html';
    }

    const resolvesTo = `${BASE_PATH}/${deployment.id}`;

    return proxy.web(req, res, {
        target: resolvesTo,
        changeOrigin: true,
        selfHandleResponse: false
    });
});

proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error');
});

app.listen(PORT, () => {
    console.log(`reverse-proxy running on port ${PORT}`);
});