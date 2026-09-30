from pathlib import Path
import cv2
from PIL import Image, ImageDraw

SOURCE = r'C:/Users/aaa/Documents/xwechat_files/wxid_eh61wk0vv6g322_1c2b/msg/video/2026-09/c5e4a30bbf2dcb535aa43931c6c77019.mp4'
OUT = Path(__file__).resolve().parents[1] / 'reference'
OUT.mkdir(exist_ok=True)
cap = cv2.VideoCapture(SOURCE)
fps = cap.get(cv2.CAP_PROP_FPS)
duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps
print({'fps': fps, 'duration': duration, 'width': cap.get(3), 'height': cap.get(4)})
frames = []
for t in range(0, int(duration), 4):
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, bgr = cap.read()
    if not ok: continue
    img = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    img.save(OUT / f'frame-{t:03}.jpg')
    img.thumbnail((205, 350))
    tile = Image.new('RGB', (215, 380), '#eeeeee')
    tile.paste(img, ((215-img.width)//2, 25))
    ImageDraw.Draw(tile).text((8, 5), f'{t}s', fill='black')
    frames.append(tile)
for index in range(0, len(frames), 24):
    group = frames[index:index+24]
    sheet = Image.new('RGB', (215*8, 380*((len(group)+7)//8)), 'white')
    for j, tile in enumerate(group): sheet.paste(tile, ((j%8)*215, (j//8)*380))
    path = OUT / f'contact-{index//24}.jpg'
    sheet.save(path)
    print(path)
