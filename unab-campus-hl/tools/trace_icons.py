# Vectoriza (potrace) los íconos seleccionados de la familia iconográfica UNAB (manual, pág. 92)
import sys, json
import numpy as np
from PIL import Image
import potrace
src, out = sys.argv[1], sys.argv[2]
SEL = {
 'house':'r5c11','student':'r3c3','clock':'r7c5','pin':'r4c7','book':'r6c1','document':'r6c2','notepad':'r4c8',
 'heartPulse':'r3c9','cross':'r3c10','stethoscope':'r2c7','trophy':'r5c8','ball':'r5c2','music':'r5c4','mic':'r5c3',
 'coffee':'r5c6','food':'r5c7','dumbbell':'r6c6','camera':'r6c7','printer':'r7c9','search':'r6c12','info':'r6c10',
 'bell':'r7c10','heart':'r4c9','drop':'r5c10','artist':'r3c7','laptop':'r4c1','graduation':'r4c12','globe':'r6c9',
 'certificate':'r6c8','ribbon':'r7c8','bulb':'r2c3','chat':'r1c9','headphones':'r7c1','recycle':'r7c3','pencil':'r2c4',
 'bicycle':'r2c6','mail':'r4c4','phone':'r1c10','arrowRight':'r1c1','arrowLeft':'r1c2','gears':'r6c4','sun':'r2c10',
 'stage':'r2c9','card':'r5c12','bus':'r4c5','trash':'r7c2','paw':'r5c1','wheelchair':'r2c2','headset':'r3c8','tap':'r7c7',
}
im = Image.open(src).convert('L'); W, H = im.size; s = W / 2000
xs = [291,425,557,687,817,944,1072,1200,1330,1460,1595,1718]
ys = [307,397,487,570,652,733,815]
a = 255 - np.asarray(im).astype(int)
res = {}
for name, code in SEL.items():
    r, c = map(int, code[1:].split('c'))
    x, y = xs[c-1], ys[r-1]
    x0, y0, x1, y1 = int((x-45)*s), int((y-42)*s), int((x+45)*s), int((y+42)*s)
    t = a[y0:y1, x0:x1] > 110
    yy, xx = np.where(t); bx0, bx1, by0, by1 = xx.min(), xx.max(), yy.min(), yy.max()
    t = t[by0:by1+1, bx0:bx1+1]; h, w = t.shape; side = max(h, w)
    canvas = np.zeros((side, side), bool); canvas[(side-h)//2:(side-h)//2+h, (side-w)//2:(side-w)//2+w] = t
    bmp = potrace.Bitmap(~canvas)
    plist = bmp.trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2)
    k = 100.0 / side
    f = lambda p: f'{p.x*k:.1f} {p.y*k:.1f}'
    d = []
    for curve in plist:
        d.append(f'M{f(curve.start_point)}')
        for seg in curve.segments:
            if seg.is_corner: d.append(f'L{f(seg.c)}L{f(seg.end_point)}')
            else: d.append(f'C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}')
        d.append('Z')
    res[name] = ''.join(d)
js = ['/* ==========================================================================',
      '   Familia iconográfica UNAB — vectorizada desde el Manual de Identidad',
      '   de Marca (pág. 92). viewBox 0 0 100 100, relleno con currentColor.',
      '   Generado con scripts/trace_icons.py (no editar a mano).',
      '   ========================================================================== */',
      'const UNAB_ICONS = ' + json.dumps(res, indent=1) + ';']
open(out, 'w').write('\n'.join(js) + '\n')
print(len(res), sum(len(v) for v in res.values()))
