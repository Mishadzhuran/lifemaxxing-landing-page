from PIL import Image, ImageDraw, ImageFont
import glob, os

ASSETS = "/Users/mishadzhuran/My projects/lifemaxxing-landing-page/assets"
S = 4                      # supersample factor
W, STRIP_H = 1320, 173     # repainted strip (status bar area)
INK = (0, 0, 0, 255)

def rr(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)

def build_overlay():
    """Transparent RGBA overlay with all status elements, at 4x then downscaled."""
    ov = Image.new("RGBA", (W*S, STRIP_H*S), (0,0,0,0))
    d = ImageDraw.Draw(ov)

    # --- Dynamic Island pill: x 472-847, y 42-151 ---
    rr(d, (472*S, 42*S, 847*S, 151*S), r=54.5*S, fill=INK)
    # --- Time "9:41" — digits cap y 76..119 (h 44), centered at x=250 ---
    target_h = 44*S
    size = 248
    font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", size)
    font.set_variation_by_name("Semibold")
    l,t,r_,b = font.getbbox("9:41")
    size = round(size * target_h / (b - t))
    font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", size)
    font.set_variation_by_name("Semibold")
    l,t,r_,b = font.getbbox("9:41")
    x = 250*S - (l + r_)//2
    y = 76*S - t
    d.text((x, y), "9:41", font=font, fill=INK)

    # --- Signal bars: centers 942/960/978/996, w 12, bottom 117 ---
    for cx, h in zip((942, 960, 978, 996), (16, 22, 29, 36)):
        rr(d, ((cx-6)*S, (117-h)*S, (cx+6)*S, 117*S), r=3.5*S, fill=INK)

    # --- WiFi: concentric wedges at C=(1053,109-ish) ---
    cx, cy = 1053, 110
    spans = [(33, INK), (24.5, None), (19, INK), (10.5, None)]
    a0, a1 = 270-58, 270+58
    for radius, color in spans:
        box = ((cx-radius)*S, (cy-radius)*S, (cx+radius)*S, (cy+radius)*S)
        if color:
            d.pieslice(box, a0, a1, fill=color)
        else:
            # punch out with transparent wedge
            d.pieslice(box, a0-2, a1+2, fill=(0,0,0,0))
    d.ellipse(((cx-6.5)*S, (cy-6.5-0.5)*S, (cx+6.5)*S, (cy+6.5)*S), fill=INK)

    # --- Battery ---
    OUT = (0, 0, 0, 89)  # 35% ink outline
    # body outline (stroke): draw filled rrect then punch inner
    rr(d, (1105*S, 75*S, 1189*S, 117*S), r=12*S, fill=OUT)
    d.rounded_rectangle((1105*S+3.5*S, 75*S+3.5*S, 1189*S-3.5*S, 117*S-3.5*S), radius=8.5*S, fill=(0,0,0,0))
    # nub
    rr(d, (1192*S, 88*S, 1199*S, 104*S), r=3.5*S, fill=OUT)
    # charge fill (full)
    rr(d, (1112*S, 82*S, 1183*S, 110*S), r=8*S, fill=INK)

    return ov.resize((W, STRIP_H), Image.LANCZOS)

overlay = build_overlay()

for f in sorted(glob.glob(os.path.join(ASSETS, "screenshot-*.png"))):
    im = Image.open(f).convert("RGB")
    bg = im.getpixel((60, 100))
    strip = Image.new("RGBA", (W, STRIP_H), bg + (255,))
    strip.alpha_composite(overlay)
    im.paste(strip.convert("RGB"), (0, 0))
    im.save(f, optimize=True)
    print("done:", os.path.basename(f), "bg:", bg)
