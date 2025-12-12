FROM node:18-slim

# Optimize for China network: Replace Debian sources with Aliyun mirrors
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# Install Python, pip, FFmpeg, fonts, and TTS engine
# fonts-wqy-microhei: Chinese font fallback
# espeak-ng: Text-to-speech engine (required by pyttsx3 as gTTS fallback in China)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    fonts-wqy-microhei \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# Copy Python requirements and install Python dependencies
# We copy the specific requirements file to a temp location first to cache this layer
COPY scripts/video_gen/requirements.txt ./scripts/video_gen/requirements.txt
RUN pip3 install -r scripts/video_gen/requirements.txt --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple

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
