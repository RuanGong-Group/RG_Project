FROM node:18-slim

# Install Python, pip, FFmpeg, and fonts
# fonts-wqy-microhei provides a fallback Chinese font
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    fonts-wqy-microhei \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy Python requirements and install Python dependencies
# We copy the specific requirements file to a temp location first to cache this layer
COPY scripts/video_gen/requirements.txt ./scripts/video_gen/requirements.txt
RUN pip3 install -r scripts/video_gen/requirements.txt --break-system-packages

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
