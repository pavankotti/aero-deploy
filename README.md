

# Aero-Deploy: Distributed Deployment Engine

A high-concurrency deployment platform that automates GitHub-to-Cloud workflows. Architected with isolated build environments and a real-time analytical logging pipeline.

## 🏗️ System Architecture

The platform consists of four decoupled services to ensure high availability and isolation.

<img width="1037" height="676" alt="image" src="https://github.com/user-attachments/assets/75dc920a-edf7-40f9-99f6-dbb46ae2c52f" />


1.  **Build Server (Docker)**: Ephemeral worker that clones, builds, and uploads static assets to AWS S3.
2.  **Log Pipeline (Kafka + ClickHouse)**: Buffers high-volume build logs for real-time streaming and analytical storage.
3.  **Reverse Proxy (Node.js)**: Dynamically routes incoming subdomains to the correct S3 deployment folders.
4.  **API Server (Express/Socket.io)**: Manages project metadata and orchestrates Docker build tasks.

---

## 💾 Technical Stack

* **Runtime**: Node.js / TypeScript
* **Infrastructure**: Docker (Build Isolation), AWS (S3, EC2)
* **Message Broker**: **Apache Kafka** (High-throughput log buffering)
* **Analytical DB**: **ClickHouse** (Sub-second log retrieval)
* **Primary DB**: **PostgreSQL** (Metadata management via Prisma)
* **Real-time**: **Socket.io** (WebSocket streaming)

---

## 🚀 Key Engineering Challenges

### **Real-time Log Streaming**
To handle massive log throughput without bottlenecking the API, I implemented a Kafka-buffer architecture. Logs are produced to a Kafka topic by the build containers, while a dedicated consumer broadcasts them via WebSockets and batch-inserts them into ClickHouse.



### **Isolated Build Environments**
Every build runs in a fresh Docker container using host-level networking. This ensures process isolation, prevents dependency conflicts, and allows for strict resource limits per deployment.

### **Dynamic Subdomain Routing**
The reverse proxy intercepts requests for `*.yourdomain.com`, performs a lookup in PostgreSQL to find the latest successful deployment, and proxies the request to the corresponding AWS S3 path.

---

## 🛠️ Project Structure

```bash
├── api-server/         # Project management & WebSocket orchestration
├── build-server/       # Dockerfile & build-to-S3 logic
├── s3-reverse-proxy/   # Subdomain-to-S3 mapping & routing
└── frontend/           # React terminal & deployment dashboard
```
---

## 📊 High-Level Data Flow

1. **Ingestion:** User submits a Git URL via the dashboard.

2. **Orchestration:** API Server triggers a Docker build container.

3. **Streaming:** Container pushes build logs to Kafka; Consumer broadcasts them via Socket.io.

4. **Storage:** Logs are persisted in ClickHouse; Assets are uploaded to AWS S3.

5. **Serving:** Reverse Proxy maps the project subdomain to the S3 bucket path.

---

## 🏁 Setup & Deployment
1. **Infrastructure:** Spin up Kafka, ClickHouse, and Postgres:
    ```bash
    docker-compose up -d
    ```
2. **Database:** Run Prisma migrations:
    ```bash
    npx prisma migrate dev
    ```
3.  **Start the API Server (The Brain)**
    ```bash
    cd ~/aero-deploy/api-server
    ```

4.  **Start the Reverse Proxy (The Router)**
    ```
    cd ~/vercel-clone/s3-reverse-proxy
    ```

5. **Start the Frontend**
    ```
    cd ~/vercel-clone/frontend
    npm run dev
    ```
