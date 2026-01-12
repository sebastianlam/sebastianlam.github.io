from PIL import Image, ImageOps
import os

input_path = "/Users/jimlam/sebastianlam.github.io/src/assets/image.png"
output_path = "/Users/jimlam/sebastianlam.github.io/public/root-node.png"

# Load image
img = Image.open(input_path).convert("RGBA")

# Separate channels
r, g, b, a = img.split()
rgb = Image.merge("RGB", (r, g, b))

# 1. Invert colors (as requested)
inverted_rgb = ImageOps.invert(rgb)

# 2. Make black/dark areas transparent
# Since the original image had a black background, 
# and the user wants the black areas transparent, 
# we should use the original image's brightness as the alpha channel.
# However, if we invert first, the "black/dark areas" might refer to the 
# dark areas of the original image (the background).
alpha = rgb.convert("L")

# Create final image: Inverted colors with the background removed
final_img = Image.merge("RGBA", (*inverted_rgb.split(), alpha))

# Save the result
final_img.save(output_path)
print(f"Processed image saved to {output_path}")
