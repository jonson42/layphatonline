import sys
from PIL import Image

def remove_white_bg(input_path, output_path, tolerance=30):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    
    # Sample corner pixels to find background color
    corners = [datas[0], datas[img.width - 1], datas[-1], datas[-img.width]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4
    
    for item in datas:
        r, g, b, a = item
        # Calculate distance to background color
        dist = ((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)**0.5
        if dist < tolerance:
            # Completely transparent
            newData.append((255, 255, 255, 0))
        elif dist < tolerance + 25:
            # Smooth feather alpha
            alpha = int(255 * (dist - tolerance) / 25)
            newData.append((r, g, b, alpha))
        else:
            newData.append((r, g, b, a))

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent PNG to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        remove_white_bg(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python make_transparent.py <input> <output>")

