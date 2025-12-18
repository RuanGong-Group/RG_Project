FROM node:18-bullseye

# 云端构建加速：切换到阿里云镜像（本地若不需要可注释掉）
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list || true \
 && sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list || true

# Install Python, pip, FFmpeg, fonts, and system libraries（附带重试，避免偶发网络超时）
RUN set -eux; \
    for i in 1 2 3; do apt-get update && break || sleep 3; done; \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        ffmpeg \
        fonts-wqy-zenhei \
        espeak-ng \
        imagemagick \
        libgl1-mesa-glx \
    ; \
    rm -rf /var/lib/apt/lists/*

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
