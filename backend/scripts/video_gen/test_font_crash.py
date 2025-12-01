import sys
import os
from PIL import Image, ImageDraw, ImageFont

def test_font(font_name, font_path):
    print(f"Testing font: {font_name} at {font_path}...")
    try:
        img = Image.new('RGB', (500, 100), color='black')
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(font_path, 40)
        draw.text((10, 10), "Hello World 你好", font=font, fill='white')
        print(f"✅ Success: {font_name}")
        return True
    except Exception as e:
        print(f"❌ Failed: {font_name} - {e}")
        return False

fonts_to_test = [
    ("SimHei", "C:/Windows/Fonts/simhei.ttf"), # Crashed
    ("Microsoft YaHei", "C:/Windows/Fonts/msyh.ttc"),
    ("Microsoft YaHei (TTF)", "C:/Windows/Fonts/msyh.ttf"),
    ("Arial", "C:/Windows/Fonts/arial.ttf"),
    ("Verdana", "C:/Windows/Fonts/verdana.ttf"),
    ("Tahoma", "C:/Windows/Fonts/tahoma.ttf"),
    ("Segoe UI", "C:/Windows/Fonts/segoeui.ttf"),
]

success_count = 0
for name, path in fonts_to_test:
    if os.path.exists(path):
        if test_font(name, path):
            success_count += 1
    else:
        print(f"⚠️ Skipped: {name} (File not found)")

print(f"Test complete. {success_count} fonts working.")
