import os
import math
from PIL import Image

def process_deity_image(input_path, output_paths):
    print(f"Processing: {input_path}")
    im = Image.open(input_path).convert("RGBA")
    w, h = im.size
    pixels = im.load()
    
    cx = w / 2.0
    cy = h * 0.48
    rx = w * 0.47
    ry = h * 0.48

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Normalized elliptical distance from center
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            dist = math.sqrt(dx * dx + dy * dy)
            
            # Feather from 0.70 to 0.96
            if dist <= 0.68:
                alpha = 255
            elif dist >= 0.98:
                alpha = 0
            else:
                ratio = (dist - 0.68) / (0.98 - 0.68)
                # smooth cosine falloff
                factor = 0.5 * (1.0 + math.cos(ratio * math.pi))
                alpha = int(255 * factor)
                
            pixels[x, y] = (r, g, b, min(a, alpha))
            
    for out in output_paths:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, "PNG")
        print(f"Saved: {out} ({w}x{h})")

if __name__ == "__main__":
    p_quanam = r"C:\Users\830g7\.gemini\antigravity\brain\80f7d41a-6466-43d6-b0bb-d1c94b952809\quan_am_bo_tat_1793632244770.jpg"
    p_thichca = r"C:\Users\830g7\.gemini\antigravity\brain\80f7d41a-6466-43d6-b0bb-d1c94b952809\phat_thich_ca_1793632277824.jpg"
    
    out_quanam = [
        r"d:\Source\AI\lephat\src\Temple.Client\public\assets\quan_am_cloud.png",
        r"d:\Source\AI\lephat\src\Temple.Client\src\assets\quan_am_cloud.png"
    ]
    out_thichca = [
        r"d:\Source\AI\lephat\src\Temple.Client\public\assets\phat_thich_ca_cloud.png",
        r"d:\Source\AI\lephat\src\Temple.Client\src\assets\phat_thich_ca_cloud.png"
    ]
    
    process_deity_image(p_quanam, out_quanam)
    process_deity_image(p_thichca, out_thichca)
    print("Done generating feathered cloud PNGs!")

