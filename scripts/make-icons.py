# Draws the Northbound PWA icons in public/: the two hemispheres with one line crossing the join to a station.
# Run from the project root: python scripts/make-icons.py
from PIL import Image, ImageDraw

SUN = (244, 182, 63)
ATLANTIC = (15, 82, 119)
INK = (22, 32, 43)
WHITE = (255, 255, 255)


def icon(size, radius=0.225, inset=0.0):
    scale = 4  # draw big, then shrink for smooth edges
    S = size * scale
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    art = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(art)
    d.rectangle([0, 0, S, S // 2], fill=SUN)
    d.rectangle([0, S // 2, S, S], fill=ATLANTIC)
    # Artwork drawn on a 120 grid, shrunk toward the centre for maskable icons.
    k = S / 120 * (1 - 2 * inset)
    o = S * inset

    def p(x, y):
        return (o + x * k, o + y * k)

    import math
    # Sample the line as points and stamp round dots along it, so the curves come out smooth.
    pts = [(34, y / 2) for y in range(-20, 93)]  # down to y=46
    pts += [(48 - 14 * math.cos(a / 40 * math.pi / 2), 46 + 14 * math.sin(a / 40 * math.pi / 2)) for a in range(41)]
    pts += [(48 + x / 4, 60) for x in range(49)]
    pts += [(60 + 14 * math.sin(a / 40 * math.pi / 2), 74 - 14 * math.cos(a / 40 * math.pi / 2)) for a in range(41)]
    pts += [(74, 74 + y / 2) for y in range(25)]
    half = 5.5 * k
    for x, y in pts:
        cx, cy = p(x, y)
        d.ellipse([cx - half, cy - half, cx + half, cy + half], fill=INK)
    r = 11 * k
    cx, cy = p(74, 90)
    d.ellipse([cx - r - 3 * k, cy - r - 3 * k, cx + r + 3 * k, cy + r + 3 * k], fill=INK)
    d.ellipse([cx - r + 3 * k, cy - r + 3 * k, cx + r - 3 * k, cy + r - 3 * k], fill=WHITE)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=255)
    img.paste(art, (0, 0), mask)
    return img.resize((size, size), Image.LANCZOS)


icon(192).save('public/icon-192.png')
icon(512).save('public/icon-512.png')
icon(512, radius=0, inset=0.1).save('public/icon-512-maskable.png')
icon(180, radius=0).save('public/apple-touch-icon.png')
print('icons written')
