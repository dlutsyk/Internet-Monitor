# Gigabit Internet Speed Testing

## Configuration for 1Gb Connections

### Current Settings

For accurate gigabit measurements:

```env
NETWORK_TEST_FILE_SIZE_BYTES=150000000    # 150MB
NETWORK_TEST_UPLOAD_SIZE_BYTES=25000000   # 25MB
NETWORK_TEST_TIMEOUT_MS=60000             # 60 seconds
MONITOR_INTERVAL_MS=600000                # 10 minutes
```

## Why These Settings?

### Test Duration Calculations

**At 1000 Mbps (1Gb):**
```
Download: 150MB × 8 bits/byte ÷ 1000 Mbps = 1.2 seconds
Upload:   25MB × 8 bits/byte ÷ 1000 Mbps = 0.2 seconds
```

### TCP Ramp-Up Requirements

For gigabit connections, TCP needs time to reach maximum throughput:

| Test Duration | Expected Speed | Accuracy |
|---------------|----------------|----------|
| 0.1-0.3s | 200-400 Mbps | Poor (20-40%) |
| 0.3-0.5s | 400-600 Mbps | Fair (40-60%) |
| 0.5-1.0s | 600-800 Mbps | Good (60-80%) |
| 1.0-2.0s | 800-950 Mbps | Very Good (80-95%) |
| 2.0+ s | 900-1000 Mbps | Excellent (90-100%) |

**Our 1.2 second test** should measure **80-95% of gigabit speed**.

## Important Limitations

### ⚠️ httpbin.org Is NOT a Speed Test Service

**Problems:**
1. **Bandwidth Throttling**: Likely capped at 100-500 Mbps
2. **Shared Resources**: Performance varies by time of day
3. **Geographic Distance**: May not be close to you
4. **Rate Limiting**: May block/throttle repeated requests

**Expected Results:**
- Theoretical max with current setup: **900-950 Mbps**
- Realistic with httpbin.org: **300-700 Mbps**
- Your actual speed: **1000 Mbps**

### Why You Can't Measure Full Gigabit

To accurately measure gigabit speeds, you need:

1. **Multiple parallel connections** (like Fast.com does)
2. **CDN-based test servers** (geographically close)
3. **Dedicated speed test infrastructure**
4. **Very large files** (500MB+) or sustained transfers

Fast.com achieves this by:
- Opening 25+ parallel connections
- Using Netflix CDN servers worldwide
- Downloading multiple files simultaneously
- Running tests for 10-20 seconds

## Alternative Solutions

### Option 1: Reduce Test Size (Recommended for httpbin.org)

Accept that httpbin.org can't measure gigabit speeds. Use smaller tests:

```env
# Optimized for httpbin.org limitations (~500 Mbps max)
NETWORK_TEST_FILE_SIZE_BYTES=50000000     # 50MB
NETWORK_TEST_UPLOAD_SIZE_BYTES=10000000   # 10MB
MONITOR_INTERVAL_MS=300000                 # 5 minutes
```

**Benefits:**
- Faster tests (0.4 seconds at 1Gb)
- Less data usage (~15GB/day)
- Still shows relative performance
- Detects connectivity issues

**Trade-offs:**
- Won't show full gigabit speeds
- Shows 400-600 Mbps instead of 1000 Mbps
- Still useful for detecting problems

### Option 2: Use Cloudflare's Speed Test

```env
NETWORK_TEST_CONNECTIVITY_URL=https://speed.cloudflare.com
# May need to implement custom test logic
```

### Option 3: Host Your Own Test Server

**Requirements:**
1. VPS with gigabit connection
2. Geographically close to you
3. nginx serving large static files
4. No bandwidth caps

**nginx configuration:**
```nginx
location /speedtest/ {
    root /var/www;
    # Serve pre-generated test files
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

**Generate test files:**
```bash
# Create 100MB, 200MB, 500MB test files
dd if=/dev/urandom of=/var/www/speedtest/100mb.bin bs=1M count=100
dd if=/dev/urandom of=/var/www/speedtest/200mb.bin bs=1M count=200
dd if=/dev/urandom of=/var/www/speedtest/500mb.bin bs=1M count=500
```

Then update config:
```env
NETWORK_TEST_FILE_SIZE_BYTES=200000000
NETWORK_TEST_CONNECTIVITY_URL=https://your-server.com/speedtest/200mb.bin
```

### Option 4: Use Ookla Speedtest CLI

Replace the current implementation with Speedtest CLI:

```bash
npm install --save speedtest-net
```

**Pros:**
- Designed for speed testing
- Finds optimal test server
- Multi-threaded downloads
- Accurate gigabit measurements

**Cons:**
- Requires code changes
- External dependency

## Network Usage Comparison

| Interval | Test Size | Daily Usage | Suitable For |
|----------|-----------|-------------|--------------|
| 5 min | 50MB | ~15 GB | Home monitoring |
| 10 min | 150MB | ~25 GB | Gigabit testing |
| 15 min | 150MB | ~17 GB | Lower usage |
| 5 min | 20MB | ~6 GB | Budget option |

With unlimited bandwidth, any of these are fine. With data caps, use:
- 5-minute interval with 20-50MB tests

## Realistic Expectations

### With Current Setup (httpbin.org)

**What you'll see:**
- **300-700 Mbps** most of the time
- Variation based on:
  - Time of day
  - httpbin.org load
  - Network congestion
  - Server throttling

**What this tells you:**
- ✅ You have **good connectivity** (>300 Mbps)
- ✅ Can detect **major issues** (drops to <100 Mbps)
- ✅ Shows **relative performance** trends
- ❌ Won't show **true gigabit speed**

### With Dedicated Speed Test Infrastructure

**What you'd see:**
- **900-1000 Mbps** consistently
- Accurate gigabit measurements
- True connection capability

## Recommended Configuration

### For Home Monitoring (Recommended)

```env
# Balanced approach
NETWORK_TEST_FILE_SIZE_BYTES=50000000      # 50MB
NETWORK_TEST_UPLOAD_SIZE_BYTES=10000000    # 10MB
MONITOR_INTERVAL_MS=300000                  # 5 minutes
NETWORK_TEST_TIMEOUT_MS=30000              # 30 seconds
```

**Results:**
- Measures: 400-600 Mbps (not full gigabit)
- Data usage: ~15GB/day
- Test duration: ~0.4s at 1Gb
- Good for: Connectivity monitoring, issue detection

### For Accurate Gigabit Testing

```env
# Maximum accuracy (high data usage)
NETWORK_TEST_FILE_SIZE_BYTES=200000000     # 200MB
NETWORK_TEST_UPLOAD_SIZE_BYTES=30000000    # 30MB
MONITOR_INTERVAL_MS=900000                  # 15 minutes
NETWORK_TEST_TIMEOUT_MS=60000              # 60 seconds
```

**Results:**
- Measures: Up to 700-900 Mbps (httpbin.org limited)
- Data usage: ~22GB/day
- Test duration: ~1.6s at 1Gb
- Good for: Better accuracy, still server-limited

### For True Gigabit Measurement

**Use external tools when needed:**

```bash
# Run Speedtest CLI manually for accurate measurements
npx speedtest-cli

# Or use Fast.com in browser
# These will show true 900-1000 Mbps
```

**Keep this monitor running for:**
- Continuous monitoring
- Downtime detection
- Trend analysis
- Issue alerts

## Summary

For your 1Gb connection:

1. **Current configuration (150MB tests):**
   - ✅ Will measure **80-95% of server capacity**
   - ⚠️ httpbin.org likely caps at **500-700 Mbps**
   - ⚠️ Uses **~25GB/day** bandwidth
   - ⚠️ Won't show full 1000 Mbps

2. **Recommended configuration (50MB tests):**
   - ✅ Good for **connectivity monitoring**
   - ✅ Lower data usage (**~15GB/day**)
   - ✅ Faster tests (**0.4 seconds**)
   - ⚠️ Shows **400-600 Mbps** (relative performance)

3. **For accurate gigabit testing:**
   - Use **Fast.com or Speedtest** when needed
   - This monitor is for **continuous connectivity monitoring**
   - Not a replacement for **proper speed tests**

## Bottom Line

**This application is designed for:**
- ✅ Connectivity monitoring (detecting outages)
- ✅ Performance trending (relative speed over time)
- ✅ Issue detection (speed drops, packet loss)

**This application is NOT ideal for:**
- ❌ Accurate gigabit speed measurement
- ❌ Single-test speed verification
- ❌ ISP speed validation

For those needs, use Fast.com, Speedtest.net, or dedicated tools.
