const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { Server } = require('socket.io')
const cors = require('cors')
const { z } = require('zod')
const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@clickhouse/client')
const { Kafka } = require('kafkajs')
const { v4: uuidv4 } = require('uuid')
const { exec } = require('child_process')
require('dotenv').config()

const app = express()
const PORT = 9001 // Changed to 9001 to avoid ClickHouse conflict

const prisma = new PrismaClient({})

const io = new Server({ cors: '*' })

const kafka = new Kafka({
    clientId: `api-server`,
    brokers: ['localhost:19092']
})

const client = createClient({
    host: 'http://localhost:8123',
    database: 'default',
    username: 'default',
    password: 'myclickhousepassword' // Matches docker-compose
})

const consumer = kafka.consumer({ groupId: 'api-server-logs-consumer' });

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel);
        socket.emit('message', `Joined channel: ${channel}`);
    });
});

io.listen(11000, () => console.log('Socket Server running on port 11000'))

app.use(express.json())
app.use(cors())

app.post('/project', async (req, res) => {
    const schema = z.object({
        name: z.string(),
        gitURL: z.string()
    })
    const safeParseResult = schema.safeParse(req.body);

    if (safeParseResult.error) return res.status(400).json({ error: safeParseResult.error });

    const { name, gitURL } = safeParseResult.data;

    const project = await prisma.project.create({
        data: {
            name,
            gitURL,
            subDomain: generateSlug()
        }
    })
    return res.json({ status: 'success', data: { project } })
})

app.post('/deploy', async (req, res) => {
    const { projectId } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } })

    if (!project) return res.status(404).json({ error: 'Project not found' })

    const deployment = await prisma.deployment.create({
        data: {
            project: { connect: { id: projectId } },
            status: 'QUEUED'
        }
    })


   const command = `
        docker run -d \
        --name build-${deployment.id} \
        --env GIT_REPO_URL=${project.gitURL} \
        --env PROJECT_ID=${projectId} \
        --env DEPLOYMENT_ID=${deployment.id} \
        --env AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
        --env AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
        --env AWS_REGION=${process.env.AWS_REGION} \
        pavan/vercel-builder
    `;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting Docker: ${error.message}`);
        } else {
            console.log(`Docker started: ${stdout}`);
        }
    });

    return res.json({ status: 'queued', data: { deploymentId: deployment.id } })
})

app.get('/logs/:id', async (req, res) => {
    const id = req.params.id;
    const logs = await client.query({
        query: `SELECT event_id, deployment_id, log, timestamp from log_events WHERE deployment_id = {deployment_id:String}`,
        query_params: { deployment_id: id },
        format: 'JSONEachRow'
    })
    const rawLogs = await logs.json();
    return res.json({ status: 'success', data: { logs: rawLogs } })
})

async function initKafkaConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'container-logs', fromBeginning: true });

    await consumer.run({
        autoCommit: false,
        eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {
            const messages = batch.messages;
            console.log(`Received ${messages.length} messages...`)
            for (const message of messages) {
                const stringMessage = message.value.toString();
                const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);
                
                io.to(`logs:${DEPLOYMENT_ID}`).emit('message', JSON.stringify({ log, DEPLOYMENT_ID }));

                try {
                    const { query_id } = await client.insert({
                        table: 'log_events',
                        values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
                        format: 'JSONEachRow'
                    })
                    resolveOffset(message.offset);
                    await commitOffsetsIfNecessary(message.offset)
                    await heartbeat();
                    console.log("here")
                } catch (err) {
                    console.error('ClickHouse Insert Error:', err);
                }

                if (log.includes('Deployment complete')) {
                    console.log(`Deployment ${DEPLOYMENT_ID} is DONE! Updating DB...`);
                    await prisma.deployment.update({
                        where: { id: DEPLOYMENT_ID },
                        data: { status: "READY" }
                    });
                }
            }
        }
    });
}

async function initClickHouse() {
    try {
        await client.query({
            query: `
                CREATE TABLE IF NOT EXISTS log_events (
                    event_id String,
                    deployment_id String,
                    log String,
                    timestamp DateTime DEFAULT now()
                ) ENGINE = MergeTree()
                ORDER BY timestamp
            `
        })
        console.log("ClickHouse Table 'log_events' ensured.");
    } catch(e) {
        console.error("Failed to initialize ClickHouse table:", e);
    }
}

initClickHouse().then(() => {
    initKafkaConsumer();
    app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));
});