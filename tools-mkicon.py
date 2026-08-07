#!/usr/bin/env python3
"""Render the Typewell mark to PNG.

Same artwork as the inline SVG favicon in index.html: a rounded square with a
teal->gold diagonal gradient and a white "T". Drawn procedurally at 4x and box
filtered down, so no image library is needed.
"""
import struct, zlib, sys

SS = 4  # supersample factor

# geometry in the 64-unit design space
R = 17.0                                  # corner radius
T = dict(x0=12, x1=52, y0=17, y1=27,      # cross bar
         sx0=26.5, sx1=37.5, sy1=48)      # stem
C0 = (0x0E, 0x9E, 0x9E)                   # teal
C1 = (0xC9, 0x8A, 0x2D)                   # gold


def inside_round_rect(x, y, w, h, r):
    if x < r and y < r:
        return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x > w - r and y < r:
        return (x - (w - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y > h - r:
        return (x - r) ** 2 + (y - (h - r)) ** 2 <= r * r
    if x > w - r and y > h - r:
        return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r * r
    return True


def inside_t(x, y):
    if T['x0'] <= x <= T['x1'] and T['y0'] <= y <= T['y1']:
        return True
    return T['sx0'] <= x <= T['sx1'] and T['y1'] <= y <= T['sy1']


def render(size, maskable=False):
    """maskable: full bleed, T shrunk into Android's 80% safe zone."""
    n = size * SS
    scale = 64.0 / n
    radius = 0.0 if maskable else R
    shrink = 0.72 if maskable else 1.0
    acc = [[[0, 0, 0, 0] for _ in range(size)] for _ in range(size)]
    for py in range(n):
        uy = (py + 0.5) * scale
        for px in range(n):
            ux = (px + 0.5) * scale
            if radius and not inside_round_rect(ux, uy, 64, 64, radius):
                continue
            tx, ty = 32 + (ux - 32) / shrink, 32 + (uy - 32) / shrink
            if inside_t(tx, ty):
                r, g, b = 255, 255, 255
            else:
                t = (ux + uy) / 128.0            # the 0,0 -> 64,64 gradient
                r = round(C0[0] + (C1[0] - C0[0]) * t)
                g = round(C0[1] + (C1[1] - C0[1]) * t)
                b = round(C0[2] + (C1[2] - C0[2]) * t)
            cell = acc[py // SS][px // SS]
            cell[0] += r; cell[1] += g; cell[2] += b; cell[3] += 255

    rows = bytearray()
    per = SS * SS
    for row in acc:
        rows.append(0)                            # filter type: none
        for r, g, b, a in row:
            if a == 0:
                rows += b"\0\0\0\0"
            else:
                # un-premultiply: average colour over the covered samples only
                cov = a // 255
                rows += bytes((r // cov, g // cov, b // cov, a // per))
    return bytes(rows), size


def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path, size, maskable=False):
    raw, s = render(size, maskable)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(path, s, len(png), "bytes")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        path, _, size = arg.partition(":")
        write_png(path, int(size), maskable="maskable" in path)
