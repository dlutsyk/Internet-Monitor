import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const parseLine = (line) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    return null;
  }
};

export default class Storage {
  constructor(filePath, retentionHours) {
    this.filePath = filePath;
    this.retentionMs = retentionHours ? retentionHours * 60 * 60 * 1000 : null;
    this.cache = [];
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      await fs.writeFile(this.filePath, '');
    }
    this.cache = await this.readRange();
    this.pruneCache();
  }

  async append(record) {
    const line = `${JSON.stringify(record)}\n`;
    await fs.appendFile(this.filePath, line);
    this.cache.push(record);
    this.pruneCache();
  }

  pruneCache() {
    if (!this.retentionMs) {
      return;
    }
    const cutoff = Date.now() - this.retentionMs;
    this.cache = this.cache.filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
  }

  getRecent(limit = 50) {
    if (limit <= 0) {
      return [];
    }
    return this.cache.slice(-limit);
  }

  async readRange(from, to) {
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;
    const results = [];

    const stream = createReadStream(this.filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }
      const record = parseLine(line);
      if (!record?.timestamp) {
        continue;
      }
      const ts = new Date(record.timestamp).getTime();
      if (Number.isNaN(ts)) {
        continue;
      }
      if (fromTs && ts < fromTs) {
        continue;
      }
      if (toTs && ts > toTs) {
        continue;
      }
      results.push(record);
    }

    return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
