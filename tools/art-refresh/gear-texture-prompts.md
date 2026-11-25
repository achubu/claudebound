# Gear texture fills (Round 572)

Textures the Gear Studio's Designer fills armour with (`assets/gear-recipe.js`). The game **tints** a texture with the
design's colour, so each one is asked for in **neutral grey**: its pattern and relief only, no colour of its own. Each is a
**seamless tile**, 1024 x 1024, lit flat from straight above so it repeats without a visible light direction. Every prompt is
complete on its own (owner rule): copy one whole block per image.

When they're back, Claude cuts each to a seamless tile with `python3 tools/gear_texture_cut.py <picture> <name>[,<name>...]`
(Round 574: it finds the pattern's own repeat, cross-fades the wrap and saves `assets/items/gear-textures/<name>.webp` at a
quarter size), checks the 3x3 preview it writes, and adds it to the Designer's texture list. Done: 1 (carbon weave).

## All eight at once (Round 574)

One picture holding eight textures in a grid; `tools/gear_texture_cut.py sheet.png hex-mesh,brushed-titanium,quilted,scale-mail,chainmail,leather,circuit-plate,ribbed-suit`
cuts it (the magenta gutters find the cells; the tool makes each seamless itself, so small seams in the picture are fine).

```
One image, 2048 x 1024 pixels: a sheet of eight separate square material swatches for filling armour in a 2D game, arranged
in a grid of 4 columns and 2 rows. Each swatch is a 480 x 480 pixel square, and the swatches are separated by solid flat pure
magenta (#FF00FF) gutters 32 pixels wide, with a 32 pixel magenta border round the whole sheet; nothing but magenta in the
gutters, and no magenta, pink or purple anywhere inside a swatch. Every swatch is a flat, straight-on texture filling its whole
square edge to edge, with a small regular repeating pattern (each pattern repeats many times inside its square), seen exactly
from the front with no perspective, no curvature, no object, no frame, no drop shadow and no label. Every swatch is neutral grey
only: mid-grey with lighter and darker greys, no colour and no hue at all, so the game can tint it any colour. Flat even lighting
from straight above, the same brightness everywhere in each swatch, no light direction, no vignette, no glare. No text, numbers,
logos or captions anywhere in the image.
Top row, left to right:
1. Hex armour mesh: a honeycomb of small raised hexagonal armour cells, each slightly domed, thin dark grooves between cells and
   a tiny bevel highlight on each cell's upper edge; about 12 hexagons across the swatch.
2. Brushed titanium: fine straight horizontal brush lines with subtle lighter and darker streaks and a few faint scratches.
3. Quilted padding: thick padded fabric of puffy diamond-shaped cushions stitched along diagonal seams, soft fabric grain and
   small stitch marks along every seam; about 6 diamonds across.
4. Scale mail: overlapping rounded metal scales in rows offset by half a scale, each with a raised centre ridge, a bevelled rim
   and a dark gap under its lower edge; about 8 scales across.
Bottom row, left to right:
5. Chainmail: small interlocking metal rings in the four-in-one weave, a small highlight on each ring and dark gaps between
   them; about 16 rings across.
6. Worn leather: a soft pebbled leather grain with creases, scuffs and a few faint straight stitched seams.
7. Circuit-etched plate: a smooth metal plate engraved with thin circuit traces turning at right angles and 45 degrees, small
   round solder pads and a few tiny square chips.
8. Ribbed survival suit: rows of thick horizontal padded rubber ribs with narrow pinched seams between them, a fine matte rubber
   grain and a few small vent holes in the seams; about 10 ribs from top to bottom.
```

## 1. Carbon weave

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: a tight carbon-fibre twill weave seen
straight on, diagonal woven bands of fibre with a fine glossy sheen on each band. Neutral grey only: mid-grey with lighter and
darker greys, no colour, no hue at all, so the game can tint it any colour. Flat even lighting from straight above, the same
brightness everywhere, no light direction, no vignette, no shadows. The texture must tile perfectly in both directions with no
visible seam, border or frame. No text, logos, objects or perspective; the weave fills the whole image edge to edge.
```

## 2. Hex armour mesh

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: a honeycomb of small raised hexagonal
armour cells, each cell slightly domed with a thin dark groove between cells and a tiny bevel highlight on each cell's upper
edge. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can tint it any colour.
Flat even lighting from straight above, the same brightness everywhere, no light direction, no vignette, no shadows. The
texture must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects or perspective;
the hexagons fill the whole image edge to edge at an even size, about 16 across.
```

## 3. Brushed titanium

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: brushed titanium metal, fine straight
horizontal brush lines with subtle streaks of lighter and darker metal and a few faint scratches. Neutral grey only: mid-grey
with lighter and darker greys, no colour, no hue at all, so the game can tint it any colour. Flat even lighting from straight
above, the same brightness everywhere, no light direction, no vignette, no reflections of a room. The texture must tile
perfectly in both directions with no visible seam, border or frame. No text, logos, objects or perspective; the metal fills the
whole image edge to edge.
```

## 4. Quilted padding

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: thick quilted padded fabric, puffy
diamond-shaped cushions stitched along diagonal seams, a soft fabric grain on each cushion and small stitch marks along every
seam. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can tint it any colour.
Flat even lighting from straight above, the same brightness everywhere, no light direction, no vignette, no shadows. The
texture must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects or perspective;
the quilting fills the whole image edge to edge, about 8 diamonds across.
```

## 5. Scale mail

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: overlapping rounded metal scales
like a scale-mail armour, rows offset by half a scale, each scale with a raised centre ridge, a bevelled rim and a dark gap
beneath its lower edge. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can
tint it any colour. Flat even lighting from straight above, the same brightness everywhere, no light direction, no vignette.
The texture must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects or
perspective; the scales fill the whole image edge to edge, about 10 scales across.
```

## 6. Chainmail

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: fine riveted chainmail, small
interlocking metal rings in the classic four-in-one weave, each ring with a small highlight and dark gaps showing between the
rings. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can tint it any
colour. Flat even lighting from straight above, the same brightness everywhere, no light direction, no vignette. The texture
must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects or perspective; the rings
fill the whole image edge to edge, about 20 rings across.
```

## 7. Worn leather

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: worn tooled leather, a soft pebbled
grain with creases, scuffs and a few faint stitched seams running in straight lines. Neutral grey only: mid-grey with lighter
and darker greys, no colour, no hue at all, so the game can tint it any colour. Flat even lighting from straight above, the
same brightness everywhere, no light direction, no vignette, no shadows. The texture must tile perfectly in both directions with
no visible seam, border or frame. No text, logos, objects or perspective; the leather fills the whole image edge to edge.
```

## 8. Circuit-etched plate

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: a smooth metal plate etched with fine
circuit-board traces, thin straight lines turning at right angles and 45 degrees, small round solder pads and a few tiny square
chips, all slightly engraved into the metal. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all,
so the game can tint it any colour. Flat even lighting from straight above, the same brightness everywhere, no light direction,
no vignette. The texture must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects
or perspective; the circuitry fills the whole image edge to edge.
```

## 9. Ribbed survival suit

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: a ribbed rubberised survival-suit
material, rows of thick horizontal padded ribs with narrow pinched seams between them and a fine matte rubber grain, a few small
vent holes in some seams. Neutral grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can
tint it any colour. Flat even lighting from straight above, the same brightness everywhere, no light direction, no vignette.
The texture must tile perfectly in both directions with no visible seam, border or frame. No text, logos, objects or
perspective; the ribs fill the whole image edge to edge, about 12 ribs from top to bottom.
```

## 10. Bone plating

```
A single seamless tileable texture, 1024 x 1024 pixels, for filling armour in a 2D game: plates of polished bone, smooth
slightly porous surface with fine hairline cracks and small pits, the plates meeting along gently curving dark seams. Neutral
grey only: mid-grey with lighter and darker greys, no colour, no hue at all, so the game can tint it any colour. Flat even
lighting from straight above, the same brightness everywhere, no light direction, no vignette. The texture must tile perfectly
in both directions with no visible seam, border or frame. No text, logos, objects or perspective; the bone fills the whole
image edge to edge.
```
