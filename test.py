from PIL import Image

# Load the image
img = Image.open(r'C:\Users\owner\Desktop\2025\Good Tenant\upward\image.png').convert("RGBA")

# Create a square canvas (ensure it's square)
size = 432
canvas = Image.new("RGBA", (size, size), (0,0,0,0))

# Resize original image to ~70%
scale = 0.7
new_size = int(size * scale)
resized = img.resize((new_size, new_size), Image.LANCZOS)

# Center it
offset = ((size - new_size)//2, (size - new_size)//2)
canvas.paste(resized, offset, resized)

# Save foreground (transparent)
fg_path = "ic_foreground.png"
canvas.save(fg_path)

# Create background (solid orange from original)
# sample pixel
bg_color = img.getpixel((10,10))[:3]
bg = Image.new("RGB", (size, size), bg_color)
bg_path = "ic_background.png"
bg.save(bg_path)

fg_path, bg_path