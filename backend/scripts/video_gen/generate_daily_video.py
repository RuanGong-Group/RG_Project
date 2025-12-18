import os
import asyncio
import json
import requests
import random
import argparse
import sys
import re
from dotenv import load_dotenv
from moviepy.editor import ImageClip, AudioFileClip, TextClip, CompositeVideoClip, concatenate_videoclips
from gtts import gTTS
import pyttsx3
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
from tencentcloud.common import credential
from tencentcloud.tts.v20190823 import tts_client, models as tts_models
import base64

# Numpy compatibility for moviepy 1.0.3
if not hasattr(np, 'int'):
    np.int = int
if not hasattr(np, 'float'):
    np.float = float
if not hasattr(np, 'bool'):
    np.bool = bool

# Pillow 10+ compatibility for moviepy 1.0.3
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.LANCZOS

# 加载环境变量
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

# LLM (SiliconFlow) keys
API_KEY = os.getenv("SILICONFLOW_API_KEY") or os.getenv("AI_API_KEY")
# DeepSeek model id on SiliconFlow (configurable)
DEEPSEEK_MODEL_ID = os.getenv("DEEPSEEK_MODEL_ID", "deepseek-ai/DeepSeek-V3")

# Doubao (Volcengine) Image API config
DOUBAO_API_KEY = os.getenv("DOUBAO_API_KEY")
DOUBAO_API_BASE = os.getenv("DOUBAO_API_BASE", "https://ark.cn-beijing.volces.com/api/v3")
DOUBAO_IMAGE_MODEL = os.getenv("DOUBAO_IMAGE_MODEL", "doubao-seedream-4-0-250828")
DOUBAO_IMAGE_STYLE = os.getenv("DOUBAO_IMAGE_STYLE", "comic")  # comic | realistic

# COS Configuration
COS_SECRET_ID = os.getenv("COS_SECRET_ID")
COS_SECRET_KEY = os.getenv("COS_SECRET_KEY")
COS_REGION = os.getenv("COS_REGION", "ap-guangzhou")
COS_BUCKET_NAME = os.getenv("COS_BUCKET_NAME")
COS_UPLOAD_ENABLED = os.getenv("COS_UPLOAD_ENABLED", "false").lower() == "true"

# Tencent Cloud TTS Configuration (复用 COS 密钥或单独配置)
TTS_SECRET_ID = os.getenv("TTS_SECRET_ID") or COS_SECRET_ID
TTS_SECRET_KEY = os.getenv("TTS_SECRET_KEY") or COS_SECRET_KEY
TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"  # 默认启用

# Font Configuration
# Use relative path from backend/assets/fonts
FONT_PATH = os.path.join(backend_dir, "assets", "fonts", "simhei.ttf")
if not os.path.exists(FONT_PATH):
    # Fallback to Windows font if local asset not found (dev mode)
    if os.path.exists("C:/Windows/Fonts/simhei.ttf"):
        FONT_PATH = "C:/Windows/Fonts/simhei.ttf"
    else:
        FONT_PATH = "arial.ttf" # System default fallback

# 验证必需的 API Keys
if not API_KEY:
    print(json.dumps({"status": "error", "message": "SILICONFLOW_API_KEY or AI_API_KEY not found in .env file"}))
    sys.exit(1)

if not DOUBAO_API_KEY:
    print(json.dumps({"status": "error", "message": "DOUBAO_API_KEY not found in .env file"}))
    sys.exit(1)

# 配置存储路径
# 优先使用环境变量 LOCAL_STORAGE_PATH，否则默认为 ../../../RG_data
DEFAULT_STORAGE_PATH = os.path.join(backend_dir, "../RG_data")
STORAGE_PATH = os.getenv("LOCAL_STORAGE_PATH", DEFAULT_STORAGE_PATH)

# 如果是相对路径，转换为绝对路径
if not os.path.isabs(STORAGE_PATH):
    STORAGE_PATH = os.path.abspath(os.path.join(backend_dir, STORAGE_PATH))

# 定义子目录
DIRS = {
    "video": os.path.join(STORAGE_PATH, "videos", "daily"),
    "audio": os.path.join(STORAGE_PATH, "audio"),
    "image": os.path.join(STORAGE_PATH, "images"),
    "temp": os.path.join(STORAGE_PATH, "videos", "temp")
}

# 确保目录存在
for d in DIRS.values():
    os.makedirs(d, exist_ok=True)

def log_progress(status, progress, message=None, data=None):
    """输出 JSON 格式的进度日志"""
    log_entry = {
        "status": status,
        "progress": progress,
        "message": message
    }
    if data:
        log_entry.update(data)
    print(json.dumps(log_entry), flush=True)

async def generate_script(word_data):
    """使用 DeepSeek 生成高质量脚本与图像描述"""
    words_str = ", ".join([f"{w['word']} ({w['meaning']})" for w in word_data])
    log_progress("generating_script", 10, f"Generating script for words: {words_str}")

    # System role to constrain style and quality
    system_msg = (
        "You are a senior children's picture-book writer. "
        "Write bright, warm, realistic daily-life/nature/school stories. "
        "Ensure smooth scene transitions and natural usage of all provided vocabulary. "
        "Provide per-scene Chinese translation and an image description (subject + action + setting + lighting + mood + time + camera). "
        "Avoid dark, horror, surreal, distorted content."
    )

    user_msg = f"""
        TASK OVERVIEW:
        Produce EXACT JSON for a coherent children's picture-book story (4–6 scenes) with ONE immutable main character and FULL vocabulary coverage.

        STRICT OUTPUT RULES:
        - Return ONLY JSON (no comments/markdown/code fences). Field order fixed.
        - No extra fields; no null; no trailing commas; plain UTF-8 text.

        CHARACTER DESIGN (IMMUTABLE):
        - ≤45 English words describing age, gender, hair style & color, eye color, clothing (single outfit), ONE distinctive accessory (optional).
        - MUST remain unchanged across all scenes. Do NOT alter outfit or features.
        - No magical/surreal traits; suitable for children.

        STORY STRUCTURE (FLEXIBLE BUT COHERENT):
        Choose ONE of these narrative patterns based on vocabulary:
        
        A) GOAL-DRIVEN: Character wants something → encounters obstacles → achieves/learns
           Example: Wants to find a gift → searches different places → discovers perfect item
        
        B) DISCOVERY JOURNEY: Character explores → encounters interesting things → reaches destination
           Example: Walks through park → notices flowers/birds → arrives at favorite spot
        
        C) CAUSE-EFFECT CHAIN: Action A leads to B, B leads to C, forming a logical sequence
           Example: Rain starts → character takes umbrella → puddle forms → character jumps in it
        
        D) DAILY ROUTINE: Character performs connected activities throughout the day
           Example: Morning wake-up → breakfast → school → play → bedtime
        
        CORE REQUIREMENT (APPLIES TO ALL PATTERNS):
        - Each scene MUST be a DIRECT CONSEQUENCE of the previous scene
        - Character's location changes should be GRADUAL and LOGICAL (no sudden teleportation)
        - Actions must be MOTIVATED by what happened before or character's personality
        
        ANCHOR WORD STRATEGY:
        - Identify the most CONCRETE, VISUAL word from vocabulary as story foundation
        - Build 60-70% of the story around this anchor word's context
        - Other words should fit NATURALLY into this main scenario (don't force unrelated words into same sentence)
        - If a word doesn't fit organically, create a SMOOTH TRANSITION scene to introduce it

        SCENE CONSTRUCTION (PRIORITY: LOGIC > VOCABULARY):
        - 4–6 scenes forming a COMPLETE, BELIEVABLE story
        - Each scene: ONE English sentence (12–20 words for natural flow)
        - NO semicolons/quotes/ellipses; avoid abrupt transitions
        - Transition phrases ONLY when needed for clarity ("Then" / "After that" / "Soon")
        
        PER-SCENE CHECKLIST:
        ✓ Does this scene logically follow from the previous one? (cause-effect link)
        ✓ Is the character's action motivated and realistic?
        ✓ Does the vocabulary word usage feel NATURAL (not shoehorned)?
        ✓ Can I visualize this scene clearly? (specific location/action/objects)
        
        FINAL VALIDATION:
        - Read the full story: Does it make sense as a continuous narrative?
        - Would a 6-year-old understand why each event happens?
        - Is the ending satisfying (not abrupt or confusing)?
        - If you had to sacrifice vocabulary coverage for story coherence, prioritize COHERENCE

        IMAGE DESCRIPTIONS (FOR GENERATION):
        - Short comma-separated phrase with FIXED order:
            action, setting, lighting (consistent), mood, camera (choose one of: wide establishing | mid-shot | close-up | over-shoulder)
        - DO NOT include character appearance (it is defined in character_design)
        - Keep time-of-day and location consistent across all scenes

        COVERAGE & VALIDATION:
        - used_words MUST be a subset of TODAY'S VOCABULARY; no invented words
        - Aim for 100% coverage BUT prioritize story quality over forced word insertion
        - If a word truly doesn't fit naturally, it's acceptable to miss 1-2 words rather than break story logic
        - If coverage.missing_words is not empty, briefly note why those words didn't fit organically

        TODAY'S VOCABULARY:
        {words_str}

        JSON OUTPUT FORMAT (strict, field order):
        {{
            "character_design": "...",
            "anchor_word": "...",
            "theme": "≤10 words capturing the story's core message or activity",
            "scenes": [
                {{
                    "text": "...",
                    "translation": "...",
                    "image_desc": "action, setting, lighting, mood, camera",
                    "used_words": ["..."]
                }}
            ],
            "coverage": {{
                "total_words": {len(word_data)},
                "covered_words": ["..."],
                "missing_words": []
            }}
        }}
        """

    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": DEEPSEEK_MODEL_ID,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        parsed = json.loads(content)

        # Coverage check: ensure no missing words
        missing = parsed.get('coverage', {}).get('missing_words', [])
        scenes = parsed.get('scenes', [])
        character_design = parsed.get('character_design', '')
        
        if missing:
            log_progress("generating_script", 15, f"Missing words in coverage: {missing}. Proceeding but may retry in future.")
        
        if not character_design:
            log_progress("warning", 15, "No character_design found in DeepSeek response. Image consistency may suffer.")

        log_progress("script_generated", 20, f"Script generated: {len(scenes)} scenes, character: {character_design[:50]}...")
        return parsed  # 返回完整的 parsed 对象(包含 character_design)
    except Exception as e:
        log_progress("error", 0, f"Error generating script: {e}")
        return None

async def generate_audio(text, output_filename):
    """使用腾讯云 TTS 生成高质量语音，降级方案：gTTS -> pyttsx3"""
    output_path = os.path.join(DIRS["audio"], output_filename)
    
    # 优先尝试腾讯云大模型 TTS（适配免费大模型资源包）
    if TTS_ENABLED and TTS_SECRET_ID and TTS_SECRET_KEY:
        # 使用大模型音色（与免费资源包匹配）
        # 文档：https://cloud.tencent.com/document/product/1073/92668
        voice_types = [
            (501009, "WeWinny"),  # 英文女声WeWinny（大模型）
        ]
        
        for voice_id, voice_name in voice_types:
            try:
                cred = credential.Credential(TTS_SECRET_ID, TTS_SECRET_KEY)
                client = tts_client.TtsClient(cred, "ap-guangzhou")
                
                req = tts_models.TextToVoiceRequest()
                req.Text = text
                req.SessionId = output_filename.replace('.mp3', '')
                req.VoiceType = voice_id  # 使用大模型音色ID
                req.Codec = "mp3"
                req.SampleRate = 16000
                req.Speed = 0  # 正常语速
                req.Volume = 5  # 音量（0-10）
                
                resp = client.TextToVoice(req)
                audio_data = base64.b64decode(resp.Audio)
                
                with open(output_path, 'wb') as f:
                    f.write(audio_data)
                
                print(f"✅ Tencent TTS (AI Model) succeeded with {voice_name} ({voice_id})", file=sys.stderr)
                return output_path
                
            except Exception as e:
                error_msg = str(e)
                print(f"⚠️ Tencent TTS error with {voice_name} ({voice_id}): {error_msg}", file=sys.stderr)
                continue  # 尝试下一个音色
        
        print(f"⚠️ All Tencent TTS AI voices failed. Trying gTTS fallback...", file=sys.stderr)
    
    # 降级方案1：gTTS (需要翻墙)
    try:
        tts = gTTS(text=text, lang='en', tld='us')
        tts.save(output_path)
        print(f"✅ gTTS succeeded", file=sys.stderr)
        return output_path
    except Exception as e:
        print(f"❌ gTTS failed: {e}. Trying pyttsx3 fallback...", file=sys.stderr)
    
    # 降级方案2：pyttsx3 + eSpeak（质量最差但稳定）
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 0.9)
        
        voices = engine.getProperty('voices')
        for v in voices:
            if "english" in v.name.lower():
                engine.setProperty('voice', v.id)
                break
        
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        print(f"✅ pyttsx3 succeeded", file=sys.stderr)
        return output_path
    except Exception as e2:
        print(f"❌ pyttsx3 failed: {e2}", file=sys.stderr)
        return None

def generate_image(image_desc, output_filename):
    """单张图片生成(用于组图不足的降级补齐)"""
    output_path = os.path.join(DIRS["image"], output_filename)

    if not (DOUBAO_API_KEY and DOUBAO_API_BASE and DOUBAO_IMAGE_MODEL):
        print("❌ Doubao API not configured.", file=sys.stderr)
        return None

    # 简洁风格后缀，避免提示过长
    if DOUBAO_IMAGE_STYLE == "comic":
        style_suffix = "warm picture-book illustration, clean background, gentle warm palette"
    else:
        style_suffix = "warm realistic photo style, natural lighting, clean composition"

    final_prompt = f"{image_desc}, {style_suffix}"
    words = final_prompt.split()
    if len(words) > 600:
        final_prompt = " ".join(words[:600])

    url = f"{DOUBAO_API_BASE}/images/generations"
    headers = {
        "Authorization": f"Bearer {DOUBAO_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": DOUBAO_IMAGE_MODEL,
        "prompt": final_prompt,
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "optimize_prompt_options": {"mode": "fast"}
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=90)
        resp.raise_for_status()
        data = resp.json()
        if 'data' in data and isinstance(data['data'], list) and data['data']:
            img_url = data['data'][0].get('url')
            if img_url:
                img_bytes = requests.get(img_url, timeout=30).content
                with open(output_path, 'wb') as f:
                    f.write(img_bytes)
                return output_path
        print("❌ Doubao response missing image URL", file=sys.stderr)
        return None
    except requests.exceptions.HTTPError as e:
        print(f"❌ Doubao HTTP error: {e}", file=sys.stderr)
        if e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"❌ Doubao image generation failed: {e}", file=sys.stderr)
        return None

def generate_images_batch(script_data, job_id):
    """
    使用豆包的组图生成功能,一次性生成所有场景图片(保证风格一致、人物一致)
    
    官方文档: https://www.volcengine.com/docs/82379/1824718
    功能: 组图生成 - 基于用户输入的文字和图片,生成一组内容关联的图像
    
    Args:
        script_data: DeepSeek 生成的完整脚本对象 {character_design, scenes, ...}
        job_id: 任务ID
    
    Returns:
        List[str]: 图片路径列表,失败返回 None
    """
    if not (DOUBAO_API_KEY and DOUBAO_API_BASE and DOUBAO_IMAGE_MODEL):
        print("❌ Doubao API not configured.", file=sys.stderr)
        return None

    scenes = script_data.get('scenes', [])
    character_design = script_data.get('character_design', '')
    
    if not scenes:
        print("❌ No scenes found in script_data", file=sys.stderr)
        return None

    # 1. 构建组图 prompt (关键: 先定义角色,再描述场景)
    if character_design:
        # 有角色设计 → 连环画模式
        character_prefix = (
            f"Main Character (MUST REMAIN IDENTICAL): {character_design}\n"
            "Global Visual Consistency:\n"
            "- Style: warm picture-book illustration, soft edges, clean backgrounds\n"
            "- Palette: gentle warm pastel (avoid neon)\n"
            "- Lighting: consistent morning natural diffuse light\n"
            "- Keep outfit, hair, facial proportions unchanged; no new accessories.\n\n"
        )
    else:
        # 无角色设计 → 普通组图模式
        character_prefix = "生成一组连贯的故事插画,风格保持一致。\n\n"
    
    # 2. 拼接所有场景描述(英文标签更利于风格控制)
    scene_prompts = []
    for i, scene in enumerate(scenes):
        image_desc = scene.get('image_desc') or scene.get('image_prompt') or ''
        scene_prompts.append(f"Image {i+1}: {image_desc}, no text, no watermark")
    
    combined_scenes = "\n".join(scene_prompts)
    
    # 3. 添加风格要求
    if DOUBAO_IMAGE_STYLE == "comic":
        style_suffix = (
            "\n\nNegative constraints: no logos, no distorted anatomy, no extra fingers, no surreal elements."
        )
    else:
        style_suffix = (
            "\n\nNegative constraints: no logos, no distorted anatomy, no extra fingers, no surreal elements."
        )
    
    final_prompt = character_prefix + combined_scenes + style_suffix
    
    # 4. 长度检查(豆包建议不超过300汉字或600英文单词)
    words = final_prompt.split()
    if len(words) > 600:
        print(f"⚠️ Prompt too long ({len(words)} words), truncating to 600", file=sys.stderr)
        final_prompt = " ".join(words[:600])

    # 5. 调用豆包组图API
    url = f"{DOUBAO_API_BASE}/images/generations"
    headers = {
        "Authorization": f"Bearer {DOUBAO_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": DOUBAO_IMAGE_MODEL,
        "prompt": final_prompt,
        "sequential_image_generation": "auto",  # 启用连环画模式(关键!)
        "sequential_image_generation_options": {
            "max_images": len(scenes)  # 指定生成数量
        },
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "optimize_prompt_options": {
            "mode": "fast"  # 加速模式
        }
    }

    try:
        log_progress("generating_images", 25, f"Generating {len(scenes)} images in batch mode...")
        
        # 打印最终 prompt 用于调试(可选)
        print(f"DEBUG: Final prompt for Doubao:\n{final_prompt[:500]}...\n", file=sys.stderr)
        
        resp = requests.post(url, headers=headers, json=payload, timeout=180)  # 组图耗时更长
        resp.raise_for_status()
        data = resp.json()

        # 6. 解析返回的多张图片
        if 'data' not in data or not isinstance(data['data'], list):
            print(f"❌ Invalid response format: {data}", file=sys.stderr)
            return None
        
        image_paths = []
        for i, img_data in enumerate(data['data']):
            img_url = img_data.get('url')
            if not img_url:
                print(f"❌ Missing URL for image {i+1}", file=sys.stderr)
                continue
                
            # 下载并保存
            output_filename = f"{job_id}_scene_{i}.jpg"
            output_path = os.path.join(DIRS["image"], output_filename)
            
            img_bytes = requests.get(img_url, timeout=30).content
            with open(output_path, 'wb') as f:
                f.write(img_bytes)
            
            image_paths.append(output_path)
            log_progress("image_downloaded", 30 + int((i / len(scenes)) * 30), 
                        f"Downloaded image {i+1}/{len(scenes)}")
        
        if len(image_paths) != len(scenes):
            print(f"⚠️ Expected {len(scenes)} images, got {len(image_paths)}", file=sys.stderr)
        
        return image_paths
        
    except requests.exceptions.Timeout:
        print("❌ Doubao API timeout (batch generation takes longer)", file=sys.stderr)
        return None
    except requests.exceptions.HTTPError as e:
        print(f"❌ Doubao HTTP error: {e}", file=sys.stderr)
        print(f"Response: {e.response.text}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"❌ Batch image generation failed: {e}", file=sys.stderr)
        return None

def draw_text_with_stroke(draw, text, x, y, font, text_color, stroke_color, stroke_width):
    # Draw stroke
    for adj_x in range(-stroke_width, stroke_width+1):
        for adj_y in range(-stroke_width, stroke_width+1):
            draw.text((x+adj_x, y+adj_y), text, font=font, fill=stroke_color)
    # Draw text
    draw.text((x, y), text, font=font, fill=text_color)

def load_font(fontsize=40):
    try:
        if os.path.exists(FONT_PATH) or FONT_PATH == "arial.ttf":
             return ImageFont.truetype(FONT_PATH, fontsize)
        else:
             return ImageFont.load_default()
    except Exception as e:
        print(f"DEBUG: Font loading failed: {e}", file=sys.stderr)
        return ImageFont.load_default()

def split_text_smartly(text, max_chars=45):
    """Split text into chunks that fit within max_chars, respecting word boundaries."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_len = 0
    
    for word in words:
        # +1 for space
        word_len = len(word)
        if current_len + word_len + 1 > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_len = word_len
        else:
            current_chunk.append(word)
            current_len += word_len + 1
            
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def create_static_subtitle_clip(text, translation, duration, video_size, font):
    """Create a single static subtitle clip with dual languages."""
    width, height = video_size
    
    # Font sizes
    en_fontsize = 38
    cn_fontsize = 28
    
    # Load fonts (reuse same font file but different sizes)
    en_font = font # Already loaded with default size, but we might need to reload for specific sizes if PIL doesn't support scaling
    # Actually PIL ImageFont.truetype loads a specific size. We need to load two fonts.
    try:
        en_font = ImageFont.truetype(FONT_PATH, en_fontsize)
        cn_font = ImageFont.truetype(FONT_PATH, cn_fontsize)
    except:
        en_font = ImageFont.load_default()
        cn_font = ImageFont.load_default()

    # Calculate strip height
    padding = 10
    line_spacing = 10
    strip_height = en_fontsize + line_spacing + cn_fontsize + (padding * 2)
    
    img = Image.new('RGBA', (width, strip_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Draw English Text (Top)
    try:
        if hasattr(draw, 'textlength'):
            en_width = draw.textlength(text, font=en_font)
        else:
            en_width, _ = draw.textsize(text, font=en_font)
    except:
        en_width = len(text) * 20

    en_x = (width - en_width) / 2
    en_y = padding
    
    draw_text_with_stroke(draw, text, en_x, en_y, en_font, 'white', 'black', 2)
    
    # 2. Draw Chinese Translation (Bottom)
    if translation:
        # First split by sentence-ending punctuation (。！？)
        # This ensures natural sentence breaks
        sentence_pattern = r'[。！？]+'
        sentences = re.split(f'({sentence_pattern})', translation)
        
        # Reconstruct sentences with their punctuation
        full_sentences = []
        for i in range(0, len(sentences), 2):
            if i < len(sentences):
                sent = sentences[i]
                if i + 1 < len(sentences):
                    sent += sentences[i + 1]  # Add punctuation back
                if sent.strip():
                    full_sentences.append(sent.strip())
        
        # If no sentence breaks found, use the whole translation
        if not full_sentences:
            full_sentences = [translation]
        
        # Now wrap each sentence if it's too long
        max_cn_width = width - 200
        cn_lines = []
        
        for sentence in full_sentences:
            current_cn_line = ""
            
            for char in sentence:
                test_line = current_cn_line + char
                try:
                    if hasattr(draw, 'textlength'):
                        test_width = draw.textlength(test_line, font=cn_font)
                    else:
                        test_width, _ = draw.textsize(test_line, font=cn_font)
                except:
                    test_width = len(test_line) * 20
                
                # Split at comma if line is getting long (> 50% of max width)
                is_comma = char in "，,"
                if is_comma and test_width > (max_cn_width * 0.5):
                    cn_lines.append(test_line)
                    current_cn_line = ""
                elif test_width > max_cn_width:
                    # Force split if too long
                    if current_cn_line:
                        cn_lines.append(current_cn_line)
                    current_cn_line = char
                else:
                    current_cn_line = test_line
            
            # Add the remaining part of this sentence
            if current_cn_line:
                cn_lines.append(current_cn_line)
            
        # Redraw image with adjusted height if we have multiple lines
        if len(cn_lines) > 1:
            strip_height += (len(cn_lines) - 1) * (cn_fontsize + 5)
            img = Image.new('RGBA', (width, strip_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            # Redraw English
            draw_text_with_stroke(draw, text, en_x, en_y, en_font, 'white', 'black', 2)
            
        # Draw Chinese lines
        current_y = en_y + en_fontsize + line_spacing
        for line in cn_lines:
            try:
                if hasattr(draw, 'textlength'):
                    line_width = draw.textlength(line, font=cn_font)
                else:
                    line_width, _ = draw.textsize(line, font=cn_font)
            except:
                line_width = len(line) * 20
                
            line_x = (width - line_width) / 2
            draw_text_with_stroke(draw, line, line_x, current_y, cn_font, '#FFD700', 'black', 1)
            current_y += cn_fontsize + 5

    clip = ImageClip(np.array(img)).set_duration(duration)
    # Position: Bottom centered with some margin
    clip = clip.set_position(('center', height - strip_height - 30))
    return clip

def split_text_smartly(text, max_chars=45):
    """
    Split text into chunks, respecting sentence boundaries first, then clauses, then words.
    Ensures no chunk ends with the start of a new sentence.
    """
    # 1. Split by sentence endings (. ? !)
    # Lookbehind ensures we keep the punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    final_chunks = []
    
    for sentence in sentences:
        if not sentence.strip(): continue
        
        if len(sentence) <= max_chars:
            final_chunks.append(sentence)
        else:
            # 2. Split by clauses (, ; :)
            clauses = re.split(r'(?<=[,;:])\s+', sentence)
            current_chunk = []
            current_len = 0
            
            for clause in clauses:
                clause = clause.strip()
                if not clause: continue
                
                # Check if adding this clause exceeds max
                if current_len + len(clause) + 1 > max_chars and current_chunk:
                    final_chunks.append(" ".join(current_chunk))
                    current_chunk = [clause]
                    current_len = len(clause)
                else:
                    current_chunk.append(clause)
                    current_len += len(clause) + 1
            
            if current_chunk:
                # Process the last accumulated chunk(s)
                # If it's still too long (e.g. a very long clause without commas), force split by words
                remaining_text = " ".join(current_chunk)
                if len(remaining_text) > max_chars:
                     words = remaining_text.split()
                     sub_chunk = []
                     sub_len = 0
                     for word in words:
                         if sub_len + len(word) + 1 > max_chars and sub_chunk:
                             final_chunks.append(" ".join(sub_chunk))
                             sub_chunk = [word]
                             sub_len = len(word)
                         else:
                             sub_chunk.append(word)
                             sub_len += len(word) + 1
                     if sub_chunk:
                         final_chunks.append(" ".join(sub_chunk))
                else:
                    final_chunks.append(remaining_text)
                    
    return final_chunks

def create_subtitle_clip(text, translation, duration, video_size=(720, 1280)):
    width, height = video_size
    
    # 1. Smart Sentence Alignment
    # Split English into sentences
    eng_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    
    # Split Chinese into sentences (using Chinese punctuation)
    # Note: Chinese punctuation might be full-width
    cn_sentences = [s.strip() for s in re.split(r'(?<=[。！？])', translation) if s.strip()]
    
    # Fallback: If counts don't match, treat as one big block
    if len(eng_sentences) != len(cn_sentences):
        # print(f"DEBUG: Sentence count mismatch. Eng: {len(eng_sentences)}, Cn: {len(cn_sentences)}")
        eng_sentences = [text]
        cn_sentences = [translation]
        
    # 2. Process each aligned sentence pair
    clips = []
    start_time = 0
    
    # Calculate total characters for proportional duration
    total_chars = sum(len(s) for s in eng_sentences)
    if total_chars == 0: total_chars = 1
    
    font = load_font(40) 
    
    for i, eng_sent in enumerate(eng_sentences):
        cn_sent = cn_sentences[i] if i < len(cn_sentences) else ""
        
        # Calculate duration for this sentence
        sent_duration = duration * (len(eng_sent) / total_chars)
        
        # Further split this sentence if it's too long
        chunks = split_text_smartly(eng_sent, max_chars=38)
        
        if not chunks: continue
        
        # Allocate duration for chunks within this sentence
        sent_total_chars = sum(len(c) for c in chunks)
        if sent_total_chars == 0: sent_total_chars = 1
        
        chunk_start_time = start_time
        
        for j, chunk in enumerate(chunks):
            chunk_duration = sent_duration * (len(chunk) / sent_total_chars)
            
            # Minimum duration check (0.8s)
            if chunk_duration < 0.8 and sent_duration > len(chunks):
                chunk_duration = 0.8
            
            # Adjust last chunk of the sentence to fill remaining time
            if j == len(chunks) - 1:
                chunk_duration = (start_time + sent_duration) - chunk_start_time
                if chunk_duration < 0: chunk_duration = 0
            
            # Create clip with aligned Chinese
            clip = create_static_subtitle_clip(chunk, cn_sent, chunk_duration, video_size, font)
            clip = clip.set_start(chunk_start_time)
            clips.append(clip)
            
            chunk_start_time += chunk_duration
            
        start_time += sent_duration
        
    return CompositeVideoClip(clips, size=video_size)

def create_video_segment(image_path, audio_path, text_content, translation=""):
    """创建单个视频片段 (带 Ken Burns 效果和字幕)"""
    try:
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration + 0.5 
        
        img_clip = ImageClip(image_path).set_duration(duration)
        
        # 视频尺寸配置 (竖屏 9:16，完美适配豆包 2048x2048 正方形图片)
        video_width = 720
        video_height = 1280
        
        # 智能调整图片尺寸以填充画布（避免黑边）
        # 豆包图片是 2048x2048，缩放到宽度 720 时高度也是 720
        # 为了填满 1280 高度，需要缩放到高度 1280
        img_clip = img_clip.resize(height=video_height)
        
        # Ken Burns 效果 (温和的缩放，从 1.0 到 1.15，避免过度裁切)
        zoom_direction = random.choice(['in', 'out'])
        
        def zoom_in(t):
            return 1 + 0.03 * t  # 缩小幅度：从 0.04 改为 0.03
            
        def zoom_out(t):
            return 1.15 - 0.03 * t  # 初始缩放从 1.2 改为 1.15

        zoom_func = zoom_in if zoom_direction == 'in' else zoom_out
        
        if zoom_direction == 'out':
            img_clip = img_clip.resize(1.15)  # 从 1.2 改为 1.15
            
        zoomed_clip = img_clip.resize(zoom_func).set_position(('center', 'center'))
        
        # 添加字幕 (使用 PIL 替代 TextClip 以避免 ImageMagick 依赖)
        try:
            txt_clip = create_subtitle_clip(text_content, translation, duration, video_size=(video_width, video_height))
            final_clip = CompositeVideoClip([zoomed_clip, txt_clip], size=(video_width, video_height))
        except Exception as e:
            print(f"⚠️ Subtitle generation failed: {e}. Skipping subtitles.", file=sys.stderr)
            final_clip = CompositeVideoClip([zoomed_clip], size=(video_width, video_height))

        final_clip = final_clip.set_audio(audio_clip)
        
        return final_clip
    except Exception as e:
        print(f"❌ Error creating segment: {e}", file=sys.stderr)
        return None

def upload_to_cos(local_path, cos_path):
    """Upload file to Tencent Cloud COS"""
    if not (COS_SECRET_ID and COS_SECRET_KEY and COS_BUCKET_NAME):
        print("⚠️ COS credentials not configured. Skipping upload.", file=sys.stderr)
        return None

    try:
        config = CosConfig(Region=COS_REGION, SecretId=COS_SECRET_ID, SecretKey=COS_SECRET_KEY)
        client = CosS3Client(config)
        
        log_progress("uploading", 90, f"Uploading to COS: {cos_path}")
        
        response = client.upload_file(
            Bucket=COS_BUCKET_NAME,
            LocalFilePath=local_path,
            Key=cos_path,
            EnableMD5=False
        )
        
        # Construct URL
        url = f"https://{COS_BUCKET_NAME}.cos.{COS_REGION}.myqcloud.com/{cos_path}"
        return url
    except Exception as e:
        print(f"❌ COS Upload failed: {e}", file=sys.stderr)
        return None

async def main():
    parser = argparse.ArgumentParser(description='Generate daily vocabulary video.')
    parser.add_argument('--words', type=str, required=True, help='JSON string of words list [{"word": "x", "meaning": "y"}]')
    parser.add_argument('--jobId', type=str, required=True, help='Unique Job ID')
    parser.add_argument('--style', type=str, default='mystery', help='Video style')
    
    args = parser.parse_args()
    
    try:
        # Fix for Windows cmd quoting issues:
        # If the string starts with a single quote (which cmd might pass through), strip it.
        # Also handle potential double-quote escaping issues.
        raw_words = args.words.strip("'")
        words_data = json.loads(raw_words)
    except json.JSONDecodeError as e:
        log_progress("error", 0, f"Invalid JSON format for --words: {str(e)}. Raw input: {args.words}")
        sys.exit(1)

    job_id = args.jobId
    log_progress("started", 0, f"Starting video generation for Job {job_id}")
    
    # 1. 生成分镜脚本(包含角色设计)
    script_data = await generate_script(words_data)
    if not script_data:
        log_progress("failed", 0, "Failed to generate script")
        sys.exit(1)
    
    scenes = script_data.get('scenes', [])
    if not scenes:
        log_progress("failed", 0, "No scenes found in script")
        sys.exit(1)
    
    # 2. 批量生成所有图片 (使用组图API,保证风格一致)
    image_paths = generate_images_batch(script_data, job_id)  # 传入完整的 script_data
    if not image_paths or len(image_paths) < len(scenes):
        # 批量生成不足时,降级为逐张补齐以不中断流程
        have = len(image_paths) if image_paths else 0
        log_progress("warning", 40, f"Batch returned {have}/{len(scenes)} images. Falling back to single-image generation for remaining scenes.")
        if not image_paths:
            image_paths = []
        # 逐张补齐缺失的图片
        for i in range(have, len(scenes)):
            image_desc = scenes[i].get('image_desc') or scenes[i].get('image_prompt') or ''
            single_path = generate_image(image_desc, f"{job_id}_scene_{i}.jpg")
            if single_path:
                image_paths.append(single_path)
                log_progress("image_downloaded", 45 + int((i / len(scenes)) * 10), f"Downloaded fallback image {i+1}/{len(scenes)}")
            else:
                log_progress("error", 0, f"Fallback image generation failed for scene {i+1}")
        # 最终仍不足则失败
        if len(image_paths) < len(scenes):
            log_progress("failed", 0, f"Image generation failed after fallback. Expected {len(scenes)}, got {len(image_paths)}")
            sys.exit(1)
    
    log_progress("images_generated", 60, f"All {len(image_paths)} images generated successfully")
    
    # 3. 并行生成所有音频
    log_progress("generating_audio", 60, f"Generating audio for {len(scenes)} scenes in parallel...")
    
    audio_tasks = []
    for i, scene in enumerate(scenes):
        audio_filename = f"{job_id}_audio_{i}.mp3"
        audio_tasks.append(generate_audio(scene['text'], audio_filename))
    
    # 并发执行所有音频生成任务
    audio_paths = await asyncio.gather(*audio_tasks)
    
    # 4. 组装视频片段
    video_clips = []
    total_scenes = len(scenes)
    
    for i, scene in enumerate(scenes):
        progress = 70 + int((i / total_scenes) * 10) # 70% -> 80%
        log_progress("processing_scene", progress, f"Compositing Scene {i+1}/{total_scenes}")
        
        audio_path = audio_paths[i]
        if not audio_path: 
            print(f"⚠️ Audio generation failed for scene {i+1}, skipping", file=sys.stderr)
            continue
        
        # 使用批量生成的图片
        image_path = image_paths[i] if i < len(image_paths) else None
        if not image_path:
            print(f"⚠️ No image available for scene {i+1}, skipping", file=sys.stderr)
            continue
        
        # 创建片段 (传入文本用于字幕)
        # 兼容旧版 JSON (如果没有 translation 字段)
        translation = scene.get('translation', '')
        clip = create_video_segment(image_path, audio_path, scene['text'], translation)
        if clip:
            video_clips.append(clip)
            
    if video_clips:
        log_progress("stitching", 80, "Stitching all scenes together...")
        
        try:
            final_video = concatenate_videoclips(video_clips, method="compose")
            
            output_filename = f"daily_video_{job_id}.mp4"
            output_path = os.path.join(DIRS["video"], output_filename)
            
            # 使用临时文件避免写入冲突
            temp_output = os.path.join(DIRS["temp"], f"temp_{job_id}.mp4")
            
            final_video.write_videofile(
                temp_output, 
                fps=24, 
                codec='libx264', 
                audio_codec='libmp3lame',
                remove_temp=True,
                verbose=False,
                logger=None # Disable moviepy logger to keep stdout clean for JSON
            )
            
            # 移动到最终位置
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(temp_output, output_path)
            
            # 计算相对路径 (相对于 RG_data)
            relative_path = os.path.relpath(output_path, os.path.dirname(STORAGE_PATH))
            
            final_result = {
                "video_path": output_path,
                "relative_path": relative_path,
                "filename": output_filename
            }

            # COS Upload Logic
            if COS_UPLOAD_ENABLED:
                # Define COS path (e.g., videos/daily/filename.mp4)
                cos_key = f"videos/daily/{output_filename}"
                cos_url = upload_to_cos(output_path, cos_key)
                
                if cos_url:
                    final_result["cos_url"] = cos_url
                    final_result["video_url"] = cos_url # Unified URL field
                    
                    # Optional: Delete local file after successful upload
                    # For now, we keep it unless explicitly told to delete, 
                    # but the requirement says "delete local files".
                    # Let's assume we delete it if upload is successful to save space in container.
                    try:
                        os.remove(output_path)
                        final_result["local_deleted"] = True
                        # Also try to clean up audio/images if needed, but maybe keep them for debug?
                        # For now just delete the large video file.
                    except Exception as e:
                        print(f"⚠️ Failed to delete local file: {e}", file=sys.stderr)
            
            log_progress("completed", 100, "Video generation completed", final_result)
            
        except Exception as e:
            log_progress("error", 80, f"Error stitching video: {e}")
            sys.exit(1)
            
    else:
        log_progress("failed", 0, "Failed to generate any video clips.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
