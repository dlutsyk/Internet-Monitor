-- CreateTable
CREATE TABLE "measurements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "downloadMbps" REAL,
    "uploadMbps" REAL,
    "latencyMs" REAL,
    "jitterMs" REAL,
    "packetLoss" REAL,
    "durationSinceLastMs" INTEGER,
    "estimatedDowntimeMs" INTEGER,
    "error" TEXT,
    "meta" TEXT,
    "server" TEXT,
    "client" TEXT,
    "createdAt" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "measurements_timestamp_idx" ON "measurements"("timestamp");

-- CreateIndex
CREATE INDEX "measurements_status_idx" ON "measurements"("status");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");
