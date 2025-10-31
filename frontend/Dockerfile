# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_BASE_URL=/api
ARG VITE_WS_PATH=/ws
ARG VITE_WS_INITIAL_RECONNECT_DELAY=3000
ARG VITE_WS_MAX_RECONNECT_DELAY=30000
ARG VITE_MAX_RECENT_MEASUREMENTS=200
ARG VITE_APP_NAME="Internet Monitor"

# Set them as environment variables for the build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_PATH=$VITE_WS_PATH
ENV VITE_WS_INITIAL_RECONNECT_DELAY=$VITE_WS_INITIAL_RECONNECT_DELAY
ENV VITE_WS_MAX_RECONNECT_DELAY=$VITE_WS_MAX_RECONNECT_DELAY
ENV VITE_MAX_RECENT_MEASUREMENTS=$VITE_MAX_RECENT_MEASUREMENTS
ENV VITE_APP_NAME=$VITE_APP_NAME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (Vite will embed the ENV variables into the build)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
