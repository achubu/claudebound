# Aethercede: Neon Aftermath, one image per room (54 images)

For every room, upload two images to the image generator, then paste that room's prompt:
1. `layouts/<room>.png`: the road plan (it fixes where streets cross into the neighbouring rooms).
2. A style reference: `style-harbor.jpg` for HARBOR RUINS rooms, `style-city.jpg` for all others.

Save each result with the same name as its layout (e.g. `room-0-5-afterlight-refuge.png`) and send them
back in batches. Claude traces the streets, lines up the openings, and wires them into the game.
If a result puts a street at the wrong edge, or a street touches an edge where the sketch has none,
regenerate it. That is the one thing that has to be right.

Tip: if colors drift between rooms, also attach the previous finished room as an extra style reference.

## room-0-4-saltwind-docks

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Saltwind Docks", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. The left side of the image is open sea.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-4-rustcrane-wharf

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Rustcrane Wharf", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-4-lighthouse-pier

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Lighthouse Pier", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-4-lantern-market

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Lantern Market", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-4-signal-tower

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Signal Tower", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-4-billboard-steps

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Billboard Steps", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. A treasure (Moon Lens) is hidden here: add a small shrine or alcove beside the road.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-4-waterfall-terrace

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Waterfall Terrace", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-4-spire-gate

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Spire Gate", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-4-warden-s-crown

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Warden's Crown", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. A boss fights here: make the central plaza a wide, open arena with nothing blocking it.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-0-5-afterlight-refuge

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Afterlight Refuge", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. This is the safe starting area: a calm, well-lit refuge plaza. The left side of the image is open sea.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-5-floodgate-plaza

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Floodgate Plaza", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-5-sunken-warehouses

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Sunken Warehouses", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-5-neon-arcade

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Neon Arcade", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-5-neon-square

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Neon Square", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-5-holo-stage

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Holo Stage", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-5-amethyst-causeway

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Amethyst Causeway", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-5-citadel-heart

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Citadel Heart", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-5-prism-steps

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Prism Steps", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-0-6-harbor-gardens

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Harbor Gardens", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. The left side of the image is open sea.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-6-fountain-row

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Fountain Row", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-6-tidewall-street

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Tidewall Street", part of Harbor Ruins: an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-6-canal-walk

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Canal Walk", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-6-glowstep-lane

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Glowstep Lane", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-6-broadcast-row

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Broadcast Row", part of Neon Square: a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters. A treasure (Upgrade Crystal) is hidden here: add a small shrine or alcove beside the road.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-6-shattered-aqueduct

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Shattered Aqueduct", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-6-violet-crossing

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Violet Crossing", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-6-crystal-falls

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Crystal Falls", part of Crystal Citadel: a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-0-7-bandstand-ruins

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Bandstand Ruins", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-7-blossom-grove

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Blossom Grove", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-7-carousel-green

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Carousel Green", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-7-pagoda-court

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Pagoda Court", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-7-dragon-gate

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Dragon Gate", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-7-moon-temple

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Moon Temple", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. A boss fights here: make the central plaza a wide, open arena with nothing blocking it. A treasure (Ember Sigil) is hidden here: add a small shrine or alcove beside the road.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-7-scrapyard-gate

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Scrapyard Gate", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-7-parking-garage

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Parking Garage", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-7-overpass-ramp

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Overpass Ramp", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-0-8-willow-paths

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Willow Paths", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-8-old-oak-lawn

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Old Oak Lawn", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-8-lake-bridge

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Lake Bridge", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-8-koi-garden

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Koi Garden", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-8-lantern-street

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Lantern Street", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-8-noodle-row

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Noodle Row", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-8-faded-lots

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Faded Lots", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-8-ruined-tower-lot

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the right, bottom edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Ruined Tower Lot", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-8-collapsed-freeway

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, bottom, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Collapsed Freeway", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-0-9-statue-garden

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Statue Garden", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. A treasure (Briarstep Boots) is hidden here: add a small shrine or alcove beside the road.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-1-9-ivy-promenade

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Ivy Promenade", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-2-9-fountain-circle

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Fountain Circle", part of Overgrown Park: an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-3-9-jade-alley

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Jade Alley", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-4-9-paper-lantern-way

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Paper Lantern Way", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-5-9-red-lantern-market

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Red Lantern Market", part of Lantern Quarter: an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-6-9-tire-mountains

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Tire Mountains", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-7-9-south-lot

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, right, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "South Lot", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. 

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

## room-8-9-scrap-fortress

```
Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the top, left edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "Scrap Fortress", part of Junkyard Lots: junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls. A boss fights here: make the central plaza a wide, open arena with nothing blocking it.

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.
```

