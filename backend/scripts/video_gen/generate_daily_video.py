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

API_KEY = os.getenv("SILICONFLOW_API_KEY") or os.getenv("AI_API_KEY")
if not API_KEY:
    print(json.dumps({"status": "error", "message": "SILICONFLOW_API_KEY or AI_API_KEY not found in .env file"}))
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
    """使用 LLM 生成包含单词的短故事和分镜描述"""
    words_str = ", ".join([f"{w['word']} ({w['meaning']})" for w in word_data])
    log_progress("generating_script", 10, f"Generating script for words: {words_str}")
    
    prompt = f"""
    You are a creative storyteller writing simple, engaging picture-book stories for vocabulary learning.
    Like a third-grader's "look at pictures and write" exercise, but here you "look at words and write a story."
    
    ═══════════════════════════════════════════════════════════════
    📝 YOUR TASK: Create a SMOOTH, FLOWING story (4-6 scenes) that teaches these vocabulary words:
    
    {words_str}
    
    ⚠️ CRITICAL: 
    - You MUST use ALL the words listed above in your story (these are today's learning words)
    - You CAN use other common words to build the story naturally (articles, verbs, adjectives, etc.)
    - The example words in the instructions below (FOOD_ITEM, COLOR_ADJ, etc.) are just PLACEHOLDERS for teaching purposes
    - Do NOT treat example placeholder words as today's learning words
    - Build your story around the actual words listed above: {words_str}
    ═══════════════════════════════════════════════════════════════
    
    STEP 1 - Find the "Anchor Word" (MOST IMPORTANT):
    - Identify the most CONCRETE, SPECIFIC noun in YOUR word list
    - Concrete nouns: 物体 (WORD_A, WORD_B, WORD_C), 地点 (PLACE_X, PLACE_Y), 动物 (ANIMAL_1, ANIMAL_2)
    - Abstract words: 形容词/副词 (ADJ_1, ADV_1, ADJ_2), 概念 (CONCEPT_A, CONCEPT_B)
    - The ANCHOR WORD determines the scene - other words fill in details
    
    Example Logic (with placeholder words):
    - If your list has: [CONCRETE_NOUN, ADJ_1, ADJ_2, VERB_1] → Anchor: CONCRETE_NOUN → Scene built around it
    - If your list has: [PLACE_NAME, ACTION_1, ADJ_1, ADJ_2] → Anchor: PLACE_NAME → Scene at that location
    - If your list has: [ADJ_1, VERB_1, ADJ_2, NOUN_1] → Anchor: NOUN_1 (most specific object)
    
    STEP 2 - Build Theme Around Anchor:
    - If anchor is a FOOD → Theme: Cooking, Gardening, or Market
    - If anchor is a PLACE → Theme: Activities at that location
    - If anchor is an ANIMAL → Theme: Nature, Farm, or Pet care
    - If anchor is a TOOL/OBJECT → Theme: Using that object
    - Let the anchor word naturally guide ALL other words into the story
    
    STEP 3 - Pick Story Genre:
    - 🌱 Nature: gardening, outdoor activities, animals (peaceful, educational)
    - 🎨 Daily Life: cooking, hobbies, family time, shopping, crafts
    - 🌍 Travel/Adventure: exploring new places, discovering things (bright, fun, NOT dangerous)
    - 📚 School Life: students learning, studying, making friends
    - ✨ Fairy Tale: magical but gentle stories (kind wizards, helpful animals, NOT scary)
    
    CRITICAL Rules:
    
    1. Story MUST Flow Naturally:
       - Think: "What happens next?" after each scene
       - Each scene connects to the previous one through action, location, or time
       - Use transition words/ideas: "Then...", "After that...", "Meanwhile...", "Later..."
       - Example flow: "Character enters location → Character does action → Character experiences result → Character completes task → Happy ending"
       - Use emotional/time transitions: "Feeling happy, she...", "After finishing, he...", "Later that day..."
       - NOT abrupt jumps: "Student studies → (suddenly) Having lunch" (Missing: what triggered the transition?)
    
    2. Use ALL Words Naturally:
       - MUST use every single word from TODAY'S LIST: {words_str}
       - You can use other common words (the, a, was, walked, beautiful, etc.) to make the story flow naturally
       - The chosen theme should make today's vocabulary words fit naturally into the story
       - If a word feels forced, reconsider your theme choice
       - Think: "Does this word belong in this setting?" If yes, the theme is right
       - Choose scenes where today's vocabulary words naturally appear together
    
    3. Appropriate Content:
       - YES: Bright, warm, positive, educational, gentle, encouraging
       - NO: Dark, scary, violent, tense, mysterious, negative
       - If fantasy: use kind magic, helpful creatures, happy endings
       - Keep it safe and uplifting for all ages
    
    4. Visual Style:
       - Consistent main character throughout (describe appearance once)
       - Similar time of day and lighting (don't jump from day to night)
       - Connected locations (e.g., kitchen → dining room OK; kitchen → jungle NOT OK)
       - ALWAYS specify: "bright lighting, warm atmosphere, photorealistic, 4k"
    
    5. Sentence Structure:
       - Simple, clear sentences (8-15 words)
       - One main idea per sentence
       - Can combine two related ideas with connecting words
       - Like reading a picture book: short, vivid, concrete descriptions
       - Use emotional/time transitions to connect scenes: "Feeling happy, she...", "After finishing, he...", "Later that day..."
    
    6. Output Format:
       - "text": One clear English sentence per scene
       - "translation": Natural Chinese translation (use 。！？ for sentence endings)
    
    ═══════════════════════════════════════════════════════════════
    Example - The Power of Anchor Words (DEMONSTRATION ONLY - NOT your actual task):
    
    Suppose you received: [FOOD_ITEM, COLOR_ADJ, DIRECTION_ADV, ABSTRACT_NOUN_1, ABSTRACT_NOUN_2, QUALITY_NOUN]
    
    Step 1 - Find Anchor:
    - FOOD_ITEM = CONCRETE OBJECT (食物/植物) ✅ ANCHOR
    - COLOR_ADJ, DIRECTION_ADV, ABSTRACT_NOUN_1, ABSTRACT_NOUN_2, QUALITY_NOUN = ABSTRACT
    
    Step 2 - Build Theme:
    - FOOD_ITEM → Gardening or Cooking
    - Choose: Gardening
    
    ✅ EXCELLENT Story (Anchor-driven):
    Scene 1: "Character walked into garden, excited to check FOOD_ITEM plants."
    Scene 2: "A COLOR_ADJ creature appeared, ABSTRACT_NOUN_1 that season arrived."
    Scene 3: "The creature moved DIRECTION_ADV across the garden."
    Scene 4: "Despite ABSTRACT_NOUN_2, the plants had one QUALITY_NOUN: perfection."
    Scene 5: "Character picked a FOOD_ITEM, proud of success."
    
    Why this works: Concrete anchor guides theme, abstract words support naturally.
    
    ❌ WEAK Story (Ignoring anchor):
    Scene 1: "Character studied with COLOR_ADJ notebook."
    Scene 2: "Faced ABSTRACT_NOUN_2 with problem."
    ...
    Scene 5: "At lunch, ate FOOD_ITEM." (forced, disconnected)
    
    Why this fails: Ignored concrete anchor, forced it in later.
    
    🎯 Key Principle: CONCRETE NOUNS > ABSTRACT WORDS
    Let specific objects guide the scene, let abstract words fill the details.
    ═══════════════════════════════════════════════════════════════
    
    ⚠️ FINAL REMINDER: 
    - The example above uses PLACEHOLDER words (FOOD_ITEM, COLOR_ADJ, etc.) for TEACHING purposes only
    - Your actual task is to create a story featuring TODAY'S VOCABULARY: {words_str}
    - Use other common English words freely to build natural, flowing sentences
    - The goal: Make today's vocabulary words shine in a coherent, engaging story
    
    JSON Output:
    {{
        "scenes": [
            {{
                "text": "Simple sentence with natural word usage.",
                "translation": "简单自然的中文翻译。",
                "image_prompt": "Character doing action in setting, bright natural lighting, warm atmosphere, photorealistic, 4k"
            }}
        ]
    }}
    """

    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "Qwen/Qwen2.5-7B-Instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        parsed = json.loads(content)
        
        log_progress("script_generated", 20, f"Script generated: {len(parsed['scenes'])} scenes.")
        return parsed['scenes']
    except Exception as e:
        log_progress("error", 0, f"Error generating script: {e}")
        return None

async def generate_audio(text, output_filename):
    """使用 gTTS 生成语音 (Online) with pyttsx3 fallback"""
    # log_progress("generating_audio", 0, f"Generating audio for: {text[:20]}...") # Avoid spamming logs
    output_path = os.path.join(DIRS["audio"], output_filename)
    
    try:
        # 尝试 gTTS (Google TTS)
        tts = gTTS(text=text, lang='en', tld='us')
        tts.save(output_path)
        return output_path
    except Exception as e:
        print(f"❌ gTTS failed: {e}. Trying pyttsx3 fallback...", file=sys.stderr)
        
        try:
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.setProperty('volume', 0.9)
            
            voices = engine.getProperty('voices')
            for v in voices:
                if "zira" in v.name.lower() or "female" in v.name.lower():
                    engine.setProperty('voice', v.id)
                    break
            
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            return output_path
        except Exception as e2:
            print(f"❌ pyttsx3 failed: {e2}", file=sys.stderr)
            return None

def generate_image(prompt, output_filename):
    """使用 Flux.1 生成配图"""
    # log_progress("generating_image", 0, "Generating image...") # Avoid spamming logs
    output_path = os.path.join(DIRS["image"], output_filename)
    
    # 修复: 移除 "anatomically correct" 避免生成恐怖图片
    # 添加更明确的正向提示词确保图片温暖、友好、适合学习
    enhanced_prompt = f"bright sunny day, warm colors, friendly atmosphere, happy scene, {prompt}, educational children's book illustration style, colorful, cheerful, safe for all ages, high quality"

    url = "https://api.siliconflow.cn/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "black-forest-labs/FLUX.1-schnell", 
        "prompt": enhanced_prompt,
        "image_size": "1024x576", 
        "num_inference_steps": 4
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        image_url = result['data'][0]['url']
        
        img_data = requests.get(image_url).content
        with open(output_path, 'wb') as f:
            f.write(img_data)
            
        return output_path
    except Exception as e:
        print(f"❌ Error generating image: {e}", file=sys.stderr)
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
        # Try absolute path for Windows
        font_path = "C:/Windows/Fonts/simhei.ttf"
        if os.path.exists(font_path):
            return ImageFont.truetype(font_path, fontsize)
        else:
            # Try generic name
            return ImageFont.truetype("arial.ttf", fontsize)
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
        font_path = "C:/Windows/Fonts/simhei.ttf"
        if not os.path.exists(font_path): font_path = "arial.ttf"
        en_font = ImageFont.truetype(font_path, en_fontsize)
        cn_font = ImageFont.truetype(font_path, cn_fontsize)
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

def create_subtitle_clip(text, translation, duration, video_size=(1024, 576)):
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
        
        # Ken Burns 效果 (Zoom)
        zoom_direction = random.choice(['in', 'out'])
        
        def zoom_in(t):
            return 1 + 0.04 * t
            
        def zoom_out(t):
            return 1.2 - 0.04 * t

        zoom_func = zoom_in if zoom_direction == 'in' else zoom_out
        
        if zoom_direction == 'out':
            img_clip = img_clip.resize(1.2)
            
        zoomed_clip = img_clip.resize(zoom_func).set_position(('center', 'center'))
        
        # 添加字幕 (使用 PIL 替代 TextClip 以避免 ImageMagick 依赖)
        try:
            txt_clip = create_subtitle_clip(text_content, translation, duration, video_size=(1024, 576))
            final_clip = CompositeVideoClip([zoomed_clip, txt_clip], size=(1024, 576))
        except Exception as e:
            print(f"⚠️ Subtitle generation failed: {e}. Skipping subtitles.", file=sys.stderr)
            final_clip = CompositeVideoClip([zoomed_clip], size=(1024, 576))

        final_clip = final_clip.set_audio(audio_clip)
        
        return final_clip
    except Exception as e:
        print(f"❌ Error creating segment: {e}", file=sys.stderr)
        return None

async def main():
    parser = argparse.ArgumentParser(description='Generate daily vocabulary video.')
    parser.add_argument('--words', type=str, required=True, help='JSON string of words list [{"word": "x", "meaning": "y"}]')
    parser.add_argument('--jobId', type=str, required=True, help='Unique Job ID')
    parser.add_argument('--style', type=str, default='mystery', help='Video style')
    
    args = parser.parse_args()
    
    try:
        words_data = json.loads(args.words)
    except json.JSONDecodeError:
        log_progress("error", 0, "Invalid JSON format for --words")
        sys.exit(1)

    job_id = args.jobId
    log_progress("started", 0, f"Starting video generation for Job {job_id}")
    
    # 1. 生成分镜脚本
    scenes = await generate_script(words_data)
    if not scenes:
        log_progress("failed", 0, "Failed to generate script")
        sys.exit(1)
    
    video_clips = []
    total_scenes = len(scenes)
    
    for i, scene in enumerate(scenes):
        progress = 20 + int((i / total_scenes) * 60) # 20% -> 80%
        log_progress("processing_scene", progress, f"Processing Scene {i+1}/{total_scenes}")
        
        # 生成音频
        audio_filename = f"{job_id}_audio_{i}.mp3"
        audio_path = await generate_audio(scene['text'], audio_filename)
        if not audio_path: continue
        
        # 生成图片
        image_filename = f"{job_id}_scene_{i}.jpg"
        image_path = generate_image(scene['image_prompt'], image_filename)
        if not image_path: continue
        
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
            
            log_progress("completed", 100, "Video generation completed", {
                "video_path": output_path,
                "relative_path": relative_path,
                "filename": output_filename
            })
            
        except Exception as e:
            log_progress("error", 80, f"Error stitching video: {e}")
            sys.exit(1)
            
    else:
        log_progress("failed", 0, "Failed to generate any video clips.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
