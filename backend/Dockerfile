FROM node:18-bullseye

# Install Python, pip, FFmpeg, fonts, and system libraries
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    fonts-wqy-zenhei \
    espeak-ng \
    imagemagick \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# Copy Python requirements and install Python dependencies
COPY scripts/video_gen/requirements.txt ./scripts/video_gen/requirements.txt
# Note: Bullseye uses Python 3.9, standard pip usually doesn't enforce break-system-packages
RUN pip3 install -r scripts/video_gen/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

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
