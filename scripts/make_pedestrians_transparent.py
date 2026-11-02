import os
from PIL import Image
from collections import deque

IMAGE_JOBS = [
    (
        r"C:\Users\trinhquocnghiem\.gemini\antigravity\brain\700e0e0f-50fe-4a6d-9698-73f44f343dac\vietnamese_young_man_pixar_yellow_tshirt_1793592306921.jpg",
        r"D:\Peronal\TiktokLive\src\Temple.Client\src\assets\pedestrian_man_yellow.png",
        r"D:\Peronal\TiktokLive\src\Temple.Client\public\assets\pedestrian_man_yellow.png"
    ),
    (
        r"C:\Users\trinhquocnghiem\.gemini\antigravity\brain\700e0e0f-50fe-4a6d-9698-73f44f343dac\pixar_vietnamese_girl_walking_1793592316090.jpg",
        r"D:\Peronal\TiktokLive\src\Temple.Client\src\assets\pedestrian_girl_blue.png",
        r"D:\Peronal\TiktokLive\src\Temple.Client\public\assets\pedestrian_girl_blue.png"
    ),
    (
        r"C:\Users\trinhquocnghiem\.gemini\antigravity\brain\700e0e0f-50fe-4a6d-9698-73f44f343dac\vietnamese_man_pixar_walk_1793592328035.jpg",
        r"D:\Peronal\TiktokLive\src\Temple.Client\src\assets\pedestrian_man_orange.png",
        r"D:\Peronal\TiktokLive\src\Temple.Client\public\assets\pedestrian_man_orange.png"
    ),
    (
        r"C:\Users\trinhquocnghiem\.gemini\antigravity\brain\700e0e0f-50fe-4a6d-9698-73f44f343dac\vietnamese_pixar_woman_walking_1793592337253.jpg",
        r"D:\Peronal\TiktokLive\src\Temple.Client\src\assets\pedestrian_girl_purple.png",
        r"D:\Peronal\TiktokLive\src\Temple.Client\public\assets\pedestrian_girl_purple.png"
    )
]

def make_transparent(input_path, out_paths):
    print(f"Processing: {input_path}")
    im = Image.open(input_path).convert("RGBA")
    width, height = im.size
    pixels = im.load()

    # BFS from 4 corners to isolate pure white / light grey background
    visited = bytearray(width * height)
    queue = deque()

    def is_bg(r, g, b):
        return r >= 238 and g >= 238 and b >= 238

    for x in range(width):
        for y in [0, height - 1]:
            r, g, b, _ = pixels[x, y]
            if is_bg(r, g, b):
                queue.append((x, y))
                visited[y * width + x] = 1

    for y in range(height):
        for x in [0, width - 1]:
            idx = y * width + x
            if not visited[idx]:
                r, g, b, _ = pixels[x, y]
                if is_bg(r, g, b):
                    queue.append((x, y))
                    visited[idx] = 1

    while queue:
        cx, cy = queue.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height:
                nidx = ny * width + nx
                if not visited[nidx]:
                    nr, ng, nb, _ = pixels[nx, ny]
                    if is_bg(nr, ng, nb):
                        visited[nidx] = 1
                        queue.append((nx, ny))

    for y in range(height):
        for x in range(width):
            if visited[y * width + x]:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                # Feather near borders if almost white
                r, g, b, a = pixels[x, y]
                if r > 248 and g > 248 and b > 248:
                    has_bg_neighbor = False
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < width and 0 <= ny < height and visited[ny * width + nx]:
                            has_bg_neighbor = True
                            break
                    if has_bg_neighbor:
                        pixels[x, y] = (r, g, b, 70)

    # Auto crop bounding box
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p, "PNG")
        print(f"Saved: {p} size={im.size}")

for in_p, out1, out2 in IMAGE_JOBS:
    make_transparent(in_p, [out1, out2])
print("ALL DONE!")

